import { uploadResultPath, prepareUploadLocation } from './folderUploads.js';
import { FILE_DATABASE } from './prototypeData.js';
import { validateDestination, uniqueContentName } from './contentCreation.js';
import { contentRights } from './access.js';
import { loadState } from './store.js';
export const MAX_FILE_SIZE=50*1024*1024;
let opening;
function database(){if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open(FILE_DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opening=null;reject(Error('文件存储不可用，请重试'));};});return opening;}
async function writeBlob(id,blob){
  const db=await database();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readwrite');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('保存文件失败，请重试'));tx.onabort=()=>reject(tx.error||Error('文件保存已中断，请重试'));
    try{tx.objectStore('files').put(blob,id);}catch(error){tx.abort();reject(error);}
  });}catch(error){throw Error(error.name==='QuotaExceededError'?'本地存储空间不足，请清理空间后重试':'保存文件失败，请重试');}
}
export async function deleteUploadPayload(id){const db=await database();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);tx.oncomplete=resolve;tx.onerror=reject;});}
export const storeUploadPayload=(id,blob)=>writeBlob(id,blob);
export async function readUploadedBlob(blobId){const db=await database();return new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(blobId);request.onsuccess=()=>request.result?resolve(request.result):reject(Error('原始文件暂不可用，请重新上传'));request.onerror=()=>reject(Error('读取文件失败，请重试'));});}
export async function authorizedBlob(id,action='view'){
  const state=loadState(),node=state.nodes.find(n=>n.id===id);if(!contentRights(state,node,state.viewAs)[action])throw Error(action==='download'?'当前没有下载权限':'当前没有查看权限');
  if(!node?.blobId)throw Error('原始文件不存在');const blob=await readUploadedBlob(node.blobId);
  const latest=loadState();if(!contentRights(latest,latest.nodes.find(n=>n.id===id),latest.viewAs)[action])throw Error('权限已变化，请重新打开');return blob;
}
export function prepareUploadedNode(state,file,fields,userId,blobId,body=''){
  validateDestination(state,fields,userId);const time=new Date().toISOString();
  return {id:crypto.randomUUID(),spaceId:fields.spaceId,parentId:fields.parentId||'',type:'doc',format:'file',name:uniqueContentName(state,fields.spaceId,fields.parentId,file.name,true),fileName:file.name,size:file.size,mime:file.type||'',blobId,body,ownerId:userId,creatorId:userId,responsibleId:userId,ownership:state.spaces.find(s=>s.id===fields.spaceId)?.kind==='personal'?'personal':'organization',inherit:true,permissionMode:'layered',localAccess:{subjects:[],visibility:'private',grants:{}},inheritedExclusions:[],members:[],createdAt:time,updatedAt:time,deletedAt:'',favorite:false};
}
export async function persistUpload(file,fields,userId,update,{cancelled=()=>false,onProgress=()=>{}}={}){
  if(file.size>MAX_FILE_SIZE)throw Error('单个文件不能超过 50 MB');
  const initial=loadState();const done=fields.taskId&&initial.uploadTasks?.find(job=>job.id===fields.taskId&&job.status==='done');if(done){const existing=initial.nodes.find(n=>n.id===done.nodeId);if(existing)return existing;throw Error('已完成的内容已被移除，请新建上传任务');}if(initial.viewAs!==userId)throw Error('登录用户已变化，请重新上传');validateDestination(initial,fields,userId);
  const blobId=crypto.randomUUID();let committed=false;
  try{
    onProgress(15,'读取文件');const textFile=/\.(txt|md|csv|json|log)$/i.test(file.name)||file.type.startsWith('text/');
    const body=textFile&&file.size<=2*1024*1024?await file.text():'';
    if(cancelled())throw Error('已取消');onProgress(45,'保存原文件');await writeBlob(blobId,file);
    if(cancelled())throw Error('已取消');let node,assignments=[],alreadyCommitted=false;
    update(state=>{const existing=fields.taskId&&state.uploadTasks?.find(job=>job.id===fields.taskId&&job.status==='done');if(existing){node=state.nodes.find(n=>n.id===existing.nodeId);if(!node)throw Error('已完成的内容已被移除，请新建上传任务');alreadyCommitted=true;return state;}if(state.viewAs!==userId)throw Error('登录用户已变化，上传已停止');if(cancelled())throw Error('已取消');const session=fields.sessionId?{folders:new Map(Object.entries(state.uploadSessions?.[fields.sessionId]?.folders||{}))}:fields.folderSession;
      const prepared=prepareUploadLocation(state,{...fields,folderSession:session},userId);assignments=prepared.assignments;node=prepareUploadedNode(prepared.state,file,prepared.fields,userId,blobId,body);
      const next={...prepared.state,nodes:[...prepared.state.nodes,node],recents:[node.id,...state.recents].slice(0,30)};
      if(fields.taskId){const task=state.uploadTasks?.find(job=>job.id===fields.taskId);if(!task||task.status==='cancelled')throw Error('上传任务已取消');next.uploadTasks=state.uploadTasks.map(job=>job.id===fields.taskId?{...job,status:'done',nodeId:node.id,progress:100,needsFile:false,message:'上传完成',displayPath:uploadResultPath(next,node,fields.parentId)}:job);next.uploadSessions={...state.uploadSessions,[fields.sessionId]:{folders:Object.fromEntries([...session.folders,...assignments])}};}
      return next;});
    if(alreadyCommitted){onProgress(100,'上传完成');return node;}
    committed=true;for(const [path,id] of assignments)fields.folderSession?.folders.set(path,id);onProgress(100,'上传完成');return node;
  }finally{if(!committed)await deleteUploadPayload(blobId).catch(()=>{});}
}
