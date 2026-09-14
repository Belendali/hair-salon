import * as T from '/vendor/three.module.js';
import {createGranny} from 'https://panic-salon-bella.belendali.chatgpt.site/demo-34/granny-model.mjs';
import {createGirl} from 'https://panic-salon-bella.belendali.chatgpt.site/demo-34/girl-model.mjs';
import {createMan} from 'https://panic-salon-bella.belendali.chatgpt.site/demo-34/man-model.mjs';
import {createPayment} from 'https://panic-salon-bella.belendali.chatgpt.site/demo-34/payment.mjs';
const $=s=>document.querySelector(s),dialog=$('#viewer'),host=$('#viewport');
let renderer,scene,camera,object,model,effect,pose='idle',yaw=0,drag=null,last=0,elapsed=0,paused=false,generation=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function dispose(){if(renderer)renderer.setAnimationLoop(null);if(scene){const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}scene=null;object=null;model=null;effect=null;}
function fit(){if(!renderer||!object)return;const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const box=new T.Box3().setFromObject(object),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const fit=Math.max(size.y,size.x/camera.aspect)*1.20;camera.position.set(0,center.y,fit/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))+Math.max(1,size.z/2));camera.lookAt(0,center.y,0);camera.updateProjectionMatrix();}
function choosePose(next){pose=next;elapsed=0;document.querySelectorAll('[data-pose]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pose===pose)));}
function tick(now){if(!scene)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(!paused&&!document.hidden)elapsed+=dt;
 if(model){
  const time=elapsed+1,motion=pose==='fidget'?elapsed+2:pose==='idle'?elapsed:0;
  model.pose({motionTime:motion,entering:pose==='walk',entranceTime:elapsed%1.4,poseStrength:pose==='fidget'||pose==='idle'?1:0});
  model.expression({time,win:pose==='happy',lose:pose==='angry',react:['happy','angry'].includes(pose)?1:0,talking:pose==='talk',motionTime:motion,t:1});
  if(effect){effect.visible=pose==='angry';effect.children.forEach((p,i)=>{if(effect.userData.kind==='girl'){p.position.y=.54-((elapsed*1.7+i*.25)%1)*1.12;}else{p.scale.y=.88+.24*Math.sin(elapsed*11+i*2);p.rotation.z=Math.sin(elapsed*7+i)*.13;}});}
 }
 object.rotation.y=yaw;renderer.render(scene,camera);
}
export async function open(id,label){
 const gen=++generation;dispose();$('#viewer-title').textContent=label;$('#viewer-loading').textContent='Loading preview…';$('#viewer-loading').hidden=false;$('#viewer-tag').textContent=id.startsWith('character:')?'CURRENT IN-GAME CHARACTER':'PROCEDURAL OBJECT';$('#pose-controls').hidden=!id.startsWith('character:');$('#viewer-note').textContent='Drag to rotate. Motion uses the game’s current code.';if(!dialog.open)dialog.showModal();
 try{
  if(!renderer){renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.append(renderer.domElement);}
  scene=new T.Scene();camera=new T.PerspectiveCamera(32,1,.05,200);scene.add(new T.HemisphereLight('#fafafa','#959ba1',1.4));for(const [color,intensity,pos] of [['#fff1e7',2.6,[-5,9,10]],['#e2edff',.9,[6,3,5]],['#fff0d8',1.5,[2,6,-5]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light);}
  const [type,key]=id.split(':');
  if(type==='character'){
   object=new T.Group();model=({granny:createGranny,girl:createGirl,man:createMan}[key])(object);model.pose({entering:true,entranceTime:0});model.expression({time:1});
   const r=await fetch(`./files/props/${key==='girl'?'girl-tears':'granny-flames'}.json`);if(!r.ok)throw Error('Effect unavailable');const data=await r.json();if(gen!==generation)return;effect=await new T.ObjectLoader().parseAsync(data);if(gen!==generation)return;effect.userData.kind=key;if(key==='man')effect.children.forEach(p=>p.position.y-=.95);effect.visible=false;model.portrait.add(effect);
  }else{
   const r=await fetch(`./files/props/${key}.json`);if(!r.ok)throw Error('Object unavailable');const data=await r.json();if(gen!==generation)return;object=await new T.ObjectLoader().parseAsync(data);if(gen!==generation)return;
   // Restore the same runtime canvas art to banknote faces in this preview.
   if(key==='tip-jar'){const bill=createPayment();bill.setValue(10);object.traverse(o=>{if(o.isMesh&&o.geometry.type==='PlaneGeometry')o.material=bill.group.children[0].material;});}
   $('#viewer-note').textContent='Drag to rotate. Static mesh snapshot; animation source is in the ZIP.';
  }
  if(gen!==generation)return;scene.add(object);yaw=type==='prop'?.15:0;elapsed=0;paused=reduced;last=0;$('#motion-toggle').textContent=paused?'Play motion':'Pause motion';$('#motion-toggle').hidden=type!=='character';choosePose('idle');fit();$('#viewer-loading').hidden=true;renderer.setAnimationLoop(tick);
 }catch(e){if(gen===generation){$('#viewer-loading').textContent='3D preview unavailable on this device. Download the files to edit them.';console.error(e);}}
}
dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;dispose();});dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>choosePose(b.dataset.pose));$('#motion-toggle').onclick=()=>{paused=!paused;$('#motion-toggle').textContent=paused?'Play motion':'Pause motion';};
host.onpointerdown=e=>{drag={x:e.clientX,yaw};host.setPointerCapture(e.pointerId);};host.onpointermove=e=>{if(drag)yaw=drag.yaw+(e.clientX-drag.x)*.008;};host.onpointerup=host.onpointercancel=()=>drag=null;new ResizeObserver(()=>{if(object)fit();}).observe(host);
