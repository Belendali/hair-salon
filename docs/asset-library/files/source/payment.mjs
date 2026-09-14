import * as T from './vendor/three.module.js';
// Dynamic in-game banknote. Denomination is updated for each client's tip.
export function createPayment(){
 const group=new T.Group();group.visible=false;let canvas=null,context=null,texture=null;
 if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=768;canvas.height=336;context=canvas.getContext('2d');if(context){texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;}}
 const face=new T.MeshStandardMaterial({color:texture?'#ffffff':'#ced0aa',map:texture,roughness:.82,side:T.DoubleSide});
 const g=new T.PlaneGeometry(1.18,.51,32,4);const p=g.attributes.position;
 for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*4)*.035);g.computeVertexNormals();
 for(let i=0;i<3;i++){const m=new T.Mesh(g,face);m.position.set(i*.018,i*.012,-i*.008);m.rotation.z=i*.018;group.add(m);}
 function setValue(value){group.userData.value=value;if(!context)return;const c=context,w=768,h=336;c.fillStyle='#e5e4c8';c.fillRect(0,0,w,h);c.strokeStyle='#495c46';c.lineWidth=3;c.strokeRect(14,14,w-28,h-28);c.lineWidth=1;c.strokeRect(22,22,w-44,h-44);
  c.globalAlpha=.27;c.lineWidth=.7;for(let k=0;k<45;k++){c.beginPath();for(let x=28;x<w-28;x+=2){const y=38+k*5.8+Math.sin(x*.055+k*.55)*6;c.lineTo(x,y);}c.stroke();}c.globalAlpha=1;
  for(const x of [86,682]){for(let k=0;k<7;k++){c.beginPath();c.ellipse(x,168,53-k*2,83-k*3,0,0,Math.PI*2);c.stroke();}}
  c.fillStyle='#e5e4c8';c.beginPath();c.ellipse(384,174,88,109,0,0,Math.PI*2);c.fill();c.lineWidth=2;c.stroke();
  // Engraved ornamental medallion, deliberately a game currency.
  c.save();c.translate(384,170);c.strokeStyle='#647255';c.lineWidth=.8;for(let k=0;k<65;k++){c.rotate(Math.PI*2/65);c.beginPath();c.ellipse(0,0,64,91,Math.PI/6,0,Math.PI*2);c.stroke();}c.restore();
  c.fillStyle='#e3e2c8';c.beginPath();c.ellipse(384,171,41,52,0,0,Math.PI*2);c.fill();c.fillStyle='#344a38';c.textAlign='center';c.font='bold 67px Georgia';c.fillText('$',384,193);
  c.font='bold 17px Georgia';c.fillText('THE SALON RESERVE',384,47);c.font='12px Georgia';c.fillText('THANK YOU FOR YOUR SERVICE',384,295);
  c.font='bold 43px Georgia';c.fillText(String(value),86,183);c.fillText(String(value),682,183);c.font='bold 24px Georgia';c.textAlign='left';c.fillText(String(value),36,53);c.textAlign='right';c.fillText(String(value),730,304);
  c.font='13px monospace';c.textAlign='left';c.fillText('PS 001026 A',153,237);c.fillText('PANIC SALON',525,102);texture.needsUpdate=true;
 }
 setValue(50);return {group,setValue};
}
