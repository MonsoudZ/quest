import test from 'node:test';
import assert from 'node:assert/strict';

// reveal() decides whether the page should move under the player, which is the
// kind of rule that is easy to get backwards. These stubs stand in for the DOM.
let reducedMotion = false;
globalThis.matchMedia = query => ({matches:query.includes('reduce') ? reducedMotion : false});
const scrolls = [];
globalThis.window = {innerHeight:800, scrollBy:options => scrolls.push(options)};
const {reveal, reduceMotion} = await import('../dist/ui.js');

const element = ({top, height = 120, hidden = false}) => ({
  hidden,
  getBoundingClientRect:() => ({top, height, bottom:top + height})
});
const lastScroll = () => scrolls.at(-1);
const reset = () => { scrolls.length = 0; };

test('an outcome already on screen is left where it is', () => {
  reset();
  for (const top of [24, 200, 600]) {
    assert.equal(reveal(element({top})), false, `top ${top}`);
  }
  assert.deepEqual(scrolls, [], 'nothing on screen should have moved');
});

test('an outcome below the fold is brought in by the smallest scroll that does it', () => {
  reset();
  // Bottom at 910 against a 800px viewport: 134px puts it 24px clear of the edge.
  assert.equal(reveal(element({top:790})), true);
  assert.equal(lastScroll().top, 910 - (800 - 24));
  assert.equal(reveal(element({top:1063, height:120})), true);
  assert.equal(lastScroll().top, 1183 - 776, 'the banner clears the bottom, it does not centre');
});

test('an outcome partly off the bottom counts as hidden', () => {
  const target = element({top:700, height:200});
  assert.equal(reveal(target), true, 'bottom at 900 is past the 800px viewport');
});

test('an outcome scrolled off the top is brought back', () => {
  reset();
  assert.equal(reveal(element({top:-150})), true);
  assert.equal(lastScroll().top, -174, 'scrolling up is a negative move');
});

test('an outcome taller than the screen is aligned to its top', () => {
  reset();
  assert.equal(reveal(element({top:900, height:2000})), true);
  assert.equal(lastScroll().top, 876, 'aligning the top moves less than clearing the bottom would');
});

test('the margin keeps an outcome off the very edge', () => {
  assert.equal(reveal(element({top:10})), true, '10px from the top is too close to count as visible');
  assert.equal(reveal(element({top:24})), false, 'at the margin it counts as visible');
  assert.equal(reveal(element({top:700, height:76})), false, 'bottom exactly at the margin');
  assert.equal(reveal(element({top:701, height:76})), true, 'one pixel past it');
});

test('nothing to reveal is not an error', () => {
  assert.equal(reveal(null), false);
  assert.equal(reveal(undefined), false);
  assert.equal(reveal(element({top:900, hidden:true})), false, 'a hidden element is not scrolled to');
  assert.equal(reveal(element({top:900, height:0})), false, 'a collapsed element is not scrolled to');
});

test('scrolling is instant when the player asked for less motion', () => {
  reset();
  reducedMotion = false;
  reveal(element({top:900}));
  assert.equal(lastScroll().behavior, 'smooth');
  reducedMotion = true;
  assert.equal(reduceMotion(), true);
  reveal(element({top:900}));
  assert.equal(lastScroll().behavior, 'auto');
  reducedMotion = false;
});

test('a custom margin is honoured', () => {
  assert.equal(reveal(element({top:100}), {margin:200}), true, '100px from the top is inside a 200px margin');
  assert.equal(reveal(element({top:250}), {margin:200}), false);
});
