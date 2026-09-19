// Small helpers shared by the three modes.

export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Bring the outcome of an action into view. Two rules: an outcome already on
// screen never moves under the player, and one that is off screen is brought in
// by the smallest scroll that does it, so the mission stays in context instead
// of the page jumping to its own bottom. Returns whether it scrolled.
export function reveal(element, {margin = 24} = {}) {
  if (!element || element.hidden) return false;
  const box = element.getBoundingClientRect();
  if (!box.height) return false;
  const above = box.top - margin;                            // negative when off the top
  const below = box.bottom - (window.innerHeight - margin);  // positive when off the bottom
  if (above >= 0 && below <= 0) return false;
  // For an element taller than the viewport, `above` is the smaller move and
  // aligns its top; otherwise `below` just clears the bottom edge.
  const distance = above < 0 ? above : Math.min(below, above);
  window.scrollBy({top:distance, behavior:reduceMotion() ? 'auto' : 'smooth'});
  return true;
}
