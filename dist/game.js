import {levels} from './levels.js';
import {simulate, evaluateAlgorithm, describe, algoKinds, evaluateSpec} from './engine.js';
import {isPuzzle, initialState, solutionState, applyAction, widgets, view, evaluate} from './puzzles.js';
import {mountBuilder} from './builder.js';
import {mountCity} from './citylab.js';
import {mountStation} from './station.js';
import {mountReview} from './reviewlab.js';
import {question as predictionFor, actual as predictionActual, verdict as predictionVerdict} from './predict.js';
import {scheduleAfter, dueItems} from './recall.js';
import {question as causeQuestion, causes} from './diagnose.js';
import {rankFor, bestRank, ranks, stationState, earnedAchievements, sectionOf, struggles} from './progress.js';
import {registerGameTools} from './webmcp.js';
import {createScene} from './scene.js';
import {reveal, reduceMotion} from './ui.js';
import {readStore, writeStore, count} from './format.js';
import {createStage} from './stage.js';
import {sceneFor} from './scenes.js';

const $ = id => document.getElementById(id);
const saveKey = 'signal-quest-v2';
const saved = readStore(saveKey, {}) ?? {};
const completed = new Set(Array.isArray(saved?.completed) ? saved.completed.filter(id => levels.some(level => level.id === id)) : []);
// How each mission went, not just whether it went. The best attempt is the one
// kept, so a mission solved again without help upgrades its own rank.
const records = {};
for (const [id, record] of Object.entries(saved?.records ?? {})) {
  if (!levels.some(level => level.id === id)) continue;
  if (!ranks[record?.rank]) continue;
  records[id] = {rank:record.rank, firstTry:!!record.firstTry, runs:Number(record.runs) || 0};
}
// Missions completed before ranks existed are kept, at the rank they would have
// earned if nothing was recorded about how.
for (const id of completed) if (!records[id]) records[id] = {rank:'silver', firstTry:false, runs:0};
const feats = {
  tightestSuite:Number(saved?.feats?.tightestSuite) || undefined,
  bestGateRatio:Number(saved?.feats?.bestGateRatio) || undefined,
  citySpare:Number(saved?.feats?.citySpare) || undefined,
  labSpare:Number(saved?.feats?.labSpare) || undefined,
  languagesRead:Number(saved?.feats?.languagesRead) || 0,
  predictions:Number(saved?.feats?.predictions) || 0,
  recalled:Number(saved?.feats?.recalled) || 0,
  diagnosed:Number(saved?.feats?.diagnosed) || 0
};
// Per-mission attempt state, reset whenever a mission is loaded.
let attempt = {hints:0, solutionShown:false, revealed:0, runs:0, predicted:null, diagnosed:false};
// When each solved mission is next worth being asked about.
const reviews = {};
for (const [id, entry] of Object.entries(saved?.reviews ?? {})) {
  if (!levels.some(level => level.id === id)) continue;
  reviews[id] = {box:Math.min(Math.max(Number(entry?.box) || 1, 1), 5), due:Number(entry?.due) || Date.now()};
}
let earnedBefore = new Set();
let current = Math.max(0, levels.findIndex(level => level.id === saved?.current));
let drafts = saved?.drafts && typeof saved.drafts === 'object' ? saved.drafts : {};
const collapsed = new Set(Array.isArray(saved?.collapsed) ? saved.collapsed : []);
let hintIndex = 0, unit = null, visited = [], trace = null, traceIndex = 0, runToken = 0, running = false;
let sound = false, audioContext = null, scene = null, sceneLevel = null;
let puzzleState = null, algoResult = null, mode = 'campaign';
let stage = null, stageKind = null;
const level = () => levels[current];

function persist() {
  const stored = writeStore(saveKey, {completed:[...completed], records, feats, reviews, current:level().id, drafts, collapsed:[...collapsed]});
  if (!stored) {
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

// The rail groups 54 missions into four collapsible chapters, each showing how
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
      const record = records[item.id];
      const rank = record?.rank ? ranks[record.rank] : null;
      button.innerHTML = `<span class="mission-number">${rank ? rank.mark : String(index + 1).padStart(2, '0')}</span><span class="mission-name">${item.name}</span>${rank ? `<span class="rank-chip ${rank.id}" title="${rank.note}">${rank.power} kW</span>` : ''}`;
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
  const station = stationState(records);
  $('power').max = station.capacity;
  $('power').value = station.power;
  $('power-count').textContent = `${count(station.power)} / ${count(station.capacity)} kW`;
  $('power-count').title = `${station.complete} of ${station.total} missions · ${station.restored} of ${station.sections.length} sections online`;
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

const runLabel = kind => ({code:'▶ Run program', algo:'▶ Run the tests', debug:'▶ Run the tests', refactor:'▶ Run the tests', spec:'▶ Run your suite', network:'▶ Send signal', transport:'▶ Start the transfer', sequence:'▶ Time the exchange', layers:'▶ Send the frame', routing:'▶ Forward the packets'}[kind] ?? '▶ Check answer');
const panelTitle = kind => ({code:'COMMAND CONSOLE', algo:'FUNCTION CONSOLE', debug:'REPAIR CONSOLE', refactor:'REWRITE CONSOLE', spec:'TEST CONSOLE'}[kind] ?? 'MISSION CONTROLS');
const languageTag = kind => ({code:'JavaScript · sandboxed subset', algo:'JavaScript · checked against test cases', debug:'JavaScript · a program that runs and is wrong', refactor:'JavaScript · judged on shape as well as answers', spec:'JavaScript · your cases against their code'}[kind] ?? 'Interactive model · simplified');
const mapLabel = kind => ({code:'ISOMETRIC VIEW', algo:'TEST CASES', debug:'TEST CASES', refactor:'TEST CASES', spec:'THE CODE UNDER TEST'}[kind] ?? 'DATA VISUALISATION');

const consoleTask = kind => ({debug:'Repair this function', refactor:'Rewrite this function', spec:'Return your cases from'}[kind] ?? 'Write this function');

function commandReference(item) {
  if (item.kind === 'code') return ['move(n)', 'turnLeft()', 'turnRight()', 'canMove()', 'let', 'for', 'while', 'if / else', 'function'];
  // Puzzle missions have no function to write, and their row stays hidden.
  if (!item.signature) return [];
  // A mission may name the pieces it is actually about; otherwise the general
  // set, written against this mission's own parameter rather than a stand-in.
  const parameter = item.signature.match(/\(([^,)]+)/)?.[1].trim() || 'values';
  return [item.signature, ...(item.toolkit ?? ['return', 'let', 'for', 'while', 'if / else', `${parameter}.length`, `${parameter}[i]`, 'Math.floor()', 'print()'])];
}


// Read-only evidence beside the lesson: the same idea in other languages, or the
// tool output an engineer would actually have been looking at. Nothing here
// runs — it is there to be read against what the mission is asking.
let panelChoice = 0;
const read = new Set();
function readingPanel(item) {
  const source = item.polyglot ?? item.artifact ?? null;
  const panes = (source?.samples ?? source?.panes ?? []).map(pane => ({
    label:pane.language ?? pane.label, code:pane.code, note:pane.note
  }));
  const panel = $('polyglot');
  panel.hidden = panes.length === 0;
  if (!panes.length) return;
  panelChoice = Math.min(panelChoice, panes.length - 1);
  $('polyglot-title').textContent = source.title;
  $('polyglot-note').textContent = source.note;
  $('polyglot-caveat').textContent = item.polyglot
    ? 'Read-only. These samples are for comparison; only the JavaScript subset above runs here.'
    : 'Read-only. This is evidence to read, not a control — the mission is changed with the dials.';
  const tabs = $('polyglot-tabs');
  tabs.replaceChildren(...panes.map((pane, index) => {
    const tab = document.createElement('button');
    tab.className = `polyglot-tab ${index === panelChoice ? 'chosen' : ''}`;
    tab.type = 'button';
    tab.role = 'tab';
    tab.setAttribute('aria-selected', String(index === panelChoice));
    tab.textContent = pane.label;
    tab.addEventListener('click', () => {
      panelChoice = index;
      read.add(`${item.id}:${index}`);
      feats.languagesRead = Math.max(feats.languagesRead ?? 0, [...read].filter(key => key.startsWith(`${item.id}:`)).length);
      persist();
      readingPanel(item);
    });
    return tab;
  }));
  const pane = panes[panelChoice];
  $('polyglot-code').textContent = pane.code;
  $('polyglot-code').setAttribute('aria-label', `${pane.label} sample`);
  $('polyglot-sample-note').textContent = pane.note;
}


// Predict, then run. Committing to an answer before the machine gives you one is
// worth more than the answer; nothing is scored on it, and being wrong is the
// useful case.

// The answer, one line at a time. Reading the whole thing and glimpsing one line
// used to cost the same, which made the button all-or-nothing and the rank
// blunt. Each rung is a decision, and only the last one is the whole answer.
function solutionLines() {
  // Only a program has lines. A puzzle's solution is a set of dials or an order.
  const item = level();
  return typeof item.solution === 'string' ? item.solution.split('\n').filter(line => line.trim().length) : [];
}
function renderLadder() {
  const item = level();
  const lines = solutionLines();
  const ladder = $('ladder');
  const climbable = (item.kind === 'code' || algoKinds.has(item.kind)) && lines.length > 1;
  ladder.hidden = !climbable;
  $('solution').hidden = climbable;
  if (!climbable) return;
  const shown = lines.slice(0, attempt.revealed);
  $('ladder-code').hidden = attempt.revealed === 0;
  $('ladder-code').textContent = shown.join('\n') + (attempt.revealed < lines.length ? `\n… ${lines.length - attempt.revealed} more line${lines.length - attempt.revealed === 1 ? '' : 's'}` : '');
  $('ladder-next').hidden = attempt.revealed >= lines.length;
  $('ladder-next').textContent = attempt.revealed === 0 ? 'Show the first line' : 'Show the next line';
  $('ladder-all').textContent = attempt.revealed >= lines.length ? 'Put it in the editor' : 'Put the whole thing in the editor';
  $('ladder-note').textContent = attempt.revealed === 0
    ? `${lines.length} lines. A glimpse costs a hint’s worth; the whole thing costs the rest.`
    : attempt.revealed >= lines.length
      ? 'That is all of it. Typing it out yourself is worth more than pasting it.'
      : `${attempt.revealed} of ${lines.length} shown. Stop as soon as you can carry on.`;
}


// Ask for a diagnosis before giving one. Once per visit to a mission, and only
// where a failure is mechanical enough to be named honestly.
function askTheCause(result, thrown, then) {
  const item = level();
  if (attempt.diagnosed || !(item.kind === 'code' || algoKinds.has(item.kind))) { then(); return; }
  const asked = causeQuestion(item, result, thrown);
  if (!asked) { then(); return; }
  attempt.diagnosed = true;
  const panel = $('cause');
  panel.hidden = false;
  $('cause-prompt').textContent = asked.prompt;
  $('cause-verdict').hidden = true;
  const options = $('cause-options');
  options.replaceChildren(...asked.options.map(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cause-option';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      const right = option.value === asked.answer;
      options.querySelectorAll('button').forEach(other => { other.disabled = true; });
      button.classList.add(right ? 'right' : 'wrong');
      options.querySelector(`[data-answer="${asked.answer}"]`)?.classList.add('right');
      const verdict = $('cause-verdict');
      verdict.hidden = false;
      verdict.className = `cause-verdict ${right ? 'right' : 'wrong'}`;
      verdict.textContent = right
        ? 'That is it. Here is how the machine put it:'
        : `Not this time — it was “${causes[asked.answer].label.toLowerCase()}”. Here is how the machine put it:`;
      if (right) feats.diagnosed = (feats.diagnosed ?? 0) + 1;
      persist();
      then();
    });
    button.dataset.answer = option.value;
    return button;
  }));
  reveal(panel);
}

function renderPrediction() {
  const item = level();
  const asked = predictionFor(item);
  const row = $('predict');
  row.hidden = false;
  $('predict-prompt').textContent = asked.prompt;
  const options = $('predict-options');
  options.replaceChildren(...asked.options.map(option => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `predict-option ${attempt.predicted === option.value ? 'chosen' : ''}`;
    button.setAttribute('aria-pressed', String(attempt.predicted === option.value));
    button.textContent = option.label;
    button.addEventListener('click', () => {
      attempt.predicted = attempt.predicted === option.value ? null : option.value;
      renderPrediction();
    });
    return button;
  }));
  $('predict-verdict').hidden = true;
  $('predict-verdict').textContent = '';
}

// Called once a run has produced something, with whatever that kind's evaluator
// returned — or the error, when the program did not run at all.
function settlePrediction(result, thrown = null) {
  if (attempt.predicted === null) return;
  const happened = predictionActual(level(), result, thrown);
  const called = predictionVerdict(level(), attempt.predicted, happened);
  if (!called) return;
  if (called.right) feats.predictions = (feats.predictions ?? 0) + 1;
  const row = $('predict-verdict');
  row.hidden = false;
  row.className = `predict-verdict ${called.right ? 'right' : 'wrong'}`;
  row.textContent = called.message;
  log(called.right ? `Prediction: ${called.message}` : `Prediction: ${called.message}`, called.right ? 'success' : null);
  attempt.predicted = null;
  persist();
}

function loadMission(index) {
  runToken++;
  running = false;
  current = Math.max(0, Math.min(levels.length - 1, index));
  const item = level();
  $('cause').hidden = true;
  hintIndex = 0; panelChoice = 0; attempt = {hints:0, solutionShown:false, revealed:0, runs:0, predicted:null, diagnosed:false}; trace = null; traceIndex = 0; visited = []; algoResult = null;
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
  readingPanel(item);
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
  renderPrediction();
  renderLadder();
  controls();
  persist();
}

function renderArena() {
  const item = level();
  if (item.kind === 'code') {
    if (!scene || sceneLevel !== item.id) { scene?.destroy(); scene = createScene($('arena'), item, unit); sceneLevel = item.id; }
    scene.update(unit, visited);
    $('legend').innerHTML = '<span class="legend-unit">➤ Cyan arrow: facing direction</span><span>◎ Amber ring: power cell</span><span>Only raised tiles are traversable</span>';
    return;
  }
  scene?.destroy(); scene = null; sceneLevel = null;
  if (item.kind === 'spec') { stage?.destroy(); stage = null; stageKind = null; renderSpec(); return; }
  if (algoKinds.has(item.kind)) { stage?.destroy(); stage = null; stageKind = null; renderCases(); return; }
  const rendered = view(item, puzzleState);
  document.querySelector('.network-instructions').textContent = rendered.instructions;
  $('legend').innerHTML = rendered.legend.map((entry, position) => `<span${position === 0 ? ' class="legend-unit"' : ''}>${entry}</span>`).join('');
  $('link-total').textContent = rendered.summary;
  const built = sceneFor(item);
  if (built) renderStage(item, built);
  else {
    stage?.destroy(); stage = null; stageKind = null;
    renderDiagram(rendered.diagram);
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
// Missions whose kind has an isometric scene never reach this: renderArena
// prefers the scene, and puzzles.js gives those kinds no diagram at all.
function renderDiagram(diagram) {
  const wrap = document.createElement('div');
  wrap.className = `puzzle diagram-${diagram.type}`;
  if (diagram.type === 'table') {
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''}</div><table class="data-table"><thead><tr>${diagram.columns.map(column => `<th>${column}</th>`).join('')}</tr></thead><tbody>${diagram.rows.map((row, index) => `<tr class="${diagram.problems?.[index] ? 'problem' : ''} ${diagram.highlight === index ? 'highlight' : ''}">${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  if (diagram.type === 'bars') {
    // A row may carry its own full-scale value, so bars that measure different
    // things — seconds against a deadline, a fraction against a cap — each read
    // against their own target instead of against the largest number present.
    const widest = Math.max(1e-9, ...diagram.rows.map(row => row.value));
    const fill = row => Math.max(1, Math.min(100, Math.round((row.value / (row.max ?? widest)) * 100)));
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''}</div><div class="bar-view">${diagram.rows.map(row => `<div class="bar-row ${row.problem ? 'problem' : ''}"><span class="bar-name">${row.name}</span><div class="bar-track"><i style="width:${fill(row)}%"></i></div><span class="bar-detail">${row.detail}</span></div>`).join('')}</div>`;
  }
  if (diagram.type === 'timeline') {
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? ''} · ${diagram.total} MS</div><div class="bar-view">${diagram.rows.map(row => `<div class="bar-row"><span class="bar-name">${row.name}</span><div class="bar-track"><i style="width:${Math.max(2, Math.round(row.value / diagram.total * 100))}%;margin-left:${Math.round((row.at - row.value) / diagram.total * 100)}%"></i></div><span class="bar-detail">${row.detail}</span></div>`).join('')}</div>`;
  }
  if (diagram.type === 'cards') {
    wrap.innerHTML = `<div class="eyebrow">${diagram.caption ?? 'QUESTIONS'}</div><div class="card-view">${diagram.rows.map((row, index) => `<div class="question-card ${row.answered ? 'answered' : ''}"><small>${index + 1}</small><strong>${row.name}</strong><span>${row.detail}</span></div>`).join('')}</div>`;
  }
  $('arena').replaceChildren(wrap);
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


// A spec mission shows the code under test rather than a case list: the cases
// are the player's, and what matters is which broken versions they reject.
function renderSpec(result = null) {
  const item = level();
  const wrap = document.createElement('div');
  wrap.className = 'puzzle diagram-spec';
  const rows = item.mutants.map((mutant, index) => {
    const outcome = result?.mutants?.[index];
    const status = !outcome ? '·' : outcome.caught ? '✓' : '✗';
    const detail = !outcome ? 'not run yet'
      : outcome.caught ? `rejected by case ${outcome.by.join(', ')}`
      : `passes your suite — ${mutant.why}`;
    return `<div class="case-row ${!outcome ? '' : outcome.caught ? 'pass' : 'fail'}"><span class="case-status">${status}</span><code>${mutant.name}</code><span class="case-detail">${detail}</span></div>`;
  }).join('');
  const written = result?.cases?.length ?? 0;
  wrap.innerHTML = `<div class="eyebrow">${item.subject.signature}</div>
    <pre class="polyglot-code" tabindex="0" aria-label="The function under test, as it is meant to behave">${item.subject.contract}</pre>
    <div class="eyebrow">${item.mutants.length} BROKEN VERSIONS${result ? ` · ${result.mutants.filter(mutant => mutant.caught).length} REJECTED · ${written} CASE${written === 1 ? '' : 'S'} WRITTEN` : ''}</div>
    <div class="case-table">${rows}</div>`;
  $('arena').replaceChildren(wrap);
  $('legend').innerHTML = '<span class="legend-unit">✓ Your suite rejects it</span><span>✗ It passes your suite</span><span>A test that passes everything tests nothing</span>';
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
      : outcome.overGate ? `${count(outcome.operations)} steps, over the ${count(outcome.maxOperations)} allowed`
      : `${count(outcome.operations)} steps${testCase.maxOperations ? ` of ${count(testCase.maxOperations)} allowed` : ''}`;
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

function act(action) {
  if (running || !action) return;
  puzzleState = applyAction(level(), puzzleState, action);
  $('result').hidden = true;
  renderArena();
}

const outcomePanel = () => document.querySelector('.trace-panel');

// Counting up to a number reads as something being restored, where the number
// appearing reads as a number appearing.
function countUp(element, to, from = 0) {
  if (reduceMotion() || to === from) { element.textContent = `${count(to)} kW`; return; }
  const started = performance.now();
  const step = now => {
    const through = Math.min(1, (now - started) / 700);
    const eased = 1 - (1 - through) ** 3;
    element.textContent = `${count(Math.round(from + (to - from) * eased))} kW`;
    if (through < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function win() {
  const item = level();
  const before = stationState(records);
  const beforeBadges = new Set(earnedAchievements(records, feats).filter(badge => badge.done).map(badge => badge.id));
  const previous = records[item.id] ?? null;
  const earnedRank = rankFor(attempt);
  const rank = ranks[previous ? bestRank(previous.rank, earnedRank.id) : earnedRank.id];
  const improved = previous && rank.id !== previous.rank;

  completed.add(item.id);
  // Solved once is not learned. Ask about it again tomorrow.
  reviews[item.id] = scheduleAfter(0, true);
  records[item.id] = {
    rank:rank.id,
    firstTry:(previous?.firstTry ?? false) || (attempt.runs <= 1 && earnedRank.id === 'gold'),
    runs:(previous?.runs ?? 0) + attempt.runs
  };
  persist();
  navigation();
  station.render();
  dueBadge();
  scene?.celebrate();

  const after = stationState(records);
  const section = sectionOf(item);
  const sectionNow = after.sections.find(entry => entry.id === section?.id);
  const sectionBefore = before.sections.find(entry => entry.id === section?.id);
  const newBadges = earnedAchievements(records, feats).filter(badge => badge.done && !beforeBadges.has(badge.id));

  $('result').hidden = false;
  $('result-title').textContent = after.online ? 'Station restored. You did that.'
    : sectionNow && sectionBefore && sectionNow.status === 'online' && sectionBefore.status !== 'online' ? `${sectionNow.name} is back online.`
    : 'Mission complete.';
  $('takeaway').textContent = item.takeaway;
  $('result-rank').className = `rank-chip ${rank.id}`;
  $('result-rank').textContent = `${rank.mark} ${rank.name}`;
  $('result-rank').title = rank.note;
  $('result-power').hidden = false;
  countUp($('result-power'), after.power, before.power);
  $('result-note').textContent = earnedRank.id === 'gold' && !previous ? 'Full power for this system: no hints, no solution.'
    : improved ? `Re-solved at ${rank.name.toLowerCase()} — this system now runs at ${rank.power} kW.`
    : earnedRank.id === 'bronze' ? `${rank.power} kW of ${ranks.gold.power}. Reset it and solve it yourself to restore the rest.`
    : `${rank.power} kW of ${ranks.gold.power}.${sectionNow ? ` ${sectionNow.name}: ${sectionNow.complete} of ${sectionNow.total}.` : ''}`;
  $('result-badges').replaceChildren(...newBadges.map(badge => {
    const chip = document.createElement('span');
    chip.className = 'badge-won';
    chip.textContent = `Achievement · ${badge.name}`;
    return chip;
  }));
  $('next').textContent = current === levels.length - 1 ? 'Replay the expedition ↺' : 'Next mission →';
  log('Objective achieved. System restored.', 'success');
  for (const badge of newBadges) log(`Achievement unlocked — ${badge.name}.`, 'success');
  if (sectionNow && sectionBefore && sectionNow.status === 'online' && sectionBefore.status !== 'online') {
    log(`${sectionNow.name} is fully powered. Open the station to see it.`, 'success');
  }
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
    // The drone's fate is known as soon as the trace is, even though the
    // animation has not played it out yet.
    settlePrediction(trace);
    renderArena();
    for (const line of trace.output) log(`print → ${line}`);
    if (!trace.steps.length) { log('Your program has no actions yet. Add a command.'); return false; }
    return true;
  } catch (error) {
    trace = null;
    settlePrediction(null, error);
    askTheCause(null, error, () => { log(error.message, 'error'); tone(false); reveal(outcomePanel()); });
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
    askTheCause(trace, null, () => {
      log(trace.error || 'Program finished. The cell is still out of reach — adjust your instructions and try again.', 'error');
      reveal(outcomePanel());
    });
  }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  if (running) return;
  attempt.runs++;
  const item = level();
  if (item.kind === 'spec') {
    drafts[item.id] = $('code').value;
    persist();
    $('log').replaceChildren();
    algoResult = evaluateSpec(item, $('code').value);
    settlePrediction(algoResult);
    if (algoResult.success) feats.tightestSuite = Math.min(feats.tightestSuite ?? Infinity, algoResult.cases.length);
    renderSpec(algoResult);
    for (const line of algoResult.output.slice(0, 12)) log(`print → ${line}`);
    $('step-count').textContent = algoResult.mutants.length
      ? `${algoResult.mutants.filter(mutant => mutant.caught).length} / ${item.mutants.length} caught`
      : 'Suite not run';
    if (algoResult.success) { log(algoResult.message, 'success'); win(); }
    else askTheCause(algoResult, null, () => { log(algoResult.error, 'error'); tone(false); reveal(outcomePanel()); });
    return;
  }
  if (algoKinds.has(item.kind)) {
    drafts[item.id] = $('code').value;
    persist();
    $('log').replaceChildren();
    algoResult = evaluateAlgorithm(item, $('code').value);
    settlePrediction(algoResult);
    if (algoResult.success) {
      // How far under the tightest budget this mission set, for the achievement
      // that is about beating a gate rather than merely passing it.
      for (const entry of algoResult.cases) {
        if (!entry.maxOperations || !entry.operations) continue;
        feats.bestGateRatio = Math.min(feats.bestGateRatio ?? Infinity, entry.operations / entry.maxOperations);
      }
    }
    renderCases(algoResult);
    for (const line of algoResult.output.slice(0, 12)) log(`print → ${line}`);
    $('step-count').textContent = `${algoResult.cases.filter(entry => entry.passed && !entry.overGate).length} / ${item.cases.length} cases`;
    if (algoResult.success) { log(`All ${item.cases.length} cases pass.`, 'success'); win(); }
    else askTheCause(algoResult, null, () => { log(algoResult.error, 'error'); tone(false); reveal(outcomePanel()); });
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
      renderArena();
      await pause(1250);
      if (token !== runToken) return;
    }
    const result = evaluate(item, puzzleState);
    settlePrediction(result);
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
  attempt.hints++;
  const hints = level().hints;
  $('hint-text').textContent = hints[Math.min(hintIndex++, hints.length - 1)];
  $('hint').textContent = hintIndex >= hints.length ? 'All hints shown' : 'Another hint';
  $('hint').disabled = hintIndex >= hints.length;
});
$('ladder-next').addEventListener('click', () => {
  attempt.revealed = Math.min(attempt.revealed + 1, solutionLines().length);
  renderLadder();
  persist();
});
$('ladder-all').addEventListener('click', () => $('solution').click());
$('solution').addEventListener('click', () => {
  attempt.solutionShown = true;
  attempt.revealed = solutionLines().length;
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
    if (item.kind === 'spec') renderSpec(); else if (algoKinds.has(item.kind)) renderCases();
  } else {
    puzzleState = solutionState(item);
      renderArena();
  }
  $('result').hidden = true;
  renderLadder();
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
const recordSpare = key => ({spare}) => {
  if (!(spare > (feats[key] ?? 0))) return;
  feats[key] = spare;
  persist();
  station.render();
};
const builder = mountBuilder($('builder'), {onContract:recordSpare('labSpare')});
const city = mountCity($('city'), {onContract:recordSpare('citySpare')});
const station = mountStation($('station'), {
  getRecords:() => records,
  getFeats:() => feats,
  onPick:id => {
    const index = levels.findIndex(level => level.id === id);
    if (index < 0) return;
    setMode('campaign');
    loadMission(index);
    document.querySelector('.workspace')?.scrollIntoView({behavior:reduceMotion() ? 'auto' : 'smooth', block:'start'});
  }
});
const review = mountReview($('review'), {
  getReviews:() => reviews,
  getRecords:() => records,
  onAnswer:(id, right) => {
    reviews[id] = scheduleAfter(reviews[id]?.box ?? 1, right);
    if (right) feats.recalled = (feats.recalled ?? 0) + 1;
    persist();
    dueBadge();
  },
  onOpen:id => {
    const index = levels.findIndex(level => level.id === id);
    if (index < 0) return;
    setMode('campaign');
    loadMission(index);
  }
});
// The review button says how much is waiting, because nothing else will.
function dueBadge() {
  const due = dueItems(reviews).length;
  const button = $('review-mode');
  button.textContent = due ? `05 · Review · ${due}` : '05 · Review';
  button.classList.toggle('has-due', due > 0);
}
const modes = ['campaign', 'builder', 'city', 'station', 'review'];
dueBadge();
function setMode(nextMode) {
  runToken++;
  running = false;
  controls();
  mode = nextMode;
  if (nextMode === 'station') station.render();
  if (nextMode === 'review') review.start();
  for (const name of modes) {
    $(name).hidden = name !== mode;
    $(`${name}-mode`).classList.toggle('active', name === mode);
    $(`${name}-mode`).setAttribute('aria-pressed', String(name === mode));
  }
}
// Colour scheme: follows the system until the player chooses, then stays put.
// Stored as a bare string rather than through writeStore, because a saved theme
// from before this existed is "dark", not "\"dark\"".
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
