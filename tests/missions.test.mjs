import test from 'node:test';
import assert from 'node:assert/strict';
import {levels, chapters} from '../dist/levels.js';
import {simulate, evaluateAlgorithm, algoKinds} from '../dist/engine.js';
import {isPuzzle, initialState, solutionState, applyAction, widgets, view, evaluate} from '../dist/puzzles.js';

const solve = level => level.kind === 'code' ? simulate(level, level.solution)
  : algoKinds.has(level.kind) ? evaluateAlgorithm(level, level.solution)
  : evaluate(level, solutionState(level));
const attempt = level => level.kind === 'code' ? simulate(level, level.starter)
  : algoKinds.has(level.kind) ? evaluateAlgorithm(level, level.starter)
  : evaluate(level, initialState(level));

test('every published mission is solved by the solution it ships', () => {
  for (const level of levels) {
    const result = solve(level);
    assert.equal(result.success, true, `${level.id}: ${result.error ?? result.message}`);
  }
});

test('no mission is already solved before the player does anything', () => {
  for (const level of levels) {
    let result;
    try { result = attempt(level); } catch { continue; }
    assert.equal(result.success, false, `${level.id} starts in a winning state`);
  }
});

test('every mission carries the teaching material the interface shows', () => {
  const seen = new Set();
  for (const level of levels) {
    assert.ok(!seen.has(level.id), `duplicate id ${level.id}`);
    seen.add(level.id);
    for (const field of ['name','chapter','concept','location','objective','intro','lesson','takeaway']) {
      assert.equal(typeof level[field], 'string', `${level.id} is missing ${field}`);
      assert.ok(level[field].length >= 3, `${level.id} has an empty ${field}`);
    }
    assert.ok(Array.isArray(level.hints) && level.hints.length >= 2, `${level.id} needs at least two hints`);
    assert.match(level.reference.url, /^https:\/\//, `${level.id} reference`);
    assert.ok(level.reference.label.length > 8, `${level.id} reference label`);
    assert.ok(level.solution !== undefined, `${level.id} has no solution`);
    if (level.kind === 'code') {
      assert.ok(level.starter.length > 0, `${level.id} needs a starter program`);
      assert.deepEqual(level.tiles.some(([x, y]) => x === level.goal[0] && y === level.goal[1]), true, `${level.id} goal is off the deck`);
      assert.ok(level.tiles.every(([x, y]) => x >= 0 && x <= 6 && y >= 0 && y <= 6), `${level.id} has tiles outside the deck`);
    }
    if (algoKinds.has(level.kind)) {
      assert.ok(level.cases.length >= 3, `${level.id} needs at least three cases`);
      assert.ok(level.signature.includes(level.fn), `${level.id} signature`);
      assert.ok(level.starter.includes(level.fn), `${level.id} starter should declare the function`);
    }
  }
  assert.deepEqual(chapters, ['Programming','Computer science','Networking','System design']);
  assert.ok(levels.filter(level => level.chapter === 'Networking').length >= 6);
});

test('mission ordering introduces each concept before it is required', () => {
  const index = id => levels.findIndex(level => level.id === id);
  assert.ok(index('repeat-the-route') < index('unknown-corridor'));
  assert.ok(index('unknown-corridor') < index('one-routine-twice'));
  assert.ok(index('total-the-readings') < index('divide-and-conquer'));
  assert.ok(index('one-routine-twice') < index('call-yourself'), 'functions come before recursion');
  assert.ok(index('speak-in-bits') < index('negative-space'));
  assert.ok(index('address-the-station') < index('carve-the-block'));
  assert.ok(index('window-of-opportunity') < index('lost-in-transit'));
});

test('grid missions insist on the concept they teach, not just on arriving', () => {
  const byId = id => levels.find(level => level.id === id);
  assert.equal(simulate(byId('unknown-corridor'), 'move(5);\nturnRight();\nmove(4);').success, false);
  assert.match(simulate(byId('unknown-corridor'), 'move(5);\nturnRight();\nmove(4);').error, /while loop/);
  assert.equal(simulate(byId('one-routine-twice'), 'move(2);turnRight();move(2);turnLeft();move(2);turnRight();move(2);').success, false);
  assert.match(simulate(byId('one-routine-twice'), 'move(2);turnRight();move(2);turnLeft();move(2);turnRight();move(2);').error, /call it at least twice/);
  const once = 'function leg() {\n  move(2);\n  turnRight();\n  move(2);\n  turnLeft();\n}\nleg();\nmove(2);\nturnRight();\nmove(2);';
  assert.equal(simulate(byId('one-routine-twice'), once).success, false, 'one call is not reuse');
});

test('algorithm missions reject the shapes of answer they are meant to reject', () => {
  const byId = id => levels.find(level => level.id === id);
  const search = byId('divide-and-conquer');
  const linear = evaluateAlgorithm(search, 'function find(sorted, target) {\n  for (let i = 0; i < sorted.length; i++) {\n    if (sorted[i] === target) {\n      return i;\n    }\n  }\n  return -1;\n}');
  assert.equal(linear.success, false, 'a linear scan must not pass the logarithmic gate');
  assert.match(linear.error, /steps and this mission allows/);
  assert.ok(linear.cases.filter(result => result.passed).length >= 5, 'the linear scan is still correct, only too slow');

  const gcd = byId('call-yourself');
  const loop = evaluateAlgorithm(gcd, 'function gcd(a, b) {\n  while (b !== 0) {\n    let hold = b;\n    b = a % b;\n    a = hold;\n  }\n  return a;\n}');
  assert.equal(loop.success, false, 'this mission asks for recursion specifically');
  assert.match(loop.error, /call itself/);
  assert.equal(evaluateAlgorithm(gcd, levels.find(level => level.id === 'call-yourself').solution).success, true);

  const total = byId('total-the-readings');
  assert.equal(evaluateAlgorithm(total, 'function total(values) {\n  return 10;\n}').success, false);
  assert.match(evaluateAlgorithm(total, 'function sum(values) {\n  return 0;\n}').error, /needs a function named total/);
  assert.match(evaluateAlgorithm(total, 'function total(values, extra) {\n  return 0;\n}').error, /should take 1 parameter/);
  assert.match(evaluateAlgorithm(total, 'function total(values) {\n  return values[99];\n}').error, /stopped with an error/);
});

test('puzzle state, widgets, and diagrams hold together for every puzzle mission', () => {
  for (const level of levels.filter(isPuzzle)) {
    const state = initialState(level);
    const list = widgets(level, state);
    assert.ok(list.length > 0, `${level.id} renders no controls`);
    for (const widget of list) {
      assert.ok(widget.label && widget.type, `${level.id} widget is missing a label or type`);
      if (widget.type === 'choice') assert.ok(widget.options.length >= 2, `${level.id} choice needs options`);
      if (widget.type === 'dial') assert.ok(widget.options.length >= 2, `${level.id} dial needs options`);
    }
    const rendered = view(level, state);
    assert.ok(rendered.diagram.type, `${level.id} has no diagram`);
    assert.ok(rendered.instructions.length > 10, `${level.id} has no instructions`);
    // Every action a widget offers has to produce a usable state.
    for (const widget of list) {
      const actions = [widget.action, widget.up, widget.down, ...(widget.options ?? []).map(option => option.action)].filter(Boolean);
      for (const action of actions) {
        const next = applyAction(level, state, action);
        assert.doesNotThrow(() => view(level, next), `${level.id} broke on ${JSON.stringify(action)}`);
        assert.doesNotThrow(() => evaluate(level, next), `${level.id} failed to evaluate after ${JSON.stringify(action)}`);
      }
    }
    assert.equal(evaluate(level, solutionState(level)).success, true, `${level.id} solution`);
  }
});

test('a puzzle reached through its own widgets ends in the winning state', () => {
  const level = levels.find(item => item.id === 'restore-the-order');
  let state = initialState(level);
  // Bubble sort, driven only through the swap widgets the interface exposes.
  for (let pass = 0; pass < level.values.length; pass++) {
    for (let index = 0; index < level.values.length - 1; index++) {
      if (state.values[index] > state.values[index + 1]) state = applyAction(level, state, {type:'swap', index});
    }
  }
  assert.deepEqual(state.values, [1,2,4,7,9]);
  assert.equal(evaluate(level, state).success, true);
  assert.equal(state.swaps > 0, true);
});

test('a debug mission ships a program that already runs and still answers wrongly', () => {
  for (const level of levels.filter(item => item.kind === 'debug')) {
    // It has to compile: the mission is about reading failures, not syntax.
    const attempted = evaluateAlgorithm(level, level.starter);
    assert.equal(attempted.success, false, `${level.id} ships a starter that already passes`);
    assert.ok(attempted.cases.length > 0 || attempted.error, `${level.id} starter did not even reach its cases`);
    assert.equal(/is not defined here|Expected “|does not understand/.test(attempted.error ?? ''), false, `${level.id} starter fails to compile rather than failing its cases: ${attempted.error}`);
    assert.equal(evaluateAlgorithm(level, level.solution).success, true, `${level.id} repair does not pass`);
  }
});

test('a refactor mission ships a starter that passes every case and is rejected on shape', () => {
  const refactors = levels.filter(item => item.kind === 'refactor');
  assert.ok(refactors.length > 0, 'there are no refactor missions to check');
  for (const level of refactors) {
    assert.ok(level.shape, `${level.id} has no shape rule, so nothing distinguishes it from an algo mission`);
    const attempted = evaluateAlgorithm(level, level.starter);
    assert.equal(attempted.success, false, `${level.id} accepts its own starter`);
    assert.equal(attempted.cases.every(entry => entry.passed && !entry.overGate), true, `${level.id} starter fails a case; a refactor mission's starter has to be correct`);
    assert.ok(attempted.shape, `${level.id} rejected the starter for something other than its shape: ${attempted.error}`);
    const solved = evaluateAlgorithm(level, level.solution);
    assert.equal(solved.success, true, `${level.id}: ${solved.error}`);
    assert.equal(solved.shape, null);
    // The rewrite is the point, so it has to cost visibly less.
    const slow = attempted.cases.at(-1).operations;
    const quick = solved.cases.at(-1).operations;
    assert.ok(quick * 4 < slow, `${level.id}: the rewrite costs ${quick} steps against ${slow}, which is not a visible improvement`);
  }
});

test('the writing missions live in Programming and the chapters keep their own subject', () => {
  const chapterOf = id => levels.find(level => level.id === id)?.chapter;
  for (const id of ['divide-and-conquer', 'call-yourself', 'balance-the-manifest', 'sweep-the-deck', 'break-it-into-tokens', 'work-out-the-answer']) {
    assert.equal(chapterOf(id), 'Programming', `${id} should be a Programming mission`);
  }
  const science = levels.filter(level => level.chapter === 'Computer science');
  assert.equal(science.some(level => algoKinds.has(level.kind)), false, 'Computer science is for the ideas, not for writing functions');
  assert.ok(levels.filter(level => level.chapter === 'Programming').length >= 15);
  assert.ok(science.length >= 6);
  // Records, then the missions that need them.
  const index = id => levels.findIndex(level => level.id === id);
  assert.ok(index('summarise-the-log') < index('sweep-the-deck'));
  assert.ok(index('summarise-the-log') < index('stop-searching-twice'));
  assert.ok(index('break-it-into-tokens') < index('work-out-the-answer'), 'tokens come before what reads them');
});

test('every polyglot panel is complete, and none of it claims to run', () => {
  const panels = levels.filter(level => level.polyglot);
  assert.ok(panels.length >= 3, `only ${panels.length} missions carry a language comparison`);
  const languages = new Set();
  for (const level of panels) {
    const {title, note, samples} = level.polyglot;
    assert.ok(title.length > 8 && note.length > 20, `${level.id} panel needs a title and a note`);
    assert.ok(samples.length >= 4, `${level.id} compares only ${samples.length} languages`);
    const seen = new Set();
    for (const sample of samples) {
      assert.ok(sample.language && sample.code && sample.note, `${level.id} has an incomplete sample`);
      assert.ok(sample.note.length > 20, `${level.id}/${sample.language} needs a note that says what differs`);
      assert.ok(!seen.has(sample.language), `${level.id} lists ${sample.language} twice`);
      seen.add(sample.language);
      languages.add(sample.language);
    }
    assert.ok(seen.has('JavaScript'), `${level.id} should show the language the player writes in`);
    // A sample is a comparison, never the answer the console would accept.
    assert.equal(samples.some(sample => sample.code === level.solution), false, `${level.id} shows its own solution as a sample`);
  }
  for (const language of ['Python', 'Ruby', 'Rust', 'Go']) {
    assert.ok(languages.has(language), `no mission shows ${language}`);
  }
});
