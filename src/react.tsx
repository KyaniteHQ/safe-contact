// <Email>, <Phone> and <Sms>. No "use client" here on purpose: in a server
// component tree they run on the server, scramble the address there, and hand
// the client-side <SafeContact> only the scrambled value. In a client-only app
// they run in the browser, so the address is in your JavaScript bundle; use
// <SafeContact data="…"> with a value from `npx safe-contact <address> --data`
// to avoid that.

import { encode, mailto, sms, tel, type Contact, type MailtoFields } from "./contact.js";
import { SafeContact, type SafeContactProps } from "./safe-contact.js";

/** Every <a> prop except href, plus `hint` and `children` (a label shown instead of the address). */
export type LinkProps = Omit<SafeContactProps, "data">;

export type EmailProps = MailtoFields & LinkProps & { address: string };
export type PhoneProps = LinkProps & { number: string };
export type SmsProps = LinkProps & { number: string; body?: string };

const link = (contact: Contact, props: LinkProps) => <SafeContact {...props} data={encode(contact)} />;

/** An email link spam bots cannot read: `<Email address="hello@example.com" subject="Hi" />`. */
export function Email({ address, subject, body, cc, bcc, ...props }: EmailProps) {
  return link(mailto(address, { subject, body, cc, bcc }), props);
}

/** A phone link spam bots cannot read: `<Phone number="+39 012 345 6789" />`. */
export function Phone({ number, ...props }: PhoneProps) {
  return link(tel(number), props);
}

/** A text-message link spam bots cannot read: `<Sms number="+39 012 345 6789" body="Hi!" />`. */
export function Sms({ number, body, ...props }: SmsProps) {
  return link(sms(number, body), props);
}

export { SafeContact, type SafeContactProps };
