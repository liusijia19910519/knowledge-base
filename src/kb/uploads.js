import { prepareUploadLocation } from './folderUploads.js';
import { FILE_DATABASE } from './prototypeData.js';
import { validateDestination, uniqueContentName } from './contentCreation.js';
import { contentRights } from './access.js';
import { loadState } from './store.js';
export const MAX_FILE_SIZE=50*1024*1024;
let opening;
function database(){if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open(FILE_DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opening=null;reject(Error('文件存储不可用，请重试'));};});return opening;}
async function writeBlob(id,blob){const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(blob,id);tx.oncomplete=resolve;tx.onerror=()=>reject(Error('保存文件失败，可能存储空间不足'));tx.onabort=()=>reject(Error('文件保存已中断'));});}
async function removeBlob(id){const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=resolve;tx.onerror=reject;});}
export async function readUploadedBlob(blobId){const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(blobId);request.onsuccess=()=>request.result?resolve(request.result):reject(Error('原始文件暂不可用，请重新上传'));request.onerror=()=>reject(Error('读取文件失败，请重试'));});}
export async function authorizedBlob(id,action='view'){
  const state=loadState(),node=state.nodes.find(n=>n.id===id);if(!contentRights(state,node,state.viewAs)[action])throw Error(action==='download'?'当前没有下载权限':'当前没有查看权限');
  if(!node?.blobId)throw Error('原始文件不存在');const blob=await readUploadedBlob(node.blobId);
  const latest=loadState();if(!contentRights(latest,latest.nodes.find(n=>n.id===id),latest.viewAs)[action])throw Error('权限已变化，请重新打开');return blob;
}
export function prepareUploadedNode(state,file,fields,userId,blobId,body=''){
  validateDestination(state,fields,userId);const time=new Date().toISOString();
  return {id:crypto.randomUUID(),spaceId:fields.spaceId,parentId:fields.parentId||'',type:'doc',format:'file',name:uniqueContentName(state,fields.spaceId,fields.parentId,file.name,true),fileName:file.name,size:file.size,mime:file.type||'',blobId,body,ownerId:userId,inherit:true,permissionMode:'layered',localAccess:{subjects:[],visibility:'private',grants:{}},inheritedExclusions:[],members:[],createdAt:time,updatedAt:time,deletedAt:'',favorite:false};
}
export async function persistUpload(file,fields,userId,update,{cancelled=()=>false,onProgress=()=>{}}={}){
  if(file.size>MAX_FILE_SIZE)throw Error('单个文件不能超过 50 MB');
  const initial=loadState();if(initial.viewAs!==userId)throw Error('登录用户已变化，请重新上传');validateDestination(initial,fields,userId);
  const blobId=crypto.randomUUID();let committed=false;
  try{
    onProgress(15,'读取文件');const textFile=/\.(txt|md|csv|json|log)$/i.test(file.name)||file.type.startsWith('text/');
    const body=textFile&&file.size<=2*1024*1024?await file.text():'';
    if(cancelled())throw Error('已取消');onProgress(45,'保存原文件');await writeBlob(blobId,file);
    if(cancelled())throw Error('已取消');let node,assignments=[];
    update(state=>{if(state.viewAs!==userId)throw Error('登录用户已变化，上传已停止');if(cancelled())throw Error('已取消');const prepared=prepareUploadLocation(state,fields,userId);assignments=prepared.assignments;node=prepareUploadedNode(prepared.state,file,prepared.fields,userId,blobId,body);return {...prepared.state,nodes:[...prepared.state.nodes,node],recents:[node.id,...state.recents].slice(0,30)};});
    committed=true;for(const [path,id] of assignments)fields.folderSession.folders.set(path,id);onProgress(100,'上传完成');return node;
  }finally{if(!committed)await removeBlob(blobId).catch(()=>{});}
}
