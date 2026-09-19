import {levels} from './levels.js';
import {simulate, evaluateAlgorithm, evaluateNetwork, describe, algoKinds} from './engine.js';
import {isPuzzle, initialState, solutionState, applyAction, widgets, view, evaluate} from './puzzles.js';
import {mountBuilder} from './builder.js';
import {mountCity} from './citylab.js';
import {registerGameTools} from './webmcp.js';
import {createScene} from './scene.js';
import {reveal, reduceMotion} from './ui.js';
import {createStage} from './stage.js';
import {sceneFor} from './scenes.js';

const $ = id => document.getElementById(id);
const saveKey = 'signal-quest-v2';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(saveKey) || '{}'); } catch { /* storage is optional */ }
const completed = new Set(Array.isArray(saved?.completed) ? saved.completed.filter(id => levels.some(level => level.id === id)) : []);
let current = Math.max(0, levels.findIndex(level => level.id === saved?.current));
let drafts = saved?.drafts && typeof saved.drafts === 'object' ? saved.drafts : {};
const collapsed = new Set(Array.isArray(saved?.collapsed) ? saved.collapsed : []);
let hintIndex = 0, unit = null, visited = [], trace = null, traceIndex = 0, runToken = 0, running = false;
let sound = false, audioContext = null, scene = null, sceneLevel = null, networkResult = null;
let puzzleState = null, algoResult = null, mode = 'campaign';
let stage = null, stageKind = null;
const level = () => levels[current];

function persist() {
  try { localStorage.setItem(saveKey, JSON.stringify({completed:[...completed], current:level().id, drafts, collapsed:[...collapsed]})); }
  catch {
    const note = document.querySelector('.save-note');
    if (note) note.textContent = 'Browser storage is unavailable. Progress lasts until this page closes.';
  }
}
const label = id => String(id).replace(/-/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
function log(message, style = '') {
  const line = document.createElement('p');
  line.textContent = message;
  line.className = style;
  $('log').append(line);
  $('log').scrollTop = $('log').scrollHeight;
}
function tone(success = true) {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.frequency.value = success ? 660 : 220;
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .18);
    oscillator.start(); oscillator.stop(audioContext.currentTime + .2);
  } catch { /* audio is optional */ }
}

const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const chevron = '<svg class="chapter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// The rail groups 38 missions into four collapsible chapters, each showing how
// much of it is finished. The chapter you are in is always open.
function navigation() {
  const container = $('missions');
  container.replaceChildren();
  for (const chapter of [...new Set(levels.map(item => item.chapter))]) {
    const missions = levels.filter(item => item.chapter === chapter);
    const done = missions.filter(item => completed.has(item.id)).length;
    const key = slug(chapter);
    const current_chapter = level().chapter === chapter;
    const expanded = current_chapter || !collapsed.has(key);

    const group = document.createElement('section');
    group.className = 'chapter-group';
    group.dataset.chapter = key;

    const head = document.createElement('button');
    head.className = 'chapter-head';
    head.setAttribute('aria-expanded', String(expanded));
    head.innerHTML = `<span class="chapter-dot"></span><span class="chapter-name">${chapter}</span><span class="chapter-count">${done}/${missions.length}</span>${chevron}`;
    head.addEventListener('click', () => {
      if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
      persist();
      navigation();
    });

    const track = document.createElement('div');
    track.className = 'chapter-track';
    track.innerHTML = `<i style="width:${Math.round(done / missions.length * 100)}%"></i>`;

    const list = document.createElement('div');
    list.className = 'chapter-missions';
    for (const item of missions) {
      const index = levels.indexOf(item);
      const button = document.createElement('button');
      button.className = `mission-button ${index === current ? 'active' : ''} ${completed.has(item.id) ? 'done' : ''}`;
      button.setAttribute('aria-current', index === current ? 'step' : 'false');
      button.innerHTML = `<span class="mission-number">${completed.has(item.id) ? '✓' : String(index + 1).padStart(2, '0')}</span><span class="mission-name">${item.name}</span>`;
      button.addEventListener('click', () => {
        loadMission(index);
        closeRail();
      });
      list.append(button);
    }
    group.append(head, track, list);
    container.append(group);
  }
  $('campaign').dataset.chapter = slug(level().chapter);
  keepActiveVisible(container);
  $('rail-current').textContent = `${String(current + 1).padStart(2, '0')} · ${level().name}`;
  $('power').max = levels.length;
  $('power').value = completed.size;
  $('power-count').textContent = `${completed.size} / ${levels.length}`;
}

// Centre the active mission inside whichever element actually scrolls, rather
// than scrollIntoView, which would also scroll the page under the player.
function keepActiveVisible(container) {
  const active = container.querySelector('.mission-button.active');
  if (!active) return;
  for (const box of [rail, container]) {
    if (box.scrollHeight <= box.clientHeight + 4) continue;
    const middle = active.offsetTop - box.clientHeight / 2 + active.offsetHeight / 2;
    box.scrollTop = Math.max(0, middle);
    return;
  }
}

const rail = document.querySelector('.mission-panel');
const railToggle = document.querySelector('.rail-toggle');
function closeRail() {
  rail.classList.remove('open');
  railToggle.setAttribute('aria-expanded', 'false');
}
railToggle.addEventListener('click', () => {
  const open = rail.classList.toggle('open');
  railToggle.setAttribute('aria-expanded', String(open));
});

const lineNumbers = () => { $('line-numbers').textContent = Array.from({length:$('code').value.split('\n').length}, (_, i) => i + 1).join('\n'); };
function controls() {
  const isCode = level().kind === 'code';
  $('run').disabled = running;
  $('step').disabled = running;
  $('step').hidden = !isCode;
  $('code').readOnly = running;
}

const runLabel = kind => ({code:'▶ Run program', algo:'▶ Run the tests', debug:'▶ Run the tests', refactor:'▶ Run the tests', network:'▶ Send signal', transport:'▶ Start the transfer', sequence:'▶ Time the exchange', layers:'▶ Send the frame', routing:'▶ Forward the packets'}[kind] ?? '▶ Check answer');
const panelTitle = kind => ({code:'COMMAND CONSOLE', algo:'FUNCTION CONSOLE', debug:'REPAIR CONSOLE', refactor:'REWRITE CONSOLE'}[kind] ?? 'MISSION CONTROLS');
const languageTag = kind => ({code:'JavaScript · sandboxed subset', algo:'JavaScript · checked against test cases', debug:'JavaScript · a program that runs and is wrong', refactor:'JavaScript · judged on shape as well as answers'}[kind] ?? 'Interactive model · simplified');
const mapLabel = kind => ({code:'ISOMETRIC VIEW', algo:'TEST CASES', debug:'TEST CASES', refactor:'TEST CASES'}[kind] ?? 'DATA VISUALISATION');

const consoleTask = kind => ({debug:'Repair this function', refactor:'Rewrite this function'}[kind] ?? 'Write this function');

function commandReference(item) {
  if (item.kind === 'code') return ['move(n)', 'turnLeft()', 'turnRight()', 'canMove()', 'let', 'for', 'while', 'if / else', 'function'];
  // Puzzle missions have no function to write, and their row stays hidden.
  if (!item.signature) return [];
  // A mission may name the pieces it is actually about; otherwise the general
  // set, written against this mission's own parameter rather than a stand-in.
  const parameter = item.signature.match(/\(([^,)]+)/)?.[1].trim() || 'values';
  return [item.signature, ...(item.toolkit ?? ['return', 'let', 'for', 'while', 'if / else', `${parameter}.length`, `${parameter}[i]`, 'Math.floor()', 'print()'])];
}


// Read-only samples of the same idea in other languages. They never run: the
// point is that a loop is a loop, and what differs is what each language makes
// the author declare.
let polyglotChoice = 0;
function renderPolyglot(item) {
  const panel = $('polyglot');
  const samples = item.polyglot?.samples ?? [];
  panel.hidden = samples.length === 0;
  if (!samples.length) return;
  polyglotChoice = Math.min(polyglotChoice, samples.length - 1);
  $('polyglot-title').textContent = item.polyglot.title;
  $('polyglot-note').textContent = item.polyglot.note;
  const tabs = $('polyglot-tabs');
  tabs.replaceChildren(...samples.map((sample, index) => {
    const tab = document.createElement('button');
    tab.className = `polyglot-tab ${index === polyglotChoice ? 'chosen' : ''}`;
    tab.type = 'button';
    tab.role = 'tab';
    tab.setAttribute('aria-selected', String(index === polyglotChoice));
    tab.textContent = sample.language;
    tab.addEventListener('click', () => { polyglotChoice = index; renderPolyglot(item); });
    return tab;
  }));
  const sample = samples[polyglotChoice];
  $('polyglot-code').textContent = sample.code;
  $('polyglot-code').setAttribute('aria-label', `${sample.language} sample`);
  $('polyglot-sample-note').textContent = sample.note;
}

function loadMission(index) {
  runToken++;
  running = false;
  current = Math.max(0, Math.min(levels.length - 1, index));
  const item = level();
  hintIndex = 0; polyglotChoice = 0; trace = null; traceIndex = 0; visited = []; networkResult = null; algoResult = null;
  unit = item.start ? {x:item.start[0], y:item.start[1], dir:item.start[2]} : null;
  scene?.destroy(); scene = null; sceneLevel = null;
  stage?.destroy(); stage = null; stageKind = null;
  puzzleState = isPuzzle(item) ? initialState(item) : null;

  $('mission-meta').textContent = `MISSION ${String(current + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')} · ${item.chapter.toUpperCase()}`;
  $('mission-title').textContent = item.name;
  $('concept').textContent = item.concept;
  $('intro').textContent = item.intro;
  $('location').textContent = item.location.toUpperCase();
  $('objective').textContent = item.objective;
  $('lesson-title').textContent = item.concept;
  $('lesson').textContent = item.lesson;
  renderPolyglot(item);
  $('lesson-source').href = item.reference.url;
  $('lesson-source').textContent = item.reference.label;
  $('map-label').textContent = mapLabel(item.kind);
  $('hint-text').textContent = 'Mistakes are part of the mission. Try an idea and read what comes back.';
  $('hint').textContent = 'Get a hint';
  $('hint').disabled = false;
  $('result').hidden = true;
  $('step-count').textContent = 'Ready';

  const coding = item.kind === 'code' || algoKinds.has(item.kind);
  $('code-controls').hidden = !coding;
  $('network-controls').hidden = coding;
  $('syntax-note').hidden = !coding;
  $('syntax-note').textContent = algoKinds.has(item.kind)
    ? 'This sandbox runs a subset of JavaScript: numbers, strings, booleans, arrays, records written { field: value }, let, assignment, arithmetic and comparison, if/else, for, while, break, continue, and functions with parameters, return, and recursion. Classes, closures as values, and everything outside Math, Object, and the array and string members listed are not available. It reports mistakes JavaScript would let pass silently, such as reading past the end of an array or reading a field a record does not have.'
    : 'This sandbox supports the commands shown plus let, for, while, if/else, and functions. move() takes a whole number of tiles from 0 to 100. The movement commands belong to this game; they are not built-in JavaScript functions.';
  $('editor-title').textContent = panelTitle(item.kind);
  $('language').textContent = languageTag(item.kind);
  $('run').textContent = runLabel(item.kind);
  document.querySelector('.command-reference').innerHTML = `<strong>${algoKinds.has(item.kind) ? consoleTask(item.kind) : 'Available commands'}</strong>${commandReference(item).map(entry => `<code>${entry}</code>`).join('')}`;
  if (coding) {
    $('code').value = typeof drafts[item.id] === 'string' ? drafts[item.id] : (item.starter || '');
    lineNumbers();
  }

  $('log').replaceChildren();
  log(item.kind === 'code' ? 'Awaiting your instructions.'
    : item.kind === 'debug' ? `${item.fn}() is already written, and it is wrong. Run the tests and read what fails.`
    : item.kind === 'refactor' ? `${item.fn}() already passes. Run it, then rewrite it to the shape the mission asks for.`
    : algoKinds.has(item.kind) ? `Write ${item.signature} and run the tests.`
    : 'Set up the model, then run it.');
  navigation();
  renderArena();
  controls();
  persist();
}

function renderArena(failed = -1) {
  const item = level();
  if (item.kind === 'code') {
    if (!scene || sceneLevel !== item.id) { scene?.destroy(); scene = createScene($('arena'), item, unit); sceneLevel = item.id; }
    scene.update(unit, visited);
    $('legend').innerHTML = '<span class="legend-unit">➤ Cyan arrow: facing direction</span><span>◎ Amber ring: power cell</span><span>Only raised tiles are traversable</span>';
    return;
  }
  scene?.destroy(); scene = null; sceneLevel = null;
  if (algoKinds.has(item.kind)) { stage?.destroy(); stage = null; stageKind = null; renderCases(); return; }
  const rendered = view(item, puzzleState);
  document.querySelector('.network-instructions').textContent = rendered.instructions;
  $('legend').innerHTML = rendered.legend.map((entry, position) => `<span${position === 0 ? ' class="legend-unit"' : ''}>${entry}</span>`).join('');
  $('link-total').textContent = rendered.summary;
  const built = sceneFor(item);
  if (built) renderStage(item, built);
  else {
    stage?.destroy(); stage = null; stageKind = null;
    if (rendered.diagram.type === 'graph') renderNetwork(failed);
    else renderDiagram(rendered.diagram);
  }
  renderWidgets();
}

// A mission with an isometric scene draws it on a canvas; clicking a solid does
// whatever clicking the matching control would.
function renderStage(item, built) {
  if (!stage || stageKind !== item.id) {
    stage?.destroy();
    stage = createStage($('arena'), {
      bounds:state => built.bounds(state.level, state.state),
      build:(scene, context) => built.build(scene, {...context, level:context.state.level, state:context.state.state}),
      describe:state => built.describe(state.level, state.state),
      still:built.still ?? false,
      aspect:built.aspect ?? 0.58,
      onPick:id => {
        const [type, index] = String(id).split('-');
        if (type === 'bit') act({type:'bit', index:Number(index)});
        if (type === 'link') act({type:'link', index:Number(index)});
      }
    });
    stageKind = item.id;
  }
  stage.update({level:item, state:puzzleState});
}

// Diagrams are described by the puzzle layer and drawn by these few renderers,
// so a new mission kind does not need new markup.
function renderDiagram(diagram) {
  const wrap = document.createElement('div');
  wrap.className = `puzzle diagram-${diagram.type}`;
  if (diagram.type === 'bits') {
    const width = diagram.bits.length;
    wrap.innerHTML = `<div class="eyebrow">TARGET VALUE: ${diagram.target}</div>
      <div class="bit-grid" style="grid-template-columns:repeat(${Math.min(width, 8)},1fr)">${diagram.bits.map((bit, index) => `<button class="bit ${bit ? 'on' : ''}" data-bit="${index}" aria-label="Toggle the ${diagram.places[index]} bit" aria-pressed="${!!bit}"><span>${bit}</span><small>${index === 0 && diagram.target < 0 ? `−${diagram.places[index]}` : diagram.places[index]}</small></button>`).join('')}</div>
      <div class="binary-total">${diagram.value}<span>DECIMAL VALUE${diagram.hex ? ` · ${diagram.hex}` : ''}</span></div>`;
  }
  if (diagram.type === 'sort') {
    wrap.innerHTML = `<div class="eyebrow">ARRAY CONTENTS</div><div class="sort-chart">${diagram.values.map((value, index) => `<div class="sort-column"><strong>${value}</strong><div class="sort-bar" style="height:${value * 17}px"></div><small>[${index}]</small></div>`).join('')}</div>`;
  }
  if (diagram.type === 'stack') {
    // Drawn as nested boxes, because that is what encapsulation is: each layer
    // wraps everything the layer above handed it.
    const nested = diagram.rows.reduce((inner, row, depth) =>
      `<div class="stack-layer ${row.accent ? 'accent' : ''}" style="--depth:${depth}"><div class="stack-head"><strong>${row.name}</strong><span>${row.detail}</span></div>${inner}</div>`, '');
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? 'ENCAPSULATION · OUTERMOST FIRST'}</div><div class="stack-view">${nested}</div>`;
  }
  if (diagram.type === 'table') {
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''}</div><table class="data-table"><thead><tr>${diagram.columns.map(column => `<th>${column}</th>`).join('')}</tr></thead><tbody>${diagram.rows.map((row, index) => `<tr class="${diagram.problems?.[index] ? 'problem' : ''} ${diagram.highlight === index ? 'highlight' : ''}">${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  if (diagram.type === 'bars') {
    const widest = Math.max(1, ...diagram.rows.map(row => row.value));
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''}</div><div class="bar-view">${diagram.rows.map(row => `<div class="bar-row ${row.problem ? 'problem' : ''}"><span class="bar-name">${row.name}</span><div class="bar-track"><i style="width:${Math.round(row.value / widest * 100)}%"></i></div><span class="bar-detail">${row.detail}</span></div>`).join('')}</div>`;
  }
  if (diagram.type === 'timeline') {
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''} · ${diagram.total} MS</div><div class="bar-view">${diagram.rows.map(row => `<div class="bar-row"><span class="bar-name">${row.name}</span><div class="bar-track"><i style="width:${Math.max(2, Math.round(row.value / diagram.total * 100))}%;margin-left:${Math.round((row.at - row.value) / diagram.total * 100)}%"></i></div><span class="bar-detail">${row.detail}</span></div>`).join('')}</div>`;
  }
  if (diagram.type === 'cards') {
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? 'QUESTIONS'}</div><div class="card-view">${diagram.rows.map((row, index) => `<div class="question-card ${row.answered ? 'answered' : ''}"><small>${index + 1}</small><strong>${row.name}</strong><span>${row.detail}</span></div>`).join('')}</div>`;
  }
  $('arena').replaceChildren(wrap);
  wrap.querySelectorAll('[data-bit]').forEach(button => button.addEventListener('click', () => act({type:'bit', index:Number(button.dataset.bit)})));
}

function renderWidgets() {
  const item = level();
  const list = widgets(item, puzzleState);
  const container = $('link-list');
  container.replaceChildren();
  for (const widget of list) {
    if (widget.type === 'toggle' || widget.type === 'button') {
      const button = document.createElement('button');
      button.className = 'link-option';
      if (widget.type === 'toggle') button.setAttribute('aria-pressed', String(widget.on));
      button.innerHTML = widget.type === 'toggle'
        ? `<span class="link-check">${widget.on ? '✓' : ''}</span><span>${widget.label}</span><span class="link-cost">${widget.note ?? ''}</span>`
        : `<span>${widget.label}</span>`;
      button.addEventListener('click', () => act(widget.action));
      container.append(button);
      continue;
    }
    const row = document.createElement('div');
    row.className = `widget-row widget-${widget.type}`;
    if (widget.type === 'order') {
      row.innerHTML = `<span class="widget-label">${widget.label}${widget.note ? `<small>${widget.note}</small>` : ''}</span><span class="order-buttons"><button aria-label="Move ${widget.label} earlier" ${widget.first ? 'disabled' : ''}>▲</button><button aria-label="Move ${widget.label} later" ${widget.last ? 'disabled' : ''}>▼</button></span>`;
      const [up, down] = row.querySelectorAll('button');
      up.addEventListener('click', () => act(widget.up));
      down.addEventListener('click', () => act(widget.down));
    }
    if (widget.type === 'dial' || widget.type === 'choice') {
      row.innerHTML = `<span class="widget-label">${widget.label}${widget.help || widget.note ? `<small>${widget.help || widget.note}</small>` : ''}</span><span class="segmented">${widget.options.map((option, index) => `<button data-option="${index}" class="component-option ${option.selected ? 'chosen' : ''}" aria-pressed="${!!option.selected}"><span>${option.label}</span></button>`).join('')}</span>`;
      row.querySelectorAll('[data-option]').forEach(button => {
        const option = widget.options[Number(button.dataset.option)];
        button.addEventListener('click', () => act(option.action ?? {type:'dial', id:widget.id, value:option.value}));
      });
    }
    container.append(row);
  }
}

function renderCases(result = null) {
  const item = level();
  const wrap = document.createElement('div');
  wrap.className = 'puzzle diagram-cases';
  const rows = item.cases.map((testCase, index) => {
    const outcome = result?.cases?.[index];
    const status = !outcome ? '·' : outcome.passed && !outcome.overGate ? '✓' : '✗';
    const className = !outcome ? '' : outcome.passed && !outcome.overGate ? 'pass' : 'fail';
    const detail = !outcome
      ? testCase.note ?? ''
      : outcome.error ? outcome.error
      : !outcome.passed ? `returned ${describe(outcome.actual)}`
      : outcome.overGate ? `${outcome.operations.toLocaleString('en-US')} steps, over the ${outcome.maxOperations.toLocaleString('en-US')} allowed`
      : `${outcome.operations.toLocaleString('en-US')} steps${testCase.maxOperations ? ` of ${testCase.maxOperations.toLocaleString('en-US')} allowed` : ''}`;
    return `<div class="case-row ${className}"><span class="case-status">${status}</span><code>${item.fn}(${testCase.args.map(argument => short(describe(argument))).join(', ')})</code><span class="case-expect">→ ${short(describe(testCase.expect))}</span><span class="case-detail">${detail}</span></div>`;
  }).join('');
  // A refactor mission can pass every case and still be refused, so the panel
  // says which rule is outstanding rather than showing an unexplained full house.
  const shapeNote = result?.shape ? `<p class="case-shape">${result.shape}</p>` : '';
  wrap.innerHTML = `<div class="eyebrow">${item.cases.length} TEST CASES${result ? ` · ${result.cases.filter(entry => entry.passed && !entry.overGate).length} PASSING${result.shape ? ' · SHAPE RULE NOT MET' : ''}` : ''}</div>${shapeNote}<div class="case-table">${rows}</div>${result?.output?.length ? `<div class="case-output"><strong>print() output</strong>${result.output.slice(0, 12).map(line => `<code>${line}</code>`).join('')}</div>` : ''}`;
  $('arena').replaceChildren(wrap);
  $('legend').innerHTML = '<span class="legend-unit">✓ Case passed</span><span>✗ Case failed</span><span>Steps counted by the interpreter</span>';
}
const short = text => text.length > 42 ? `${text.slice(0, 39)}…` : text;

function renderNetwork(failed) {
  const item = level(), ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 560 350');
  svg.setAttribute('class', 'network-svg');
  svg.setAttribute('aria-label', 'Network map. Toggle cables using the buttons in mission controls.');
  const point = id => { const node = item.nodes.find(entry => entry[0] === id); return [node[1] * 5.6, node[2] * 3.1]; };
  svg.innerHTML = '<defs><linearGradient id="node-metal" x2="0" y2="1"><stop stop-color="#355675"/><stop offset="1" stop-color="#0c2139"/></linearGradient><linearGradient id="node-core" x2="0" y2="1"><stop stop-color="#c7f5ff"/><stop offset="1" stop-color="#549abb"/></linearGradient></defs>';
  item.edges.forEach((edge, index) => {
    const [x1, y1] = point(edge[0]), [x2, y2] = point(edge[1]);
    const line = document.createElementNS(ns, 'line');
    Object.entries({x1, y1, x2, y2, class:`network-link ${puzzleState.links.includes(index) ? 'selected' : ''} ${networkResult?.pathEdges.includes(index) ? 'route' : ''} ${index === failed ? 'failed' : ''}`}).forEach(([key, value]) => line.setAttribute(key, value));
    svg.append(line);
    const hit = line.cloneNode();
    hit.setAttribute('class', 'link-hit');
    hit.addEventListener('click', () => act({type:'link', index}));
    svg.append(hit);
    if (item.budget) {
      const weight = document.createElementNS(ns, 'text');
      weight.setAttribute('x', (x1 + x2) / 2);
      weight.setAttribute('y', (y1 + y2) / 2 - 12);
      weight.setAttribute('class', 'link-weight');
      weight.setAttribute('text-anchor', 'middle');
      weight.textContent = `${edge[2]} ms`;
      svg.append(weight);
    }
  });
  item.nodes.forEach(([id]) => {
    const [cx, cy] = point(id);
    const endpoint = id === item.source || id === item.target;
    const circle = document.createElementNS(ns, 'circle');
    Object.entries({cx, cy, r:23, class:`network-node ${endpoint ? 'endpoint' : ''}`}).forEach(([key, value]) => circle.setAttribute(key, value));
    svg.append(circle);
    const symbol = document.createElementNS(ns, 'text');
    symbol.setAttribute('x', cx); symbol.setAttribute('y', cy);
    symbol.setAttribute('class', `node-symbol ${endpoint ? 'endpoint' : ''}`);
    symbol.textContent = id === item.source ? '↑' : id === item.target ? '▤' : '↔';
    svg.append(symbol);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', cx); text.setAttribute('y', cy + 45);
    text.setAttribute('class', 'node-label');
    text.textContent = label(id);
    svg.append(text);
  });
  $('arena').replaceChildren(svg);
  if (networkResult?.path.length) {
    $('legend').innerHTML = '<span class="legend-unit">━ Enabled link</span><span style="color:#ffdc93">━ Tested route</span><span>Other links add no path cost</span>';
    if (running && !reduceMotion()) {
      const packet = document.createElementNS(ns, 'circle');
      packet.setAttribute('r', '6');
      packet.setAttribute('class', 'packet');
      const motion = document.createElementNS(ns, 'animateMotion');
      motion.setAttribute('path', networkResult.path.map((id, index) => `${index ? 'L' : 'M'}${point(id).join(' ')}`).join(' '));
      motion.setAttribute('dur', '1.2s');
      motion.setAttribute('fill', 'freeze');
      packet.append(motion);
      svg.append(packet);
    }
  }
}

function act(action) {
  if (running || !action) return;
  puzzleState = applyAction(level(), puzzleState, action);
  networkResult = null;
  $('result').hidden = true;
  renderArena();
}

const outcomePanel = () => document.querySelector('.trace-panel');

function win() {
  const item = level();
  completed.add(item.id);
  persist();
  navigation();
  scene?.celebrate();
  $('result').hidden = false;
  $('result-title').textContent = completed.size === levels.length ? 'Station restored. You did that.' : 'Mission complete.';
  $('takeaway').textContent = item.takeaway;
  $('next').textContent = current === levels.length - 1 ? 'Replay the expedition ↺' : 'Next mission →';
  log('Objective achieved. System restored.', 'success');
  tone();
  reveal($('result'));
}

function prepare() {
  runToken++;
  traceIndex = 0;
  visited = [];
  const item = level();
  unit = {x:item.start[0], y:item.start[1], dir:item.start[2]};
  scene?.update(unit, [], true);
  $('result').hidden = true;
  $('log').replaceChildren();
  drafts[item.id] = $('code').value;
  persist();
  try {
    trace = simulate(item, $('code').value);
    renderArena();
    for (const line of trace.output) log(`print → ${line}`);
    if (!trace.steps.length) { log('Your program has no actions yet. Add a command.'); return false; }
    return true;
  } catch (error) {
    trace = null;
    log(error.message, 'error');
    tone(false);
    reveal(outcomePanel());
    return false;
  }
}
function applyStep() {
  const step = trace.steps[traceIndex++];
  visited.push(`${unit.x},${unit.y}`);
  unit = {x:step.x, y:step.y, dir:step.dir};
  renderArena();
  $('step-count').textContent = `Step ${traceIndex} / ${trace.steps.length}`;
  log(`L${step.line} · ${step.label}`, step.error ? 'error' : '');
  if (traceIndex === trace.steps.length) {
    if (trace.success) { win(); return; }
    log(trace.error || 'Program finished. The cell is still out of reach — adjust your instructions and try again.', 'error');
    reveal(outcomePanel());
  }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  if (running) return;
  const item = level();
  if (algoKinds.has(item.kind)) {
    drafts[item.id] = $('code').value;
    persist();
    $('log').replaceChildren();
    algoResult = evaluateAlgorithm(item, $('code').value);
    renderCases(algoResult);
    for (const line of algoResult.output.slice(0, 12)) log(`print → ${line}`);
    $('step-count').textContent = `${algoResult.cases.filter(entry => entry.passed && !entry.overGate).length} / ${item.cases.length} cases`;
    if (algoResult.success) { log(`All ${item.cases.length} cases pass.`, 'success'); win(); }
    else { log(algoResult.error, 'error'); tone(false); reveal(outcomePanel()); }
    return;
  }
  if (isPuzzle(item)) {
    const animated = item.kind === 'network';
    running = animated;
    controls();
    $('result').hidden = true;
    $('log').replaceChildren();
    if (animated) {
      log('Testing the signal path…');
      const token = ++runToken;
      networkResult = evaluateNetwork(item, puzzleState.links);
      renderArena();
      await pause(1250);
      if (token !== runToken) return;
    }
    const result = evaluate(item, puzzleState);
    $('step-count').textContent = 'Check complete';
    log(result.message, result.success ? 'success' : 'error');
    if (result.success) win(); else { tone(false); reveal(outcomePanel()); }
    running = false;
    controls();
    if (animated) renderArena();
    return;
  }
  if (!prepare()) return;
  running = true;
  controls();
  const token = runToken;
  while (token === runToken && trace && traceIndex < trace.steps.length) {
    applyStep();
    await pause(reduceMotion() ? 80 : 330);
  }
  if (token !== runToken) return;
  running = false;
  controls();
}

$('run').addEventListener('click', run);
$('step').addEventListener('click', () => {
  if (running || level().kind !== 'code') return;
  if (!trace || traceIndex >= trace.steps.length) { if (!prepare()) return; }
  applyStep();
});
$('code').addEventListener('input', () => {
  trace = null; traceIndex = 0;
  drafts[level().id] = $('code').value;
  lineNumbers();
  persist();
  $('result').hidden = true;
});
$('code').addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    event.target.setRangeText('  ', event.target.selectionStart, event.target.selectionEnd, 'end');
    event.target.dispatchEvent(new Event('input'));
  }
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); }
});
$('reset').addEventListener('click', () => {
  if (level().kind === 'code' || algoKinds.has(level().kind)) drafts[level().id] = level().starter;
  loadMission(current);
});
$('hint').addEventListener('click', () => {
  const hints = level().hints;
  $('hint-text').textContent = hints[Math.min(hintIndex++, hints.length - 1)];
  $('hint').textContent = hintIndex >= hints.length ? 'All hints shown' : 'Another hint';
  $('hint').disabled = hintIndex >= hints.length;
});
$('solution').addEventListener('click', () => {
  runToken++;
  running = false;
  controls();
  const item = level();
  if (item.kind === 'code' || algoKinds.has(item.kind)) {
    $('code').value = item.solution;
    trace = null;
    algoResult = null;
    lineNumbers();
    drafts[item.id] = item.solution;
    persist();
    if (algoKinds.has(item.kind)) renderCases();
  } else {
    puzzleState = solutionState(item);
    networkResult = null;
    renderArena();
  }
  $('result').hidden = true;
  $('hint-text').textContent = 'A working solution is loaded. Run it, then reset the mission and try explaining each step yourself.';
});
$('next').addEventListener('click', () => loadMission((current + 1) % levels.length));
$('sound').addEventListener('click', () => {
  sound = !sound;
  $('sound-label').textContent = sound ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-pressed', String(sound));
  tone();
});

loadMission(current);
const builder = mountBuilder($('builder'));
const city = mountCity($('city'));
const modes = ['campaign', 'builder', 'city'];
function setMode(nextMode) {
  runToken++;
  running = false;
  controls();
  mode = nextMode;
  for (const name of modes) {
    $(name).hidden = name !== mode;
    $(`${name}-mode`).classList.toggle('active', name === mode);
    $(`${name}-mode`).setAttribute('aria-pressed', String(name === mode));
  }
}
// Colour scheme: follows the system until the player chooses, then stays put.
const themeKey = 'signal-quest-theme';
let theme = null;
try { theme = localStorage.getItem(themeKey); } catch { /* storage is optional */ }
const prefersLight = matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  const dark = theme ? theme === 'dark' : !prefersLight.matches;
  $('theme-label').textContent = dark ? 'Light' : 'Dark';
  $('theme').setAttribute('aria-pressed', String(!dark));
  $('theme').title = dark ? 'Switch to the light colour scheme' : 'Switch to the dark colour scheme';
}
$('theme').addEventListener('click', () => {
  theme = (theme ? theme === 'dark' : !prefersLight.matches) ? 'light' : 'dark';
  try { localStorage.setItem(themeKey, theme); } catch { /* storage is optional */ }
  applyTheme();
});
prefersLight.addEventListener('change', () => { if (!theme) applyTheme(); });
applyTheme();

for (const name of modes) $(`${name}-mode`).addEventListener('click', () => setMode(name));

const isCoding = () => level().kind === 'code' || algoKinds.has(level().kind);
registerGameTools({
  read:() => ({
    mode, missionId:level().id, chapter:level().chapter, concept:level().concept,
    objective:level().objective, kind:level().kind,
    program:isCoding() ? $('code').value : null,
    completed:[...completed], running,
    architecture:builder.getState(),
    city:city.getState(),
    missions:levels.map(item => ({id:item.id, name:item.name, kind:item.kind, chapter:item.chapter}))
  }),
  start:id => {
    const index = levels.findIndex(item => item.id === id);
    if (index < 0) throw new Error('Unknown mission.');
    setMode('campaign');
    loadMission(index);
    return {missionId:level().id, objective:level().objective, kind:level().kind};
  },
  stage:source => {
    if (mode !== 'campaign' || !isCoding() || running) throw new Error('Open an idle coding mission first.');
    $('code').value = source;
    $('code').dispatchEvent(new Event('input'));
    return {missionId:level().id, staged:true};
  },
  run:async () => {
    if (mode !== 'campaign' || !isCoding() || running) throw new Error('Open an idle coding mission first.');
    await run();
    return {missionId:level().id, success:algoKinds.has(level().kind) ? !!algoResult?.success : !!trace?.success, log:$('log').textContent};
  }
});
