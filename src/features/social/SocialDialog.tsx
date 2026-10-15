import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** DOM equivalent of the original Social Modal, with keyboard containment. */
export function SocialDialog({
  title,
  close,
  children,
  sheet = false,
  className = "",
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  sheet?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const background = Array.from(document.body.children).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && !node.contains(ref.current),
    );
    const wasInert = background.map((node) => node.inert);
    background.forEach((node) => {
      node.inert = true;
    });
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) || [],
      ).filter(
        (node) => !node.closest('[hidden], [aria-hidden="true"], [inert]'),
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      background.forEach((node, index) => {
        node.inert = wasInert[index];
      });
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className={
        "original-social social-modal-backdrop" +
        (sheet ? " social-sheet-backdrop" : "")
      }
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={"social-modal " + className}
      >
        <header className="original-modal-header">
          <button
            type="button"
            className="social-icon"
            aria-label={"Close " + title.toLowerCase()}
            onClick={close}
          >
            <X size={24} />
          </button>
          <h2>{title}</h2>
          <span />
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
