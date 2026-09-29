import { describe, expect, test } from "vitest";
import { decode, emailHref, encode, phoneHref, renderEmail, renderPhone, reverse } from "../src/index.js";

const ADDRESS = "hello@example.com";

describe("encode and decode", () => {
  test("round-trip a contact, accents and emoji included", () => {
    for (const contact of [
      { text: ADDRESS, href: `mailto:${ADDRESS}` },
      { text: "+39 012 345 6789", href: "tel:+390123456789" },
      { text: "Écrivez-nous 👋", href: "mailto:café@exämple.com?subject=%C3%A9t%C3%A9" },
      { text: "two\nlines", href: "mailto:a@b.co?body=x%0Ay" },
    ]) expect(decode(encode(contact))).toEqual(contact);
  });

  test("the scrambled value does not contain the address, forwards or backwards", () => {
    const data = encode({ text: ADDRESS, href: `mailto:${ADDRESS}` });
    expect(data).not.toContain(ADDRESS);
    expect(data).not.toContain(reverse(ADDRESS));
    expect(data).not.toContain("@");
  });

  test("anything that is not a mailto:, tel: or sms: contact decodes to null", () => {
    for (const data of ["", "not base64!", btoa("no separator"), encode({ text: "x", href: "javascript:alert(1)" }),
      encode({ text: "", href: "mailto:a@b.c" }), btoa("\xff\xfe")]) {
      expect(decode(data), data).toBeNull();
    }
  });
});

describe("emailHref", () => {
  test("a bare address", () => expect(emailHref({ address: ` ${ADDRESS} ` })).toBe(`mailto:${ADDRESS}`));

  test("fields are percent-encoded, spaces as %20 so mail apps do not show +", () => {
    expect(emailHref({ address: ADDRESS, subject: "Hi & bye", body: "Line 1\nLine 2", cc: ["a@b.co", "c@d.co"] }))
      .toBe(`mailto:${ADDRESS}?cc=a%40b.co%2Cc%40d.co&subject=Hi%20%26%20bye&body=Line%201%0ALine%202`);
  });

  test("rejects what is not an address", () => {
    for (const address of ["", "hello", "a@b@c", "a b@c.d", "a@b.c?subject=x", "<a@b.c>"]) {
      expect(() => emailHref({ address }), address).toThrow(TypeError);
    }
  });
});

describe("phoneHref", () => {
  test("tel: keeps only digits and a leading +", () => {
    expect(phoneHref({ number: "+39 (012) 345-6789" })).toBe("tel:+390123456789");
  });
  test("sms: with a message", () => {
    expect(phoneHref({ number: "0123 456", sms: true, body: "Hi there" })).toBe("sms:0123456?body=Hi%20there");
  });
  test("rejects what is not a number", () => {
    for (const number of ["", "call me", "12"]) expect(() => phoneHref({ number }), number).toThrow(TypeError);
  });
});

describe("renderEmail and renderPhone", () => {
  test("the HTML has no address in it, only the backwards text and the scrambled value", () => {
    const html = renderEmail({ address: ADDRESS, subject: "Hello" });
    expect(html).not.toContain(ADDRESS);
    expect(html).not.toContain("mailto:");
    expect(html).toContain(`<bdo dir="rtl" aria-hidden="true">${reverse(ADDRESS)}</bdo>`);
    expect(html).toContain('aria-label="Email address, activate to show"');
    expect(html).toMatch(/^<a data-safe-contact="[A-Za-z0-9+/=]+" role="link" tabindex="0"/);
  });

  test("a label replaces the address and the hint; everything is escaped", () => {
    const html = renderEmail({ address: ADDRESS, label: `<b>"Email" us</b>`, className: `x" onclick="y` });
    expect(html).toContain("&#60;b&#62;&#34;Email&#34; us&#60;/b&#62;");
    expect(html).toContain('class="x&#34; onclick=&#34;y"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("<bdo");
  });

  test("a phone number is shown backwards too", () => {
    const html = renderPhone({ number: "+39 012 345 6789", hint: "Numero di telefono" });
    expect(html).toContain(`<bdo dir="rtl" aria-hidden="true">9876 543 210 93+</bdo>`);
    expect(html).toContain('aria-label="Numero di telefono"');
    expect(html).not.toContain("tel:");
  });
});
