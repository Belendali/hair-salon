import * as T from './vendor/three.module.js';
import {mat,oval,tube,mergeMeshes,sculptHead,limbSegment} from './granny-model.mjs?v=35';
import {clamp,smooth} from './rules.mjs?v=35';

export function createGraftTuft(hairMat=mat('#302a2b',.5)){
 const group=new T.Group(),locks=[];
 for(let i=0;i<9;i++){
  const x=(i-4)*.049,z=Math.sin(i*2)*.065;
  locks.push(tube([[x*.25,0,z*.2],[x,.24,z],[x+.10,.53+Math.sin(i*1.1)*.08,z+.02],[x+.19,.63+Math.sin(i*1.1)*.08,z+.10]],.031,hairMat,null,18));
 }
 mergeMeshes(locks,group,hairMat);return group;
}
function cloth(plaid=false){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const grain=Math.sin(x*9+y*17)*.035+Math.sin(x*31-y*13)*.02;
  const line=plaid&&(x%32<2||y%32<2),stripe=plaid&&(x%32<6||y%32<6);
  const c=plaid?[203,139,160]:[97,119,134],v=(line?.52:stripe?.90:1)+grain;
  const k=(y*size+x)*4;for(let i=0;i<3;i++)data[k+i]=c[i]*v;data[k+3]=255;
 }
 const tex=new T.DataTexture(data,size,size);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,5);tex.needsUpdate=true;return tex;
}

export function createMan(root){
 const portrait=new T.Group();portrait.name='transplant-client';root.add(portrait);
 const skin=mat('#f1bfa5',.67),sculptMat=skin.clone();sculptMat.vertexColors=true;
 const pink=mat('#e79790',.61),hairMat=mat('#191817',.68),dark=mat('#262127',.7),cream=mat('#fff8ed',.43);
 const beardMat=mat('#292725',.88),moustacheMat=mat('#131211',.74);
 const face=sculptHead(sculptMat);face.scale.set(.94,.9,1);portrait.add(face);
 const colors=face.geometry.attributes.color,positions=face.geometry.attributes.position;
 const beardShade=new T.Color('#534d47');
 const beardMask=(x,y,z)=>smooth((-.72+.21*Math.min(1,Math.abs(x)/1.1)-y)/.30)*smooth((z+.20)/.35);
 for(let i=0;i<colors.count;i++){
  const y=positions.getY(i),z=positions.getZ(i),x=positions.getX(i);
  const beard=beardMask(x,y,z),grain=.92+.08*Math.sin(i*13.7);
  colors.setXYZ(i,(1-beard)+beard*beardShade.r/skin.color.r*grain,.95*(1-beard)+beard*beardShade.g/skin.color.g*grain,.9*(1-beard)+beard*beardShade.b/skin.color.b*grain);
 }colors.needsUpdate=true;
 // Short, matte strands follow the real cheek and jaw surface instead of
 // tinting the skin purple. One merged mesh keeps the extra detail inexpensive.
 const stubble=[],idx=face.geometry.index,normals=face.geometry.attributes.normal;
 const random=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
 for(let k=0;k<idx.count;k+=6){
  const ids=[idx.getX(k),idx.getX(k+1),idx.getX(k+2)],a=Math.sqrt(random(k+1)),b=random(k+2),weights=[1-a,a*(1-b),a*b];
  const p=new T.Vector3(),n=new T.Vector3();for(let j=0;j<3;j++){p.addScaledVector(new T.Vector3().fromBufferAttribute(positions,ids[j]),weights[j]);n.addScaledVector(new T.Vector3().fromBufferAttribute(normals,ids[j]),weights[j]);}
  if(p.y<-2.08||beardMask(p.x,p.y,p.z)<.30+random(k+3)*.65)continue;
  p.x*=.94;p.y*=.9;n.set(n.x/.94,n.y/.9,n.z).normalize();p.addScaledVector(n,.010);
  const len=.025+random(k+4)*.055,tip=p.clone().addScaledVector(n,len*.6);tip.y-=len*.65;tip.x+=Math.sin(k)*len*.22;
  const mid=p.clone().lerp(tip,.5).addScaledVector(n,.009);
  stubble.push(tube([p.toArray(),mid.toArray(),tip.toArray()],.007+random(k+5)*.004,beardMat,null,3));
 }
 const beard=mergeMeshes(stubble,portrait,beardMat);beard.name='charcoal-cheek-and-jaw-stubble';
 for(const side of [-1,1]){
  oval(portrait,pink,[side*1.29,-.52,.05],[.37,.46,.28]);oval(portrait,skin,[side*1.35,-.51,.26],[.16,.28,.09]);
  oval(portrait,pink,[side*.79,-.31,1.0],[.27,.23,.035]);
 }
 const nose=oval(portrait,pink,[0,.03,1.17],[.30,.40,.43]);
 const eyes=[],brows=[];
 for(const side of [-1,1]){
  const eye=new T.Group();eye.position.set(side*.40,.72,1.03);portrait.add(eye);oval(eye,cream,[0,0,0],[.34,.38,.17]);
  const pupil=oval(eye,dark,[side*-.015,0,.155],[.115,.13,.045]);oval(pupil,cream,[-.20,.28,.87],[.20,.20,.12]);eyes.push({eye,pupil});
  brows.push(tube([[side*.16,1.16,1.10],[side*.40,1.24,1.12],[side*.69,1.19,1.06]],.033,hairMat,portrait));
 }
 const moustache=new T.Group();moustache.name='black-parted-moustache';portrait.add(moustache);
 for(const side of [-1,1]){
  const lobe=oval(moustache,moustacheMat,[side*.22,-.49,1.36],[.25,.115,.10]);lobe.rotation.z=-side*.64;
  for(let i=0;i<11;i++)tube([[side*.035,-.30-i*.006,1.42],[side*.20,-.38-i*.012,1.47],[side*(.35+i*.01),-.60-i*.009,1.31]],.019,moustacheMat,moustache,18);
 }
 const mouth=new T.Group(); // Mouth concealed by the dark beard.
 const open=new T.Group();open.visible=false;
 const locks=[];
 for(let i=0;i<84;i++){
  const a=-2.13+i/83*4.26,points=[];
  for(let j=0;j<9;j++){const v=j/8;points.push([Math.sin(a)*(1.23+.08*Math.sin(v*3)),1.78-2.67*v-.20*Math.abs(Math.sin(a)),-Math.cos(a)*(1.04+.05*Math.sin(v*4))]);}
  locks.push(tube(points,.044+(i%3)*.005,hairMat,null,22));
 }mergeMeshes(locks,portrait,hairMat);

 // Locate each planting spot on the actual front surface of the sculpted head.
 const tuftTemplate=createGraftTuft(hairMat),sites=[];
 for(const [i,[x,z]] of [[-.62,.63],[.52,.55],[-.35,-.30],[.40,-.40]].entries()){
  // Sample the upper scalp in X/Z: four crown areas, not a frontal hairline.
  let best=Infinity,y=2;
  for(let k=0;k<positions.count;k++){const px=positions.getX(k)*.94,py=positions.getY(k)*.9,pz=positions.getZ(k);if(py<1.30)continue;const d=(px-x)**2+(pz-z)**2;if(d<best){best=d;y=py;}}
  const position=new T.Vector3(x,y+.055,z),ringMat=new T.MeshBasicMaterial({color:'#a3ad7a',transparent:true,opacity:.85,depthTest:false,depthWrite:false});
  const ring=new T.Mesh(new T.RingGeometry(.115,.145,32),ringMat);ring.position.copy(position);ring.rotation.x=-.85;ring.renderOrder=7;portrait.add(ring);
  const tuft=tuftTemplate.clone();tuft.position.copy(position);tuft.visible=false;tuft.rotation.z=-x*.16;portrait.add(tuft);
  sites.push({i,position,ring,tuft,filled:false,born:0});
 }
 function plant(i,time){const site=sites[i];if(!site||site.filled)return false;site.filled=true;site.born=time;site.tuft.visible=true;site.ring.visible=false;return true;}
 function reset(){for(const s of sites){s.filled=false;s.born=0;s.tuft.visible=false;s.ring.visible=false;}}
 function updateSites(time,show,hover=-1){for(const s of sites){s.ring.visible=show&&!s.filled;s.ring.material.color.set(s.i===hover?'#e5ff9b':'#a3ad7a');s.ring.scale.setScalar(s.i===hover?1.14:1);if(s.filled){const age=Math.max(0,time-s.born),bounce=age<.8?Math.sin(age*17)*Math.exp(-age*5)*.16:0;s.tuft.scale.setScalar(Math.max(.01,smooth(age/.24)+bounce));s.tuft.rotation.z=-s.position.x*.16+Math.sin(time*3+s.i)*.025;}}}

 const body=new T.Group();root.add(body);body.position.y=.5;
 const shirt=mat('#ffffff',.88);shirt.map=cloth(true);shirt.bumpMap=shirt.map;shirt.bumpScale=.017;
 const denim=mat('#ffffff',.91);denim.map=cloth();denim.bumpMap=denim.map;denim.bumpScale=.017;
 const steel=mat('#bbc0b7',.30,.65),shoe=mat('#57413d',.5);
 oval(body,skin,[0,-1.9,0],[.24,.48,.24]);oval(body,shirt,[0,-3.41,-.06],[.70,1.38,.43]);
 for(const side of [-1,1]){const collar=new T.Mesh(new T.BoxGeometry(.26,.31,.055),shirt);collar.position.set(side*.14,-2.09,.34);collar.rotation.z=side*.30;body.add(collar);}
 for(let i=0;i<5;i++)oval(body,steel,[0,-2.30-i*.35,.397],[.041,.044,.018]);
 oval(body,denim,[0,-4.63,0],[.72,.54,.44]);
 const bib=new T.Mesh(new T.BoxGeometry(.95,1.06,.095,1,4,1),denim);bib.position.set(0,-3.96,.405);body.add(bib);
 const pocket=new T.Mesh(new T.BoxGeometry(.47,.39,.04),denim);pocket.position.set(0,-3.98,.47);body.add(pocket);
 const stitch=mat('#bec5b3',.9);tube([[-.23,-3.78,.50],[-.23,-4.13,.50],[0,-4.18,.50],[.23,-4.13,.50],[.23,-3.78,.50]],.009,stitch,body);
 for(const side of [-1,1]){tube([[side*.58,-2.21,.08],[side*.49,-2.79,.41],[side*.39,-3.45,.46]],.077,denim,body);oval(body,steel,[side*.39,-3.46,.515],[.067,.067,.018]);}
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new T.Group();body.add(arm);const upper=oval(arm,shirt,[0,0,0],[.18,1,.18]),forearm=oval(arm,shirt,[0,0,0],[.16,1,.16]);
  const hand=new T.Group();arm.add(hand);oval(hand,skin,[0,0,0],[.18,.26,.14]);for(let j=0;j<4;j++)oval(hand,skin,[(j-1.5)*.075,-.20,.02],[.042,.17,.053]);
  const leg=new T.Group();leg.position.set(side*.35,-4.85,0);body.add(leg);oval(leg,denim,[0,-1.55,0],[.31,1.72,.31]);oval(leg,denim,[0,-3.12,.015],[.35,.23,.34]);oval(leg,shoe,[0,-3.43,.17],[.33,.24,.51]);limbs.push({side,arm,upper,forearm,hand,leg});
 }
 const glasses=new T.Group();
 function pose({motionTime=0,entering=false,departing=false,entranceTime=0,exitTime=0,angry=false,poseStrength=1}){
  const seated=!entering&&!departing,p=motionTime%8,scratch=p>3&&p<4.9?Math.sin((p-3)/1.9*Math.PI)**2:0;
  portrait.position.y=seated?Math.sin(motionTime*1.8)*.08*poseStrength:0;
  portrait.rotation.set(seated?(Math.sin(motionTime*.8)*.04+scratch*.07)*poseStrength:0,seated?Math.sin(motionTime*1.15)*.23*poseStrength:0,seated?Math.sin(motionTime*1.55)*.055*poseStrength:0);
  for(const l of limbs){const side=l.side,walk=entering&&entranceTime<1.42?Math.sin(entranceTime*Math.PI/.30):departing&&exitTime>1.65?Math.sin((exitTime-1.65)*Math.PI/.25):0;
   const shoulder=new T.Vector3(side*.56,-2.50,0),elbow=new T.Vector3(side*.85,-3.70,.02),end=new T.Vector3(side*.86,-5.12,.12+walk*side*.35);
   if(seated&&side===-1){const goal=new T.Vector3(-1.23,1.22,.62).applyEuler(portrait.rotation);goal.y-=body.position.y;end.lerp(goal,scratch);elbow.lerp(new T.Vector3(-1.8,-1.8,.35),scratch);end.y+=Math.sin(motionTime*21)*scratch*.04;}
   if(departing&&side===1&&exitTime>.48&&exitTime<1.65){const reach=Math.sin((exitTime-.48)/1.17*Math.PI);end.lerp(new T.Vector3(1.4,-1.1,1.6),reach);elbow.lerp(new T.Vector3(1.6,-2.5,.5),reach);}
   if(departing&&angry&&exitTime<.48){end.y+=2.2;end.x+=side*.2*Math.sin(exitTime*20);}
   l.leg.rotation.x=walk*side*.13;limbSegment(l.upper,shoulder,elbow,.18);limbSegment(l.forearm,elbow,end,.16);l.hand.position.copy(end);
  }
 }
 function expression({time=0,win=false,lose=false,react=0,motionTime=0,talking=false}){
  const phase=time%4.1,blink=phase<.16?Math.max(.06,Math.abs(phase-.08)/.08):1;
  eyes.forEach(({eye,pupil})=>{eye.scale.y=blink*(lose?.77:win?.86:1);pupil.position.x=Math.sin(motionTime*1.15)*.026;});
  brows.forEach((b,i)=>{b.rotation.z=lose?(i===0?-.16:.16)*react:0;b.position.y=win?.08*react:0;});
  nose.rotation.z=lose?Math.sin(time*9)*.022*react:0;moustache.rotation.z=lose?Math.sin(time*13)*.027*react:0;
  mouth.scale.y=win?2:lose?-1:1;mouth.visible=!talking;open.visible=talking;open.scale.y=talking?.08+Math.abs(Math.sin(time*22))*.11:.12;
 }
 pose({});reset();return {portrait,face,body,limbs,glasses,hairMat,whiteMat:cream,skin,dark,cream,pose,expression,reset,sites,plant,updateSites};
}
