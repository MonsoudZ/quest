import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {simulate, evaluateAlgorithm, evaluateNetwork, directions, sameValue, algoKinds} from '../dist/engine.js';
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
  },
  'summarise-the-log':random => [Array.from({length:Math.floor(random() * 9)}, () => Math.floor(random() * 300) - 150)],
  'the-log-that-lies':random => [Array.from({length:Math.floor(random() * 9)}, () => Math.floor(random() * 300) - 150)],
  'sweep-the-deck':random => {
    const rows = Math.floor(random() * 4) + 1;
    const columns = Math.floor(random() * 4) + 1;
    return [Array.from({length:rows}, () => Array.from({length:columns}, () => Math.floor(random() * 60) - 30))];
  },
  'stop-searching-twice':random => {
    // Codes drawn from a small alphabet, so repeats turn up often enough to matter.
    const pool = Math.floor(random() * 6) + 2;
    return [Array.from({length:Math.floor(random() * 12)}, () => `QZ-${Math.floor(random() * pool)}`)];
  },
  'break-it-into-tokens':random => {
    const operators = ['+', '-', '*'];
    let text = '';
    const terms = Math.floor(random() * 4) + 1;
    for (let term = 0; term < terms; term++) {
      if (term) text += (random() < 0.4 ? ' ' : '') + operators[Math.floor(random() * 3)] + (random() < 0.4 ? ' ' : '');
      text += String(Math.floor(random() * 1000));
    }
    return [random() < 0.3 ? ` ${text} ` : text];
  },
  'letter-by-letter':random => {
    const pool = ['Ada', 'grace', 'ALAN', 'Mathison', 'Hopper', 'jean', 'Q'];
    const words = Math.floor(random() * 4);
    // Double spaces and a stray one at each end, because "".split(" ") keeping
    // an empty entry is exactly the edge this mission is about.
    const gap = () => (random() < 0.2 ? '  ' : ' ');
    let name = Array.from({length:words}, () => pool[Math.floor(random() * pool.length)]).join(gap());
    if (random() < 0.2) name = ` ${name}`;
    if (random() < 0.2) name = `${name} `;
    return [name];
  },
  // Both of these read values[0] before checking anything, so an empty list is
  // an error in the sandbox and undefined in JavaScript. It is not a shared case.
  'the-name-that-hides':random => [Array.from({length:Math.floor(random() * 9) + 1}, () => Math.floor(random() * 200) - 100)],
  'answer-and-leave':random => [Math.floor(random() * 140) - 20],
  'first-in-first-served':random => {
    // A random tree: every compartment after the first hangs off one already
    // placed, so the plan is connected and nothing is reached twice.
    const size = Math.floor(random() * 7) + 1;
    const rooms = {r0:[]};
    for (let i = 1; i < size; i++) {
      const parent = `r${Math.floor(random() * i)}`;
      rooms[`r${i}`] = [];
      rooms[parent].push(`r${i}`);
    }
    return [rooms, 'r0'];
  },
  'sort-by-the-field':random => {
    // A narrow mass range, so ties turn up often enough for stability to be tested.
    const size = Math.floor(random() * 9);
    return [Array.from({length:size}, (_, i) => ({code:`C-${i}`, mass:Math.floor(random() * 5)}))];
  },
  'remember-the-answer':random => [Math.floor(random() * 24) + 1],
  'whose-array-is-it':random => [Array.from({length:Math.floor(random() * 9)}, () => Math.floor(random() * 60) - 30)],
  'split-and-merge':random => [Array.from({length:Math.floor(random() * 14)}, () => Math.floor(random() * 40) - 20)],
  'say-it-once':random => [Array.from({length:Math.floor(random() * 7)}, () => Math.floor(random() * 120))],
  'work-out-the-answer':random => {
    const operators = ['+', '-', '*'];
    const tokens = [{kind:'number', value:Math.floor(random() * 40) - 20}];
    for (let term = 0, terms = Math.floor(random() * 4); term < terms; term++) {
      tokens.push({kind:'operator', text:operators[Math.floor(random() * 3)]});
      tokens.push({kind:'number', value:Math.floor(random() * 40) - 20});
    }
    return [tokens];
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
  for (const level of levels.filter(item => algoKinds.has(item.kind) && item.kind !== 'spec')) {
    const context = {Object:Object.create(Object), console};
    context.Object.has = Object.hasOwn;
    const reference = runInNewContext(`${level.solution}\n${level.fn};`, context, {timeout:1000});
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

test('a mission set with dials has exactly one setting that wins', () => {
  // Several right answers makes the shipped solution one of many, leaves the
  // ladder showing an arbitrary one, and makes "which setting met the target?"
  // unanswerable when the mission comes back for review.
  for (const level of levels.filter(isPuzzle)) {
    if (!level.dials) continue;
    const combinations = level.dials.reduce(
      (all, dial) => all.flatMap(chosen => dial.options.map(option => ({...chosen, [dial.id]:option.value}))),
      [{}]);
    // Missions whose dials interact with another widget are checked against the
    // rest of their starting state, which is what the player actually has.
    const base = initialState(level);
    const winners = combinations.filter(dials => {
      try { return evaluate(level, {...base, dials}).success; } catch { return false; }
    });
    assert.equal(winners.length, 1,
      `${level.id} has ${winners.length} winning dial settings out of ${combinations.length}: ${JSON.stringify(winners).slice(0, 160)}`);
  }
});

test('no dial labels its own answer', () => {
  // "857 packets (one BDP)" beside a lesson whose point is that the answer is
  // one bandwidth-delay product hands the mission over in the option list.
  for (const level of levels.filter(isPuzzle)) {
    if (!level.dials || !level.solution?.dials) continue;
    for (const dial of level.dials) {
      const right = dial.options.find(option => option.value === level.solution.dials[dial.id]);
      if (!right) continue;
      const others = dial.options.filter(option => option !== right);
      // An annotation is fine where it is on more than one option — "13 slots
      // (prime)" among several sizes is a fact, not a nudge.
      const annotated = option => /\(|\u00b7/.test(option.label);
      assert.ok(!annotated(right) || others.some(annotated),
        `${level.id}: "${right.label}" is the answer and the only option carrying an explanation`);
    }
  }
});

test('the missions that look interactive are not four clicks in a costume', () => {
  // Three missions here once offered four, six and ten settings, so the way to
  // solve them was to try all of them rather than to work anything out. What
  // makes each of these a decision is named beside it; the count is the part a
  // later edit could quietly undo.
  const settings = level => level.dials.reduce((total, dial) => total * dial.options.length, 1);
  const byId = id => levels.find(level => level.id === id);
  const deep = {
    'count-the-cents':[12, 2, 'a representation and the unit it counts in'],
    // This one stayed a single dial on purpose: the decision is which tile size,
    // and what makes it a decision is having the sizes either side of the answer.
    'the-loop-that-misses':[15, 1, 'every tile size worth trying, either side of the one that fits'],
    'hash-it-out':[12, 2, 'a table size and what happens when two keys collide'],
    // Networking had five of these. The prefix mission is left alone: /24 to /30
    // is the whole domain, and the arithmetic is the only way through it.
    'one-address-many-decks':[20, 2, 'how many outside ports the pool holds, and what is published'],
    'window-of-opportunity':[9, 1, 'every window worth trying either side of one bandwidth-delay product'],
    'ramp-up-carefully':[10, 1, 'enough fixed windows to see that no single one suits both links'],
    'lost-in-transit':[12, 2, 'a window and a recovery strategy'],
    // System design was half multiple choice. Each of these is now a model with
    // more than one decision in it.
    'keep-the-hot-set-close':[32, 3, 'a strategy, a window, and what a write does to the entry'],
    'when-the-queue-never-drains':[20, 2, 'how many workers drain it and how much it may hold'],
    'the-retry-that-made-it-worse':[24, 3, 'a retry policy, how many attempts, and whether a breaker earns its place']
  };
  for (const [id, [least, dials, why]] of Object.entries(deep)) {
    assert.ok(settings(byId(id)) >= least, `${id} is down to ${settings(byId(id))} settings; it is meant to be ${why}`);
    assert.equal(byId(id).dials.length, dials, `${id} should offer ${dials} dial${dials === 1 ? '' : 's'}: ${why}`);
  }
});

test('quiz and routing missions have exactly one right answer', () => {
  for (const level of levels.filter(item => item.kind === 'quiz' || item.kind === 'routing')) {
    const winners = enumerate(level).filter(state => evaluate(level, state).success);
    assert.equal(winners.length, 1, `${level.id} has ${winners.length} winning answer sets`);
  }
});
