export const CONFIG=Object.freeze({hairCount:15,whiteCount:3,minX:-1.55,maxX:1.55,hitRadius:.085,speed:1.65});
export function chooseTarget(x,points,radius=CONFIG.hitRadius){let target=null,distance=Infinity;for(const p of points){if(p.removed)continue;const d=Math.abs(x-p.x);if(d<=radius+1e-10&&(d<distance-1e-10||(Math.abs(d-distance)<1e-10&&p.id<(target?.id??Infinity)))){target=p;distance=d;}}return target;}
export function advanceScan(x,direction,dt,min=CONFIG.minX-.16,max=CONFIG.maxX+.16,speed=CONFIG.speed){let value=x+direction*speed*dt,dir=direction;while(value>max||value<min){if(value>max){value=2*max-value;dir=-1;}if(value<min){value=2*min-value;dir=1;}}return {x:value,direction:dir};}
export function chooseWhite(random=Math.random){return 1+Math.min(8,Math.floor(random()*9));}
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const lerp=(a,b,t)=>a+(b-a)*t;

export function chooseWhites(random=Math.random){
 const pool=Array.from({length:CONFIG.hairCount-2},(_,i)=>i+1),chosen=[];
 for(let i=0;i<CONFIG.whiteCount;i++){const index=Math.min(pool.length-1,Math.floor(random()*pool.length));chosen.push(pool.splice(index,1)[0]);}
 return chosen;
}
export function resolvePluck(hair,hairs){
 if(hair&&!hair.removed)hair.removed=true;
 const collected=hairs.filter(h=>h.white&&h.removed).length;
 return {collected,complete:collected===hairs.filter(h=>h.white).length};
}

export function clientOutcome(collected,wrong){return wrong>=3?'angry':collected>=CONFIG.whiteCount?'happy':null;}

// Tips are per client, awarded once at payment; three mistakes terminate service.
export function calculateTip(wrong=0){return [50,30,15,5][Math.min(3,Math.max(0,wrong))];}
export const FLOW=Object.freeze({walkStart:.18,walkEnd:1.42,seatEnd:2.18,readyDuration:1.35,payAt:1.02,walkOutAt:1.65,exitDuration:3.05});
export function nextClient(current){return current==='granny'?'girl':current==='girl'?'man':null;}
// Cut height is measured in the customer's local face coordinates.
export function evaluateCut(height){const error=Math.abs(height-1.14);return {height,error,good:error<=.17,tooShort:height>1.31};}

export const CLOSE=Object.freeze({scale:1.25,baseOffset:.76,girlScale:1.40,girlBaseOffset:1.04,manScale:1.30,manBaseOffset:1.02,tweezerLift:.65,scanMin:-3.12,scanMax:3.12,speed:2.2,lastHairSpeed:2.75,hitRadius:.145});
export const CUT=Object.freeze({holdMinimum:.20,tolerance:.14,matchTolerance:.11,min:.32,max:1.94});
// A visible intake-of-breath warning precedes every quick head dip.
export function girlFidget(time){const p=((time%5.6)+5.6)%5.6;const warning=p>=2.0&&p<2.65;const sneeze=p>=2.65&&p<3.30?Math.sin((p-2.65)/.65*Math.PI):0;return {warning,sneeze};}
export function judgeCut(y,previous=null,held=.3){const error=Math.abs(y-1.14),matchError=previous===null?0:Math.abs(y-previous);return {good:held>=CUT.holdMinimum&&error<=CUT.tolerance&&matchError<=CUT.matchTolerance,tooShort:y>1.14+CUT.tolerance,error,matchError,tooQuick:held<CUT.holdMinimum};}

export const SWIPE=Object.freeze({startX:2.92,endX:-3.10,toolScale:1.08,targetY:1.14,strands:18,maxY:1.92});
// Resolve every crossed strand, including a fast swipe delivered in one event.
export function sweepCrossings(a,b,strands,touched){
 if(b.x>=a.x)return [];
 return strands.filter(s=>!touched.has(s.i)&&s.x<=a.x&&s.x>=b.x).map(s=>({i:s.i,y:lerp(a.y,b.y,(a.x-s.x)/(a.x-b.x))}));
}
export function judgeSweep(lengths,cutCount){
 const errors=lengths.map(y=>Math.abs(y-SWIPE.targetY)),mean=errors.reduce((a,b)=>a+b,0)/lengths.length;
 const spread=Math.max(...lengths)-Math.min(...lengths),coverage=cutCount/lengths.length;
 const good=coverage===1&&mean<=.14&&spread<=.23;
 const quality=good?0:coverage>=.94&&mean<=.26&&spread<=.4?1:coverage>=.65&&mean<=.65?2:3;
 return {good,quality,coverage,mean,spread,label:good?'NAILED IT.':coverage<.94?'YOU MISSED A BIT…':Math.max(...lengths)>1.55?'MICRO BANGS?!':'THAT’S… A LOOK.'};
}

export const GRAFT=Object.freeze({count:4,flightTime:.14,hitRadius:.26,sourceX:2.95,sourceHeight:4.25});
export function graftChallenge(filled,attempt=0){
 const level=Math.min(3,Math.max(0,filled));
 const center=[.60,.69,.54,.72][level]+Math.sin(attempt*2.7)*.018;
 const half=[.15,.14,.125,.110][level];
 return {low:center-half,high:center+half,rate:[1.10,1.20,1.35,1.52][level]};
}
export function judgeGraft(power,challenge){return power<challenge.low?'shallow':power>challenge.high?'deep':'good';}

// A shift succeeds when every client leaves happy; tips only measure earnings.
export const shiftSucceeded=(results=[])=>results.length===3&&['granny','girl','man'].every(client=>results.find(result=>result.client===client)?.ending==='happy');
