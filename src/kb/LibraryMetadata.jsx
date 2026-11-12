import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Shuffle, UploadSimple, PencilSimple, X, Image as ImageIcon } from '@phosphor-icons/react';
import LibraryIconField, { persistLibraryIcon, readLibraryImage } from './libraryIcons.jsx';
import { COVER_CATEGORIES, LIBRARY_COVERS, coverPreset } from './libraryCovers.js';
import { useLocationDialog } from './LocationPicker.jsx';
import './libraryMetadata.css';

export async function persistLibraryCover(draft){
  try{const result=await persistLibraryIcon(draft||{kind:'preset',key:'original'});return {cover:result.icon,rollback:result.rollback};}
  catch{throw Error('封面保存失败，请重试');}
}
export function LibraryCoverSurface({cover,className='',style={}}){
  const [url,setUrl]=useState('');
  useEffect(()=>{
    let live=true,href='';setUrl('');
    if(cover?.kind!=='image')return;
    (cover.file?Promise.resolve(cover.file):readLibraryImage(cover.blobId)).then(blob=>{
      if(!live||!blob)return;href=URL.createObjectURL(blob);setUrl(href);
    }).catch(()=>{});
    return()=>{live=false;if(href)URL.revokeObjectURL(href);};
  },[cover?.kind,cover?.file,cover?.blobId]);
  const preset=coverPreset(cover);
  return <span aria-hidden="true" className={`library-cover-surface ${className}`} style={{backgroundColor:preset.color,backgroundImage:url?`url("${url}")`:preset.backgroundImage,...style}}/>;
}

function CoverPicker({value,onChange,name,description,disabled=false,onLoadingChange,legacyTone=''}){
  const [category,setCategory]=useState('全部'),[reading,setReading]=useState(false),[error,setError]=useState(''),input=useRef(null),token=useRef(0),live=useRef(true);
  useEffect(()=>{live.current=true;return()=>{live.current=false;token.current++;};},[]);
  const choices=LIBRARY_COVERS.filter(c=>category==='全部'||c.category===category);
  const selectFile=async file=>{
    if(!file||disabled||reading)return;
    if(!/\.(png|jpe?g|gif)$/i.test(file.name)||!file.size||file.size>5*1024*1024){setError('请选择 5MB 以内的 PNG、JPG、JPEG 或 GIF 图片');return;}
    const current=++token.current;setError('');setReading(true);onLoadingChange?.(true);
    const href=URL.createObjectURL(file);
    try{
      await new Promise((resolve,reject)=>{const image=new window.Image();image.onload=resolve;image.onerror=()=>reject(Error('图片无法读取，请重新选择'));image.src=href;});
      if(live.current&&current===token.current)onChange({kind:'image',file});
    }catch(err){if(live.current&&current===token.current)setError(err.message);}
    finally{URL.revokeObjectURL(href);if(live.current&&current===token.current){setReading(false);onLoadingChange?.(false);}}
  };
  return <section className="library-cover-field" aria-label="设置封面" onPaste={e=>{const file=e.clipboardData.files?.[0];if(file&&!disabled){e.preventDefault();selectFile(file);}}}>
    <h3>设置封面</h3>
    <div className="library-cover-picker" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{e.preventDefault();if(!disabled)selectFile(e.dataTransfer.files?.[0]);}}>
      <div className={`library-cover-preview ${value?.key==='original'?legacyTone:''}`} aria-label="知识库封面预览">
        {value?.key!=='original'&&<LibraryCoverSurface cover={value}/>}
        <div><strong>{name.trim()||'知识库名称'}</strong><p>{description.trim()||'添加简介，让大家了解知识库的用途。'}</p></div>
      </div>
      <div className="library-cover-options">
        <div className="library-cover-toolbar"><div className="library-cover-tabs" role="tablist" aria-label="封面分类">{COVER_CATEGORIES.map(label=><button type="button" role="tab" aria-selected={category===label} key={label} disabled={disabled} onClick={()=>setCategory(label)}>{label}</button>)}</div><div className="library-cover-actions">
          <button type="button" disabled={disabled||reading} onClick={()=>{const pool=choices.filter(c=>c.key!==value?.key);if(pool.length){onChange({kind:'preset',key:pool[Math.floor(Math.random()*pool.length)].key});setError('');}}}><Shuffle size={13}/><span>随机封面</span></button>
          <button type="button" disabled={disabled||reading} onClick={()=>input.current?.click()}><UploadSimple size={14}/><span>{reading?'读取中…':'上传'}</span></button>
        </div></div>
        <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/gif" aria-label="上传知识库封面" onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}}/>
        <div className="library-cover-grid" data-category={category} role="group" aria-label="可选封面">{choices.map(preset=><button type="button" className={`library-cover-option ${value?.kind!=='image'&&value?.key===preset.key?'selected':''}`} key={preset.key} disabled={disabled||reading} aria-label={`使用封面 ${preset.label}`} aria-pressed={value?.kind!=='image'&&value?.key===preset.key} title={preset.label} onClick={()=>{onChange({kind:'preset',key:preset.key});setError('');}}><LibraryCoverSurface cover={{kind:'preset',key:preset.key}}/>{value?.kind!=='image'&&value?.key===preset.key&&<Check size={12} weight="bold"/>}</button>)}</div>
        <div className="library-cover-upload-note">{value?.kind==='image'?<><ImageIcon size={12}/><span>{value.file?.name||'已上传自定义封面'}</span></>:<span>支持上传 PNG、JPG、JPEG、GIF，最大 5MB；也可拖入图片</span>}</div>
      </div>
    </div>
    {error&&<p className="access-error" role="alert">{error}</p>}
  </section>;
}

function CoverDialog({value,onConfirm,onClose,name,description,legacyTone,onLoadingChange}){
  const [draft,setDraft]=useState(value),[reading,setReading]=useState(false),root=useRef(null);
  useLocationDialog(root,onClose);
  return createPortal(<div className="subject-picker-backdrop library-cover-dialog-backdrop" onMouseDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}><section ref={root} className="knowledge-product-dialog access-dialog library-cover-dialog" role="dialog" aria-modal="true" aria-label="设置知识库封面" onKeyDownCapture={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}>
    <header><h2>设置封面</h2><button type="button" className="access-close" aria-label="关闭封面设置" onClick={onClose}><X size={18}/></button></header>
    <div className="library-details-fields"><CoverPicker value={draft} onChange={setDraft} name={name} description={description} legacyTone={legacyTone} onLoadingChange={value=>{setReading(value);onLoadingChange?.(value);}}/></div>
    <footer><button type="button" onClick={onClose}>取消</button><button type="button" className="library-cover-confirm" disabled={reading} onClick={()=>{onConfirm(draft);onClose();}}>使用封面</button></footer>
  </section></div>,document.body);
}

export default function LibraryMetadata({name,setName,description,setDescription,icon,setIcon,cover,setCover,disabled=false,onLoadingChange,onEdit,legacyTone=''}){
  const nameId=useId(),descriptionId=useId(),[coverOpen,setCoverOpen]=useState(false);
  const closeCover=()=>{setCoverOpen(false);onLoadingChange?.(false);};
  return <div className="library-details-fields library-metadata-overview">
    <div className="library-cover-summary"><span className="library-field-label">封面</span><button type="button" className={`library-cover-summary-button ${cover?.key==='original'?legacyTone:''}`} disabled={disabled} aria-label="设置知识库封面" title="点击更换封面" onClick={()=>setCoverOpen(true)}>{cover?.key!=='original'&&<LibraryCoverSurface cover={cover}/>}<span className="library-cover-summary-text"><strong>{name.trim()||'知识库名称'}</strong><span>{description.trim()||'添加简介，让大家了解知识库的用途。'}</span></span><span className="library-cover-edit"><PencilSimple size={13}/>更换封面</span></button></div>
    <div className="library-metadata-text-fields">
      <div className="library-name-field"><label htmlFor={nameId}>名称</label><div className="library-name-control"><LibraryIconField compact value={icon} onChange={setIcon} disabled={disabled}/><span className="library-name-divider"/><input id={nameId} data-name-field aria-label="知识库名称" aria-describedby={`${nameId}-count`} maxLength={40} disabled={disabled} value={name} placeholder="请输入知识库名称" onChange={e=>{setName(e.target.value);onEdit?.();}}/><small className="library-field-count" id={`${nameId}-count`}>{name.length} / 40</small></div></div>
      <div className="library-description-field"><label htmlFor={descriptionId}>简介</label><div className="library-description-control"><textarea id={descriptionId} aria-label="知识库简介" aria-describedby={`${descriptionId}-count`} maxLength={300} disabled={disabled} value={description} placeholder="介绍这个知识库的用途" onChange={e=>{setDescription(e.target.value);onEdit?.();}}/><small className="library-field-count" id={`${descriptionId}-count`}>{description.length} / 300</small></div></div>
    </div>
    {coverOpen&&<CoverDialog value={cover} onConfirm={setCover} onClose={closeCover} name={name} description={description} legacyTone={legacyTone} onLoadingChange={onLoadingChange}/>}
  </div>;
}
