// Bella audio selection: original-speed user clips and independent actor cues.
import {VOICE_FILES,SFX_FILES,MUSIC_FILE} from './audio-cues.mjs?v=35';
export class Soundtrack{
 constructor(audio){this.audio=audio;this.music=audio.createGain();this.music.connect(audio.destination);this.music.gain.value=0;this.next=0;this.step=0;this.running=false;this.muted=false;this.duckUntil=0;this.buffers={};this.voices=new Set();this.musicBuffer=null;this.loop=null;this.offset=0;this.started=0;
 this.voiceErrors=[];this.effectErrors=[];this.effects=new Set();this.sfxBuffers={};
 const pending=new Map();
 const decode=url=>{if(!pending.has(url))pending.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('audio unavailable');return r.arrayBuffer();}).then(b=>audio.decodeAudioData(b)));return pending.get(url);};
 this.voicesReady=Promise.all(Object.entries(VOICE_FILES).map(async([key,url])=>{try{this.buffers[key]=await decode(url);}catch{this.voiceErrors.push(key);}}));
 this.effectsReady=Promise.all(Object.entries(SFX_FILES).map(async([key,url])=>{try{this.sfxBuffers[key]=await decode(url);}catch{this.effectErrors.push(key);}}));
 this.musicReady=decode(MUSIC_FILE).then(b=>this.musicBuffer=b).catch(()=>{});
 const n=audio.createBuffer(1,audio.sampleRate*.15,audio.sampleRate);const data=n.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*9);this.noise=n;
 }
 note(freq,end,duration,when,volume,type='sine',bus=this.audio.destination){const a=this.audio,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);o.frequency.exponentialRampToValueAtTime(end,when+duration);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(volume,when+.005);g.gain.exponentialRampToValueAtTime(.0001,when+duration);o.connect(g);g.connect(bus);o.start(when);o.stop(when+duration+.01);}
 hat(when,volume){const a=this.audio,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=this.noise;f.type='highpass';f.frequency.value=6500;g.gain.value=volume;s.connect(f);f.connect(g);g.connect(this.music);s.start(when);}
 update(active){
  const a=this.audio,t=a.currentTime,wanted=active&&!this.muted;
  this.music.gain.setTargetAtTime(wanted?(t<this.duckUntil?.065:.38):0,t,.045);
  if(!wanted){this.running=false;if(this.loop){this.offset=(this.offset+t-this.started)%this.musicBuffer.duration;this.loop.stop();this.loop.disconnect();this.loop=null;}return;}
  if(this.musicBuffer){
   if(!this.loop){const s=a.createBufferSource();s.buffer=this.musicBuffer;s.loop=true;s.connect(this.music);s.start(t,this.offset);this.started=t;this.loop=s;}
   this.running=true;return;
  }
  // Lightweight major-key rhythm while the full score is loading.
  if(!this.running){this.running=true;this.next=t;}
  while(this.next<t+.08){const s=this.step++%16,w=this.next;this.next+=60/156/4;
   if(s%4===0)this.note(135,45,.16,w,.20,'sine',this.music);
   if(s%8===4)this.hat(w,.16);
   if(s%2===0){this.hat(w,.06);const f=[587.33,739.99,880,739.99,659.25,587.33,493.88,554.37][s/2];this.note(f,f,.09,w,.035,'triangle',this.music);}
  }
 }
 doorbell(){if(this.muted)return;if(this.effect('doorbell',.58)){this.effect('door',.32,.18);return;}const t=this.audio.currentTime;this.duckUntil=t+.8;for(const [d,f] of [[0,880],[.26,659.25]]){this.note(f,f,.5,t+d,.12);this.note(f*2.76,f*2.76,.25,t+d,.025);}}
 snip(){if(this.muted)return;for(const d of [0,.09]){this.note(2100,480,.045,this.audio.currentTime+d,.10,'triangle');this.hat(this.audio.currentTime+d,.20);}}
 positive(){if(this.muted)return;this.duckUntil=Math.max(this.duckUntil,this.audio.currentTime+.3);this.note(880,1046.5,.11,this.audio.currentTime,.075);this.note(1320,1320,.14,this.audio.currentTime+.055,.025);}
 characterVoice(role,event){
  if(this.muted)return false;
  const b=this.buffers[`${role}-${event}`];if(!b)return false;
  // One speaker at a time. Never replay a late-loading cue after the client leaves.
  this.stopVoices();const a=this.audio,s=a.createBufferSource(),g=a.createGain();
  s.buffer=b;s.playbackRate.value=1;g.gain.value=.88;s.connect(g);g.connect(a.destination);
  this.duckUntil=a.currentTime+b.duration+.20;
  this.voices.add(s);s.onended=()=>{this.voices.delete(s);s.disconnect();g.disconnect();};s.start();return true;
 }
 setback(){if(this.muted)return;this.stopVoices();if(this.effect('failure',.80))return;const t=this.audio.currentTime;this.duckUntil=t+.65;this.note(294,220,.15,t,.075,'triangle');this.note(220,146.8,.30,t+.16,.065,'triangle');}

 cash(){if(this.muted)return;this.note(1500,1500,.14,this.audio.currentTime,.08);this.note(2100,2100,.25,this.audio.currentTime+.11,.07);}
 checkout(){
  if(this.muted)return;this.stopVoices();if(this.effect('success',.80))return;const a=this.audio,t=a.currentTime;
  if(this.reward)this.reward.gain.setValueAtTime(0,t);
  this.reward=a.createGain();this.reward.connect(a.destination);this.reward.gain.value=1;
  for(const [i,f] of [523.25,659.25,783.99,1046.5].entries())this.note(f,f,i===3?.52:.13,t+i*.13,.065,'triangle',this.reward);
  for(const f of [261.63,329.63,392])this.note(f,f,.6,t+.39,.035,'sine',this.reward);
  this.note(160,55,.20,t,.13,'sine',this.reward);
 }
 effect(key,volume=.45,delay=0){
  if(this.muted)return false;const b=this.sfxBuffers[key];if(!b)return false;
  const a=this.audio,s=a.createBufferSource(),g=a.createGain();s.buffer=b;s.playbackRate.value=1;g.gain.value=volume;s.connect(g);g.connect(a.destination);this.effects.add(s);
  s.onended=()=>{this.effects.delete(s);s.disconnect();g.disconnect();};s.start(a.currentTime+delay);
  if(key!=='step')this.duckUntil=Math.max(this.duckUntil,a.currentTime+delay+b.duration+.15);return true;
 }
 footstep(){return this.effect('step',.33);}
 stopEffects(){for(const s of this.effects){try{s.stop();}catch{}}this.effects.clear();if(!this.voices.size)this.duckUntil=this.audio.currentTime;}
 stopVoices(){for(const s of this.voices){try{s.stop();}catch{}}this.voices.clear();}
 hush(){this.stopVoices();this.stopEffects();this.update(false);if(this.reward)this.reward.gain.setTargetAtTime(0,this.audio.currentTime,.02);}
 setMuted(value){this.muted=value;if(value)this.hush();}
}
