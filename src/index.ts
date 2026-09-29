// safe-contact: show email addresses and phone numbers to people, not to the
// bots that harvest them.
//
// A hidden link carries its address scrambled in a data-safe-contact
// attribute, has a placeholder href="#" (so browsers and site CSS treat it as a
// link from the start: underline, pointer, keyboard focus), and shows it backwards inside <bdo dir="rtl">, which the browser
// draws the right way round. So the page reads normally, yet no
// "name@domain" text is in it, not in the HTML and not in the DOM after
// scripts run. The first hover, focus, tap or click turns it into a real
// mailto:, tel: or sms: link.
//
// This file works everywhere: encode and render on a server, at build time or
// in the CLI; decode, reveal and listen in the browser.

/** What a link shows and where it goes. */
export interface Contact {
  text: string;
  href: string;
}

export interface EmailOptions {
  /** The email address, e.g. "hello@example.com". */
  address: string;
  subject?: string;
  body?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface PhoneOptions {
  /** The number as it should appear, e.g. "+39 012 345 6789". */
  number: string;
  /** Open the messaging app (sms:) instead of calling (tel:). */
  sms?: boolean;
  /** Prefilled message, for sms only. */
  body?: string;
}

export interface RenderOptions {
  /** Text to show instead of the address, e.g. "Email us". Shown as is. */
  label?: string;
  /** What screen readers hear before the link is revealed. */
  hint?: string;
  /** Class names for the <a>. */
  className?: string;
}

/** The attribute that marks a hidden link and holds its scrambled contact. */
export const ATTRIBUTE = "data-safe-contact";

export const EMAIL_HINT = "Email address, activate to show";
export const PHONE_HINT = "Phone number, activate to show";

const EMAIL = /^[^\s@<>"'?&]+@[^\s@<>"'?&]+$/;
const SCHEME = /^(mailto|tel|sms):/i;

/** Reverses a string by code point, so emoji and accents survive. */
export function reverse(text: string): string {
  return Array.from(text).reverse().join("");
}

/** The mailto: address for an email, with its optional fields. */
export function emailHref({ address, subject, body, cc, bcc }: EmailOptions): string {
  const to = address.trim();
  if (!EMAIL.test(to)) throw new TypeError(`safe-contact: not an email address: ${JSON.stringify(address)}`);
  const fields: string[] = [];
  for (const [key, value] of [["cc", cc], ["bcc", bcc], ["subject", subject], ["body", body]] as const) {
    const text = Array.isArray(value) ? value.join(",") : value;
    if (text) fields.push(`${key}=${encodeURIComponent(text)}`);
  }
  return `mailto:${to}${fields.length ? `?${fields.join("&")}` : ""}`;
}

/** The tel: or sms: address for a phone number. */
export function phoneHref({ number, sms, body }: PhoneOptions): string {
  const digits = number.replace(/[^\d+]/g, "");
  if (!/^\+?\d{3,}$/.test(digits)) throw new TypeError(`safe-contact: not a phone number: ${JSON.stringify(number)}`);
  if (!sms) return `tel:${digits}`;
  return `sms:${digits}${body ? `?body=${encodeURIComponent(body)}` : ""}`;
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

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function render(contact: Contact, hint: string, { label, className }: RenderOptions): string {
  const shown = label === undefined
    ? `<bdo dir="rtl" aria-hidden="true">${escape(reverse(contact.text))}</bdo>`
    : escape(label);
  return `<a href="#" ${ATTRIBUTE}="${encode(contact)}"` +
    (label === undefined ? ` aria-label="${escape(hint)}"` : "") +
    (className ? ` class="${escape(className)}"` : "") +
    `>${shown}</a>`;
}

/** The HTML of a hidden email link, for servers, static sites and templates. */
export function renderEmail(options: EmailOptions & RenderOptions): string {
  return render({ text: options.address.trim(), href: emailHref(options) }, options.hint ?? EMAIL_HINT, options);
}

/** The HTML of a hidden phone link, for servers, static sites and templates. */
export function renderPhone(options: PhoneOptions & RenderOptions): string {
  return render({ text: options.number.trim(), href: phoneHref(options) }, options.hint ?? PHONE_HINT, options);
}

/**
 * Turns one hidden link into a real one: its text, its href, no more hint.
 * Returns the href, or null if the link is not a valid hidden link.
 */
export function reveal(link: Element): string | null {
  const data = link.getAttribute(ATTRIBUTE);
  if (data === null) return link.getAttribute("href");
  const contact = decode(data);
  if (!contact) return null;
  for (const name of [ATTRIBUTE, "aria-label"]) link.removeAttribute(name);
  link.querySelector(":scope > bdo[dir=rtl]")?.replaceWith(contact.text);
  link.setAttribute("href", contact.href);
  return contact.href;
}

const listening = new WeakSet<Document>();

/**
 * Reveals hidden links in a document when someone reaches for them: hover,
 * focus or press, which all come before the click, so the click opens the
 * mail or phone app. A click that arrives alone (a screen reader, a script)
 * reveals the link and follows it. One set of listeners covers links added
 * later too. Calling it again does nothing.
 */
export function listen(doc: Document = document): void {
  if (listening.has(doc)) return;
  listening.add(doc);
  const hidden = (event: Event) =>
    event.target instanceof Element ? event.target.closest(`a[${ATTRIBUTE}]`) : null;
  const reach = (event: Event) => {
    const link = hidden(event);
    if (link) reveal(link);
  };
  for (const type of ["pointerover", "pointerdown", "focusin"]) {
    doc.addEventListener(type, reach, { capture: true, passive: true });
  }
  doc.addEventListener("click", (event) => {
    const link = hidden(event);
    const href = link && reveal(link);
    if (!href) return;
    // The browser would follow the href the link had when it was clicked
    // (maybe "#"): cancel that and follow the real one.
    event.preventDefault();
    doc.defaultView?.location.assign(href);
  }, true);
}
