import { FILE_DATABASE, IMAGE_DATABASE } from './prototypeData.js';
import { deleteAsset } from './assetStorage.js';
const QUEUE_KEY='kb-resource-cleanup-v3';let running=false;
export function resourceReferences(state){
  const files=new Set((state.nodes||[]).map(n=>n.blobId).filter(Boolean)),images=new Set();
  for(const library of state.spaces||[])for(const asset of [library.icon,library.cover])if(asset?.kind==='image'&&asset.blobId)images.add(asset.blobId);
  for(const task of state.uploadTasks||[])if(task.status!=='done'&&task.stagedBlobId)files.add(task.stagedBlobId);
  return {files,images};
}
export function releasedResources(previous,next){const before=resourceReferences(previous),after=resourceReferences(next);return ['files','images'].flatMap(store=>[...before[store]].filter(id=>!after[store].has(id)).map(id=>({store,id})));}
function pending(){try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');}catch{return [];}}
export function queueReleasedResources(previous,next){const rows=releasedResources(previous,next);if(!rows.length)return;const merged=[...new Map([...pending(),...rows].map(row=>[`${row.store}:${row.id}`,row])).values()];localStorage.setItem(QUEUE_KEY,JSON.stringify(merged));}
export async function flushResourceCleanup(latest){
  if(running)return;running=true;
  try{for(const row of pending()){
    if(!resourceReferences(latest())[row.store]?.has(row.id))await deleteAsset(row.store==='files'?FILE_DATABASE:IMAGE_DATABASE,row.store,row.id,()=>!resourceReferences(latest())[row.store]?.has(row.id));
    localStorage.setItem(QUEUE_KEY,JSON.stringify(pending().filter(item=>item.store!==row.store||item.id!==row.id)));
  }}finally{running=false;}
}
