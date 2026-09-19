import test from 'node:test';
import assert from 'node:assert/strict';
import {compile, simulate, evaluateNetwork, evaluatePuzzle, evaluateAlgorithm, bitValue, toHex, sameValue, directions} from '../dist/engine.js';
import {levels} from '../dist/levels.js';

const byId = id => levels.find(level => level.id === id);
const room = {start:[0,0,0], goal:[6,6], tiles:Array.from({length:49}, (_, i) => [i % 7, Math.floor(i / 7)])};

test('a collision reports the responsible line and never moves through a wall', () => {
  const result = simulate(byId('first-contact'), 'move(5);');
  assert.equal(result.success, false);
  assert.equal(result.state.x, 5);
  assert.equal(result.steps.at(-1).line, 1);
  assert.match(result.error, /no traversable tile/);
});

test('programs are rejected before they run when they leave the sandbox', () => {
  assert.throws(() => compile('move(3)'), /ends before its/);
  assert.throws(() => compile('alert(1);'), /not defined here/);
  assert.throws(() => compile('window.location = 2;'), /Assign to a variable or to an array slot/);
  assert.throws(() => compile('print(window.location);'), /not defined here/);
  assert.throws(() => compile('x'.repeat(12001)), /12,000/);
  assert.throws(() => compile('let move = 2;'), /provided by the mission/);
});

test('the grid natives enforce their own argument rules', () => {
  assert.throws(() => simulate(room, 'move(101);'), /whole number of tiles from 0 to 100/);
  assert.throws(() => simulate(room, 'move(1.5);'), /whole number of tiles/);
  assert.throws(() => simulate(room, 'move("two");'), /whole number of tiles/);
  assert.throws(() => simulate(room, 'canMove(1);'), /takes no arguments/);
  assert.equal(simulate(room, 'move(0);').steps.length, 0);
});

test('a program can use the whole language on the grid, and print reaches the log', () => {
  const result = simulate(room, 'function stair(n) {\n  for (let i = 0; i < n; i++) {\n    move();\n    turnRight();\n    move();\n    turnLeft();\n  }\n}\nprint("starting");\nstair(3);\nprint(canMove());');
  assert.equal(result.state.x, 3);
  assert.equal(result.state.y, 3);
  assert.deepEqual(result.output, ['"starting"', 'true']);
});

test('runaway grid programs stop before the trace or the step budget runs away', () => {
  assert.throws(() => simulate(room, 'for (let i = 0; i < 100; i++) { for (let j = 0; j < 100; j++) { turnLeft(); } }'), /too long/);
  assert.throws(() => simulate(room, 'while (true) { turnLeft(); }'), /too long/);
  assert.throws(() => simulate(room, 'move(missing);'), /not defined here/);
});

test('lesson requirements need the concept, not only the destination', () => {
  const variables = byId('name-the-distance'), conditions = byId('read-the-room'), loops = byId('repeat-the-route');
  const whileLoop = byId('unknown-corridor'), functions = byId('one-routine-twice');
  assert.equal(simulate(variables, 'move(4);turnRight();move(4);').success, false);
  assert.equal(simulate(conditions, 'move(3);turnRight();move(4);').success, false);
  assert.equal(simulate(loops, 'move(2);turnLeft();move();turnRight();'.repeat(3)).success, false);
  assert.equal(simulate(whileLoop, 'for (let i = 0; i < 5; i++) { move(); }\nturnRight();\nfor (let i = 0; i < 4; i++) { move(); }').success, false);
  for (const level of [variables, conditions, loops, whileLoop, functions]) assert.equal(simulate(level, level.solution).success, true, level.id);
});

test('a for loop also satisfies the loop requirement when it is written as a while loop', () => {
  const loops = byId('repeat-the-route');
  const source = 'let i = 0;\nwhile (i < 3) {\n  move(2);\n  turnLeft();\n  move();\n  turnRight();\n  i++;\n}';
  assert.equal(simulate(loops, source).success, true);
});

test('path validation rejects disconnected and overly expensive graphs', () => {
  const hops = byId('fewest-hops'), weighted = byId('latency-matters');
  assert.equal(evaluateNetwork(hops, [0]).success, false);
  assert.equal(evaluateNetwork(hops, [2,3,4]).success, false);
  assert.equal(evaluateNetwork(weighted, [0,1]).success, false);
  assert.equal(evaluateNetwork(weighted, [2,3,4]).cost, 10);
  assert.throws(() => evaluateNetwork(hops, [99]), /valid links/);
});

test('bit puzzles read their width and encoding from the mission', () => {
  const nibble = byId('speak-in-bits'), byte = byId('one-byte-code'), signed = byId('negative-space');
  assert.equal(evaluatePuzzle(nibble, [1,0,1,1]).success, false);
  assert.equal(evaluatePuzzle(nibble, [1,1,0,1]).success, true);
  assert.throws(() => evaluatePuzzle(byte, [1,1,0,1]), /exactly 8 bits/);
  assert.equal(bitValue(byte, [1,0,1,0,1,1,0,0]), 172);
  assert.equal(toHex(172, 8), '0xAC');
  assert.equal(bitValue(signed, [1,1,0,1,1,0,0,0]), -40);
  assert.equal(bitValue(signed, [0,1,1,1,1,1,1,1]), 127);
  assert.equal(bitValue(signed, [1,0,0,0,0,0,0,0]), -128);
  assert.equal(evaluatePuzzle(signed, [1,1,0,1,1,0,0,0]).success, true);
  assert.match(evaluatePuzzle(signed, [0,0,1,0,1,0,0,0]).message, /two’s-complement/);
});

test('the sort puzzle keeps the original entries', () => {
  const sort = byId('restore-the-order');
  assert.equal(evaluatePuzzle(sort, sort.values).success, false);
  assert.equal(evaluatePuzzle(sort, [1,2,4,7,9]).success, true);
  assert.throws(() => evaluatePuzzle(sort, [1,2,3,4,5]), /original/);
});

test('the algorithm harness reports the first failing case with its inputs', () => {
  const level = {kind:'algo', fn:'double', cases:[{args:[2], expect:4}, {args:[3], expect:6}, {args:[0], expect:0}]};
  const passing = evaluateAlgorithm(level, 'function double(n) { return n * 2; }');
  assert.equal(passing.success, true);
  assert.equal(passing.cases.length, 3);
  assert.ok(passing.cases.every(result => result.operations > 0));
  const failing = evaluateAlgorithm(level, 'function double(n) { return n + 2; }');
  assert.equal(failing.success, false);
  assert.match(failing.error, /Case 2: double\(3\) returned 5, expected 6/);
  assert.match(evaluateAlgorithm(level, 'function double(n) { return').error, /ends where a value was expected|ends before/);
});

test('the harness isolates cases from one another and can check mutation', () => {
  const level = {kind:'algo', fn:'sortInPlace', cases:[
    {args:[[3,1,2]], expect:[1,2,3], expectArgs:[[1,2,3]]},
    {args:[[2,1]], expect:[1,2], expectArgs:[[1,2]]}
  ]};
  const source = 'function sortInPlace(values) {\n  for (let i = 0; i < values.length; i++) {\n    for (let j = 0; j < values.length - 1; j++) {\n      if (values[j] > values[j + 1]) {\n        let hold = values[j];\n        values[j] = values[j + 1];\n        values[j + 1] = hold;\n      }\n    }\n  }\n  return values;\n}';
  assert.equal(evaluateAlgorithm(level, source).success, true);
  const copy = 'function sortInPlace(values) {\n  let out = [];\n  for (let i = 0; i < values.length; i++) {\n    out.push(values[i]);\n  }\n  return out;\n}';
  assert.equal(evaluateAlgorithm(level, copy).success, false, 'a copy that is not sorted must not pass');
  // The mission data is not modified by running a player's program against it.
  assert.deepEqual(level.cases[0].args, [[3,1,2]]);
});

test('value comparison treats arrays and near-equal floats the way the missions need', () => {
  assert.equal(sameValue([1,[2,3]], [1,[2,3]]), true);
  assert.equal(sameValue([1,2], [1,2,3]), false);
  assert.equal(sameValue(0.1 + 0.2, 0.3), true);
  assert.equal(sameValue(1, '1'), false);
  assert.equal(sameValue(true, 1), false);
});

test('directions stay in clockwise order, which the scene and the sim both rely on', () => {
  assert.deepEqual(directions, [[1,0],[0,1],[-1,0],[0,-1]]);
  const turned = simulate(room, 'turnRight();turnRight();turnRight();turnRight();');
  assert.equal(turned.state.dir, 0);
});
