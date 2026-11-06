type ScrollOptions = {
  behavior?: ScrollBehavior;
  updateHash?: boolean;
};

function documentTop(element: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = element;

  while (current) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return top;
}

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
  // The filter bar is sticky. Use its natural document offset instead of its
  // current (sticky) viewport offset, otherwise clicking a filter while deep in
  // the timeline would leave it ~40px below the header.
  const toolbar = target.querySelector<HTMLElement>(".explorer-toolbar");
  const anchor = toolbar ?? target;
  const gap = toolbar ? 0 : 8;
  const top = documentTop(anchor) - headerOffset - gap;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: reducedMotion ? "auto" : (options.behavior ?? "smooth"),
  });

  if (options.updateHash !== false) {
    window.history.replaceState(null, "", `#${id}`);
  }
}
