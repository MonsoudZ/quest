import test from 'node:test';
import assert from 'node:assert/strict';
import {levels, chapters} from '../dist/levels.js';
import {simulate, evaluateAlgorithm, evaluateSpec, algoKinds} from '../dist/engine.js';
import {isPuzzle, initialState, solutionState, applyAction, widgets, view, evaluate} from '../dist/puzzles.js';
import {sceneFor} from '../dist/scenes.js';

const run = level => level.kind === 'spec' ? evaluateSpec : evaluateAlgorithm;
const solve = level => level.kind === 'code' ? simulate(level, level.solution)
  : algoKinds.has(level.kind) ? run(level)(level, level.solution)
  : evaluate(level, solutionState(level));
const attempt = level => level.kind === 'code' ? simulate(level, level.starter)
  : algoKinds.has(level.kind) ? run(level)(level, level.starter)
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
    if (level.kind === 'spec') {
      // A spec mission supplies the code and the player supplies the cases.
      assert.ok(level.mutants.length >= 3, `${level.id} needs at least three broken versions to reject`);
      assert.ok(level.correct.includes(level.subject.name), `${level.id} correct implementation`);
      assert.ok(level.subject.contract.length > 40, `${level.id} needs to state what the function is meant to do`);
    } else if (algoKinds.has(level.kind)) {
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
  // `let` is explained by the variables mission and used by the loop counter, so
  // it cannot be the loop that introduces it.
  assert.ok(index('name-the-distance') < index('repeat-the-route'), 'variables come before the loop that declares one');
  assert.ok(index('repeat-the-route') < index('unknown-corridor'));
  assert.ok(index('unknown-corridor') < index('one-routine-twice'));
  // Reading a failure is the mission that teaches reading the case list, so no
  // other mission may hand the player a broken program before it.
  const firstDebug = levels.findIndex(level => level.kind === 'debug');
  assert.equal(levels[firstDebug].id, 'the-log-that-lies', 'a debug mission comes before the one that teaches reading failures');
  assert.ok(index('balance-the-manifest') < index('first-in-first-served'), 'a stack before the queue it is contrasted with');
  assert.ok(index('letter-by-letter') < index('break-it-into-tokens'), 'strings before the mission that takes one apart');
  assert.ok(index('write-the-tests') < index('trust-nothing'), 'how to write a suite before what to point one at');
  assert.ok(index('total-the-readings') < index('divide-and-conquer'));
  assert.ok(index('one-routine-twice') < index('call-yourself'), 'functions come before recursion');
  assert.ok(index('speak-in-bits') < index('negative-space'));
  // Computer science reads as three movements: how a machine writes a value
  // down, how data is arranged once it has, and what the machine actually is.
  // Floating point and character encoding used to sit six places after the
  // other three representation missions, which made the chapter a shuffle.
  const science = levels.filter(level => level.chapter === 'Computer science').map(level => level.id);
  const movement = id => {
    const position = science.indexOf(id);
    assert.ok(position >= 0, `${id} is not a Computer science mission`);
    return position;
  };
  const written = ['speak-in-bits', 'one-byte-code', 'negative-space', 'count-the-cents', 'bytes-not-letters'];
  const arranged = ['restore-the-order', 'how-it-scales', 'hash-it-out', 'the-tree-that-became-a-list', 'fewest-hops', 'latency-matters'];
  const machine = ['the-loop-that-misses', 'find-the-flipped-bit', 'both-consoles-at-once'];
  assert.deepEqual([...written, ...arranged, ...machine], science, 'the three movements have drifted');
  assert.ok(Math.max(...written.map(movement)) < Math.min(...arranged.map(movement)));
  assert.ok(Math.max(...arranged.map(movement)) < Math.min(...machine.map(movement)));
  // Complexity is the lens the rest of the middle movement is read through, so
  // it comes after the first sort and before the structures it is used to judge.
  assert.ok(movement('restore-the-order') < movement('how-it-scales'));
  assert.ok(movement('how-it-scales') < movement('hash-it-out'));
  assert.ok(movement('how-it-scales') < movement('the-tree-that-became-a-list'));
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
    // A kind either has an isometric scene or a diagram description, never both
    // and never neither — the pairing is what keeps one of them from going unread.
    assert.equal(!!sceneFor(level), !rendered.diagram, `${level.id} has ${sceneFor(level) ? 'both a scene and' : 'neither a scene nor'} a diagram`);
    if (rendered.diagram) assert.ok(rendered.diagram.type, `${level.id} has a diagram with no type`);
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
    // A rewrite for speed has to be visibly faster; a rewrite for structure has
    // to at least not cost more, and its rule has to be about structure.
    const slow = attempted.cases.at(-1).operations;
    const quick = solved.cases.at(-1).operations;
    if (level.shape.maxLoops !== undefined || level.shape.maxLoopDepth !== undefined) {
      assert.ok(quick * 4 < slow, `${level.id}: the rewrite costs ${quick} steps against ${slow}, which is not a visible improvement`);
    } else {
      assert.ok(quick <= slow * 1.2, `${level.id}: the rewrite costs ${quick} steps against ${slow}`);
      assert.ok(level.shape.requireCalls || level.shape.maxStatements !== undefined, `${level.id} has no structural rule`);
    }
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

test('the chips beside the console name things that exist in that mission', () => {
  for (const level of levels.filter(item => algoKinds.has(item.kind))) {
    const parameters = level.signature.slice(level.signature.indexOf('(') + 1, -1).split(',').map(name => name.trim()).filter(Boolean);
    const chips = level.toolkit ?? [];
    for (const chip of chips) {
      // A chip that reads a parameter has to read one this mission actually takes.
      const named = chip.match(/^([a-z][\w]*)[.[]/i);
      // Math and Object are the sandbox's own namespaces; the rest are locals a
      // mission's lesson introduces by name.
      const locals = ['Math', 'Object', 'stack', 'queue', 'order', 'seen', 'report', 'tokens', 'words', 'best', 'values', 'digits', 'copy', 'out', 'clamp', 'band', 'args'];
      if (named) assert.ok(parameters.includes(named[1]) || locals.includes(named[1]),
        `${level.id} offers “${chip}”, but it takes ${parameters.join(', ')}`);
      assert.ok(chip.length <= 34, `${level.id} chip “${chip}” is too long for the row`);
    }
    if (level.kind === 'spec') continue;
    if (!chips.length) {
      // The generated default indexes the first parameter, so that parameter has
      // to be the sequence the mission walks.
      const walked = level.cases[0].args[0];
      assert.ok(Array.isArray(walked) || typeof walked === 'string',
        `${level.id} has no toolkit, so the console would offer ${parameters[0]}.length on a ${typeof walked}`);
    }
  }
});

test('every mission that ships evidence ships all of it', () => {
  // A language panel and an artifact panel are the same panel: read-only
  // material beside the lesson, never a control and never the answer.
  const panels = levels.filter(level => level.artifact).map(level => ({level, panel:level.artifact, key:'panes'}));
  assert.ok(panels.length >= 9, `only ${panels.length} missions carry an artifact panel`);
  for (const {level, panel} of panels) {
    assert.ok(panel.title.length > 8 && panel.note.length > 30, `${level.id} panel needs a title and a note`);
    assert.ok(panel.panes.length >= 3, `${level.id} shows only ${panel.panes.length} panes`);
    const seen = new Set();
    for (const pane of panel.panes) {
      assert.ok(pane.label && pane.code && pane.note, `${level.id} has an incomplete pane`);
      assert.ok(pane.note.length > 30, `${level.id}/${pane.label} needs a note that says what to read in it`);
      assert.ok(!seen.has(pane.label), `${level.id} lists ${pane.label} twice`);
      seen.add(pane.label);
      assert.ok(pane.code.split('\n').length <= 10, `${level.id}/${pane.label} is too tall for the panel`);
    }
  }
  // Every chapter that was built out carries evidence, not just Programming.
  for (const chapter of ['Computer science', 'Networking', 'System design']) {
    assert.ok(levels.some(level => level.chapter === chapter && level.artifact), `${chapter} has no mission with an artifact panel`);
  }
});

test('the diagnosis missions hand over something broken and accept only the repair', () => {
  const byId = id => levels.find(level => level.id === id);

  // A misconfiguration, not a blank form: the mission starts wrong on purpose.
  const wiring = byId('same-deck-or-not');
  assert.equal(evaluate(wiring, initialState(wiring)).success, false);
  assert.equal(evaluate(wiring, solutionState(wiring)).success, true);
  // The fault is the mask, so the right gateway with the wrong mask still fails.
  const halfFixed = {...initialState(wiring), dials:{prefix:24, gateway:'10.20.0.1'}};
  assert.equal(evaluate(wiring, halfFixed).success, false);
  assert.match(evaluate(wiring, halfFixed).message, /directly/);

  // The incident mission is handed a running design that is saturated in one tier.
  const incident = byId('bring-it-back');
  const before = evaluate(incident, initialState(incident));
  assert.equal(before.success, false);
  assert.match(before.message, /Overloaded/);
  assert.equal(before.result.utilisation.read > 1, true, 'the tier the mission is about is the one over capacity');
  assert.equal(before.result.utilisation.app < 1, true, 'no other tier is saturated, so the diagnosis is unambiguous');
  // Buying capacity in the wrong tier does not fix it, and buying everything is refused on cost.
  const wrongTier = {...initialState(incident), dials:{...initialState(incident).dials, servers:18}};
  assert.equal(evaluate(incident, wrongTier).success, false);
  const everything = {...initialState(incident), dials:{servers:18, web:2, db:2, cache:3, replicas:4}};
  const lavish = evaluate(incident, everything);
  assert.equal(lavish.success, false);
  assert.match(lavish.message, /credits|budget/);
  assert.equal(evaluate(incident, solutionState(incident)).success, true);

  // The estimation mission is checked against its own model, not a stored key.
  const estimate = byId('size-it-yourself');
  const rows = evaluate(estimate, solutionState(estimate));
  assert.equal(rows.success, true);
  assert.deepEqual(solutionState(estimate).choices, rows.rows.map(row => row.answer),
    'the shipped answers are the ones the estimators compute');
});

test('the machine-level missions hand over something wrong and accept only the repair', () => {
  const byId = id => levels.find(level => level.id === id);

  // The codeword mission starts from the word as it arrived, not from zero.
  const ecc = byId('find-the-flipped-bit');
  assert.deepEqual(initialState(ecc).bits, ecc.received, 'the player is repairing, not building');
  assert.equal(evaluate(ecc, initialState(ecc)).success, false);
  // Exactly one flip, and exactly the right one.
  let winners = 0;
  for (let index = 0; index < ecc.received.length; index++) {
    const bits = [...ecc.received];
    bits[index] ^= 1;
    if (evaluate(ecc, {...initialState(ecc), bits}).success) winners++;
  }
  assert.equal(winners, 1, 'only one single-bit repair is accepted');
  // Flipping two is refused as a guess rather than accepted by luck.
  const twice = [...ecc.received];
  twice[0] ^= 1;
  twice[5] ^= 1;
  assert.match(evaluate(ecc, {...initialState(ecc), bits:twice}).message, /changed 2 bits|locate one flip/);

  // The tree mission is handed sorted input, which is the worst case.
  const tree = byId('the-tree-that-became-a-list');
  const start = evaluate(tree, initialState(tree));
  assert.equal(start.success, false);
  assert.equal(start.tree.height, tree.keys.length, 'sorted input is a list');
  assert.equal(evaluate(tree, solutionState(tree)).success, true);

  // The locality mission changes no arithmetic: every plan touches the same cells.
  const cache = byId('the-loop-that-misses');
  const touches = cache.plans.map(plan => evaluate(cache, {...initialState(cache), dials:{plan:plan.id}}).result.touches);
  assert.equal(new Set(touches).size, 1, 'the work is identical; only the order differs');
  const missCounts = cache.plans.map(plan => evaluate(cache, {...initialState(cache), dials:{plan:plan.id}}).result.misses);
  assert.ok(Math.max(...missCounts) > Math.min(...missCounts) * 4, 'and the traffic differs by more than four times');
});

test('every mission kind is complete: it both judges and draws', async () => {
  // The two halves used to live in switches far apart and could drift out of
  // step. They are one entry each now, and this is what keeps them that way.
  const {kinds} = await import('../dist/puzzles.js');
  const used = new Set(levels.filter(isPuzzle).map(level => level.kind));
  for (const kind of used) {
    assert.ok(kinds[kind], `no entry for the kind “${kind}”, which ${levels.filter(level => level.kind === kind).length} missions use`);
    assert.equal(typeof kinds[kind].evaluate, 'function', `${kind} does not judge`);
    assert.equal(typeof kinds[kind].view, 'function', `${kind} does not draw`);
  }
  // And nothing in the table is there for a kind no mission has.
  for (const kind of Object.keys(kinds)) assert.ok(used.has(kind), `the table carries “${kind}”, which no mission uses`);
  assert.throws(() => evaluate({kind:'nonesuch'}, {}), /Unknown puzzle kind/);
});
