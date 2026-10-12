import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
const root = document.getElementById("root")!;
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
if (
  root.dataset.prerender === "public" &&
  document.documentElement.dataset.entry !== "dynamic"
) {
  hydrateRoot(root, app);
} else {
  root.replaceChildren();
  delete root.dataset.prerender;
  createRoot(root).render(app);
}
