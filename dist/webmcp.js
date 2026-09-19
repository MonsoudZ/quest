// Optional browser integration. Normal gameplay never depends on this API.
export function registerGameTools(api){
  const context=document.modelContext;
  if(!context?.registerTool)return {supported:false};
  const lifecycle=new AbortController();
  const tools=[
    {name:'read_signal_quest',title:'Read game state',description:'Read the active mission, its chapter and objective, the current program, completed missions, and the architecture lab design, without changing the game.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>api.read()},
    {name:'start_signal_quest_mission',title:'Start a mission',description:'Open a mission in the adventure campaign. This resets its current simulation and keeps saved code.',inputSchema:{type:'object',properties:{missionId:{type:'string'}},required:['missionId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||typeof input.missionId!=='string')throw new Error('Provide a missionId.');return api.start(input.missionId);}},
    {name:'stage_signal_quest_program',title:'Edit mission program',description:'Replace the visible code in the active coding mission (a grid mission or an algorithm mission) without running it.',inputSchema:{type:'object',properties:{source:{type:'string',maxLength:12000}},required:['source'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input||typeof input.source!=='string'||input.source.length>12000)throw new Error('Provide source of at most 12,000 characters.');return api.stage(input.source);}},
    {name:'run_signal_quest_program',title:'Run mission program',description:'Run the visible program: animate the drone trace on a grid mission, or check an algorithm mission against its test cases, and mark the mission complete if it succeeds.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async()=>api.run()}
  ];
  for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  addEventListener('pagehide',()=>lifecycle.abort(),{once:true});return {supported:true};
}
