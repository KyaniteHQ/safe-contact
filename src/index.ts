// safe-contact: show email addresses and phone numbers to people, not to the
// bots that harvest them.
//
//   contact.ts  build and scramble a contact      (runs anywhere)
//   html.ts     render it as an HTML string       (server, build time, CLI)
//   dom.ts      draw it for people, reveal it when one reaches   (browser)
//   react.tsx   <Email>, <Phone>, <Sms>, <SafeContact>

export { mailto, tel, sms, encode, decode, type Contact, type MailtoFields } from "./contact.js";
export { render, type RenderOptions } from "./html.js";
export { draw, reveal, listen } from "./dom.js";
