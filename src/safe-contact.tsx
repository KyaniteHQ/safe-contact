"use client";
// The React link. It gets only the scrambled contact, so in a server component
// tree (Next.js App Router, React Router) the plain address never reaches the
// browser: <Email>, <Phone> and <Sms> scramble it on the server and pass this
// component the result. Hidden, it renders the same markup as render() (with
// an empty data-safe-contact); once a person reaches for it, a plain link.
// React owns every change, so hydration and re-renders stay consistent.

import { useMemo, useState, type AnchorHTMLAttributes, type ReactNode, type SyntheticEvent } from "react";
import { decode, defaultHint, reverse } from "./contact.js";

export interface SafeContactProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** The scrambled contact: `encode(mailto("…"))`, or `npx safe-contact <address> --data`. */
  data: string;
  /** Text to show instead of the address, e.g. "Email us". */
  children?: ReactNode;
  /** What screen readers hear before the link is revealed. */
  hint?: string;
}

function chain<E extends SyntheticEvent>(theirs: ((event: E) => void) | undefined, ours: (event: E) => void) {
  return (event: E) => {
    theirs?.(event);
    ours(event);
  };
}

export function SafeContact({ data, children, hint, onPointerEnter, onPointerDown, onFocus, onClick, ...rest }: SafeContactProps) {
  const [shown, setShown] = useState(false);
  const contact = useMemo(() => decode(data), [data]);
  if (!contact) throw new TypeError(`safe-contact: <SafeContact data> is not a value from encode(): ${JSON.stringify(data)}`);
  const show = () => setShown(true);
  return (
    <a {...rest}
      href={shown ? contact.href : "#"}
      data-safe-contact={shown ? undefined : ""}
      aria-label={shown || children != null ? undefined : hint ?? defaultHint(contact)}
      onPointerEnter={chain(onPointerEnter, show)}
      onPointerDown={chain(onPointerDown, show)}
      onFocus={chain(onFocus, show)}
      onClick={chain(onClick, (event) => {
        // A click with no hover, focus or press before it (a screen reader, a
        // script) would follow "#": follow the real link instead.
        if (shown || event.defaultPrevented) return;
        event.preventDefault();
        show();
        window.location.assign(contact.href);
      })}>
      {children ?? (shown ? contact.text : <bdo dir="rtl" aria-hidden="true">{reverse(contact.text)}</bdo>)}
    </a>
  );
}
