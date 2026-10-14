'use strict';
// The accepted pointer trace is the cut edge. The guide only judges proximity and forward progress.
YL.interact.cut=async function(step,scope){
 this.ready(step);
 const A=YL.art,svg=YL.game.svg,key=step.object,finalBox=A.boxes[key];
 const box=key==='wall'?{x:30,y:378,w:315,h:100}:{...(step.cutBox||finalBox)};
 const sheet={x:22,y:338,w:331,h:190},task=A.svg('g',{'data-task':'cut'},svg);
 YL.$(`[data-object="${key}"]`,svg)?.remove();
 const sheetD=`M22 340L75 338L133 340L196 338L259 341L327 339L353 342L351 390L353 439L350 486L352 526L293 528L231 526L166 529L101 526L23 528L25 477L22 425L24 378Z`;
 const paper=A.svg('path',{class:'paper-blank',d:sheetD,fill:'url(#redPaper)',filter:'url(#paperLift)'},task);
 const outline=A.path(key,box),guide=A.svg('path',{class:'guide cut-guide',d:outline},task);
 const total=guide.getTotalLength(),N=300;
 const refs=Array.from({length:N+1},(_,i)=>guide.getPointAtLength(total*i/N));
 const start=refs[0],halo=A.svg('circle',{class:'start-halo',cx:start.x,cy:start.y,r:12},task);
 const dot=A.svg('circle',{class:'start-dot',cx:start.x,cy:start.y,r:5},task);
 const seamShadow=A.svg('path',{class:'actual-cut-shadow',d:'',fill:'none',stroke:'#762518','stroke-width':3.5,'stroke-linecap':'round','stroke-linejoin':'round'},task);
 const seam=A.svg('path',{class:'actual-cut-seam',d:'',fill:'none',stroke:'#F4EBDD','stroke-width':1.65,'stroke-linecap':'round','stroke-linejoin':'round'},task);
 const scissors=A.scissors(task,start.x,start.y);
 const track=YL.$('#progress-track');track.hidden=false;YL.$('#progress-bar').style.width='0%';
 let idx=0,dragging=false,finished=false,lastNoise=-100,activePointer=null,failed=false,badSince=null,badTravel=0,lastRaw=null;
 let trace=[],tip={x:start.x,y:start.y};
 const pathFor=(points,close=false,precision=2)=>points.map((p,i)=>(i?'L':'M')+p.x.toFixed(precision)+','+p.y.toFixed(precision)).join(' ')+(close?'Z':'');
 const clearDrift=()=>{badSince=null;badTravel=0;};
 const paint=()=>{const d=pathFor(trace);seam.setAttribute('d',d);seamShadow.setAttribute('d',d);YL.$('#progress-bar').style.width=(100*idx/N).toFixed(1)+'%';};
 await scope.promise(done=>{
  const resetAttempt=()=>{idx=0;trace=[];tip={x:start.x,y:start.y};dragging=false;activePointer=null;lastRaw=null;failed=false;clearDrift();scissors.setAttribute('transform',`translate(${start.x},${start.y})`);scissors.style.opacity='1';paint();YL.game.setHint(step.hint||'');YL.game.skipper=()=>finish(true);};
  const fail=async()=>{
   if(finished||failed||scope.signal.aborted)return;failed=true;dragging=false;
   if(activePointer!==null&&svg.hasPointerCapture?.(activePointer))svg.releasePointerCapture(activePointer);
   activePointer=null;YL.game.skipper=null;scissors.style.opacity='.45';
   const choice=await YL.ui.modal({kicker:'换张纸，再试一次',title:'这一剪走远了',body:'<p>剪口离开轮廓太远了。这次没有完成，换张红纸，沿虚线慢慢剪。</p><p>小幅偏离没关系，松手后也能接着剪。</p>',className:'cut-failure',close:false,buttons:[{label:'重新剪',value:'retry'},{label:'辅助完成',value:'assist',secondary:true}]});
   if(scope.signal.aborted)return;if(choice==='assist'){failed=false;finish(true);}else resetAttempt();
  };
  const driftTick=()=>{if(dragging&&!failed&&badSince!==null&&badTravel>=20&&scope.time-badSince>=550)fail();};scope.pending.add(driftTick);scope.cleanup(()=>scope.pending.delete(driftTick));
  const finish=async(assisted=false)=>{
   if(finished||failed||scope.signal.aborted)return;finished=true;dragging=false;YL.game.skipper=null;
   if(assisted){trace=refs.map(p=>({x:p.x,y:p.y}));idx=N;}else{idx=N;}
   paint();guide.remove();dot.remove();halo.remove();scissors.remove();seam.remove();seamShadow.remove();paper.remove();
   // Preserve the player's edge in normalized object coordinates, including after dragging and snapping.
   const normalized=trace.map(p=>({x:(p.x-box.x)/box.w,y:(p.y-box.y)/box.h}));
   const cut={path:pathFor(normalized,true,5),points:normalized.map(p=>[+p.x.toFixed(5),+p.y.toFixed(5)]),assisted};
   YL.game.cuts[key]=cut;
   YL.store.data.handCuts=YL.store.data.handCuts||{};YL.store.data.handCuts[key]={points:cut.points,assisted};
   const d=pathFor(trace,true),offcuts=A.svg('g',{'pointer-events':'none'},task);
   const defs=A.svg('defs',{},offcuts),sheets=[];
   const quadrants=[{x:0,y:330,w:188,h:104,dx:-30,rot:-8},{x:188,y:330,w:188,h:104,dx:35,rot:9},{x:0,y:434,w:188,h:115,dx:-25,rot:-6},{x:188,y:434,w:188,h:115,dx:28,rot:12}];
   quadrants.forEach((q,i)=>{const id='offcut-'+key+'-'+i,c=A.svg('clipPath',{id},defs);A.svg('rect',{x:q.x,y:q.y,width:q.w,height:q.h},c);const part=A.svg('g',{'clip-path':`url(#${id})`},offcuts);A.svg('path',{d:sheetD+' '+d,'fill-rule':'evenodd',fill:'url(#redPaper)',filter:'url(#paperLift)'},part);sheets.push({part,q});});
   const result=A.result(task,key,box,cut);result.setAttribute('opacity',0);
   const retained=A.svg('path',{class:'retained-paper',d,fill:'url(#redPaper)',filter:'url(#paperLift)'},task);
   YL.audio.page();YL.store.data.cuts++;YL.store.save();
   try{
    await scope.animate(800,k=>{const ease=k*k;for(const{part,q}of sheets){part.setAttribute('transform',`translate(${q.dx*ease},${90*ease}) rotate(${q.rot*ease},187,435)`);part.setAttribute('opacity',Math.max(0,1-k*1.3));}const reveal=Math.max(0,(k-.27)/.73);result.setAttribute('opacity',reveal);retained.setAttribute('opacity',1-reveal);retained.setAttribute('transform',`translate(187,435) scale(${1+Math.sin(k*Math.PI)*.025}) translate(-187,-435)`);});
    offcuts.remove();retained.remove();YL.audio.win();A.particles(svg,box.x+box.w*.7,box.y+box.h*.7,scope);
    if(key==='wall'||step.cutBox){await scope.animate(600,k=>{const e=1-(1-k)**3;result.setAttribute('transform',`translate(${box.x+(finalBox.x-box.x)*e},${box.y+(finalBox.y-box.y)*e}) scale(${box.w+(finalBox.w-box.w)*e},${box.h+(finalBox.h-box.h)*e})`);});}
    await scope.wait(180);task.setAttribute('data-object',key);task.removeAttribute('data-task');track.hidden=true;YL.game.visual[key]=true;done();
   }catch{}
  };
  const accept=p=>{
   let best=idx,dist=Infinity;for(let j=Math.max(0,idx-2);j<=Math.min(N,idx+22);j++){const d=Math.hypot(p.x-refs[j].x,p.y-refs[j].y);if(d<dist){dist=d;best=j;}}
   // Contour corridor rejects shortcuts and large deviations. It never snaps the actual edge onto the guide.
   if(dist>16||best<idx-2)return false;
   idx=Math.max(idx,best);const moved=Math.hypot(p.x-tip.x,p.y-tip.y);
   if(moved>.75){trace.push({x:p.x,y:p.y});tip={x:p.x,y:p.y};}
   return true;
  };
  scope.event(svg,'pointerdown',e=>{
   if(finished||failed||YL.game.paused||dragging)return;const p=this.point(svg,e),distance=Math.hypot(p.x-tip.x,p.y-tip.y);
   if(distance>(trace.length?25:23)){return;}
   if(!trace.length){const d=Math.hypot(p.x-start.x,p.y-start.y);if(d>18){return;}tip=p;trace.push({...p});}
   dragging=true;clearDrift();lastRaw={...p};activePointer=e.pointerId;svg.setPointerCapture?.(e.pointerId);scissors.style.opacity='1';YL.audio.cut();e.preventDefault();
  });
  scope.event(svg,'pointermove',e=>{
   if(!dragging||finished||failed||YL.game.paused||e.pointerId!==activePointer)return;const p=this.point(svg,e),from={...tip},distance=Math.hypot(p.x-from.x,p.y-from.y);
   let okay=true;const steps=Math.ceil(distance/3);for(let j=1;j<=steps;j++){if(!accept({x:from.x+(p.x-from.x)*j/steps,y:from.y+(p.y-from.y)*j/steps})){okay=false;break;}}
   scissors.setAttribute('transform',`translate(${tip.x},${tip.y})`);scissors.style.opacity=okay?'1':'.45';paint();
   // Minor slips are recoverable; only substantial out-of-corridor travel fails the attempt.
   const rawTravel=lastRaw?Math.hypot(p.x-lastRaw.x,p.y-lastRaw.y):0;lastRaw={...p};
   if(okay){clearDrift();}else{let corridor=Infinity;for(let j=Math.max(0,idx-2);j<=Math.min(N,idx+22);j++)corridor=Math.min(corridor,Math.hypot(p.x-refs[j].x,p.y-refs[j].y));if(corridor>29){if(badSince===null)badSince=scope.time;badTravel+=rawTravel;if(badTravel>=72){fail();e.preventDefault();return;}}else clearDrift();}
   if(okay&&scope.time-lastNoise>90){lastNoise=scope.time;YL.audio.cut();}
   if(idx>=N-2&&Math.hypot(tip.x-trace[0].x,tip.y-trace[0].y)<22)finish(false);e.preventDefault();
  });
  const up=e=>{if(e.pointerId!==activePointer)return;dragging=false;activePointer=null;lastRaw=null;clearDrift();};scope.event(svg,'pointerup',up);scope.event(svg,'pointercancel',up);
  YL.game.skipper=()=>finish(true);
 });
};
