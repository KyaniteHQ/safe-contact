// <Email> and <Phone>. No "use client" here on purpose: in a server component
// tree they run on the server, scramble the address there and hand the
// client-side <SafeContact> only the scrambled text. In a client-only app
// they run in the browser, and the address is in your JavaScript bundle; pass
// <SafeContact data="..."> from `npx safe-contact --data` to avoid that.

import { EMAIL_HINT, PHONE_HINT, emailHref, encode, phoneHref, type EmailOptions, type PhoneOptions } from "./index.js";
import { SafeContact, type SafeContactProps } from "./safe-contact.js";

type LinkProps = Omit<SafeContactProps, "data">;

export type EmailProps = EmailOptions & LinkProps;
export type PhoneProps = PhoneOptions & LinkProps;

/** An email link that spam bots cannot read: `<Email address="hello@example.com" />`. */
export function Email({ address, subject, body, cc, bcc, hint = EMAIL_HINT, ...link }: EmailProps) {
  const data = encode({ text: address.trim(), href: emailHref({ address, subject, body, cc, bcc }) });
  return <SafeContact {...link} hint={hint} data={data} />;
}

/** A phone link that spam bots cannot read: `<Phone number="+39 012 345 6789" />`. */
export function Phone({ number, sms, body, hint = PHONE_HINT, ...link }: PhoneProps) {
  const data = encode({ text: number.trim(), href: phoneHref({ number, sms, body }) });
  return <SafeContact {...link} hint={hint} data={data} />;
}

export { SafeContact, type SafeContactProps };
