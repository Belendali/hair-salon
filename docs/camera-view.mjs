// The video and face overlay share this uncropped, mirrored framing.
export function selfieLayout(width,height,videoWidth,videoHeight,mode="contain"){
 const scale=(mode==="full"?Math.max:Math.min)(width/videoWidth,height/videoHeight);
 return {scale,ox:(width-videoWidth*scale)/2,oy:(height-videoHeight*scale)*(mode==="full"?.5:.26)};
}

export async function openSelfieStream(mediaDevices){
 if(!mediaDevices?.getUserMedia)throw new Error('Camera unavailable');
 const supported=mediaDevices.getSupportedConstraints?.()??{};
 const video={facingMode:{ideal:'user'},width:{ideal:960},height:{ideal:1280},aspectRatio:{ideal:3/4}};
 if(supported.resizeMode)video.resizeMode={ideal:'none'};
 let stream;
 try{stream=await mediaDevices.getUserMedia({audio:false,video});}
 catch(error){
  if(error.name!=='OverconstrainedError')throw error;
  stream=await mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'}}});
 }
 const track=stream.getVideoTracks()[0];
 // Do not assume iOS exposes the native Camera app's wide-angle switch.
 // A rejected optional zoom adjustment must never prevent normal camera use.
 try{
  const zoom=track?.getCapabilities?.().zoom;
  if(Number.isFinite(zoom?.min)&&zoom.min>0&&track.applyConstraints)
   await track.applyConstraints({advanced:[{zoom:zoom.min}]});
 }catch{}
 return stream;
}
