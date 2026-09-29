// A hidden link as an HTML string, for servers, static-site builds, templates
// and the CLI. The browser side is dom.ts (or the drop-in auto.js).

import { ATTRIBUTE, defaultHint, encode, reverse, type Contact } from "./contact.js";

export interface RenderOptions {
  /** Text to show instead of the address, e.g. "Email us". Escaped. */
  label?: string;
  /** What screen readers hear before the link is revealed. */
  hint?: string;
  /** Class names for the <a>. */
  className?: string;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The HTML of a hidden link: `render(mailto("hello@example.com"))`.
 *
 * The href is a placeholder "#", so browsers and your CSS treat it as a link;
 * the real one is scrambled in data-safe-contact; the address is written
 * backwards inside <bdo dir="rtl">, which draws it the right way round.
 */
export function render(contact: Contact, { label, hint, className }: RenderOptions = {}): string {
  const attributes = [`href="#"`, `${ATTRIBUTE}="${encode(contact)}"`];
  if (label === undefined) attributes.push(`aria-label="${escapeHtml(hint ?? defaultHint(contact))}"`);
  if (className) attributes.push(`class="${escapeHtml(className)}"`);
  const shown = label === undefined
    ? `<bdo dir="rtl" aria-hidden="true">${escapeHtml(reverse(contact.text))}</bdo>`
    : escapeHtml(label);
  return `<a ${attributes.join(" ")}>${shown}</a>`;
}
