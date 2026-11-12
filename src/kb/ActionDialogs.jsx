import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { useLocationDialog, locationLabel } from './LocationPicker.jsx';
import { validateContentName, renameContent, contentLabel, uploadedExtension } from './contentCreation.js';
import { actionReason } from './fileActions.js';
import { buildDownload, offerDownload } from './bundles.js';
import { preparePrint } from './printable.js';
import { loadState, memberName } from './store.js';
import './actions.css';

export function ConfirmAction({title,body,confirmText='确认',cancelText='返回修改',danger=false,onConfirm,onClose}){
  const root=useRef(null);useLocationDialog(root,onClose);
  return createPortal(<div className="action-backdrop confirmation-backdrop" onMouseDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}><section ref={root} className="action-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDownCapture={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}><header><h2>{title}</h2><button type="button" aria-label="关闭确认" onClick={onClose}><X size={18}/></button></header><p>{body}</p><footer><button type="button" onClick={onClose}>{cancelText}</button><button type="button" className={danger?"danger-primary":"primary"} onClick={onConfirm}>{confirmText}</button></footer></section></div>,document.body);
}
export function NameForm({node,userId,update,onClose,inline=false}){
  const extension=uploadedExtension(node),base=extension&&node.name.toLowerCase().endsWith(extension.toLowerCase())?node.name.slice(0,-extension.length):node.name;
  const [name,setName]=useState(base),[error,setError]=useState(''),input=useRef(null);
  useEffect(()=>{input.current?.focus();input.current?.select();},[]);
  const save=e=>{e.preventDefault();e.stopPropagation();try{validateContentName(name);update(s=>renameContent(s,node.id,name+extension,userId,node.name));onClose(true);}catch(err){setError(err.message);}};
  return <form className={`rename-form ${inline?'inline':''}`} onClick={e=>e.stopPropagation()} onSubmit={save} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();onClose(false);}}}><div><input ref={input} aria-label="新的名称" value={name} maxLength={100-extension.length} onChange={e=>{setName(e.target.value);setError('');}}/>{extension&&<span className="rename-extension">{extension}</span>}<button type="submit">确认</button><button type="button" onClick={()=>onClose(false)}>取消</button></div>{error&&<small role="alert">{error}</small>}</form>;
}
export function RenameDialog({node,userId,update,onClose}){const root=useRef(null);useLocationDialog(root,()=>onClose(false));return <div className="action-backdrop"><section ref={root} className="action-dialog" role="dialog" aria-modal="true" aria-label="重命名"><header><h2>重命名</h2><button type="button" aria-label="关闭重命名" onClick={()=>onClose(false)}><X size={18}/></button></header><NameForm node={node} userId={userId} update={update} onClose={onClose}/></section></div>;}
export function FileInformation({state,node,onClose}){const root=useRef(null);useLocationDialog(root,onClose);return <div className="action-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={root} className="action-dialog" role="dialog" aria-modal="true" aria-label="文件信息"><header><h2>文件信息</h2><button type="button" aria-label="关闭文件信息" onClick={onClose}><X size={18}/></button></header><dl>{[['名称',node.name],['类型',contentLabel(node)],['大小',`${((node.size??new Blob([node.body||'']).size)/1024).toFixed(1)} KB`],['创建者',memberName(state,node.ownerId)],['创建时间',node.createdAt?new Date(node.createdAt).toLocaleString('zh-CN'):'—'],['更新时间',new Date(node.updatedAt).toLocaleString('zh-CN')],['所在位置',locationLabel(state,node.spaceId,node.parentId)]].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section></div>;}
export function DownloadDialog({state,ids,spaceId,userId,onClose,onSuccess}){
  const [status,setStatus]=useState('正在准备下载'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),cancel=useRef(false),run=useRef(0),root=useRef(null);
  const close=()=>{cancel.current=true;onClose();};useLocationDialog(root,close);
  useEffect(()=>{const current=++run.current;cancel.current=false;let live=true;setError('');buildDownload(loadState(),ids,spaceId,userId,{cancelled:()=>cancel.current||!live,onProgress:text=>live&&setStatus(text)}).then(file=>{if(live&&!cancel.current&&run.current===current){offerDownload(file);onSuccess();}}).catch(e=>{if(live&&!cancel.current)setError(e.message);});return()=>{live=false;};},[attempt]);
  return <div className="action-backdrop"><section ref={root} className="action-dialog" role="dialog" aria-modal="true" aria-label="准备下载"><header><h2>下载 {ids.length} 项内容</h2><button type="button" onClick={close} aria-label="取消下载"><X size={18}/></button></header><p role="status">{error||status}</p><footer><button type="button" onClick={close}>取消</button>{error&&<button type="button" className="primary" onClick={()=>setAttempt(n=>n+1)}>重试</button>}</footer></section></div>;
}
export function PrintDialog({state,node,userId,onClose,onNotice}){
  const [prepared,setPrepared]=useState(null),[error,setError]=useState(''),root=useRef(null);useLocationDialog(root,onClose);
  useEffect(()=>{let live=true,url;preparePrint(node.id).then(result=>{url=result.url;if(live)setPrepared(result);else if(url)URL.revokeObjectURL(url);}).catch(e=>live&&setError(e.message));return()=>{live=false;if(url)URL.revokeObjectURL(url);};},[node.id]);
  useEffect(()=>{if(!prepared)return;const container=document.createElement('div');container.id='kb-print-root';container.innerHTML=prepared.html;document.body.append(container);return()=>container.remove();},[prepared]);
  useEffect(()=>{if(actionReason(state,node,userId,'print')){onNotice('权限已变化，打印预览已关闭');onClose();}},[state]);
  const print=()=>{const current=loadState(),latest=current.nodes.find(n=>n.id===node.id),reason=actionReason(current,latest,current.viewAs,'print');if(reason||latest.updatedAt!==prepared.expected){setError(reason||'内容已更新，请关闭后重新打开打印预览');return;}const frame=document.querySelector('#kb-print-root iframe');try{if(frame)frame.contentWindow.print();else window.print();}catch{setError('浏览器无法启动打印，请重新打开预览');}};
  return <div className="action-backdrop"><section ref={root} className="print-dialog action-dialog" role="dialog" aria-modal="true" aria-label="打印预览"><header><h2>打印预览 · {node.name}</h2><button type="button" aria-label="关闭打印预览" onClick={onClose}><X size={18}/></button></header>{error?<p role="alert">{error}</p>:prepared?<div className="print-preview-canvas" dangerouslySetInnerHTML={{__html:prepared.html}}/>:<p>正在准备预览…</p>}<footer><button type="button" onClick={onClose}>取消</button><button type="button" className="primary" disabled={!prepared||!!error} onClick={print}>打印</button></footer></section></div>;
}
