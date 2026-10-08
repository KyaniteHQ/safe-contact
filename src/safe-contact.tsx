"use client";
// The React link. It gets only the scrambled contact, so in a server component
// tree (Next.js App Router) the plain address never reaches the browser:
// <Email>, <Phone> and <Sms> scramble it on the server and pass this component
// the result. It renders the same markup as render(): the decoy on the server
// and for hydration, the real contact written backwards once it is on screen,
// and a plain link once a person reaches for it. React owns every change, so
// hydration and re-renders stay consistent.

import { useEffect, useLayoutEffect, useMemo, useState, type AnchorHTMLAttributes, type ReactNode, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";
import { decode, decoy, hiddenAttributes, reverse } from "./contact.js";

// Before the first paint in the browser; a no-op on the server, without the warning.
const useOnScreen = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface SafeContactProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** The scrambled contact: `encode(mailto("…"))`, or `npx safe-contact <address> --data`. */
  data: string;
  /** Text to show instead of the address, e.g. "Email us". */
  children?: ReactNode;
  /** What screen readers hear before the link is revealed. */
  hint?: string;
}

function chain<E extends SyntheticEvent>(theirs: ((event: E) => void) | undefined, ours: () => void) {
  return (event: E) => {
    theirs?.(event);
    ours();
  };
}

export function SafeContact({ data, children, hint, onPointerEnter, onPointerDown, onFocus, onClick, ...rest }: SafeContactProps) {
  const [shown, setShown] = useState(false);
  const [drawn, setDrawn] = useState(false);
  useOnScreen(() => setDrawn(true), []);
  const contact = useMemo(() => decode(data), [data]);
  if (!contact) throw new TypeError(`safe-contact: <SafeContact data> is not a value from encode(): ${JSON.stringify(data)}`);
  const show = () => setShown(true);
  return (
    <a {...rest}
      {...(shown ? { href: contact.href } : hiddenAttributes(contact, "", { hint, labelled: children != null }))}
      onPointerEnter={chain(onPointerEnter, show)}
      onPointerDown={chain(onPointerDown, show)}
      onFocus={chain(onFocus, show)}
      // A click with nothing before it (a screen reader, a script): reveal now,
      // before the browser reads the href to follow.
      onClick={chain(onClick, () => shown || flushSync(show))}>
      {children ?? (shown ? contact.text
        : drawn ? <bdo dir="rtl" aria-hidden="true">{reverse(contact.text)}</bdo>
        : <span aria-hidden="true">{decoy(contact)}</span>)}
    </a>
  );
}
