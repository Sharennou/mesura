import "./styles/entry.css";
import { BASE_PATH } from "./deployment";

const root = document.getElementById("root")!;
const start = () =>
  import("./hydrate").catch(() => {
    root.replaceChildren();
    delete root.dataset.prerender;
    root.removeAttribute("inert");
    const message = document.createElement("p");
    message.className = "error-message";
    message.setAttribute("role", "alert");
    message.textContent =
      "Le chargement a été interrompu. Réessayez pour ouvrir votre espace.";
    const retry = document.createElement("button");
    retry.className = "secondary";
    retry.textContent = "Réessayer";
    retry.addEventListener("click", () => location.reload());
    root.append(message, retry);
  });
// Allow one frame of the real public HTML before evaluating and hydrating React.
// Other entry states still verify their session before rendering private content.
if (
  root.dataset.prerender === "public" &&
  document.documentElement.dataset.entry !== "dynamic"
) {
  requestAnimationFrame(() => requestAnimationFrame(() => void start()));
} else {
  void start();
}
if ("serviceWorker" in navigator) {
  window.addEventListener(
    "somevo:interactive",
    () => {
      const register = () =>
        navigator.serviceWorker
          .register(`${BASE_PATH}sw.js`, { scope: BASE_PATH })
          .catch(() => {});
      if ("requestIdleCallback" in window)
        window.requestIdleCallback(register, { timeout: 2500 });
      else setTimeout(register, 0);
    },
    { once: true },
  );
}
