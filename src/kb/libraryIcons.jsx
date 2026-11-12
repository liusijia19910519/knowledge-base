import { IMAGE_DATABASE } from './prototypeData.js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, PaperPlaneTilt, FileText, NotePencil, ChatsCircle, Robot, Smiley, HandWaving, IdentificationCard, TrendUp, Code, Presentation, Trophy, ThumbsUp, ChartBar, Bell, PencilSimple, Shuffle, X, Image as ImageIcon } from '@phosphor-icons/react';
import { useLocationDialog } from './LocationPicker.jsx';

export const LIBRARY_ICONS=[['book',BookOpen,'#deebff'],['plane',PaperPlaneTilt,'#d9f2e4'],['manual',FileText,'#e1eaff'],['notes',NotePencil,'#d6efdf'],['chat',ChatsCircle,'#e1eaff'],['robot',Robot,'#e9dfff'],['smile',Smiley,'#fff0c8'],['wave',HandWaving,'#fff0c8'],['people',IdentificationCard,'#e9dfff'],['trend',TrendUp,'#fff0c8'],['code',Code,'#e9dfff'],['slides',Presentation,'#deebff'],['trophy',Trophy,'#fff0c8'],['thumbs',ThumbsUp,'#fff0c8']];
let opening;
function iconDB(){if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open(IMAGE_DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opening=null;reject(Error('图标存储不可用，请重试'));};});return opening;}
async function transaction(mode,action){const db=await iconDB();return new Promise((resolve,reject)=>{const tx=db.transaction('images',mode),request=action(tx.objectStore('images'));let value;request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=()=>reject(Error('图标保存失败，请重试'));tx.onabort=()=>reject(Error('图标操作已中断'));});}
export async function persistLibraryIcon(draft){
  if(draft?.kind!=='image'||!draft.file)return {icon:draft||{kind:'preset',key:'book'},rollback:async()=>{}};
  const blobId=crypto.randomUUID();await transaction('readwrite',store=>store.put(draft.file,blobId));
  return {icon:{kind:'image',blobId},rollback:()=>transaction('readwrite',store=>store.delete(blobId))};
}
export function readLibraryImage(blobId){return transaction('readonly',store=>store.get(blobId));}
export function LibraryIcon({library,icon=library?.icon,size=28}){
  const [url,setUrl]=useState('');
  useEffect(()=>{let live=true,href='';setUrl('');if(icon?.kind!=='image')return;
    const read=icon.file?Promise.resolve(icon.file):transaction('readonly',store=>store.get(icon.blobId));
    read.then(blob=>{if(!blob||!live)return;href=URL.createObjectURL(blob);setUrl(href);}).catch(()=>{});return()=>{live=false;if(href)URL.revokeObjectURL(href);};
  },[icon?.kind,icon?.blobId,icon?.file]);
  const [,Icon,color]=LIBRARY_ICONS.find(([key])=>key===icon?.key)||LIBRARY_ICONS[0];
  return <span className="library-icon-visual" style={{width:size,height:size,background:color}}>{url?<img src={url} alt="" onError={()=>setUrl('')}/>:<Icon size={Math.round(size*.58)} weight="duotone"/>}</span>;
}
export default function LibraryIconField({value,onChange,disabled=false,compact=false}){
  const [open,setOpen]=useState(false);
  return <div className={`library-icon-field ${compact?'compact':''}`}><button type="button" aria-label="选择知识库图标" title="更换知识库图标" disabled={disabled} onClick={()=>setOpen(true)}><LibraryIcon icon={value} size={compact?28:64}/>{!compact&&<span><PencilSimple size={12}/></span>}</button>{open&&<IconPicker value={value} onChange={onChange} onClose={()=>setOpen(false)}/>}</div>;
}
function IconPicker({value,onChange,onClose}){
  const [tab,setTab]=useState('preset'),[error,setError]=useState(''),[reading,setReading]=useState(false),root=useRef(null),input=useRef(null),run=useRef(0),live=useRef(true);useLocationDialog(root,onClose);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const selectFile=async file=>{
    if(!file)return;const token=++run.current;setError('');setReading(false);
    if(!/\.(png|jpe?g|gif)$/i.test(file.name)||file.size>5*1024*1024){setError('请选择 5MB 以内的 PNG、JPG、JPEG 或 GIF 图片');return;}
    setReading(true);const href=URL.createObjectURL(file);
    try{await new Promise((resolve,reject)=>{const picture=new window.Image();picture.onload=resolve;picture.onerror=()=>reject(Error('图片无法读取，请更换文件'));picture.src=href;});if(live.current&&run.current===token){onChange({kind:'image',file});onClose();}}
    catch(e){if(live.current&&run.current===token)setError(e.message);}finally{URL.revokeObjectURL(href);if(live.current&&run.current===token)setReading(false);}
  };
  return createPortal(<div className="subject-picker-backdrop icon-picker-backdrop" onMouseDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}><section ref={root} className="icon-picker" role="dialog" aria-modal="true" aria-label="知识库图标" onPaste={e=>{const file=[...e.clipboardData.files][0];if(file){e.preventDefault();selectFile(file);}}} onKeyDownCapture={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}><header><div role="tablist" aria-label="图标来源"><button type="button" role="tab" aria-selected={tab==='preset'} onClick={()=>setTab('preset')}>知识库图标</button><button type="button" role="tab" aria-selected={tab==='upload'} onClick={()=>setTab('upload')}>本地上传</button></div><button type="button" aria-label="关闭图标选择" onClick={onClose}><X size={17}/></button></header>{tab==='preset'?<><button type="button" className="random-library-icon" onClick={()=>{const choices=LIBRARY_ICONS.filter(([key])=>key!==value?.key);onChange({kind:'preset',key:choices[Math.floor(Math.random()*choices.length)][0]});onClose();}}><Shuffle size={14}/>随机</button><div className="preset-icon-grid">{LIBRARY_ICONS.map(([key],index)=><button type="button" key={key} aria-label={`使用知识库图标 ${index+1}`} aria-pressed={value?.kind!=='image'&&(value?.key||'book')===key} onClick={()=>{onChange({kind:'preset',key});onClose();}}><LibraryIcon icon={{kind:'preset',key}} size={54}/></button>)}</div></>:<><input hidden ref={input} type="file" accept="image/png,image/jpeg,image/gif" aria-label="上传知识库图标" onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}}/><button type="button" className="library-icon-drop" disabled={reading} onClick={()=>input.current.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();selectFile(e.dataTransfer.files?.[0]);}}><ImageIcon size={30}/><span>{reading?'正在读取图片…':'点击或粘贴/拖拽图片到此处上传'}</span><small>支持 PNG、JPG、JPEG、GIF，最大 5MB</small></button><p>建议图片不小于 100 × 100px</p></>}{error&&<p className="access-error" role="alert">{error}</p>}</section></div>,document.body);
}
