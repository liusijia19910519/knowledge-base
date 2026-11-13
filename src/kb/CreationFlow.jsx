import { useEffect, useRef, useState } from 'react';
import { Plus, CaretDown, X } from '@phosphor-icons/react';
import ContentIcon from './ContentIcon.jsx';
export { default as ContentIcon } from './ContentIcon.jsx';
import { CONTENT_TYPES, createContent, validateCreation, writableLibraries } from './contentCreation.js';
import { loadState } from './store.js';
import { contentView } from './access.js';
import { LocationBrowser, useLocationDialog } from './LocationPicker.jsx';
import './creation.css';
import useHoverMenu from './useHoverMenu.js';

export function CreateMenu({variant='compact',onChoose,disabled=false,reason=''}) {
  const {open,root,trigger,close,rootProps,triggerProps}=useHoverMenu(disabled);
  return <div ref={root} {...rootProps} className={`new-create-menu ${variant==='library'?'knowledge-action-menu':''} variant-${variant}`}><button ref={trigger} type="button" className="new-create-trigger" aria-label={variant==='compact'?'新建':'新建内容'} aria-haspopup="menu" aria-expanded={open} disabled={disabled} title={disabled?reason:undefined} {...triggerProps}>{variant==='compact'?<><Plus size={16}/>新建<CaretDown size={14}/></>:<><span className="kb-shortcut-icon" aria-hidden="true"><Plus size={22}/></span><span><strong>新建内容</strong></span><CaretDown size={16}/></>}</button>{open&&<div className="new-create-options" role="menu" aria-label="选择新建类型">{CONTENT_TYPES.map(([format,label])=>{return <button type="button" role="menuitem" key={format} onClick={()=>{close(true);onChoose(format);}}><ContentIcon aria-hidden="true" node={{type:format==='folder'?'folder':'doc',format}} size={16}/><span>{label}</span></button>;})}</div>}</div>;
}

export function launchDocument(update,fields,userId){
  validateCreation(loadState(),fields,userId);const editor=window.open('about:blank','_blank');if(editor)editor.opener=null;
  try{let result;update(latest=>{result=createContent(latest,{...fields,creationDraft:true},userId);return result.state;});const node=result.node,view=contentView(result.state,node,userId,fields.view),url=`${window.location.href.split('#')[0]}#/doc/${node.id}?edit=1&view=${view}${node.parentId?`&folder=${node.parentId}`:''}`;if(editor)editor.location.replace(url);return {node,url,opened:!!editor};}catch(error){editor?.close();throw error;}
}
export default function CreationDialog({state,userId,context,update,onClose,onCreated,onFolderLocation}) {
  const [position,setPosition]=useState({spaceId:context.spaceId||'',parentId:context.parentId||'',view:context.view||context.category||''});
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState(null);
  const root=useRef(null),submitLock=useRef(false);
  const label=CONTENT_TYPES.find(([id])=>id===context.format)?.[1],libraries=writableLibraries(state,userId,context.category);
  const fields={format:context.format,...position,lockedSpaceId:context.lockedSpaceId||'',category:context.category||''},targetView=position.view;
  let destinationError='';try{validateCreation(state,fields,userId);}catch(err){destinationError=err.message;}
  const editorUrl=node=>`${window.location.href.split('#')[0]}#/doc/${node.id}?edit=1&view=${contentView(state,node,userId,targetView)}${node.parentId?`&folder=${node.parentId}`:''}`;
  useLocationDialog(root,()=>{if(!submitLock.current)onClose();});
  const submit=e=>{
    e.preventDefault();if(submitLock.current||recovery)return;
    try {
      validateCreation(loadState(),fields,userId);
      submitLock.current=true;setBusy(true);setError('');
      if(context.format==='folder'){onFolderLocation(position);onClose();return;}
      const result=launchDocument(update,fields,userId);onCreated(result.node,{view:targetView});if(result.opened)onClose();else setRecovery(result.node);
    } catch(err){setError(err.message||'创建失败，请重试');}
    finally {submitLock.current=false;setBusy(false);}
  };
  return <div className="knowledge-product-dialog-backdrop new-create-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <form ref={root} className="location-picker creation-with-tree" role="dialog" aria-modal="true" aria-label={`新建${label}`} onSubmit={submit}>
      <header><h2>新建{label}</h2><button type="button" className="location-close" aria-label="关闭新建弹窗" onClick={onClose} disabled={busy}><X size={19}/></button></header>
      {recovery||context.recoveryNode?<><p role="status">「{(recovery||context.recoveryNode).name}」已创建。浏览器未打开编辑页，可从下方继续，内容不会重复创建。</p><a className="new-editor-link" href={editorUrl(recovery||context.recoveryNode)} target="_blank" rel="noopener noreferrer">打开编辑页面</a><footer><button type="button" onClick={onClose}>完成</button></footer></>:<>
        <LocationBrowser state={state} userId={userId} value={position} onChange={next=>{setPosition(next);setError('');}} lockedSpaceId={context.lockedSpaceId||''} lockedView={context.category||(context.lockedSpaceId?context.view:'')||''}/>
        {!libraries.length&&<p className="new-create-error" role="alert">当前没有可编辑的知识库，请先创建知识库或获得编辑权限。</p>}{error&&<p className="new-create-error" role="alert">{error}</p>}
        <footer><span>{position.spaceId?(destinationError||'已选择 1 个保存位置'):'请选择一个保存位置'}</span><button type="button" onClick={onClose} disabled={busy}>取消</button><button type="submit" className="location-confirm" disabled={busy||!!destinationError} title={destinationError||undefined}>{busy?'正在创建…':context.format==='folder'?'下一步：命名文件夹':'创建并打开'}</button></footer>
      </>}
    </form>
  </div>;
}
