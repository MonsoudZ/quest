// Isometric scenes for the missions. Each one describes its world in whatever
// units suit it; the stage frames the result to the canvas.
//
// A scene is {bounds, build, describe, still?}. `build` receives the shared
// scene API from iso.js plus the mission state, and adds solids to it.
import {shade} from './iso.js';
import {encapsulate, transfer} from './net.js';
import {evaluateNetwork, bitValue} from './engine.js';

// Scenes take their colours from the stylesheet, so they follow the theme.
let cached = {theme:null, palette:null};
export function palette() {
  const theme = document.documentElement.dataset.theme ?? 'auto';
  const style = getComputedStyle(document.documentElement);
  const read = name => style.getPropertyValue(name).trim() || '#6fe3ff';
  const signature = `${theme}|${read('--accent')}|${read('--surface-2')}`;
  if (cached.theme === signature) return cached.palette;
  cached = {theme:signature, palette:{
    accent:read('--accent'), accentQuiet:read('--accent-quiet'),
    success:read('--success'), warn:read('--warn'), danger:read('--danger'),
    deck:'#1d3550', deckDark:'#132538', metal:'#33526f', metalDark:'#223b53',
    text:read('--text'), dim:read('--text-dim'), ink:'#04101d'
  }};
  return cached.palette;
}

// A deck is ground: it must never paint over the solids standing on it.
// A plinth: the surface a scene stands on, with a rim so it reads as an object.
const plinth = (scene, {x, y, w, d, colour, rim}) => {
  scene.tile({x:x - 0.12, y:y - 0.12, z:-0.002, w:w + 0.24, d:d + 0.24, colour:shade(colour, -0.3)});
  scene.tile({x, y, z:0, w, d, colour, outline:rim ?? shade(colour, 0.22)});
};

// ------------------------------------------------------------------ bits

const bits = {
  bounds:level => ({minX:-0.25, maxX:level.bits.width * 1.38, minY:-0.3, maxY:2.3, maxZ:1.7, ratio:0.62}),
  describe:(level, state) => `A row of ${level.bits.width} switches. ${state.bits.map((bit, index) => `${2 ** (level.bits.width - 1 - index)}: ${bit ? 'on' : 'off'}`).join(', ')}.`,
  build(scene, {level, state, time, hovered}) {
    const colours = palette();
    const width = level.bits.width;
    const places = Array.from({length:width}, (_, index) => 2 ** (width - 1 - index));
    const span = width * 1.38;
    scene.glow({x:span / 2, y:0.85, radius:span * 0.8, colour:colours.accent, strength:0.15});
    plinth(scene, {x:-0.18, y:-0.22, w:span + 0.24, d:2.42, colour:colours.deckDark});
    // A rail across the front carries the place values, so the numbers sit on
    // something instead of floating next to the switches.
    scene.box({x:-0.18, y:1.75, z:0, w:span + 0.24, d:0.42, h:0.16, colour:shade(colours.metalDark, -0.25), top:shade(colours.metalDark, 0.06), outline:false});
    state.bits.forEach((bit, index) => {
      const x = index * 1.38, y = 0;
      const id = `bit-${index}`;
      const lit = Boolean(bit);
      const lift = lit ? 0.92 : 0.34;
      const bob = lit && time ? Math.sin(time * 2 + index) * 0.014 : 0;
      scene.box({x, y:y + 0.05, z:0, w:1.02, d:1.35, h:0.2, colour:shade(colours.metalDark, -0.28), top:shade(colours.metalDark, -0.06), outline:false});
      scene.shadow({x:x + 0.1, y:y + 0.18, w:0.85, d:1.05, strength:0.36});
      const body = lit ? colours.accentQuiet : colours.metal;
      scene.box({x:x + 0.11, y:y + 0.18, z:0.2, w:0.8, d:1.05, h:lift + bob, colour:body, top:shade(body, 0.1), glow:lit ? 0.3 : 0, id});
      // A cap plate gives the switch a machined edge rather than one flat face.
      scene.box({
        x:x + 0.19, y:y + 0.26, z:0.2 + lift + bob, w:0.64, d:0.89, h:0.1,
        colour:lit ? colours.accent : shade(colours.metal, 0.14),
        top:lit ? shade(colours.accent, 0.3) : shade(colours.metal, 0.26),
        glow:lit ? 0.5 : 0
      });
      if (lit) scene.tube({from:[x + 0.51, y + 0.7, 0.3 + lift], to:[x + 0.51, y + 0.7, 1.6], radius:10, colour:colours.accent, alpha:0.16, bias:0.2});
      if (hovered === id) scene.tile({x:x + 0.02, y:y + 0.07, z:0.205, w:0.98, d:1.27, colour:colours.accent, alpha:0.22, bias:0.4});
      scene.label({x:x + 0.51, y:y + 0.7, z:0.34 + lift + bob, text:String(bit), size:19, weight:600, colour:lit ? colours.ink : colours.text, halo:lit ? colours.accent : colours.ink});
      const sign = level.bits.encoding === 'twos' && index === 0 ? '−' : '';
      scene.label({x:x + 0.51, y:1.96, z:0.16, text:`${sign}${places[index]}`, size:13, weight:600, colour:lit ? colours.accent : colours.dim, offset:1});
    });
  }
};

// ------------------------------------------------------------------ sort

const sort = {
  bounds:(level, state) => ({minX:-0.3, maxX:state.values.length * 1.18, minY:-0.3, maxY:1.7, maxZ:Math.max(...state.values) * 0.32 + 0.8}),
  describe:(level, state) => `Crates in the order ${state.values.join(', ')}.`,
  build(scene, {level, state}) {
    const colours = palette();
    const values = state.values;
    const span = values.length * 1.18;
    const sorted = values.every((value, index) => index === 0 || values[index - 1] <= value);
    scene.glow({x:span / 2, y:0.6, radius:span * 0.75, colour:sorted ? colours.success : colours.accent, strength:0.14});
    plinth(scene, {x:-0.2, y:-0.2, w:span + 0.2, d:1.7, colour:colours.deckDark});
    values.forEach((value, index) => {
      const x = index * 1.18, height = value * 0.3 + 0.22;
      const settled = index === 0 || values[index - 1] <= value;
      const colour = sorted ? colours.success : settled ? colours.accentQuiet : colours.warn;
      scene.shadow({x, y:0.05, w:1, d:1, strength:0.34});
      const crates = Math.max(1, Math.min(6, Math.round(value / 1.6)));
      for (let crate = 0; crate < crates; crate++) {
        scene.box({
          x:x + 0.08, y:0.12, z:crate * (height / crates), w:0.84, d:0.84, h:height / crates - 0.035,
          colour, top:shade(colour, 0.14)
        });
      }
      scene.label({x:x + 0.5, y:0.54, z:height + 0.26, text:String(value), size:17, weight:600, colour:colours.text});
      scene.label({x:x + 0.5, y:1.3, z:0, text:`[${index}]`, size:12, colour:colours.dim, offset:2});
    });
  }
};

// ------------------------------------------------- layering (encapsulation)

const layers = {
  bounds:level => {
    const span = 1.9 + level.items.length * 0.66;
    return {minX:-span / 2 - 0.4, maxX:span / 2 + 0.4, minY:-span / 2 - 0.4, maxY:span / 2 + 0.4, maxZ:level.items.length * 0.46 + 1.5, ratio:0.52};
  },
  describe:(level, state) => `A packet wrapped in ${state.order.length} headers around ${state.dials.payload} bytes of payload.`,
  build(scene, {level, state, time}) {
    const colours = palette();
    const headers = state.order.map(id => level.items.find(item => item.id === id));
    const tint = ['#7cc5f5', '#b6a8ff', '#ffc978', '#6ce3b4'];
    const count = headers.length;
    const outermost = 1.9 + count * 0.66;
    scene.glow({x:0, y:0, radius:outermost * 0.9, colour:colours.accent, strength:0.16});
    let z = 0;
    // Outermost first, each one a step wider: what a layer wraps is everything
    // above it in the stack.
    [...headers].reverse().forEach((header, index) => {
      const span = 1.9 + (count - index) * 0.66;
      const origin = -span / 2;
      const height = 0.44;
      const colour = tint[(count - 1 - index) % tint.length];
      scene.box({x:origin, y:origin, z, w:span, d:span, h:height, colour:shade(colour, -0.42), top:shade(colour, -0.12)});
      // Anchored to the left-front corner, which fans out as the slabs widen.
      scene.label({
        x:origin - 0.12, y:origin + span, z:z + height * 0.55,
        text:`${header.name} +${header.bytes} B`, size:12, weight:600, align:'right', colour:shade(colour, 0.25), offset:2
      });
      z += height;
    });
    const payload = 1.9;
    const origin = -payload / 2;
    const lift = time ? Math.sin(time * 1.3) * 0.045 : 0;
    scene.shadow({x:origin, y:origin, w:payload, d:payload, strength:0.3});
    scene.box({x:origin, y:origin, z:z + 0.2 + lift, w:payload, d:payload, h:0.5, colour:colours.accentQuiet, top:colours.accent, glow:0.34});
    scene.label({x:0, y:0, z:z + 0.78 + lift, text:`${state.dials.payload} B`, size:15, weight:600, colour:colours.ink, halo:colours.accent});
  }
};

// --------------------------------------------------------------- transport

const transport = {
  bounds:() => ({minX:-1.6, maxX:14.6, minY:-1.2, maxY:3.2, maxZ:3, ratio:0.44}),
  describe:(level, state) => `A ${level.link.capacityMbps} Mbps link with ${level.link.rttMs} ms of round trip, carrying a window of ${state.dials.window} packets.`,
  build(scene, {level, state, time}) {
    const colours = palette();
    const result = transfer(level.link, {window:state.dials.window, protocol:state.dials.protocol ?? 'selective-repeat', bytes:level.bytes});
    const length = 13;
    const share = Math.min(1, (state.dials.window * level.link.mss) / Math.max(1, result.bdpBytes));
    const filled = share >= 0.98;

    scene.glow({x:length / 2, y:1, radius:8, colour:filled ? colours.success : colours.accent, strength:0.12});
    // Two ground stations with a dish each.
    [['Sender', -0.2], ['Receiver', length + 0.2]].forEach(([name, x], index) => {
      scene.shadow({x:x - 0.7, y:0.2, w:1.9, d:1.7, strength:0.42});
      scene.box({x:x - 0.7, y:0.25, z:0, w:1.5, d:1.4, h:1.2, colour:colours.metalDark, top:shade(colours.metal, 0.1)});
      scene.box({x:x - 0.35, y:0.6, z:1.2, w:0.75, d:0.7, h:0.5, colour:colours.metal, top:shade(colours.metal, 0.2)});
      scene.orb({x:x + (index ? -0.1 : 0.4), y:0.95, z:1.95, radius:7, colour:colours.accent, glow:true});
      scene.label({x:x + 0.05, y:0.95, z:2.5, text:name, size:13, weight:600, colour:colours.text});
    });
    // The pipe is one bandwidth-delay product long; the window fills part of it.
    scene.tile({x:0.9, y:0.45, w:length - 0.8, d:1.1, colour:shade(colours.deckDark, -0.1), outline:shade(colours.metal, -0.1)});
    scene.tube({from:[1, 1, 0.66], to:[length, 1, 0.66], radius:22, colour:shade(colours.metalDark, -0.05), alpha:0.92});
    scene.tube({from:[1, 1, 0.66], to:[1 + (length - 1) * share, 1, 0.66], radius:15, colour:filled ? colours.success : colours.accent, alpha:0.8});
    const inFlight = Math.max(1, Math.min(18, Math.round(share * 16) + 1));
    for (let index = 0; index < inFlight; index++) {
      const offset = time ? (time * 0.3 + index / inFlight) % 1 : (index + 0.5) / inFlight;
      const lost = level.link.lossEvery > 0 && index === Math.floor(inFlight / 2) && offset > 0.65;
      scene.orb({x:1 + offset * (length - 1) * share, y:1, z:0.66, radius:6.5, colour:lost ? colours.danger : shade(colours.accent, 0.2)});
    }
    scene.label({
      x:length / 2, y:2.7, z:0,
      text:filled ? 'the window fills the pipe' : `${Math.round(share * 100)}% of the pipe in use`,
      size:13, weight:600, colour:filled ? colours.success : colours.warn, offset:4
    });
  }
};

// ------------------------------------------------------- graphs and routes

const network = {
  bounds:level => {
    const xs = level.nodes.map(node => node[1] / 12), ys = level.nodes.map(node => node[2] / 12);
    return {minX:Math.min(...xs) - 0.9, maxX:Math.max(...xs) + 0.9, minY:Math.min(...ys) - 0.9, maxY:Math.max(...ys) + 1, maxZ:2.6, ratio:0.64};
  },
  describe:(level, state) => `${level.nodes.length} relays, ${state.links.length} cables enabled.`,
  build(scene, {level, state, time, hovered}) {
    const colours = palette();
    const place = id => {
      const node = level.nodes.find(entry => entry[0] === id);
      return [node[1] / 12, node[2] / 12];
    };
    const result = evaluateNetwork(level, state.links);
    const onRoute = new Set(result.pathEdges ?? []);
    level.edges.forEach((edge, index) => {
      const [ax, ay] = place(edge[0]), [bx, by] = place(edge[1]);
      const enabled = state.links.includes(index);
      const routed = onRoute.has(index);
      const colour = routed ? colours.warn : enabled ? colours.accent : shade(colours.metal, -0.1);
      scene.tube({
        from:[ax, ay, 0.66], to:[bx, by, 0.66],
        radius:routed ? 10 : enabled ? 8 : 5,
        colour, alpha:enabled ? 1 : 0.8,
        dash:enabled ? null : [7, 6],
        glow:routed,
        id:`link-${index}`
      });
      if (hovered === `link-${index}`) scene.tube({from:[ax, ay, 0.66], to:[bx, by, 0.66], radius:16, colour:colours.accent, alpha:0.22, bias:-0.1});
      if (level.budget) scene.label({x:(ax + bx) / 2, y:(ay + by) / 2, z:1.15, text:`${edge[2]} ms`, size:12, weight:600, colour:enabled ? colours.text : colours.dim});
    });
    level.nodes.forEach(([id]) => {
      const [x, y] = place(id);
      const endpoint = id === level.source || id === level.target;
      scene.glow({x, y, radius:1.3, colour:endpoint ? colours.accent : colours.metal, strength:endpoint ? 0.22 : 0.1});
      scene.shadow({x:x - 0.5, y:y - 0.5, w:1, d:1, strength:0.42});
      scene.box({x:x - 0.46, y:y - 0.46, z:0, w:0.92, d:0.92, h:0.42, colour:shade(colours.metalDark, -0.12), top:colours.metalDark, outline:false});
      scene.box({x:x - 0.32, y:y - 0.32, z:0.42, w:0.64, d:0.64, h:endpoint ? 0.72 : 0.4,
        colour:endpoint ? colours.accentQuiet : colours.metal,
        top:endpoint ? colours.accent : shade(colours.metal, 0.12),
        glow:endpoint ? 0.34 : 0});
      if (endpoint) scene.orb({x, y, z:1.35, radius:6, colour:colours.accent});
      scene.label({x, y, z:endpoint ? 1.75 : 1.1, text:id.replace(/-/g, ' '), size:12, weight:600, colour:endpoint ? colours.accent : colours.text});
    });
    if (result.path?.length > 1 && time) {
      const legs = result.path.length - 1;
      const travelled = ((time * 0.45) % 1) * legs;
      const leg = Math.min(legs - 1, Math.floor(travelled));
      const within = travelled - leg;
      const [ax, ay] = place(result.path[leg]), [bx, by] = place(result.path[leg + 1]);
      scene.orb({x:ax + (bx - ax) * within, y:ay + (by - ay) * within, z:0.66 + Math.sin(within * Math.PI) * 0.14, radius:8, colour:colours.warn});
    }
  }
};

export const scenes = {bits, sort, layers, transport, network};
export const sceneFor = level => scenes[level.kind] ?? null;
