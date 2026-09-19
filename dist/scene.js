// Isometric game renderer. Artwork is bitmap; overlays encode actual game state.
const assets = {};
for (const [name, path] of Object.entries({hangar:'./assets/station-hangar.png',tile:'./assets/deck-tile.png',drone:'./assets/repair-drone.png'})) {
  const img = new Image(); img.src = path; assets[name] = {img, ready:false};
  img.onload = () => {
    assets[name].ready = true;
    if (name === 'hangar') return;
    const scan = document.createElement('canvas'); scan.width=img.naturalWidth; scan.height=img.naturalHeight;
    const ctx=scan.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,scan.width,scan.height).data;
    let left=scan.width,top=scan.height,right=0,bottom=0;
    for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++)if(pixels[(y*scan.width+x)*4+3]>28){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
    assets[name].crop=right>=left?[left,top,right-left+1,bottom-top+1]:null;
  };
}
const project=(x,y)=>({x:500+(x-y)*59,y:185+(x+y)*29.5});
const headings=['E','S','W','N'];
const vectors=[[1,0],[0,1],[-1,0],[0,-1]];
export function createScene(container,level,initial){
  const stage=document.createElement('div');stage.className='game-scene';
  const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=980;canvas.setAttribute('role','img');
  const hud=document.createElement('div');hud.className='scene-hud';
  const compass=document.createElement('div');compass.className='scene-compass';compass.innerHTML='<span>W ↖</span><span>↗ N</span><span>S ↙</span><span>↘ E</span>';
  const stateText=document.createElement('p');stateText.className='sr-only';stateText.setAttribute('aria-live','polite');
  stage.append(canvas,hud,compass,stateText);container.replaceChildren(stage);
  const ctx=canvas.getContext('2d');let target={...initial},display={...initial},visited=[],frame=0,destroyed=false,last=0,celebrateUntil=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const walk=new Set(level.tiles.map(p=>p.join(',')));
  const diamond=(p,scale=1)=>{ctx.beginPath();ctx.moveTo(p.x,p.y-29.5*scale);ctx.lineTo(p.x+59*scale,p.y);ctx.lineTo(p.x,p.y+29.5*scale);ctx.lineTo(p.x-59*scale,p.y);ctx.closePath();};
  function sprite(name,x,y,width){const a=assets[name];if(!a.ready)return false;const c=a.crop||[0,0,a.img.naturalWidth,a.img.naturalHeight];const height=name==='tile'?width*.56:width*c[3]/c[2];ctx.drawImage(a.img,...c,x-width/2,y-height/2,width,height);return true;}
  function draw(time){
    if(destroyed)return;frame=requestAnimationFrame(draw);
    if(!stage.isConnected||stage.closest('[hidden]')||document.hidden)return;
    const delta=Math.min(80,time-last||16);last=time;
    const blend=reduced?1:1-Math.exp(-delta/85);display.x+=(target.x-display.x)*blend;display.y+=(target.y-display.y)*blend;
    ctx.setTransform(1.4,0,0,1.4,0,0);ctx.clearRect(0,0,1000,700);
    if(assets.hangar.ready){const img=assets.hangar.img;const ratio=Math.max(1000/img.naturalWidth,700/img.naturalHeight);ctx.drawImage(img,(1000-img.naturalWidth*ratio)/2,(700-img.naturalHeight*ratio)/2,img.naturalWidth*ratio,img.naturalHeight*ratio);}
    const shade=ctx.createLinearGradient(0,0,0,700);shade.addColorStop(0,'rgba(5,13,29,.28)');shade.addColorStop(.46,'rgba(4,12,24,.68)');shade.addColorStop(1,'rgba(4,10,23,.92)');ctx.fillStyle=shade;ctx.fillRect(0,0,1000,700);
    // Back-to-front order keeps deck edges and the hovering drone in perspective.
    for(let sum=0;sum<=12;sum++)for(let x=0;x<7;x++){
      const y=sum-x;if(y<0||y>6)continue;const p=project(x,y),open=walk.has(`${x},${y}`);
      if(open){ctx.globalAlpha=1;if(!sprite('tile',p.x,p.y+4,118)){diamond(p,.98);ctx.fillStyle='#254658';ctx.fill();}diamond(p,.93);ctx.strokeStyle=visited.includes(`${x},${y}`)?'#73e7ff':'rgba(136,215,239,.48)';ctx.lineWidth=visited.includes(`${x},${y}`)?2.5:1;ctx.stroke();}
      else{diamond(p,.96);ctx.fillStyle='rgba(14,32,49,.30)';ctx.fill();ctx.strokeStyle='rgba(100,164,198,.11)';ctx.lineWidth=1;ctx.stroke();}
    }
    const goal=project(...level.goal),pulse=reduced?1:.85+Math.sin(time/450)*.15;
    ctx.save();ctx.translate(goal.x,goal.y);ctx.scale(1,.5);ctx.strokeStyle='#ffd487';ctx.lineWidth=3;ctx.shadowColor='#ffbd65';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(0,0,27*pulse,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,36,0,Math.PI*2);ctx.setLineDash([4,7]);ctx.stroke();ctx.restore();
    const beam=ctx.createLinearGradient(0,goal.y-115,0,goal.y);beam.addColorStop(0,'rgba(255,198,102,0)');beam.addColorStop(1,'rgba(255,198,102,.32)');ctx.fillStyle=beam;ctx.fillRect(goal.x-13,goal.y-115,26,115);
    ctx.fillStyle='#ffe1a4';ctx.font='600 15px system-ui';ctx.textAlign='center';ctx.fillText('POWER CELL',goal.x,goal.y+49);
    const pos=project(display.x,display.y),bob=reduced?0:Math.sin(time/380)*3;
    ctx.save();ctx.translate(pos.x,pos.y+7);ctx.scale(1,.45);ctx.fillStyle='rgba(0,0,0,.6)';ctx.shadowColor='#61ddff';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(0,0,24,0,Math.PI*2);ctx.fill();ctx.restore();
    const [dx,dy]=vectors[target.dir],ahead=project(display.x+dx*.49,display.y+dy*.49),angle=Math.atan2(ahead.y-pos.y,ahead.x-pos.x);
    ctx.save();ctx.translate(ahead.x,ahead.y);ctx.rotate(angle);ctx.fillStyle='#83f2ff';ctx.shadowColor='#43d5ff';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-6,-7);ctx.lineTo(-3,0);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
    if(!sprite('drone',pos.x,pos.y-39+bob,93)){ctx.fillStyle='#8ae5ff';ctx.beginPath();ctx.arc(pos.x,pos.y-25,13,0,Math.PI*2);ctx.fill();}
    if(time<celebrateUntil&&!reduced){for(let i=0;i<28;i++){const age=(time%1400)/1400,angle=i*2.3999;ctx.fillStyle=i%2?'#83f2ff':'#ffde91';ctx.globalAlpha=1-age;ctx.beginPath();ctx.arc(pos.x+Math.cos(angle)*age*150,pos.y-20+Math.sin(angle)*age*100-age*60,2.5,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
    const vignette=ctx.createRadialGradient(500,350,210,500,350,580);vignette.addColorStop(0,'rgba(4,10,22,0)');vignette.addColorStop(1,'rgba(4,10,22,.62)');ctx.fillStyle=vignette;ctx.fillRect(0,0,1000,700);
  }
  function update(unit,path,immediate=false){target={...unit};visited=path;if(immediate)display={...unit};const description=`Drone at column ${unit.x+1}, row ${unit.y+1}, facing ${headings[unit.dir]}. Power cell at column ${level.goal[0]+1}, row ${level.goal[1]+1}.`;
    canvas.setAttribute('aria-label',description);stateText.textContent=description;hud.innerHTML=`<span>DRONE / SQ-01</span><span>COL ${unit.x+1} · ROW ${unit.y+1} · ${headings[unit.dir]}</span>`;
  }
  update(initial,[],true);frame=requestAnimationFrame(draw);
  return {update,celebrate:()=>{celebrateUntil=performance.now()+2200;},destroy:()=>{destroyed=true;cancelAnimationFrame(frame);}};
}
