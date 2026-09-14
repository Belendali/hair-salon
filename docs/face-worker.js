let detector=null,pickFilterLandmarks=null;
self.onmessage=async ({data})=>{
  if(data.type==='init'){
    try{
      ({pickFilterLandmarks}=await import('./face-points.mjs?v=35'));
      const {FaceLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');
      const vision=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm',self.location.href).href);
      detector=await FaceLandmarker.createFromOptions(vision,{canvas:new OffscreenCanvas(320,240),baseOptions:{modelAssetPath:new URL('./vendor/face_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.4,minTrackingConfidence:.4,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false});
      self.postMessage({type:'ready'});
    }catch(error){self.postMessage({type:'error',message:String(error.message||error)});}
  }else if(data.type==='frame'){
    try{
      if(!detector)throw new Error('Not initialized');
      const result=detector.detectForVideo(data.frame,data.time);const all=result.faceLandmarks?.[0];
      const landmarks=pickFilterLandmarks(all);
      self.postMessage({type:'landmarks',landmarks,time:data.time});
    }catch(error){self.postMessage({type:'frame-error',message:String(error.message||error)});}finally{data.frame.close();}
  }
};
