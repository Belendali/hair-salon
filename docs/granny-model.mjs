import * as T from './vendor/three.module.js';
const clamp=(x)=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const sphere=new T.SphereGeometry(1,40,28);
const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function oval(parent,material,p,size){const m=new T.Mesh(sphere,material);m.position.set(...p);m.scale.set(...size);parent.add(m);return m;}
function tube(points,radius,material,parent,segments=24){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(c,segments,radius,6,false),material);parent?.add(m);return m;}
function mergeMeshes(meshes,parent,material){
 let count=0,indexCount=0;for(const m of meshes){count+=m.geometry.attributes.position.count;indexCount+=m.geometry.index.count;}
 const p=new Float32Array(count*3),n=new Float32Array(count*3),uv=new Float32Array(count*2),indices=new Uint32Array(indexCount);let off=0,io=0;
 for(const m of meshes){m.updateMatrix();const g=m.geometry.clone().applyMatrix4(m.matrix),v=g.attributes.position.count;p.set(g.attributes.position.array,off*3);n.set(g.attributes.normal.array,off*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,off*2);for(let j=0;j<g.index.count;j++)indices[io++]=g.index.array[j]+off;off+=v;g.dispose();m.geometry.dispose();}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('normal',new T.BufferAttribute(n,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(new T.BufferAttribute(indices,1));const m=new T.Mesh(g,material);parent.add(m);return m;
}
function textile(kind){
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const v=(y%32)/32,u=(x%16)/16;
  const stitch=Math.exp(-Math.pow((u-.5-(v<.5?v:.99-v)*.50)/.10,2));
  const grain=Math.sin(x*37.33+y*78.21)*Math.sin(x*1.7-y*2.8);
  let c=kind==='knit'?[190,108,101]:[139,72,81];
  let mult=.89+stitch*.18+grain*.035;
  if(kind==='floral'){
   const px=(x%64-32)/24,py=(y%64-32)/24,r=Math.hypot(px,py),a=Math.atan2(py,px);
   const petal=.53+.17*Math.cos(a*5);
   const flower=r<petal&&r>.10;
   const stem=Math.abs(px-.20*Math.sin(py*3))<.038&&Math.abs(py)>.5;
   if(flower||stem)mult*=.57;
  }
  const i=(y*size+x)*4;data[i]=c[0]*mult;data[i+1]=c[1]*mult;data[i+2]=c[2]*mult;data[i+3]=255;
 }
 const t=new T.DataTexture(data,size,size);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
const PROFILE=[[-2.18,.06,.10],[-2.04,.70,.66],[-1.82,1.08,.92],[-1.25,1.24,1.02],[-.45,1.28,1.02],[.55,1.29,1.04],[1.35,1.34,1.02],[1.98,1.19,.89],[2.23,.65,.48],[2.32,.02,.02]];
function profile(y){
 let i=0;while(i<PROFILE.length-2&&y>PROFILE[i+1][0])i++;
 const a=PROFILE[i],b=PROFILE[i+1],before=PROFILE[Math.max(0,i-1)],after=PROFILE[Math.min(PROFILE.length-1,i+2)],dy=b[0]-a[0],t=clamp((y-a[0])/dy);
 return [1,2].map(k=>{const m0=(b[k]-before[k])/(b[0]-before[0])*dy,m1=(after[k]-a[k])/(after[0]-a[0])*dy;return Math.max(.02,(2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*m1);});
}
// Continuous sculpted head surface: shaped jaw, cheek pads, temples and forehead.
function sculptHead(material){
 const rows=74,cols=96,positions=[],uv=[],colors=[],index=[];
 for(let r=0;r<=rows;r++){
  const y=T.MathUtils.lerp(-2.18,2.32,r/rows),[w,d]=profile(y);
  for(let c=0;c<=cols;c++){
   const a=c/cols*Math.PI*2,si=Math.sin(a),co=Math.cos(a),x=Math.sign(si)*Math.pow(Math.abs(si),.76)*w;
   let z=Math.sign(co)*Math.pow(Math.abs(co),.68)*d;
   const front=Math.pow(Math.max(0,co),6),cheek=Math.exp(-(((Math.abs(x)-.85)/.34)**2)-((y+.64)/.67)**2);
   z+=front*(cheek*.15+Math.exp(-((x/.55)**2)-((y+1.69)/.32)**2)*.10);
   positions.push(x,y,z);uv.push(c/cols,r/rows);
   const flush=cheek*front*.12,freckle=Math.max(0,Math.sin(c*74+r*139)*Math.sin(c*17-r*31)-.74)*.15*cheek;
   colors.push(1-freckle,.96-flush-freckle,.90-flush-freckle);
   if(r<rows&&c<cols){const k=r*(cols+1)+c;index.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeVertexNormals();return new T.Mesh(g,material);
}
function limbSegment(mesh,a,b,width){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(width,a.distanceTo(b)*.5+width*.35,width);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());}
export function createGranny(root){
 const skin=mat('#efba9d',.69),sculptMat=skin.clone();sculptMat.vertexColors=true;
 const noseMat=mat('#ecaa91',.6),earMat=mat('#cf927f',.8),dark=mat('#32242a',.72),cream=mat('#fff5df',.45);
 const hairMat=mat('#9d2d28',.34),hairLight=mat('#b64334',.43),hairShade=mat('#7a2422',.5),whiteMat=mat('#fff8dc',.35);whiteMat.emissive.set('#8a7954');whiteMat.emissiveIntensity=.10;
 const portrait=new T.Group();root.add(portrait);portrait.name='granny-portrait';
 const face=sculptHead(sculptMat);face.name='sculpted-head';portrait.add(face);
 for(const side of [-1,1]){
  oval(portrait,skin,[side*1.37,-.53,.02],[.37,.47,.28]);
  oval(portrait,earMat,[side*1.47,-.50,.24],[.17,.28,.056]);
  oval(portrait,skin,[side*1.43,-.65,.28],[.11,.17,.08]);
 }
 const nose=oval(portrait,noseMat,[0,-.10,1.20],[.37,.62,.54]);
 oval(portrait,skin,[0,.38,1.06],[.19,.49,.20]);
 const eyes=[];const irisMat=mat('#66716a',.4);
 for(const side of [-1,1]){
  const eye=new T.Group();eye.position.set(side*.56,.94,1.03);portrait.add(eye);
  oval(eye,cream,[0,0,0],[.39,.32,.14]);
  const pupil=new T.Group();eye.add(pupil);
  oval(pupil,irisMat,[side*.035,-.015,.132],[.112,.13,.036]);
  oval(pupil,dark,[side*.035,-.015,.159],[.069,.083,.020]);
  oval(pupil,new T.MeshBasicMaterial({color:'#ffffff'}),[side*.035-.025,.026,.18],[.026,.030,.009]);
  eyes.push({eye,pupil});
 }
 const brows=[];
 for(const side of [-1,1])brows.push(tube([[side*.19,1.37,1.12],[side*.52,1.48,1.16],[side*.96,1.39,1.06]],.042,hairShade,portrait));
 const glasses=new T.Group();portrait.add(glasses);glasses.position.z=.08;
 const gold=new T.MeshStandardMaterial({color:'#c8a75b',metalness:.72,roughness:.25});
 const lensMat=new T.MeshPhysicalMaterial({color:'#e8e3c6',roughness:.09,metalness:0,transparent:true,opacity:.065,depthWrite:false,side:T.DoubleSide});
 for(const side of [-1,1]){
  const cx=side*.59,sh=new T.Shape();sh.moveTo(-.52,.41);sh.lineTo(.52,.41);sh.quadraticCurveTo(.52,-.47,.05,-.48);sh.quadraticCurveTo(-.52,-.47,-.52,.41);
  const lens=new T.Mesh(new T.ShapeGeometry(sh,28),lensMat);lens.position.set(cx,.82,1.26);glasses.add(lens);
  tube(sh.getPoints(24).map(p=>[cx+p.x,.82+p.y,1.28]),.025,gold,glasses,72);
  tube([[side*1.10,1.20,1.27],[side*1.33,1.17,.35],[side*1.42,.36,-.10]],.022,gold,glasses);
  oval(glasses,gold,[side*1.1,1.2,1.28],[.049,.038,.037]);
  oval(portrait,new T.MeshPhysicalMaterial({color:'#5fa3c6',metalness:.25,roughness:.22,clearcoat:.6}),[side*1.48,-.86,.22],[.13,.145,.13]);
 }
 tube([[-.08,1.17,1.34],[0,1.2,1.38],[.08,1.17,1.34]],.025,gold,glasses);
 const mouthMat=mat('#8c3e3c',.65),lipMat=mat('#c57b6d',.64);
 const mouthLine=tube([[-.29,-1.31,1.01],[0,-1.21,1.13],[.29,-1.31,1.01]],.033,mouthMat,portrait);
 const lowerLip=oval(portrait,lipMat,[0,-1.36,1.075],[.22,.035,.035]);
 const openMouth=oval(portrait,mat('#4b262d',.9),[0,-1.31,1.11],[.30,.20,.043]);
 const tooth=oval(portrait,cream,[0,-1.22,1.155],[.22,.040,.014]);
 openMouth.visible=tooth.visible=false;
 // One continuous bob surface, with merged curved strand geometry.
 const hpos=[],huv=[],hind=[],hr=28,hc=80;
 for(let r=0;r<=hr;r++)for(let c=0;c<=hc;c++){
  const v=r/hr,a=-2.20+c/hc*4.40,top=2.36,fall=v,rad=Math.sqrt(1-(1-Math.min(1,fall/.20))**2);
  const width=(1.48+.04*Math.sin(v*5))*rad,zDepth=(1.20+.10*Math.sin(v*3))*rad;
  hpos.push(Math.sin(a)*width,top-3.91*v+.08*Math.cos(a*3)*v*v,-Math.cos(a)*zDepth-.04);huv.push(c/hc,v);
  if(r<hr&&c<hc){const k=r*(hc+1)+c;hind.push(k,k+1,k+hc+1,k+1,k+hc+2,k+hc+1);}
 }
 const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hpos,3));hg.setAttribute('uv',new T.Float32BufferAttribute(huv,2));hg.setIndex(hind);hg.computeVertexNormals();hairMat.side=T.DoubleSide;const bob=new T.Mesh(hg,hairMat);portrait.add(bob);
 const cap=sculptHead(hairMat),capIndex=cap.geometry.index.array,capY=cap.geometry.attributes.position;
 const kept=[];for(let i=0;i<capIndex.length;i+=3){if([capIndex[i],capIndex[i+1],capIndex[i+2]].every(j=>capY.getY(j)>1.56+.30*Math.exp(-((capY.getX(j)/.38)**2))))kept.push(capIndex[i],capIndex[i+1],capIndex[i+2]);}
 cap.geometry.setIndex(kept);cap.scale.set(1.045,1.025,1.06);portrait.add(cap);
 const locks=[[],[]];
 for(let i=0;i<170;i++){
  const a=-2.20+i/169*4.40,points=[];
  for(let k=0;k<10;k++){const v=.10+k/9*.88,rad=Math.sqrt(1-(1-Math.min(1,v/.20))**2),sway=Math.sin(v*7+i*.7)*.011;points.push([Math.sin(a+sway)*(1.49+.04*Math.sin(v*5))*rad,2.37-3.91*v+.08*Math.cos(a*3)*v*v,-Math.cos(a+sway)*(1.213+.10*Math.sin(v*3))*rad-.04]);}
  locks[i%2].push(tube(points,.006+i%3*.002,i%2?hairLight:hairShade,null,24));
 }
 // Swept fringe: unequal part, softly tapered locks instead of round tubes.
 for(const side of [-1,1])for(let i=0;i<13;i++){
  const x=side*(.12+i*.098),points=[[side*.05,2.37,.06],[x*.45,2.22,0],[x*.83,1.99,0],[x,1.63+.30*Math.exp(-Math.abs(x)/.3),0]];
  for(let j=1;j<points.length;j++){
    const p=points[j],y=p[1]/1.025;
    const [baseW,baseD]=profile(y),w=baseW*1.045,d=baseD*1.06;
    p[0]=Math.sign(p[0])*Math.min(Math.abs(p[0]),w*.95);const si=Math.pow(Math.abs(p[0])/w,1/.76);p[2]=Math.pow(Math.sqrt(1-si*si),.68)*d+.018;
  }
  const m=tube(points,.075,hairMat,null);const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),p=m.geometry.attributes.position;
  for(let r=0;r<=24;r++){const t=r/24,c=curve.getPointAt(t),f=(.5+Math.sin(t*Math.PI)*.6)*(1-.84*ease((t-.65)/.35));for(let j=0;j<=6;j++){const i=r*7+j;p.setXYZ(i,c.x+(p.getX(i)-c.x)*f,c.y+(p.getY(i)-c.y)*f,c.z+(p.getZ(i)-c.z)*f);}}
  m.geometry.computeVertexNormals();locks[0].push(m);
  locks[1].push(tube(points.map(p=>[p[0]-.017,p[1]+.033,p[2]+.055]),.007,hairLight,null));
 }
 mergeMeshes(locks[0],portrait,hairShade);mergeMeshes(locks[1],portrait,hairLight);
 const sweater=mat('#ffffff',.92);sweater.map=textile('knit');sweater.map.repeat.set(5,7);sweater.bumpMap=sweater.map;sweater.bumpScale=.035;
 const skirtMat=mat('#ffffff',.92);skirtMat.map=textile('floral');skirtMat.map.repeat.set(2,2);skirtMat.bumpMap=skirtMat.map;skirtMat.bumpScale=.008;
 const body=new T.Group();root.add(body);body.name='customer-body';body.position.y=.763;body.scale.y=1.35;
 oval(body,skin,[0,-2.31,0],[.29,.60,.29]);
 oval(body,sweater,[0,-4.14,-.06],[.86,1.63,.49]);
 oval(body,sweater,[0,-2.78,0],[.40,.38,.34]);
 oval(body,sweater,[0,-5.46,-.02],[.83,.18,.48]);
 const sk=new T.Mesh(new T.LatheGeometry([new T.Vector2(.79,-5.39),new T.Vector2(.86,-5.8),new T.Vector2(.88,-7.8),new T.Vector2(.93,-9.35)].reverse(),64),skirtMat);body.add(sk);
 const limbs=[];
 for(const side of [-1,1]){
  const arm=new T.Group();body.add(arm);const upper=oval(arm,sweater,[0,0,0],[.23,1,.23]),forearm=oval(arm,sweater,[0,0,0],[.20,1,.20]);
  const hand=new T.Group();arm.add(hand);oval(hand,skin,[0,0,0],[.20,.28,.135]);
  for(let j=0;j<4;j++)oval(hand,skin,[(j-1.5)*.085,-.22,0],[.047,.19-(j%3)*.013,.06]);
  const thumb=oval(hand,skin,[side*.20,-.015,.04],[.075,.17,.07]);thumb.rotation.z=side*-.48;
  const leg=new T.Group();leg.position.set(side*.39,-8.80,0);body.add(leg);
  oval(leg,skin,[0,-.65,0],[.17,.72,.18]);
  oval(leg,mat('#30302d',.36),[0,-1.54,.15],[.28,.18,.47]);
  oval(leg,mat('#1e2020',.65),[0,-1.67,.15],[.29,.055,.48]);
  limbs.push({arm,upper,forearm,hand,leg,side});
 }
 function pose({motionTime=0,entering=false,departing=false,entranceTime=0,exitTime=0,angry=false}){
  const seated=!entering&&!departing,phase=motionTime%20;
  const pulse=(a,b)=>phase>a&&phase<b?Math.sin((phase-a)/(b-a)*Math.PI)**2:0;
  const scratch=pulse(6,9),adjust=pulse(2,4),cheek=pulse(10,12.4),ear=pulse(13,15.4),shake=pulse(16.3,18.1);
  const yaw=seated?Math.sin(motionTime*.77)*.18+Math.sin(motionTime*8)*shake*.15:0;
  portrait.rotation.y=yaw;portrait.rotation.z=seated?scratch*.055+ear*.09+Math.sin(motionTime*9)*shake*.035:0;
  portrait.rotation.x=seated?cheek*.065+Math.sin(motionTime*6)*shake*.025:0;
  glasses.position.y=adjust*.07;glasses.rotation.z=Math.sin(motionTime*2)*adjust*.012;
  for(const l of limbs){
   const side=l.side,shoulder=new T.Vector3(side*.68,-3.02,-.02),elbow=new T.Vector3(side*.98,-4.45,.03),endpoint=new T.Vector3(side*.97,-6.07,.1);
   const walk=entering&&entranceTime<1.42?Math.sin(entranceTime*Math.PI/.30):departing&&exitTime>1.65?Math.sin((exitTime-1.65)*Math.PI/.25):0;
   elbow.z+=walk*side*.15;endpoint.z+=walk*side*.40;endpoint.y+=Math.abs(walk)*.07;
   l.leg.rotation.x=walk*side*.14;
   if(seated&&side===-1){
    const w=Math.max(scratch,adjust,cheek,ear),isScratch=scratch===w;
    const goal=ear===w?new T.Vector3(-1.49,-.45,.30):cheek===w?new T.Vector3(-.92,-.70,1.14):new T.Vector3(isScratch?-1.38:-1.09,isScratch?1.6:.82,isScratch?.42:1.43);
    goal.applyEuler(portrait.rotation);goal.y=(goal.y-body.position.y)/body.scale.y;
    elbow.lerp(new T.Vector3(-2.14,-1.43,.34),ease(w));endpoint.lerp(goal,ease(w));
    if(isScratch||ear===w||cheek===w)endpoint.y+=Math.sin(motionTime*19)*w*.05;
    l.hand.rotation.z=-w*.3;
   }else if(departing&&angry&&exitTime<.52){
    endpoint.set(side*(1.30+.22*Math.sin(exitTime*16)),.1+.28*Math.sin(exitTime*13),.55);elbow.set(side*1.70,-1.70,.1);l.hand.rotation.z=side*.9;
   }else if(departing&&side===1&&exitTime>.48&&exitTime<1.65){
    const reach=Math.sin((exitTime-.48)/1.17*Math.PI);endpoint.lerp(new T.Vector3(1.5,-1.1,1.6),reach);elbow.lerp(new T.Vector3(1.7,-2.7,.5),reach);l.hand.rotation.z=-reach*.4;
   }else l.hand.rotation.z=0;
   limbSegment(l.upper,shoulder,elbow,.22);limbSegment(l.forearm,elbow,endpoint,.19);l.hand.position.copy(endpoint);
  }
  return {scratch,adjust,cheek,ear,shake,yaw};
 }
 function expression({time=0,win=false,lose=false,react=0,exitTime=0,departing=false,motionTime=0,talking=false}){
  const phase=time%4.8,blink=phase<.18?Math.max(.06,Math.abs(phase-.09)/.09):1;
  eyes.forEach(({eye,pupil},i)=>{eye.scale.y=blink*(win?1-.28*react:lose?1-.17*react:1);pupil.position.x=lose?.045:Math.sin(motionTime*.77)*.035;pupil.position.y=win?.04:0;});
  brows.forEach((b,i)=>{b.rotation.z=lose?(i===0?-.13:.13)*react:win?(i===0?-.07:.07)*react:0;b.position.y=win?.10*react:0;});
  nose.rotation.z=lose?Math.sin(time*7)*.018*react:0;
  mouthLine.visible=(!win||react<.15)&&!(departing&&lose);lowerLip.visible=mouthLine.visible;
  openMouth.visible=tooth.visible=talking||(win&&react>=.15)||(departing&&lose)||(lose&&react>.3);
  if(talking){mouthLine.visible=lowerLip.visible=false;}
  openMouth.scale.y=talking?.10+Math.abs(Math.sin(time*23))*.13:departing&&lose?.13+Math.abs(Math.sin(exitTime*19))*.11:Math.max(.04,.22*react);
  if(openMouth.visible)mouthLine.visible=lowerLip.visible=false;
  mouthLine.rotation.z=lose?-.13*react:0;
 }
 pose({});return {portrait,face,body,limbs,glasses,hairMat,whiteMat,skin,dark,cream,pose,expression};
}

export {mat,oval,tube,mergeMeshes,textile,sculptHead,limbSegment};
