// A small isometric 3D renderer: projection, lighting, solids, depth sorting,
// and hit testing, drawn on a 2D canvas.
//
// There is no WebGL and no dependency here on purpose — the game ships as
// static files with no build step. What this gives up is real perspective,
// per-pixel lighting and self-shadowing; what it keeps is a consistent solid
// look across every mission, at a size the repository can hold and the tests
// can reason about.

// ------------------------------------------------------------- geometry

// Screen x comes from (x − y), so +x runs to the lower right and +y to the
// lower left; z lifts straight up. The viewer sits over +x +y.
export function createCamera({unit = 30, ratio = 0.5, rise = 0.82, x = 0, y = 0} = {}) {
  const halfWidth = unit, halfHeight = unit * ratio, lift = unit * rise;
  return {
    unit, halfWidth, halfHeight, lift, origin:{x, y},
    project(px, py, pz = 0) {
      return {
        x:x + (px - py) * halfWidth,
        y:y + (px + py) * halfHeight - pz * lift
      };
    },
    // Painter's order: things further from the viewer are drawn first. Height
    // breaks ties so a stack reads bottom to top.
    depth:(px, py, pz = 0) => px + py + pz * 0.002,
    moved(dx, dy) { return createCamera({unit, ratio, rise, x:x + dx, y:y + dy}); }
  };
}

export const polygon = points => {
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const point of points) {
    left = Math.min(left, point.x); right = Math.max(right, point.x);
    top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
  }
  return {points, left, right, top, bottom};
};

// Ray casting, used to turn a click on the canvas back into the solid under it.
export function contains(shape, x, y) {
  const {points} = shape;
  if (x < shape.left || x > shape.right || y < shape.top || y > shape.bottom) return false;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// --------------------------------------------------------------- colour

const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const hex = value => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');

export function parseColour(colour) {
  if (typeof colour !== 'string') return {r:128, g:128, b:128, a:1};
  const text = colour.trim();
  if (text.startsWith('#')) {
    const body = text.slice(1);
    const full = body.length === 3 ? [...body].map(character => character + character).join('') : body;
    return {r:parseInt(full.slice(0, 2), 16), g:parseInt(full.slice(2, 4), 16), b:parseInt(full.slice(4, 6), 16), a:full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1};
  }
  const numbers = text.match(/[\d.]+/g)?.map(Number) ?? [];
  return {r:numbers[0] ?? 128, g:numbers[1] ?? 128, b:numbers[2] ?? 128, a:numbers[3] ?? 1};
}

// Positive lifts a colour towards white, negative towards black, which is all
// the lighting model this renderer needs.
export function shade(colour, amount, alpha) {
  const {r, g, b, a} = parseColour(colour);
  const mix = (channel) => amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
  const opacity = alpha ?? a;
  const parts = `#${hex(mix(r))}${hex(mix(g))}${hex(mix(b))}`;
  return opacity >= 1 ? parts : `rgb(${Math.round(mix(r))} ${Math.round(mix(g))} ${Math.round(mix(b))} / ${Number(opacity.toFixed(3))})`;
}

// Faces, brightest on top: the light sits high over the +x side.
export const faces = {top:0.2, right:-0.14, left:-0.38, front:-0.02};

// ---------------------------------------------------------------- scene

// Depth alone cannot order a large ground plane against the small solids
// standing on it: the plane's centre is further away than any of them, so it
// would be painted last and cover them. Layers fix the classes of thing that
// always belong behind or in front, and depth orders within a layer.
export const layers = {ground:0, shadow:1, solid:2, label:3};

export function createScene(camera) {
  const shapes = [];
  const hits = [];
  const add = (depth, render, hit, layer = layers.solid) => {
    shapes.push({depth, render, order:shapes.length, layer});
    if (hit) hits.push({...hit, order:shapes.length});
  };
  const at = (x, y, z) => camera.project(x, y, z);

  const api = {
    camera, shapes, hits,
    add,

    // A rectangular solid, drawn as its three visible faces.
    box({x, y, z = 0, w = 1, d = 1, h = 1, colour = '#4a6a86', top, alpha = 1, glow = 0, outline = true, bias = 0, id = null}) {
      const corners = {
        topFace:[at(x, y, z + h), at(x + w, y, z + h), at(x + w, y + d, z + h), at(x, y + d, z + h)],
        rightFace:[at(x + w, y, z), at(x + w, y + d, z), at(x + w, y + d, z + h), at(x + w, y, z + h)],
        leftFace:[at(x, y + d, z), at(x + w, y + d, z), at(x + w, y + d, z + h), at(x, y + d, z + h)]
      };
      const surface = top ?? colour;
      add(camera.depth(x + w / 2, y + d / 2, z + h) + bias, ctx => {
        fill(ctx, corners.leftFace, shade(colour, faces.left, alpha));
        fill(ctx, corners.rightFace, shade(colour, faces.right, alpha));
        fill(ctx, corners.topFace, shade(surface, faces.top, alpha));
        if (outline) {
          ctx.strokeStyle = shade(colour, -0.45, alpha * 0.9);
          ctx.lineWidth = 1;
          for (const face of Object.values(corners)) trace(ctx, face, true);
        }
        if (glow > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = clamp(glow);
          fill(ctx, corners.topFace, shade(surface, 0.45));
          ctx.restore();
        }
      }, id ? {id, shape:polygon(corners.topFace)} : null);
      return corners;
    },

    // A soft ellipse on the ground, which is what sells the height of a solid.
    shadow({x, y, w = 1, d = 1, strength = 0.35}) {
      const centre = at(x + w / 2, y + d / 2, 0);
      add(camera.depth(x + w / 2, y + d / 2, 0), ctx => {
        const radius = Math.max(w, d) * camera.halfWidth * 0.62;
        const gradient = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, radius);
        gradient.addColorStop(0, `rgb(0 0 0 / ${strength})`);
        gradient.addColorStop(1, 'rgb(0 0 0 / 0)');
        ctx.save();
        ctx.translate(centre.x, centre.y);
        ctx.scale(1, camera.halfHeight / camera.halfWidth);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }, null, layers.shadow);
    },

    // A pool of light on the ground. Without one, a solid floats in a void.
    glow({x, y, radius = 3, colour = '#6fe3ff', strength = 0.22}) {
      const centre = at(x, y, 0);
      add(camera.depth(x, y, 0), ctx => {
        const pixels = radius * camera.halfWidth;
        const gradient = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, pixels);
        gradient.addColorStop(0, shade(colour, 0.1, strength));
        gradient.addColorStop(1, shade(colour, 0, 0));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(centre.x, centre.y);
        ctx.scale(1, camera.halfHeight / camera.halfWidth);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, pixels, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }, null, layers.ground);
    },

    // A flat quad on the ground plane: decks, water, platforms.
    tile({x, y, z = 0, w = 1, d = 1, colour = '#26405c', alpha = 1, outline = null, bias = 0, id = null}) {
      const corners = [at(x, y, z), at(x + w, y, z), at(x + w, y + d, z), at(x, y + d, z)];
      add(camera.depth(x + w / 2, y + d / 2, z) + bias, ctx => {
        fill(ctx, corners, shade(colour, 0, alpha));
        if (outline) {
          ctx.strokeStyle = outline;
          ctx.lineWidth = 1.2;
          trace(ctx, corners, true);
        }
      }, id ? {id, shape:polygon(corners)} : null, layers.ground);
      return corners;
    },

    // A cable or pipe between two points in space.
    tube({from, to, radius = 6, colour = '#6fe3ff', alpha = 1, dash = null, glow = false, bias = 0, id = null}) {
      const a = at(...from), b = at(...to);
      const middle = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
      add(camera.depth(...middle) + bias, ctx => {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = shade(colour, -0.45, alpha);
        ctx.lineWidth = radius + 2.5;
        if (dash) ctx.setLineDash(dash);
        line(ctx, a, b);
        ctx.strokeStyle = shade(colour, 0.05, alpha);
        ctx.lineWidth = radius;
        line(ctx, a, b);
        ctx.strokeStyle = shade(colour, 0.5, alpha * 0.7);
        ctx.lineWidth = Math.max(1, radius * 0.28);
        ctx.translate(0, -radius * 0.22);
        line(ctx, a, b);
        ctx.restore();
        if (glow) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = shade(colour, 0.35);
          ctx.lineWidth = radius * 2.2;
          ctx.filter = 'blur(6px)';
          line(ctx, a, b);
          ctx.restore();
        }
      }, id ? {id, shape:polygon(thickLine(a, b, Math.max(14, radius * 2)))} : null);
    },

    // A glowing bead: packets, keys, anything in flight.
    orb({x, y, z = 0, radius = 7, colour = '#ffdc93', glow = true, bias = 0}) {
      const centre = at(x, y, z);
      add(camera.depth(x, y, z) + bias, ctx => {
        if (glow) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const halo = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, radius * 3);
          halo.addColorStop(0, shade(colour, 0.2, 0.55));
          halo.addColorStop(1, shade(colour, 0, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(centre.x, centre.y, radius * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        const body = ctx.createRadialGradient(centre.x - radius * 0.35, centre.y - radius * 0.45, radius * 0.1, centre.x, centre.y, radius);
        body.addColorStop(0, shade(colour, 0.55));
        body.addColorStop(1, shade(colour, -0.25));
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    },

    // Text that always faces the viewer.
    label({x, y, z = 0, text, colour = '#e8f1ff', size = 13, weight = 500, align = 'center', halo = '#060d18', offset = 0, bias = 4, font = 'var(--font-display)'}) {
      const point = at(x, y, z);
      add(camera.depth(x, y, z) + bias, ctx => {
        ctx.save();
        ctx.font = `${weight} ${size}px ${font.startsWith('var') ? "'Space Grotesk', system-ui, sans-serif" : font}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = halo;
        ctx.strokeText(text, point.x, point.y + offset);
        ctx.fillStyle = colour;
        ctx.fillText(text, point.x, point.y + offset);
        ctx.restore();
      }, null, layers.label);
    }
  };
  return api;
}

// ---------------------------------------------------------------- render

const fill = (ctx, points, colour) => {
  ctx.fillStyle = colour;
  trace(ctx, points);
  ctx.fill();
};
function trace(ctx, points, stroke = false) {
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.closePath();
  if (stroke) ctx.stroke();
}
const line = (ctx, a, b) => {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};
function thickLine(a, b, width) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = (-dy / length) * width / 2, ny = (dx / length) * width / 2;
  return [{x:a.x + nx, y:a.y + ny}, {x:b.x + nx, y:b.y + ny}, {x:b.x - nx, y:b.y - ny}, {x:a.x - nx, y:a.y - ny}];
}

// Ground first, then shadows, then solids back to front, then labels. Insertion
// order breaks exact ties so a scene is stable frame to frame.
export const ordered = scene => [...scene.shapes].sort((a, b) => a.layer - b.layer || a.depth - b.depth || a.order - b.order);

export function paint(ctx, scene) {
  for (const shape of ordered(scene)) shape.render(ctx);
  return scene;
}

// Front to back: the solid the player actually clicked.
export function pick(scene, x, y) {
  const candidates = [...scene.hits].sort((a, b) => b.order - a.order);
  for (const candidate of candidates) if (contains(candidate.shape, x, y)) return candidate.id;
  return null;
}

// Frame the world so a scene fills the canvas whatever its extent: the caller
// says how big its world is, not how big a pixel should be.
export function fitCamera({width, height, bounds, padding = 26, ratio = 0.5, rise = 0.82, maxUnit = 96}) {
  const probe = createCamera({unit:1, ratio, rise});
  const corners = [];
  for (const x of [bounds.minX ?? 0, bounds.maxX ?? 1]) {
    for (const y of [bounds.minY ?? 0, bounds.maxY ?? 1]) {
      for (const z of [0, bounds.maxZ ?? 0]) corners.push(probe.project(x, y, z));
    }
  }
  const left = Math.min(...corners.map(point => point.x));
  const right = Math.max(...corners.map(point => point.x));
  const top = Math.min(...corners.map(point => point.y));
  const bottom = Math.max(...corners.map(point => point.y));
  const unit = Math.max(4, Math.min(
    (width - padding * 2) / Math.max(0.001, right - left),
    (height - padding * 2) / Math.max(0.001, bottom - top),
    maxUnit
  ));
  return createCamera({
    unit, ratio, rise,
    x:width / 2 - ((left + right) / 2) * unit,
    y:height / 2 - ((top + bottom) / 2) * unit
  });
}
