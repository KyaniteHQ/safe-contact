// The demo site in real browsers: the plain-HTML page (dist/auto.js) and the
// React page (server-rendered, hydrated). Build it first: `npm run demo`.
import { expect, test, type Page } from "@playwright/test";

const EMAIL = "hello@example.com";

const hiddenLinks = (page: Page) => page.locator("main dd a");

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
      // The backwards text (moc.elpmaxe@olleh) is meant to be there.
      for (const text of [...sources, ...rendered]) {
        expect(text).not.toMatch(/example\.com|mailto:hello|tel:\+39|sms:\+39/);
        expect(text).not.toMatch(/345 ?6789|0123456789/);
      }
    });

    test("the backwards text is drawn the right way round", async ({ page }) => {
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

    test("copying the revealed address gives it the right way round", async ({ page }) => {
      const link = hiddenLinks(page).first();
      await link.hover();
      const copied = await link.evaluate((a) => {
        getSelection()!.selectAllChildren(a);
        return getSelection()!.toString();
      });
      expect(copied).toBe(EMAIL);
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
  const hash = await page.evaluate(() => {
    const link = Object.assign(document.createElement("a"), { href: "#" });
    document.body.append(link);
    document.addEventListener("click", () => link.setAttribute("href", "#followed"), { capture: true, once: true });
    link.click();
    return location.hash;
  });
  expect(hash).toBe("#followed");
});

test("plain HTML: links added after the page loaded are revealed too", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-safe-contact]").first().evaluate((a) => {
    const copy = a.cloneNode(true) as HTMLElement;
    copy.id = "late";
    document.querySelector("main")!.prepend(copy);
  });
  await page.locator("#late").hover();
  await expect(page.locator("#late")).toHaveAttribute("href", `mailto:${EMAIL}`);
});

test("plain HTML: the counter drops as links are revealed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#count")).toHaveText("4");
  await hiddenLinks(page).first().hover();
  await expect(page.locator("#count")).toHaveText("3");
});
