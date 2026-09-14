import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clamp,smooth,lerp,FLOW} from './rules.mjs?v=30';

export async function loadGrannyAsset(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
    const response=await fetch('/hair-salon/assets/granny-v3.glb',{signal:controller.signal});
    if(!response.ok)throw new Error(`Customer model: ${response.status}`);
    return await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
  }finally{clearTimeout(timer);}
}

// The same normalized, skinned model is used for walking, service and results.
export function createRiggedGranny(root,gltf){
  const SCALE=2.08,CENTER=5.10;
  const visual=new T.Group();visual.name='blender-granny-v3';visual.scale.setScalar(SCALE);visual.position.y=-CENTER*SCALE;
  root.add(visual);visual.add(gltf.scene);
  const rig=gltf.scene.getObjectByName('GRANNY_RIG'),bones={};rig.traverse(o=>{if(o.isBone)bones[o.name.replace(/hair-salon/(upper_arm|forearm|hand|thigh|shin|foot|eye|brow)([LR])$/,'$1.$2')]=o;});
  if(!bones.head||!bones.glasses)throw new Error('Granny skeleton is incomplete');
  const rest=Object.fromEntries(Object.entries(bones).map(([name,b])=>[name,{position:b.position.clone(),quaternion:b.quaternion.clone()}]));
  const meshes=[];gltf.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;meshes.push(o);}});
  const face=meshes.find(o=>o.name==='Face_Continuous');
  const material=(prefix)=>meshes.flatMap(o=>Array.isArray(o.material)?o.material:[o.material]).find(m=>m.name.startsWith(prefix));
  const hairMat=material('Hair'),skin=material('Skin'),cream=material('Eye white'),dark=material('Pupil');
  const whiteMat=new T.MeshStandardMaterial({color:'#fff9e4',roughness:.82,emissive:'#4d4431',emissiveIntensity:.08});
  hairMat.roughness=.84;hairMat.envMapIntensity=.32;
  // Bone attachment preserves the old game's hair coordinate system exactly.
  const portrait=new T.Group();portrait.name='granny-hair-and-effects-anchor';root.add(portrait);
  root.updateMatrixWorld(true);bones.head.attach(portrait);
  const glasses=bones.glasses,body=visual;
  // Legacy scene controls use proxies; the actual limbs are driven as one rig.
  const limbs=['L','R'].map((suffix,i)=>({arm:new T.Group(),leg:new T.Group(),hand:bones['hand.'+suffix],side:i===0?-1:1}));
  const mixer=new T.AnimationMixer(gltf.scene),actions={};
  for(const source of gltf.animations){
    // Scene staging owns translation. Head performance and hands are layered below.
    const tracks=source.tracks.filter(t=>!t.name.startsWith('root.')&&!t.name.startsWith('head.')&&!t.name.startsWith('glasses.')&&!/^eye[LR]\./.test(t.name)&&!/^brow[LR]\./.test(t.name));
    const action=mixer.clipAction(new T.AnimationClip(source.name,source.duration,tracks));
    action.play();action.enabled=true;action.setEffectiveWeight(0);actions[source.name]=action;
  }
  const interior=meshes.find(m=>m.name==='MouthInterior');
  if(interior){
    const p=interior.geometry.attributes.position,delta=new Float32Array(p.count*3);
    interior.geometry.computeBoundingBox();const cy=interior.geometry.boundingBox.getCenter(new T.Vector3()).y;
    for(let i=0;i<p.count;i++)delta[i*3+1]=(p.getY(i)-cy)*6;
    interior.geometry.morphTargetsRelative=true;interior.geometry.morphAttributes.position=[new T.BufferAttribute(delta,3)];interior.updateMorphTargets();interior.visible=false;
  }
  let current='Idle',lastTime=null,expressionState={},expressionWeights={smile:0,frown:0,open:0,ouch:0},lastMood='idle';
  const headEuler=new T.Euler(),headQ=new T.Quaternion(),headRotation=rest.head.quaternion.clone();
  const armRotations=Object.fromEntries(['upper_arm.L','upper_arm.R','forearm.L','forearm.R'].map(n=>[n,rest[n].quaternion.clone()]));
  function select(name){
    if(name===current)return;
    const previous=actions[current],next=actions[name]??actions.Idle;
    next.reset().setEffectiveWeight(1).fadeIn(.22).play();previous?.fadeOut(.22);current=name;
  }
  function morph(name,value){for(const m of meshes){const index=m.morphTargetDictionary?.[name];if(index!==undefined)m.morphTargetInfluences[index]=value;}}
  function expression(args){expressionState=args;}
  function turnBone(bone,end,desired){
    const origin=bone.getWorldPosition(new T.Vector3()),from=end.getWorldPosition(new T.Vector3()).sub(origin).normalize();
    const delta=new T.Quaternion().setFromUnitVectors(from,desired.clone().sub(origin).normalize());
    const world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
    root.updateMatrixWorld(true);
  }
  function reach(suffix,goal,pole,weight){
    if(weight<.001)return;
    const upper=bones['upper_arm.'+suffix],fore=bones['forearm.'+suffix],hand=bones['hand.'+suffix];
    const a=upper.getWorldPosition(new T.Vector3()),b=fore.getWorldPosition(new T.Vector3()),c=hand.getWorldPosition(new T.Vector3());
    const target=portrait.localToWorld(new T.Vector3(...goal)),elbowPole=portrait.localToWorld(new T.Vector3(...pole));
    target.lerp(c,1-weight);
    const ab=a.distanceTo(b),bc=b.distanceTo(c),d=target.clone().sub(a),distance=clamp(d.length(),Math.abs(ab-bc)+.001,(ab+bc)*.995);d.normalize();
    target.copy(a).addScaledVector(d,distance);
    const across=elbowPole.sub(a).addScaledVector(d,-elbowPole.dot(d));
    if(across.lengthSq()<.0001)across.set(0,0,1);across.normalize();
    const along=(ab*ab-bc*bc+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,ab*ab-along*along));
    const elbow=a.clone().addScaledVector(d,along).addScaledVector(across,height);
    turnBone(upper,fore,elbow);turnBone(fore,hand,target);
  }
  function pose({time=0,motionTime=0,state='aim',entering=false,departing=false,entranceTime=0,exitTime=0,angry=false,poseStrength=1,result=null}={}){
    const dt=lastTime===null?0:clamp(time-lastTime,0,.05);lastTime=time;
    const walking=entering&&entranceTime<FLOW.walkEnd||departing&&exitTime>FLOW.walkOutAt;
    const settling=entering&&entranceTime>=FLOW.walkEnd;
    const mood=result??(departing?(angry?'angry':'happy'):'idle');lastMood=mood;
    select(walking?'Walk':mood==='happy'?'Happy':mood==='angry'?'Angry':'Idle');
    if(actions.Walk)actions.Walk.timeScale=2.15;
    // A small seated leg bend blends in during the visible sit-down.
    mixer.update(dt);
    const seated=!entering&&!departing&&!result;
    const sit=settling?smooth((entranceTime-FLOW.walkEnd)/(FLOW.seatEnd-FLOW.walkEnd)):seated?1:0;
    for(const s of ['L','R']){
      const thigh=bones['thigh.'+s],shin=bones['shin.'+s];
      if(sit){thigh.quaternion.slerp(rest['thigh.'+s].quaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.55)),sit*.65);shin.quaternion.slerp(rest['shin.'+s].quaternion.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.7)),sit*.65);}
    }
    const phase=motionTime%20,pulse=(a,b)=>phase>a&&phase<b?Math.sin((phase-a)/(b-a)*Math.PI)**2:0;
    const strength=seated?poseStrength:0,scratch=pulse(6,9)*strength,adjust=pulse(2,4)*strength,cheek=pulse(10,12.4)*strength,ear=pulse(13,15.4)*strength,shake=pulse(16.3,18.1)*strength;
    const yaw=seated?Math.sin(motionTime*.77)*.16+Math.sin(motionTime*8)*shake*.10:mood==='angry'?Math.sin(time*11)*.055:0;
    const {win=false,lose=false,react=0,talking=false}=expressionState;
    const angryAmount=(lose?react:0),happyAmount=(win?react:0);
    const pitch=cheek*.045+Math.sin(motionTime*6)*shake*.018+(angryAmount?Math.sin(time*19)*angryAmount*.028:0);
    headEuler.set(pitch,yaw,scratch*.035+ear*.065+Math.sin(motionTime*9)*shake*.028-angryAmount*.045);
    headQ.setFromEuler(headEuler).premultiply(rest.head.quaternion);headRotation.slerp(headQ,1-Math.exp(-dt*14));bones.head.quaternion.copy(headRotation);
    glasses.position.copy(rest.glasses.position);glasses.position.y+=adjust*.025;
    glasses.quaternion.copy(rest.glasses.quaternion);
    for(const s of ['L','R']){
      bones['eye.'+s].quaternion.copy(rest['eye.'+s].quaternion);
      const brow=bones['brow.'+s],sign=s==='L'?-1:1;
      brow.quaternion.copy(rest['brow.'+s].quaternion).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),sign*angryAmount*.22));
    }
    root.updateMatrixWorld(true);
    const weight=Math.max(scratch,adjust,cheek,ear);
    if(weight>0){
      const goal=scratch===weight?[-1.30,1.35,.65]:adjust===weight?[-1.08,.65,1.93]:ear===weight?[-1.56,-.20,.36]:[-.96,-.34,1.30];
      if(scratch===weight||cheek===weight||ear===weight)goal[1]+=Math.sin(motionTime*18)*.045;
      reach('L',goal,[-2.8,-1.2,1.2],smooth(weight));
    }
    if(departing&&!walking){
      const pay=exitTime>.42&&exitTime<1.66?Math.sin((exitTime-.42)/1.24*Math.PI):0;
      reach('R',[1.15,-2.10,1.8],[2.5,-3.0,1.0],pay);
      if(angry)reach('L',[-1.8,-.4,1.1],[-2.8,-2,1.3],Math.sin(clamp(exitTime/.7)*Math.PI)*.85);
    }
    if(result){
      for(const [s,sign] of [['L',-1],['R',1]])reach(s,result==='happy'?[sign*1.85,.40+Math.sin(time*5.5)*.15,1.1]:[sign*1.75,-1.1,1.1],[sign*2.8,-2.3,1],result==='happy'?.9:.65);
    }
    for(const [name,q] of Object.entries(armRotations)){q.slerp(bones[name].quaternion,1-Math.exp(-dt*20));bones[name].quaternion.copy(q);}
    const alpha=1-Math.exp(-dt*16),open=talking?.3+Math.abs(Math.sin(time*18))*.36:lose?react*.65:win?react*.40:0;
    const targets={smile:happyAmount,frown:angryAmount,open,ouch:angryAmount*.8};
    for(const k in targets)expressionWeights[k]=lerp(expressionWeights[k],targets[k],alpha);
    morph('Smile',expressionWeights.smile);morph('Frown',expressionWeights.frown);morph('CheekRaise',expressionWeights.smile*.8);morph('BrowAngry',expressionWeights.frown);morph('JawOpen',expressionWeights.open*.55);morph('Ouch',expressionWeights.ouch);
    const phaseBlink=time%4.7,blink=phaseBlink<.16?Math.sin(phaseBlink/.16*Math.PI):0;
    morph('Blink',Math.max(blink,expressionWeights.ouch*.42));
    if(interior){interior.visible=expressionWeights.open>.09;interior.morphTargetInfluences[0]=expressionWeights.open;}
    root.updateMatrixWorld(true);
    return {scratch,adjust,cheek,ear,shake,yaw};
  }
  function reset(){
    mixer.stopAllAction();for(const [name,a] of Object.entries(actions))a.reset().setEffectiveWeight(name==='Idle'?1:0).play();current='Idle';lastTime=null;expressionState={};expressionWeights={smile:0,frown:0,open:0,ouch:0};
    for(const [name,b] of Object.entries(bones)){b.position.copy(rest[name].position);b.quaternion.copy(rest[name].quaternion);b.scale.set(1,1,1);}
    headRotation.copy(rest.head.quaternion);for(const [name,q] of Object.entries(armRotations))q.copy(rest[name].quaternion);
    for(const m of meshes)if(m.morphTargetInfluences)m.morphTargetInfluences.fill(0);
    root.updateMatrixWorld(true);
  }
  reset();
  return {rigged:true,portrait,face,body,limbs,glasses,hairMat,whiteMat,skin,dark,cream,pose,expression,reset,bones,visual,meshes,get currentAction(){return current;},get mood(){return lastMood;}};
}
