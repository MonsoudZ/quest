// The panels around the editor that are about how the mission is being learnt
// rather than what it asks for: what you expect to happen before you run, why it
// failed when it did, the answer one line at a time, and the same idea as other
// languages write it.
//
// It owns the attempt — hints taken, lines revealed, runs made — because every
// panel here is one of the ways an attempt is spent, and the rank at the end is
// read straight off it.
import {algoKinds} from './engine.js';
import {question as predictionFor, actual as predictionActual, verdict as predictionVerdict} from './predict.js';
import {question as causeQuestion, causes} from './diagnose.js';
import {reveal} from './ui.js';

const $ = id => document.getElementById(id);

export const runLabel = kind => ({code:'▶ Run program', algo:'▶ Run the tests', debug:'▶ Run the tests', refactor:'▶ Run the tests', spec:'▶ Run your suite', network:'▶ Send signal', transport:'▶ Start the transfer', sequence:'▶ Time the exchange', layers:'▶ Send the frame', routing:'▶ Forward the packets'}[kind] ?? '▶ Check answer');
export const panelTitle = kind => ({code:'COMMAND CONSOLE', algo:'FUNCTION CONSOLE', debug:'REPAIR CONSOLE', refactor:'REWRITE CONSOLE', spec:'TEST CONSOLE'}[kind] ?? 'MISSION CONTROLS');
export const languageTag = kind => ({code:'JavaScript · sandboxed subset', algo:'JavaScript · checked against test cases', debug:'JavaScript · a program that runs and is wrong', refactor:'JavaScript · judged on shape as well as answers', spec:'JavaScript · your cases against their code'}[kind] ?? 'Interactive model · simplified');
export const mapLabel = kind => ({code:'ISOMETRIC VIEW', algo:'TEST CASES', debug:'TEST CASES', refactor:'TEST CASES', spec:'THE CODE UNDER TEST'}[kind] ?? 'DATA VISUALISATION');
export const consoleTask = kind => ({debug:'Repair this function', refactor:'Rewrite this function', spec:'Return your cases from'}[kind] ?? 'Write this function');

export function commandReference(item) {
  if (item.kind === 'code') return ['move(n)', 'turnLeft()', 'turnRight()', 'canMove()', 'let', 'for', 'while', 'if / else', 'function'];
  // Puzzle missions have no function to write, and their row stays hidden.
  if (!item.signature) return [];
  // A mission may name the pieces it is actually about; otherwise the general
  // set, written against this mission's own parameter rather than a stand-in.
  const parameter = item.signature.match(/\(([^,)]+)/)?.[1].trim() || 'values';
  return [item.signature, ...(item.toolkit ?? ['return', 'let', 'for', 'while', 'if / else', `${parameter}.length`, `${parameter}[i]`, 'Math.floor()', 'print()'])];
}

const isCoding = item => item.kind === 'code' || algoKinds.has(item.kind);
const freshAttempt = () => ({hints:0, solutionShown:false, revealed:0, runs:0, predicted:null, diagnosed:false});

export function createConsole({level, feats, persist, log}) {
  let attempt = freshAttempt();
  let hintIndex = 0, panelChoice = 0;
  const read = new Set();

  // Read-only evidence beside the lesson: the same idea in other languages, or the
  // tool output an engineer would actually have been looking at. Nothing here
  // runs — it is there to be read against what the mission is asking.
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
    const climbable = isCoding(item) && lines.length > 1;
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
    if (attempt.diagnosed || !isCoding(item)) { then(); return; }
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

  // Predict, then run. Committing to an answer before the machine gives you one is
  // worth more than the answer; nothing is scored on it, and being wrong is the
  // useful case.
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
    log(`Prediction: ${called.message}`, called.right ? 'success' : null);
    attempt.predicted = null;
    persist();
  }

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

  return {
    get attempt() { return attempt; },
    // A mission is loaded: nothing carries over from the last one.
    load(item) {
      attempt = freshAttempt();
      hintIndex = 0;
      panelChoice = 0;
      $('cause').hidden = true;
      $('hint-text').textContent = 'Mistakes are part of the mission. Try an idea and read what comes back.';
      $('hint').textContent = 'Get a hint';
      $('hint').disabled = false;
      readingPanel(item);
      renderPrediction();
      renderLadder();
    },
    // The whole answer, asked for outright: the rest of the ladder at once.
    revealSolution() {
      attempt.solutionShown = true;
      attempt.revealed = solutionLines().length;
    },
    countRun() { attempt.runs++; },
    renderLadder,
    askTheCause,
    settlePrediction
  };
}
