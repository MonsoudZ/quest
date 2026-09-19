import test from 'node:test';
import assert from 'node:assert/strict';
import {createCamera, fitCamera, createScene, ordered, paint, pick, contains, polygon, shade, parseColour, faces, layers} from '../dist/iso.js';

test('the projection places the axes where the art assumes they are', () => {
  const camera = createCamera({unit:40, ratio:0.5, rise:0.8});
  const origin = camera.project(0, 0, 0);
  assert.deepEqual(origin, {x:0, y:0});
  // +x runs to the lower right, +y to the lower left, +z straight up.
  assert.deepEqual(camera.project(1, 0, 0), {x:40, y:20});
  assert.deepEqual(camera.project(0, 1, 0), {x:-40, y:20});
  assert.deepEqual(camera.project(0, 0, 1), {x:0, y:-32});
  // Equal steps in x and y cancel horizontally and add vertically.
  assert.equal(camera.project(3, 3, 0).x, 0);
  assert.equal(camera.project(3, 3, 0).y, 120);
});

test('depth puts distant solids first and taller ones after their neighbours', () => {
  const camera = createCamera({unit:30});
  assert.ok(camera.depth(0, 0, 0) < camera.depth(1, 0, 0));
  assert.ok(camera.depth(1, 0, 0) < camera.depth(1, 1, 0));
  assert.ok(camera.depth(1, 1, 0) < camera.depth(1, 1, 5), 'height breaks a tie');
  assert.ok(camera.depth(2, 0, 0) - camera.depth(1, 1, 0) < 1e-9, 'the same diagonal reads as the same distance');
});

test('a scene draws back to front, and equal depths keep the order they were added', () => {
  const camera = createCamera({unit:30});
  const scene = createScene(camera);
  const drawn = [];
  scene.add(5, () => drawn.push('far'));
  scene.add(1, () => drawn.push('near'));
  scene.add(3, () => drawn.push('middle'));
  scene.add(3, () => drawn.push('middle-again'));
  assert.deepEqual(ordered(scene).map(shape => shape.depth), [1, 3, 3, 5]);
  paint({}, scene);
  assert.deepEqual(drawn, ['near', 'middle', 'middle-again', 'far']);
});

test('ground never paints over the solids standing on it', () => {
  // The regression this guards: a deck's centre is further from the viewer than
  // any small solid on it, so depth alone would paint the deck last.
  const camera = createCamera({unit:30});
  const scene = createScene(camera);
  const drawn = [];
  scene.tile({x:0, y:0, w:8, d:4, colour:'#123'});            // a wide deck
  scene.box({x:0.5, y:0.5, z:0, w:1, d:1, h:1, colour:'#456'}); // a switch near the front
  scene.label({x:0.5, y:0.5, z:1.4, text:'on'});
  scene.shadow({x:0.5, y:0.5, w:1, d:1});
  const order = ordered(scene);
  assert.deepEqual(order.map(shape => shape.layer), [layers.ground, layers.shadow, layers.solid, layers.label]);
  assert.ok(order[0].depth > order[2].depth, 'the deck is genuinely further away, which is why depth alone fails');
});

test('a box draws three faces, lit top brightest and left darkest', () => {
  const camera = createCamera({unit:30});
  const scene = createScene(camera);
  const fills = [];
  const ctx = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {},
    set fillStyle(value) { fills.push(value); }, get fillStyle() { return ''; },
    set strokeStyle(value) {}, set lineWidth(value) {}, set globalAlpha(value) {}, set globalCompositeOperation(value) {}
  };
  scene.box({x:0, y:0, z:0, w:1, d:1, h:1, colour:'#808080'});
  paint(ctx, scene);
  assert.equal(fills.length, 3, 'left, right and top');
  const [left, right, top] = fills.map(parseColour);
  assert.ok(left.r < right.r, 'the left face is darker than the right');
  assert.ok(right.r < top.r, 'the right face is darker than the top');
  assert.ok(faces.top > 0 && faces.left < faces.right, 'the lighting constants agree');
});

test('shading moves a colour towards white or black without leaving the range', () => {
  assert.equal(shade('#808080', 0), '#808080');
  assert.equal(shade('#000000', 1), '#ffffff');
  assert.equal(shade('#ffffff', -1), '#000000');
  assert.ok(parseColour(shade('#3366cc', 0.4)).r > 0x33);
  assert.ok(parseColour(shade('#3366cc', -0.4)).b < 0xcc);
  assert.match(shade('#3366cc', 0, 0.5), /^rgb\(.*\/ 0\.5\)$/);
  assert.deepEqual(parseColour('#abc'), {r:0xaa, g:0xbb, b:0xcc, a:1});
  assert.deepEqual(parseColour('rgb(1 2 3 / 0.5)'), {r:1, g:2, b:3, a:0.5});
});

test('a click finds the solid under it, and the nearest one when they overlap', () => {
  const camera = createCamera({unit:40});
  const scene = createScene(camera);
  scene.box({x:0, y:0, w:2, d:2, h:1, id:'floor'});
  scene.box({x:0, y:0, w:1, d:1, h:3, id:'tower'});
  const tower = camera.project(0.5, 0.5, 3);
  assert.equal(pick(scene, tower.x, tower.y), 'tower', 'the nearer solid wins');
  const corner = camera.project(1.8, 1.8, 1);
  assert.equal(pick(scene, corner.x, corner.y), 'floor');
  assert.equal(pick(scene, 9999, 9999), null, 'empty space picks nothing');
});

test('point-in-polygon handles edges and the bounding-box shortcut', () => {
  const square = polygon([{x:0, y:0}, {x:10, y:0}, {x:10, y:10}, {x:0, y:10}]);
  assert.equal(contains(square, 5, 5), true);
  assert.equal(contains(square, 11, 5), false);
  assert.equal(contains(square, -1, 5), false);
  assert.equal(contains(square, 5, 11), false);
  assert.deepEqual([square.left, square.right, square.top, square.bottom], [0, 10, 0, 10]);
});

test('the camera frames a world so it fills the canvas whatever its extent', () => {
  for (const bounds of [{minX:0, maxX:1, minY:0, maxY:1, maxZ:0}, {minX:0, maxX:12, minY:0, maxY:8, maxZ:3}, {minX:-4, maxX:4, minY:-2, maxY:9, maxZ:6}]) {
    const camera = fitCamera({width:800, height:480, bounds, padding:20});
    const corners = [];
    for (const x of [bounds.minX, bounds.maxX]) for (const y of [bounds.minY, bounds.maxY]) for (const z of [0, bounds.maxZ]) corners.push(camera.project(x, y, z));
    const left = Math.min(...corners.map(point => point.x));
    const right = Math.max(...corners.map(point => point.x));
    const top = Math.min(...corners.map(point => point.y));
    const bottom = Math.max(...corners.map(point => point.y));
    assert.ok(left >= 19 && right <= 781, `x ${left}–${right} stays inside the padding`);
    assert.ok(top >= 19 && bottom <= 461, `y ${top}–${bottom} stays inside the padding`);
    // And it is centred: the slack is shared between the two sides.
    assert.ok(Math.abs((left - 0) - (800 - right)) < 1.5, 'centred horizontally');
    assert.ok(Math.abs((top - 0) - (480 - bottom)) < 1.5, 'centred vertically');
  }
});

test('the camera never scales past its cap, so a tiny world is not absurdly magnified', () => {
  const camera = fitCamera({width:1200, height:800, bounds:{minX:0, maxX:0.5, minY:0, maxY:0.5, maxZ:0}, maxUnit:60});
  assert.equal(camera.unit, 60);
});

test('scene ink stays readable on the deck in both page themes', async () => {
  // palette() reads a few page tokens, so the module needs a document. The ones
  // that matter here — the deck and the label ink — are fixed, and this test is
  // what stops them drifting back to the theme, where light mode painted dark
  // labels on a dark deck.
  const tokens = {
    dark:{'--accent':'#6fe3ff', '--accent-quiet':'#3f7f96', '--success':'#5fd6a4', '--warn':'#f0b866', '--danger':'#ff7d6b', '--text':'#e8f1ff', '--text-dim':'#8fa6c0', '--surface-2':'#132538'},
    light:{'--accent':'#0d6b86', '--accent-quiet':'#2d7f99', '--success':'#1d7a52', '--warn':'#8a5a10', '--danger':'#b23824', '--text':'#10202f', '--text-dim':'#4a5a6b', '--surface-2':'#ffffff'}
  };
  let theme = 'dark';
  globalThis.document = {documentElement:{dataset:{get theme() { return theme; }}}};
  globalThis.getComputedStyle = () => ({getPropertyValue:name => tokens[theme][name] ?? ''});
  const {palette} = await import('../dist/scenes.js');

  const channel = value => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const luminance = colour => { const {r, g, b} = parseColour(colour); return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b); };
  const contrast = (a, b) => { const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (high + 0.05) / (low + 0.05); };

  for (theme of ['dark', 'light']) {
    const colours = palette();
    for (const surface of [colours.deck, colours.deckDark, colours.metal, colours.metalDark, colours.ink]) {
      assert.ok(contrast(colours.text, surface) >= 4.5, `${theme}: label ink on ${surface} is ${contrast(colours.text, surface).toFixed(2)}:1`);
      assert.ok(contrast(colours.dim, surface) >= 3, `${theme}: dim ink on ${surface} is ${contrast(colours.dim, surface).toFixed(2)}:1`);
    }
    // The halo behind a label is dark, so the ink over it must be light.
    assert.ok(luminance(colours.text) > 0.5, `${theme}: label ink is too dark for the halo behind it`);
  }
  delete globalThis.document;
  delete globalThis.getComputedStyle;
});
