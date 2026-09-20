// Name the cause before you read it.
//
// When a case fails, the sandbox writes an excellent explanation and hands it
// over, and the learner reads it and fixes the line. Making them commit to a
// cause first turns reading a diagnosis into making one. Every cause below is
// recognised from what the evaluator already returned, so nothing here can
// describe a failure the game did not actually have.
import {algoKinds} from './engine.js';

// The vocabulary. Each entry is a cause a program can have, phrased as the
// learner would say it rather than as the interpreter says it.
export const causes = {
  pastTheEnd:{id:'pastTheEnd', label:'The loop runs one step past the end'},
  emptyInput:{id:'emptyInput', label:'The empty input is not handled'},
  neverEnds:{id:'neverEnds', label:'A loop repeats far more than it needs to'},
  noBaseCase:{id:'noBaseCase', label:'The recursion has no base case'},
  wrongType:{id:'wrongType', label:'A value is the wrong type for what is done to it'},
  missingField:{id:'missingField', label:'A record field is missing or misspelled'},
  dividedByZero:{id:'dividedByZero', label:'Something is divided by a count that can be zero'},
  notComputed:{id:'notComputed', label:'The function gives back the same answer whatever it is given'},
  unchanged:{id:'unchanged', label:'It returns its input without working on it'},
  boundary:{id:'boundary', label:'It is wrong only at the edge of the range'},
  negatives:{id:'negatives', label:'Negative values are not handled'},
  tooSlow:{id:'tooSlow', label:'The answers are right and it does far too much work'},
  wrongShape:{id:'wrongShape', label:'The answers are right and the shape is not what was asked for'},
  mutates:{id:'mutates', label:'It changes the thing it was given'},
  willNotRun:{id:'willNotRun', label:'The program does not run at all'},
  wrongFunction:{id:'wrongFunction', label:'The function the mission asked for is not declared'},
  movesBeforeTurning:{id:'movesBeforeTurning', label:'It moves before it turns'},
  movesTooFar:{id:'movesTooFar', label:'It moves further than there is deck'},
  stopsShort:{id:'stopsShort', label:'It stops before it gets there'},
  missesTheConcept:{id:'missesTheConcept', label:'It arrives without using what the mission is teaching'},
  weakSuite:{id:'weakSuite', label:'The suite has nothing that tells the broken versions apart'},
  wrongExpectation:{id:'wrongExpectation', label:'One of the expected values is itself wrong'},
  notRecursive:{id:'notRecursive', label:'It works without calling itself, and the mission is about recursion'}
};

const from = (text = '') => {
  if (/outside \[|Valid positions run/.test(text)) return causes.pastTheEnd;
  if (/Dividing by zero/.test(text)) return causes.dividedByZero;
  if (/needs numbers on both sides|Compare two numbers|needs a number, not/.test(text)) return causes.wrongType;
  if (/no field called/.test(text)) return causes.missingField;
  if (/ran too long|more than .* steps/.test(text)) return causes.neverEnds;
  if (/Too many nested calls|base case/.test(text)) return causes.noBaseCase;
  if (/has to call itself|this mission is about recursion/.test(text)) return causes.notRecursive;
  if (/asks it to call|asks you not to call/.test(text)) return causes.wrongShape;
  if (/does not declare a function named|needs a function named/.test(text)) return causes.wrongFunction;
  if (/is not defined here|Expected “|does not understand|ends before its/.test(text)) return causes.willNotRun;
  return null;
};

const sameEverywhere = results => {
  const answered = results.filter(entry => entry.actual !== undefined && entry.actual !== null);
  if (answered.length < 2) return false;
  const first = JSON.stringify(answered[0].actual);
  return answered.every(entry => JSON.stringify(entry.actual) === first);
};
const isEmpty = value => (Array.isArray(value) && !value.length) || value === '' || value === 0;

// What actually went wrong, or null when the run did not fail in a way this
// knows how to name — in which case nothing is asked and the error is shown.
export function diagnose(level, result, thrown = null) {
  if (thrown) return from(thrown.message) ?? causes.willNotRun;
  if (!result || result.success) return null;

  if (level.kind === 'code') {
    if (result.error && /traversable tile ahead/.test(result.error)) {
      // Turning is the fix when the drone has not moved yet, distance is the fix
      // when it has.
      return result.steps?.some(step => step.label === 'Moved forward') ? causes.movesTooFar : causes.movesBeforeTurning;
    }
    if (result.error) return causes.missesTheConcept;
    return causes.stopsShort;
  }

  if (level.kind === 'spec') {
    if (!result.cases?.length) return from(result.error) ?? causes.willNotRun;
    if (/expects .* and a correct implementation returns/.test(result.error ?? '')) return causes.wrongExpectation;
    return causes.weakSuite;
  }

  if (algoKinds.has(level.kind)) {
    if (!result.cases?.length) return from(result.error) ?? causes.willNotRun;
    if (result.shape) return causes.wrongShape;
    const failed = result.cases.find(entry => !entry.passed || entry.overGate);
    if (!failed) return null;
    if (failed.overGate) return causes.tooSlow;
    if (failed.error) return from(failed.error) ?? causes.willNotRun;
    if (failed.mutated) return causes.mutates;
    if (failed.args.some(isEmpty)) return causes.emptyInput;
    if (sameEverywhere(result.cases)) return causes.notComputed;
    if (JSON.stringify(failed.actual) === JSON.stringify(failed.args[0])) return causes.unchanged;
    if (failed.args.flat().some(value => typeof value === 'number' && value < 0)) return causes.negatives;
    return causes.boundary;
  }
  return null;
}

// Two plausible alternatives, chosen from causes that could have been true of
// this mission but were not. Deterministic, so the same failure always offers
// the same three and the answer is not learnable by position.
const poolFor = level => level.kind === 'code'
  ? [causes.movesBeforeTurning, causes.movesTooFar, causes.stopsShort, causes.missesTheConcept, causes.neverEnds, causes.willNotRun]
  : level.kind === 'spec'
    ? [causes.weakSuite, causes.wrongExpectation, causes.willNotRun, causes.wrongFunction, causes.notComputed]
    : [causes.pastTheEnd, causes.emptyInput, causes.boundary, causes.negatives, causes.notComputed, causes.unchanged,
       causes.wrongType, causes.neverEnds, causes.noBaseCase, causes.tooSlow, causes.mutates, causes.dividedByZero,
       causes.missingField, causes.wrongShape, causes.willNotRun, causes.wrongFunction, causes.notRecursive];

const seedOf = text => [...text].reduce((total, character) => (total * 31 + character.codePointAt(0)) % 2147483647, 11);

export function question(level, result, thrown = null) {
  const answer = diagnose(level, result, thrown);
  if (!answer) return null;
  const others = poolFor(level).filter(cause => cause.id !== answer.id);
  let seed = seedOf(`${level.id}:${answer.id}`);
  const picked = [];
  const pool = [...others];
  while (picked.length < 2 && pool.length) {
    seed = (seed * 1103515 + 12345) % 2147483647;
    picked.push(pool.splice(seed % pool.length, 1)[0]);
  }
  const options = [answer, ...picked];
  // A stable shuffle so the right answer is not always first.
  for (let index = options.length - 1; index > 0; index--) {
    seed = (seed * 1103515 + 12345) % 2147483647;
    const swap = seed % (index + 1);
    [options[index], options[swap]] = [options[swap], options[index]];
  }
  return {
    prompt:'Before you read why — what do you think went wrong?',
    options:options.map(cause => ({value:cause.id, label:cause.label})),
    answer:answer.id
  };
}
