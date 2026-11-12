import { useEffect, useRef, useState } from 'react';
import { X, UploadSimple, File, ArrowClockwise } from '@phosphor-icons/react';
import { LocationBrowser, useLocationDialog } from './LocationPicker.jsx';
import { validateDestination } from './contentCreation.js';
import { loadState } from './store.js';
import { MAX_FILE_SIZE, persistUpload } from './uploads.js';
import './upload.css';

export function UploadDialog({state,userId,context,onClose,onStart}){
  const [position,setPosition]=useState({view:context.category||'',spaceId:'',parentId:''}),[files,setFiles]=useState([]),[error,setError]=useState(''),[drag,setDrag]=useState(false),root=useRef(null),input=useRef(null);
  useLocationDialog(root,onClose);
  const add=list=>{setError('');const next=[...files,...Array.from(list)].filter((file,i,all)=>all.findIndex(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified)===i);if(next.length>20){setError('每次最多选择 20 个文件');return;}setFiles(next);};
  const submit=e=>{e.preventDefault();try{validateDestination(loadState(),{...position,category:context.category||''},userId);if(!files.length)throw Error('请先选择要上传的文件');if(files.some(f=>f.size>MAX_FILE_SIZE))throw Error('请移除超过 50 MB 的文件后再上传');onStart(position,files);onClose();}catch(err){setError(err.message);}};
  return <div className="knowledge-product-dialog-backdrop new-create-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><form ref={root} className="location-picker upload-dialog" role="dialog" aria-modal="true" aria-label="上传文件" onSubmit={submit}><header><h2>上传文件</h2><button type="button" className="location-close" aria-label="关闭上传弹窗" onClick={onClose}><X size={19}/></button></header>
    <div className={`upload-drop ${drag?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);add(e.dataTransfer.files);}}><UploadSimple size={23}/><button type="button" onClick={()=>input.current.click()}>选择本地文件</button><span>或拖拽文件到这里 · 最多 20 个，单个不超过 50 MB</span><input ref={input} type="file" multiple aria-label="选择上传文件" onChange={e=>{add(e.target.files);e.target.value='';}}/></div>
    {!!files.length&&<div className="upload-staged">{files.map((f,i)=><div key={`${f.name}-${i}`}><File size={15}/><span>{f.name}</span><small>{(f.size/1024).toFixed(1)} KB</small><button type="button" aria-label={`移除文件 ${f.name}`} onClick={()=>{setFiles(list=>list.filter((_,index)=>index!==i));setError('');}}><X size={14}/></button></div>)}</div>}
    <LocationBrowser state={state} userId={userId} value={position} onChange={value=>{setPosition(value);setError('');}} lockedView={context.category||''}/>{error&&<p className="new-create-error" role="alert">{error}</p>}<footer><span>已选择 {files.length} 个文件</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="location-confirm">开始上传</button></footer>
  </form></div>;
}

export function UploadQueue({jobs,setJobs,update,onOpen}){
  const active=useRef(new Set()),running=useRef(false);
  const patch=(id,value)=>setJobs(list=>list.map(job=>job.id===id?{...job,...value}:job));
  useEffect(()=>{
    if(running.current)return;const job=jobs.find(j=>j.status==='pending'&&!active.current.has(j.id));if(!job)return;
    running.current=true;active.current.add(job.id);patch(job.id,{status:'uploading',progress:0,message:'准备上传'});
    persistUpload(job.file,job.fields,job.userId,update,{cancelled:()=>job.control.cancelled,onProgress:(progress,message)=>patch(job.id,{progress,message})}).then(node=>patch(job.id,{status:'done',nodeId:node.id,message:'上传完成'})).catch(error=>patch(job.id,{status:job.control.cancelled?'cancelled':'error',message:error.message})).finally(()=>{running.current=false;active.current.delete(job.id);setJobs(list=>[...list]);});
  },[jobs]);
  if(!jobs.length)return null;
  const unfinished=jobs.some(j=>['pending','uploading'].includes(j.status));
  return <aside className="upload-queue" aria-label="上传任务"><header><strong>上传文件 · {jobs.filter(j=>j.status==='done').length}/{jobs.length}</strong><button type="button" aria-label={unfinished?'取消未完成上传':'关闭上传任务'} onClick={()=>{if(unfinished){for(const j of jobs)if(['pending','uploading'].includes(j.status))j.control.cancelled=true;setJobs(list=>list.map(j=>j.status==='pending'?{...j,status:'cancelled',message:'已取消'}:j));}else setJobs([]);}}><X size={16}/></button></header><div>{jobs.map(job=><div className="upload-job" key={job.id}><File size={16}/><span><b>{job.file.name}</b><small className={job.status==='error'?'error':''}>{job.message||'等待上传'}</small>{job.status==='uploading'&&<progress max="100" value={job.progress}/>}</span>{job.status==='done'?<button type="button" onClick={()=>onOpen(job.nodeId)}>查看</button>:job.status==='error'||job.status==='cancelled'?<button type="button" aria-label={`重试 ${job.file.name}`} onClick={()=>{job.control.cancelled=false;patch(job.id,{status:'pending',message:'等待重试'});}}><ArrowClockwise size={15}/></button>:<button type="button" aria-label={`取消上传 ${job.file.name}`} onClick={()=>{job.control.cancelled=true;if(job.status==='pending')patch(job.id,{status:'cancelled',message:'已取消'});}}>取消</button>}</div>)}</div></aside>;
}
