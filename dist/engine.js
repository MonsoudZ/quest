// A small JavaScript teaching interpreter. User programs are parsed, never eval'd.
export function compile(source) {
  if(typeof source!=='string'||source.length>12000)throw new Error('Keep your program under 12,000 characters.');
  const tokens = [];
  const pattern = /\s+|\/\/[^\n]*|\+\+|<=|>=|===|==|[A-Za-z_]\w*|\d+|[{}();=<>!+,-]/gy;
  let offset = 0;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match) throw new Error(`Unexpected character at line ${source.slice(0, offset).split('\n').length}.`);
    if (!/^\s|^\/\//.test(match[0])) tokens.push({value:match[0],line:source.slice(0,offset).split('\n').length});
    offset = pattern.lastIndex;
  }
  let i = 0;
  const peek = () => tokens[i]?.value;
  const take = value => {
    const token = tokens[i++];
    if (!token || (value && token.value !== value)) throw new Error(`Expected ${value || 'a value'}${token ? ` on line ${token.line}, found “${token.value}”` : ' at the end of your program'}.`);
    return token;
  };
  const reserved=new Set(['let','for','if','else','const','var','true','false','null','return','function','class','new','this','while','do','break','continue','switch','case','default','try','catch','throw','delete','typeof','void','in','instanceof','with','yield','await','import','export','super','extends','debugger','move','turnLeft','turnRight','canMove']);
  const name = () => { const t=take(); if(!/^[A-Za-z_]\w*$/.test(t.value)||reserved.has(t.value)) throw new Error(`Choose a variable name that is not a keyword or game command on line ${t.line}.`); return t.value; };
  const value = () => {const t=take(); if(!/^(\d+|[A-Za-z_]\w*)$/.test(t.value)) throw new Error(`Use a number or variable on line ${t.line}.`); return t.value;};
  function block(depth=0) {
    if(depth>12) throw new Error('Keep nesting to 12 blocks or fewer.');
    take('{');const items=[];while(peek()&&peek()!=='}')items.push(statement(depth+1));take('}');return items;
  }
  function statement(depth=0) {
    const first=take(); const line=first.line;
    if(first.value==='let') {const id=name();take('=');const val=value();take(';');return {type:'let',id,val,line};}
    if(first.value==='for') {
      take('(');take('let');const id=name();take('=');const start=value();take(';');take(id);take('<');const end=value();take(';');take(id);take('++');take(')');
      return {type:'for',id,start,end,body:block(depth),line};
    }
    if(first.value==='if') {
      take('(');const negate=peek()==='!'?(take('!'),true):false;take('canMove');take('(');take(')');take(')');
      const body=block(depth);let other=[];if(peek()==='else'){take('else');other=block(depth);}return {type:'if',negate,body,other,line};
    }
    if(!['move','turnLeft','turnRight'].includes(first.value)) throw new Error(`Unknown command “${first.value}” on line ${line}. Try move(), turnLeft(), or turnRight().`);
    take('(');let count='1';if(first.value==='move'&&peek()!==')')count=value();take(')');take(';');return {type:first.value,count,line};
  }
  const ast=[];while(peek()) ast.push(statement());
  function validate(items){const names=new Set();for(const node of items){if(node.type==='let'){if(names.has(node.id))throw new Error(`“${node.id}” is already declared in this block (line ${node.line}).`);names.add(node.id);}if(node.body)validate(node.body);if(node.other)validate(node.other);}}
  validate(ast);return ast;
}

export function evaluatePuzzle(level,values){
  if(level.kind==='bits'){
    if(!Array.isArray(values)||values.length!==4||values.some(v=>v!==0&&v!==1))throw new Error('Use exactly four bits.');
    const total=values.reduce((sum,v,i)=>sum+v*[8,4,2,1][i],0);
    return {success:total===level.target,message:total===level.target?`${values.join('')}₂ = ${total}. Access code accepted.`:`Your bits encode ${total}. Adjust the switches to encode ${level.target}.`};
  }
  if(level.kind==='sort'){
    if(!Array.isArray(values)||JSON.stringify([...values].sort((a,b)=>a-b))!==JSON.stringify([...level.values].sort((a,b)=>a-b)))throw new Error('Keep all of the original array entries.');
    const ordered=values.every((v,i)=>i===0||values[i-1]<=v);
    return {success:ordered,message:ordered?'Every entry is at least as large as the one before it. Archive index restored.':'Some adjacent entries are still out of order. Look for a larger value on the left of a smaller one.'};
  }
  throw new Error('Unknown puzzle.');
}

export const directions=[[1,0],[0,1],[-1,0],[0,-1]];
export function simulate(level, source) {
  const ast=compile(source),steps=[],uninitialized=Symbol('uninitialized');
  const stats={loopMoves:0,conditionalMoves:0,variableMoves:new Map()};
  let state={x:level.start[0],y:level.start[1],dir:level.start[2]},operations=0;
  const allowed=new Set(level.tiles.map(p=>p.join(',')));
  function scope(items,parent=null){return {parent,values:new Map(items.filter(n=>n.type==='let').map(n=>[n.id,uninitialized]))};}
  function read(id,env){if(!env)throw new Error(`“${id}” is not defined here. Declare variables with let first; a block’s variables stay inside that block.`);if(env.values.has(id)){const n=env.values.get(id);if(n===uninitialized)throw new Error(`Cannot use “${id}” before its let declaration has initialized it.`);return n;}return read(id,env.parent);}
  function number(value,env){const n=/^\d+$/.test(value)?Number(value):read(value,env);if(!Number.isInteger(n)||n<0||n>100)throw new Error(`This game accepts whole numbers from 0 to 100. JavaScript itself supports other numbers.`);return n;}
  const canMove=()=>{const [dx,dy]=directions[state.dir];return allowed.has(`${state.x+dx},${state.y+dy}`);};
  function budget(){if(++operations>1000)throw new Error('Program too long. Try fewer repetitions.');}
  function record(node,label,error=null){if(steps.length>=400)throw new Error('Program too long. Keep the trace under 400 steps.');steps.push({...state,line:node.line,label,error});}
  function execute(items,parent=null,loopDepth=0,conditionDepth=0){
    const env=scope(items,parent);
    for(const node of items){
      budget();
      if(node.type==='let'){const n=number(node.val,env);env.values.set(node.id,n);record(node,`${node.id} = ${n}`);}
      else if(node.type==='for'){
        const loop={parent:env,values:new Map([[node.id,uninitialized]])};
        loop.values.set(node.id,number(node.start,loop));
        while(read(node.id,loop)<number(node.end,loop)){budget();execute(node.body,loop,loopDepth+1,conditionDepth);loop.values.set(node.id,read(node.id,loop)+1);}
      }else if(node.type==='if'){
        const clear=canMove();record(node,`canMove() → ${clear}`);execute(clear!==node.negate?node.body:node.other,env,loopDepth,conditionDepth+1);
      }else if(node.type==='move'){
        const count=number(node.count,env);
        if(count>0&&!/^\d+$/.test(node.count))stats.variableMoves.set(node.count,(stats.variableMoves.get(node.count)||0)+1);
        for(let j=0;j<count;j++){
          if(!canMove()){record(node,'Movement stopped','There’s no traversable tile ahead. Turn before moving, or check canMove().');throw {collision:true};}
          const [dx,dy]=directions[state.dir];state={...state,x:state.x+dx,y:state.y+dy};
          if(loopDepth)stats.loopMoves++;if(conditionDepth)stats.conditionalMoves++;record(node,'Moved forward');
        }
      }else{state={...state,dir:(state.dir+(node.type==='turnRight'?1:3))%4};record(node,node.type==='turnRight'?'Turned right':'Turned left');}
    }
  }
  let error=null;
  try{execute(ast);}catch(e){if(e.collision)error=steps.at(-1).error;else throw e;}
  const reached=state.x===level.goal[0]&&state.y===level.goal[1];
  if(reached&&!error){
    if(level.require==='loop'&&!stats.loopMoves)error='You reached the cell. Now put movement inside a for loop to complete the loop lesson.';
    if(level.require==='variable'&&![...stats.variableMoves.values()].some(n=>n>=2))error='You reached the cell. Reuse the same named distance in both move calls to complete the variable lesson.';
    if(level.require==='conditional'&&!stats.conditionalMoves)error='You reached the cell. Use if (canMove()) to decide when to move and complete this lesson.';
  }
  return {steps,state,success:!error&&reached,error};
}

export function evaluateNetwork(level, selected) {
  if(!Array.isArray(selected)||selected.some(i=>!Number.isInteger(i)||!level.edges[i]))throw new Error('Choose valid links.');
  const active=new Set(selected),dist=new Map([[level.source,0]]),previous=new Map(),pending=new Set(level.nodes.map(n=>n[0]));
  while(pending.size){
    const node=[...pending].reduce((best,n)=>(dist.get(n)??Infinity)<(dist.get(best)??Infinity)?n:best);
    if(!Number.isFinite(dist.get(node)))break;pending.delete(node);if(node===level.target)break;
    for(const i of active){const [a,b,weight]=level.edges[i],neighbor=a===node?b:b===node?a:null;if(!neighbor||!pending.has(neighbor))continue;
      const candidate=dist.get(node)+(level.budget?weight:1);if(candidate<(dist.get(neighbor)??Infinity)){dist.set(neighbor,candidate);previous.set(neighbor,{node,index:i});}
    }
  }
  if(!dist.has(level.target))return {success:false,path:[],pathEdges:[],cost:null,message:'The signal cannot reach the archive. Enable a continuous path from uplink to archive.'};
  const path=[level.target],pathEdges=[];let cursor=level.target;
  while(cursor!==level.source){const step=previous.get(cursor);pathEdges.unshift(step.index);path.unshift(step.node);cursor=step.node;}
  const cost=pathEdges.reduce((sum,i)=>sum+level.edges[i][2],0),result={path,pathEdges,cost,hops:pathEdges.length};
  if(level.maxEdges&&result.hops>level.maxEdges)return {...result,success:false,message:`The shortest enabled route has ${result.hops} hops. Find one with at most ${level.maxEdges}.`};
  if(level.budget&&cost>level.budget)return {...result,success:false,message:`The fastest enabled route takes ${cost} ms. Find one at or below ${level.budget} ms. Fewer hops can still take longer.`};
  return {...result,success:true,message:`Signal delivered in ${result.hops} hops${level.budget?` with ${cost} ms of modelled path latency`:''}. Only the links used by this route count.`};
}
