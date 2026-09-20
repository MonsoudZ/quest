// Predict, then run.
//
// Watching correct output teaches very little; being wrong about it teaches a
// lot. Every mission that has a Run button can be asked one question first, and
// the answer is checked against what actually happened. Nothing is scored on it:
// a wrong prediction is the point, not a penalty.
import {algoKinds} from './engine.js';

const caseLabel = (level, index) => `Case ${index + 1}`;

export function question(level) {
  if (level.kind === 'code') {
    return {
      id:'grid',
      prompt:'Before you run it — what does the drone do?',
      options:[
        {value:'reached', label:'Reaches the power cell'},
        {value:'short', label:'Stops somewhere else'},
        {value:'blocked', label:'Runs out of deck'},
        {value:'error', label:'Does not run at all'}
      ]
    };
  }
  if (level.kind === 'spec') {
    return {
      id:'survivors',
      prompt:'Before you run it — how many of the broken versions survive your suite?',
      options:[
        {value:'0', label:'None of them'},
        ...level.mutants.map((mutant, index) => ({value:String(index + 1), label:index + 1 === level.mutants.length ? 'All of them' : `${index + 1}`})),
        {value:'error', label:'The suite does not run'}
      ]
    };
  }
  if (algoKinds.has(level.kind)) {
    return {
      id:'first-failure',
      prompt:'Before you run it — which case fails first?',
      options:[
        ...level.cases.map((testCase, index) => ({value:String(index), label:caseLabel(level, index)})),
        {value:'none', label:'None — they all pass'},
        {value:'error', label:'It never gets as far as the cases'}
      ]
    };
  }
  return {
    id:'verdict',
    prompt:'Before you check it — does this meet the target?',
    options:[
      {value:'meets', label:'It meets it'},
      {value:'misses', label:'It misses it'}
    ]
  };
}

// What actually happened, in the same vocabulary the question offered. `run` is
// whatever that mission kind's evaluator returned; `thrown` is set when the
// program did not run at all.
export function actual(level, run, thrown = null) {
  if (level.kind === 'code') {
    if (thrown) return 'error';
    if (!run) return null;
    if (run.state && run.state.x === level.goal[0] && run.state.y === level.goal[1]) return 'reached';
    if (/traversable tile ahead/.test(run.error ?? '')) return 'blocked';
    return 'short';
  }
  if (!run) return thrown ? 'error' : null;
  // A program that is refused before its cases run — it will not compile, it
  // declares the wrong function, it ignores what the mission insists on — never
  // reaches a case at all, and that is a distinct thing to have predicted.
  if (level.kind === 'spec') {
    if (!run.mutants?.length) return 'error';
    return String(run.mutants.filter(mutant => !mutant.caught).length);
  }
  if (algoKinds.has(level.kind)) {
    if (!run.cases?.length) return 'error';
    const first = run.cases.findIndex(entry => !entry.passed || entry.overGate);
    return first < 0 ? 'none' : String(first);
  }
  return run.success ? 'meets' : 'misses';
}

// The sentence shown afterwards. Being right is worth saying out loud; being
// wrong is worth saying more warmly, because that is where the learning is.
export function verdict(level, predicted, happened) {
  if (predicted === null || predicted === undefined || happened === null) return null;
  const asked = question(level);
  const label = value => asked.options.find(option => option.value === value)?.label ?? value;
  const right = predicted === happened;
  return {
    right,
    predicted:label(predicted),
    happened:label(happened),
    message:right
      ? `You called it: ${label(happened).toLowerCase()}.`
      : `You predicted ${label(predicted).toLowerCase()} and it ${happened === 'none' ? 'passed everything' : `was ${label(happened).toLowerCase()}`}. That gap is the useful part — work out why before you change anything.`
  };
}
