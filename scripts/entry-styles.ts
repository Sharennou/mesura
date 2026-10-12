import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import postcss, { type Container, type ChildNode } from "postcss";

// Include every state of the public forms, not only the selectors matched in a
// screenshot. Preserve source order and media queries to keep the same cascade.
const entryClasses = new Set([
  "app-shell",
  "app-header",
  "brand",
  "brand-logo",
  "auth-shell",
  "main-content",
  "page-heading",
  "eyebrow",
  "heading-row",
  "circle",
  "back",
  "primary",
  "secondary",
  "field-label",
  "password-field",
  "check-label",
  "stack",
  "auth-form",
  "auth-links",
  "text-button",
  "inline-link",
  "privacy-caption",
  "error-message",
  "loading",
  "skip-link",
  "connection-banner",
  "sr-only",
  "optional",
  "development-mail",
  "keyboard-open",
  "plain-card",
  "prose",
  "lead",
  "muted",
  "small",
]);
function publicSelector(selector: string) {
  const classes = [...selector.matchAll(/\.([a-zA-Z_-][\w-]*)/g)].map(
    (match) => match[1],
  );
  return classes.every((name) => entryClasses.has(name));
}
function selectRules(container: Container) {
  for (const node of [...(container.nodes ?? [])]) {
    if (node.type === "rule") {
      const selectors = node.selectors.filter(publicSelector);
      if (!selectors.length) node.remove();
      else node.selectors = selectors;
    } else if (node.type === "atrule" && node.name !== "font-face") {
      if (node.name.endsWith("keyframes")) node.remove();
      else if (node.nodes) {
        selectRules(node as Container<ChildNode>);
        if (!node.nodes.length) node.remove();
      }
    }
  }
}
export function generateEntryStyles() {
  const css = postcss.parse(readFileSync("src/styles.css", "utf8"));
  selectRules(css);
  mkdirSync("src/styles", { recursive: true });
  writeFileSync("src/styles/entry.css", css.toString());
}
