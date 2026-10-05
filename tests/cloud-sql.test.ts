import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { emptyCloudAccount } from "../shared/cloud-domain";
import webpush from "web-push";
let pg: PGlite;
const alice = crypto.randomUUID(),
  bob = crypto.randomUUID(),
  sidAlice = crypto.randomUUID(),
  sidBob = crypto.randomUUID();
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now(),updated_at timestamptz default now(),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth,public,storage to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant select on storage.objects to authenticated;
    create policy broad_legacy on storage.objects for select to authenticated using(true);`);
  await pg.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261005000100_mesura.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await pg.exec(`create schema vault;
    create table vault.secrets(id uuid primary key default gen_random_uuid(),secret text,name text unique,description text);
    create view vault.decrypted_secrets as select secret as decrypted_secret,name from vault.secrets;
    create function vault.create_secret(secret text,name text,description text) returns uuid language sql as $$
      insert into vault.secrets(secret,name,description) values ($1,$2,$3) returning id;
    $$;`);
  await pg.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261005000300_push.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await pg.query("insert into auth.users values ($1,now()),($2,now())", [
    alice,
    bob,
  ]);
  await pg.query(
    "insert into auth.sessions(id,user_id) values ($1,$2),($3,$4)",
    [sidAlice, alice, sidBob, bob],
  );
  await pg.query(
    "insert into public.mesura_accounts(user_id,data) values ($1,$2),($3,$4)",
    [
      alice,
      JSON.stringify(emptyCloudAccount("Alice")),
      bob,
      JSON.stringify(emptyCloudAccount("Bob")),
    ],
  );
  await pg.query("select set_config($1,$2,false)", [
    "request.jwt.claims",
    JSON.stringify({
      sub: alice,
      session_id: sidAlice,
      email: "alice@example.test",
    }),
  ]);
}, 30000);
afterAll(async () => {
  await pg?.close();
});
describe("Postgres réel : autorisations et transactions", () => {
  it("les clients ne peuvent ni créer ni récupérer la clé privée Web Push", async () => {
    for (const role of ["anon", "authenticated"]) {
      await pg.exec(`set role ${role}`);
      try {
        await expect(
          pg.query("select public.mesura_vapid('{}')"),
        ).rejects.toThrow("permission denied");
        await expect(
          pg.query("select * from vault.decrypted_secrets"),
        ).rejects.toThrow("permission denied");
      } finally {
        await pg.exec("reset role");
      }
    }
  });
  it("le serveur conserve la même paire Web Push après redémarrage", async () => {
    const first = {
      ...webpush.generateVAPIDKeys(),
      subject: "https://example.test/mesura/",
    };
    const second = {
      ...webpush.generateVAPIDKeys(),
      subject: "https://example.test/new/",
    };
    await pg.exec("set role service_role");
    try {
      expect(
        (
          await pg.query("select public.mesura_vapid($1) config", [
            JSON.stringify(first),
          ])
        ).rows,
      ).toEqual([{ config: first }]);
      expect(
        (
          await pg.query("select public.mesura_vapid($1) config", [
            JSON.stringify(second),
          ])
        ).rows,
      ).toEqual([{ config: first }]);
    } finally {
      await pg.exec("reset role");
    }
    expect((await pg.query("select name from vault.secrets")).rows).toEqual([
      { name: "mesura_vapid" },
    ]);
  });
  it("la clé anonyme ne lit pas les comptes", async () => {
    await pg.exec("set role anon");
    await expect(
      pg.query("select * from public.mesura_accounts"),
    ).rejects.toThrow("permission denied");
    await pg.exec("reset role");
  });
  it("un compte ne lit que sa propre ligne", async () => {
    await pg.exec("set role authenticated");
    const r = await pg.query("select user_id from public.mesura_accounts");
    expect(r.rows).toEqual([{ user_id: alice }]);
    await pg.exec("reset role");
  });
  it("le client ne peut pas contourner les validations par RPC", async () => {
    await pg.exec("set role authenticated");
    await expect(
      pg.query("select public.mesura_commit($1,0,$2,true)", [
        alice,
        JSON.stringify(emptyCloudAccount("Invalide")),
      ]),
    ).rejects.toThrow("permission denied");
    await pg.exec("reset role");
  });
  it("le bucket reste privé même avec une ancienne policy permissive", async () => {
    await pg.exec(
      "insert into storage.objects(bucket_id,name) values('mesura-photos','private.jpg'),('other','public.jpg')",
    );
    await pg.exec("set role authenticated");
    const r = await pg.query("select name from storage.objects");
    expect(r.rows).toEqual([{ name: "public.jpg" }]);
    await pg.exec("reset role");
  });
  it("une révision ancienne ne peut pas écraser une sauvegarde récente", async () => {
    const a = emptyCloudAccount("Alice");
    a.consents.body = true;
    expect(
      (
        await pg.query("select public.mesura_commit($1,0,$2,true) ok", [
          alice,
          JSON.stringify(a),
        ])
      ).rows,
    ).toEqual([{ ok: true }]);
    expect(
      (
        await pg.query("select public.mesura_commit($1,0,$2,true) ok", [
          alice,
          JSON.stringify(emptyCloudAccount("Ancien")),
        ])
      ).rows,
    ).toEqual([{ ok: false }]);
  });
  it("la fermeture de session retire aussi la lecture directe par RLS", async () => {
    await pg.query("delete from auth.sessions where id=$1", [sidAlice]);
    await pg.exec("set role authenticated");
    expect(
      (await pg.query("select user_id from public.mesura_accounts")).rows,
    ).toEqual([]);
    await pg.exec("reset role");
  });
  it("une suppression persistante empêche une réactivation après restauration", async () => {
    await pg.query("select public.mesura_mark_deleted($1)", [bob]);
    expect(
      (
        await pg.query(
          "select user_id from public.mesura_tombstones where user_id=$1",
          [bob],
        )
      ).rows,
    ).toHaveLength(1);
    await pg.query(
      "insert into public.mesura_accounts(user_id,data) values($1,$2)",
      [bob, JSON.stringify(emptyCloudAccount("Restauré"))],
    );
    expect(
      (
        await pg.query("select public.mesura_commit($1,0,$2,true) ok", [
          bob,
          JSON.stringify(emptyCloudAccount("Bob")),
        ])
      ).rows,
    ).toEqual([{ ok: false }]);
    expect(
      (
        await pg.query("select public.mesura_session_active($1,$2) ok", [
          bob,
          sidBob,
        ])
      ).rows,
    ).toEqual([{ ok: false }]);
  });
});
