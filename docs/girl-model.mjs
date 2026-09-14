import * as T from './vendor/three.module.js';
import {mat,oval,tube,mergeMeshes,textile,sculptHead,limbSegment} from './granny-model.mjs?v=35';
import {clamp,smooth,lerp,girlFidget} from './rules.mjs?v=35';
export function createGirl(root){
 const portrait=new T.Group();root.add(portrait);portrait.name='bangs-client';
 const skin=mat('#f1bdab',.68),pink=mat('#e89990',.65),dark=mat('#38231d',.7),cream=mat('#fffaf1',.36),hairMat=mat('#57311f',.44),shine=mat('#895139',.48);
 const face=sculptHead(skin);face.scale.set(.86,.79,.94);face.position.y=.15;portrait.add(face);
 for(const side of [-1,1]){oval(portrait,skin,[side*1.23,-.10,.1],[.32,.43,.24]);oval(portrait,pink,[side*1.29,-.10,.29],[.17,.27,.055]);oval(portrait,pink,[side*.77,-.43,.97],[.25,.13,.032]);}
 oval(portrait,pink,[0,.05,1.15],[.31,.44,.40]);
 const eyes=[],brows=[];
 for(const side of [-1,1]){
  const eye=new T.Group();eye.position.set(side*.49,.75,.98);portrait.add(eye);oval(eye,cream,[0,0,0],[.34,.34,.14]);
  const pupil=new T.Group();eye.add(pupil);oval(pupil,mat('#78442b',.4),[0,0,.13],[.16,.17,.047]);oval(pupil,dark,[0,0,.17],[.085,.10,.021]);oval(pupil,cream,[-.04,.06,.192],[.035,.034,.009]);eyes.push({eye,pupil});
  brows.push(tube([[side*.21,1.17,1.02],[side*.50,1.28,1.06],[side*.83,1.20,1.02]],.045,hairMat,portrait));
 }
 const mouth=tube([[-.30,-.71,1.0],[0,-.79,1.11],[.30,-.71,1.0]],.030,mat('#aa544c'),portrait);
 const open=oval(portrait,mat('#5b2830'),[0,-.75,1.07],[.25,.17,.035]);open.visible=false;
 // Shoulder-length bob with many fine curved strands; forehead has separate cuttable panels.
 const back=new T.Group();portrait.add(back);const locks=[[],[]];
 for(let i=0;i<88;i++){
  const a=-2.1+i/87*4.2,points=[];
  for(let k=0;k<12;k++){const v=k/11,r=Math.sqrt(Math.max(.001,1-(1-Math.min(1,v/.25))**2));points.push([Math.sin(a)*(1.23+.11*v)*r,2.12-3.72*v+.035*Math.sin(i*2),-Math.cos(a)*(1.04+.10*v)*r-.04]);}
  locks[0].push(tube(points,.065,hairMat,null,26));
  locks[1].push(tube(points.map(p=>[p[0]*1.015,p[1]+.008,p[2]*1.015]),.010,shine,null,26));
 }
 mergeMeshes(locks[0],back,hairMat);mergeMeshes(locks[1],back,shine);
 const bangs=new T.Group();portrait.add(bangs);
 const originals=Array.from({length:18},(_,i)=>[-.10,-.16,-.07][Math.floor(i/6)]+.045*Math.sin(i*1.3));
 const strandLengths=[...originals],lengths=[-.10,-.16,-.07],sections=[];
 function makeLock(i,end){
  const x=-.98+i/17*1.96,topx=x*.59;
  return tube([[topx,2.08,.49],[x*.9,1.83,1.02],[x,lerp(1.65,end,.5),1.18],[x+.015*Math.sin(i*3),end,1.19]],.068,i%3?hairMat:shine,null,22);
 }
 for(let i=0;i<18;i++){const m=makeLock(i,strandLengths[i]);bangs.add(m);sections.push({m,i,x:-.98+i/17*1.96});}
 const falling=new T.Group();portrait.add(falling);const pieces=[];
 function cutStrand(i,y,time=0){
  const lock=sections[i],oldY=strandLengths[i];if(!lock||y<=oldY+.025||y>1.92)return false;
  strandLengths[i]=y;lengths[Math.floor(i/6)]=strandLengths.slice(Math.floor(i/6)*6,Math.floor(i/6)*6+6).reduce((a,b)=>a+b,0)/6;
  const next=makeLock(i,y);lock.m.geometry.dispose();lock.m.geometry=next.geometry;
  const x=lock.x,clump=tube([[x,y,1.21],[x+.02,lerp(y,oldY,.5),1.23],[x-.02,oldY,1.24]],.065,hairMat,falling,12);
  pieces.push({m:clump,born:time,i});return true;
 }
 function cut(section,y){for(let i=section*6;i<section*6+6;i++)cutStrand(i,y);}
 function reset(){
  strandLengths.splice(0,18,...originals);lengths.splice(0,3,-.1,-.16,-.07);
  for(const l of sections){const next=makeLock(l.i,strandLengths[l.i]);l.m.geometry.dispose();l.m.geometry=next.geometry;}
  for(const p of pieces){p.m.geometry.dispose();falling.remove(p.m);}pieces.length=0;
 }
 const body=new T.Group();root.add(body);body.position.y=.45;
 const sweater=mat('#fff',.92);sweater.map=textile('knit');sweater.map.repeat.set(5,6);sweater.color.set('#ad8296');sweater.bumpMap=sweater.map;sweater.bumpScale=.026;
 const denim=mat('#768c9c',.9),shoe=mat('#7c5358',.75);
 oval(body,skin,[0,-1.80,0],[.23,.60,.24]);oval(body,sweater,[0,-3.47,-.04],[.76,1.3,.43]);oval(body,sweater,[0,-2.27,0],[.30,.19,.30]);oval(body,denim,[0,-4.87,-.02],[.77,.47,.44]);
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new T.Group();body.add(arm);const upper=oval(arm,sweater,[0,0,0],[.2,1,.2]),forearm=oval(arm,sweater,[0,0,0],[.18,1,.18]);const hand=new T.Group();arm.add(hand);oval(hand,skin,[0,0,0],[.19,.25,.13]);for(let j=0;j<4;j++)oval(hand,skin,[(j-1.5)*.075,-.19,0],[.043,.16,.055]);
  const leg=new T.Group();leg.position.set(side*.38,-4.95,0);body.add(leg);oval(leg,denim,[0,-1.58,0],[.37,1.9,.34]);oval(leg,shoe,[0,-3.55,.13],[.35,.25,.56]);oval(leg,cream,[0,-3.70,.14],[.36,.055,.57]);for(let k=0;k<3;k++)tube([[-.15,-3.39+k*.045,.40],[.15,-3.39+k*.045,.40]],.018,cream,leg);limbs.push({arm,upper,forearm,hand,leg,side});
 }
 const glasses=new T.Group();
 function pose({motionTime=0,entering=false,departing=false,entranceTime=0,exitTime=0,poseStrength=1}){
  const seated=!entering&&!departing,p=motionTime%9,touch=seated&&p>4&&p<6?Math.sin((p-4)/2*Math.PI)**2:0;
  const {warning,sneeze}=girlFidget(motionTime);
  portrait.position.set(seated?Math.sin(motionTime*1.6)*.17*poseStrength:0,seated?(Math.sin(motionTime*1.9)*.12-sneeze*.50)*poseStrength:0,0);
  portrait.rotation.set(seated?(Math.sin(motionTime*1.2)*.065+sneeze*.20)*poseStrength:0,seated?Math.sin(motionTime*1.25)*.27*poseStrength:0,seated?(Math.sin(motionTime*1.65)*.14+sneeze*.14)*poseStrength:0);
  for(const l of limbs){const side=l.side,walk=entering&&entranceTime<1.42?Math.sin(entranceTime*Math.PI/.30):departing&&exitTime>1.65?Math.sin((exitTime-1.65)*Math.PI/.25):0;
   const shoulder=new T.Vector3(side*.60,-2.5,0),elbow=new T.Vector3(side*.95,-3.7,.04),end=new T.Vector3(side*.94,-5.15,.12+walk*side*.3);
   if(seated&&side===-1){const goal=new T.Vector3(-1.2,-.2,1.1).applyEuler(portrait.rotation);goal.y-=body.position.y;end.lerp(goal,touch*poseStrength);elbow.lerp(new T.Vector3(-1.8,-2.0,.3),touch*poseStrength);}
   if(departing&&side===1&&exitTime>.48&&exitTime<1.65){const reach=Math.sin((exitTime-.48)/1.17*Math.PI);end.lerp(new T.Vector3(1.4,-1.1,1.6),reach);elbow.lerp(new T.Vector3(1.6,-2.5,.5),reach);}
   l.leg.rotation.x=walk*side*.12;limbSegment(l.upper,shoulder,elbow,.21);limbSegment(l.forearm,elbow,end,.18);l.hand.position.copy(end);
  }
 }
 function expression({time=0,win=false,lose=false,react=0,talking=false,t=0,motionTime=0}){
  const {warning,sneeze}=girlFidget(motionTime);
  const phase=time%4.5,blink=phase<.16?Math.max(.05,Math.abs(phase-.08)/.08):1;
  eyes.forEach(({eye,pupil})=>{eye.scale.y=blink*(1-sneeze*.92)*(warning?.7:lose?.84:1);pupil.position.x=Math.sin(time*.75)*.022;});
  brows.forEach((b,i)=>b.rotation.z=lose?(i===0?-.15:.15)*react:0);mouth.rotation.z=lose?-.08*react:0;mouth.scale.y=lose?-1:1;open.visible=talking||(lose&&react>.65);mouth.visible=!open.visible;open.scale.y=talking?.07+Math.abs(Math.sin(time*22))*.11:.18;
  for(let i=pieces.length-1;i>=0;i--){const p=pieces[i],age=Math.max(0,time-p.born);if(age>1.1){p.m.geometry.dispose();falling.remove(p.m);pieces.splice(i,1);continue;}p.m.position.set(Math.sin(p.i*2)*age*.25,-age*age*5,age*.2);p.m.rotation.z=age*Math.sin(p.i)*.3;}
 }
 pose({});return {portrait,face,body,limbs,glasses,hairMat,whiteMat:cream,skin,dark,cream,pose,expression,cut,cutStrand,sections,strandLengths,reset,lengths};
}
