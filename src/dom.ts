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
 * Reveals hidden links when someone reaches for them: hover, focus or press,
 * which all come before the click, so the click opens the mail or phone app.
 * A click that arrives alone (a screen reader, a script) reveals the link and
 * follows it. Covers links added later too. Calling it again does nothing.
 */
export function listen(doc: Document = document): void {
  if (listening.has(doc)) return;
  listening.add(doc);
  const hiddenLink = (event: Event) =>
    event.target instanceof Element ? event.target.closest(`a[${ATTRIBUTE}]`) : null;
  const reach = (event: Event) => {
    const link = hiddenLink(event);
    if (link) reveal(link);
  };
  for (const type of ["pointerover", "pointerdown", "focusin"]) {
    doc.addEventListener(type, reach, { capture: true, passive: true });
  }
  doc.addEventListener("click", (event) => {
    const link = hiddenLink(event);
    const href = link && reveal(link);
    if (!href) return;
    // The browser would follow the href the link had when it was clicked
    // ("#"): cancel that and follow the real one.
    event.preventDefault();
    doc.defaultView?.location.assign(href);
  }, true);
}
