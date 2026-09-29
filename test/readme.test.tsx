// The README's examples, run as written, so the docs cannot drift from the code.
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { Email, Phone, Sms } from "../src/react.js";
import { decode, encode, mailto, render, sms, tel } from "../src/index.js";
import { dataOf } from "./helpers.js";

test("React with server components", () => {
  function ContactPage() {
    return (
      <p>
        Write to <Email address="you@yoursite.com" />,
        call <Phone number="+1 555 0100" />,
        or <Sms number="+1 555 0100" body="Hi!">send a text</Sms>.
        <Email address="you@yoursite.com" subject="Hello" className="button">Email us</Email>
      </p>
    );
  }
  const html = renderToString(<ContactPage />);
  expect(html).not.toMatch(/yoursite|555 ?0100|mailto:|tel:|sms:/);
  expect(html).toContain('class="button"');
});

// People paste --data values into their code, so the format cannot change:
// this value must keep decoding in every future version.
test("React, client-side: the --data value in the README is real, and stays valid", () => {
  const data = "bW9jLmV0aXNydW95QHVveTpvdGxpYW0KbW9jLmV0aXNydW95QHVveQ==";
  expect(encode(mailto("you@yoursite.com"))).toBe(data);
  expect(decode(data)).toEqual({ text: "you@yoursite.com", href: "mailto:you@yoursite.com" });
});

test("HTML built by your code", () => {
  const links = [
    render(mailto("you@yoursite.com")),
    render(mailto("you@yoursite.com", { subject: "Hello" }), { label: "Email us" }),
    render(tel("+1 555 0100")),
    render(sms("+1 555 0100", "Hi!")),
  ];
  const hrefs = links.map((html) => decode(dataOf(html))?.href);
  expect(hrefs).toEqual(["mailto:you@yoursite.com", "mailto:you@yoursite.com?subject=Hello", "tel:+15550100", "sms:+15550100?body=Hi!"]);
});
