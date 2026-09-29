import { describe, expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { isValidElement } from "react";
import { Email, Phone, SafeContact, Sms } from "../src/react.js";
import { encode, mailto, render, sms, tel, type Contact } from "../src/index.js";

const ADDRESS = "hello@example.com";

describe("server rendering", () => {
  // The React component and render() write the same markup by hand. This keeps
  // them identical, except that React leaves data-safe-contact empty (React,
  // not the browser script, owns the reveal).
  test.each<[string, Contact]>([["email", mailto(ADDRESS)], ["phone", tel("+39 012 345 6789")], ["sms", sms("+39 012")]])(
    "<SafeContact> renders what render() does (%s)", (_, contact) => {
      const html = render(contact).replace(/data-safe-contact="[^"]*"/, 'data-safe-contact=""');
      expect(renderToString(<SafeContact data={encode(contact)} />)).toBe(html);
    });

  test("with a label and a class, too", () => {
    const html = render(mailto(ADDRESS), { label: "Email us", className: "link" })
      .replace(/data-safe-contact="[^"]*"/, 'data-safe-contact=""')
      .replace(/^<a (.*) class="link">/, '<a class="link" $1>');
    expect(renderToString(<Email address={ADDRESS} className="link">Email us</Email>)).toBe(html);
  });

  test("<Email>, <Phone> and <Sms> put no address in the HTML", () => {
    const html = renderToString(<>
      <Email address={ADDRESS} subject="Hi" /><Phone number="+39 012 345 6789" /><Sms number="+39 012 345 6789" body="Hi" />
    </>);
    expect(html).not.toMatch(/example\.com|mailto:|tel:|sms:|345 6789/);
  });

  test("a data value that is not from encode() is an error, not a silently missing link", () => {
    expect(() => renderToString(<SafeContact data="nope" />)).toThrow(/is not a value from encode\(\)/);
  });
});

describe("server components", () => {
  // In a server component tree, what <Email> returns is what crosses to the
  // browser: the props of the client component. They must not hold the address.
  test("<Email> hands the client component only the scrambled value", () => {
    const element = Email({ address: ADDRESS, subject: "Hi", cc: "boss@example.com" });
    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe(SafeContact);
    const props = JSON.stringify(element.props);
    expect(props).not.toContain("example.com");
    expect(props).toContain(encode(mailto(ADDRESS, { subject: "Hi", cc: "boss@example.com" })));
  });

  test("<Phone> and <Sms> too", () => {
    expect(JSON.stringify(Phone({ number: "+39 012 345 6789" }).props)).not.toMatch(/012|345 6789/);
    expect(JSON.stringify(Sms({ number: "+39 012 345 6789", body: "secret" }).props)).not.toMatch(/012|secret/);
  });
});
