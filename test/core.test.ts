import { describe, expect, test } from "vitest";
import { decode, encode, mailto, render, sms, tel } from "../src/index.js";

const ADDRESS = "hello@example.com";
const backwards = (text: string) => Array.from(text).reverse().join("");

describe("mailto, tel, sms", () => {
  test("a bare address", () => {
    expect(mailto(` ${ADDRESS} `)).toEqual({ text: ADDRESS, href: `mailto:${ADDRESS}` });
  });

  test("fields keep a fixed order and are percent-encoded, spaces as %20 so mail apps do not show +", () => {
    expect(mailto(ADDRESS, { body: "Line 1\nLine 2", subject: "Hi & bye", cc: ["a@b.co", "c@d.co"], bcc: "" }).href)
      .toBe(`mailto:${ADDRESS}?cc=a%40b.co%2Cc%40d.co&subject=Hi%20%26%20bye&body=Line%201%0ALine%202`);
  });

  test("unknown fields are ignored, not added to the link", () => {
    expect(mailto(ADDRESS, { foo: "bar" } as never).href).toBe(`mailto:${ADDRESS}`);
  });

  test("tel: and sms: keep only digits and a leading +, and show the number as written", () => {
    expect(tel("+39 (012) 345-6789")).toEqual({ text: "+39 (012) 345-6789", href: "tel:+390123456789" });
    expect(sms("0123 456", "Hi there")).toEqual({ text: "0123 456", href: "sms:0123456?body=Hi%20there" });
    expect(sms("0123 456").href).toBe("sms:0123456");
  });

  test("bad input throws a TypeError that says what was wrong", () => {
    for (const address of ["", "hello", "a@b@c", "a b@c.d", "a@b.c?subject=x", "<a@b.c>"]) {
      expect(() => mailto(address), address).toThrow(/not an email address/);
    }
    for (const number of ["", "call me", "12"]) {
      expect(() => tel(number), number).toThrow(/not a phone number/);
      expect(() => sms(number), number).toThrow(/not a phone number/);
    }
  });
});

describe("encode and decode", () => {
  test("round-trip, accents, emoji and line breaks included", () => {
    for (const contact of [
      mailto(ADDRESS), tel("+39 012 345 6789"), sms("+39 012", "Ciao 👋"),
      { text: "Écrivez-nous", href: "mailto:café@exämple.com?subject=%C3%A9t%C3%A9" },
      { text: "two\nlines", href: "mailto:a@b.co?body=x%0Ay" },
    ]) expect(decode(encode(contact))).toEqual(contact);
  });

  test("the scrambled value holds no address, forwards or backwards", () => {
    const data = encode(mailto(ADDRESS));
    expect(data).not.toContain(ADDRESS);
    expect(data).not.toContain(backwards(ADDRESS));
    expect(data).not.toContain("@");
  });

  test("anything that is not a mailto:, tel: or sms: contact decodes to null", () => {
    for (const data of ["", "not base64!", btoa("no separator"), encode({ text: "x", href: "javascript:alert(1)" }),
      encode({ text: "", href: "mailto:a@b.c" }), btoa("\xff\xfe")]) {
      expect(decode(data), data).toBeNull();
    }
  });
});

describe("render", () => {
  test("no address in the HTML: a placeholder href, the scrambled value, the text backwards", () => {
    const html = render(mailto(ADDRESS, { subject: "Hello" }));
    expect(html).toBe(`<a href="#" data-safe-contact="${encode(mailto(ADDRESS, { subject: "Hello" }))}" ` +
      `aria-label="Email address, activate to show"><bdo dir="rtl" aria-hidden="true">${backwards(ADDRESS)}</bdo></a>`);
    expect(html).not.toContain(ADDRESS);
    expect(html).not.toContain("mailto:");
  });

  test("phone links get the phone hint, or your own", () => {
    expect(render(tel("+39 012 345 6789"))).toContain('aria-label="Phone number, activate to show"');
    expect(render(sms("+39 012"), { hint: "Numero di telefono" })).toContain('aria-label="Numero di telefono"');
    expect(render(tel("+39 012 345 6789"))).toContain(">9876 543 210 93+</bdo>");
  });

  test("a label replaces the backwards text and the hint; everything is escaped", () => {
    const html = render(mailto(ADDRESS), { label: `<b>"Email" us</b>`, className: `x" onclick="y` });
    expect(html).toContain(">&#60;b&#62;&#34;Email&#34; us&#60;/b&#62;</a>");
    expect(html).toContain('class="x&#34; onclick=&#34;y"');
    expect(html).not.toContain("aria-label");
    expect(html).not.toContain("<bdo");
  });
});
