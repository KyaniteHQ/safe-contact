import { expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { decode } from "../src/index.js";

// Runs the built CLI, so `npm run build` comes first (as in `npm run check`).
const cli = (...args: string[]) => spawnSync(process.execPath, ["dist/cli.js", ...args], { encoding: "utf8" });

test("prints a hidden email link", () => {
  const { stdout, status } = cli("hello@example.com", "--subject", "Hi");
  expect(status).toBe(0);
  expect(stdout).toMatch(/^<a data-safe-contact="[^"]+" role="link"/);
  expect(stdout).not.toContain("hello@example.com");
});

test("a phone number given in pieces, as the shell splits it", () => {
  const { stdout } = cli("+39", "012", "345", "6789", "--sms");
  const data = stdout.match(/data-safe-contact="([^"]+)"/)?.[1] ?? "";
  expect(decode(data)).toEqual({ text: "+39 012 345 6789", href: "sms:+390123456789" });
});

test("--data prints only the scrambled value", () => {
  const { stdout } = cli("hello@example.com", "--data");
  expect(decode(stdout.trim())).toEqual({ text: "hello@example.com", href: "mailto:hello@example.com" });
});

test("bad input: a message and a non-zero exit", () => {
  expect(cli("nope")).toMatchObject({ status: 1, stderr: 'not a phone number: "nope"\n' });
  expect(cli().status).toBe(2);
  expect(cli("--help")).toMatchObject({ status: 0 });
});
