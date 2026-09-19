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
  const name = () => { const t=take(); if(!/^[A-Za-z_]\w*$/.test(t.value)) throw new Error(`Expected a name on line ${t.line}.`); return t.value; };
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
  const ast=[];while(peek()) ast.push(statement());return ast;
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
  const ast=compile(source);const env=Object.create(null);const steps=[];
  let state={x:level.start[0],y:level.start[1],dir:level.start[2]};let operations=0;
  const allowed=new Set(level.tiles.map(p=>p.join(',')));
  const number=v=>{const n=/^\d+$/.test(v)?Number(v):env[v];if(!Number.isInteger(n)||n<0||n>100)throw new Error(`“${v}” must be a whole number from 0 to 100. Declare variables with let first.`);return n;};
  const canMove=()=>{const [dx,dy]=directions[state.dir];return allowed.has(`${state.x+dx},${state.y+dy}`);};
  function record(node,label,error=null) {steps.push({...state,line:node.line,label,error});}
  function execute(items) {
    for(const node of items) {
      if(++operations>1000)throw new Error('Program too long. Try fewer repetitions.');
      if(node.type==='let'){env[node.id]=number(node.val);record(node,`${node.id} = ${env[node.id]}`);}
      else if(node.type==='for'){
        const start=number(node.start),end=number(node.end),prior=env[node.id];
        for(let j=start;j<end;j++){env[node.id]=j;execute(node.body);}if(prior===undefined)delete env[node.id];else env[node.id]=prior;
      } else if(node.type==='if') {const clear=canMove();record(node,`canMove() → ${clear}`);execute(clear!==node.negate?node.body:node.other);}
      else if(node.type==='move'){
        const count=number(node.count);
        for(let j=0;j<count;j++){
          if(steps.length>=400)throw new Error('Too many actions. Keep your program under 400 steps.');
          if(!canMove()){record(node,'Movement stopped','There’s a wall ahead. Turn before moving, or check canMove().');throw {collision:true};}
          const [dx,dy]=directions[state.dir];state={...state,x:state.x+dx,y:state.y+dy};record(node,'Moved forward');
        }
      } else {state={...state,dir:(state.dir+(node.type==='turnRight'?1:3))%4};record(node,node.type==='turnRight'?'Turned right':'Turned left');}
    }
  }
  let error=null;
  try{execute(ast);}catch(e){if(e.collision)error=steps.at(-1).error;else throw e;}
  return {steps,state,success:!error&&state.x===level.goal[0]&&state.y===level.goal[1],error};
}

export function evaluateNetwork(level, selected) {
  const edges=level.edges.filter((e,i)=>selected.includes(i));
  const reachable=(excluded=-1)=>{const found=new Set([level.source]);let changed=true;while(changed){changed=false;edges.forEach((e,i)=>{if(i===excluded)return;if(found.has(e[0])&&!found.has(e[1])){found.add(e[1]);changed=true;}if(found.has(e[1])&&!found.has(e[0])){found.add(e[0]);changed=true;}});}return found.has(level.target);};
  if(!reachable())return {success:false,message:'The signal cannot reach the destination. Connect a continuous path from uplink to archive.'};
  const cost=edges.reduce((sum,e)=>sum+e[2],0);
  if(level.maxEdges&&edges.length>level.maxEdges)return {success:false,message:`Use at most ${level.maxEdges} links. You currently have ${edges.length}.`};
  if(level.budget&&cost>level.budget)return {success:false,message:`Your links total ${cost} ms. Find a route of ${level.budget} ms or less; fewer hops can still take longer.`};
  if(level.redundant){const failure=edges.findIndex((_,i)=>!reachable(i));if(failure>=0)return {success:false,failedEdge:level.edges.indexOf(edges[failure]),message:'One cable failure can still cut off the archive. Add a second independent route.'};}
  return {success:true,cost,message:level.redundant?'Every single-cable failure leaves a working route. Your network is resilient.':`Signal delivered through ${edges.length} links${level.budget?` with ${cost} ms of total latency`:''}.`};
}
