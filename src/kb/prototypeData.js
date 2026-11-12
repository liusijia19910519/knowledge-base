export const DATA_VERSION=3;
export const FILE_DATABASE='knowledge-original-files-v3';
export const IMAGE_DATABASE='knowledge-library-icons-v3';
let cleaning=false;
// New assets live in versioned stores, so delayed cleanup cannot remove new uploads.
export function initializePrototypeResources(){
  if(typeof indexedDB==='undefined'||typeof localStorage==='undefined'||cleaning)return;
  const marker='kb-prototype-media-reset-v3';try{if(localStorage.getItem(marker)==='done')return;}catch{return;}
  cleaning=true;
  const erase=name=>new Promise(resolve=>{const request=indexedDB.deleteDatabase(name);request.onsuccess=()=>resolve(true);request.onerror=()=>resolve(false);request.onblocked=()=>resolve(false);});
  Promise.all(['knowledge-original-files','knowledge-library-icons','knowledge-library-covers'].map(erase)).then(results=>{if(results.every(Boolean))localStorage.setItem(marker,'done');cleaning=false;}).catch(()=>{cleaning=false;});
}
