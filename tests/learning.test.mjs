import test from 'node:test';
import assert from 'node:assert/strict';
import {levels} from '../dist/levels.js';
import {simulate, evaluateAlgorithm, evaluateSpec, algoKinds, QuestError} from '../dist/engine.js';
import {initialState, solutionState, evaluate, isPuzzle} from '../dist/puzzles.js';
import {question, actual, verdict} from '../dist/predict.js';
import {recallQuestion, reviewable, scheduleAfter, dueItems, reviewQueue, intervals, day} from '../dist/recall.js';
import {diagnose, question as causeQuestion, causes} from '../dist/diagnose.js';

const runWith = (level, source) => level.kind === 'spec' ? evaluateSpec(level, source) : evaluateAlgorithm(level, source);

test('every mission can be predicted, and the outcome uses the words the question offered', () => {
  for (const level of levels) {
    const asked = question(level);
    assert.ok(asked.prompt.length > 20, `${level.id} has no prediction prompt`);
    assert.ok(asked.options.length >= 2, `${level.id} offers ${asked.options.length} predictions`);
    assert.equal(new Set(asked.options.map(option => option.value)).size, asked.options.length, `${level.id} offers the same prediction twice`);
    for (const option of asked.options) assert.ok(option.label.length >= 1);

    // Whatever the shipped solution actually does has to be one of the answers
    // the player was offered, or the question was unanswerable.
    const offered = new Set(asked.options.map(option => option.value));
    if (level.kind === 'code') {
      assert.equal(actual(level, simulate(level, level.solution)), 'reached', `${level.id}: the solution should reach the cell`);
      assert.equal(actual(level, null, new QuestError('nope')), 'error');
    } else if (algoKinds.has(level.kind)) {
      const solved = actual(level, runWith(level, level.solution));
      assert.ok(offered.has(solved), `${level.id}: the solution's outcome “${solved}” is not one of the options`);
      assert.equal(solved, level.kind === 'spec' ? '0' : 'none', `${level.id}: the shipped solution should pass everything`);
      const attempted = actual(level, runWith(level, level.starter));
      assert.ok(offered.has(attempted), `${level.id}: the starter's outcome “${attempted}” is not one of the options`);
    } else {
      assert.equal(actual(level, evaluate(level, solutionState(level))), 'meets');
      assert.equal(actual(level, evaluate(level, initialState(level))), 'misses');
    }
  }
});

test('a prediction is never scored, only reflected back', () => {
  const level = levels.find(item => item.kind === 'code');
  const right = verdict(level, 'reached', 'reached');
  const wrong = verdict(level, 'blocked', 'reached');
  assert.equal(right.right, true);
  assert.equal(wrong.right, false);
  assert.match(right.message, /called it/i);
  // Being wrong is framed as the useful case, not as a failure.
  assert.match(wrong.message, /useful/i);
  assert.ok(!/wrong|lost|penalt/i.test(wrong.message), 'a wrong prediction should not be scolded');
  // Nothing to reflect when nothing was predicted, or nothing happened.
  assert.equal(verdict(level, null, 'reached'), null);
  assert.equal(verdict(level, 'reached', null), null);
});

test('every solved mission can be asked about again, from what it already ships', () => {
  const kinds = new Set();
  for (const level of levels) {
    const asked = recallQuestion(level);
    assert.ok(asked, `${level.id} (${level.kind}) has no recall question`);
    assert.ok(reviewable(level));
    kinds.add(asked.kind);
    assert.ok(asked.prompt.length > 10, `${level.id} recall prompt is too short`);
    assert.ok(asked.options.length >= 2, `${level.id} offers ${asked.options.length} answers`);
    assert.equal(new Set(asked.options.map(option => JSON.stringify(option.value))).size, asked.options.length,
      `${level.id} offers the same answer twice`);
    assert.ok(asked.options.some(option => JSON.stringify(option.value) === JSON.stringify(asked.answer)),
      `${level.id}: the right answer is not among the options`);
    assert.ok((asked.why ?? '').length > 20, `${level.id} gives no reason with its answer`);
  }
  // Questions are generated from the content, so the variety follows the content.
  assert.ok(kinds.size >= 6, `only ${kinds.size} kinds of recall question`);
});

test('a recall question is stable for a mission and does not leak its answer by position', () => {
  // Same mission, same question and same option order every time, so a player
  // cannot learn "it is the second one".
  for (const level of levels.slice(0, 12)) {
    const first = recallQuestion(level);
    const second = recallQuestion(level);
    assert.deepEqual(first.options.map(option => option.label), second.options.map(option => option.label), level.id);
    assert.equal(first.prompt, second.prompt);
  }
  // And the right answer is not always in the same slot across missions.
  const positions = levels.map(level => {
    const asked = recallQuestion(level);
    return asked.options.findIndex(option => JSON.stringify(option.value) === JSON.stringify(asked.answer));
  });
  assert.ok(new Set(positions).size >= 3, `the answer sits in only ${new Set(positions).size} positions across all missions`);
});

test('the schedule widens when you remember and resets when you do not', () => {
  const now = Date.UTC(2026, 0, 1);
  let state = scheduleAfter(0, true, now);
  assert.equal(state.box, 1);
  assert.equal(state.due, now + intervals[0] * day);

  // Remembering it moves it further out, every time, up to the last interval.
  const gaps = [];
  for (let round = 0; round < 6; round++) {
    const next = scheduleAfter(state.box, true, now);
    gaps.push((next.due - now) / day);
    state = next;
  }
  assert.deepEqual(gaps, [3, 7, 16, 35, 35, 35]);
  assert.equal(state.box, intervals.length);

  // Forgetting it brings it back tomorrow, whatever box it had reached.
  const missed = scheduleAfter(5, false, now);
  assert.equal(missed.box, 1);
  assert.equal(missed.due, now + intervals[0] * day);
});

test('the review queue is mixed across chapters and holds nothing that is not due', () => {
  const now = Date.UTC(2026, 0, 10);
  const reviews = {};
  for (const level of levels) reviews[level.id] = {box:1, due:now - day};
  assert.equal(dueItems(reviews, now).length, levels.length);
  assert.equal(dueItems(reviews, now - 3 * day).length, 0, 'nothing is due before its time');

  const queue = reviewQueue(reviews, now, 8);
  assert.equal(queue.length, 8);
  // Interleaved: the first four come from four different chapters, because
  // practice mixed across topics beats practice blocked by topic.
  const chapters = queue.slice(0, 4).map(item => item.level.chapter);
  assert.equal(new Set(chapters).size, 4, `the queue opens with ${new Set(chapters).size} chapters: ${chapters.join(', ')}`);
  assert.equal(queue.every(item => reviews[item.level.id]), true);

  // Only what is scheduled, and only what is due.
  const oneDue = {[levels[0].id]:{box:1, due:now - day}, [levels[1].id]:{box:1, due:now + 5 * day}};
  const short = reviewQueue(oneDue, now, 8);
  assert.equal(short.length, 1);
  assert.equal(short[0].level.id, levels[0].id);
  assert.equal(reviewQueue({}, now, 8).length, 0);
});

const consoleMissions = levels.filter(level => level.kind === 'code' || algoKinds.has(level.kind));
const attempt = (level, source) => {
  try {
    return {result:level.kind === 'code' ? simulate(level, source)
      : level.kind === 'spec' ? evaluateSpec(level, source)
      : evaluateAlgorithm(level, source), thrown:null};
  } catch (error) {
    return {result:null, thrown:error};
  }
};

test('every console mission’s own starter fails in a way the game can name', () => {
  const found = new Set();
  for (const level of consoleMissions) {
    const {result, thrown} = attempt(level, level.starter);
    const cause = diagnose(level, result, thrown);
    assert.ok(cause, `${level.id} (${level.kind}) fails in a way nothing can name`);
    assert.ok(causes[cause.id], `${level.id} produced a cause that is not in the vocabulary`);
    assert.ok(cause.label.length > 15, `${cause.id} needs a fuller label`);
    found.add(cause.id);
  }
  // The vocabulary is used, not decorative.
  assert.ok(found.size >= 8, `only ${found.size} different causes come up across ${consoleMissions.length} missions`);
});

test('the cause named is the one the mission is actually about', () => {
  const byId = id => levels.find(level => level.id === id);
  const causeOf = id => {
    const level = byId(id);
    const {result, thrown} = attempt(level, level.starter);
    return diagnose(level, result, thrown).id;
  };
  // Each of these starters is broken in one specific, stated way.
  assert.equal(causeOf('the-log-that-lies'), 'pastTheEnd', 'its loop reads one past the end');
  assert.equal(causeOf('whose-array-is-it'), 'mutates', 'it sorts the caller’s array');
  assert.equal(causeOf('remember-the-answer'), 'tooSlow', 'it is right and exponential');
  assert.equal(causeOf('stop-searching-twice'), 'wrongShape', 'it passes every case and nests loops');
  assert.equal(causeOf('say-it-once'), 'wrongShape', 'it passes every case and inlines the decision');
  assert.equal(causeOf('call-yourself'), 'notRecursive');
  assert.equal(causeOf('write-the-tests'), 'weakSuite', 'one happy path catches nothing');
  assert.equal(causeOf('hold-the-line'), 'notComputed', 'it returns false whatever it is given');

  // Nothing is asked when nothing went wrong, or when it is not a program.
  for (const level of consoleMissions.slice(0, 6)) {
    const {result} = attempt(level, level.solution);
    assert.equal(diagnose(level, result), null, `${level.id} names a cause for a working solution`);
  }
  const puzzle = levels.find(level => !isPuzzle(level) === false);
  assert.equal(causeQuestion(puzzle, evaluate(puzzle, initialState(puzzle))), null, 'a dial is not a program');
});

test('the cause is asked with two plausible alternatives, in a stable order', () => {
  for (const level of consoleMissions) {
    const {result, thrown} = attempt(level, level.starter);
    const asked = causeQuestion(level, result, thrown);
    assert.equal(asked.options.length, 3, `${level.id} offers ${asked.options.length} causes`);
    assert.equal(new Set(asked.options.map(option => option.value)).size, 3, `${level.id} repeats a cause`);
    assert.ok(asked.options.some(option => option.value === asked.answer), `${level.id}: the real cause is not offered`);
    // The distractors have to be causes a program could have, not filler.
    for (const option of asked.options) assert.ok(causes[option.value], `${option.value} is not a real cause`);
    // Same failure, same three, same order.
    const again = causeQuestion(level, result, thrown);
    assert.deepEqual(again.options, asked.options, level.id);
  }
  // And the right answer is not always in the same slot.
  const slots = consoleMissions.map(level => {
    const {result, thrown} = attempt(level, level.starter);
    const asked = causeQuestion(level, result, thrown);
    return asked.options.findIndex(option => option.value === asked.answer);
  });
  assert.equal(new Set(slots).size, 3, `the real cause only ever appears in ${new Set(slots).size} of the three slots`);
});
