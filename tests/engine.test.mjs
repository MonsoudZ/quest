import test from 'node:test';
import assert from 'node:assert/strict';
import {compile,simulate,evaluateNetwork,evaluatePuzzle} from '../dist/engine.js';
import {levels} from '../dist/levels.js';
import {evaluateBuild,contracts} from '../dist/builder.js';

test('every published mission has a working solution',()=>{
  for(const level of levels){const result=level.kind==='code'?simulate(level,level.solution):level.kind==='network'?evaluateNetwork(level,level.solution):evaluatePuzzle(level,level.solution);assert.equal(result.success,true,level.id);}
});
test('a collision reports the responsible line and never moves through a wall',()=>{
  const result=simulate(levels[0],'move(5);');assert.equal(result.success,false);assert.equal(result.state.x,5);assert.equal(result.steps.at(-1).line,1);assert.match(result.error,/no traversable tile/);
});
test('syntax errors and arbitrary JavaScript are rejected without execution',()=>{
  assert.throws(()=>compile('move(3)'),/Expected/);assert.throws(()=>compile('alert(1);'),/Unknown command/);assert.throws(()=>compile('window.location = 2;'),/Unexpected character/);assert.throws(()=>compile('x'.repeat(12001)),/12,000/);
});
test('loops, named distances, and sensor branches reach their goals',()=>{
  assert.equal(simulate(levels[2],levels[2].solution).steps.filter(s=>s.label==='Moved forward').length,9);
  assert.equal(simulate(levels[3],levels[3].solution).success,true);
  const trace=simulate(levels[4],levels[4].solution);assert.equal(trace.success,true);assert.ok(trace.steps.some(s=>s.label==='canMove() → false'));
});
test('unknown variables and excessive repeated work fail safely',()=>{
  assert.throws(()=>simulate(levels[0],'move(missing);'),/Declare variables/);
  assert.throws(()=>simulate(levels[0],'for (let i = 0; i < 100; i++) { for (let j = 0; j < 100; j++) { turnLeft(); } }'),/too long/);
});
test('path validation rejects disconnected and overly expensive graphs',()=>{
  const hops=levels.find(l=>l.id==='fewest-hops'),weighted=levels.find(l=>l.id==='latency-matters');
  assert.equal(evaluateNetwork(hops,[0]).success,false);assert.equal(evaluateNetwork(hops,[2,3,4]).success,false);assert.equal(evaluateNetwork(weighted,[0,1]).success,false);assert.equal(evaluateNetwork(weighted,[2,3,4]).cost,10);
});
test('puzzles reject wrong answers and invalid data',()=>{
  const bits=levels.find(l=>l.kind==='bits'),sort=levels.find(l=>l.kind==='sort');
  assert.equal(evaluatePuzzle(bits,[1,0,1,1]).success,false);assert.equal(evaluatePuzzle(bits,[1,1,0,1]).success,true);assert.equal(evaluatePuzzle(sort,sort.values).success,false);assert.throws(()=>evaluatePuzzle(sort,[1,2,3,4,5]),/original/);
});
test('builder models bottlenecks, budgets, and every contract',()=>{
  assert.equal(evaluateBuild({cpu:2,memory:0,storage:0},1).throughput,2);
  assert.equal(evaluateBuild({cpu:2,memory:2,storage:2},0).overBudget,true);
  contracts.forEach((_,i)=>assert.equal(evaluateBuild({cpu:i,memory:i,storage:i},i).success,true));
  assert.throws(()=>evaluateBuild({cpu:99,memory:0,storage:0},0),/valid component/);
});
