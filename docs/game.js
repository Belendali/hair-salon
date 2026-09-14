import {hasFilterLandmarks} from './face-points.mjs?v=35';
import {selfieLayout,openSelfieStream} from './camera-view.mjs?v=35';
import {Soundtrack} from './soundtrack.mjs?v=35';
import {FaceTracker} from './face-tracker.mjs?v=35';
import * as THREE from './vendor/three.module.js';
import {createSalon} from './avatar.mjs?v=35';
import {shiftSucceeded,CONFIG,FLOW,CLOSE,SWIPE,GRAFT,graftChallenge,judgeGraft,girlFidget,judgeSweep,calculateTip,nextClient,chooseTarget,advanceScan,chooseWhites,resolvePluck,clientOutcome,clamp,lerp} from './rules.mjs?v=35';

const $=id=>document.getElementById(id);
const cameraMode=document.documentElement?.dataset.cameraMode??'contain';
const game=$('game'),video=$('selfie'),ambient=$('selfie-ambient'),filter=$('face-filter'),ctx=filter.getContext('2d');
let renderer,scene,camera,salon;
let width=390,height=844,worldHeight=17.3,state='welcome',pausedState=null,clock=0,actionTime=0,readyTime=0,lastTime=0;
let scanX=-2.3,direction=1,lockedX=0,target=null,whiteId=[3,7,11],misses=0,attempts=0,popped=false,closed=false;
let stream=null,cameraPending=false,cameraGeneration=0,worker=null,workerReady=false,frameBusy=false,lastFrame=0,landmarks=null,lastFace=0,smoothed=null,filterDeadline=null;
let muted=false,audio=null,toastTimeout=null,wasRunning=false;
let cameraReadyState=false,tracker=null;
let collected=0,wrongPlucks=0,soundtrack=null,exitTime=0,ending=null,paid=false,exitStep=0,motionTime=0;
let cutHolding=false,activePointer=null,dragOrigin=null,swipeOrigin=null,swipeX=SWIPE.startX,swipeY=null,swipePrevious=null,swipeMatrix=null,swipeTouched=new Set(),swipeCount=0,swipeStarted=false,swipeResult=null,lastSnip=-1;
let filterTime=0,filterFaulted=false,gestureDismissed=false,gestureStartedAt=null;
let client='granny',cutTime=0,cutGood=false,cutApplied=false,tip=0;
let graftPoint=null,graftSite=0,graftFilled=0,graftTime=0,graftGood=false,graftPower=0,graftDirection=1,graftOutcome=null,graftWindow=graftChallenge(0),graftResolved=false;
let entranceTime=0,stepIndex=0,satDown=false,tensionPlayed=false,lastSneezeCycle=-1;
let earnings=[],dayTotal=0,checkoutTime=0,checkoutSettled=false,lastCheckoutBeat=-1;
const cap=new Image(),moustache=new Image();cap.src='/hair-salon/assets/barber-cap-v11.png';moustache.src='/hair-salon/assets/barber-moustache-v11.png';

function toast(text,duration=3600){clearTimeout(toastTimeout);$('toast').textContent=text;$('toast').hidden=false;toastTimeout=setTimeout(()=>{$('toast').hidden=true;},duration);}
function showFeedback(text){const e=$('feedback');e.textContent=text;e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');}
function unlockAudio(){if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio=new Audio();soundtrack=new Soundtrack(audio);soundtrack.setMuted(muted);}}audio?.resume().catch(()=>{});}
function tone(freq,end,duration=.14,type='sine',volume=.06,offset=0){if(!audio||muted)return;const when=audio.currentTime+offset;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,when);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);gain.gain.setValueAtTime(.0001,when);gain.gain.exponentialRampToValueAtTime(volume,when+.008);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain);gain.connect(audio.destination);osc.start(when);osc.stop(when+duration+.02);}
function noise(duration=.04,frequency=1800,volume=.06){
  if(!audio||muted)return;const n=Math.ceil(audio.sampleRate*duration),buffer=audio.createBuffer(1,n,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/n*6);
  const source=audio.createBufferSource(),band=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;band.type='bandpass';band.frequency.value=frequency;band.Q.value=.8;gain.gain.value=volume;source.connect(band);band.connect(gain);gain.connect(audio.destination);source.start();
}
function playSound(kind){if(kind==='collect'||kind==='win'){soundtrack?.positive();return;}if(kind==='lose'){soundtrack?.characterVoice(client,'pain');return;}if(kind==='collect')tone(880,1150,.15,'sine',.045);if(kind==='step'){if(soundtrack?.footstep())return;noise(.055,850,.16);tone(170,85,.065,'sine',.07);}if(kind==='sit'){noise(.12,380,.1);tone(105,60,.15,'sine',.10);}if(kind==='tension')tone(155,250,.17,'triangle',.035);if(kind==='close'){noise(.033,4300,.13);tone(2400,1100,.026,'sine',.028);}if(kind==='pluck'){noise(.033,1900,.13);tone(780,90,.12,'sine',.13);tone(310,155,.075,'triangle',.045);}if(kind==='close')tone(820,230,.065,'triangle',.035);if(kind==='pluck'){tone(480,130,.11,'sine',.09);tone(900,640,.055,'triangle',.027);}if(kind==='win'){tone(660,660,.17,'sine',.047);tone(880,880,.18,'sine',.04,.13);tone(1320,1320,.3,'sine',.03,.25);}if(kind==='lose'){tone(210,160,.2,'triangle',.05);tone(160,100,.33,'triangle',.045,.19);}if(kind==='miss')tone(240,460,.09,'sine',.04);}

async function init(){
  try{
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    $('scene').append(renderer.domElement);
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-4,4,9,-9,.1,100);camera.position.set(0,0,24);
    scene.add(new THREE.HemisphereLight('#fafafa','#959ba1',1.25));
    const key=new THREE.DirectionalLight('#fff1e7',2.6);key.position.set(-5,9,10);scene.add(key);
    const fill=new THREE.DirectionalLight('#e2edff',.75);fill.position.set(6,3,5);scene.add(fill);
    const rim=new THREE.DirectionalLight('#fff0d8',1.5);rim.position.set(2,6,-5);scene.add(rim);
    try {
    const envData=new Float32Array(128*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<128;x++){
      const u=x/128,v=y/64,softbox=Math.exp(-(((u-.22)/.09)**2)-((v-.31)/.12)**2)*1.7+Math.exp(-(((u-.73)/.14)**2)-((v-.4)/.24)**2)*.65;
      const i=(y*128+x)*4;envData[i]=.18+softbox;envData[i+1]=.19+softbox*.97;envData[i+2]=.20+softbox*.92;envData[i+3]=1;
    }
    const env=new THREE.DataTexture(envData,128,64,THREE.RGBAFormat,THREE.FloatType);env.mapping=THREE.EquirectangularReflectionMapping;env.needsUpdate=true;
    const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(env).texture;scene.environmentIntensity=.35;env.dispose();pmrem.dispose();
    } catch(error) { console.warn('Studio reflections unavailable; using scene lights.',error); }
    salon=createSalon(scene,{setting:cameraMode});salon.reset(whiteId);
    resize();new ResizeObserver(resize).observe(game);
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pauseGame('One moment…','Your game paused. Tap continue when it’s ready.');});
    renderer.domElement.addEventListener('webglcontextrestored',()=>toast('Your game is ready to continue.'));
    $('loading').hidden=true;requestAnimationFrame(frame);
  }catch(error){$('loading').hidden=true;const box=document.createElement('section');box.className='fatal';box.innerHTML='<h2>A little hiccup.</h2><p>We couldn’t get the salon ready. Check your connection and try again.</p><button class="primary" id="reload">Try again ↻</button>';game.append(box);$('reload').onclick=()=>location.reload();console.error(error);}
}
function resize(){if(!renderer||!salon)return;const previousBase=salon.getBaseY();width=game.clientWidth;height=game.clientHeight;worldHeight=height/width*8;camera.left=-4;camera.right=4;camera.top=worldHeight/2;camera.bottom=-worldHeight/2;camera.updateProjectionMatrix();renderer.setSize(width,height);salon.setSize(worldHeight);const shift=salon.getBaseY()-previousBase;if(graftPoint)graftPoint.y+=shift;const scale=Math.min(devicePixelRatio,1.5);filter.width=Math.round(width*scale);filter.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);smoothed=null;layoutSelfie();}

function startDay(){
 earnings=[];dayTotal=0;checkoutTime=0;checkoutSettled=false;lastCheckoutBeat=-1;
 game.classList.remove('shift-complete','total-landed');$('tip-chip').hidden=true;$('tip-value').textContent='$0';
 $('take-break').disabled=false;pausedState=null;resetRound('granny');
}
function resetRound(kind=client){
  client=kind;resetSwipe();resetGraft();gestureDismissed=false;gestureStartedAt=null;$('gesture-hint').hidden=true;$('welcome').hidden=true;$('result').hidden=true;$('paused').hidden=true;$('top-hint').hidden=true;$('feedback').textContent='';
  whiteId=chooseWhites();collected=0;wrongPlucks=0;ending=null;exitTime=0;motionTime=0;cutTime=0;cutApplied=false;cutGood=false;
  soundtrack?.stopVoices();soundtrack?.stopEffects();updateProgress();salon.reset(whiteId,client);
  scanX=Math.random()<.5?CLOSE.scanMin:CLOSE.scanMax;direction=scanX<0?1:-1;lockedX=scanX;target=null;actionTime=0;readyTime=0;misses=0;attempts=0;popped=false;closed=false;
  state='entrance';entranceTime=0;stepIndex=0;satDown=false;tensionPlayed=false;lastSneezeCycle=-1;
  $('instruction').textContent=client==='granny'?'WHITE HAIRS, PLEASE.':client==='girl'?'JUST A LITTLE OFF THE BANGS.':'A LITTLE MORE ON TOP, PLEASE.';
  soundtrack?.doorbell();logEvent('client_arrival',{client});
}
function beginPluck(){
  if(state!=='aim')return;unlockAudio();
  if(client==='girl'){beginSwipe();return;}
  if(client==='man'){beginGraft();return;}
  dismissGestureHint();
  lockedX=scanX;target=chooseTarget(lockedX,salon.hairs.map(h=>({id:h.id,x:h.renderTip.x,removed:h.removed,hair:h})),CLOSE.hitRadius)?.hair??null;
  if(target)target.lockedTip=target.renderTip.clone();
  state='action';actionTime=0;popped=false;closed=false;tensionPlayed=false;attempts++;$('instruction').textContent='…';
}
function pointerWorld(clientX,clientY){const rect=game.getBoundingClientRect();return {x:(clientX-rect.left)/rect.width*8-4,y:worldHeight/2-(clientY-rect.top)/rect.height*worldHeight};}
function resetSwipe(){cutHolding=false;activePointer=null;dragOrigin=null;swipeOrigin=null;swipeX=SWIPE.startX;swipeY=null;swipePrevious=null;swipeMatrix=null;swipeTouched=new Set();swipeCount=0;swipeStarted=false;swipeResult=null;lastSnip=-1;}
function beginSwipe(clientX=null,clientY=null){
 if(state!=='aim'||client!=='girl'||swipeStarted)return false;
 const start=salon.getSwipeStart(),point=clientX===null?start:pointerWorld(clientX,clientY);
 if(point.x<start.x-.85||Math.abs(point.y-start.y)>.95){$('instruction').textContent='START AT THE SCISSORS ON THE RIGHT →';return false;}
 unlockAudio();dismissGestureHint();swipeStarted=true;cutHolding=true;dragOrigin=point;swipeOrigin=start;swipeX=start.x;swipeY=start.y;swipePrevious={...start};swipeMatrix=salon.getPortraitMatrix();
 $('instruction').textContent='← ONE SWIPE. KEEP IT STEADY.';updateProgress();return true;
}
function applySwipe(){
 if(!cutHolding||state!=='aim')return;
 const next={x:swipeX,y:swipeY},count=salon.sweepCut(swipePrevious,next,swipeMatrix,swipeTouched,clock);
 swipePrevious=next;swipeMatrix=salon.getPortraitMatrix();swipeCount+=count;
 if(count){if(clock-lastSnip>.07){soundtrack?.snip();lastSnip=clock;}updateProgress();}
}
function moveSwipe(x,y){
 if(!cutHolding||state!=='aim')return;
 swipeX=Math.min(swipeX,clamp(x,SWIPE.endX,SWIPE.startX));
 swipeY=clamp(y,-worldHeight/2+.10,-worldHeight/2+4.6);applySwipe();
 if(swipeX<=SWIPE.endX+.01)releaseSwipe();
}
function dragSwipe(clientX,clientY){if(!cutHolding)return;const p=pointerWorld(clientX,clientY);moveSwipe(swipeOrigin.x+p.x-dragOrigin.x,swipeOrigin.y+p.y-dragOrigin.y);}
function releaseSwipe(){
 if(!cutHolding||state!=='aim'||client!=='girl')return;
 applySwipe();cutHolding=false;const pointer=activePointer;activePointer=null;
 if(pointer!==null&&game.hasPointerCapture?.(pointer))game.releasePointerCapture(pointer);
 swipeResult=judgeSweep(salon.model.strandLengths,swipeCount);cutGood=swipeResult.good;wrongPlucks=swipeResult.quality;
 state='cut';cutTime=0;cutApplied=true;attempts++;updateProgress();showFeedback(swipeResult.label);
 if(cutGood)soundtrack?.positive();else soundtrack?.characterVoice('girl','sigh');
 $('instruction').textContent='ONE SWIPE. THAT’S THE CUT.';
 logEvent('swipe_complete',{cutCount:swipeCount,quality:swipeResult.quality,lengths:[...salon.model.strandLengths]});
}
function prepareGraft(){
 graftPower=0;graftDirection=1;graftPoint=null;graftOutcome=null;graftResolved=false;
 graftSite=salon.model.sites.find(s=>!s.filled)?.i??0;
 graftWindow=graftChallenge(graftFilled,attempts);
}
function resetGraft(){graftPoint=null;graftSite=0;graftFilled=0;graftTime=0;graftGood=false;graftPower=0;graftDirection=1;graftOutcome=null;graftWindow=graftChallenge(0);graftResolved=false;}
function beginGraft(){
 if(state!=='aim'||client!=='man')return false;
 const site=salon.model.sites.find(s=>!s.filled);if(!site)return false;
 unlockAudio();dismissGestureHint();
 // Freeze the exact value currently rendered. No hold, drag or release is required.
 graftOutcome=judgeGraft(graftPower,graftWindow);graftGood=graftOutcome==='good';graftSite=site.i;
 graftPoint=salon.getGraftSitePosition(graftSite).clone();graftResolved=false;
 attempts++;state='graft';graftTime=-GRAFT.flightTime;tone(900,180,.075,'triangle',.065);return true;
}
function resolveGraft(){
 if(graftResolved)return;graftResolved=true;
 if(graftGood){salon.plantGraft(graftSite,clock);graftFilled++;soundtrack?.positive();tone(420,110,.18,'sine',.10);showFeedback(graftFilled===GRAFT.count?'A WHOLE NEW MAN!':'PERFECT SHOT!');}
 else{wrongPlucks++;if(graftOutcome==='shallow'){soundtrack?.characterVoice('man','sigh');tone(240,1150,.20,'triangle',.06);showFeedback('TOO LIGHT!');}else if(graftOutcome==='miss'){soundtrack?.characterVoice('man','sigh');showFeedback('OFF TARGET!');}else{soundtrack?.characterVoice('man','pain');tone(110,55,.16,'sine',.10);showFeedback('OUCH! TOO MUCH!');}}
 updateProgress();logEvent('graft_shot',{outcome:graftOutcome,power:graftPower,low:graftWindow.low,high:graftWindow.high,filled:graftFilled,wrong:wrongPlucks});
}
function updatePressureUI(){
 const meter=$('pressure-meter');meter.hidden=client!=='man'||!['aim','graft'].includes(state);
 if(meter.hidden)return;
 meter.style.setProperty('--power',`${graftPower*100}%`);meter.style.setProperty('--safe-left',`${graftWindow.low*100}%`);meter.style.setProperty('--safe-width',`${(graftWindow.high-graftWindow.low)*100}%`);
 const status=state==='graft'?graftOutcome:graftPower>graftWindow.high?'deep':graftPower>=graftWindow.low?'good':'shallow';
 meter.dataset.status=status;meter.setAttribute('aria-valuenow',Math.round(graftPower*100));
 $('pressure-label').textContent=state==='graft'?(graftGood?'JUST RIGHT':graftOutcome==='shallow'?'TOO LIGHT':graftOutcome==='miss'?'OFF TARGET':'TOO DEEP'):'TAP TO STOP IN GREEN';
}
function updateProgress(){
 if(client==='girl'){$('top-hint').innerHTML=`<span class="progress-label">${state==='cut'?'YOUR CUT':'ONE SWIPE'} <b>${swipeStarted?Math.round(swipeCount/SWIPE.strands*100)+'%':'←'}</b></span>`;return;}
 const label=client==='man'?'NEW HAIR':'WHITE HAIRS',count=client==='man'?graftFilled:collected,total=client==='man'?GRAFT.count:3;
 $('top-hint').innerHTML=`<span class="progress-label">${label} <b>${count}<i>/${total}</i></b></span><span class="patience" aria-label="${3-wrongPlucks} mistakes remaining">${[0,1,2].map(i=>`<span class="patience-dot ${i<wrongPlucks?'spent':''}"></span>`).join('')}</span>`;
}
function startExit(outcome){
 ending=outcome;state='exit';exitTime=0;paid=false;exitStep=0;target=null;actionTime=0;tip=calculateTip(wrongPlucks);salon.setTip(tip);
 $('top-hint').hidden=true;$('instruction').textContent=ending==='angry'?'OKAY. WE’RE DONE HERE.':'LOOKING GOOD.';
 if(ending==='angry')showFeedback('I’M OUT!');
 logEvent('service_complete',{client,wrongPlucks,tip});
}
function finishRound(){
 logEvent('client_left',{client,tip});actionTime=0;
 if(nextClient(client)===null){finishDay();return;}
 state='result';$('instruction').textContent='NEXT CLIENT';
}
function finishDay(){
 state='complete';checkoutTime=0;checkoutSettled=false;lastCheckoutBeat=-1;
 dayTotal=earnings.reduce((sum,e)=>sum+e.tip,0);
 const success=shiftSucceeded(earnings),happyClients=earnings.filter(e=>e.ending==='happy').length;
 dismissGestureHint();$('top-hint').hidden=true;$('tip-chip').hidden=true;$('feedback').textContent='';$('instruction').textContent='';
 $('result').hidden=false;$('result').className='panel result checkout '+(success?'win':'loss');game.classList.add('shift-complete');
 $('take-break').disabled=true;$('result-eyebrow').textContent=success?'SHIFT SUCCESS':'SHIFT FAILED';
 $('result-title').textContent=success?'They love you.':happyClients?'A mixed day.':'Rough shift.';
 $('day-total').textContent='0';$('result-copy').textContent=success?'3 / 3 happy clients. You made their day!':`${happyClients} / 3 happy clients. Make everyone smile!`;
 $('result-summary').textContent=`${success?'Shift success.':'Shift failed.'} ${happyClients} out of 3 happy clients. Today you earned $${dayTotal} out of $150.`;
 for(const kind of ['granny','girl','man'])$(`earned-${kind}`).textContent=`$${earnings.find(e=>e.client===kind)?.tip??0}`;
 $('replay').focus?.({preventScroll:true});if(success)soundtrack?.checkout();else{soundtrack?.setback();}logEvent('shift_complete',{total:dayTotal,clients:earnings.length,happyClients,success});
}
function updateCheckout(dt){
 checkoutTime+=dt;const p=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?1:clamp((checkoutTime-.20)/1.45),value=Math.round(dayTotal*(1-(1-p)**3));
 $('day-total').textContent=String(value);
 const beat=Math.floor(p*8);if(p>0&&p<1&&beat!==lastCheckoutBeat){lastCheckoutBeat=beat;tone(900+beat*110,1100+beat*100,.055,'sine',.025);}
 if(p===1&&!checkoutSettled){checkoutSettled=true;game.classList.add('total-landed');soundtrack?.cash();}
}
function continuePlucking(){scanX=salon.tweezers.position.x;target=null;actionTime=0;state='aim';$('instruction').textContent='TAP TO PLUCK · WHITE HAIRS ONLY';}
function pauseGame(title='Take a breath.',copy='Your client can wait.'){
 if(state==='paused'||['welcome','result','complete'].includes(state))return;
 $('gesture-hint').hidden=true;if(cutHolding)releaseSwipe();soundtrack?.hush();pausedState=state;state='paused';$('pause-title').textContent=title;$('pause-copy').textContent=copy;$('resume').firstChild.textContent='Continue ';$('paused').hidden=false;$('top-hint').hidden=true;
}
function resumeGame(){unlockAudio();$('paused').hidden=true;if(pausedState==='new'){startDay();return;}state=pausedState||'aim';pausedState=null;$('top-hint').hidden=!['ready','aim','action','cut','graft','graft-result'].includes(state);lastTime=0;}
function frame(now){
 const raw=lastTime?(now-lastTime)/1000:0;lastTime=now;const dt=Math.min(raw,.06);
 if(!document.hidden){
  if(raw>.7&&state==='aim')pauseGame('Ready to go?','Tap continue when you’re ready.');
  if(state!=='paused'){
   clock+=dt;
   if(state==='welcome'){const n=advanceScan(scanX,direction,dt,CONFIG.minX-.16,CONFIG.maxX+.16,1.0);scanX=n.x;direction=n.direction;}
   if(state==='entrance'){
    entranceTime+=dt;const steps=[.30,.60,.90,1.20];if(stepIndex<steps.length&&entranceTime>=steps[stepIndex]){playSound('step');stepIndex++;}
    if(entranceTime>=1.90&&!satDown){satDown=true;playSound('sit');}
    if(entranceTime>=FLOW.seatEnd){state='ready';readyTime=0;$('top-hint').hidden=false;soundtrack?.characterVoice(client,'request');$('instruction').textContent=client==='granny'?'JUST THE THREE WHITE ONES.':client==='girl'?'ONE SWIPE. RIGHT TO LEFT.':'TAP TO STOP IN THE GREEN.';}
   }
   else if(state==='ready'){readyTime+=dt;if(readyTime>=FLOW.readyDuration){state='aim';$('instruction').textContent=client==='granny'?'TAP TO PLUCK · WHITE HAIRS ONLY':client==='girl'?'HOLD THE SCISSORS · SWIPE ←':'TAP TO STOP IN GREEN';}}
   else if(state==='aim'){
    motionTime+=dt;
    if(client==='granny'){const speed=collected>=CONFIG.whiteCount-1?CLOSE.lastHairSpeed:CLOSE.speed;const n=advanceScan(scanX,direction,dt,CLOSE.scanMin,CLOSE.scanMax,speed);scanX=n.x;direction=n.direction;}
    else if(client==='girl'){
     const fidget=girlFidget(motionTime),cycle=Math.floor(motionTime/5.6);
     if(fidget.warning&&motionTime%5.6>=2.15&&cycle!==lastSneezeCycle){lastSneezeCycle=cycle;soundtrack?.characterVoice('girl','sneeze');}
     $('instruction').textContent=fidget.warning?'UH-OH… SHE’S ABOUT TO SNEEZE!':fidget.sneeze>.15?'ACHOO!':cutHolding?'← KEEP GOING. JUST ONE SWIPE.':'HOLD THE SCISSORS · SWIPE ←';
    }else {
     const n=advanceScan(graftPower,graftDirection,dt,0,1,graftWindow.rate);graftPower=n.x;graftDirection=n.direction;
     $('instruction').textContent='TAP TO STOP IN GREEN';
    }
   }
   else if(state==='action'){
    motionTime+=dt*.35;actionTime+=dt;
    if(actionTime>=.30&&!closed){closed=true;playSound('close');}
    if(target&&actionTime>=.37&&!tensionPlayed){tensionPlayed=true;playSound('tension');}
    if(target&&actionTime>=.55&&!popped){
     popped=true;const outcome=resolvePluck(target,salon.hairs);collected=outcome.collected;if(!target.white)wrongPlucks++;updateProgress();playSound('pluck');playSound(target.white?'collect':'lose');
     showFeedback(target.white?`${collected} / 3`:['OUCH!','THAT WAS RED!','ENOUGH!'][wrongPlucks-1]);
    }
    if(!target&&actionTime>=.65){misses++;playSound('miss');showFeedback('MISSED');state='aim';$('instruction').textContent='MISSED. TRY AGAIN.';}
    if(target&&actionTime>=(wrongPlucks>=3?1.05:1.5)){const outcome=clientOutcome(collected,wrongPlucks);if(outcome)startExit(outcome);else continuePlucking();}
   }
   else if(state==='cut'){
    cutTime+=dt;motionTime+=dt*.25;
    if(cutTime>=1.85)startExit(wrongPlucks>=2?'angry':'happy');
   }
   else if(state==='graft'){
    graftTime+=dt;motionTime+=dt*.35;if(graftTime>=0&&!graftResolved)resolveGraft();
    if(graftTime>=.85){
     if(graftFilled>=GRAFT.count||wrongPlucks>=3){graftGood=graftFilled>=GRAFT.count&&wrongPlucks<3;state='graft-result';graftTime=0;$('instruction').textContent=graftGood?'A WHOLE NEW LOOK.':'THAT’S ENOUGH.';}
     else{state='aim';prepareGraft();}
    }
   }
   else if(state==='graft-result'){graftTime+=dt;motionTime+=dt*.20;if(graftTime>=1.25)startExit(graftGood?'happy':'angry');}
   else if(state==='exit'){
    exitTime+=dt;
    if(exitTime>=FLOW.payAt&&!paid){paid=true;earnings.push({client,tip,ending});soundtrack?.cash();soundtrack?.characterVoice(client,ending==='angry'?'angry':'happy');showFeedback(`+$${tip}`);
     $('tip-value').textContent=`$${tip}`;$('tip-chip').setAttribute('aria-label',`Tip: ${tip} out of 50 dollars`);$('tip-chip').hidden=false;$('tip-chip').classList.remove('earned');void $('tip-chip').offsetWidth;$('tip-chip').classList.add('earned');logEvent('tip_paid',{client,tip});
    }
    if(exitTime>=FLOW.walkOutAt+.10+exitStep*.25&&exitStep<5){playSound('step');exitStep++;}
    if(exitTime>=FLOW.exitDuration)finishRound();
   }
   else if(state==='result'){actionTime+=dt;if(actionTime>.12)resetRound(nextClient(client));}
   else if(state==='complete')updateCheckout(dt);
  }
  const renderState=state==='complete'?'complete':state==='paused'?(pausedState==='new'?'welcome':pausedState):state;
  salon.update({time:clock,state:renderState,checkoutTime,dayTotal,clientResults:earnings,t:actionTime,target,scanX:['action','result'].includes(renderState)?lockedX:scanX,whiteId,entranceTime,exitTime,ending,motionTime,readyTime,cutTime,cutGood,cutHolding,swipeX,swipeY,graftPoint,graftSite,graftTime,graftGood,graftPower,graftWindow,graftOutcome});
  updateGestureHint();updatePressureUI();
  if(client==='girl'&&cutHolding&&state!=='paused')applySwipe();
  soundtrack?.update(['entrance','ready','aim','action','cut','graft','graft-result','exit','result'].includes(state));renderer.render(scene,camera);renderFilter(now);sendFrame(now);
 }
 requestAnimationFrame(frame);
}

function dismissGestureHint(){gestureDismissed=true;$('gesture-hint').hidden=true;}
function updateGestureHint(){
 const hint=$('gesture-hint');
 if(state!=='aim'||gestureDismissed||cutHolding||swipeStarted){hint.hidden=true;return;}
 if(gestureStartedAt===null)gestureStartedAt=clock;
 if(clock-gestureStartedAt>=2){dismissGestureHint();return;}
 const girl=client==='girl',man=client==='man',tool=girl?salon.scissors:man?salon.graftTool:salon.tweezers;
 if(!tool.visible){hint.hidden=true;return;}
 const x=client==='granny'?width*.5:clamp((tool.position.x+4)/8*width,32,width-36);
 const y=clamp((worldHeight/2-tool.position.y)/worldHeight*height+(girl||man?3:18),120,height-110);
 const mode=girl?'swipe':'tap';
 if(hint.dataset.mode!==mode){hint.dataset.mode=mode;hint.className='gesture-hint '+mode;$('gesture-label').textContent=girl?'SWIPE ←':'TAP';}
 hint.style.left=`${x-18}px`;hint.style.top=`${y-6}px`;

 hint.style.setProperty('--travel',`${(SWIPE.startX-SWIPE.endX)/8*width}px`);hint.hidden=false;
}

function logEvent(event,data={}){const events=window.__salonEvents||(window.__salonEvents=[]);events.push({event,...data,time:Math.round(performance.now())});if(events.length>120)events.shift();}

function layoutSelfie(){
 if(!video.videoWidth||!video.videoHeight)return;
 const {scale,ox,oy}=selfieLayout(width,height,video.videoWidth,video.videoHeight,cameraMode);
 Object.assign(video.style,{width:`${video.videoWidth*scale}px`,height:`${video.videoHeight*scale}px`,left:`${ox}px`,top:`${oy}px`});
}
async function enableCamera(){
  if(stream)return true;if(cameraPending)return false;
  cameraPending=true;const generation=++cameraGeneration;$('camera-toggle').disabled=true;$('start-camera').disabled=true;
  $('start-camera').firstChild.textContent='Opening camera… ';
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('unavailable');
    const acquired=await openSelfieStream(navigator.mediaDevices);
    if(generation!==cameraGeneration){acquired.getTracks().forEach(t=>t.stop());return false;}
    stream=acquired;video.srcObject=stream;await video.play();layoutSelfie();ambient.srcObject=stream;ambient.play().catch(()=>{});
    video.classList.add('active');game.classList.add('camera-active');$('camera-toggle').classList.add('on');$('camera-toggle').setAttribute('aria-label','Turn off selfie camera');
    cameraReadyState=true;stream.getVideoTracks()[0].addEventListener('ended',()=>{if(stream){disableCamera();toast('Camera stopped. You can keep playing.');}});
    initTracking();logEvent('camera_ready');return true;
  }catch(error){
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;ambient.pause();ambient.srcObject=null;}
    toast(error.name==='NotAllowedError'?'Camera is off. Allow it in your browser settings, or play without it.':'Camera unavailable here. Try Safari or Chrome, or play without a camera.',6500);
    logEvent('camera_unavailable',{reason:error.name||'unavailable'});return false;
  }finally{cameraPending=false;$('camera-toggle').disabled=false;$('start-camera').disabled=false;$('start-camera').firstChild.textContent='Play with selfie ';}
}
function disableCamera(){filterFaulted=false;tracker?.close();tracker=null;$('filter-retry').hidden=true;cameraGeneration++;const old=stream;stream=null;if(old)old.getTracks().forEach(t=>t.stop());video.pause();video.srcObject=null;ambient.pause();ambient.srcObject=null;video.classList.remove('active');game.classList.remove('camera-active');$('camera-toggle').classList.remove('on');$('camera-toggle').setAttribute('aria-label','Turn on selfie camera');landmarks=null;smoothed=null;cameraReadyState=false;workerReady=false;frameBusy=false;worker?.terminate();worker=null;clearTimeout(filterDeadline);ctx.clearRect(0,0,width,height);}
function initTracking(){
  filterFaulted=false;
  tracker?.close();landmarks=null;smoothed=null;$('filter-retry').hidden=true;
  const current=new FaceTracker({
    onLandmarks:points=>{if(tracker!==current)return;landmarks=points;if(points)lastFace=performance.now();},
    onStatus:status=>{
      if(tracker!==current)return;
      if(status==='loading')toast('Getting your barber look ready…',12000);
      if(status==='ready')toast('Barber look ready. Face the camera.',2500);
      if(status==='failed'){$('filter-retry').hidden=false;toast('Barber look paused. Tap Retry barber look.',4500);}
    }
  });tracker=current;current.start();
}
function sendFrame(now){if(stream&&state!=='paused')tracker?.frame(video,now);}
function renderFilter(now){
 if(filterFaulted)return;
 try{drawFilter(now);}catch(error){
  filterFaulted=true;landmarks=null;smoothed=null;
  // The optional selfie overlay cannot interrupt the game animation loop.
  try{const ratio=Math.min(devicePixelRatio,1.5);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalAlpha=1;ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.clearRect(0,0,width,height);}catch{}
  $('filter-retry').hidden=false;logEvent('filter_render_error',{message:String(error?.message||error)});
  console.warn('Barber overlay paused; the game continues.',error);
 }
}
function drawFilter(now){
  ctx.clearRect(0,0,width,height);
  if(!stream||now-lastFace>500||!video.videoWidth||!hasFilterLandmarks(landmarks)){smoothed=null;return;}
  const vw=video.videoWidth,vh=video.videoHeight,{scale,ox,oy}=selfieLayout(width,height,vw,vh,cameraMode);
  const point=id=>({x:width-(landmarks[id].x*vw*scale+ox),y:landmarks[id].y*vh*scale+oy});
  const l=point(263),r=point(33),fore=point(10),a=point(234),b=point(454),nose=point(2),lip=point(0),ml=point(61),mr=point(291);
  const faceWidth=Math.hypot(a.x-b.x,a.y-b.y),angle=Math.atan2(r.y-l.y,r.x-l.x);
  if(faceWidth<1)return;
  const yaw=clamp((nose.x-(a.x+b.x)/2)/Math.max(faceWidth,.001)*2,-.65,.65);
  const fresh={x:fore.x,y:fore.y,faceWidth,angle,yaw,mx:lerp(nose.x,lip.x,.55),my:lerp(nose.y,lip.y,.55),mouthWidth:clamp(Math.hypot(ml.x-mr.x,ml.y-mr.y)*1.3,faceWidth*.39,faceWidth*.54)};
  const alphaMotion=1-Math.exp(-clamp((now-filterTime)/1000,.008,.08)*24);filterTime=now;
  if(!smoothed||Math.abs(fresh.x-smoothed.x)>width*.3)smoothed={...fresh};
  for(const k of ['x','y','faceWidth','mx','my','yaw','mouthWidth'])smoothed[k]=lerp(smoothed[k]??fresh[k],fresh[k],alphaMotion);
  const angleDelta=Math.atan2(Math.sin(fresh.angle-smoothed.angle),Math.cos(fresh.angle-smoothed.angle));smoothed.angle+=angleDelta*alphaMotion;
  const s=smoothed,lose=(!!target&&!target.white&&actionTime>.8&&['action','result','paused'].includes(state))||(state==='cut'&&cutApplied&&!cutGood),win=(!!target?.white&&actionTime>.55&&['action','result','paused'].includes(state))||(state==='cut'&&cutApplied&&cutGood);
  ctx.globalAlpha=clamp(1-(now-lastFace-200)/300);
  const capWidth=s.faceWidth*1.25,capHeight=capWidth*(544/1664);
  ctx.save();ctx.translate(s.x-s.yaw*s.faceWidth*.07,s.y+s.faceWidth*.02);ctx.rotate(s.angle+(lose?Math.sin(now*.02)*.02:0));
  ctx.shadowColor='#00000028';ctx.shadowBlur=Math.max(1,s.faceWidth*.009);ctx.shadowOffsetY=2;
  if(cap.complete&&cap.naturalWidth)ctx.drawImage(cap,253,94,1664,544,-capWidth/2,-capHeight*.94,capWidth,capHeight);ctx.restore();
  const mw=s.mouthWidth,mh=mw*(248/1333);
  ctx.save();ctx.translate(s.mx,s.my);ctx.rotate(s.angle);ctx.transform(1,0,s.yaw*.12,1,0,0);ctx.shadowColor='#00000025';ctx.shadowBlur=1;ctx.shadowOffsetY=1;
  if(moustache.complete&&moustache.naturalWidth)ctx.drawImage(moustache,103,426,1333,248,-mw/2,-mh*.42,mw,mh);ctx.restore();
  if(lose||win){ctx.save();ctx.font=`${Math.max(23,s.faceWidth*.13)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';const float=Math.sin(now*.004)*3;ctx.fillText(win?'✨':'💦',s.x+s.faceWidth*.55,s.y+s.faceWidth*.15+float);ctx.restore();}

  ctx.globalAlpha=1;
}

video.addEventListener('resize',()=>{smoothed=null;layoutSelfie();});
async function startWithEntranceAudio(){
 unlockAudio();await Promise.race([soundtrack?.effectsReady??Promise.resolve(),new Promise(resolve=>setTimeout(resolve,700))]);
 if(state==='welcome')startDay();
}
$('start-camera').addEventListener('click',async()=>{unlockAudio();const previousState=state;await enableCamera();if(state===previousState&&state==='welcome')await startWithEntranceAudio();});
$('start-practice').addEventListener('click',startWithEntranceAudio);
$('camera-toggle').addEventListener('click',async()=>{unlockAudio();if(stream)disableCamera();else await enableCamera();});
$('sound-toggle').addEventListener('click',()=>{unlockAudio();muted=!muted;soundtrack?.setMuted(muted);$('sound-toggle').classList.toggle('muted',muted);$('sound-toggle').setAttribute('aria-label',muted?'Enable sound':'Mute sound');});
$('replay').addEventListener('click',()=>{unlockAudio();startDay();});
$('pass-phone').addEventListener('click',()=>{$('result').hidden=true;target=null;actionTime=0;state='paused';pausedState='new';$('pause-title').textContent='Your turn.';$('pause-copy').textContent='Pass the phone. Face the camera.';$('resume').firstChild.textContent='I’m ready ';$('paused').hidden=false;landmarks=null;smoothed=null;});
$('filter-retry').addEventListener('click',()=>{if(stream)initTracking();});
$('take-break').addEventListener('click',()=>pauseGame());
$('resume').addEventListener('click',resumeGame);
game.addEventListener('pointerdown',e=>{
 if(e.target.closest('button,a')||e.isPrimary===false||(e.button!==undefined&&e.button!==0)||state!=='aim')return;e.preventDefault();unlockAudio();
 if(client==='girl'){if(beginSwipe(e.clientX,e.clientY)){activePointer=e.pointerId;game.setPointerCapture?.(e.pointerId);}}
 else if(client==='man')beginGraft();
 else beginPluck();
});
game.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer||!cutHolding)return;e.preventDefault();const points=e.getCoalescedEvents?.();for(const p of points?.length?points:[e])dragSwipe(p.clientX,p.clientY);});
game.addEventListener('pointerup',e=>{if(e.pointerId!==activePointer)return;e.preventDefault();dragSwipe(e.clientX,e.clientY);releaseSwipe();});
game.addEventListener('pointercancel',e=>{if(e.pointerId===activePointer)releaseSwipe();});
for(const type of ['contextmenu','selectstart','dragstart'])game.addEventListener(type,e=>{if(!e.target.closest('button,a'))e.preventDefault();});
game.addEventListener('lostpointercapture',e=>{if(e.pointerId===activePointer&&cutHolding)releaseSwipe();});
document.addEventListener('keydown',e=>{
 if(e.target.closest('button,a'))return;
 if(e.code==='Space'&&!e.repeat){e.preventDefault();beginPluck();}
 if(cutHolding&&['ArrowLeft','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();moveSwipe(swipeX-(e.code==='ArrowLeft'?.16:0),swipeY+(e.code==='ArrowUp'?.06:e.code==='ArrowDown'?-.06:0));}
});
document.addEventListener('keyup',e=>{if(e.code==='Space'){if(cutHolding){e.preventDefault();releaseSwipe();}}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseGame();audio?.suspend().catch(()=>{});}lastTime=0;});
window.addEventListener('pagehide',()=>{soundtrack?.hush();disableCamera();});
init();
