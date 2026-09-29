import { describe, expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { Email, Phone, SafeContact, Sms } from "../src/react.js";
import { encode, mailto, render, sms, tel, type Contact } from "../src/index.js";
import { blankData } from "./helpers.js";

const ADDRESS = "hello@example.com";

describe("server rendering", () => {
  // Both take their attributes from hiddenAttributes() but build the rest of
  // the markup separately. This keeps them identical, except that React leaves
  // data-safe-contact empty (React, not the browser script, owns the reveal).
  test.each<[string, Contact]>([["email", mailto(ADDRESS)], ["phone", tel("+39 012 345 6789")], ["sms", sms("+39 012")]])(
    "<SafeContact> renders what render() does (%s)", (_, contact) => {
      expect(renderToString(<SafeContact data={encode(contact)} />)).toBe(blankData(render(contact)));
    });

  test("with a label and a class, too", () => {
    expect(renderToString(<Email address={ADDRESS} className="link">Email us</Email>))
      .toBe(blankData(render(mailto(ADDRESS), { label: "Email us", className: "link" })));
  });

  test("a data value that is not from encode() is an error, not a silently missing link", () => {
    expect(() => renderToString(<SafeContact data="nope" />)).toThrow(/is not a value from encode\(\)/);
  });
});

describe("server components", () => {
  // In a server component tree, what these components return is what crosses
  // to the browser: the props of the client component. They must hold nothing
  // plain: not the address or number, not the subject, cc or message.
  test.each([
    ["<Email>", () => Email({ address: ADDRESS, subject: "secret", cc: "boss@example.com" })],
    ["<Phone>", () => Phone({ number: "+39 012 345 6789" })],
    ["<Sms>", () => Sms({ number: "+39 012 345 6789", body: "secret" })],
  ])("%s hands the browser only the scrambled value", (_, element) => {
    expect(JSON.stringify(element().props)).not.toMatch(/example\.com|012|345 6789|secret/);
  });
});
