// The contact model, shared by every environment: build a Contact with
// mailto(), tel() or sms(); scramble it with encode() for the page; get it back
// with decode(). Also the markup rules both renderers follow (the attribute,
// the backwards text, the screen-reader hint), so the HTML string renderer and
// the React component cannot drift apart.

/** What a link shows and where it goes. Build one with mailto(), tel() or sms(). */
export interface Contact {
  /** What the link shows, e.g. "hello@example.com" or "+39 012 345 6789". */
  text: string;
  /** Where it goes: a mailto:, tel: or sms: URL. */
  href: string;
}

export interface MailtoFields {
  subject?: string;
  body?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/** The attribute that marks a hidden link and holds its scrambled contact. */
export const ATTRIBUTE = "data-safe-contact";

const ADDRESS = /^[^\s@<>"'?&]+@[^\s@<>"'?&]+$/;
const SCHEME = /^(mailto|tel|sms):/i;

/** An email contact: `mailto("hello@example.com", { subject: "Hi" })`. */
export function mailto(address: string, fields: MailtoFields = {}): Contact {
  const text = address.trim();
  if (!ADDRESS.test(text)) throw new TypeError(`safe-contact: not an email address: ${JSON.stringify(address)}`);
  const { cc, bcc, subject, body } = fields;
  const query = Object.entries({ cc, bcc, subject, body })
    .filter(([, value]) => value?.length)
    .map(([key, value]) => `${key}=${encodeURIComponent([value].flat().join(","))}`)
    .join("&");
  return { text, href: `mailto:${text}${query && `?${query}`}` };
}

/** A phone contact that calls: `tel("+39 012 345 6789")`. */
export function tel(number: string): Contact {
  return { text: number.trim(), href: `tel:${digits(number)}` };
}

/** A phone contact that opens the messaging app: `sms("+39 012 345 6789", "Hi!")`. */
export function sms(number: string, body?: string): Contact {
  return { text: number.trim(), href: `sms:${digits(number)}${body ? `?body=${encodeURIComponent(body)}` : ""}` };
}

function digits(number: string): string {
  const kept = number.replace(/[^\d+]/g, "");
  if (!/^\+?\d{3,}$/.test(kept)) throw new TypeError(`safe-contact: not a phone number: ${JSON.stringify(number)}`);
  return kept;
}

/** Scrambles a contact into the value of the data-safe-contact attribute. */
export function encode({ text, href }: Contact): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(reverse(`${text}\n${href}`))) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Unscrambles an attribute value; null if it is not one, or not a mailto:, tel: or sms: link. */
export function decode(data: string): Contact | null {
  try {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const plain = reverse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    // The href is percent-encoded, so the last line break is the separator.
    const cut = plain.lastIndexOf("\n");
    const contact = { text: plain.slice(0, cut), href: plain.slice(cut + 1) };
    return cut > 0 && SCHEME.test(contact.href) ? contact : null;
  } catch {
    return null;
  }
}

/** Reverses a string by code point, so emoji and accents survive. */
export function reverse(text: string): string {
  return Array.from(text).reverse().join("");
}

/** What screen readers hear before a link is revealed, unless you pass your own. */
export function defaultHint({ href }: Contact): string {
  return href.startsWith("mailto:") ? "Email address, activate to show" : "Phone number, activate to show";
}
