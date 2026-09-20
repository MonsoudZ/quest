// The small conversions and the storage guard that every screen needs. These
// were written out in several places, and two of the copies disagreed: the city
// rounded a percentage to a whole number where everything else kept a decimal,
// so the same utilisation read as 83% on one screen and 83.0% on another. One
// implementation, and the caller says which it wants.
//
// The models keep their own rounding: net.js, city.js, systems.js and machine.js
// each have a precision their arithmetic depends on, and they should not have to
// import anything from the interface to say so.
export const percent = (value, places = 1) => `${(value * 100).toFixed(places)}%`;
export const kilowatts = value => `${value.toLocaleString('en-US')} kW`;
export const count = value => value.toLocaleString('en-US');

// Browser storage is optional: it is missing in a private window, it throws when
// site data is blocked, and every screen has to work either way. Three copies of
// this try/catch is three chances to forget one.
export function readStore(key, fallback = null) {
  try {
    const held = localStorage.getItem(key);
    return held === null ? fallback : JSON.parse(held);
  } catch {
    return fallback;
  }
}
export function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
