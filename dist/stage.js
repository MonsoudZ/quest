// Hosts an isometric scene on a canvas: sizing, the animation loop, and turning
// a click back into the solid under the pointer.
import {createScene, fitCamera, paint, pick} from './iso.js';
import {reduceMotion} from './ui.js';

export function createStage(container, {build, bounds, onPick, describe, aspect = 0.6, padding = 26, still = false}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'iso-stage';
  canvas.setAttribute('role', 'img');
  container.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');

  let state = null, frame = 0, destroyed = false, started = 0, hovered = null, scene = null, size = {width:0, height:0};
  const density = () => Math.min(2, window.devicePixelRatio || 1);

  function measure() {
    const box = container.getBoundingClientRect();
    const width = Math.max(240, Math.round(box.width));
    const height = Math.max(180, Math.round(width * aspect));
    if (width === size.width && height === size.height) return false;
    size = {width, height};
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * density());
    canvas.height = Math.round(height * density());
    return true;
  }

  function render(time) {
    if (destroyed || !state) return;
    const seconds = reduceMotion() || still ? 0 : (time - started) / 1000;
    ctx.setTransform(density(), 0, 0, density(), 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    const world = bounds(state);
    const camera = fitCamera({width:size.width, height:size.height, bounds:world, padding, ratio:world.ratio ?? 0.5, rise:world.rise ?? 0.82, maxUnit:world.maxUnit ?? 96});
    scene = createScene(camera);
    build(scene, {state, time:seconds, hovered, width:size.width, height:size.height});
    paint(ctx, scene);
  }

  function loop(time) {
    if (destroyed) return;
    frame = requestAnimationFrame(loop);
    if (document.hidden || !canvas.isConnected || canvas.closest('[hidden]')) return;
    render(time);
  }

  const point = event => {
    const box = canvas.getBoundingClientRect();
    return {x:(event.clientX - box.left) * (size.width / box.width), y:(event.clientY - box.top) * (size.height / box.height)};
  };
  if (onPick) {
    canvas.addEventListener('click', event => {
      const {x, y} = point(event);
      const id = scene && pick(scene, x, y);
      if (id !== null && id !== undefined) onPick(id);
    });
    canvas.addEventListener('pointermove', event => {
      const {x, y} = point(event);
      const id = scene ? pick(scene, x, y) : null;
      if (id === hovered) return;
      hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'default';
      if (reduceMotion() || still) render(performance.now());
    });
    canvas.addEventListener('pointerleave', () => { hovered = null; canvas.style.cursor = 'default'; });
  }

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (measure()) render(performance.now()); }) : null;
  observer?.observe(container);
  measure();

  return {
    canvas,
    update(next) {
      state = next;
      if (describe) canvas.setAttribute('aria-label', describe(next));
      if (!started) started = performance.now();
      measure();
      render(performance.now());
      // A still scene redraws only when the state changes; an animated one runs
      // its own loop, paused whenever the canvas is off screen.
      if (!frame && !reduceMotion() && !still) frame = requestAnimationFrame(loop);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    }
  };
}
