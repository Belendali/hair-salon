// One contract for the worker, main-thread fallback and barber renderer.
export const FILTER_LANDMARK_IDS=Object.freeze([0,2,10,33,61,234,263,291,454]);
const OUTPUT_IDS=Object.freeze([...FILTER_LANDMARK_IDS,1,13,152]);
export function hasFilterLandmarks(points){return !!points&&FILTER_LANDMARK_IDS.every(i=>Number.isFinite(points[i]?.x)&&Number.isFinite(points[i]?.y));}
export function pickFilterLandmarks(all){if(!hasFilterLandmarks(all))return null;return Object.fromEntries(OUTPUT_IDS.filter(i=>all[i]).map(i=>[i,{x:all[i].x,y:all[i].y}]));}
