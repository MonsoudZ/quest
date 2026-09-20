// Machine-level models for the computer science chapter.
//
// These are the parts of a computer that leak: binary fractions that cannot
// represent a tenth, text that is bytes rather than letters, memory that is
// fetched in lines rather than words, a channel that flips a bit, and a tree
// whose shape is decided by the order you built it in. Each model is exact
// where it can be — the floating-point arithmetic really is IEEE 754, because
// it runs on the same hardware — and stated as a simplification where it is not.

export class MachineError extends Error {}
const fail = message => { throw new MachineError(message); };
const round = (value, places = 6) => Number(value.toFixed(places));

// ------------------------------------------------------- binary fractions

// The exact value of a double, printed in full. JavaScript prints the shortest
// string that round-trips, which hides the very thing this chapter is about:
// 0.1 prints as "0.1" and is not a tenth.
export function exactValue(value) {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value) && Math.abs(value) < 2 ** 53) return String(value);
  const buffer = new DataView(new ArrayBuffer(8));
  buffer.setFloat64(0, value);
  const raw = buffer.getBigUint64(0);
  const sign = raw >> 63n ? -1n : 1n;
  const exponent = Number((raw >> 52n) & 0x7FFn);
  const fraction = raw & 0xFFFFFFFFFFFFFn;
  // A normal double is (1 + fraction/2^52) × 2^(exponent-1023); a subnormal has
  // no implicit leading one. Both are an integer divided by a power of two, so
  // both have an exact decimal expansion.
  const significand = exponent === 0 ? fraction : fraction | (1n << 52n);
  const power = BigInt(exponent === 0 ? -1074 : exponent - 1075);
  let digits = significand;
  let scale = 0;
  if (power >= 0n) {
    digits <<= power;
  } else {
    // Dividing by 2^n is multiplying by 5^n and moving the point n places.
    scale = Number(-power);
    digits *= 5n ** BigInt(scale);
  }
  const text = digits.toString().padStart(scale + 1, '0');
  const whole = text.slice(0, text.length - scale) || '0';
  const decimals = scale ? text.slice(text.length - scale).replace(/0+$/, '') : '';
  return `${sign < 0n ? '-' : ''}${whole}${decimals ? `.${decimals}` : ''}`;
}

export const representations = {
  float64:{
    label:'Double-precision floating point',
    note:'What a JavaScript number is. 53 bits of significand, and no exact tenth anywhere in it.',
    exact:false,
    add:(total, amount) => total + amount,
    start:0,
    toNumber:total => total
  },
  float32:{
    label:'Single-precision floating point',
    note:'Half the significand, so the same error arrives about twice as fast.',
    exact:false,
    add:(total, amount) => Math.fround(Math.fround(total) + Math.fround(amount)),
    start:0,
    toNumber:total => Math.fround(total)
  },
  whole:{
    label:'Whole minor units',
    note:'Count in whole units of the smallest amount you charge in, so every value is an integer and every sum is exact.',
    exact:true,
    // An integer representation is only as exact as its unit is small. Rounding
    // each amount to the chosen unit is what a till actually does, and what
    // makes too coarse a unit wrong rather than merely approximate.
    add:(total, amount, scale) => total + Math.round(amount * scale),
    start:0,
    toNumber:(total, scale) => total / scale
  }
};

// The smallest power of ten that writes every one of these amounts as a whole
// number. Anything coarser rounds something away; anything finer is a wider
// counter for no benefit.
export function finestUnit(amounts) {
  let scale = 1;
  for (const amount of amounts) {
    while (scale <= 1e9 && Math.abs(amount * scale - Math.round(amount * scale)) > 1e-9) scale *= 10;
  }
  return scale;
}

export function accumulate(amounts, {representation = 'float64', order = 'given', scale = 100} = {}) {
  const model = representations[representation];
  if (!model) fail(`There is no representation called “${representation}”.`);
  if (!['given', 'ascending'].includes(order)) fail('Add the amounts as they come or smallest first.');
  if (!(scale >= 1 && Number.isInteger(scale))) fail('A minor unit is a whole number of units to the major one.');
  // Adding the small amounts first keeps them from being rounded away against a
  // total that has already grown large. It shrinks the error; it does not remove it.
  const list = order === 'ascending' ? [...amounts].sort((a, b) => a - b) : amounts;
  let total = model.start;
  for (const amount of list) total = model.add(total, amount, scale);
  const value = model.toNumber(total, scale);
  // The exact total, computed in units fine enough for every amount in the list,
  // so the thing being compared against cannot itself have rounded anything.
  const needed = finestUnit(amounts);
  const exactUnits = amounts.reduce((sum, amount) => sum + Math.round(amount * needed), 0);
  const exact = exactUnits / needed;
  const error = value - exact;
  // How many amounts this unit cannot write down, which is how many the till
  // rounds before it has added anything at all.
  const rounded = model.exact
    ? amounts.filter(amount => Math.abs(amount * scale - Math.round(amount * scale)) > 1e-9).length
    : 0;
  return {
    representation, order, scale, value, exact,
    needed,
    // An integer counter is exact when its unit is fine enough for every amount,
    // and tight when it is no finer than it has to be.
    representable:model.exact && scale >= needed,
    tight:model.exact && scale === needed,
    rounded,
    // A float is shown in full, because what it actually holds is the lesson.
    // An integer counter is shown as the decimal it means, for the same reason.
    valueText:model.exact ? (total / scale).toFixed(Math.round(Math.log10(scale))) : exactValue(value),
    // The takings are a decimal quantity, not a double: writing them out as a
    // binary expansion would be answering a question nobody asked.
    exactText:(exactUnits / needed).toFixed(Math.round(Math.log10(needed))),
    error, errorText:exactValue(error),
    centsOff:Math.round(error * 100) + 0,
    equal:value === exact,
    count:amounts.length
  };
}

// ---------------------------------------------------------------- text

// UTF-8: 1 byte below U+0080, 2 below U+0800, 3 below U+10000, 4 above. The
// leading byte says how many continuation bytes follow, which is what makes a
// truncation in the middle of a character detectable rather than silent.
export function encodeUtf8(codePoint) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) fail('A code point runs from 0 to U+10FFFF.');
  if (codePoint < 0x80) return [codePoint];
  if (codePoint < 0x800) return [0xC0 | (codePoint >> 6), 0x80 | (codePoint & 63)];
  if (codePoint < 0x10000) return [0xE0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 63), 0x80 | (codePoint & 63)];
  return [0xF0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 63), 0x80 | ((codePoint >> 6) & 63), 0x80 | (codePoint & 63)];
}

export function measure(text) {
  const codePoints = [...text];
  const bytes = codePoints.flatMap(character => encodeUtf8(character.codePointAt(0)));
  return {
    text,
    bytes:bytes.length,
    codePoints:codePoints.length,
    utf16Units:text.length,      // what String.length actually counts
    byteValues:bytes,
    widest:Math.max(1, ...codePoints.map(character => encodeUtf8(character.codePointAt(0)).length))
  };
}

// Cutting text to fit a fixed-size column. By bytes is what a naive column does
// and it can split a character in half; by code points never does, but then the
// column has to be sized for the worst case rather than for the average.
export function truncate(text, limit, {unit = 'bytes'} = {}) {
  const size = measure(text);
  if (unit === 'codePoints') {
    const kept = [...text].slice(0, limit).join('');
    return {text:kept, fits:size.codePoints <= limit, mangled:false, bytes:measure(kept).bytes, unit, limit};
  }
  if (unit !== 'bytes') fail('Cut by bytes or by code points.');
  const bytes = [];
  let kept = '';
  let mangled = false;
  for (const character of text) {
    const encoded = encodeUtf8(character.codePointAt(0));
    if (bytes.length + encoded.length > limit) {
      // A byte-wise cut stops mid-character whenever the next one does not fit.
      mangled = bytes.length < limit;
      break;
    }
    bytes.push(...encoded);
    kept += character;
  }
  return {text:kept, fits:size.bytes <= limit, mangled, bytes:bytes.length, unit, limit};
}

// --------------------------------------------------------------- memory

// Memory is fetched a cache line at a time, so what a loop costs depends on the
// order it touches addresses in, not on how many it touches. A fully associative
// cache with least-recently-used eviction: real caches are set-associative, and
// real hardware prefetches, both of which make the good order look even better.
export function traverse({rows, columns, order = 'row', tile = 0, mode = 'scan', lineBytes = 64, elementBytes = 8, cacheLines = 64}) {
  if (!(rows > 0 && columns > 0)) fail('A grid needs at least one row and one column.');
  if (!['scan', 'transpose'].includes(mode)) fail('Walk the grid as a scan or as a transpose.');
  const perLine = Math.max(1, Math.floor(lineBytes / elementBytes));
  const cache = new Map();
  let misses = 0, touches = 0;

  // Two arrays live at different addresses, so a line of one never holds the
  // other. Grid 0 is read in [row][column] order; grid 1 is the destination.
  const touch = (grid, row, column) => {
    touches++;
    const line = `${grid}:${Math.floor((row * columns + column) / perLine)}`;
    if (cache.has(line)) { cache.delete(line); cache.set(line, true); return; }
    misses++;
    cache.set(line, true);
    if (cache.size > cacheLines) cache.delete(cache.keys().next().value);
  };
  // A transpose writes b[c][r] for every a[r][c] it reads, so one of the two
  // sides is always running against the grain — that is the whole problem.
  const step = (row, column) => {
    touch(0, row, column);
    if (mode === 'transpose') touch(1, column, row);
  };

  if (tile > 0) {
    for (let rowBlock = 0; rowBlock < rows; rowBlock += tile) {
      for (let columnBlock = 0; columnBlock < columns; columnBlock += tile) {
        for (let row = rowBlock; row < Math.min(rows, rowBlock + tile); row++) {
          for (let column = columnBlock; column < Math.min(columns, columnBlock + tile); column++) step(row, column);
        }
      }
    }
  } else if (order === 'row') {
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) step(row, column);
  } else if (order === 'column') {
    for (let column = 0; column < columns; column++) for (let row = 0; row < rows; row++) step(row, column);
  } else {
    fail('Walk the grid by row or by column.');
  }

  const grids = mode === 'transpose' ? 2 : 1;
  const compulsory = Math.ceil((rows * columns) / perLine) * grids;
  return {
    rows, columns, mode, tile,
    order:tile > 0 ? `tiled ${tile}×${tile}` : order,
    touches, misses,
    missRate:round(misses / touches, 4),
    elementsPerLine:perLine,
    compulsory,
    // Every line has to be fetched once whatever the order; anything beyond that
    // is a line that was evicted and fetched again.
    avoidable:misses - compulsory,
    bytesFetched:misses * lineBytes,
    cacheBytes:cacheLines * lineBytes
  };
}

// ------------------------------------------------- error detection

// Hamming(7,4) with an added overall parity bit: SECDED, the code in ECC memory.
// Bits are numbered from 1, parity bits sit at the powers of two, and each one
// covers the positions whose index has its bit set. The syndrome — the parity
// bits that come out wrong — is the position of the flipped bit, in binary.
export function hammingEncode(data) {
  if (!Array.isArray(data) || data.length !== 4 || data.some(bit => bit !== 0 && bit !== 1)) fail('Encode exactly four bits, each 0 or 1.');
  const [d1, d2, d3, d4] = data;
  const p1 = d1 ^ d2 ^ d4;
  const p2 = d1 ^ d3 ^ d4;
  const p4 = d2 ^ d3 ^ d4;
  return [p1, p2, d1, p4, d2, d3, d4];
}

export function hammingCheck(word) {
  if (!Array.isArray(word) || word.length !== 7 || word.some(bit => bit !== 0 && bit !== 1)) fail('A codeword is seven bits, each 0 or 1.');
  const at = position => word[position - 1];
  const c1 = at(1) ^ at(3) ^ at(5) ^ at(7);
  const c2 = at(2) ^ at(3) ^ at(6) ^ at(7);
  const c4 = at(4) ^ at(5) ^ at(6) ^ at(7);
  const syndrome = c1 + c2 * 2 + c4 * 4;
  const corrected = [...word];
  if (syndrome) corrected[syndrome - 1] ^= 1;
  return {
    word, syndrome, checks:{c1, c2, c4},
    valid:syndrome === 0,
    // The syndrome is the position, so a single error is not only detected, it
    // is located — which is the difference between a checksum and a code.
    flipped:syndrome === 0 ? null : syndrome,
    corrected,
    data:[corrected[2], corrected[4], corrected[5], corrected[6]]
  };
}

// ---------------------------------------------------------------- trees

// A binary search tree has no shape of its own: the insertion order gives it
// one. Sorted input produces a linked list with extra pointers, which is why
// real implementations rebalance rather than trusting the caller.
export function buildTree(keys) {
  if (!Array.isArray(keys) || !keys.length) fail('A tree needs at least one key.');
  if (new Set(keys).size !== keys.length) fail('These keys are not all different.');
  let root = null;
  const nodes = new Map();
  const comparisons = [];
  for (const key of keys) {
    let depth = 1, steps = 0;
    if (!root) { root = {key, left:null, right:null, depth:1}; nodes.set(key, root); comparisons.push({key, steps, depth}); continue; }
    let cursor = root;
    for (;;) {
      steps++;
      depth++;
      const side = key < cursor.key ? 'left' : 'right';
      if (!cursor[side]) { cursor[side] = {key, left:null, right:null, depth}; nodes.set(key, cursor[side]); break; }
      cursor = cursor[side];
    }
    comparisons.push({key, steps, depth});
  }
  const depthOf = node => node ? 1 + Math.max(depthOf(node.left), depthOf(node.right)) : 0;
  const height = depthOf(root);
  const worstLookup = Math.max(...comparisons.map(entry => entry.depth));
  const perfect = Math.ceil(Math.log2(keys.length + 1));
  return {
    keys, root, height, perfect, comparisons,
    worstLookup,
    balanced:height === perfect,
    // How much worse than a perfectly balanced tree of the same size.
    overhead:height - perfect,
    rows:[...nodes.entries()].map(([key, node]) => ({key, depth:node.depth})).sort((a, b) => a.depth - b.depth || a.key - b.key)
  };
}

// ------------------------------------------------- two hands, one counter
//
// A routine is a list of step kinds, in the order the player put them. Two
// workers run that same routine against one shared total, and every way their
// steps can interleave is tried. A routine is correct when every one of those
// schedules ends at the same total — not when one of them happens to.
const stepKinds = {
  acquire:{shared:false, holds:true, cost:1},
  read:{shared:true, holds:false, cost:1},
  add:{shared:false, holds:false, cost:1},
  write:{shared:true, holds:false, cost:1},
  release:{shared:false, holds:false, cost:1},
  format:{shared:false, holds:false, cost:8}
};

// Reasons a routine is nonsense before any schedule is considered: a step that
// depends on one that has not happened yet. These are about the routine alone,
// so they are reported without running anything.
export function routineFaults(routine) {
  const at = kind => routine.indexOf(kind);
  const faults = [];
  if (at('read') > at('add')) faults.push({id:'addBeforeRead', text:'It adds one to a total it has not read yet.'});
  if (at('add') > at('write')) faults.push({id:'writeBeforeAdd', text:'It writes the total back before adding anything to it.'});
  if (at('read') > at('write')) faults.push({id:'writeBeforeRead', text:'It writes the total back before reading it.'});
  if (at('acquire') > at('release')) faults.push({id:'releaseFirst', text:'It releases the lock before it takes it.'});
  if (at('format') >= 0 && at('add') > at('format')) faults.push({id:'formatEarly', text:'It writes the log line before the total it is meant to report has been worked out.'});
  return faults;
}

// Every interleaving of two runs of the same routine. Both workers are trying
// to add one, so a correct routine can only ever end at start + 2.
export function schedules(routine, {start = 0} = {}) {
  const held = routine.filter(kind => stepKinds[kind]?.holds).length > 0;
  const results = new Map();
  let blocked = 0;
  // One schedule that ends at the wrong total, kept step by step. A count of
  // lost updates persuades nobody; the trace that lost one persuades everybody.
  let witness = null;

  const walk = (a, b, state) => {
    if (a === routine.length && b === routine.length) {
      results.set(state.total, (results.get(state.total) ?? 0) + 1);
      if (state.total !== start + 2 && (!witness || state.total < witness.total)) {
        witness = {total:state.total, steps:state.trace};
      }
      return;
    }
    for (const [who, index] of [['a', a], ['b', b]]) {
      if (index === routine.length) continue;
      const kind = routine[index];
      // A lock is a lock: while one worker holds it the other cannot pass its
      // own acquire, and that is the only thing stopping the two of them.
      if (kind === 'acquire' && state.lock && state.lock !== who) { blocked++; continue; }
      const next = {...state, local:{...state.local}};
      if (kind === 'acquire') next.lock = who;
      if (kind === 'release' && state.lock === who) next.lock = null;
      if (kind === 'read') next.local[who] = state.total;
      if (kind === 'add') next.local[who] = (state.local[who] ?? 0) + 1;
      if (kind === 'write') next.total = state.local[who] ?? state.total;
      next.trace = [...state.trace, {who, kind, total:next.total, held:next.local[who]}];
      walk(who === 'a' ? index + 1 : a, who === 'b' ? index + 1 : b, next);
    }
  };
  walk(0, 0, {total:start, lock:null, local:{}, trace:[]});

  const totals = [...results.keys()].sort((first, second) => first - second);
  // How long the lock is held, counted in the steps inside it: the part of the
  // routine that cannot overlap with the other worker.
  const inside = held
    ? routine.slice(routine.indexOf('acquire') + 1, routine.indexOf('release') < 0 ? routine.length : routine.indexOf('release'))
    : [];
  return {
    routine,
    guarded:held,
    totals,
    schedules:[...results.values()].reduce((sum, count) => sum + count, 0),
    lost:[...results.entries()].filter(([total]) => total !== start + 2).reduce((sum, [, count]) => sum + count, 0),
    correct:totals.length === 1 && totals[0] === start + 2,
    expected:start + 2,
    witness,
    blocked,
    heldFor:inside.reduce((sum, kind) => sum + (stepKinds[kind]?.cost ?? 1), 0),
    heldSteps:inside
  };
}
