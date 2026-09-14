import {createMan,createGraftTuft} from './man-model.mjs?v=35';
import {createGirl} from './girl-model.mjs?v=35';
import {createPayment} from './payment.mjs?v=35';
import {createGranny} from './granny-model.mjs?v=35';
import * as T from './vendor/three.module.js';
import {CONFIG,FLOW,CLOSE,SWIPE,GRAFT,sweepCrossings,lerp,clamp,smooth} from './rules.mjs?v=35';

const material=(color,roughness=.6,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const sphereGeo=new T.SphereGeometry(1,40,28);
function ellipsoid(parent,mat,x,y,z,sx,sy,sz){const m=new T.Mesh(sphereGeo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
function pathMesh(parent,points,radius,mat){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,24,radius,8,false),mat);parent.add(mesh);return mesh;}
function dynamicTube(radius,mat){const rings=18,sides=8;const g=new T.BufferGeometry();const positions=new Float32Array((rings+1)*(sides+1)*3);const indices=[];for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}g.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));g.setIndex(indices);const mesh=new T.Mesh(g,mat);mesh.frustumCulled=false;mesh.userData={rings,sides,radius};return mesh;}
function updateTube(mesh,root,tip,bend=0,taper=true){const {rings,sides,radius}=mesh.userData;const p=mesh.geometry.attributes.position;for(let i=0;i<=rings;i++){const t=i/rings,s=Math.sin(t*Math.PI);const cx=lerp(root.x,tip.x,t)+bend*s,cy=lerp(root.y,tip.y,t),cz=lerp(root.z,tip.z,t)+.1*s;const r=radius*(taper?lerp(1,.16,t):1);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;p.setXYZ(i*(sides+1)+j,cx+Math.cos(a)*r,cy+Math.cos(a)*r*.09,cz+Math.sin(a)*r);}}p.needsUpdate=true;mesh.geometry.computeVertexNormals();}

export function createSalon(scene,{setting='contain'}={}){
  const head=new T.Group();scene.add(head);
  const grannyRoot=new T.Group(),girlRoot=new T.Group(),manRoot=new T.Group();head.add(grannyRoot,girlRoot,manRoot);
  const models={granny:createGranny(grannyRoot),girl:createGirl(girlRoot),man:createMan(manRoot)};
  const rageEffects=Object.fromEntries(Object.entries(models).map(([kind,m])=>[kind,createRageEffect(m.portrait,kind)]));
  let client='granny',model=models.granny;
  let {portrait,body,limbs,glasses,hairMat,whiteMat,skin,dark,cream}=model;
  girlRoot.visible=manRoot.visible=false;
  const counter=new T.Mesh(new T.BoxGeometry(9,2.6,.5),material('#3b4042',.48,.12));counter.name='salon-counter';counter.position.z=2.8;scene.add(counter);
  const counterLip=new T.Mesh(new T.BoxGeometry(9,.05,.60),material('#adb4b6',.24,.65));scene.add(counterLip);
  const tipJar=createTipJar(scene);
  const furnishings=createFurnishings(scene);furnishings.visible=setting==='salon'||setting==='full';
  furnishings.getObjectByName('salon-floor').visible=setting==='salon';
  const shadow=ellipsoid(scene,new T.MeshBasicMaterial({color:'#303439',transparent:true,opacity:.10,depthWrite:false}),0,0,-.4,1.9,.09,.12);
  const hairs=[];
  for(let i=0;i<CONFIG.hairCount;i++){
    const x=lerp(CONFIG.minX,CONFIG.maxX,i/(CONFIG.hairCount-1));
    const root=new T.Vector3(x*.94,Math.sqrt(1-(x*.94/1.75)**2)*2.23,.56);
    const tip=new T.Vector3(x,3.02-.60*(Math.abs(x)/1.55)**1.5+Math.sin(i*.83)*.04,.75);
    const mesh=dynamicTube(.080,hairMat);scene.add(mesh);
    hairs.push({id:i,x,root,tip,mesh,white:false,removed:false,renderTip:tip.clone(),detachVector:null});
  }
  const tweezers=new T.Group();scene.add(tweezers);tweezers.position.z=1.03;
  const silver=material('#ccd4d9',.22,.82),pink=material('#687078',.3,.12),darkSilver=material('#7e8a98',.24,.8);
  const arms=[];
  for(const side of [-1,1]){
    const pivot=new T.Group();pivot.position.set(0,1.68,0);tweezers.add(pivot);
    const shape=new T.Shape();shape.moveTo(-.09,0);shape.quadraticCurveTo(0,.12,.09,0);shape.lineTo(.12,-.97);shape.lineTo(.035,-1.68);shape.lineTo(-.018,-1.68);shape.lineTo(-.09,-.99);shape.closePath();
    const mesh=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.025,curveSegments:10}),silver);pivot.add(mesh);
    ellipsoid(pivot,pink,0,-.52,.178,.072,.51,.035);
    pathMesh(pivot,[[-.017,-1.28,.19],[-.008,-1.5,.19],[.007,-1.66,.15]],.017,darkSilver);
    arms.push({pivot,side});
  }
  ellipsoid(tweezers,silver,0,1.67,.08,.16,.12,.12);
  const sparkles=[];
  const sparkleGold=material('#dcf579',.35),rose=material('#e5e8eb',.45);
  for(let i=0;i<6;i++){const mesh=new T.Mesh(new T.OctahedronGeometry(.07+(i%3)*.025),i%2?sparkleGold:rose);mesh.visible=false;scene.add(mesh);sparkles.push(mesh);}
  const payment=createPayment(),money=payment.group;scene.add(money);
  const scissors=new T.Group();scene.add(scissors);scissors.visible=false;const blades=[];
  for(const side of [-1,1]){const pivot=new T.Group();scissors.add(pivot);
   const shape=new T.Shape();shape.moveTo(.15,-.055);shape.lineTo(-.75,-.015);shape.quadraticCurveTo(-.88,0,-.75,.035);shape.lineTo(.15,.10);shape.closePath();
   const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:true,bevelSize:.014,bevelThickness:.015,bevelSegments:2,steps:1}),silver);pivot.add(blade);
   pathMesh(pivot,[[.05,0,0],[.24,0,0],[.32,side*.1,0]],.045,darkSilver);
   const handle=new T.Mesh(new T.TorusGeometry(.15,.045,10,32),pink);handle.position.set(.47,side*.10,0);pivot.add(handle);blades.push({pivot,side});
  }
  ellipsoid(scissors,silver,0,0,.07,.06,.06,.045);
  const graftTool=new T.Group();graftTool.name='pressure-planting-pen';graftTool.visible=false;scene.add(graftTool);
  const penBody=new T.MeshPhysicalMaterial({color:'#d7edf1',roughness:.12,metalness:.08,transparent:true,opacity:.32,depthWrite:false,clearcoat:1,clearcoatRoughness:.08}),penAccent=material('#b9c9ce',.28,.42);
  const barrel=new T.Mesh(new T.CylinderGeometry(.235,.215,1.12,40),penBody);barrel.name='transparent-syringe-barrel';barrel.position.y=.89;graftTool.add(barrel);
  for(const y of [.36,1.39]){const ring=new T.Mesh(new T.CylinderGeometry(.24,.24,.06,32),silver);ring.position.y=y;graftTool.add(ring);}
  const fluid=new T.Mesh(new T.CylinderGeometry(.15,.15,.90,28),new T.MeshStandardMaterial({color:'#9dc8ce',roughness:.25,transparent:true,opacity:.42,depthWrite:false}));fluid.position.set(0,.88,-.04);graftTool.add(fluid);
  const flange=new T.Mesh(new T.BoxGeometry(.73,.07,.30),penAccent);flange.position.y=1.43;graftTool.add(flange);
  for(let i=0;i<9;i++){const tick=new T.Mesh(new T.BoxGeometry(i%2?.055:.085,.012,.015),darkSilver);tick.position.set(.17,.47+i*.10,.21);graftTool.add(tick);}
  const highlight=new T.Mesh(new T.CylinderGeometry(.013,.013,.9,8),new T.MeshBasicMaterial({color:'#f2ffff',transparent:true,opacity:.65}));highlight.position.set(-.19,.90,.12);graftTool.add(highlight);

  const tipMesh=new T.Mesh(new T.CylinderGeometry(.038,.013,.32,20),silver);tipMesh.position.y=.19;graftTool.add(tipMesh);
  const plunger=new T.Group();graftTool.add(plunger);
  const rod=new T.Mesh(new T.CylinderGeometry(.068,.068,.43,18),silver);rod.position.y=1.64;plunger.add(rod);
  ellipsoid(plunger,penAccent,0,1.91,0,.27,.095,.22);
  // A vertical timing gauge embedded in the front of the barrel.
  const gauge=new T.Group();gauge.name='syringe-gauge';gauge.position.set(0,.89,.247);graftTool.add(gauge);
  const meterMesh=(name,w,h,color,z)=>{const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,depthTest:false}));m.name=name;m.position.z=z;m.renderOrder=20+z*100;gauge.add(m);return m;};
  meterMesh('gauge-frame',.26,1.02,'#cbd3d8',0);
  meterMesh('gauge-track',.20,.94,'#20282c',.01);
  const safeBand=meterMesh('gauge-green',.20,1,'#b8ef62',.02);
  const marker=meterMesh('gauge-marker',.28,.045,'#ffffff',.03);

  const looseGraft=createGraftTuft(models.man.hairMat);looseGraft.visible=false;scene.add(looseGraft);
  const scalpReaction=new T.Mesh(new T.RingGeometry(.11,.21,36),new T.MeshBasicMaterial({color:'#f29180',transparent:true,opacity:.8,depthTest:false,depthWrite:false}));scalpReaction.visible=false;scalpReaction.renderOrder=8;scene.add(scalpReaction);
  const aimRing=new T.Mesh(new T.RingGeometry(.14,.175,32),new T.MeshBasicMaterial({color:'#ffffff',depthTest:false,depthWrite:false}));aimRing.renderOrder=9;aimRing.visible=false;scene.add(aimRing);
  const aimDots=Array.from({length:5},()=>{const m=new T.Mesh(new T.SphereGeometry(.022,8,6),new T.MeshBasicMaterial({color:'#e5efdc',transparent:true,opacity:.6,depthTest:false}));m.visible=false;scene.add(m);return m;});
  const guide=new T.Group();guide.name='bangs-standard';models.girl.portrait.add(guide);
  const guideMat=new T.MeshBasicMaterial({color:'#dcf579',transparent:true,opacity:.78,depthTest:false,depthWrite:false});
  for(let i=0;i<11;i++){const dash=new T.Mesh(new T.BoxGeometry(.115,.014,.012),guideMat);dash.position.set(-1.02+i*.204,SWIPE.targetY,1.45);dash.renderOrder=8;guide.add(dash);}guide.visible=false;
  let height=17.3,baseY=-5.9;
  function setSize(h){height=h;furnishings.position.y=-h/2;baseY=-height/2+2.55;head.position.y=baseY;counter.position.y=baseY-3.35;counterLip.position.set(0,baseY-2.05,2.8);}
  function reset(whiteId,kind='granny'){
    for(const root of [grannyRoot,girlRoot,manRoot]){root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);}
    tipJar.visible=false;Object.values(rageEffects).forEach(e=>e.update(0,false));
    client=kind;model=models[kind];({portrait,body,limbs,glasses,hairMat,whiteMat,skin,dark,cream}=model);grannyRoot.visible=kind==='granny';girlRoot.visible=kind==='girl';manRoot.visible=kind==='man';model.reset?.();graftTool.userData.ready=false;
    for(const h of hairs){h.white=(Array.isArray(whiteId)?whiteId:[whiteId]).includes(h.id);h.mesh.visible=true;h.removed=false;h.detachVector=null;h.pluckPosition=null;h.mesh.material=h.white?whiteMat:hairMat;h.mesh.userData.radius=h.white?.072:.080;}head.rotation.z=0;head.scale.set(1,1,1);}
  function update({time,state,checkoutTime=0,dayTotal=0,clientResults=[],t=0,target=null,scanX=0,whiteId=5,entranceTime=0,exitTime=0,ending=null,motionTime=0,readyTime=0,cutTime=0,cutGood=false,cutHolding=false,swipeX=SWIPE.startX,swipeY=null,graftPoint=null,graftSite=0,graftTime=0,graftGood=false,graftPower=0,graftWindow={low:.48,high:.72},graftOutcome=null}){
    tipJar.visible=state==='complete';
    if(state==='complete'){
      const age=checkoutTime;
      for(const tool of [tweezers,scissors,graftTool,guide,money,looseGraft,scalpReaction,aimRing,counter,counterLip,shadow,furnishings])tool.visible=false;
      hairs.forEach(h=>h.mesh.visible=false);sparkles.forEach(s=>s.visible=false);aimDots.forEach(s=>s.visible=false);
      head.visible=true;head.position.set(0,0,0);head.scale.setScalar(1);head.rotation.set(0,0,0);
      [grannyRoot,girlRoot,manRoot].forEach((root,i)=>{
        const kind=['granny','girl','man'][i],m=models[kind],success=clientResults.find(r=>r.client===kind)?.ending==='happy',arrive=smooth(clamp((age-.2-i*.16)/.70)),dance=Math.max(0,age-1.15-i*.1);
        root.userData.ending=success?'happy':'angry';root.visible=true;root.scale.setScalar(.62);
        root.position.set(lerp(i===1?0:(i===0?-6:6),(i-1)*2.35,arrive),-height/2+2.65+(1-arrive)*-.6+(success?Math.abs(Math.sin(dance*5.5))*.32:0),0);
        root.rotation.set(0,0,success?Math.sin(dance*5.5+i)*.04:0);
        m.pose({motionTime:0,entering:false,departing:false,angry:!success,poseStrength:0});
        m.portrait.rotation.set(0,0,success?0:(i-1)*.035);
        m.expression({time,win:success,lose:!success,react:1,motionTime:0,talking:false,t:1,cutTime:1});
        rageEffects[['granny','girl','man'][i]].update(time,!success);
        if(!success){root.rotation.z=Math.sin(time*22+i)*.013;m.limbs.forEach(({arm},j)=>arm.rotation.z=(j===0?1:-1)*.32);}
        if(success)m.limbs.forEach(({arm},j)=>{arm.rotation.z=(j===0?1:-1)*(.30+Math.abs(Math.sin(dance*5.5))*.28);});
      });
      tipJar.position.set(0,height*.10,3);
      tipJar.rotation.z=Math.sin(Math.min(age,1.8)*8)*Math.exp(-age*2)*.04;
      tipJar.userData.notes.forEach((note,i)=>{const drop=clamp((age-.18-i*.055)/.45);note.visible=i<Math.max(1,Math.round(dayTotal/10));note.position.y=note.userData.restY+(1-drop)*3;note.rotation.z=note.userData.angle+(1-drop)*.6;});
      return;
    }
    Object.values(rageEffects).forEach(e=>e.update(time,false));
    furnishings.visible=setting==='salon'||setting==='full';
    const active=state==='action'||state==='result';const cutting=state==='cut',grafting=(state==='graft'&&graftTime>=0)||state==='graft-result';const hit=active&&target;const popped=hit&&t>=.55;const departing=state==='exit'||(state==='result'&&ending);const win=(popped&&target.white)||(departing&&ending==='happy')||(cutting&&cutGood&&cutTime>.3)||(grafting&&graftGood);const lose=(popped&&!target.white)||(departing&&ending==='angry')||(cutting&&!cutGood&&cutTime>.3)||(grafting&&!graftGood);
    const react=departing?1:grafting?smooth(graftTime/.16):cutting?smooth((cutTime-.3)/.3):clamp((t-.65)/.45)*(1-smooth(clamp((t-1.3)/.4)));const spring=t>.55?Math.exp(-(t-.55)*5)*Math.sin((t-.55)*19):0;
    const pull=hit&&t>.37&&t<.55?clamp((t-.37)/.18):0;
    head.position.y=baseY+Math.sin(time*1.5)*.017+(active?.20*pull+spring*.18:0)+(win?Math.sin(clamp((t-.7)/.8)*Math.PI)*.26:0);
    head.scale.set(1+spring*.021,1-spring*.052,1);
    head.rotation.z=lose?-.075*react:0;
    head.position.x=0;
    const entering=state==='entrance';
    tweezers.visible=client==='granny'&&['aim','action','welcome'].includes(state);scissors.visible=client==='girl'&&(state==='aim'||(state==='cut'&&cutTime<.18));
    guide.visible=client==='girl'&&['aim','cut'].includes(state);
    head.visible=!(state==='result'&&ending);money.visible=false;
    limbs.forEach(({arm,leg})=>{arm.rotation.z=0;leg.rotation.x=0;leg.rotation.z=0;});
    head.rotation.y=0;
    if(entering){
      const walk=smooth(clamp((entranceTime-FLOW.walkStart)/(FLOW.walkEnd-FLOW.walkStart))),sit=smooth(clamp((entranceTime-FLOW.walkEnd)/(FLOW.seatEnd-FLOW.walkEnd)));
      const size=lerp(.66,1,sit);head.scale.setScalar(size);head.position.x=lerp(-5.5,0,walk);
      const gait=Math.sin(entranceTime*Math.PI/.30);head.position.y=baseY+1.25*(1-sit)+(walk<1?Math.abs(gait)*.07:0);
      head.rotation.y=Math.PI*.5*(1-sit);head.rotation.z=walk<1?gait*.022:0;
      if(entranceTime>1.90){const age=entranceTime-1.90,bounce=Math.sin(age*22)*Math.exp(-age*10);head.position.y+=bounce*.05;}
    }
    if(departing){
      const stand=smooth(clamp(exitTime/.60)),walk=smooth(clamp((exitTime-FLOW.walkOutAt)/(FLOW.exitDuration-FLOW.walkOutAt)));
      head.scale.setScalar(1);head.position.set(walk*7,baseY+1.85*stand,0);
      head.rotation.y=Math.PI*.5*smooth(clamp((exitTime-FLOW.walkOutAt)/.35));
      const gait=Math.sin((exitTime-FLOW.walkOutAt)*Math.PI/.25);
      if(exitTime>FLOW.walkOutAt){head.position.y+=Math.abs(gait)*.06;head.rotation.z=gait*(lose?.04:.022);}
      else head.rotation.z=lose?Math.sin(exitTime*15)*.025:Math.sin(exitTime*5)*.014;
      money.visible=exitTime>.57&&exitTime<1.50;
      money.rotation.set(-.08,0,lerp(-.22,.08,smooth((exitTime-.57)/.8)));money.scale.setScalar(1);
    }
    // Push in only for the service; restore the settlement framing before payment.
    const focus=state==='ready'?smooth((readyTime-.05)/.85):['aim','action','cut','graft','graft-result'].includes(state)?1:departing?1-smooth(exitTime/.55):0;
    const serviceScale=client==='girl'?CLOSE.girlScale:client==='man'?CLOSE.manScale:CLOSE.scale,serviceOffset=client==='girl'?CLOSE.girlBaseOffset:client==='man'?CLOSE.manBaseOffset:CLOSE.baseOffset;
    const zoom=lerp(1,serviceScale,focus);head.scale.multiplyScalar(zoom);
    head.position.y+=(-height/2+serviceOffset-baseY)*focus;
    counter.visible=counterLip.visible=setting==='contain'&&focus<.98;
    shadow.visible=head.visible&&!entering&&!departing&&focus<.5;
    shadow.position.set(head.position.x,(entering||departing)?baseY+.12:baseY-2.28,-.4);
    shadow.scale.x=entering?1.9-((head.position.y-baseY)*.25):1.9;
    model.expression({time,win,lose,react,exitTime,departing,motionTime,talking:state==='ready'&&readyTime<.95,t:cutTime});
    const motion=model.pose({motionTime,entering,departing,entranceTime,exitTime,angry:!!lose,poseStrength:cutting?1-smooth(cutTime/.35):state==='graft-result'?1-smooth(graftTime/.35):1});
    if(!entering&&!departing)head.position.x+=Math.sin(motionTime*.63)*.12;
    if(client==='man'&&state==='graft'&&graftOutcome==='deep')head.position.y-=Math.sin(clamp(graftTime/.6)*Math.PI)*.18;
    // Share the seated close-up pivot with the furniture, not the walking body.
    // Armrests stay at body height when the face moves down for the service.
    furnishings.scale.setScalar(zoom);
    furnishings.position.set(
      !entering&&!departing?head.position.x*focus:0,
      baseY-2.55*zoom+(-height/2+serviceOffset-baseY)*focus,
      0
    );
    head.updateMatrixWorld(true);
    if(money.visible){const handPos=model.limbs[1].hand.getWorldPosition(new T.Vector3()),pay=smooth(clamp((exitTime-.65)/.60));money.position.copy(handPos).lerp(new T.Vector3(1.55,baseY-1.88,3.5),pay);money.position.z=3.5;}

    const restY=lerp(baseY+4.08,-height/2+CLOSE.baseOffset+3.68*CLOSE.scale,focus)+CLOSE.tweezerLift*focus;
    let tx=scanX,ty=restY,open=1;
    if(active){const currentTip=target?portrait.localToWorld(target.tip.clone()):null;
      if(target&&t>=.55&&!target.pluckPosition)target.pluckPosition=currentTip.clone();
      const grip=target?.pluckPosition??currentTip;const tipY=grip?grip.y:baseY+2.92;const tipX=grip?grip.x:scanX;
      if(t<.07){ty=restY+Math.sin(t/.07*Math.PI)*.065;}
      else if(t<.27){const s=clamp((t-.07)/.2);ty=lerp(restY,tipY,s*s*(3-2*s));tx=lerp(scanX,tipX,s);}
      else if(t<.37){ty=tipY;tx=tipX;open=1-clamp((t-.27)/.1);}
      else if(!target){ty=lerp(tipY,restY,clamp((t-.37)/.27));open=clamp((t-.5)/.14);}
      else if(t<.55){tx=tipX;ty=tipY+pull*.43;open=0;}
      else {tx=tipX;const u=clamp((t-.55)/.22);ty=lerp(tipY+.43,restY+.18,1-(1-u)**3)+spring*.07;open=0;}
    }
    tweezers.position.set(tx,ty,1.10*zoom);arms.forEach(({pivot,side})=>pivot.rotation.z=side*(.006+.106*open));
    for(const h of hairs){
      h.mesh.visible=client==='granny'&&head.visible&&!entering&&(!h.removed||(h===target&&active));
      if(!h.mesh.visible)continue;
      const root=portrait.localToWorld(h.root.clone());const tip=portrait.localToWorld(h.tip.clone());let bend=Math.sin(time*2.1+h.id*.67)*.025;
      if(state==='ready'){const growth=smooth(clamp((readyTime-.14-h.id*.012)/.48));tip.lerp(root,1-growth);bend*=growth;}
      if(h===target&&active){
        if(t>=.27){tip.set(tx,ty,1.10*zoom+.08);}
        if(t>=.55){if(!h.detachVector)h.detachVector=new T.Vector3(h.tip.x-h.root.x,h.tip.y-h.root.y+.25,h.tip.z-h.root.z).multiplyScalar(zoom);root.copy(tip).sub(h.detachVector);root.x+=Math.sin((t-.55)*15)*Math.exp(-(t-.55)*3)*.13;bend=Math.sin((t-.55)*12)*Math.exp(-(t-.55)*3)*.10;}
      }else if(active&&t>.59){bend+=Math.sin((t-.59)*18-h.id*.3)*Math.exp(-(t-.59)*5)*.08;}
      if(h===target&&active&&t>1.1){const shrink=1-smooth(clamp((t-1.1)/.5));root.lerp(tip,1-shrink);}
      h.mesh.userData.radius=(h.white?.072:.080)*lerp(1,1.45,focus);updateTube(h.mesh,root,tip,bend);h.renderTip.copy(tip);
    }
    if(scissors.visible){
      const toolScale=SWIPE.toolScale,cy=swipeY??(-height/2+CLOSE.girlBaseOffset+SWIPE.targetY*CLOSE.girlScale);
      scissors.position.set(swipeX+.26*toolScale,cy,3.05);scissors.scale.setScalar(toolScale);
      const gape=cutHolding?.035+.18*Math.abs(Math.sin(time*39)):.20+Math.sin(time*3)*.025;
      blades.forEach(({pivot,side})=>pivot.rotation.z=side*gape);
    }
    graftTool.visible=client==='man'&&['aim','graft'].includes(state);looseGraft.visible=false;scalpReaction.visible=false;aimRing.visible=false;aimDots.forEach(d=>d.visible=false);
    let plantPoint=null;
    if(client==='man'){
      const selected=model.sites[graftSite]??model.sites[0];
      plantPoint=portrait.localToWorld(selected.position.clone());
      model.updateSites(time,state==='aim',graftSite);
      if(graftTool.visible){
        const destination=plantPoint.clone();
        const elapsed=Math.max(0,Math.min(.06,time-(graftTool.userData.lastTime??time)));
        const x=graftTool.userData.ready?lerp(graftTool.position.x,destination.x,1-Math.exp(-elapsed*12)):destination.x;
        const origin=new T.Vector3(x,-height/2+5.25,destination.z+.25);
        graftTool.userData.ready=true;graftTool.userData.lastTime=time;
        graftTool.position.copy(origin);graftTool.scale.setScalar(1.36);graftTool.rotation.z=0;
        const compression=state==='aim'?0:Math.max(0,1-(graftTime+GRAFT.flightTime)/.28);
        plunger.position.y=-compression*.24;
        safeBand.scale.y=(graftWindow.high-graftWindow.low)*.94;
        safeBand.position.y=((graftWindow.high+graftWindow.low)/2-.5)*.94;
        marker.position.y=(graftPower-.5)*.94;
        marker.material.color.set(state==='graft'?(graftGood?'#e5ffab':'#ff805b'):'#ffffff');
        if(state==='graft'&&graftTime<0){
          looseGraft.visible=true;looseGraft.position.copy(origin).lerp(destination,clamp(1+graftTime/GRAFT.flightTime));
          looseGraft.scale.setScalar(.40);looseGraft.rotation.z=graftTool.rotation.z;
        }
      }
      if(state==='graft'&&graftTime>=0&&['shallow','miss'].includes(graftOutcome)){
        const p=graftPoint??plantPoint,a=graftTime;looseGraft.visible=a<.85;
        looseGraft.position.set(p.x+Math.sin(a*4)*.65,p.y+Math.sin(Math.min(1,a/.85)*Math.PI)*1.7,p.z+.27);
        looseGraft.rotation.z=a*6;looseGraft.scale.setScalar(Math.max(.02,1-a/.85));
      }
      if(state==='graft'&&graftTime>=0&&graftOutcome==='deep'){
        scalpReaction.visible=true;scalpReaction.position.copy(plantPoint);scalpReaction.position.z=3.3;
        scalpReaction.scale.setScalar(1+graftTime*1.8);scalpReaction.material.opacity=.8*(1-clamp(graftTime/.85));
      }
    }
    sparkles.forEach((s,i)=>{
      const graftWin=client==='man'&&state==='graft'&&graftGood&&graftTime>=0&&graftTime<.8;
      s.visible=graftWin||(!!win&&!!target&&!departing&&t<2);
      if(graftWin){const a=i/6*Math.PI*2,age=graftTime;s.position.set(plantPoint.x+Math.cos(a)*(.1+age*1.1),plantPoint.y+Math.sin(a)*age+age*.4,plantPoint.z+.3);s.scale.setScalar(1-age/.8);s.rotation.z=age*4+i;}
      else if(s.visible){const a=i/12*Math.PI*2,age=t-.55;s.position.set(target.x+Math.cos(a)*(.16+age*1.8),ty+Math.sin(a)*age*1.3-age*age*.7,1.8);s.rotation.z=time*3+i;s.scale.setScalar(Math.max(0,1-age/1.5));}
    });
    return {tweezerX:tx,tweezerY:ty,baseY,win:!!win,lose:!!lose};
  }
  // Cast screen-space blade points onto the moving face plane. Comparing the
  // previous and current pose makes both the swipe and head motion cut the hair.
  function swipeLocal(point,matrix=portrait.matrixWorld){
    const plane=new T.Plane(new T.Vector3(0,0,1),-1.19).applyMatrix4(matrix);
    const hit=new T.Ray(new T.Vector3(point.x,point.y,24),new T.Vector3(0,0,-1)).intersectPlane(plane,new T.Vector3());
    return hit?hit.applyMatrix4(matrix.clone().invert()):null;
  }
  function sweepCut(from,to,previousMatrix,touched,time){
    head.updateMatrixWorld(true);const a=swipeLocal(from,previousMatrix),b=swipeLocal(to);if(!a||!b)return 0;
    let count=0;for(const hit of sweepCrossings(a,b,model.sections,touched)){touched.add(hit.i);if(model.cutStrand(hit.i,hit.y,time))count++;}return count;
  }
  function getGraftTarget(point){if(client!=='man')return null;head.updateMatrixWorld(true);let best=null,distance=GRAFT.hitRadius;
    for(const site of model.sites){if(site.filled)continue;const p=portrait.localToWorld(site.position.clone()),d=Math.hypot(point.x-p.x,point.y-p.y);if(d<=distance){best=site;distance=d;}}return best;
  }
  setSize(height);reset(5);return {head,furnishings,get body(){return body;},counter,get limbs(){return limbs;},money,get glasses(){return glasses;},get model(){return model;},hairs,tweezers,scissors,graftTool,getGraftTarget,getGraftSource:()=>({x:GRAFT.sourceX,y:-height/2+GRAFT.sourceHeight}),getGraftSitePosition:i=>{head.updateMatrixWorld(true);return portrait.localToWorld(model.sites[i].position.clone());},plantGraft:(i,time)=>client==='man'&&model.plant(i,time),setTip:payment.setValue,
    getSwipeStart:()=>({x:SWIPE.startX,y:-height/2+CLOSE.girlBaseOffset+SWIPE.targetY*CLOSE.girlScale}),
    getPortraitMatrix:()=>{head.updateMatrixWorld(true);return portrait.matrixWorld.clone();},sweepCut,
    getCutHeight:y=>swipeLocal({x:scissors.position.x-.26*SWIPE.toolScale,y:y??scissors.position.y})?.y??1.14,setSize,reset,update,getBaseY:()=>baseY};
}


// Actual 3D furniture shares the character scene and lighting.
function createFurnishings(scene){
 const room=new T.Group();room.name='salon-furnishings';scene.add(room);
 const leather=material('#252b30',.78),piping=material('#59636a',.5),chrome=material('#b6c2c8',.23,.82),stone=material('#5f686c',.6),cabinet=material('#303a40',.68);
 function rounded(parent,w,h,d,r,mat,x,y,z){
  const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const mesh=new T.Mesh(new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:3,steps:1,curveSegments:6}),mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 // Low charcoal floor grounds the chair without filling the selfie above it.
 rounded(room,9,1.4,.1,.02,material('#333b40',.9),0,.28,-2).name='salon-floor';
 const chair=new T.Group();chair.name='leather-barber-chair';room.add(chair);
 rounded(chair,3.35,2.12,.34,.34,chrome,0,1.28,-1.95);
 rounded(chair,3.23,2.02,.38,.30,leather,0,1.31,-1.87);
 for(const x of [-.99,-.5,0,.5,.99])rounded(chair,.028,1.50,.018,.012,piping,x,1.30,-1.45);
 rounded(chair,1.20,.42,.23,.16,leather,0,2.45,-1.70);
 for(const side of [-1,1]){
  rounded(chair,.13,1.07,.20,.055,chrome,side*1.73,.78,.25);
  rounded(chair,.46,.22,.72,.1,leather,side*1.68,1.32,.22);
  const station=new T.Group();station.position.set(side*3.62,0,.6);station.rotation.y=-side*.12;room.add(station);
  rounded(station,1.65,1.35,.8,.09,cabinet,0,.68,0);
  rounded(station,1.84,.15,1.0,.06,stone,0,1.42,-.07);
  for(const y of [.47,.95]){rounded(station,1.45,.43,.05,.025,cabinet,0,y,.82);rounded(station,.56,.045,.045,.02,chrome,0,y+.06,.9);}
  if(side===-1){
   for(let i=0;i<2;i++){const bottle=new T.Mesh(new T.CylinderGeometry(.12,.14,.44,18),material(i?'#8b9a9a':'#c4cec9',.4));bottle.position.set(i*.33-.13,1.72,.3);station.add(bottle);rounded(station,.15,.08,.12,.02,chrome,i*.33-.13,1.99,.27);}
  }else{
   rounded(station,.8,.08,.46,.04,leather,0,1.57,.25);
   for(let i=0;i<9;i++)rounded(station,.025,.19,.025,.01,chrome,-.3+i*.065,1.71,.52);
   rounded(station,.62,.06,.035,.02,chrome,-.04,1.79,.52);
  }
 }
 return room;
}


function createTipJar(scene){
 const jar=new T.Group();jar.name='transparent-tip-jar';jar.visible=false;scene.add(jar);
 const glass=new T.MeshPhysicalMaterial({color:'#d3f1ed',roughness:.13,metalness:.05,transparent:true,opacity:.20,depthWrite:false,clearcoat:1,side:T.DoubleSide});
 const profile=[new T.Vector2(0,-1.2),new T.Vector2(.90,-1.2),new T.Vector2(1.02,-1.08),new T.Vector2(1.06,.74),new T.Vector2(.88,.94),new T.Vector2(.88,1.16)];
 const vessel=new T.Mesh(new T.LatheGeometry(profile,48),glass);jar.add(vessel);
 const rimMat=new T.MeshStandardMaterial({color:'#d4ece9',metalness:.48,roughness:.20,transparent:true,opacity:.70});
 for(const y of [1.10,1.19]){const rim=new T.Mesh(new T.TorusGeometry(.89,.045,10,48),rimMat);rim.rotation.x=Math.PI/2;rim.position.y=y;jar.add(rim);}
 const base=new T.Mesh(new T.CylinderGeometry(.98,.93,.08,40),rimMat);base.position.y=-1.16;jar.add(base);
 for(const side of [-1,1]){const glint=new T.Mesh(new T.CylinderGeometry(.024,.038,1.68,12),new T.MeshBasicMaterial({color:'#f3ffff',transparent:true,opacity:.7}));glint.position.set(side*.9,-.02,.42);glint.rotation.z=-side*.025;jar.add(glint);}
 const notes=[];
 for(let i=0;i<15;i++){
  const bill=createPayment();bill.setValue(10);const note=bill.group;note.visible=true;note.scale.setScalar(.76);note.position.set(Math.sin(i*2.4)*.36,-.93+i*.042,Math.cos(i*1.8)*.25);note.rotation.set(-.35+(i%3)*.18,Math.sin(i)*.3,Math.sin(i*3)*.32);note.userData.restY=note.position.y;note.userData.angle=note.rotation.z;jar.add(note);notes.push(note);
 }
 jar.userData.notes=notes;return jar;
}


function createRageEffect(portrait,kind){
 const group=new T.Group();group.name='exaggerated-negative-reaction';group.visible=false;portrait.add(group);
 const pieces=[];
 if(kind==='girl'){
  const water=new T.MeshPhysicalMaterial({color:'#68d8ff',roughness:.12,metalness:.1,clearcoat:1,transparent:true,opacity:.9});
  for(const side of [-1,1])for(let i=0;i<4;i++){
   const drop=ellipsoid(group,water,side*.58,.5,1.3,.095,.20,.055);pieces.push(drop);
  }
 }else{
  const profile=[new T.Vector2(0,0),new T.Vector2(.15,.10),new T.Vector2(.20,.26),new T.Vector2(.12,.48),new T.Vector2(.065,.66),new T.Vector2(0,.84)];
  const fireMat=new T.MeshBasicMaterial({color:'#ff641f'}),coreMat=new T.MeshBasicMaterial({color:'#ffe175'});
  for(let i=0;i<3;i++){
   const flame=new T.Group();flame.position.set((i-1)*.53,kind==='man'?2.23:3.18,.35);group.add(flame);
   const outer=new T.Mesh(new T.LatheGeometry(profile,16),fireMat);flame.add(outer);
   const core=new T.Mesh(new T.LatheGeometry(profile,16),coreMat);core.scale.set(.53,.62,.53);core.position.set(0,.035,.13);flame.add(core);pieces.push(flame);
  }
 }
 return {update(time,visible){group.visible=visible;if(!visible)return;pieces.forEach((p,i)=>{
  if(kind==='girl'){p.position.y=.54-((time*1.7+i*.25)%1)*1.12;p.position.x=(i<4?-1:1)*(.58+((time*1.7+i*.25)%1)*.09);p.scale.y=.14+.09*Math.abs(Math.sin(time*5+i));}
  else{p.scale.set(1+.10*Math.sin(time*9+i),.88+.24*Math.sin(time*11+i*2),1);p.rotation.z=Math.sin(time*7+i)*.13;}
 });}};
}
