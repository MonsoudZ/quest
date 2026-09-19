// Signal Quest teaching language: a deliberately small subset of JavaScript.
//
// Programs typed into the editor are tokenized, parsed, statically checked, and
// then walked by the interpreter below. Nothing reaches eval or the Function
// constructor, property access is restricted to a whitelist, and operations,
// call depth, and array growth are all bounded, so an untrusted program from the
// editor cannot hang or escape the page.
//
// Supported: numbers, strings, booleans, arrays, let, assignment, arithmetic,
// comparison, logical operators, if/else, for, while, break, continue,
// function declarations with parameters and return (including recursion),
// array indexing and a whitelist of array members, and the Math functions
// listed in `mathMembers`. Not supported: objects, classes, closures as values,
// var/const, switch, try/catch, regular expressions, async, or any host API
// beyond the natives a mission supplies.

const keywords = new Set(['let','const','var','function','return','if','else','for','while','do','break','continue','true','false','null','undefined','new','class','this','typeof','instanceof','in','of','delete','void','switch','case','default','try','catch','finally','throw','yield','await','async','import','export','extends','super','static','debugger','with','enum','eval','arguments']);

export const defaultLimits = {operations:200000, depth:24, callDepth:96, arrayLength:4096, cells:40000, sourceLength:12000};

export class QuestError extends Error {
  constructor(message, line=null) {
    super(line ? `${message} (line ${line})` : message);
    this.name = 'QuestError';
    this.line = line;
  }
}
const fail = (message, line=null) => { throw new QuestError(message, line); };

const pattern = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|===|!==|<=|>=|==|!=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|"[^"\n]*"|'[^'\n]*'|[-+*/%!<>=(){}\[\];,.]/gy;

function classify(text) {
  if (/^\d/.test(text)) return 'number';
  if (/^["']/.test(text)) return 'string';
  if (/^[A-Za-z_]/.test(text)) return keywords.has(text) ? 'keyword' : 'name';
  return 'punct';
}

export function tokenize(source, maxLength = defaultLimits.sourceLength) {
  if (typeof source !== 'string') fail('Write your program as text.');
  if (source.length > maxLength) fail(`Keep your program under ${maxLength.toLocaleString('en-US')} characters.`);
  const tokens = [];
  let offset = 0, line = 1;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match) fail(`This sandbox does not understand the character “${source[offset]}”.`, line);
    const text = match[0];
    if (!/^\s/.test(text) && !text.startsWith('//') && !text.startsWith('/*')) tokens.push({text, line, kind:classify(text)});
    line += (text.match(/\n/g) || []).length;
    offset = pattern.lastIndex;
  }
  return tokens;
}

// ---------------------------------------------------------------- parser

const assignOps = new Set(['=','+=','-=','*=','/=','%=']);
const binaryLevels = [
  ['||'], ['&&'], ['===','!==','==','!='], ['<','>','<=','>='], ['+','-'], ['*','/','%']
];

export function parse(source, options = {}) {
  const tokens = tokenize(source, options.maxLength ?? defaultLimits.sourceLength);
  const maxDepth = options.maxDepth ?? defaultLimits.depth;
  let index = 0;
  const peek = (ahead = 0) => tokens[index + ahead];
  const text = (ahead = 0) => tokens[index + ahead]?.text;
  const at = value => text() === value;
  const lineOf = () => peek()?.line ?? tokens.at(-1)?.line ?? 1;
  const next = () => tokens[index++];
  function expect(value, note = '') {
    const token = tokens[index];
    if (!token) fail(`Your program ends before its “${value}”.${note ? ` ${note}` : ''}`, tokens.at(-1)?.line ?? 1);
    if (token.text !== value) fail(`Expected “${value}” but found “${token.text}”.${note ? ` ${note}` : ''}`, token.line);
    index++;
    return token;
  }
  function identifier() {
    const token = next();
    if (!token) fail('Your program ends where a name was expected.', tokens.at(-1)?.line ?? 1);
    if (token.kind === 'keyword') fail(`“${token.text}” is a JavaScript keyword, so it cannot be used as a name.`, token.line);
    if (token.kind !== 'name') fail(`Expected a name but found “${token.text}”.`, token.line);
    return token;
  }

  function block(depth) {
    if (depth > maxDepth) fail(`Keep nesting to ${maxDepth} blocks or fewer.`, lineOf());
    expect('{', 'Bodies in this sandbox are always wrapped in braces.');
    const body = [];
    while (index < tokens.length && !at('}')) body.push(statement(depth + 1));
    expect('}');
    return body;
  }

  function statement(depth) {
    const token = peek();
    if (!token) fail('Your program ends in the middle of a statement.', tokens.at(-1)?.line ?? 1);
    const line = token.line;
    if (token.text === '{') return {type:'block', body:block(depth), line};
    if (token.text === 'let') {
      next();
      const name = identifier();
      expect('=', 'Give the variable a starting value, like let total = 0;');
      const value = expression(depth);
      expect(';');
      return {type:'let', name:name.text, value, line};
    }
    if (token.text === 'function') {
      next();
      const name = identifier();
      expect('(');
      const params = [];
      while (!at(')')) {
        params.push(identifier().text);
        if (at(',')) next();
        else break;
      }
      expect(')');
      if (params.length > 8) fail('Keep functions to eight parameters or fewer.', line);
      if (new Set(params).size !== params.length) fail('Each parameter needs its own name.', line);
      return {type:'function', name:name.text, params, body:block(depth), line};
    }
    if (token.text === 'if') {
      next(); expect('(');
      const test = expression(depth);
      expect(')');
      const body = block(depth);
      let alternate = null;
      if (at('else')) {
        next();
        alternate = at('if') ? [statement(depth)] : block(depth);
      }
      return {type:'if', test, body, alternate, line};
    }
    if (token.text === 'while') {
      next(); expect('(');
      const test = expression(depth);
      expect(')');
      return {type:'while', test, body:block(depth), line};
    }
    if (token.text === 'for') {
      next(); expect('(');
      let init = null;
      if (!at(';')) {
        if (at('let')) init = statement(depth);
        else { init = {type:'expression', value:expression(depth), line}; expect(';'); }
      } else next();
      const test = at(';') ? null : expression(depth);
      expect(';');
      const update = at(')') ? null : expression(depth);
      expect(')');
      return {type:'for', init, test, update, body:block(depth), line};
    }
    if (token.text === 'return') {
      next();
      const value = at(';') ? null : expression(depth);
      expect(';');
      return {type:'return', value, line};
    }
    if (token.text === 'break' || token.text === 'continue') {
      next(); expect(';');
      return {type:token.text, line};
    }
    if (token.kind === 'keyword') fail(`“${token.text}” is not part of this sandbox. It supports let, function, return, if, else, for, while, break, and continue.`, line);
    const value = expression(depth);
    expect(';', 'Statements end with a semicolon here.');
    if (!['call','assign','update'].includes(value.type)) fail('This line computes a value but never uses it. Assign it to a variable or pass it to a command.', line);
    return {type:'expression', value, line};
  }

  function expression(depth) { return assignment(depth); }

  function assignment(depth) {
    const left = binary(depth, 0);
    if (assignOps.has(text())) {
      const operator = next();
      if (left.type !== 'name' && left.type !== 'index') fail('Assign to a variable or to an array slot.', operator.line);
      const value = assignment(depth);
      return {type:'assign', operator:operator.text, target:left, value, line:operator.line};
    }
    return left;
  }

  function binary(depth, level) {
    if (level >= binaryLevels.length) return unary(depth);
    let left = binary(depth, level + 1);
    while (binaryLevels[level].includes(text())) {
      const operator = next();
      const right = binary(depth, level + 1);
      const type = operator.text === '&&' || operator.text === '||' ? 'logical' : 'binary';
      left = {type, operator:operator.text, left, right, line:operator.line};
    }
    return left;
  }

  function unary(depth) {
    if (at('!') || at('-')) {
      const operator = next();
      return {type:'unary', operator:operator.text, argument:unary(depth), line:operator.line};
    }
    if (at('++') || at('--')) {
      const operator = next();
      const argument = unary(depth);
      if (argument.type !== 'name' && argument.type !== 'index') fail(`“${operator.text}” needs a variable to change.`, operator.line);
      return {type:'update', operator:operator.text, target:argument, prefix:true, line:operator.line};
    }
    return postfix(depth, primary(depth));
  }

  function postfix(depth, node) {
    for (;;) {
      if (at('(')) {
        const line = lineOf();
        next();
        const args = [];
        while (!at(')')) {
          args.push(expression(depth));
          if (at(',')) next();
          else break;
        }
        expect(')');
        if (args.length > 8) fail('Keep calls to eight arguments or fewer.', line);
        node = {type:'call', callee:node, args, line};
      } else if (at('[')) {
        const line = lineOf();
        next();
        const property = expression(depth);
        expect(']');
        node = {type:'index', object:node, property, line};
      } else if (at('.')) {
        const line = lineOf();
        next();
        const name = next();
        if (!name || (name.kind !== 'name' && name.kind !== 'keyword')) fail('Write a member name after the dot.', line);
        node = {type:'member', object:node, name:name.text, line};
      } else if (at('++') || at('--')) {
        const operator = next();
        if (node.type !== 'name' && node.type !== 'index') fail(`“${operator.text}” needs a variable to change.`, operator.line);
        node = {type:'update', operator:operator.text, target:node, prefix:false, line:operator.line};
      } else return node;
    }
  }

  function primary(depth) {
    const token = next();
    if (!token) fail('Your program ends where a value was expected.', tokens.at(-1)?.line ?? 1);
    if (token.kind === 'number') {
      const value = Number(token.text);
      if (!Number.isFinite(value)) fail(`“${token.text}” is not a number this sandbox can use.`, token.line);
      return {type:'number', value, line:token.line};
    }
    if (token.kind === 'string') return {type:'string', value:token.text.slice(1, -1), line:token.line};
    if (token.text === 'true' || token.text === 'false') return {type:'boolean', value:token.text === 'true', line:token.line};
    if (token.text === '(') {
      const value = expression(depth);
      expect(')');
      return value;
    }
    if (token.text === '[') {
      const items = [];
      while (!at(']')) {
        items.push(expression(depth));
        if (at(',')) next();
        else break;
      }
      expect(']');
      return {type:'array', items, line:token.line};
    }
    if (token.kind === 'name') return {type:'name', name:token.text, line:token.line};
    if (token.kind === 'keyword') fail(`“${token.text}” cannot be used as a value here.`, token.line);
    fail(`Unexpected “${token.text}”.`, token.line);
  }

  const body = [];
  while (index < tokens.length) body.push(statement(0));
  return body;
}

// ------------------------------------------------------- static checking

// Resolves every identifier before the program runs, so typos and unavailable
// commands are reported without executing anything.
export function check(ast, available = []) {
  const globals = new Set([...available, 'Math', 'print']);
  const commandList = available.length ? available.join(', ') : 'none in this mission';
  function declarations(body) {
    const names = new Map();
    for (const node of body) {
      if (node.type !== 'let' && node.type !== 'function') continue;
      if (names.has(node.name)) fail(`“${node.name}” is already declared in this block.`, node.line);
      if (globals.has(node.name)) fail(`“${node.name}” is provided by the mission, so choose another name.`, node.line);
      names.set(node.name, node.type);
    }
    return names;
  }
  function walkBody(body, scopes, context) {
    const scope = declarations(body);
    const inner = [...scopes, scope];
    for (const node of body) walk(node, inner, context);
  }
  const known = (name, scopes) => globals.has(name) || scopes.some(scope => scope.has(name));
  function walk(node, scopes, context) {
    switch (node.type) {
      case 'let': walk(node.value, scopes, context); return;
      case 'function':
        if (context.functionDepth > 4) fail('Keep function declarations four levels deep or fewer.', node.line);
        walkBody(node.body, [...scopes, new Map(node.params.map(p => [p, 'param']))], {...context, inFunction:true, inLoop:false, functionDepth:context.functionDepth + 1});
        return;
      case 'block': walkBody(node.body, scopes, context); return;
      case 'if':
        walk(node.test, scopes, context);
        walkBody(node.body, scopes, context);
        if (node.alternate) walkBody(node.alternate, scopes, context);
        return;
      case 'while':
        walk(node.test, scopes, context);
        walkBody(node.body, scopes, {...context, inLoop:true});
        return;
      case 'for': {
        const scope = new Map();
        if (node.init?.type === 'let') scope.set(node.init.name, 'let');
        const inner = [...scopes, scope];
        if (node.init) walk(node.init.type === 'let' ? node.init.value : node.init.value, inner, context);
        if (node.test) walk(node.test, inner, context);
        if (node.update) walk(node.update, inner, context);
        walkBody(node.body, inner, {...context, inLoop:true});
        return;
      }
      case 'return':
        if (!context.inFunction) fail('return only works inside a function.', node.line);
        if (node.value) walk(node.value, scopes, context);
        return;
      case 'break': case 'continue':
        if (!context.inLoop) fail(`${node.type} only works inside a for or while loop.`, node.line);
        return;
      case 'expression': walk(node.value, scopes, context); return;
      case 'name':
        if (!known(node.name, scopes)) fail(`“${node.name}” is not defined here. Declare it with let, or use one of this mission's commands: ${commandList}.`, node.line);
        return;
      case 'assign':
        walk(node.target, scopes, context);
        walk(node.value, scopes, context);
        if (node.target.type === 'name' && globals.has(node.target.name)) fail(`“${node.target.name}” belongs to the mission and cannot be reassigned.`, node.line);
        return;
      case 'update': walk(node.target, scopes, context); return;
      case 'binary': case 'logical': walk(node.left, scopes, context); walk(node.right, scopes, context); return;
      case 'unary': walk(node.argument, scopes, context); return;
      case 'call': walk(node.callee, scopes, context); node.args.forEach(a => walk(a, scopes, context)); return;
      case 'index': walk(node.object, scopes, context); walk(node.property, scopes, context); return;
      case 'member': walk(node.object, scopes, context); return;
      case 'array': node.items.forEach(a => walk(a, scopes, context)); return;
      default: return;
    }
  }
  walkBody(ast, [], {inFunction:false, inLoop:false, functionDepth:0});
  return ast;
}

export function compile(source, options = {}) {
  return check(parse(source, options), options.commands ?? Object.keys(options.natives ?? {}));
}

// ------------------------------------------------------------ interpreter

const mathMembers = {
  floor:Math.floor, ceil:Math.ceil, round:Math.round, abs:Math.abs, sqrt:Math.sqrt,
  min:Math.min, max:Math.max, pow:Math.pow, sign:Math.sign, trunc:Math.trunc, log2:Math.log2
};
const mathValue = {kind:'namespace', name:'Math', members:mathMembers};
const uninitialized = Symbol('uninitialized');
const arrayMethods = new Set(['push','pop','shift','unshift','indexOf','lastIndexOf','includes','slice','join','concat','reverse']);
const stringMethods = new Set(['charAt','indexOf','includes','slice','toUpperCase','toLowerCase','split','repeat','startsWith','endsWith']);

export function describe(value) {
  if (Array.isArray(value)) return `[${value.map(describe).join(', ')}]`;
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' && !Number.isInteger(value)) return String(Number(value.toFixed(6)));
  return String(value);
}

export function execute(ast, options = {}) {
  const limits = {...defaultLimits, ...options.limits};
  const natives = options.natives ?? {};
  const state = {operations:0, cells:0, callDepth:0, loopDepth:0, whileDepth:0, conditionDepth:0, output:[]};
  const budget = line => { if (++state.operations > limits.operations) fail(`Your program ran too long: more than ${limits.operations.toLocaleString('en-US')} steps. Look for a loop that never ends or repeats more than it needs to.`, line); };

  const scope = parent => ({parent, values:new Map()});
  const global = scope(null);
  for (const [name, fn] of Object.entries(natives)) global.values.set(name, {kind:'native', name, fn});
  global.values.set('Math', mathValue);
  if (!global.values.has('print')) global.values.set('print', {kind:'native', name:'print', fn:args => {
    if (state.output.length < 200) state.output.push(args.map(describe).join(' '));
    return undefined;
  }});

  function lookup(name, env, line) {
    for (let cursor = env; cursor; cursor = cursor.parent) {
      if (cursor.values.has(name)) {
        const value = cursor.values.get(name);
        if (value === uninitialized) fail(`“${name}” is used before its let declaration runs. Declare it above the line that reads it.`, line);
        return value;
      }
    }
    fail(`“${name}” is not defined here. A variable declared inside { } stays inside that block.`, line);
  }
  function assign(name, value, env, line) {
    for (let cursor = env; cursor; cursor = cursor.parent) {
      if (cursor.values.has(name)) {
        if (cursor.values.get(name)?.kind === 'native' || cursor.values.get(name)?.kind === 'namespace') fail(`“${name}” belongs to the mission and cannot be reassigned.`, line);
        cursor.values.set(name, value);
        return value;
      }
    }
    fail(`“${name}” is not defined here. Declare it with let before assigning to it.`, line);
  }
  function hoist(body, env) {
    for (const node of body) {
      if (node.type === 'let') env.values.set(node.name, uninitialized);
      else if (node.type === 'function') env.values.set(node.name, {kind:'function', declaration:node, env});
    }
  }
  const guard = (value, line) => {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) fail('That calculation produced Infinity or NaN. Check for division by zero or a missing return value.', line);
      if (Math.abs(value) > 1e15) fail('Numbers in this sandbox stay below 10^15.', line);
    }
    if (typeof value === 'string' && value.length > 4096) fail('Strings in this sandbox stay under 4,096 characters.', line);
    return value;
  };
  const track = array => {
    if (array.length > limits.arrayLength) fail(`Arrays in this sandbox hold at most ${limits.arrayLength.toLocaleString('en-US')} entries.`);
    state.cells += 1;
    if (state.cells > limits.cells) fail('Your program allocated too much data. Reuse an array instead of building new ones in a loop.');
    return array;
  };

  function runBody(body, env) {
    hoist(body, env);
    for (const node of body) {
      const signal = run(node, env);
      if (signal) return signal;
    }
    return null;
  }

  function run(node, env) {
    budget(node.line);
    switch (node.type) {
      case 'let': env.values.set(node.name, evaluate(node.value, env)); return null;
      case 'function': return null;
      case 'expression': evaluate(node.value, env); return null;
      case 'block': return runBody(node.body, scope(env));
      case 'if': {
        const test = truthy(evaluate(node.test, env));
        state.conditionDepth++;
        try {
          if (test) return runBody(node.body, scope(env));
          if (node.alternate) return runBody(node.alternate, scope(env));
          return null;
        } finally { state.conditionDepth--; }
      }
      case 'while': {
        state.loopDepth++;
        state.whileDepth++;
        try {
          while (truthy(evaluate(node.test, env))) {
            budget(node.line);
            const signal = runBody(node.body, scope(env));
            if (signal?.type === 'break') break;
            if (signal?.type === 'return') return signal;
          }
        } finally { state.loopDepth--; state.whileDepth--; }
        return null;
      }
      case 'for': {
        const loop = scope(env);
        if (node.init?.type === 'let') { hoist([node.init], loop); run(node.init, loop); }
        else if (node.init) evaluate(node.init.value, loop);
        state.loopDepth++;
        try {
          while (node.test ? truthy(evaluate(node.test, loop)) : true) {
            budget(node.line);
            const signal = runBody(node.body, scope(loop));
            if (signal?.type === 'break') break;
            if (signal?.type === 'return') return signal;
            if (node.update) evaluate(node.update, loop);
          }
        } finally { state.loopDepth--; }
        return null;
      }
      case 'return': return {type:'return', value:node.value ? evaluate(node.value, env) : undefined};
      case 'break': return {type:'break'};
      case 'continue': return {type:'continue'};
      default: fail(`Unsupported statement “${node.type}”.`, node.line);
    }
  }

  const truthy = value => !!value;

  function member(object, name, line) {
    if (Array.isArray(object)) {
      if (name === 'length') return object.length;
      if (arrayMethods.has(name)) return {kind:'method', name, target:object};
      fail(`Arrays in this sandbox support length, ${[...arrayMethods].join(', ')}. “${name}” is not available.`, line);
    }
    if (typeof object === 'string') {
      if (name === 'length') return object.length;
      if (stringMethods.has(name)) return {kind:'method', name, target:object};
      fail(`Strings in this sandbox support length, ${[...stringMethods].join(', ')}. “${name}” is not available.`, line);
    }
    if (object?.kind === 'namespace') {
      if (Object.hasOwn(object.members, name)) return {kind:'native', name:`${object.name}.${name}`, fn:args => object.members[name](...args)};
      fail(`${object.name}.${name} is not available. This sandbox provides ${Object.keys(object.members).join(', ')}.`, line);
    }
    fail(`Only arrays, strings, and Math have members here. ${describe(object)} does not.`, line);
  }

  function callMethod(value, args, line) {
    const {name, target} = value;
    if (Array.isArray(target)) {
      if (name === 'push') { for (const item of args) { target.push(item); track(target); } return target.length; }
      if (name === 'unshift') { for (const item of [...args].reverse()) { target.unshift(item); track(target); } return target.length; }
      if (name === 'concat') { const result = target.concat(...args.map(a => Array.isArray(a) ? a : [a])); track(result); return result; }
      if (name === 'slice') { const result = target.slice(...args.map(Number)); track(result); return result; }
      if (name === 'join') return guard(target.join(args.length ? String(args[0]) : ','), line);
      if (name === 'reverse') return target.reverse();
      if (name === 'pop') return target.pop();
      if (name === 'shift') return target.shift();
      if (name === 'indexOf') return target.indexOf(args[0]);
      if (name === 'lastIndexOf') return target.lastIndexOf(args[0]);
      if (name === 'includes') return target.includes(args[0]);
    }
    if (typeof target === 'string') {
      if (name === 'split') { const result = target.split(args.length ? String(args[0]) : ''); track(result); return result; }
      if (name === 'repeat') return guard(target.repeat(Math.max(0, Math.min(1024, Number(args[0]) || 0))), line);
      const method = {charAt:'charAt', indexOf:'indexOf', includes:'includes', slice:'slice', toUpperCase:'toUpperCase', toLowerCase:'toLowerCase', startsWith:'startsWith', endsWith:'endsWith'}[name];
      if (method) return guard(target[method](...args), line);
    }
    fail(`“${name}” cannot be called on ${describe(target)}.`, line);
  }

  function invoke(value, args, node, env) {
    if (value?.kind === 'native') {
      return guard(value.fn(args, {line:node.line, loopDepth:state.loopDepth, whileDepth:state.whileDepth, conditionDepth:state.conditionDepth, callDepth:state.callDepth, argNodes:node.args, env}), node.line);
    }
    if (value?.kind === 'method') return guard(callMethod(value, args, node.line), node.line);
    if (value?.kind !== 'function') fail(`${describe(value)} is not a function, so it cannot be called.`, node.line);
    const {declaration} = value;
    if (args.length > declaration.params.length) fail(`${declaration.name}() takes ${declaration.params.length} argument${declaration.params.length === 1 ? '' : 's'} but received ${args.length}.`, node.line);
    if (++state.callDepth > limits.callDepth) {
      state.callDepth--;
      fail(`Too many nested calls (${limits.callDepth} deep). A recursive function needs a base case that stops it before this point.`, node.line);
    }
    try {
      const local = scope(value.env);
      declaration.params.forEach((name, i) => local.values.set(name, args[i]));
      const signal = runBody(declaration.body, local);
      return signal?.type === 'return' ? signal.value : undefined;
    } finally { state.callDepth--; }
  }

  function arithmetic(operator, left, right, line) {
    switch (operator) {
      case '+':
        if (Array.isArray(left) || Array.isArray(right)) fail('Arrays cannot be joined with +. Use push() or concat().', line);
        return guard(left + right, line);
      case '-': case '*': case '/': case '%': {
        if (typeof left !== 'number' || typeof right !== 'number') fail(`“${operator}” needs numbers on both sides, not ${describe(left)} and ${describe(right)}.`, line);
        if ((operator === '/' || operator === '%') && right === 0) fail(`Dividing by zero is undefined. Check the right side of “${operator}”.`, line);
        return guard(operator === '-' ? left - right : operator === '*' ? left * right : operator === '/' ? left / right : left % right, line);
      }
      case '<': case '>': case '<=': case '>=':
        if (typeof left !== typeof right) fail(`Compare two numbers or two strings, not ${describe(left)} and ${describe(right)}.`, line);
        return operator === '<' ? left < right : operator === '>' ? left > right : operator === '<=' ? left <= right : left >= right;
      case '===': return left === right;
      case '!==': return left !== right;
      case '==': return left == right;
      case '!=': return left != right;
      default: fail(`Unsupported operator “${operator}”.`, line);
    }
  }

  function slot(node, env) {
    const object = evaluate(node.object, env);
    const property = evaluate(node.property, env);
    if (!Array.isArray(object) && typeof object !== 'string') fail(`Only arrays and strings can be indexed with [ ]. ${describe(object)} cannot.`, node.line);
    if (typeof property !== 'number' || !Number.isInteger(property)) fail(`Array positions are whole numbers. ${describe(property)} is not one.`, node.line);
    return {object, property};
  }

  function evaluate(node, env) {
    budget(node.line);
    switch (node.type) {
      case 'number': case 'string': case 'boolean': return node.value;
      case 'array': return track(node.items.map(item => evaluate(item, env)));
      case 'name': return lookup(node.name, env, node.line);
      case 'member': return member(evaluate(node.object, env), node.name, node.line);
      case 'index': {
        const {object, property} = slot(node, env);
        if (property < 0 || property >= object.length) fail(`Position ${property} is outside ${describe(object)}, which has ${object.length} ${Array.isArray(object) ? 'entries' : 'characters'}. Valid positions run from 0 to ${object.length - 1}.`, node.line);
        return object[property];
      }
      case 'unary': {
        const value = evaluate(node.argument, env);
        if (node.operator === '!') return !truthy(value);
        if (typeof value !== 'number') fail(`“-” needs a number, not ${describe(value)}.`, node.line);
        return guard(-value, node.line);
      }
      case 'logical': {
        const left = evaluate(node.left, env);
        if (node.operator === '&&') return truthy(left) ? evaluate(node.right, env) : left;
        return truthy(left) ? left : evaluate(node.right, env);
      }
      case 'binary': return arithmetic(node.operator, evaluate(node.left, env), evaluate(node.right, env), node.line);
      case 'call': {
        const callee = node.callee.type === 'member' ? member(evaluate(node.callee.object, env), node.callee.name, node.line) : evaluate(node.callee, env);
        const args = node.args.map(argument => evaluate(argument, env));
        return invoke(callee, args, node, env);
      }
      case 'assign': {
        const current = node.operator === '=' ? null : node.target.type === 'name' ? lookup(node.target.name, env, node.line) : (({object, property}) => object[property])(slot(node.target, env));
        let value = evaluate(node.value, env);
        if (node.operator !== '=') value = arithmetic(node.operator[0], current, value, node.line);
        if (node.target.type === 'name') return assign(node.target.name, value, env, node.line);
        const {object, property} = slot(node.target, env);
        if (typeof object === 'string') fail('Strings cannot be changed in place. Build a new string instead.', node.line);
        if (property < 0 || property > object.length) fail(`Position ${property} is outside ${describe(object)}. Assign inside the array, or append with push().`, node.line);
        object[property] = value;
        track(object);
        return value;
      }
      case 'update': {
        const step = node.operator === '++' ? 1 : -1;
        if (node.target.type === 'name') {
          const before = lookup(node.target.name, env, node.line);
          if (typeof before !== 'number') fail(`“${node.operator}” needs a number, not ${describe(before)}.`, node.line);
          assign(node.target.name, guard(before + step, node.line), env, node.line);
          return node.prefix ? before + step : before;
        }
        const {object, property} = slot(node.target, env);
        if (typeof object === 'string') fail('Strings cannot be changed in place.', node.line);
        const before = object[property];
        if (typeof before !== 'number') fail(`“${node.operator}” needs a number, not ${describe(before)}.`, node.line);
        object[property] = guard(before + step, node.line);
        return node.prefix ? before + step : before;
      }
      default: fail(`Unsupported expression “${node.type}”.`, node.line);
    }
  }

  const signal = runBody(ast, global);
  return {
    operations: state.operations,
    output: state.output,
    returned: signal?.type === 'return' ? signal.value : undefined,
    has: name => global.values.get(name)?.kind === 'function',
    functionNames: () => [...global.values].filter(([, value]) => value?.kind === 'function').map(([name]) => name),
    call(name, args = []) {
      const target = global.values.get(name);
      if (target?.kind !== 'function') fail(`Your program does not declare a function named ${name}().`);
      state.operations = 0;
      state.cells = 0;
      const result = invoke(target, args, {line:target.declaration.line, args:[]}, global);
      return {value:result, operations:state.operations};
    },
    parameterCount: name => global.values.get(name)?.declaration?.params.length ?? 0
  };
}

export function run(source, options = {}) {
  return execute(compile(source, options), options);
}
