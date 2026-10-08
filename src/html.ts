// A hidden link as an HTML string, for servers, static-site builds, templates
// and the CLI. The browser side is dom.ts (or the drop-in auto.js).

import { decoy, encode, hiddenAttributes, type Contact } from "./contact.js";

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
 * The HTML of a hidden link: `render(mailto("hello@example.com"))`. In place
 * of the address it holds a made-up one (see decoy()); the browser script
 * draws the real one for people.
 */
export function render(contact: Contact, { label, hint, className }: RenderOptions = {}): string {
  const attributes = { class: className || undefined, ...hiddenAttributes(contact, encode(contact), { hint, labelled: label !== undefined }) };
  const html = Object.entries(attributes)
    .flatMap(([name, value]) => (value === undefined ? [] : [`${name}="${escapeHtml(value)}"`]))
    .join(" ");
  const shown = label === undefined
    ? `<span aria-hidden="true">${escapeHtml(decoy(contact))}</span>`
    : escapeHtml(label);
  return `<a ${html}>${shown}</a>`;
}
