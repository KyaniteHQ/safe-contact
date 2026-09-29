# safe-contact

Show your email address and phone number to people, not to spam bots.

Bots scrape web pages for addresses and sell them to spammers. `safe-contact` keeps the address out of your page until a person points at it, focuses it or taps it. It looks and works like a normal link: one click opens the mail app.

**[Live demo](https://kyanitehq.github.io/safe-contact/)** · under 1 KB · no CSS needed · React, plain HTML or a CLI

## React

```sh
npm install safe-contact
```

```tsx
import { Email, Phone } from "safe-contact/react";

<Email address="you@yoursite.com" />
<Email address="you@yoursite.com" subject="Hello">Email us</Email>
<Phone number="+1 555 0100" />
<Phone number="+1 555 0100" sms body="Hi!" />
```

In **Next.js** (App Router) and other React Server Components apps, `<Email>` and `<Phone>` run on the server: the address is scrambled there and never reaches the browser, not in the HTML and not in the JavaScript. Nothing to set up.

In a **client-only app** (Vite, Create React App), the address is in your JavaScript bundle. Most harvesters only read HTML, so that still stops most of them. To keep it out of the bundle too, scramble it once and pass the result:

```sh
npx safe-contact you@yoursite.com --data
```

```tsx
import { SafeContact } from "safe-contact/react";

<SafeContact data="bW9jLmV0aXN..." />
```

## Any website

Print the HTML for your address:

```sh
npx safe-contact you@yoursite.com
npx safe-contact "+1 555 0100"
npx safe-contact you@yoursite.com --label "Email us" --subject "Hello"
```

Paste it into your page, and add this once, anywhere on the page:

```html
<script src="https://unpkg.com/safe-contact/dist/auto.js" defer></script>
```

On a server or at build time (Astro, Eleventy, Express, PHP via Node), use the same functions the CLI uses:

```js
import { renderEmail, renderPhone } from "safe-contact";

renderEmail({ address: "you@yoursite.com", subject: "Hello" }); // → "<a data-safe-contact=…>…</a>"
```

and `import "safe-contact/auto"` (or the script tag) in the browser.

## How it works

1. The address is written backwards inside `<bdo dir="rtl">`, which the browser draws the right way round. People read it normally; the page text is backwards.
2. The real link is kept scrambled in a `data-safe-contact` attribute. Its `href` is just `#`, so there is no `mailto:` link for a bot to find or follow, yet browsers and your CSS treat it as a normal link: same underline, pointer and keyboard focus.
3. When someone hovers, focuses, taps or clicks, it becomes a real `mailto:`, `tel:` or `sms:` link, just before the click lands.

Before and after, side by side:

```html
<!-- what bots see, even after scripts run -->
<a href="#" data-safe-contact="bW9jLmV0aXN…" aria-label="Email address, activate to show"><bdo dir="rtl" aria-hidden="true">moc.etisruoy@uoy</bdo></a>

<!-- after a person hovers it -->
<a href="mailto:you@yoursite.com">you@yoursite.com</a>
```

**Accessibility.** Screen readers hear "Email address, activate to show" (change it with `hint`). Focusing or activating the link reveals it, and from then on it is read as a normal link. Keyboard users can tab to it and press Enter.

**Styling.** Hidden and revealed links are both `<a href>`, so your link styles apply to both. To style hidden ones differently, use `a[data-safe-contact]`.

**Honest limits.** No trick stops a bot that is built to beat it. Most harvesters read raw HTML; some run the page in a headless browser; very few hover over links. This stops all but the last kind. It also works with a strict Content Security Policy (no inline styles or scripts).

## API

### `safe-contact/react`

| Component | Props |
|---|---|
| `<Email>` | `address`, `subject?`, `body?`, `cc?`, `bcc?`, `hint?`, `children?` (a label shown instead of the address), and any `<a>` prop except `href` |
| `<Phone>` | `number`, `sms?`, `body?` (for sms), `hint?`, `children?`, and any `<a>` prop except `href` |
| `<SafeContact>` | `data` (from `encode()` or `npx safe-contact --data`), `hint?`, `children?`, and any `<a>` prop except `href` |

### `safe-contact`

| Function | Does |
|---|---|
| `renderEmail(options)`, `renderPhone(options)` | The HTML of a hidden link. Options as above, plus `label`, `hint`, `className`. |
| `listen(document?)` | Reveals hidden links when a person reaches for them. Covers links added later. `safe-contact/auto` calls it for you. |
| `reveal(element)` | Reveals one link now. |
| `encode({ text, href })`, `decode(data)` | Scramble and unscramble a `data-safe-contact` value. `decode` only accepts `mailto:`, `tel:` and `sms:` links. |
| `emailHref(options)`, `phoneHref(options)` | Build the `mailto:`, `tel:` or `sms:` address. |

### CLI

```
npx safe-contact <email or phone number> [--label text] [--subject text] [--body text]
                 [--sms] [--hint text] [--class names] [--data]
```

## Browser support

Every current browser. Tested in Chromium, Firefox and WebKit on every change.

## License

MIT © KyaniteHQ
