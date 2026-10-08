// The contact model, shared by every environment: build a Contact with
// mailto(), tel() or sms(); scramble it with encode() for the page; get it back
// with decode(). Also the two markup rules both renderers follow, so the HTML
// string renderer and the React component cannot drift apart: hiddenAttributes()
// and decoy(), the made-up address the page shows until the reveal.

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
  return { text, href: withQuery(`mailto:${text}`, { cc, bcc, subject, body }) };
}

/** A phone contact that calls: `tel("+39 012 345 6789")`. */
export function tel(number: string): Contact {
  return { text: number.trim(), href: `tel:${digits(number)}` };
}

/** A phone contact that opens the messaging app: `sms("+39 012 345 6789", "Hi!")`. */
export function sms(number: string, body?: string): Contact {
  return { text: number.trim(), href: withQuery(`sms:${digits(number)}`, { body }) };
}

/** Adds the non-empty fields, in the given order, percent-encoded (spaces as %20, which mail apps show as spaces). */
function withQuery(base: string, fields: Record<string, string | string[] | undefined>): string {
  const query = Object.entries(fields)
    .filter(([, value]) => value?.length)
    .map(([key, value]) => `${key}=${encodeURIComponent([value].flat().join(","))}`)
    .join("&");
  return query ? `${base}?${query}` : base;
}

function digits(number: string): string {
  const kept = number.replace(/[^\d+]/g, "");
  if (!/^\+?\d{3,}$/.test(kept)) throw new TypeError(`safe-contact: not a phone number: ${JSON.stringify(number)}`);
  return kept;
}

/** Scrambles a contact into the value of the data-safe-contact attribute. */
export function encode({ text, href }: Contact): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(reverse(`${text}\n${href}`))));
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
function reverse(text: string): string {
  return Array.from(text).reverse().join("");
}

/**
 * What the page shows in place of the contact until the reveal: a made-up
 * address or number that reads like one but cannot be delivered. A harvester
 * that takes it gets junk. For an email it is a random user name (one or two
 * parts, sometimes digits), a random domain and a made-up top-level domain; for
 * a phone number, random digits after "+0", a country code that does not exist.
 *
 * It is derived from the contact, so the same contact always gets the same
 * decoy: server and client render alike, and builds are reproducible. It has
 * the length of the real text, so nothing moves when the link is revealed.
 */
export function decoy({ text, href }: Contact): string {
  const next = random(seed(`${text}\n${href}`));
  return href.startsWith("mailto:") ? fakeAddress(text, next) : fakeNumber(text, next);
}

const CONSONANTS = "bcdfghjklmnprstvwz";
const VOWELS = "aeiou";

type Next = () => number;

const between = (next: Next, min: number, max: number) => min + Math.floor(next() * (max - min + 1));
const pick = (next: Next, from: string) => from[between(next, 0, from.length - 1)]!;
const digit = (next: Next) => String(between(next, 0, 9));
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Pronounceable: consonants and vowels in turn, e.g. "kovari" or "abeno". */
function word(length: number, next: Next): string {
  let vowel = next() < 0.5;
  let out = "";
  for (let i = 0; i < length; i++, vowel = !vowel) out += pick(next, vowel ? VOWELS : CONSONANTS);
  return out;
}

/** Two words joined by `separator`, each at least `min` letters long, the first at most 8. */
function pair(length: number, min: number, separator: string, next: Next): string {
  const first = between(next, min, Math.min(8, length - min - 1));
  return `${word(first, next)}${separator}${word(length - first - 1, next)}`;
}

/** e.g. "ren.olav42@sivome.kuzda", as long as the real address. */
function fakeAddress(address: string, next: Next): string {
  const at = address.indexOf("@");
  const user = fakeUser(at < 0 ? address.length : at, next);
  const domain = fakeDomain(at < 0 ? 0 : address.length - at - 1, next);
  return `${user}@${domain}`;
}

function fakeUser(length: number, next: Next): string {
  length = clamp(length, 2, 40);
  const digits = length >= 5 && next() < 0.4 ? between(next, 1, 2) : 0;
  const letters = length - digits;
  let user = letters >= 9 || (letters >= 6 && next() < 0.5) ? pair(letters, 2, pick(next, "._-"), next) : word(letters, next);
  for (let i = 0; i < digits; i++) user += digit(next);
  return user;
}

/** A name and a top-level domain of 4 to 6 letters: long enough to be nobody's. */
function fakeDomain(length: number, next: Next): string {
  length = clamp(length, 8, 60);
  const tld = between(next, 4, Math.min(6, length - 4));
  const name = length - tld - 1;
  return `${name >= 11 || (name >= 8 && next() < 0.5) ? pair(name, 3, "-", next) : word(name, next)}.${word(tld, next)}`;
}

/** The number as written, every digit random, after "+0": no country code starts with 0. */
function fakeNumber(number: string, next: Next): string {
  let first = true;
  return `+${number.replace(/^\+/, "").replace(/\d/g, () => (first ? ((first = false), "0") : digit(next)))}`;
}

/** FNV-1a, a 32-bit hash of the text. */
function seed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}

/** mulberry32: numbers in [0, 1) that are the same for the same seed everywhere. */
function random(state: number): Next {
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The attributes of a link before its reveal, in order: a placeholder href, so
 * browsers and site CSS treat it as a link; the scrambled contact; and, unless
 * a label shows instead of the address, what screen readers hear. `data` is
 * encode(contact) for render(), or "" for React, which reveals the link itself:
 * the empty value still marks the link for CSS but gives the browser script
 * nothing to act on.
 */
export function hiddenAttributes(contact: Contact, data: string, { hint, labelled }: { hint?: string; labelled: boolean }) {
  const defaultHint = contact.href.startsWith("mailto:") ? "Email address, activate to show" : "Phone number, activate to show";
  return { href: "#", [ATTRIBUTE]: data, "aria-label": labelled ? undefined : hint ?? defaultHint };
}
