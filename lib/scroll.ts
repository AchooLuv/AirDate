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
  const toolbar = target.querySelector<HTMLElement>(".explorer-toolbar");
  let top: number;

  if (toolbar) {
    // The filter bar is sticky, so its viewport rect is not its natural
    // document position. Use the non-sticky heading below it as the anchor:
    // the heading ends up below the sticky bar, and the bar is already at its
    // `top` threshold instead of floating ~50px down the page.
    const heading = target.querySelector<HTMLElement>(".section-heading");
    const headingTop =
      (heading ?? target).getBoundingClientRect().top + window.scrollY;
    top = headingTop - headerOffset - toolbar.offsetHeight - 10;
  } else {
    top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 8;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: reducedMotion ? "auto" : (options.behavior ?? "smooth"),
  });

  if (options.updateHash !== false) {
    window.history.replaceState(null, "", `#${id}`);
  }
}
