import "dotenv/config";
import { buildApp } from "./app";
import { runJobs } from "./jobs";
import { APP_NAME } from "../shared/config";
const app = await buildApp();
await app.listen({
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "127.0.0.1",
});
console.log(
  `${APP_NAME} : API disponible sur http://127.0.0.1:${process.env.PORT || 3001}`,
);
const timer = setInterval(() => {
  void runJobs().catch(() =>
    console.error("Le traitement des rappels a échoué."),
  );
}, 30_000);
timer.unref();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    clearInterval(timer);
    await app.close();
    process.exit(0);
  });
