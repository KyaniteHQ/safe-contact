// The browser side of hidden links made by render() or the CLI. dist/auto.js
// is this file plus a call to listen().

import { ATTRIBUTE, decode } from "./contact.js";

/**
 * Turns one hidden link into a real one: its text, its href, no more hint.
 * Returns the real href, or null if the element is not a valid hidden link.
 */
export function reveal(link: Element): string | null {
  const contact = decode(link.getAttribute(ATTRIBUTE) ?? "");
  if (!contact) return null;
  link.removeAttribute(ATTRIBUTE);
  link.removeAttribute("aria-label");
  link.querySelector(":scope > bdo[dir=rtl]")?.replaceWith(contact.text);
  link.setAttribute("href", contact.href);
  return contact.href;
}

const listening = new WeakSet<Document>();

/**
 * Reveals hidden links when someone reaches for them: hover, focus, press or
 * click. A click that arrives alone (a screen reader, a script) works too: the
 * browser follows the href the link has after the click listeners ran, which
 * is the real one by then. Covers links added later. Calling it again does
 * nothing.
 */
export function listen(doc: Document = document): void {
  if (listening.has(doc)) return;
  listening.add(doc);
  const reach = (event: Event) => {
    const link = event.target instanceof Element ? event.target.closest(`a[${ATTRIBUTE}]`) : null;
    if (link) reveal(link);
  };
  for (const type of ["pointerover", "pointerdown", "focusin", "click"]) {
    doc.addEventListener(type, reach, { capture: true, passive: true });
  }
}
