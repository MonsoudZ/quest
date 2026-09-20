import {levels} from './levels.js';
import {simulate, evaluateAlgorithm, algoKinds, evaluateSpec, isCoding} from './engine.js';
import {isPuzzle, initialState, solutionState, applyAction, evaluate} from './puzzles.js';
import {mountBuilder} from './builder.js';
import {mountCity} from './citylab.js';
import {mountStation} from './station.js';
import {mountReview} from './reviewlab.js';
import {scheduleAfter, dueItems} from './recall.js';
import {rankFor, bestRank, ranks, stationState, earnedAchievements, sectionOf, struggles} from './progress.js';
import {registerGameTools} from './webmcp.js';
import {reveal, reduceMotion} from './ui.js';
import {readStore, writeStore, count} from './format.js';
import {createArena} from './arena.js';
import {createConsole, commandReference, consoleTask, languageTag, mapLabel, panelTitle, runLabel} from './console.js';

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
let unit = null, visited = [], trace = null, traceIndex = 0, runToken = 0, running = false;
let sound = false, audioContext = null;
let puzzleState = null, algoResult = null, mode = 'campaign';
const level = () => levels[current];

// The console owns how a mission is being attempted; the arena owns what is
// drawn beside it. Both are built once and told which mission is current.
const mission = createConsole({level, feats, persist, log});
const arena = createArena({onAct:action => act(action)});
const renderArena = () => arena.render(level(), {unit, visited, puzzleState});

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


function loadMission(index) {
  runToken++;
  running = false;
  current = Math.max(0, Math.min(levels.length - 1, index));
  const item = level();
  trace = null; traceIndex = 0; visited = []; algoResult = null;
  unit = item.start ? {x:item.start[0], y:item.start[1], dir:item.start[2]} : null;
  arena.reset();
  puzzleState = isPuzzle(item) ? initialState(item) : null;

  $('mission-meta').textContent = `MISSION ${String(current + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')} · ${item.chapter.toUpperCase()}`;
  $('mission-title').textContent = item.name;
  $('concept').textContent = item.concept;
  $('intro').textContent = item.intro;
  $('location').textContent = item.location.toUpperCase();
  $('objective').textContent = item.objective;
  $('lesson-title').textContent = item.concept;
  $('lesson').textContent = item.lesson;
  $('lesson-source').href = item.reference.url;
  $('lesson-source').textContent = item.reference.label;
  $('map-label').textContent = mapLabel(item.kind);
  $('result').hidden = true;
  $('step-count').textContent = 'Ready';

  const coding = isCoding(item);
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
  mission.load(item);
  renderArena();
  controls();
  persist();
}


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
  const earnedRank = rankFor(mission.attempt);
  const rank = ranks[previous ? bestRank(previous.rank, earnedRank.id) : earnedRank.id];
  const improved = previous && rank.id !== previous.rank;

  completed.add(item.id);
  // Solved once is not learned. Ask about it again tomorrow.
  reviews[item.id] = scheduleAfter(0, true);
  records[item.id] = {
    rank:rank.id,
    firstTry:(previous?.firstTry ?? false) || (mission.attempt.runs <= 1 && earnedRank.id === 'gold'),
    runs:(previous?.runs ?? 0) + mission.attempt.runs
  };
  persist();
  navigation();
  station.render();
  dueBadge();
  arena.celebrate();

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
  arena.place(unit);
  $('result').hidden = true;
  $('log').replaceChildren();
  drafts[item.id] = $('code').value;
  persist();
  try {
    trace = simulate(item, $('code').value);
    // The drone's fate is known as soon as the trace is, even though the
    // animation has not played it out yet.
    mission.settlePrediction(trace);
    renderArena();
    for (const line of trace.output) log(`print → ${line}`);
    if (!trace.steps.length) { log('Your program has no actions yet. Add a command.'); return false; }
    return true;
  } catch (error) {
    trace = null;
    mission.settlePrediction(null, error);
    mission.askTheCause(null, error, () => { log(error.message, 'error'); tone(false); reveal(outcomePanel()); });
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
    mission.askTheCause(trace, null, () => {
      log(trace.error || 'Program finished. The cell is still out of reach — adjust your instructions and try again.', 'error');
      reveal(outcomePanel());
    });
  }
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

// What a passing run is worth beyond the win itself: the tightest suite that
// still caught every mutant, and how far under the tightest budget a mission set.
// Both are achievements about beating a gate rather than merely passing it.
function recordFeats(item, result) {
  if (item.kind === 'spec') {
    feats.tightestSuite = Math.min(feats.tightestSuite ?? Infinity, result.cases.length);
    return;
  }
  for (const entry of result.cases) {
    if (!entry.maxOperations || !entry.operations) continue;
    feats.bestGateRatio = Math.min(feats.bestGateRatio ?? Infinity, entry.operations / entry.maxOperations);
  }
}

async function run() {
  if (running) return;
  mission.countRun();
  const item = level();
  // A spec mission and the three function-console kinds are run the same way:
  // the editor is the answer, one call judges it, and the arena shows the result.
  // They differ only in the four things this table names.
  if (algoKinds.has(item.kind)) {
    const suite = item.kind === 'spec';
    drafts[item.id] = $('code').value;
    persist();
    $('log').replaceChildren();
    algoResult = (suite ? evaluateSpec : evaluateAlgorithm)(item, $('code').value);
    mission.settlePrediction(algoResult);
    if (algoResult.success) recordFeats(item, algoResult);
    if (suite) arena.spec(item, algoResult); else arena.cases(item, algoResult);
    for (const line of algoResult.output.slice(0, 12)) log(`print → ${line}`);
    $('step-count').textContent = suite
      ? algoResult.mutants.length
        ? `${algoResult.mutants.filter(mutant => mutant.caught).length} / ${item.mutants.length} caught`
        : 'Suite not run'
      : `${algoResult.cases.filter(entry => entry.passed && !entry.overGate).length} / ${item.cases.length} cases`;
    if (algoResult.success) { log(suite ? algoResult.message : `All ${item.cases.length} cases pass.`, 'success'); win(); }
    else mission.askTheCause(algoResult, null, () => { log(algoResult.error, 'error'); tone(false); reveal(outcomePanel()); });
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
    mission.settlePrediction(result);
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
  if (isCoding(level())) drafts[level().id] = level().starter;
  loadMission(current);
});
$('solution').addEventListener('click', () => {
  mission.revealSolution();
  runToken++;
  running = false;
  controls();
  const item = level();
  if (isCoding(item)) {
    $('code').value = item.solution;
    trace = null;
    algoResult = null;
    lineNumbers();
    drafts[item.id] = item.solution;
    persist();
    if (item.kind === 'spec') arena.spec(item); else if (algoKinds.has(item.kind)) arena.cases(item);
  } else {
    puzzleState = solutionState(item);
      renderArena();
  }
  $('result').hidden = true;
  mission.renderLadder();
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


registerGameTools({
  read:() => ({
    mode, missionId:level().id, chapter:level().chapter, concept:level().concept,
    objective:level().objective, kind:level().kind,
    program:isCoding(level()) ? $('code').value : null,
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
    if (mode !== 'campaign' || !isCoding(level()) || running) throw new Error('Open an idle coding mission first.');
    $('code').value = source;
    $('code').dispatchEvent(new Event('input'));
    return {missionId:level().id, staged:true};
  },
  run:async () => {
    if (mode !== 'campaign' || !isCoding(level()) || running) throw new Error('Open an idle coding mission first.');
    await run();
    return {missionId:level().id, success:algoKinds.has(level().kind) ? !!algoResult?.success : !!trace?.success, log:$('log').textContent};
  }
});
