/**
 * Create a DOM element with optional class name and attributes.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

/**
 * Set multiple inline styles on an element.
 */
export function setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined) {
      (el.style as unknown as Record<string, unknown>)[key] = value;
    }
  }
}

/**
 * Dispatch a custom event on an element.
 */
export function emitEvent<T>(el: HTMLElement, name: string, detail: T): void {
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
}
