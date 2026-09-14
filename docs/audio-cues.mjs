// Uploaded assets are immutable per demo. Missing cues keep Demo 32's clips.
const newer=name=>`/hair-salon/assets/audio-v33/${name}.wav`;
const previous=name=>`/hair-salon/assets/voices-v32/${name}.wav`;
export const VOICE_FILES=Object.freeze({
 'granny-request':previous('granny-request'),'granny-happy':previous('granny-happy'),
 'granny-angry':newer('granny-angry'),'granny-pain':newer('granny-pain'),'granny-sigh':newer('granny-sigh'),
 'girl-request':previous('girl-request'),'girl-happy':previous('girl-happy'),
 'girl-angry':newer('girl-angry'),'girl-sigh':newer('girl-sigh'),'girl-sneeze':newer('girl-sneeze'),
 'man-request':previous('man-request'),'man-happy':newer('man-happy'),
 'man-angry':newer('man-angry'),'man-pain':newer('man-pain'),'man-sigh':newer('man-angry'),
});
export const SFX_FILES=Object.freeze({doorbell:newer('doorbell'),door:newer('door-open'),step:newer('step'),success:newer('ending-great'),failure:newer('ending-bad')});
export const MUSIC_FILE='/hair-salon/assets/audio-v33/music.mp3';
