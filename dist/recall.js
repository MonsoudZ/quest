// Spaced review.
//
// A mission solved once and never seen again is mostly forgotten in a month.
// This brings solved missions back at widening intervals, asking the checkable
// core rather than the whole thing, and mixing chapters rather than blocking by
// topic — both of which are worth more than the extra practice itself.
import {levels} from './levels.js';
import {describe, evaluateNetwork} from './engine.js';
import {initialState, solutionState} from './puzzles.js';

// Widening gaps, in days. A right answer moves up a box; a wrong one goes back
// to the start, because the thing you just failed to recall is the thing to ask
// again soon.
export const intervals = [1, 3, 7, 16, 35];
export const day = 86400000;

export const scheduleAfter = (box = 0, correct = true, now = Date.now()) => {
  const next = correct ? Math.min(box + 1, intervals.length) : 1;
  return {box:next, due:now + intervals[next - 1] * day};
};

export function dueItems(reviews = {}, now = Date.now()) {
  return levels
    .filter(level => reviews[level.id])
    .filter(level => (reviews[level.id].due ?? 0) <= now)
    .map(level => ({level, ...reviews[level.id], overdue:Math.max(0, Math.floor((now - (reviews[level.id].due ?? now)) / day))}));
}

// Mixed rather than blocked: the queue alternates chapters where it can, so two
// questions about the same idea rarely arrive back to back.
export function reviewQueue(reviews = {}, now = Date.now(), size = 8) {
  const due = dueItems(reviews, now).sort((a, b) => (a.due ?? 0) - (b.due ?? 0) || (a.box ?? 0) - (b.box ?? 0));
  const byChapter = new Map();
  for (const item of due) {
    if (!byChapter.has(item.level.chapter)) byChapter.set(item.level.chapter, []);
    byChapter.get(item.level.chapter).push(item);
  }
  const queue = [];
  while (queue.length < size && [...byChapter.values()].some(list => list.length)) {
    for (const list of byChapter.values()) {
      if (!list.length || queue.length >= size) continue;
      queue.push(list.shift());
    }
  }
  return queue;
}

// ------------------------------------------------------------ questions

const shuffle = (list, seed) => {
  // Deterministic from the mission id, so the same question always offers its
  // options in the same order and a player cannot learn "it is the third one".
  let value = seed;
  const out = [...list];
  for (let index = out.length - 1; index > 0; index--) {
    value = (value * 1103515 + 12345) % 2147483647;
    const swap = value % (index + 1);
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
};
const seedOf = text => [...text].reduce((total, character) => (total * 31 + character.codePointAt(0)) % 2147483647, 7);

const distinct = list => {
  const seen = new Set();
  return list.filter(entry => {
    const key = JSON.stringify(entry.value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Every question is built from what the mission already ships and the tests
// already check, so a review can never ask something the game does not know.
export function recallQuestion(level) {
  if (level.kind === 'code' && level.solution) {
    // One line of the program you wrote, taken back out. The distractors are
    // other lines of the same program plus the near misses — turning the wrong
    // way, moving one tile too far — which is what these missions are about.
    // Indentation is kept, because reading a block is part of the question.
    const lines = level.solution.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    if (lines.length >= 1) {
      const index = seedOf(level.id) % lines.length;
      const line = lines[index].trim();
      const near = [
        line.includes('turnLeft') ? line.replace('turnLeft', 'turnRight') : line.replace('turnRight', 'turnLeft'),
        line.replace(/move\((\d*)\)/, (match, count) => `move(${(Number(count) || 1) + 1})`),
        line.replace(/move\((\d*)\)/, (match, count) => `move(${Math.max(0, (Number(count) || 1) - 1)})`)
      ];
      // A one-line program has no other lines to be told apart from, so it gets
      // one synthesised alternative rather than a malformed one.
      if (lines.length === 1) near.push(line.includes('move') ? line.replace(/move\([^)]*\)/, 'turnRight()') : 'move();');
      const options = distinct([
        {value:line, label:line},
        ...near.filter(text => text !== line).map(value => ({value, label:value})),
        ...lines.filter((_, position) => position !== index).map(entry => ({value:entry.trim(), label:entry.trim()}))
      ]).slice(0, 4);
      if (options.length >= 2) {
        const shown = lines.map((entry, position) => position === index ? entry.replace(/\S.*/, '▁▁▁▁▁▁▁▁') : entry).join('\n');
        return {
          kind:'line',
          prompt:`${level.name}: which line belongs in the gap?\n\n${shown}`,
          options:shuffle(options, seedOf(level.id)),
          answer:line,
          why:level.takeaway
        };
      }
    }
  }
  if (level.mutants?.length) {
    // Test design, recalled as the reason a case has to exist.
    const index = seedOf(level.id) % level.mutants.length;
    const target = level.mutants[index];
    return {
      kind:'mutant',
      prompt:`${level.subject.name}(): one broken version ${target.name}. What has to be in a suite to catch it?`,
      options:shuffle(level.mutants.map(mutant => ({value:mutant.name, label:mutant.why})), seedOf(level.id)),
      answer:target.name,
      why:'A suite is worth what it rejects, and what rejects things lives at the boundaries and the edges.'
    };
  }
  if (level.received && Array.isArray(level.solution)) {
    const flipped = level.solution.findIndex((bit, index) => bit !== level.received[index]) + 1;
    return {
      kind:'position',
      prompt:`${level.name}: the word arrived as ${level.received.join('')}. Which position was flipped?`,
      options:shuffle(level.received.map((_, index) => ({value:index + 1, label:`position ${index + 1}`})), seedOf(level.id)).slice(0, 4)
        .some(option => option.value === flipped)
        ? shuffle(level.received.map((_, index) => ({value:index + 1, label:`position ${index + 1}`})), seedOf(level.id)).slice(0, 4)
        : [{value:flipped, label:`position ${flipped}`}, ...shuffle(level.received.map((_, index) => ({value:index + 1, label:`position ${index + 1}`})), seedOf(level.id)).filter(option => option.value !== flipped).slice(0, 3)],
      answer:flipped,
      why:'The three parity checks read out the bad position in binary.'
    };
  }
  if (level.edges?.length && Array.isArray(level.solution)) {
    const best = evaluateNetwork(level, level.solution);
    const measured = level.budget ? best.cost : best.hops;
    const unit = level.budget ? ' ms' : ' hops';
    const wrong = [measured + 1, measured - 1, Math.round(measured * 1.5)].filter(value => value !== measured && value > 0);
    return {
      kind:'route',
      prompt:`${level.name}: what did the best route cost?`,
      options:shuffle(distinct([{value:measured, label:`${measured}${unit}`}, ...wrong.map(value => ({value, label:`${value}${unit}`}))]).slice(0, 4), seedOf(level.id)),
      answer:measured,
      why:level.takeaway
    };
  }
  if (level.cases?.length && level.fn) {
    // Retrieval of the procedure: run the function in your head on one case.
    const index = seedOf(level.id) % level.cases.length;
    const target = level.cases[index];
    const answers = distinct([
      {value:target.expect, label:describe(target.expect)},
      ...level.cases.filter((_, other) => other !== index).map(entry => ({value:entry.expect, label:describe(entry.expect)}))
    ]).slice(0, 4);
    if (answers.length >= 2) {
      return {
        kind:'call',
        prompt:`What does ${level.fn}(${target.args.map(describe).join(', ')}) return?`,
        options:shuffle(answers, seedOf(level.id)),
        answer:target.expect,
        why:level.takeaway
      };
    }
  }
  if (level.questions?.length && (Array.isArray(level.solution) || Array.isArray(level.solution?.choices))) {
    // Quizzes and estimates already ask a question with a stated reason.
    const index = seedOf(level.id) % level.questions.length;
    const asked = level.questions[index];
    return {
      kind:'quiz',
      prompt:asked.prompt,
      options:asked.options.map((option, position) => ({value:position, label:option.label ?? option})),
      answer:(Array.isArray(level.solution) ? level.solution : level.solution.choices)[index],
      why:asked.why ?? level.estimatorNote ?? level.takeaway
    };
  }
  if (level.dials?.length) {
    // Which setting met the target — the decision the mission was about.
    const answer = solutionState(level).dials;
    const dial = level.dials.find(entry => answer[entry.id] !== initialState(level).dials[entry.id]) ?? level.dials[0];
    return {
      kind:'dial',
      prompt:`${level.name}: which ${dial.label.toLowerCase()} met the target?`,
      options:shuffle(dial.options.map(option => ({value:option.value, label:option.label ?? String(option.value)})), seedOf(level.id)),
      answer:answer[dial.id],
      why:level.takeaway
    };
  }
  if (level.bits && Number.isInteger(level.target)) {
    const places = Array.from({length:level.bits.width}, (_, i) => 2 ** (level.bits.width - 1 - i));
    const bits = solutionState(level).bits;
    const wrong = [level.target + 1, level.target - 1, -level.target].filter(value => value !== level.target);
    return {
      kind:'bits',
      prompt:`Which value do these bits encode? ${bits.join('')}${level.bits.encoding === 'twos' ? ' (two’s complement)' : ''}`,
      options:shuffle(distinct([{value:level.target, label:String(level.target)}, ...wrong.map(value => ({value, label:String(value)}))]).slice(0, 4), seedOf(level.id)),
      answer:level.target,
      why:`Place values, left to right: ${places.join(', ')}.`
    };
  }
  if (level.values && Array.isArray(level.solution)) {
    return {
      kind:'order',
      prompt:`${level.name}: what is the finished order?`,
      options:shuffle([
        {value:level.solution.join(','), label:level.solution.join(', ')},
        {value:[...level.solution].reverse().join(','), label:[...level.solution].reverse().join(', ')},
        {value:level.values.join(','), label:level.values.join(', ')}
      ], seedOf(level.id)),
      answer:level.solution.join(','),
      why:level.takeaway
    };
  }
  if (level.items && Array.isArray(level.order)) {
    const right = level.order.map(id => level.items.find(item => item.id === id).name);
    const swapped = [...right];
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    return {
      kind:'sequence',
      prompt:`${level.name}: which order is right?`,
      options:shuffle([
        {value:right.join(' → '), label:right.join(' → ')},
        {value:swapped.join(' → '), label:swapped.join(' → ')},
        {value:[...right].reverse().join(' → '), label:[...right].reverse().join(' → ')}
      ], seedOf(level.id)),
      answer:right.join(' → '),
      why:level.takeaway
    };
  }
  return null;
}

export const reviewable = level => recallQuestion(level) !== null;
