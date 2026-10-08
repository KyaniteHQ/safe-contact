// The demo site in real browsers: the plain-HTML page (dist/auto.js) and the
// React page (server-rendered, hydrated). Build it first: `npm run demo`.
import { expect, test, type Page } from "@playwright/test";

const EMAIL = "hello@example.com";
const PHONE = "+39 012 345 6789";
const backwards = (text: string) => Array.from(text).reverse().join("");
const DECOY_EMAIL = /^[a-z0-9._-]+@[a-z-]+\.[a-z]{4,6}$/;
const DECOY_PHONE = /^\+0\d \d{3} \d{3} \d{4}$/;

const hiddenLinks = (page: Page) => page.locator("main dd a");
/** The decoys in the HTML as sent: the email link's, then the phone link's. */
const textsInHtml = (html: string) => [...html.matchAll(/<dd><a [^>]*><span aria-hidden="true">([^<]*)<\/span>/g)].map((m) => m[1]!);

for (const path of ["/", "/react.html"]) {
  test.describe(path === "/" ? "plain HTML" : "React", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    });

    test("no address in the HTML, its scripts, or the page after they run", async ({ page, request }) => {
      const html = await (await request.get(path)).text();
      const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).src));
      const sources = [html, ...(await Promise.all(scripts.map(async (src) => (await request.get(src)).text())))];
      const rendered = [await page.content(), await page.locator("body").innerText()];
      // The decoys are meant to be in the HTML, and the backwards text in the page.
      for (const text of [...sources, ...rendered]) {
        expect(text).not.toMatch(/example\.com|mailto:hello|tel:\+39|sms:\+39/);
        expect(text).not.toMatch(/345 ?6789|0123456789/);
      }
    });

    test("the HTML holds a made-up address and a made-up number; the page shows the real ones backwards", async ({ page, request }) => {
      const [email, phone] = textsInHtml(await (await request.get(path)).text());
      expect(email).toMatch(DECOY_EMAIL);
      expect(email).not.toBe(EMAIL);
      expect(email!.length).toBe(EMAIL.length);
      expect(phone).toMatch(DECOY_PHONE);
      await expect(hiddenLinks(page).first()).toHaveText(backwards(EMAIL));
      await expect(hiddenLinks(page).nth(2)).toHaveText(backwards(PHONE));
      await expect(hiddenLinks(page).first()).toHaveAttribute("href", "#");
      await expect(hiddenLinks(page).first()).toHaveAttribute("data-safe-contact");
    });

    test("the backwards text is drawn the right way round, so people read the real address", async ({ page }) => {
      const positions = await page.locator("main dd bdo").first().evaluate((bdo) => {
        const text = bdo.firstChild!;
        return Array.from({ length: text.textContent!.length }, (_, i) => {
          const range = document.createRange();
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          return range.getBoundingClientRect().left;
        });
      });
      // The last character in the page text is drawn first, on the left.
      for (let i = 1; i < positions.length; i++) expect(positions[i]).toBeLessThan(positions[i - 1]!);
    });

    test("hover reveals a real mailto: link with the address", async ({ page }) => {
      const link = hiddenLinks(page).first();
      await expect(link).toHaveAttribute("href", "#");
      await expect(link).toHaveAccessibleName("Email address, activate to show");
      await link.hover();
      await expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
      await expect(link).toHaveText(EMAIL);
      await expect(link).toHaveAccessibleName(EMAIL);
      await expect(link).not.toHaveAttribute("data-safe-contact");
    });

    test("before and after, it looks like the page's other links", async ({ page }) => {
      const link = hiddenLinks(page).first();
      const look = () => link.evaluate((a) => [a.matches(":any-link"), getComputedStyle(a).textDecorationLine, getComputedStyle(a).color]);
      const before = await look();
      expect(before.slice(0, 2)).toEqual([true, "underline"]);
      await link.hover();
      await expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
      expect(await look()).toEqual(before);
    });

    test("pressing down reveals it before the click lands", async ({ page }) => {
      const link = hiddenLinks(page).first();
      const box = (await link.boundingBox())!;
      await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), { once: true }));
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 1 });
      await page.mouse.down();
      await expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
      await page.mouse.up();
    });

    test("a click with nothing before it (a screen reader, a script) follows the real link", async ({ page }) => {
      // Recorded by the last click listener, just before the browser follows the href.
      const followed = await hiddenLinks(page).first().evaluate((a) => new Promise((resolve) => {
        addEventListener("click", (event) => {
          resolve([a.getAttribute("href"), event.defaultPrevented]);
          event.preventDefault(); // don't open a mail app in the test browser
        }, { once: true });
        (a as HTMLElement).click();
      }));
      expect(followed).toEqual([`mailto:${EMAIL}`, false]);
    });

    test("keyboard focus reveals it", async ({ page }) => {
      const link = hiddenLinks(page).first();
      await link.focus();
      await expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
      await expect(link).toBeFocused();
    });

    test("a label shows as is and keeps the email's fields", async ({ page }) => {
      const link = hiddenLinks(page).nth(1);
      await expect(link).toHaveText("Email us");
      await link.hover();
      await expect(link).toHaveAttribute("href", /^mailto:hello@example\.com\?subject=Hello%20from%20the/);
      await expect(link).toHaveText("Email us");
    });

    test("a phone number becomes a tel: link", async ({ page }) => {
      const link = hiddenLinks(page).nth(2);
      await link.hover();
      await expect(link).toHaveAttribute("href", "tel:+390123456789");
      await expect(link).toHaveText("+39 012 345 6789");
    });
  });
}

// What the click test above relies on: a browser follows the href a link has
// after the click listeners ran, not the one it had when clicked.
test("browsers follow the href as it is after the click listeners ran", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    const link = Object.assign(document.createElement("a"), { href: "#" });
    document.body.append(link);
    document.addEventListener("click", () => link.setAttribute("href", "#followed"), { capture: true, once: true });
    link.click();
  });
  // Firefox updates the hash a moment after the click, so wait for it.
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("#followed");
});

test("plain HTML: links added after the page loaded are drawn and revealed too", async ({ page, request }) => {
  await page.goto("/");
  const link = /<dd><a [^>]*><span[^>]*>[^<]*<\/span><\/a>/.exec(await (await request.get("/")).text())![0];
  await page.locator("main").evaluate((main, html) => main.insertAdjacentHTML("afterbegin", html.replace("<a ", '<a id="late" ')), link);
  await expect(page.locator("#late")).toHaveText(backwards(EMAIL));
  await page.locator("#late").hover();
  await expect(page.locator("#late")).toHaveAttribute("href", `mailto:${EMAIL}`);
  await expect(page.locator("#late")).toHaveText(EMAIL);
});

test("plain HTML: without JavaScript the decoy stays", async ({ browser }) => {
  const page = await (await browser.newContext({ javaScriptEnabled: false })).newPage();
  await page.goto("/");
  await expect(hiddenLinks(page).first()).toHaveText(DECOY_EMAIL);
  await expect(hiddenLinks(page).first()).toHaveAttribute("href", "#");
  await page.context().close();
});

test("plain HTML: the counter drops as links are revealed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#count")).toHaveText("4");
  await hiddenLinks(page).first().hover();
  await expect(page.locator("#count")).toHaveText("3");
});
