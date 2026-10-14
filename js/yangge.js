'use strict';
// Chapter-three mechanisms use the same cancellable, pause-aware Scope as cutting and dragging.
YL.art.prepareDancer=function(){
 const actor=YL.$('[data-object="dancer"]',YL.game.svg);if(!actor||actor.dataset.articulated)return;const print=YL.$('.cut-result',actor);if(!print)return;actor.dataset.articulated='true';
 const A=this,B=A.boxes.dancer,defs=A.svg('defs',{},actor),id='puppet-print-'+(++A.puppetId||(A.puppetId=1));print.id=id;defs.append(print);
 const leftArm=[[0,0],[.25,0],[.25,.15],[.37,.21],[.37,.31],[.31,.34],[0,.34]],rightArm=[[1,0],[.70,0],[.62,.20],[.67,.32],[.68,.44],[1,.52]],leftLeg=[[0,.45],[.49,.45],[.50,1],[0,1]],rightLeg=[[.49,.45],[1,.45],[1,1],[.50,1]];
 const polygon=pts=>pts.map(([x,y],i)=>(i?'L':'M')+(B.x+x*B.w)+','+(B.y+y*B.h)).join(' ')+'Z';
 const piece=(name,pts,parent=actor)=>{const cid=id+'-'+name,clip=A.svg('clipPath',{id:cid,clipPathUnits:'userSpaceOnUse'},defs);A.svg('path',{d:polygon(pts)},clip);const g=A.svg('g',{'data-limb':name},parent);A.svg('use',{href:'#'+id,'clip-path':`url(#${cid})`},g);return g;};
 const mask=A.svg('mask',{id:id+'-torso',maskUnits:'userSpaceOnUse',x:0,y:0,width:375,height:667},defs);A.svg('rect',{width:375,height:667,fill:'white'},mask);for(const pts of[leftArm,rightArm,leftLeg,rightLeg])A.svg('path',{d:polygon(pts),fill:'black'},mask);const torso=A.svg('g',{'data-limb':'torso'},actor);A.svg('use',{href:'#'+id,mask:`url(#${id}-torso)`},torso);
 const la=piece('leftArm',leftArm),ra=piece('rightArm',rightArm);
 for(const[name,leg,knee]of[['leftLeg',leftLeg,.74],['rightLeg',rightLeg,.75]]){const group=A.svg('g',{'data-limb':name},actor),upper=leg.map(([x,y])=>[x,Math.min(y,knee)]),lower=leg.map(([x,y])=>[x,Math.max(y,knee)]);piece(name+'Upper',upper,group);piece(name+'Shin',lower,group);}
 const fan=YL.$('[data-prop="fan"]',actor),ribbon=YL.$('[data-prop="ribbon"]',actor);if(fan)la.append(fan);if(ribbon)ra.append(ribbon);
};
YL.art.poseDancer=function(phase,amplitude=1){
 this.prepareDancer();const actor=YL.$('[data-object="dancer"]',YL.game.svg);if(!actor)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,a=reduced?.15:amplitude,L=Math.max(0,Math.sin(phase)),R=Math.max(0,-Math.sin(phase)),B=this.boxes.dancer;
 const rotate=(name,angle,x,y,dx=0,dy=0)=>YL.$(`[data-limb="${name}"]`,actor)?.setAttribute('transform',`translate(${dx*a},${dy*a}) rotate(${angle*a},${B.x+x*B.w},${B.y+y*B.h})`);
 actor.setAttribute('transform',`translate(${Math.sin(phase/2)*7*a},${-(L+R)*2*a}) rotate(${Math.sin(phase/2)*2*a},190,475)`);
 rotate('torso',Math.sin(phase)*2,.5,.45);rotate('leftArm',-13*Math.sin(phase+.5),.36,.23);rotate('rightArm',11*Math.sin(phase+1.4),.65,.25);
 rotate('leftLeg',-10*L+3*R,.43,.46,-2*L,-5*L);rotate('rightLeg',10*R-3*L,.58,.46,2*R,-5*R);rotate('leftLegShin',15*L,.35,.74);rotate('rightLegShin',-15*R,.64,.75);
 for(const key of ['fan','ribbon']){const n=YL.$(`[data-prop-art="${key}"]`,actor),b=this.boxes[key+'Placed'];if(n){const px=key==='fan'?b.x+b.w/2:b.x+4,py=key==='fan'?b.y+b.h-4:b.y+4;n.setAttribute('transform',`rotate(${Math.sin(phase+(key==='fan'?0:1))*15*a},${px},${py})`);}}
};
YL.art.restDancer=function(){const a=YL.$('[data-object="dancer"]',YL.game.svg);a?.removeAttribute('transform');for(const n of a?.querySelectorAll('[data-prop-art],[data-limb]')||[])n.removeAttribute('transform');};
YL.audio.drum=function(strong=false){this.tone(strong?98:147,.14,0,strong?.16:.1,'triangle');this.noise(.035,strong?.06:.035);};
YL.interact.costume=async function(step,scope){
 this.ready(step);const A=YL.art,svg=YL.game.svg,actor=YL.$('[data-object="dancer"]',svg),task=A.svg('g',{'data-task':'costume'},svg);
 if(!actor)throw Error('Missing dancer');let active=null,finished=false;
 const records=['fan','ribbon'].map(key=>{const home=A.boxes[key],target=A.boxes[key+'Placed'],slot=A.svg('g',{class:'prop-slot','data-prop-target':key,'pointer-events':'none'},task);A.svg('path',{d:A.path(key,target),class:'prop-target'},slot);

 const node=A.svg('g',{class:'movable',role:'button',tabindex:0,'aria-label':key==='fan'?'拖动扇子到舞者左手，或按回车放置':'拖动红绸到舞者右手，或按回车放置','data-prop':key},task),art=A.svg('g',{'data-prop-art':key},node);A.image(art,key,{x:0,y:0,w:home.w,h:home.h});const hit=A.svg('rect',{x:-6,y:-6,width:home.w+12,height:home.h+12,fill:'transparent'},node);
 const r={key,home,target,slot,node,art,hit,pos:{x:home.x,y:home.y},offset:{x:0,y:0},placed:false,settling:false,pointer:null};node.setAttribute('transform',`translate(${home.x},${home.y})`);return r;});
 const distance=r=>Math.hypot(r.pos.x+r.home.w/2-r.target.x-r.target.w/2,r.pos.y+r.home.h/2-r.target.y-r.target.h/2);
 await scope.promise(done=>{
  const finish=async()=>{if(finished||!records.every(r=>r.placed))return;finished=true;YL.game.skipper=null;try{await scope.wait(180);task.remove();YL.game.setHint('扇与绸，都到手上了');done();}catch{}};
  const place=async r=>{if(r.placed||r.settling||scope.signal.aborted)return;r.settling=true;r.node.style.pointerEvents='none';r.slot.remove();r.hit.remove();const from={...r.pos};try{await scope.animate(320,k=>{const e=1-(1-k)**3;r.pos={x:from.x+(r.target.x-from.x)*e,y:from.y+(r.target.y-from.y)*e};r.node.setAttribute('transform',`translate(${r.pos.x},${r.pos.y}) scale(${1+(r.target.w/r.home.w-1)*e},${1+(r.target.h/r.home.h-1)*e})`);});
   // Use global coordinates inside the actor so the body and both props move together.
   r.art.replaceChildren();A.image(r.art,r.key,r.target);r.node.removeAttribute('transform');r.node.setAttribute('aria-disabled','true');r.node.removeAttribute('tabindex');actor.append(r.node);r.placed=true;r.settling=false;YL.game.visual[r.key]=true;YL.audio.snap();finish();}catch{}};
  for(const r of records){scope.event(r.node,'pointerdown',e=>{if(finished||YL.game.paused||active||r.placed||r.settling)return;e.stopPropagation();const p=this.point(svg,e);r.offset={x:p.x-r.pos.x,y:p.y-r.pos.y};r.pointer=e.pointerId;active=r;svg.setPointerCapture?.(e.pointerId);e.preventDefault();});scope.event(r.node,'keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!YL.game.paused){e.preventDefault();place(r);}});}
  scope.event(svg,'pointermove',e=>{const r=active;if(!r||YL.game.paused||r.pointer!==e.pointerId)return;const p=this.point(svg,e);r.pos={x:p.x-r.offset.x,y:p.y-r.offset.y};r.node.setAttribute('transform',`translate(${r.pos.x},${r.pos.y})`);r.slot.classList.toggle('near',distance(r)<65);e.preventDefault();});
  const release=async e=>{const r=active;if(!r||r.pointer!==e.pointerId)return;active=null;r.pointer=null;if(e.type!=='pointercancel'&&distance(r)<44){place(r);return;}r.settling=true;const from={...r.pos};try{await scope.animate(240,k=>{r.pos={x:from.x+(r.home.x-from.x)*k,y:from.y+(r.home.y-from.y)*k};r.node.setAttribute('transform',`translate(${r.pos.x},${r.pos.y})`);});r.settling=false;r.slot.classList.remove('near');}catch{}};
  scope.event(svg,'pointerup',release);scope.event(svg,'pointercancel',release);YL.game.skipper=()=>{active=null;for(const r of records)place(r);};
 });
};
YL.audio.prepareYangge=async function(){
 this.init();if(!this.ctx)return null;if(this.yanggeBuffer)return this.yanggeBuffer;
 if(!this.yanggePromise)this.yanggePromise=fetch(YL.yanggeScore.audio).then(r=>{if(!r.ok)throw Error('Music load failed');return r.arrayBuffer();}).then(b=>this.ctx.decodeAudioData(b)).then(b=>this.yanggeBuffer=b).catch(e=>{this.yanggePromise=null;throw e;});return this.yanggePromise;
};
YL.audio.startYangge=function(scope){
 const ctx=this.ctx,buffer=this.yanggeBuffer;if(!ctx||!buffer){const origin=scope.time;return{time:()=>scope.time-origin,stop:()=>{}};}
 this.unlock();const source=ctx.createBufferSource();source.buffer=buffer;source.connect(this.master);const origin=ctx.currentTime+.06,latency=Math.min(.12,(ctx.baseLatency||0)+(ctx.outputLatency||0));source.start(origin);this.yanggeSource=source;let stopped=false;
 return{time:()=>Math.max(0,(ctx.currentTime-origin-latency)*1000),stop:()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}source.disconnect();if(this.yanggeSource===source)this.yanggeSource=null;}};
};
YL.interact.rhythm=async function(step,scope){
 this.ready(step);YL.game.setHint('连拍与停顿，跟随锣鼓点屏');await YL.audio.prepareYangge();if(scope.signal.aborted)throw YL.abortError();
 const score=YL.yanggeScore,svg=YL.game.svg,A=YL.art,screen=YL.$('#game-screen');screen.classList.add('rhythm-mode');
 const count=score.notes.length,g=A.svg('g',{'data-task':'rhythm',role:'button',tabindex:0,'aria-label':'跟随秧歌音乐点击，二十个快慢拍点'},svg);
 A.svg('rect',{x:20,y:565,width:335,height:88,rx:4,fill:'#F4EBDD'},g);A.svg('path',{d:'M35 585H340',stroke:'#24221E30','stroke-width':1},g);
 const ring=A.svg('circle',{cx:187.5,cy:585,r:19,class:'rhythm-ring'},g),dots=score.notes.map(()=>A.svg('circle',{cx:338,cy:585,r:5.5,fill:'#D83A25','pointer-events':'none',opacity:0},g));
 const marks=score.notes.map((_,i)=>A.svg('circle',{cx:187.5+(i-(count-1)/2)*10,cy:622,r:3,fill:'#F4EBDD',stroke:'#24221E60','stroke-width':.8},g));
 const label=A.svg('text',{x:187.5,y:648,'text-anchor':'middle','font-size':12},g);
 const state=YL.game.rhythmState={attempt:0,phase:'ready',hits:0,misses:0,wrong:0,total:count,required:score.required,maxWrong:score.maxWrong,notes:[],time:0};let transport=null,finished=false,lastFlash=-1000,lastHit=-1000;
 scope.cleanup(()=>{transport?.stop();state.phase='ended';screen.classList.remove('rhythm-mode');g.remove();A.restDancer();if(YL.game.rhythmState===state)YL.game.rhythmState=null;});
 await scope.promise(done=>{
  const start=()=>{transport?.stop();state.attempt++;Object.assign(state,{phase:'playing',hits:0,misses:0,wrong:0,time:0,notes:score.notes.map(n=>({...n,judged:false,hit:false}))});lastFlash=lastHit=-1000;transport=YL.audio.startYangge(scope);ring.setAttribute('class','rhythm-ring');YL.game.skipper=()=>finish(true);};
  const finish=assisted=>{if(finished||scope.signal.aborted)return;finished=true;transport?.stop();state.phase='complete';scope.pending.delete(tick);YL.game.skipper=null;YL.game.rhythmResult={hits:state.hits,total:count,misses:state.misses,wrong:state.wrong,pass:assisted||(state.hits>=score.required&&state.wrong<=score.maxWrong),assisted,attempts:state.attempt};g.remove();screen.classList.remove('rhythm-mode');A.restDancer();done(YL.game.rhythmResult);};
  const fail=async()=>{if(finished||state.phase!=='playing')return;state.phase='failed';transport?.stop();YL.game.skipper=null;A.restDancer();
   const choice=await YL.ui.modal({kicker:'节奏挑战未通过',title:'再跟一遍锣鼓',body:`<p>需要合拍 ${score.required} 次，错点不超过 ${score.maxWrong} 次。</p><p>这次合拍 ${state.hits} 次，漏拍 ${state.misses} 次，错点 ${state.wrong} 次。</p><p>连拍要轻快，长拍等一等。换口气，再试一次。</p>`,className:'rhythm-failure',close:false,buttons:[{label:'重新挑战',value:'retry'},{label:'辅助完成',value:'assist',secondary:true}]});
   if(scope.signal.aborted)return;if(choice==='assist')finish(true);else start();
  };
  const judge=e=>{if(finished||state.phase!=='playing'||YL.game.paused||e.isPrimary===false||e.repeat||e.button>0||e.target.closest?.('.toolbar,#narration'))return;
   const t=transport.time();if(t<score.leadInMs-280||t>score.notes.at(-1).at+score.windowMs||t-lastHit<80)return;
   const b=state.notes.filter(b=>!b.judged).sort((a,b)=>Math.abs(a.at-t)-Math.abs(b.at-t))[0];lastFlash=t;
   if(b&&Math.abs(b.at-t)<=score.windowMs){b.judged=true;b.hit=true;state.hits++;lastHit=t;ring.setAttribute('class','rhythm-ring hit');}else{state.wrong++;ring.setAttribute('class','rhythm-ring miss');if(state.wrong>score.maxWrong)fail();}e.preventDefault?.();
  };
  const tick=()=>{if(finished||state.phase!=='playing')return;const t=state.time=transport.time();state.notes.forEach((b,i)=>{if(!b.judged&&t>b.at+score.windowMs){b.judged=true;state.misses++;}marks[i].setAttribute('fill',b.judged?(b.hit?'#D83A25':'#BC8D4D'):'#F4EBDD');const delta=b.at-t;dots[i].setAttribute('cx',187.5+delta/1050*150);dots[i].setAttribute('opacity',!b.judged&&delta<1050&&delta>-score.windowMs?1:0);});
   if(t-lastFlash>180)ring.setAttribute('class','rhythm-ring');label.textContent=`合拍 ${state.hits}/${count} · 错点 ${state.wrong}/${score.maxWrong}`;A.poseDancer(t/540*Math.PI,.3);
   if(state.misses>count-score.required){fail();return;}if(t>=score.durationMs-180){if(state.hits>=score.required&&state.wrong<=score.maxWrong)finish(false);else fail();}
  };
  scope.pending.add(tick);scope.event(svg,'pointerdown',judge);scope.event(g,'keydown',e=>{if(e.key==='Enter'||e.key===' ')judge(e);});scope.cleanup(()=>scope.pending.delete(tick));start();
 });
};

YL.interact.dance=async function(step,scope){
 this.ready(step);const A=YL.art,interval=60000/(step.bpm||104),count=step.count||8;let lastBeat=-1,elapsed=0,finished=false;
 scope.cleanup(()=>A.restDancer());
 await scope.promise(done=>{const finish=()=>{if(finished)return;finished=true;scope.pending.delete(tick);YL.game.skipper=null;A.restDancer();done();};const tick=dt=>{elapsed+=dt;const k=Math.min(1,elapsed/(interval*count)),beat=Math.min(count-1,Math.floor(k*count));if(beat!==lastBeat){lastBeat=beat;YL.audio.drum(beat%4===0);}A.poseDancer(k*count*Math.PI,1);if(k===1)finish();};scope.pending.add(tick);scope.cleanup(()=>scope.pending.delete(tick));YL.game.skipper=finish;});
};
