import { useEffect, useRef, useState } from 'react';
import { X, UploadSimple, ArrowClockwise, CaretDown } from '@phosphor-icons/react';
import { LocationBrowser, useLocationDialog } from './LocationPicker.jsx';
import { validateDestination } from './contentCreation.js';
import { loadState } from './store.js';
import { MAX_FILE_SIZE } from './uploads.js';
import { uploadPath, uploadResultPath, validateUploadSelection } from './folderUploads.js';
import { changeUploadTask, dismissUploadTasks, forgetUploadFiles, processUploadTask, replaceUploadFile } from './uploadTasks.js';
import './upload.css';
import ContentIcon from './ContentIcon.jsx';
import useHoverMenu from './useHoverMenu.js';

export function UploadDialog({state,userId,context,onClose,onStart}){
  const [position,setPosition]=useState({view:context.category||'',spaceId:'',parentId:''}),[files,setFiles]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),busyRef=useRef(false),[drag,setDrag]=useState(false),root=useRef(null),input=useRef(null),folderInput=useRef(null);
  useLocationDialog(root,()=>{if(!busyRef.current)onClose();});
  useEffect(()=>{if(context.kind)root.current?.querySelector(context.kind==='folder'?'.upload-choose-folder':'.upload-choose-file')?.focus();},[context.kind]);
  const add=list=>{setError('');const next=[...files,...Array.from(list)].filter((file,i,all)=>all.findIndex(f=>uploadPath(f)===uploadPath(file)&&f.size===file.size&&f.lastModified===file.lastModified)===i);try{validateUploadSelection(next);}catch(err){setError(err.message);return;}setFiles(next);if(next.some(file=>file.size>MAX_FILE_SIZE))setError('请移除超过 50 MB 的文件后再上传');};
  let destinationError='';try{validateDestination(state,{...position,category:context.category||''},userId);}catch(err){destinationError=err.message;}
  const submit=async e=>{e.preventDefault();if(busyRef.current)return;try{validateDestination(loadState(),{...position,category:context.category||''},userId);validateUploadSelection(files);if(files.some(f=>f.size>MAX_FILE_SIZE))throw Error('请移除超过 50 MB 的文件后再上传');busyRef.current=true;setBusy(true);await onStart(position,files);onClose();}catch(err){setError(err.message);}finally{busyRef.current=false;setBusy(false);}};
  return <div className="knowledge-product-dialog-backdrop new-create-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busyRef.current)onClose();}}><form ref={root} className="location-picker upload-dialog" role="dialog" aria-modal="true" aria-label="上传文件或文件夹" onSubmit={submit}><header><h2>{context.kind==='folder'?'上传文件夹':context.kind==='file'?'上传文件':'上传文件或文件夹'}</h2><button type="button" className="location-close" disabled={busy} aria-label="关闭上传弹窗" onClick={onClose}><X size={19}/></button></header>
    <div className={`upload-drop ${drag?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);if(busy)return;if(Array.from(e.dataTransfer.items).some(item=>item.webkitGetAsEntry?.()?.isDirectory)){setError('上传文件夹请点击“选择文件夹”，以保留目录层级');return;}add(e.dataTransfer.files);}}><UploadSimple size={23}/><button type="button" className="upload-choose-file" disabled={busy} onClick={()=>input.current.click()}>选择本地文件</button><button type="button" className="upload-choose-folder" disabled={busy} onClick={()=>folderInput.current.click()}>选择文件夹</button><span>或拖拽文件到这里 · 每批最多 20 个文件，单个不超过 50 MB；保留目录层级，空文件夹不上传</span><input ref={input} type="file" multiple aria-label="选择上传文件" onChange={e=>{add(e.target.files);e.target.value='';}}/><input ref={folderInput} type="file" webkitdirectory="" directory="" multiple aria-label="选择上传文件夹" onChange={e=>{add(e.target.files);e.target.value='';}}/></div>
    {!!files.length&&<div className="upload-staged">{files.map((f,i)=><div key={`${f.name}-${i}`}><ContentIcon node={{format:'file',fileName:f.name,mime:f.type}} size={15}/><span title={uploadPath(f)}>{uploadPath(f)}</span><small>{(f.size/1024).toFixed(1)} KB</small><button type="button" disabled={busy} aria-label={`移除文件 ${uploadPath(f)}`} onClick={()=>{setFiles(list=>list.filter((_,index)=>index!==i));setError('');root.current?.querySelector('.upload-drop button')?.focus();}}><X size={14}/></button></div>)}</div>}
    <LocationBrowser emptyLabel="请选择有编辑权限的上传位置" state={state} userId={userId} value={position} onChange={value=>{if(!busy){setPosition(value);setError('');}}} lockedView={context.category||''}/>{error&&<p className="new-create-error" role="alert">{error}</p>}<footer><span>已选择 {files.length} 个文件</span><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" className="location-confirm" disabled={busy||!!destinationError||!files.length||files.some(file=>file.size>MAX_FILE_SIZE)} title={destinationError||(!files.length?'请先选择文件':files.some(file=>file.size>MAX_FILE_SIZE)?'请移除超过50 MB的文件':undefined)}>{busy?'保存任务中…':'开始上传'}</button></footer>
  </form></div>;
}

export function UploadQueue({jobs,userId,update,onOpen}){
  const running=useRef(false),[tick,setTick]=useState(0),[selecting,setSelecting]=useState(''),[workerError,setWorkerError]=useState(''),picker=useRef(null);
  const working=jobs.some(job=>['pending','uploading','staging'].includes(job.status));
  useEffect(()=>{if(!working)return;const timer=setInterval(()=>setTick(n=>n+1),1000);return()=>clearInterval(timer);},[working]);
  useEffect(()=>{
    if(running.current)return;const job=jobs.find(j=>['pending','uploading','staging'].includes(j.status));if(!job)return;
    running.current=true;processUploadTask(job.id,update).then(()=>setWorkerError('')).catch(error=>setWorkerError(`任务状态暂存失败：${error.message}，请释放本地存储空间后重试。`)).finally(()=>{running.current=false;});
  },[jobs,tick]);
  if(!jobs.length)return null;
  const unfinished=jobs.some(j=>['pending','uploading','staging'].includes(j.status));
  const cancel=id=>changeUploadTask(update,id,{status:'cancelled',message:'已取消'});
  const retry=job=>changeUploadTask(update,job.id,{status:'pending',message:'等待继续上传'});
  return <aside className="upload-queue" aria-label="上传任务"><header><strong>上传文件 · {jobs.filter(j=>j.status==='done').length}/{jobs.length}</strong><button type="button" aria-label={unfinished?'取消未完成上传':'关闭上传任务'} onClick={()=>{if(unfinished)update(state=>({...state,uploadTasks:(state.uploadTasks||[]).map(j=>j.userId===userId&&['pending','uploading','staging'].includes(j.status)?{...j,status:'cancelled',message:'已取消'}:j)}));else {update(state=>dismissUploadTasks(state,userId));forgetUploadFiles(jobs.map(job=>job.id));}}}><X size={16}/></button></header><div>{jobs.map(job=><div className="upload-job" key={job.id}><ContentIcon node={{format:'file',fileName:job.file.name,mime:job.file.type}} size={16}/><span><b title={job.displayPath||job.fields.relativePath||job.file.name}>{job.displayPath||job.fields.relativePath||job.file.name}</b><small className={job.status==='error'?'error':''}>{job.message||'等待上传'}</small>{job.status==='uploading'&&<progress max="100" value={job.progress}/>}</span>{job.status==='done'?<button type="button" onClick={()=>onOpen(job.nodeId)}>查看</button>:job.status==='error'||job.status==='cancelled'?job.needsFile?<button type="button" aria-label={`补选原文件 ${job.file.name}`} onClick={()=>{setSelecting(job.id);picker.current.value='';picker.current.click();}}>补选文件</button>:<button type="button" aria-label={`重试 ${job.file.name}`} onClick={()=>retry(job)}><ArrowClockwise size={15}/></button>:<button type="button" aria-label={`取消上传 ${job.file.name}`} onClick={()=>cancel(job.id)}>取消</button>}</div>)}</div><footer className="upload-persistence-note" role={workerError?'alert':undefined}>{workerError||'任务已在本机保存，刷新后继续未完成上传。'}</footer><input ref={picker} hidden type="file" aria-label="补选上传原文件" onChange={async e=>{const file=e.target.files[0],id=selecting;e.target.value='';if(!file)return;try{await replaceUploadFile(update,id,file,userId);}catch(error){changeUploadTask(update,id,{status:'error',needsFile:true,message:error.message});}}}/></aside>;
}

export function UploadMenu({onChoose,variant='compact',disabled=false,reason=''}){
  const {open,root,trigger,close,rootProps,triggerProps}=useHoverMenu(disabled);
  const choose=kind=>{close(true);onChoose(kind);};
  return <div className={`upload-menu upload-variant-${variant} ${variant==='library'?'knowledge-action-menu':''}`} ref={root} {...rootProps}><button type="button" ref={trigger} aria-label="上传" aria-haspopup="menu" aria-expanded={open} disabled={disabled} title={disabled?reason:undefined} {...triggerProps}>{variant==='compact'?<><UploadSimple size={16}/>上传<CaretDown size={12}/></>:<><span className="upload-action-icon kb-shortcut-icon" aria-hidden="true"><UploadSimple size={22}/></span><span><strong>上传文件</strong></span><CaretDown size={16}/></>}</button>{open&&<div className="upload-menu-options" role="menu" aria-label="上传方式"><button type="button" role="menuitem" onClick={()=>choose('file')}><ContentIcon aria-hidden="true" node={{format:'file',fileName:'file'}} size={17}/>上传文件</button><button type="button" role="menuitem" onClick={()=>choose('folder')}><ContentIcon aria-hidden="true" node={{type:'folder'}} size={17}/>上传文件夹</button></div>}</div>;
}
