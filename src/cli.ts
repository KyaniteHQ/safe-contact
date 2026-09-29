#!/usr/bin/env node
// npx safe-contact hello@example.com   → the HTML of a hidden link, to paste
// npx safe-contact "+39 012 345 6789"  → the same for a phone number

import { parseArgs } from "node:util";
import { emailHref, encode, phoneHref, renderEmail, renderPhone } from "./index.js";

const HELP = `Usage: npx safe-contact <email or phone number> [options]

Prints the HTML of a link that spam bots cannot read. Paste it into your page
and add this script once, anywhere on the page:

  <script src="https://unpkg.com/safe-contact/dist/auto.js" defer></script>

Options:
  --label <text>    show this text instead of the address, e.g. "Email us"
  --subject <text>  email subject
  --body <text>     email body, or the message for --sms
  --sms             open the messaging app instead of calling
  --hint <text>     what screen readers hear before the link is revealed
  --class <names>   class names for the link
  --data            print only the scrambled value, for <SafeContact data="...">
  -h, --help        show this help`;

function main(argv: string[]): number {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        label: { type: "string" }, subject: { type: "string" }, body: { type: "string" },
        sms: { type: "boolean" }, hint: { type: "string" }, class: { type: "string" },
        data: { type: "boolean" }, help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${HELP}`);
    return 2;
  }
  const { values: o, positionals } = parsed;
  const target = positionals.join(" ").trim();
  if (o.help || !target) {
    (o.help ? console.log : console.error)(HELP);
    return o.help ? 0 : 2;
  }
  try {
    const render = { label: o.label, hint: o.hint, className: o.class };
    if (target.includes("@")) {
      const email = { address: target, subject: o.subject, body: o.body };
      console.log(o.data ? encode({ text: target, href: emailHref(email) }) : renderEmail({ ...email, ...render }));
    } else {
      const phone = { number: target, sms: o.sms, body: o.body };
      console.log(o.data ? encode({ text: target, href: phoneHref(phone) }) : renderPhone({ ...phone, ...render }));
    }
    return 0;
  } catch (error) {
    console.error((error as Error).message.replace(/^safe-contact: /, ""));
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
