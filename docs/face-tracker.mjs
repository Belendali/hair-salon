import {pickFilterLandmarks} from './face-points.mjs?v=35';
// Worker-first tracking with a real on-page detector for mobile compatibility.
export class FaceTracker {
  constructor({onLandmarks,onStatus,workerURL=new URL('./face-worker.js?v=35',import.meta.url),
    makeWorker=url=>new Worker(url),loadVision=()=>import('./vendor/vision_bundle.mjs'),
    makeCanvas=()=>document.createElement('canvas')}={}) {
    Object.assign(this,{onLandmarks,onStatus,workerURL,makeWorker,loadVision,makeCanvas});
    this.closed=false;this.mode='idle';this.busy=false;this.lastFrame=0;this.failures=0;
  }
  start(){
    this.onStatus('loading');this.mode='worker-loading';
    try {
      const worker=this.worker=this.makeWorker(this.workerURL);
      worker.onmessage=({data})=>{
        if(this.closed||this.worker!==worker)return;
        if(data.type==='ready'){clearTimeout(this.timer);this.mode='worker';this.onStatus('ready');}
        if(data.type==='landmarks'){clearTimeout(this.frameTimer);this.busy=false;this.failures=0;this.onLandmarks(data.landmarks);}
        if(data.type==='frame-error'){clearTimeout(this.frameTimer);this.busy=false;if(++this.failures>=3)this.fallback();}
        if(data.type==='error')this.fallback();
      };
      worker.onerror=()=>this.fallback();
      this.timer=setTimeout(()=>this.fallback(),12000);
      worker.postMessage({type:'init'});
    }catch{this.fallback();}
  }
  async fallback(){
    if(this.closed||['main-loading','main','failed'].includes(this.mode))return;
    clearTimeout(this.timer);clearTimeout(this.frameTimer);this.worker?.terminate();this.worker=null;this.busy=false;
    this.mode='main-loading';this.onStatus('loading');
    this.timer=setTimeout(()=>{if(!this.closed&&this.mode==='main-loading'){this.mode='failed';this.onStatus('failed');}},20000);
    let detector;
    try {
      const {FaceLandmarker,FilesetResolver}=await this.loadVision();
      if(this.closed||this.mode!=='main-loading')return;
      const vision=await FilesetResolver.forVisionTasks('/hair-salon/vendor/wasm');
      if(this.closed||this.mode!=='main-loading')return;
      detector=await FaceLandmarker.createFromOptions(vision,{
        canvas:this.makeCanvas(),baseOptions:{modelAssetPath:'/hair-salon/vendor/face_landmarker.task',delegate:'CPU'},
        runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.4,minTrackingConfidence:.4,
        outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false
      });
      if(this.closed||this.mode!=='main-loading'){detector.close();return;}
      this.detector=detector;this.input=this.makeCanvas();this.context=this.input.getContext('2d');
      this.mode='main';this.failures=0;clearTimeout(this.timer);this.onStatus('ready');
    }catch{
      detector?.close();this.detector=null;clearTimeout(this.timer);
      if(!this.closed){this.mode='failed';this.onStatus('failed');}
    }
  }
  async frame(video,now){
    if(this.closed||this.busy||!['worker','main'].includes(this.mode)||now-this.lastFrame<110||video.readyState<2)return;
    this.lastFrame=now;this.busy=true;
    if(this.mode==='main'){
      try{
        const w=320,h=Math.max(1,Math.round(w*video.videoHeight/video.videoWidth));
        if(this.input.width!==w||this.input.height!==h){this.input.width=w;this.input.height=h;}
        this.context.drawImage(video,0,0,w,h);
        const all=this.detector.detectForVideo(this.input,now).faceLandmarks?.[0];
        this.onLandmarks(pickFilterLandmarks(all));
        this.failures=0;
      }catch{if(++this.failures>=3){this.mode='failed';this.onStatus('failed');}}
      finally{this.busy=false;}
      return;
    }
    const worker=this.worker;
    try{
      const bitmap=await createImageBitmap(video,{resizeWidth:320,resizeHeight:Math.round(320*video.videoHeight/video.videoWidth),resizeQuality:'low'});
      if(this.closed||this.worker!==worker||this.mode!=='worker'){bitmap.close();this.busy=false;return;}
      this.frameTimer=setTimeout(()=>this.fallback(),1800);
      worker.postMessage({type:'frame',frame:bitmap,time:now},[bitmap]);
    }catch{this.busy=false;this.fallback();}
  }
  close(){this.closed=true;clearTimeout(this.timer);clearTimeout(this.frameTimer);this.worker?.terminate();this.detector?.close();this.worker=null;this.detector=null;}
}
