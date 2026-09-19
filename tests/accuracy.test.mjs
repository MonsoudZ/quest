import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {simulate, evaluateAlgorithm, evaluateNetwork, directions, sameValue} from '../dist/engine.js';
import {levels} from '../dist/levels.js';
import {isPuzzle, initialState, solutionState, evaluate} from '../dist/puzzles.js';

const byId = id => levels.find(level => level.id === id);
const room = {start:[0,0,0], goal:[6,6], tiles:Array.from({length:49}, (_, i) => [i % 7, Math.floor(i / 7)])};

// The sandbox never runs player code natively. Everything below is a fixed
// string from this file or from levels.js, executed only as a reference.
function native(source) {
  const state = {x:0, y:0, dir:0};
  const canMove = () => {
    const [dx, dy] = directions[state.dir];
    return state.x + dx >= 0 && state.x + dx < 7 && state.y + dy >= 0 && state.y + dy < 7;
  };
  runInNewContext(`"use strict";\n${source}`, {
    move:(n = 1) => { for (let i = 0; i < n; i++) { if (!canMove()) throw new Error('collision'); const [dx, dy] = directions[state.dir]; state.x += dx; state.y += dy; } },
    turnLeft:() => { state.dir = (state.dir + 3) % 4; },
    turnRight:() => { state.dir = (state.dir + 1) % 4; },
    canMove, print:() => {}
  }, {timeout:200});
  return state;
}

test('grid programs end where real JavaScript would leave the drone', () => {
  for (const source of [
    'move(3); turnRight(); move(2);',
    'let n = 2; if (canMove()) { let n = 1; move(n); } move(n);',
    'let n = 1; for (let i = 0; i < 3; i++) { let n = 1; move(n); } move(n);',
    'let i = 2; for (let i = 0; i < 1; i++) { move(); } move(i);',
    'while (canMove()) { move(); } turnRight(); while (canMove()) { move(); }',
    'function leg(n) { move(n); turnRight(); } leg(2); leg(2); leg(1);',
    'function stair(count) { for (let i = 0; i < count; i++) { move(); turnRight(); move(); turnLeft(); } } stair(3);',
    'let steps = 0; while (steps < 4) { if (canMove()) { move(); } steps++; }',
    'for (let i = 0; i < 6; i++) { if (!canMove()) { turnRight(); } else { move(); } }',
    'let plan = [2, 1, 2]; for (let i = 0; i < plan.length; i++) { move(plan[i]); turnRight(); }'
  ]) assert.deepEqual(simulate(room, source).state, native(source), source);
});

test('a drone that runs out of deck stops with an explanation, where native JavaScript would throw', () => {
  const walked = simulate(room, 'move(100); move(100);');
  assert.equal(walked.success, false);
  assert.match(walked.error, /no traversable tile/);
  assert.equal(walked.state.x, 6, 'the drone stops at the edge rather than passing through it');
  assert.throws(() => native('move(100); move(100);'));
});

test('grid programs that real JavaScript rejects are rejected here too', () => {
  for (const source of [
    'if (canMove()) { let n = 2; } move(n);',
    'let n = 2; if (canMove()) { let n = n; move(n); }',
    'move(n); let n = 2;',
    'for (let i = 0; i < 1; i++) { move(); } move(i);'
  ]) {
    assert.throws(() => native(source), source);
    assert.throws(() => simulate(room, source), source);
  }
});

// Each algorithm mission ships a solution that is also valid JavaScript. Running
// it natively on random inputs and comparing gives an independent check of both
// the interpreter and the mission's expected answers.
const generators = {
  'total-the-readings':random => [Array.from({length:Math.floor(random() * 8)}, () => Math.floor(random() * 200) - 100)],
  'hold-the-line':random => [Math.floor(random() * 120), Math.floor(random() * 160)],
  'divide-and-conquer':random => {
    const values = [...new Set(Array.from({length:Math.floor(random() * 30) + 1}, () => Math.floor(random() * 120)))].sort((a, b) => a - b);
    return [values, random() < 0.6 ? values[Math.floor(random() * values.length)] : Math.floor(random() * 120)];
  },
  'call-yourself':random => [Math.floor(random() * 5000) + 1, Math.floor(random() * 5000)],
  'balance-the-manifest':random => {
    const alphabet = ['(', ')', '[', ']', '{', '}'];
    return [Array.from({length:Math.floor(random() * 10)}, () => alphabet[Math.floor(random() * alphabet.length)]).join('')];
  }
};

test('every algorithm solution agrees with the same function run as real JavaScript', () => {
  let seed = 7;
  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (const level of levels.filter(item => item.kind === 'algo')) {
    const reference = runInNewContext(`${level.solution}\n${level.fn};`, {}, {timeout:1000});
    // The shipped cases first.
    for (const testCase of level.cases) {
      assert.equal(sameValue(reference(...structuredClone(testCase.args)), testCase.expect), true, `${level.id}: the published expectation for ${JSON.stringify(testCase.args).slice(0, 60)} disagrees with real JavaScript`);
    }
    // Then random inputs through both implementations.
    const generate = generators[level.id];
    assert.ok(generate, `${level.id} has no random input generator`);
    for (let round = 0; round < 60; round++) {
      const args = generate(random);
      const expected = reference(...structuredClone(args));
      const sandbox = evaluateAlgorithm({...level, cases:[{args, expect:expected}]}, level.solution);
      assert.equal(sandbox.success, true, `${level.id}(${JSON.stringify(args).slice(0, 80)}) → expected ${JSON.stringify(expected)}: ${sandbox.error}`);
    }
  }
});

test('every enabled graph configuration matches independent path enumeration', () => {
  for (const level of levels.filter(item => item.kind === 'network')) {
    for (let mask = 0; mask < 2 ** level.edges.length; mask++) {
      const selected = level.edges.map((_, index) => index).filter(index => mask & (1 << index));
      let best = Infinity;
      const visit = (node, seen, cost) => {
        if (node === level.target) { best = Math.min(best, cost); return; }
        for (const index of selected) {
          const [a, b, weight] = level.edges[index];
          const next = a === node ? b : b === node ? a : null;
          if (next && !seen.has(next)) visit(next, new Set([...seen, next]), cost + (level.budget ? weight : 1));
        }
      };
      visit(level.source, new Set([level.source]), 0);
      const result = evaluateNetwork(level, selected);
      assert.equal(result.path.length > 0, Number.isFinite(best), `${level.id} mask=${mask}`);
      if (Number.isFinite(best)) assert.equal(level.budget ? result.cost : result.hops, best);
      assert.equal(result.success, best <= (level.budget || level.maxEdges));
    }
  }
});

test('unused enabled links do not increase the selected route cost', () => {
  const level = byId('latency-matters');
  const result = evaluateNetwork(level, [0, 1, 2, 3, 4]);
  assert.equal(result.cost, 10);
  assert.deepEqual(result.pathEdges, [2, 3, 4]);
  assert.equal(result.success, true);
});

// Enumerating the whole option space of a puzzle proves three things at once:
// it is winnable, it is not won by accident, and the shipped solution is right.
function enumerate(level) {
  const base = initialState(level);
  let states = [base];
  const expand = (list, options) => list.flatMap(state => options.map(apply => apply(state)));
  if (level.bits) {
    const width = level.bits.width;
    states = expand(states, Array.from({length:2 ** width}, (_, mask) => state => ({
      ...state,
      bits:Array.from({length:width}, (_, index) => (mask >> (width - 1 - index)) & 1)
    })));
  }
  if (level.items) {
    const permutations = list => list.length <= 1 ? [list] : list.flatMap((item, index) =>
      permutations([...list.slice(0, index), ...list.slice(index + 1)]).map(rest => [item, ...rest]));
    states = expand(states, permutations(level.items.map(item => item.id)).map(order => state => ({...state, order})));
  }
  if (level.dials) for (const dial of level.dials) {
    states = expand(states, dial.options.map(option => state => ({...state, dials:{...state.dials, [dial.id]:option.value}})));
  }
  if (level.questions) for (const [index, question] of level.questions.entries()) {
    states = expand(states, question.options.map((_, option) => state => {
      const choices = [...state.choices];
      choices[index] = option;
      return {...state, choices};
    }));
  }
  if (level.edges) {
    states = expand(states, Array.from({length:2 ** level.edges.length}, (_, mask) => state =>
      ({...state, links:level.edges.map((_, index) => index).filter(index => mask & (1 << index))})));
  }
  return states;
}

test('every puzzle mission is winnable, discriminating, and solved by the answer it ships', () => {
  const report = [];
  for (const level of levels.filter(item => isPuzzle(item) && item.kind !== 'sort')) {
    const states = enumerate(level);
    assert.ok(states.length <= 30000, `${level.id} has too large a space to enumerate: ${states.length}`);
    const winners = states.filter(state => {
      try { return evaluate(level, state).success; } catch { return false; }
    });
    assert.ok(winners.length >= 1, `${level.id} cannot be won`);
    assert.ok(winners.length < states.length, `${level.id} is won by every configuration`);
    // A mission may have more than one right answer — any window at or beyond
    // the bandwidth-delay product wins, for instance — but it must not be a
    // configuration a player would stumble into.
    assert.ok(winners.length <= Math.max(2, states.length * 0.25), `${level.id} is won by ${winners.length} of ${states.length} configurations, which is too easy to hit by accident`);
    const answer = JSON.stringify(solutionState(level));
    assert.ok(winners.some(state => JSON.stringify(state) === answer), `${level.id}: the shipped solution is not among the ${winners.length} winning configurations`);
    report.push(`${level.id}: ${winners.length} of ${states.length}`);
  }
  assert.ok(report.length >= 15, `only ${report.length} puzzle missions were enumerated`);
});

test('the sorting puzzle is winnable from its start and only in sorted order', () => {
  const level = byId('restore-the-order');
  const permutations = list => list.length <= 1 ? [list] : list.flatMap((item, index) =>
    permutations([...list.slice(0, index), ...list.slice(index + 1)]).map(rest => [item, ...rest]));
  const all = permutations(level.values);
  const winners = all.filter(values => evaluate(level, {...initialState(level), values}).success);
  assert.equal(winners.length, 1);
  assert.deepEqual(winners[0], [...level.values].sort((a, b) => a - b));
});

test('quiz and routing missions have exactly one right answer', () => {
  for (const level of levels.filter(item => item.kind === 'quiz' || item.kind === 'routing')) {
    const winners = enumerate(level).filter(state => evaluate(level, state).success);
    assert.equal(winners.length, 1, `${level.id} has ${winners.length} winning answer sets`);
  }
});
