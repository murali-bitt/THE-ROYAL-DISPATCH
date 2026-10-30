/**
 * Every page has a plain functional label (what it does) and an immersive name
 * (what the kingdom calls it). The functional label always stays visible, so
 * no one has to decode the fiction to find their way.
 */
export const NAV_ITEMS = [
  { href: "/", label: "Overview", realm: "The Crown's Watch", description: "Overview — the state of the realm" },
  { href: "/report", label: "Report", realm: "Send a Raven", description: "Report an incident" },
  { href: "/incidents", label: "Registry", realm: "The Black Ledger", description: "Incident registry — every report" },
  { href: "/villages", label: "Villages", realm: "The Forsaken Lands", description: "Village status & the kingdom map" },
  { href: "/dispatches", label: "Dispatches", realm: "Whispers from the Crown", description: "Royal dispatches & announcements" },
  { href: "/restoration", label: "Restoration", realm: "The Long Vigil", description: "Restoration — what is being repaired" },
  { href: "/grimoire", label: "Grimoire", realm: "The Grimoire", description: "Kirmada & the cursed artifacts" },
  { href: "/operations", label: "Operations", realm: "The Night Watch", description: "Steward & Council operations desk" },
] as const;

export const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Is this header-link activation a real in-app move to another page?
 * Keyboard Enter on a link arrives as a plain click (button 0), so it counts;
 * modified clicks open new tabs/windows, and the current page goes nowhere.
 */
export function isPageChange(
  pathname: string,
  href: string,
  event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean },
) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return pathname !== href;
}
