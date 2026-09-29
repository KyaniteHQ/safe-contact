import { describe, expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { isValidElement } from "react";
import { Email, Phone, SafeContact } from "../src/react.js";
import { encode } from "../src/index.js";

const ADDRESS = "hello@example.com";

describe("server rendering", () => {
  test("<Email> renders the same hidden markup as renderEmail(), with no address in it", () => {
    const html = renderToString(<Email address={ADDRESS} subject="Hi" className="link" />);
    expect(html).not.toContain(ADDRESS);
    expect(html).not.toContain("mailto:");
    expect(html).toBe(`<a class="link" data-safe-contact="" role="link" tabindex="0" aria-label="Email address, activate to show">` +
      `<bdo dir="rtl" aria-hidden="true">moc.elpmaxe@olleh</bdo></a>`);
  });

  test("a label shows as is, with no hint", () => {
    const html = renderToString(<Email address={ADDRESS}>Email <b>us</b></Email>);
    expect(html).toBe(`<a data-safe-contact="" role="link" tabindex="0">Email <b>us</b></a>`);
  });

  test("<Phone> and the sms: form", () => {
    expect(renderToString(<Phone number="+39 012 345 6789" sms />)).toContain("9876 543 210 93+");
  });

  test("an invalid data value renders nothing", () => {
    expect(renderToString(<SafeContact data="nope" />)).toBe("");
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
    expect(props).toContain(encode({ text: ADDRESS, href: `mailto:${ADDRESS}?cc=boss%40example.com&subject=Hi` }));
  });

  test("<Phone> too", () => {
    expect(JSON.stringify(Phone({ number: "+39 012 345 6789" }).props)).not.toMatch(/0123|345 6789/);
  });
});
