/**
 * The owner's edit token, remembered on the device that published (or opened the edit link), so the
 * published site can offer an "Edit site" shortcut to its owner only. Visitors never have it, and it
 * never leaves this browser except in the URL fragment of the edit link (fragments aren't sent to servers).
 */
const KEY = (slug: string) => `folio.edit.${slug}`;

export function rememberEditToken(slug: string, token: string) {
  try {
    localStorage.setItem(KEY(slug), token);
  } catch {}
}
export function editTokenFor(slug: string): string | null {
  try {
    return localStorage.getItem(KEY(slug));
  } catch {
    return null;
  }
}
export function forgetEditToken(slug: string) {
  try {
    localStorage.removeItem(KEY(slug));
  } catch {}
}
