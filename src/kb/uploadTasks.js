import { loadState } from './store.js';
import { validateDestination } from './contentCreation.js';
import { validateUploadSelection, uploadPath } from './folderUploads.js';
import { storeUploadPayload, readUploadedBlob, deleteUploadPayload, persistUpload, MAX_FILE_SIZE } from './uploads.js';
const localFiles=new Map();
const uploadLock=fn=>globalThis.navigator?.locks?navigator.locks.request('kb-upload-worker-v3',fn):fn({});
export const forgetUploadFiles=ids=>ids.forEach(id=>localFiles.delete(id));
export const visibleUploadTasks=(state,userId)=>(state.uploadTasks||[]).filter(job=>job.userId===userId);
export function changeUploadTask(update,id,fields){return update(state=>({...state,uploadTasks:(state.uploadTasks||[]).map(job=>job.id===id&&!(job.status==='done'&&fields.status&&fields.status!=='done')?{...job,...fields}:job)}));}
export function dismissUploadTasks(state,userId){const uploadTasks=(state.uploadTasks||[]).filter(job=>job.userId!==userId),sessions=new Set(uploadTasks.map(job=>job.fields.sessionId));return {...state,uploadTasks,uploadSessions:Object.fromEntries(Object.entries(state.uploadSessions||{}).filter(([id])=>sessions.has(id)))};}
export async function stageUploadBatch(update,position,files,userId){
  validateUploadSelection(files);if(files.some(file=>file.size>MAX_FILE_SIZE))throw Error('单个文件不能超过 50 MB');
  return uploadLock(async()=>{
    const sessionId=crypto.randomUUID(),jobs=Array.from(files).map(file=>{const id=crypto.randomUUID();localFiles.set(id,file);return {id,userId,file:{name:file.name,size:file.size,type:file.type,lastModified:file.lastModified},stagedBlobId:`pending:${id}`,fields:{...position,lockedSpaceId:position.spaceId,relativePath:uploadPath(file),sessionId,taskId:id},status:'staging',message:'保存上传任务…'};});
    try{update(state=>{if(state.viewAs!==userId)throw Error('当前用户已变化');validateDestination(state,position,userId);return {...state,uploadTasks:[...(state.uploadTasks||[]),...jobs],uploadSessions:{...state.uploadSessions,[sessionId]:{folders:{}}}};});}catch(error){forgetUploadFiles(jobs.map(job=>job.id));throw error;}
    for(const job of jobs){
      if(!loadState().uploadTasks?.some(row=>row.id===job.id&&row.status==='staging'))continue;
      try{await storeUploadPayload(job.stagedBlobId,localFiles.get(job.id));const latest=loadState().uploadTasks?.find(row=>row.id===job.id);if(!latest||latest.status==='done'){await deleteUploadPayload(job.stagedBlobId);continue;}changeUploadTask(update,job.id,{status:latest.status==='staging'?'pending':latest.status,message:latest.status==='staging'?'等待上传':latest.message});}
      catch(error){changeUploadTask(update,job.id,{status:'error',needsFile:false,message:error.message});}
    }
  });
}
export async function replaceUploadFile(update,id,file,userId){
  const task=loadState().uploadTasks?.find(row=>row.id===id);if(!task||task.userId!==userId||loadState().viewAs!==userId)throw Error('上传任务已失效');
  if(file.name!==task.file.name||file.size!==task.file.size||file.lastModified!==task.file.lastModified)throw Error('请选择原来同名、同大小且未修改的文件；修改后的文件请作为新上传');
  await storeUploadPayload(task.stagedBlobId,file);localFiles.set(id,file);changeUploadTask(update,id,{status:'pending',needsFile:false,message:'等待继续上传'});
}
export async function processUploadTask(id,update){
  const run=async lock=>{
    if(!lock)return;let task=loadState().uploadTasks?.find(row=>row.id===id);if(!task||!['pending','uploading','staging'].includes(task.status))return;
    changeUploadTask(update,id,{status:'uploading',progress:0,message:'准备上传'});
    try{
      let file=localFiles.get(id);
      if(!file){try{const blob=await readUploadedBlob(task.stagedBlobId);file=new File([blob],task.file.name,{type:task.file.type,lastModified:task.file.lastModified});}catch{throw Object.assign(Error('上传准备已中断，请补选原文件后继续'),{needsFile:true});}}
      // A retry after staging failure first makes the source durable.
      await storeUploadPayload(task.stagedBlobId,file);
      await persistUpload(file,task.fields,task.userId,update,{cancelled:()=>{const row=loadState().uploadTasks?.find(j=>j.id===id);return !row||row.status==='cancelled';},onProgress:(progress,message)=>changeUploadTask(update,id,{progress,message})});
      localFiles.delete(id);
    }catch(error){task=loadState().uploadTasks?.find(row=>row.id===id);if(task&&task.status!=='done')changeUploadTask(update,id,{status:task.status==='cancelled'?'cancelled':'error',message:task.status==='cancelled'?'已取消':error.message,needsFile:!!error.needsFile});}
  };
  if(globalThis.navigator?.locks)return navigator.locks.request('kb-upload-worker-v3',{ifAvailable:true},run);
  return run({});
}
