import { useEffect } from "react";
export function useModalFocus() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let previous: HTMLElement | null = null;
    const focusable =
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]';
    function update() {
      const next = document.querySelector<HTMLElement>('[aria-modal="true"]');
      if (next === active) return;
      if (next) {
        previous = document.activeElement as HTMLElement;
        active = next;
        requestAnimationFrame(() =>
          next.querySelector<HTMLElement>(focusable)?.focus(),
        );
      } else {
        active = null;
        if (previous?.isConnected) previous.focus();
        previous = null;
      }
    }
    function keydown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !active) return;
      const elements = [
        ...active.querySelectorAll<HTMLElement>(focusable),
      ].filter((el) => el.getClientRects().length);
      const first = elements[0],
        last = elements.at(-1);
      if (!first) return;
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !active.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !active.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", keydown);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keydown);
    };
  }, []);
}
