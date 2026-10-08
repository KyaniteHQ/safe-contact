// The browser side of hidden links made by render() or the CLI. dist/auto.js
// is this file plus a call to listen().

import { ATTRIBUTE, decode, reverse } from "./contact.js";

const DECOY = `a[${ATTRIBUTE}] > span[aria-hidden]`;

/**
 * Shows people the real contact in place of the decoy: written backwards
 * inside <bdo dir="rtl">, which the browser draws the right way round. The
 * page text still holds no address. Nothing happens to a link already drawn
 * or revealed, or to one that is not a valid hidden link.
 */
export function draw(link: Element): void {
  const decoy = link.querySelector(":scope > span[aria-hidden]");
  const contact = decoy && decode(link.getAttribute(ATTRIBUTE) ?? "");
  if (!contact) return;
  const bdo = link.ownerDocument.createElement("bdo");
  bdo.dir = "rtl";
  bdo.setAttribute("aria-hidden", "true");
  bdo.textContent = reverse(contact.text);
  decoy.replaceWith(bdo);
}

/**
 * Turns one hidden link into a real one: its text, its href, no more hint.
 * Returns the real href, or null if the element is not a valid hidden link.
 */
export function reveal(link: Element): string | null {
  const contact = decode(link.getAttribute(ATTRIBUTE) ?? "");
  if (!contact) return null;
  link.removeAttribute(ATTRIBUTE);
  link.removeAttribute("aria-label");
  // The decoy or the backwards text, whichever the link holds.
  link.querySelector(":scope > [aria-hidden]")?.replaceWith(contact.text);
  link.setAttribute("href", contact.href);
  return contact.href;
}

const listening = new WeakSet<Document>();

/**
 * Draws every hidden link for people, now and as links are added, and reveals
 * one when someone reaches for it: hover, focus, press or click. A click that
 * arrives alone (a screen reader, a script) works too: the browser follows the
 * href the link has after the click listeners ran, which is the real one by
 * then. Calling it again does nothing.
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
  const drawAll = () => doc.querySelectorAll(DECOY).forEach((decoy) => draw(decoy.parentElement!));
  new MutationObserver(drawAll).observe(doc, { childList: true, subtree: true });
  drawAll();
}
