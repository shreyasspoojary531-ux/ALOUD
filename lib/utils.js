/**
 * Simple class name concatenator utility.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
