import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {simulate,compile,evaluateNetwork,directions} from '../dist/engine.js';
import {levels} from '../dist/levels.js';
import {evaluateBuild,components} from '../dist/builder.js';

const room={start:[0,0,0],goal:[6,6],tiles:Array.from({length:49},(_,i)=>[i%7,Math.floor(i/7)])};
function native(source){
  const state={x:0,y:0,dir:0};
  const canMove=()=>{const [dx,dy]=directions[state.dir];return state.x+dx>=0&&state.x+dx<7&&state.y+dy>=0&&state.y+dy<7;};
  // Only fixed test strings run here. The actual game never executes native user code.
  runInNewContext(source,{
    move:(n=1)=>{for(let i=0;i<n;i++){if(!canMove())throw new Error('collision');const [dx,dy]=directions[state.dir];state.x+=dx;state.y+=dy;}},
    turnLeft:()=>{state.dir=(state.dir+3)%4;},turnRight:()=>{state.dir=(state.dir+1)%4;},canMove
  },{timeout:100});
  return state;
}
test('block shadowing and for-counter lifetime agree with real JavaScript',()=>{
  for(const source of [
    'let n=2; if(canMove()){let n=1;move(n);}move(n);',
    'let n=1; for(let i=0;i<3;i++){let n=1;move(n);}move(n);',
    'let i=2; for(let i=0;i<1;i++){move();}move(i);',
    'for(let i=0;i<i;i++){move();}move();',
    'let n=1; if(!canMove()){let hidden=2;}move(n);'
  ])assert.deepEqual(simulate(room,source).state,native(source),source);
});
test('scope leaks, temporal dead zones, and duplicate declarations are rejected',()=>{
  for(const source of [
    'if(canMove()){let n=2;}move(n);',
    'let n=2;if(canMove()){let n=n;move(n);}',
    'move(n);let n=2;',
    'for(let i=0;i<1;i++){move();}move(i);',
    'if(!canMove()){let n=1;let n=2;}'
  ]){assert.throws(()=>native(source));assert.throws(()=>simulate(room,source));}
  assert.throws(()=>compile('let for=2;'),/keyword/);
});
test('lesson completion requires using the concept, not only reaching the cell',()=>{
  const variables=levels.find(l=>l.require==='variable'),conditions=levels.find(l=>l.require==='conditional'),loops=levels.find(l=>l.require==='loop');
  assert.equal(simulate(variables,'move(4);turnRight();move(4);').success,false);
  assert.equal(simulate(conditions,'move(3);turnRight();move(4);').success,false);
  assert.equal(simulate(loops,'move(2);turnLeft();move();turnRight();'.repeat(3)).success,false);
  for(const l of [variables,conditions,loops])assert.equal(simulate(l,l.solution).success,true);
});
test('every enabled graph configuration matches independent path enumeration',()=>{
  for(const level of levels.filter(l=>l.kind==='network'))for(let mask=0;mask<2**level.edges.length;mask++){
    const selected=level.edges.map((_,i)=>i).filter(i=>mask&(1<<i));let best=Infinity;
    function visit(node,seen,cost){if(node===level.target){best=Math.min(best,cost);return;}for(const i of selected){const [a,b,w]=level.edges[i],next=a===node?b:b===node?a:null;if(next&&!seen.has(next))visit(next,new Set([...seen,next]),cost+(level.budget?w:1));}}
    visit(level.source,new Set([level.source]),0);
    const result=evaluateNetwork(level,selected);
    assert.equal(result.path.length>0,Number.isFinite(best),`${level.id} mask=${mask}`);
    if(Number.isFinite(best))assert.equal(level.budget?result.cost:result.hops,best);
    assert.equal(result.success,best<=(level.budget||level.maxEdges));
  }
});
test('unused enabled links do not increase the selected route cost',()=>{
  const l=levels.find(l=>l.budget),result=evaluateNetwork(l,[0,1,2,3,4]);
  assert.equal(result.cost,10);assert.deepEqual(result.pathEdges,[2,3,4]);assert.equal(result.success,true);
});
test('pipeline rates agree with an independent job-scheduling simulation',()=>{
  for(let cpu=0;cpu<3;cpu++)for(let memory=0;memory<3;memory++)for(let storage=0;storage<3;storage++){
    const chosen={cpu,memory,storage},result=evaluateBuild(chosen,2),times=Object.keys(chosen).map(k=>1/components[k][chosen[k]].capacity);
    const available=[0,0,0],finishes=[];
    for(let job=0;job<20;job++){let arrival=0;for(let stage=0;stage<3;stage++){available[stage]=Math.max(available[stage],arrival)+times[stage];arrival=available[stage];}finishes.push(arrival);}
    assert.equal(result.latency,finishes[0]);assert.equal(result.throughput,1/(finishes[19]-finishes[18]));
  }
});
