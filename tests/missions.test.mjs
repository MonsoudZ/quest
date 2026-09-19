import test from 'node:test';
import assert from 'node:assert/strict';
import {levels, chapters} from '../dist/levels.js';
import {simulate, evaluateAlgorithm} from '../dist/engine.js';
import {isPuzzle, initialState, solutionState, applyAction, widgets, view, evaluate} from '../dist/puzzles.js';

const solve = level => level.kind === 'code' ? simulate(level, level.solution)
  : level.kind === 'algo' ? evaluateAlgorithm(level, level.solution)
  : evaluate(level, solutionState(level));
const attempt = level => level.kind === 'code' ? simulate(level, level.starter)
  : level.kind === 'algo' ? evaluateAlgorithm(level, level.starter)
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
    if (level.kind === 'algo') {
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
