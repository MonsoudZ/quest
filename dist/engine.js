// Mission evaluators. Every judgement a mission can make about a player's work
// lives here so it can be tested without a browser: the grid simulation, the
// data puzzles, the graph router, and the algorithm test harness.
import {compile as build, execute, describe, QuestError} from './lang.js';

export {QuestError, describe};

// Three mission kinds share the function console and this evaluator. They differ
// in what the player is handed: 'algo' a blank function, 'debug' a program that
// runs but answers wrongly, 'refactor' a program that answers correctly and
// breaks a shape rule.
export const algoKinds = new Set(['algo', 'debug', 'refactor', 'spec']);
// The grid missions and the four function-console kinds together: every
// mission the player answers by writing a program rather than by setting dials.
export const isCoding = level => level.kind === 'code' || algoKinds.has(level.kind);
export const directions = [[1,0],[0,1],[-1,0],[0,-1]];
export const gridCommands = ['move','turnLeft','turnRight','canMove','print'];
const gridLimits = {operations:4000, callDepth:48, arrayLength:256, cells:2000};
const maxSteps = 400;

// Kept for the grid missions and for tests that check a program is rejected
// before it runs. Coding missions compile against the grid command set.
export function compile(source, options = {}) {
  return build(source, {commands:gridCommands, ...options});
}

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(item => walk(item, visit)); return; }
  visit(node);
  for (const value of Object.values(node)) if (value && typeof value === 'object') walk(value, visit);
};

function callSites(ast, name) {
  let count = 0;
  walk(ast, node => { if (node.type === 'call' && node.callee?.type === 'name' && node.callee.name === name) count++; });
  return count;
}
function declaredFunctions(ast) {
  const names = [];
  walk(ast, node => { if (node.type === 'function') names.push(node.name); });
  return names;
}

// Each mission may insist the player actually uses the concept it teaches,
// not just that the drone lands on the power cell.
const requirements = {
  loop:{
    met:stats => stats.loopMoves > 0,
    message:'You reached the cell. Now put the movement inside a for loop to finish the loop lesson.'
  },
  while:{
    met:stats => stats.whileMoves > 0,
    message:'You reached the cell. Use a while loop, which repeats for as long as its condition holds, to finish this lesson.'
  },
  variable:{
    met:stats => [...stats.variableMoves.values()].some(count => count >= 2),
    message:'You reached the cell. Reuse the same named distance in both move calls to finish the variable lesson.'
  },
  conditional:{
    met:stats => stats.conditionalMoves > 0,
    message:'You reached the cell. Use if (canMove()) to decide when to move and finish this lesson.'
  },
  function:{
    met:(stats, ast) => stats.functionMoves > 0 && declaredFunctions(ast).some(name => callSites(ast, name) >= 2),
    message:'You reached the cell. Declare one function that moves the drone and call it at least twice to finish this lesson.'
  }
};

export function simulate(level, source) {
  const ast = compile(source);
  const steps = [];
  const stats = {loopMoves:0, whileMoves:0, conditionalMoves:0, functionMoves:0, variableMoves:new Map()};
  const allowed = new Set(level.tiles.map(tile => tile.join(',')));
  let state = {x:level.start[0], y:level.start[1], dir:level.start[2]};
  let error = null;

  const clear = () => {
    const [dx, dy] = directions[state.dir];
    return allowed.has(`${state.x + dx},${state.y + dy}`);
  };
  const record = (line, label, problem = null) => {
    if (steps.length >= maxSteps) throw new QuestError(`Your program ran too long: more than ${maxSteps} drone actions. Look for a loop that repeats more than it needs to.`, line);
    steps.push({...state, line, label, error:problem});
  };
  const stopped = Symbol('stopped');

  const natives = {
    canMove:(args, context) => {
      if (args.length) throw new QuestError('canMove() takes no arguments.', context.line);
      return clear();
    },
    turnLeft:(args, context) => { state = {...state, dir:(state.dir + 3) % 4}; record(context.line, 'Turned left'); },
    turnRight:(args, context) => { state = {...state, dir:(state.dir + 1) % 4}; record(context.line, 'Turned right'); },
    move:(args, context) => {
      const count = args.length ? args[0] : 1;
      if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 100) {
        throw new QuestError(`move() takes a whole number of tiles from 0 to 100, not ${describe(count)}.`, context.line);
      }
      const named = context.argNodes?.[0];
      if (count > 0 && named?.type === 'name') stats.variableMoves.set(named.name, (stats.variableMoves.get(named.name) || 0) + 1);
      for (let step = 0; step < count; step++) {
        if (!clear()) {
          record(context.line, 'Movement stopped', 'There is no traversable tile ahead. Turn before moving, or check canMove() first.');
          throw stopped;
        }
        const [dx, dy] = directions[state.dir];
        state = {...state, x:state.x + dx, y:state.y + dy};
        if (context.loopDepth) stats.loopMoves++;
        if (context.whileDepth) stats.whileMoves++;
        if (context.conditionDepth) stats.conditionalMoves++;
        if (context.callDepth) stats.functionMoves++;
        record(context.line, 'Moved forward');
      }
    }
  };

  let output = [];
  try {
    output = execute(ast, {natives, limits:gridLimits}).output;
  } catch (thrown) {
    if (thrown !== stopped) throw thrown;
    error = steps.at(-1).error;
  }

  const reached = state.x === level.goal[0] && state.y === level.goal[1];
  if (reached && !error && level.require) {
    const rule = requirements[level.require];
    if (rule && !rule.met(stats, ast)) error = rule.message;
  }
  return {steps, state, output, success:!error && reached, error, stats};
}

// --------------------------------------------------------- data puzzles

const placeValues = width => Array.from({length:width}, (_, i) => 2 ** (width - 1 - i));
export const bitSpec = level => ({width:level.bits?.width ?? 4, encoding:level.bits?.encoding ?? 'unsigned'});
export function bitValue(level, bits) {
  const {width, encoding} = bitSpec(level);
  const places = placeValues(width);
  const magnitude = bits.reduce((total, bit, i) => total + bit * places[i], 0);
  return encoding === 'twos' && bits[0] ? magnitude - 2 ** width : magnitude;
}
export const toHex = (value, width) => `0x${((value + (value < 0 ? 2 ** width : 0)) >>> 0).toString(16).toUpperCase().padStart(width / 4, '0')}`;

export function evaluatePuzzle(level, values) {
  if (level.kind === 'bits') {
    const {width, encoding:mode} = bitSpec(level);
    if (!Array.isArray(values) || values.length !== width || values.some(bit => bit !== 0 && bit !== 1)) throw new QuestError(`Use exactly ${width} bits, each 0 or 1.`);
    const total = bitValue(level, values);
    const encoding = mode === 'twos' ? ' as a two’s-complement integer' : '';
    return {
      success:total === level.target,
      value:total,
      message:total === level.target
        ? `${values.join('')}₂ = ${total}${encoding}. Access code accepted.`
        : `Your bits encode ${total}${encoding}. Adjust the switches to encode ${level.target}.`
    };
  }
  if (level.kind === 'sort') {
    const sorted = list => [...list].sort((a, b) => a - b);
    if (!Array.isArray(values) || JSON.stringify(sorted(values)) !== JSON.stringify(sorted(level.values))) throw new QuestError('Keep all of the original array entries.');
    const ordered = values.every((value, i) => i === 0 || values[i - 1] <= value);
    return {
      success:ordered,
      message:ordered
        ? 'Every entry is at least as large as the one before it. Archive index restored.'
        : 'Some adjacent entries are still out of order. Look for a larger value to the left of a smaller one.'
    };
  }
  throw new QuestError('Unknown puzzle.');
}

// ------------------------------------------------------------- graphs

export function evaluateNetwork(level, selected) {
  if (!Array.isArray(selected) || selected.some(index => !Number.isInteger(index) || !level.edges[index])) throw new QuestError('Choose valid links.');
  const active = new Set(selected);
  const distance = new Map([[level.source, 0]]);
  const previous = new Map();
  const pending = new Set(level.nodes.map(node => node[0]));
  while (pending.size) {
    const node = [...pending].reduce((best, candidate) => (distance.get(candidate) ?? Infinity) < (distance.get(best) ?? Infinity) ? candidate : best);
    if (!Number.isFinite(distance.get(node))) break;
    pending.delete(node);
    if (node === level.target) break;
    for (const index of active) {
      const [a, b, weight] = level.edges[index];
      const neighbour = a === node ? b : b === node ? a : null;
      if (!neighbour || !pending.has(neighbour)) continue;
      const candidate = distance.get(node) + (level.budget ? weight : 1);
      if (candidate < (distance.get(neighbour) ?? Infinity)) {
        distance.set(neighbour, candidate);
        previous.set(neighbour, {node, index});
      }
    }
  }
  if (!distance.has(level.target)) return {success:false, path:[], pathEdges:[], cost:null, hops:null, message:'The signal cannot reach the archive. Enable a continuous path from uplink to archive.'};
  const path = [level.target];
  const pathEdges = [];
  let cursor = level.target;
  while (cursor !== level.source) {
    const step = previous.get(cursor);
    pathEdges.unshift(step.index);
    path.unshift(step.node);
    cursor = step.node;
  }
  const cost = pathEdges.reduce((total, index) => total + level.edges[index][2], 0);
  const result = {path, pathEdges, cost, hops:pathEdges.length};
  if (level.maxEdges && result.hops > level.maxEdges) return {...result, success:false, message:`The shortest enabled route has ${result.hops} hops. Find one with at most ${level.maxEdges}.`};
  if (level.budget && cost > level.budget) return {...result, success:false, message:`The fastest enabled route takes ${cost} ms. Find one at or below ${level.budget} ms. Fewer hops can still take longer.`};
  return {...result, success:true, message:`Signal delivered in ${result.hops} hops${level.budget ? ` with ${cost} ms of modelled path latency` : ''}. Only the links used by this route count.`};
}

// --------------------------------------------------- algorithm missions

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value);
export const sameValue = (a, b) => {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  // Two records match when they carry the same fields, whatever order they were
  // written in: a mission asks for the right data, not the right typing order.
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameValue(a[key], b[key]));
  }
  if (Array.isArray(a) !== Array.isArray(b) || isRecord(a) !== isRecord(b)) return false;
  if (typeof a === 'number' && typeof b === 'number') return Number.isInteger(a) && Number.isInteger(b) ? a === b : Math.abs(a - b) < 1e-9;
  return a === b;
};
const clone = value => Array.isArray(value) ? value.map(clone)
  : isRecord(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]))
  : value;


// A refactor mission judges the shape of the answer as well as its values. The
// rules count nodes in the player's own function, so a correct-but-sprawling
// program is rejected with the reason rather than with a failing case. A report
// names the rule that fired as well as saying it in words, because the console
// asks the player to predict which rule it will be.
const loopNodes = ['for', 'while'];
function shapeReport(ast, level) {
  const target = [];
  walk(ast, node => { if (node.type === 'function' && node.name === level.fn) target.push(node); });
  const body = target[0]?.body;
  if (!body) return null;
  const shape = level.shape ?? {};

  let loops = 0;
  walk(body, node => { if (loopNodes.includes(node.type)) loops++; });
  if (shape.maxLoops !== undefined && loops > shape.maxLoops) {
    return shape.maxLoops === 1
      ? {rule:'maxLoops', message:`${level.fn}() answers every case, but it walks the data ${loops} times. This mission asks for one pass: one loop in the whole function.`}
      : {rule:'maxLoops', message:`${level.fn}() answers every case, but it contains ${loops} loops and this mission allows ${shape.maxLoops}.`};
  }

  if (shape.maxLoopDepth !== undefined) {
    const deepest = (node, depth = 0) => {
      if (!node || typeof node !== 'object') return depth;
      if (Array.isArray(node)) return Math.max(depth, ...node.map(item => deepest(item, depth)));
      const here = loopNodes.includes(node.type) ? depth + 1 : depth;
      return Math.max(here, ...Object.values(node).filter(value => value && typeof value === 'object').map(value => deepest(value, here)));
    };
    const depth = deepest(body);
    if (depth > shape.maxLoopDepth) {
      return {rule:'maxLoopDepth', message:`${level.fn}() answers every case, but it nests loops ${depth} deep. This mission allows ${shape.maxLoopDepth}, so the work has to be arranged differently.`};
    }
  }

  if (shape.forbid) {
    for (const name of shape.forbid) {
      if (callSites(body, name)) return {rule:'forbid', message:`${level.fn}() answers every case, but this mission asks you not to call ${name}().`};
    }
  }

  if (shape.requireCalls) {
    for (const name of shape.requireCalls) {
      if (!callSites(body, name)) return {rule:'requireCalls', message:`${level.fn}() answers every case, but this mission asks it to call ${name}().`};
    }
  }

  if (shape.maxStatements !== undefined) {
    let statements = 0;
    walk(body, node => { if (['let', 'expression', 'if', 'for', 'while', 'return'].includes(node.type)) statements++; });
    if (statements > shape.maxStatements) {
      return {rule:'maxStatements', message:`${level.fn}() answers every case in ${statements} statements, and this mission allows ${shape.maxStatements}.`};
    }
  }
  return null;
}


// A spec mission turns the console around: the player writes the test cases and
// the mission supplies the implementations. Their suite has to agree with a
// correct one and reject every broken one, which is the whole skill — a test
// that passes against everything tests nothing.
export function evaluateSpec(level, source) {
  const limits = {...(level.limits ?? {}), operations:level.limits?.operations ?? 200000};
  let suite;
  try {
    suite = execute(build(source, {commands:['print']}), {limits});
  } catch (thrown) {
    if (!(thrown instanceof QuestError)) throw thrown;
    return {success:false, error:thrown.message, line:thrown.line, cases:[], mutants:[], output:[]};
  }
  if (!suite.has(level.fn)) {
    return {success:false, error:`This mission needs a function named ${level.fn}() that returns your test cases.`, cases:[], mutants:[], output:[]};
  }

  let written;
  try {
    written = suite.call(level.fn, []).value;
  } catch (thrown) {
    if (!(thrown instanceof QuestError)) throw thrown;
    return {success:false, error:`${level.fn}() stopped with an error: ${thrown.message}`, line:thrown.line, cases:[], mutants:[], output:suite.output};
  }
  if (!Array.isArray(written)) {
    return {success:false, error:`${level.fn}() has to return an array of cases, and it returned ${describe(written)}.`, cases:[], mutants:[], output:suite.output};
  }
  if (!written.length) {
    return {success:false, error:`${level.fn}() returned no cases. A suite that tests nothing passes everything.`, cases:[], mutants:[], output:suite.output};
  }
  if (written.length > 40) {
    return {success:false, error:`${written.length} cases is more than this console runs. A good suite is small and pointed.`, cases:[], mutants:[], output:suite.output};
  }

  const parameters = level.subject.parameters;
  for (const [index, entry] of written.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !Array.isArray(entry.args) || !('expect' in entry)) {
      return {success:false, error:`Case ${index + 1} is not shaped like a case. Each one is a record: {args: [...], expect: ...}.`, cases:[], mutants:[], output:suite.output};
    }
    if (entry.args.length !== parameters) {
      return {success:false, error:`Case ${index + 1} passes ${entry.args.length} argument${entry.args.length === 1 ? '' : 's'} and ${level.subject.name}() takes ${parameters}.`, cases:[], mutants:[], output:suite.output};
    }
  }

  // Each implementation is the mission's own code, run through the same sandbox.
  const against = (code, label) => {
    const program = execute(build(code, {commands:['print']}), {limits});
    return written.map((entry, index) => {
      const args = clone(entry.args);
      try {
        const {value} = program.call(level.subject.name, args);
        return {index, value, agrees:sameValue(value, entry.expect), error:null};
      } catch (thrown) {
        if (!(thrown instanceof QuestError)) throw thrown;
        return {index, value:null, agrees:false, error:`${label}: ${thrown.message}`};
      }
    });
  };

  const correct = against(level.correct, 'the correct version');
  const wrongExpectation = correct.find(result => !result.agrees);
  if (wrongExpectation) {
    const entry = written[wrongExpectation.index];
    return {
      success:false, cases:written, mutants:[], output:suite.output,
      error:wrongExpectation.error
        ? `Case ${wrongExpectation.index + 1} cannot run: ${wrongExpectation.error}`
        : `Case ${wrongExpectation.index + 1} expects ${describe(entry.expect)} from ${level.subject.name}(${entry.args.map(describe).join(', ')}), and a correct implementation returns ${describe(wrongExpectation.value)}. A test is only worth having if its expectation is right.`
    };
  }

  const mutants = level.mutants.map(mutant => {
    const results = against(mutant.code, mutant.name);
    const caught = results.filter(result => !result.agrees).map(result => result.index + 1);
    return {name:mutant.name, why:mutant.why, caught:caught.length > 0, by:caught};
  });
  const missed = mutants.filter(mutant => !mutant.caught);
  if (missed.length) {
    return {
      success:false, cases:written, mutants, output:suite.output,
      error:`Every expectation is right, and ${missed.length} of the ${mutants.length} broken versions still passes: ${missed.map(mutant => `“${mutant.name}”`).join(', ')}. ${missed[0].why}`
    };
  }
  if (level.minimumCases && written.length < level.minimumCases) {
    return {success:false, cases:written, mutants, output:suite.output,
      error:`Your suite catches all of them with ${written.length} case${written.length === 1 ? '' : 's'}, but this mission asks for at least ${level.minimumCases} so the next mistake is caught too.`};
  }
  return {
    success:true, cases:written, mutants, output:suite.output,
    error:null,
    message:`${written.length} cases, every expectation right, and all ${mutants.length} broken versions rejected.`
  };
}

// Runs a player's function against the mission's cases. `gate` cases also cap
// the number of interpreter operations, which is how a mission can insist on a
// logarithmic or linear algorithm instead of a brute-force scan.
export function evaluateAlgorithm(level, source) {
  const limits = {...(level.limits ?? {}), operations:level.limits?.operations ?? 200000};
  let program, ast;
  try {
    ast = build(source, {commands:['print']});
    if (level.requireRecursion) {
      const declaration = [];
      walk(ast, node => { if (node.type === 'function' && node.name === level.fn) declaration.push(node); });
      if (declaration.length && !callSites(declaration[0].body, level.fn)) {
        return {success:false, error:`${level.fn}() works, but this mission is about recursion: ${level.fn}() has to call itself on a smaller problem.`, cases:[], output:[]};
      }
    }
    program = execute(ast, {limits});
  } catch (thrown) {
    if (!(thrown instanceof QuestError)) throw thrown;
    return {success:false, error:thrown.message, line:thrown.line, cases:[], output:[]};
  }
  if (!program.has(level.fn)) {
    return {success:false, error:`This mission needs a function named ${level.fn}(). Your program declares ${program.functionNames().length ? program.functionNames().map(name => `${name}()`).join(', ') : 'no functions'}.`, cases:[], output:[]};
  }
  const expected = level.cases[0]?.args.length ?? 0;
  if (program.parameterCount(level.fn) !== expected) {
    return {success:false, error:`${level.fn}() should take ${expected} parameter${expected === 1 ? '' : 's'}; yours takes ${program.parameterCount(level.fn)}.`, cases:[], output:[]};
  }

  const results = [];
  for (const testCase of level.cases) {
    const args = clone(testCase.args);
    const before = program.output.length;
    try {
      const {value, operations} = program.call(level.fn, args);
      const passed = sameValue(value, testCase.expect) && (!testCase.expectArgs || sameValue(args, testCase.expectArgs));
      results.push({
        args:testCase.args, expect:testCase.expect, actual:value, operations, passed,
        note:testCase.note ?? null,
        mutated:testCase.expectArgs ? args : null,
        overGate:testCase.maxOperations ? operations > testCase.maxOperations : false,
        maxOperations:testCase.maxOperations ?? null,
        output:program.output.slice(before)
      });
    } catch (thrown) {
      if (!(thrown instanceof QuestError)) throw thrown;
      results.push({args:testCase.args, expect:testCase.expect, actual:null, operations:null, passed:false, error:thrown.message, line:thrown.line, output:program.output.slice(before)});
    }
  }

  const wrong = results.find(result => !result.passed);
  const gated = results.find(result => result.passed && result.overGate);
  const misshapen = !wrong && !gated && level.shape ? shapeReport(ast, level) : null;
  const success = !wrong && !gated && !misshapen;
  return {
    success,
    cases:results,
    output:program.output,
    operations:results.reduce((total, result) => total + (result.operations ?? 0), 0),
    shape:misshapen?.message ?? null,
    shapeRule:misshapen?.rule ?? null,
    error:success ? null : misshapen ? misshapen : gated
      ? `${level.fn}() returns the right answers, but case ${results.indexOf(gated) + 1} used ${gated.operations.toLocaleString('en-US')} steps and this mission allows ${gated.maxOperations.toLocaleString('en-US')}. ${level.gateHint ?? 'A faster algorithm does less work per input.'}`
      : wrong.error
        ? `Case ${results.indexOf(wrong) + 1} stopped with an error: ${wrong.error}`
        : wrong.mutated && sameValue(wrong.actual, wrong.expect)
        ? `Case ${results.indexOf(wrong) + 1} returns the right answer and changes what it was given: ${level.fn}(${wrong.args.map(describe).join(', ')}) left it as ${wrong.mutated.map(describe).join(', ')}. An array is passed by reference, so writing into it writes into the caller's copy.`
        : `Case ${results.indexOf(wrong) + 1}: ${level.fn}(${wrong.args.map(describe).join(', ')}) returned ${describe(wrong.actual)}, expected ${describe(wrong.expect)}.`
  };
}
