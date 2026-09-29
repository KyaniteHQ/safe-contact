// Builds dist/auto.js, the drop-in browser script: one minified file with no
// imports, so it works from a <script> tag. Run by `npm run build` after tsc.
import { build } from "esbuild";
import { chmodSync } from "node:fs";

await build({
  entryPoints: ["src/auto.ts"],
  outfile: "dist/auto.js",
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  legalComments: "none",
  banner: { js: "/*! safe-contact | MIT | github.com/KyaniteHQ/safe-contact */" },
});
chmodSync("dist/cli.js", 0o755);
