type ScrollOptions = {
  behavior?: ScrollBehavior;
  updateHash?: boolean;
};

/**
 * Scroll an in-page section into view below the sticky header.
 * Used by the header nav and the category filters so changing context never
 * leaves the user halfway down the previous list.
 */
export function scrollToSection(id: string, options: ScrollOptions = {}): void {
  if (typeof window === "undefined") return;

  const target = document.getElementById(id);
  if (!target) return;

  const headerOffset = window.matchMedia("(max-width: 820px)").matches ? 64 : 75;
  const top =
    target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: reducedMotion ? "auto" : (options.behavior ?? "smooth"),
  });

  if (options.updateHash !== false) {
    window.history.replaceState(null, "", `#${id}`);
  }
}
