# Panic Salon — asset handoff

## Flow
The same template as the other three games: an "Allow the camera" card (Open camera, or play without one), then a 3-2-1 count-in with a beep while the chair stays empty. The doorbell rings and the first client walks in, sits and makes a request. Three clients per shift: Granny (white hairs), the girl (one-swipe bangs), the gentleman (hair grafts). Replay runs the same count-in. The top-right pause, camera and sound controls are hidden in play.

## Current appearance
The game uses procedural Three.js characters from granny-model.mjs, girl-model.mjs and man-model.mjs. Edit these or use them as the visual reference. The Blender bundles are separate rigged studies for colleagues to refine; they are not silently substituted into the game.

## Try the source
Serve the `site` directory with a local static server. Camera access requires HTTPS or localhost. No npm build is required. `game.js` owns the camera gate, count-in, service flow and cue timing; `avatar.mjs` owns 3D tools, scene props and result effects.

## Sounds
`audio-cues.mjs` maps every sampled role/event. Use the same mapping keys when replacing audio. Keep requests, satisfaction and frustration brief. Synthesized pluck/snip/payment sounds are in `game.js` and `soundtrack.mjs`. The WAV auditions are offline renders; browser oscillator/noise output varies slightly. No synthesis WAVs have replaced the game's existing sound engine. The gentleman's sigh currently reuses his angry file.

## UI
`index.html` and `style.css` contain the camera gate, count-in, top hint, tip chip, tap/swipe guides, buttons and confetti. The guides last two seconds in play. The gesture hand SVG is an extracted original. `payment.mjs` paints the banknote in a canvas; it is game currency.

## Results
Three recorded happy departures = success + confetti. Tips remain a separate score out of $150. Each character retains their own departure mood.

## Editing boundaries
Static GLB and Three.js JSON exports preserve meshes/materials but not the procedural animation functions. The tip jar export includes blank note meshes; use payment.mjs or the banknote PNG downloader for their runtime canvas art. Use the game source for motion. Cloth PNGs are extracted material maps; the tint and UV repeat in the catalog must be applied too. Skin, hair, metal, glass and stubble are shader/geometry materials, not missing PNGs.

## Dependencies
Three.js, MediaPipe and the bundled fonts retain their license files in `site/vendor`. Keep attribution files with redistributed dependencies. The raw uploaded audio is supplied by Bella; no rights metadata was provided.
