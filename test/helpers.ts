/** The data-safe-contact value in a rendered link. */
export const dataOf = (html: string) => /data-safe-contact="([^"]*)"/.exec(html)?.[1] ?? "";

/** A rendered link with its data-safe-contact value emptied, as React renders it. */
export const blankData = (html: string) => html.replace(/data-safe-contact="[^"]*"/, 'data-safe-contact=""');
