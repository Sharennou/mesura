import { useEffect, useState } from "react";
import { ArrowRight, Download, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { Button, Confirm, ErrorMessage, Icon, PageTitle } from "../components";
import { api, authClient, downloadExport } from "../api";
import { CONSENT_TEXTS, CONSENT_VERSION } from "../../shared/config";
import type { AccountData, ConsentPurpose } from "../../shared/types";

const labels: Record<ConsentPurpose, string> = {
  body: "Suivi corporel",
  photos: "Photos privées",
  push: "Notifications sur téléphone",
  email: "Rappels par email",
};

export function PrivacyScreen() {
  const { data, setData, requireAccount, navigate, toast, capabilities } =
    useApp();
  const [choices, setChoices] = useState(data.consents);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [withdraw, setWithdraw] = useState<ConsentPurpose | null>(null);
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [password, setPassword] = useState("");
  const [format, setFormat] = useState("json");
  const [includePhotos, setIncludePhotos] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);
  useEffect(() => {
    void api<any[]>("/consents")
      .then(setAudit)
      .catch(() => {});
  }, [data.consents]);
  async function change(purpose: ConsentPurpose, granted: boolean) {
    if (!requireAccount()) return;
    setBusy(true);
    setError("");
    try {
      const next = await api<AccountData>("/consents", {
        method: "POST",
        body: JSON.stringify({ purpose, granted, version: CONSENT_VERSION }),
      });
      setData(next);
      setChoices(next.consents);
      setWithdraw(null);
      toast(
        granted
          ? "Votre choix est enregistré."
          : "Consentement retiré. Le traitement concerné est arrêté.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Vos données. Vos choix."
        eyebrow="Données et confidentialité"
      />
      <p className="lead">
        Vous gardez la main. Chaque option est indépendante et peut être retirée
        à tout moment.
      </p>
      <div className="stack">
        {(["body", "photos", "push", "email"] as const).map((p) => (
          <section className="consent-card" key={p}>
            <div className="card-top">
              <h2>{labels[p]}</h2>
              <span className={`status-label ${data.consents[p] ? "on" : ""}`}>
                {data.consents[p] ? "Autorisé" : "Non autorisé"}
              </span>
            </div>
            <p>{CONSENT_TEXTS[p]}</p>
            {data.consents[p] ? (
              <Button
                disabled={busy}
                onClick={() =>
                  p === "body" || p === "photos"
                    ? setWithdraw(p)
                    : void change(p, false)
                }
              >
                Retirer mon consentement
              </Button>
            ) : (
              <>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={choices[p]}
                    disabled={busy || (p !== "body" && !data.consents.body)}
                    onChange={(e) =>
                      setChoices((c) => ({ ...c, [p]: e.target.checked }))
                    }
                  />
                  <span>J’accepte explicitement cette finalité.</span>
                </label>
                <Button
                  disabled={!choices[p] || busy}
                  onClick={() => void change(p, true)}
                >
                  Enregistrer mon choix
                </Button>
              </>
            )}
          </section>
        ))}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <details className="data-details">
        <summary>Consulter l’historique de mes choix</summary>
        {audit.length ? (
          audit.map((a, i) => (
            <p key={i}>
              {labels[a.purpose as ConsentPurpose]} ·{" "}
              {a.granted ? "autorisé" : "retiré"} ·{" "}
              {new Date(a.date).toLocaleString("fr-FR")} · version {a.version}
            </p>
          ))
        ) : (
          <p>Aucun choix enregistré.</p>
        )}
      </details>
      <div className="section-heading">
        <h2>Emporter vos repères</h2>
        <Icon as={Download} />
      </div>
      <section className="plain-card">
        <p>
          Mesures, notes, objectifs, dates, unités, préférences et historique
          des consentements.
        </p>
        <label className="field-label">
          Format d’export
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="json">JSON · toutes mes données</option>
            <option value="csv">CSV · mesures et notes</option>
            <option value="zip">Archive ZIP · données et photos</option>
          </select>
        </label>
        {format === "zip" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
            />
            <span>Inclure mes photos privées</span>
          </label>
        )}
        <Button
          disabled={busy}
          onClick={async () => {
            if (!requireAccount()) return;
            setBusy(true);
            setError("");
            try {
              await downloadExport(format, includePhotos);
              toast("Votre export est prêt.");
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Génération de l’export…" : "Télécharger mes données"}
          <Icon as={Download} />
        </Button>
      </section>
      <section className="plain-card">
        <h2>Consulter et rectifier</h2>
        <p>
          Vous pouvez corriger ou supprimer chaque entrée depuis votre
          historique, et modifier votre profil.
        </p>
        <div className="stack">
          <Button onClick={() => navigate("history")}>
            Consulter mes entrées
          </Button>
          <Button onClick={() => navigate("account")}>
            Modifier mon profil
          </Button>
        </div>
      </section>
      <section className="plain-card">
        <h2>Supprimer mon compte</h2>
        <p>
          Cette action supprime vos mesures, notes, photos, objectifs, rappels
          et sessions. Elle est définitive.
        </p>
        <Button
          onClick={() => {
            if (requireAccount()) setDeleteAccount(true);
          }}
        >
          Supprimer mon compte
          <Icon as={Trash2} />
        </Button>
      </section>
      <p className="small muted">
        Pour exercer vos droits ou poser une question :{" "}
        {capabilities.privacyContact ? (
          <a href={`mailto:${capabilities.privacyContact}`}>
            {capabilities.privacyContact}
          </a>
        ) : (
          "le contact du responsable doit être renseigné avant l’ouverture du service."
        )}
      </p>
      <button className="text-button" onClick={() => navigate("legal")}>
        Lire la politique de confidentialité <Icon as={ArrowRight} size={16} />
      </button>
      {withdraw && (
        <Confirm
          title={
            withdraw === "body"
              ? "Arrêter et effacer mon suivi ?"
              : "Effacer mes photos ?"
          }
          text={
            withdraw === "body"
              ? "Le retrait efface vos mesures, notes, photos et objectif, puis arrête tous les rappels. Exportez vos données avant de continuer si vous souhaitez les conserver."
              : "Toutes vos photos seront supprimées. Les mesures et notes seront conservées."
          }
          onClose={() => setWithdraw(null)}
          onConfirm={() => void change(withdraw, false)}
          busy={busy}
        />
      )}
      {deleteAccount && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">Supprimer votre espace ?</h2>
            <p>
              Confirmez votre identité avec votre mot de passe. Toutes vos
              données actives seront supprimées.
            </p>
            <label className="field-label">
              Mot de passe actuel
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <div className="stack">
              <Button
                disabled={busy || !password}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api("/account", {
                      method: "DELETE",
                      body: JSON.stringify({ password }),
                    });
                    await authClient.signOut();
                    navigate("measure");
                    toast("Votre compte et vos données ont été supprimés.");
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Suppression…" : "Supprimer définitivement"}
              </Button>
              <Button onClick={() => setDeleteAccount(false)} disabled={busy}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
