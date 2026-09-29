// Builds the demo site into site/ (GitHub Pages serves it; the browser tests
// load it): the plain-HTML page with its links filled in by render(), and a
// React page rendered on the server and hydrated.
// Needs `npm run build` first.
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { encode, mailto, render, sms, tel } from "../dist/index.js";

const EMAIL = "hello@example.com";
const PHONE = "+39 012 345 6789";

rmSync("site", { recursive: true, force: true });
mkdirSync("site");
for (const file of ["style.css", "count.js"]) copyFileSync(`demo/${file}`, `site/${file}`);
copyFileSync("dist/auto.js", "site/auto.js");

const links = {
  email: render(mailto(EMAIL)),
  label: render(mailto(EMAIL, { subject: "Hello from the demo" }), { label: "Email us" }),
  phone: render(tel(PHONE)),
  sms: render(sms(PHONE, "Hi!")),
};
writeFileSync("site/index.html", readFileSync("demo/index.html", "utf8")
  .replace(/<!--(email|label|phone|sms)-->/g, (_, key) => links[key]));

const DATA = {
  email: encode(mailto(EMAIL)),
  label: encode(mailto(EMAIL, { subject: "Hello from the React demo" })),
  phone: encode(tel(PHONE)),
};
const common = { bundle: true, jsx: "automatic", define: { DATA: JSON.stringify(DATA), "process.env.NODE_ENV": '"production"' }, logLevel: "warning" };
await build({ ...common, entryPoints: ["demo/react-client.tsx"], outfile: "site/react.js", minify: true, format: "esm" });
await build({ ...common, entryPoints: ["demo/react-app.tsx"], outfile: "site/.server.js", platform: "node", format: "esm", packages: "external" });
const { App } = await import(pathToFileURL("site/.server.js").href);
const { createElement } = await import("react");
const { renderToString } = await import("react-dom/server");
rmSync("site/.server.js");
writeFileSync("site/react.html", `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safe-contact · React demo</title>
<link rel="stylesheet" href="style.css">
<script type="module" src="react.js"></script>
</head>
<body><div id="root">${renderToString(createElement(App))}</div></body>
</html>
`);
console.log("site/ built: index.html, react.html");
