"use client";
// The React link itself. It gets only the scrambled contact, so in a server
// component tree (Next.js, React Router) the plain address never reaches the
// browser: <Email> scrambles it on the server and passes this component the
// result. Before a person reaches for it, it renders the same markup as
// renderEmail() (with an empty data-safe-contact, for styling); after, a plain
// link. React owns every change, so hydration and
// re-renders stay consistent.

import { useMemo, useState, type AnchorHTMLAttributes, type ReactNode, type SyntheticEvent } from "react";
import { decode, reverse } from "./index.js";

export interface SafeContactProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  /** The scrambled contact, from encode() or `npx safe-contact --data`. */
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

export function SafeContact({
  data, children, hint = "Contact link, activate to show",
  onPointerEnter, onPointerDown, onFocus, onClick, ...rest
}: SafeContactProps) {
  const [shown, setShown] = useState(false);
  const contact = useMemo(() => decode(data), [data]);
  if (!contact) return null;
  if (shown) {
    return <a {...rest} href={contact.href} onPointerEnter={onPointerEnter} onPointerDown={onPointerDown}
      onFocus={onFocus} onClick={onClick}>{children ?? contact.text}</a>;
  }
  const show = () => setShown(true);
  return (
    <a {...rest} data-safe-contact="" role="link" tabIndex={0} aria-label={children == null ? hint : undefined}
      onPointerEnter={chain(onPointerEnter, show)}
      onPointerDown={chain(onPointerDown, show)}
      onFocus={chain(onFocus, show)}
      onClick={chain(onClick, (event) => {
        // A click with no hover, focus or press before it: a screen reader or
        // a script. Reveal and follow the link.
        if (event.defaultPrevented) return;
        event.preventDefault();
        setShown(true);
        window.location.assign(contact.href);
      })}>
      {children ?? <bdo dir="rtl" aria-hidden="true">{reverse(contact.text)}</bdo>}
    </a>
  );
}
