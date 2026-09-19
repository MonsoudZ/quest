import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {compile, execute, parse, tokenize, QuestError} from '../dist/lang.js';

// Every program below is a fixed string in this file. The sandbox never runs
// user code natively; runInNewContext is only the reference implementation the
// interpreter is compared against.
function reference(source) {
  const output = [];
  runInNewContext(`"use strict";\n${source}`, {print:(...args) => output.push(args.map(format).join(' '))}, {timeout:1000});
  return output;
}
function format(value) {
  if (Array.isArray(value)) return `[${value.map(format).join(', ')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).map(([key, item]) => `${key}: ${format(item)}`).join(', ')}}`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && !Number.isInteger(value)) return String(Number(value.toFixed(6)));
  return String(value);
}
const sandbox = source => execute(compile(source)).output;

const agreeing = [
  'print(2 + 3 * 4, (2 + 3) * 4, 7 % 4, 10 / 4, -3 + 1);',
  'print(1 < 2, 2 <= 2, "a" < "b", 3 === 3, 3 !== 4, 1 == 1, 2 != 3);',
  'print(true && false, true || false, !true, 0 || 5, 1 && 2);',
  'let done = false; let count = 0; print(done || count === 0, !done && count < 1);',
  'print("signal" + " " + "quest", "n=" + 4, "ab".length, "abc".slice(1));',
  'let values = [3, 1, 2]; print(values.length, values[0], values.indexOf(2), values.join("-"));',
  'let values = [1, 2, 3]; values.push(4); print(values, values.pop(), values, values.slice(1, 3));',
  'let grid = [[1, 2], [3, 4]]; print(grid[1][0], grid.length, grid[0].length);',
  'let total = 0; for (let i = 0; i < 5; i++) { total += i; } print(total);',
  'let total = 1; let i = 0; while (i < 5) { i++; total *= 2; } print(total, i);',
  'let seen = []; for (let i = 0; i < 6; i++) { if (i % 2 === 0) { continue; } if (i > 4) { break; } seen.push(i); } print(seen);',
  'function double(n) { return n * 2; } print(double(4), double(double(3)));',
  'function add(a, b) { return a + b; } print(add(1, 2), add("a", "b"));',
  'function fib(n) { if (n < 2) { return n; } return fib(n - 1) + fib(n - 2); } print(fib(0), fib(1), fib(10));',
  'function gcd(a, b) { if (b === 0) { return a; } return gcd(b, a % b); } print(gcd(1071, 462), gcd(270, 192));',
  'function fill(n) { let out = []; for (let i = 0; i < n; i++) { out.push(i * i); } return out; } print(fill(5));',
  'function nothing() { let x = 1; } print(nothing());',
  'let n = 2; if (n > 1) { let n = 10; print(n); } print(n);',
  'let n = 1; for (let i = 0; i < 3; i++) { let n = i; print(n); } print(n);',
  'let outer = 5; function read() { return outer + 1; } print(read());',
  'let values = [5, 3, 1]; function sortInPlace(items) { for (let i = 0; i < items.length; i++) { for (let j = 0; j < items.length - 1; j++) { if (items[j] > items[j + 1]) { let hold = items[j]; items[j] = items[j + 1]; items[j + 1] = hold; } } } return items; } print(sortInPlace(values), values);',
  'print(Math.floor(7 / 2), Math.ceil(1.2), Math.abs(-4), Math.min(3, 1, 2), Math.max(3, 1), Math.round(2.5), Math.sqrt(16), Math.pow(2, 10));',
  'let i = 0; let a = i++; let b = ++i; print(a, b, i);',
  'let values = [1, 2]; values[0] += 5; values[1]++; print(values);',
  'let total = 10; total -= 3; total *= 2; total /= 7; total %= 1; print(total);',
  'let flag = 3 > 2 === true; print(flag);',
  'function classify(n) { if (n < 0) { return "low"; } else if (n === 0) { return "zero"; } else { return "high"; } } print(classify(-1), classify(0), classify(4));',
  'let text = ""; for (let i = 0; i < 3; i++) { text = text + i; } print(text, text.length);',
  'function countdown(n) { if (n === 0) { return []; } let rest = countdown(n - 1); rest.push(n); return rest; } print(countdown(4));',
  'let site = {name: "labs", demand: 500}; print(site.name, site.demand, site);',
  'let site = {name: "labs"}; site.name = "depot"; print(site.name, site);',
  'let counts = {hits: 1}; counts.hits += 4; counts.hits++; print(counts.hits);',
  'let site = {}; site.tier = "edge"; print(site, Object.keys(site), Object.values(site));',
  'let site = {a: 1, b: 2}; print(Object.keys(site), Object.values(site), Object.keys(site).length);',
  'let nested = {link: {bandwidth: 100, up: true}}; print(nested.link.bandwidth, nested.link.up, nested);',
  'let site = {ports: [1, 2]}; site.ports.push(3); print(site.ports, site.ports.length, site);',
  'function make(n) { return {id: n, twice: n * 2}; } let r = make(4); print(r.id, r.twice, r);',
  'let rows = [{n: "a", v: 1}, {n: "b", v: 2}]; let out = []; for (let i = 0; i < rows.length; i++) { out.push(rows[i].n + "=" + rows[i].v); } print(out.join(","));',
  'let site = {load: 0}; for (let i = 0; i < 4; i++) { site.load += i; } print(site.load);',
  'let a = {n: 1}; let b = a; b.n = 9; print(a.n, a === b, a === {n: 1});',
  'let site = {a: 1}; print(site["a"], site["a"] + 1); site["a"] = 7; print(site.a);',
  'function busiest(sites) { let best = sites[0]; for (let i = 1; i < sites.length; i++) { if (sites[i].load > best.load) { best = sites[i]; } } return best; } print(busiest([{id: 1, load: 3}, {id: 2, load: 9}, {id: 3, load: 4}]));'
];

test('the interpreter agrees with real JavaScript on every supported feature', () => {
  for (const source of agreeing) assert.deepEqual(sandbox(source), reference(source), source);
});

test('scope errors, temporal dead zones, and duplicate declarations are rejected exactly as JavaScript rejects them', () => {
  for (const source of [
    'if (true) { let n = 2; } print(n);',
    'let n = 2; if (true) { let n = n; print(n); }',
    'print(n); let n = 2;',
    'for (let i = 0; i < 1; i++) { print(i); } print(i);',
    'let n = 1; let n = 2;',
    'print(missing);',
    'return 1;',
    'break;',
    'while (true) { } continue;'
  ]) {
    assert.throws(() => sandbox(source), source);
    assert.throws(() => reference(source), source);
  }
});

test('unavailable names and unsupported JavaScript are refused before anything runs', () => {
  const refused = {
    'alert(1);': /not defined here/,
    'print(window.location);': /not defined here/,
    'print([].constructor);': /not available/,
    'let x = {a() { return 1; }};': /A record is written \{ field: value \}/,
    'let y = {a: 1}; let x = {...y};': /needs a name before its colon/,
    'let x = {a: 1}; for (let k in x) { print(k); }': /Give the variable a starting value/,
    'let x = {a: 1}; delete x.a;': /not part of this sandbox/,
    'let x = {a: 1}; print(Object.assign(x, x));': /Object.assign is not available/,
    'function f() { return 1; } function f() { return 2; }': /already declared/,
    'class Ship {}': /not part of this sandbox/,
    'var n = 1;': /not part of this sandbox/,
    'const n = 1;': /not part of this sandbox/,
    'try { } catch (e) { }': /not part of this sandbox/,
    'let f = function () { return 1; };': /cannot be used as a value/,
    'let f = (n) => n;': /Unexpected/,
    'print(1);;': /Unexpected/,
    'print(1)': /ends before its “;”/,
    'let n = 1': /ends before its “;”/,
    'print("unterminated);': /does not understand the character/,
    'print(2 ** 3);': /Unexpected/,
    'print(Math.constructor);': /Math.constructor is not available/,
    'print(Math.floor.name);': /Only records, arrays, strings, Math and Object/,
    'print(eval("1"));': /cannot be used as a value/,
    'let Math = 1;': /provided by the mission/,
    'print = 1;': /belongs to the mission/
  };
  for (const [source, expected] of Object.entries(refused)) assert.throws(() => sandbox(source), expected, source);
});

test('type mistakes are reported instead of silently producing NaN', () => {
  for (const [source, expected] of Object.entries({
    'print("a" - 1);': /needs numbers on both sides/,
    'print(1 / 0);': /Dividing by zero/,
    'print([1] + [2]);': /cannot be joined with \+/,
    'print(1 < "a");': /Compare two numbers or two strings/,
    'print((1).length);': /Only records, arrays, strings, Math and Object/,
    'let values = [1]; print(values[0.5]);': /whole numbers/,
    'let n = 1; n();': /is not a function/,
    'let s = "ab"; s[0] = "c";': /cannot be changed in place/
  })) assert.throws(() => sandbox(source), expected, source);
});

test('the sandbox is deliberately stricter than JavaScript where silence would mislead a learner', () => {
  // Each of these is legal JavaScript that produces a confusing value instead of
  // an explanation. The sandbox reports the mistake; the README says so too.
  for (const [source, expected] of Object.entries({
    'let values = [1]; print(values[3]);': /outside \[1\], which has 1 entries/,
    'print(1 / 0);': /Dividing by zero/,
    'print("3" * "4");': /needs numbers on both sides/,
    'let values = [1]; values[5] = 2; print(values);': /Assign inside the array, or append with push/,
    'let n = 1; n = "text"; print(n * 2);': /needs numbers on both sides/
  })) {
    assert.throws(() => sandbox(source), expected, source);
    assert.doesNotThrow(() => reference(source), source);
  }
});

test('runaway programs stop within their operation, depth, and allocation budgets', () => {
  assert.throws(() => sandbox('while (true) { let n = 1; }'), /ran too long/);
  assert.throws(() => sandbox('for (let i = 0; i < 100; i++) { for (let j = 0; j < 100000; j++) { let n = j; } }'), /ran too long/);
  assert.throws(() => sandbox('function forever(n) { return forever(n + 1); } print(forever(0));'), /Too many nested calls/);
  assert.throws(() => sandbox('let values = []; for (let i = 0; i < 5000; i++) { values.push(i); } print(values.length);'), /at most 4,096 entries/);
  assert.throws(() => execute(compile('while (true) { let n = 1; }'), {limits:{operations:50}}), /more than 50 steps/);
  assert.throws(() => sandbox('function deep(n) { if (n === 0) { return 0; } return deep(n - 1); } print(deep(200));'), /base case/);
  assert.equal(execute(compile('function deep(n) { if (n === 0) { return 0; } return deep(n - 1); } print(deep(50));')).output[0], '0');
});

test('source length, character set, and nesting are bounded at tokenize time', () => {
  assert.throws(() => tokenize('x'.repeat(12001)), /under 12,000 characters/);
  assert.throws(() => tokenize('let n = 1 @ 2;'), /does not understand the character “@”/);
  assert.throws(() => parse('if (true) { '.repeat(30) + '}'.repeat(30)), /blocks or fewer/);
  assert.doesNotThrow(() => parse('if (true) { '.repeat(8) + '}'.repeat(8)));
  assert.ok(tokenize('// only a comment\n/* and a block */\n').length === 0);
});

test('errors carry the line that caused them', () => {
  let error = null;
  try { sandbox('let a = 1;\nlet b = 2;\nprint(c);'); } catch (thrown) { error = thrown; }
  assert.ok(error instanceof QuestError);
  assert.equal(error.line, 3);
  assert.match(error.message, /line 3/);
  try { error = null; sandbox('let values = [1];\nprint(values[4]);'); } catch (thrown) { error = thrown; }
  assert.equal(error.line, 2);
});

test('a mission can expose natives, and they see loop and condition context', () => {
  const seen = [];
  const program = execute(compile('for (let i = 0; i < 2; i++) { if (true) { ping(i); } } ping(9);', {commands:['ping']}), {
    natives:{ping:(args, context) => { seen.push({value:args[0], loops:context.loopDepth, conditions:context.conditionDepth}); return args[0]; }}
  });
  assert.deepEqual(seen, [
    {value:0, loops:1, conditions:1},
    {value:1, loops:1, conditions:1},
    {value:9, loops:0, conditions:0}
  ]);
  assert.equal(program.operations > 0, true);
  assert.throws(() => execute(compile('ping(1);', {commands:['ping']}), {natives:{}}), /not a function|not defined/);
});

test('declared functions can be called from the host with JavaScript values', () => {
  const program = execute(compile('function longest(words) { let best = ""; for (let i = 0; i < words.length; i++) { if (words[i].length > best.length) { best = words[i]; } } return best; }'));
  assert.deepEqual(program.functionNames(), ['longest']);
  assert.equal(program.parameterCount('longest'), 1);
  assert.equal(program.call('longest', [['a', 'abc', 'ab']]).value, 'abc');
  assert.ok(program.call('longest', [['a']]).operations > 0);
  assert.throws(() => program.call('missing'), /does not declare a function named missing/);
});

test('operation counts grow with the algorithm, which is what the complexity gates measure', () => {
  const linear = execute(compile('function find(values, target) { for (let i = 0; i < values.length; i++) { if (values[i] === target) { return i; } } return -1; }'));
  const binary = execute(compile('function find(values, target) { let low = 0; let high = values.length - 1; while (low <= high) { let mid = Math.floor((low + high) / 2); if (values[mid] === target) { return mid; } if (values[mid] < target) { low = mid + 1; } else { high = mid - 1; } } return -1; }'));
  const sorted = Array.from({length:512}, (_, i) => i * 2);
  const linearCost = linear.call('find', [sorted, 1022]).operations;
  const binaryCost = binary.call('find', [sorted, 1022]).operations;
  assert.equal(linear.call('find', [sorted, 1022]).value, 511);
  assert.equal(binary.call('find', [sorted, 1022]).value, 511);
  assert.ok(binaryCost * 10 < linearCost, `${binaryCost} vs ${linearCost}`);
});

test('records carry named fields, and the mistakes JavaScript hides are reported', () => {
  // Everything below is legal JavaScript. Each line produces undefined, NaN, or a
  // silent prototype write there; the sandbox explains the mistake instead.
  for (const [source, expected] of Object.entries({
    'let site = {a: 1}; print(site.b);': /no field called “b”. It has a/,
    'let site = {}; print(site.b);': /no field called “b”. It has no fields/,
    'let site = {a: 1}; print(site["b"]);': /no field called “b”/,
    'let site = {a: 1}; print(site[0]);': /indexed by a field name, not by 0/,
    'let site = {a: 1}; print(site.__proto__);': /“__proto__” is not a field you can read/,
    'let site = {a: 1}; site.__proto__ = {};': /“__proto__” is not a field you can assign/,
    'let site = {a: 1}; print(site.constructor);': /“constructor” is not a field you can read/,
    'print({a: 1} + 1);': /Records cannot be joined with \+/,
    'print({a: 1} - 1);': /needs numbers on both sides/,
    'let n = 4; n.a = 2;': /Only a record\'s fields can be assigned to. 4 has none/,
    'let n = 4; n.a++;': /Only a record\'s fields can be changed/,
    'let site = {a: 1}; site.b += 1;': /no field called “b” to change/,
    'let site = {a: 1}; site.b++;': /no field called “b” to change/,
    'let site = {a: "x"}; site.a++;': /needs a number, not "x"/,
    'let site = {a: 1, a: 2};': /given twice in the same record/,
    'print(Object.keys(5));': /needs a record, not 5/,
    'print(Object.values([1]));': /needs a record, not \[1\]/
  })) assert.throws(() => sandbox(source), expected, source);

  // A record is a fixed-size container, not a growable one.
  const wide = `let site = {${Array.from({length:33}, (_, i) => `f${i}: ${i}`).join(', ')}};`;
  assert.throws(() => sandbox(wide), /32 fields or fewer/);
  assert.doesNotThrow(() => sandbox(wide.replace(', f32: 32', '')));

  // Records are references, and the host sees them as ordinary objects.
  const program = execute(compile('function tally(rows) { let out = {total: 0, count: 0}; for (let i = 0; i < rows.length; i++) { out.total += rows[i].load; out.count++; } return out; }'));
  const tallied = program.call('tally', [[{load:3}, {load:4}]]).value;
  assert.deepEqual({...tallied}, {total:7, count:2});
  // Records are built with a null prototype, so no program can reach Object.prototype through one.
  assert.equal(Object.getPrototypeOf(tallied), null);
});
