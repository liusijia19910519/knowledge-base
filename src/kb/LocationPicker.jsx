import { useEffect, useRef, useState } from 'react';
import { Books, Folder, FolderOpen, House, UsersThree, Globe, CaretRight, Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { folderTrail, validateDestination, writableFolders, writableLibraries } from './contentCreation.js';
import { libraryRights } from './access.js';
import { loadState } from './store.js';
import ContentIcon from './ContentIcon.jsx';

export const LOCATION_VIEWS=[['personal','个人知识库',House],['shared','共享知识库',UsersThree],['plaza','知识广场',Globe]];
export function locationLabel(state,spaceId,parentId){
  const library=state.spaces.find(s=>s.id===spaceId);
  return library?[library.name,...folderTrail(state,parentId).map(id=>state.nodes.find(n=>n.id===id)?.name)].filter(Boolean).join(' / '):'';
}
export function useLocationDialog(root,onClose){
  useEffect(()=>{
    const previous=document.activeElement;
    const firstFocus=root.current?.querySelector('[data-name-field],.location-search input:not(:disabled),.location-categories button:not(:disabled)')||root.current?.querySelector('input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled)');firstFocus?.focus();
    root.current?.querySelector('.location-node[aria-pressed="true"]')?.scrollIntoView({block:'nearest'});
    const keys=e=>{
      if(e.target.closest?.('[role="dialog"]')!==root.current)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}
      if(e.key==='Tab'){
        const elements=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]')),first=elements[0],last=elements.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',keys);
    return()=>{document.removeEventListener('keydown',keys);previous?.isConnected&&previous.focus();};
  },[]);
}

// A controlled tree shared by creation, move and copy. Rows change a draft;
// only the caller's final submit commits data.
export function LocationBrowser({state,userId,value,onChange,lockedSpaceId='',lockedView='',blockedIds=[],destinationReason=()=>'',allowedViews=[],emptyLabel='可新建到有新建权限的知识库目录下'}){
  const [expanded,setExpanded]=useState(()=>new Set(value.spaceId?[value.spaceId,...folderTrail(state,value.parentId)]:[]));
  const [query,setQuery]=useState('');
  const view=value.view||lockedView||'',selected=value.spaceId?value:null,blocked=new Set(blockedIds);
  const libraries=view?writableLibraries(state,userId,view).filter(s=>!lockedSpaceId||s.id===lockedSpaceId):[];
  const keyword=query.trim().toLocaleLowerCase();
  const toggle=id=>setExpanded(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next;});
  const choose=(spaceId,parentId='')=>{setExpanded(current=>new Set([...current,spaceId,...folderTrail(state,parentId)]));onChange({spaceId,parentId,view});};
  const trees=libraries.map(space=>{
    const writable=writableFolders(state,space.id,userId),writableIds=new Set(writable.map(n=>n.id)),needed=new Set(writable.flatMap(n=>folderTrail(state,n.id)));
    const folders=state.nodes.filter(n=>n.spaceId===space.id&&needed.has(n.id));
    const libraryMatch=space.name.toLocaleLowerCase().includes(keyword);
    const matches=new Set(keyword&&!libraryMatch?folders.filter(n=>n.name.toLocaleLowerCase().includes(keyword)).flatMap(n=>folderTrail(state,n.id)):folders.map(n=>n.id));
    return {space,folders:folders.filter(n=>matches.has(n.id)),writableIds,rootEditable:libraryRights(state,space,userId).edit,visible:!keyword||libraryMatch||matches.size>0};
  }).filter(tree=>tree.visible);
  const caret=(id,label,open)=><button type="button" className="location-caret" disabled={!!keyword} title={keyword?'搜索结果已展开，清空搜索后可折叠':''} aria-label={`${open?'收起':'展开'}${label}`} aria-expanded={open} onClick={()=>toggle(id)}><CaretRight className={open?'open':''} size={13}/></button>;
  const renderFolder=(tree,node,depth)=>{
    const children=tree.folders.filter(n=>(n.parentId||'')===node.id),open=!!keyword||expanded.has(node.id),writable=tree.writableIds.has(node.id),excluded=blocked.has(node.id),reason=destinationReason(tree.space.id,node.id),active=selected?.spaceId===tree.space.id&&selected.parentId===node.id;
    return <div key={node.id}><div className={`location-tree-row ${active?'selected':''}`} style={{'--depth':depth}}>
      {children.length?caret(node.id,`文件夹 ${node.name}`,open):<span className="location-caret-slot"/>}
      <button type="button" className="location-node" aria-pressed={active} aria-label={`保存到文件夹 ${node.name}`} disabled={!writable||excluded||!!reason} title={reason|| (excluded?'不能选择当前内容自身或其子目录':writable?node.name:'此文件夹仅用于路径导航，没有编辑权限')} onClick={()=>choose(tree.space.id,node.id)}><ContentIcon node={node} size={16}/><span>{node.name}</span>{excluded?<small>不可选</small>:!writable&&<small>仅路径</small>}{active&&<Check size={15}/>}</button>
    </div>{open&&children.map(child=>renderFolder(tree,child,depth+1))}</div>;
  };
  return <>
    <div className="location-picker-top"><div className="location-path" title={selected?locationLabel(state,selected.spaceId,selected.parentId):''}><Books size={17}/><span>{selected?locationLabel(state,selected.spaceId,selected.parentId):emptyLabel}</span></div><label className="location-search"><MagnifyingGlass size={16}/><input aria-label="搜索知识库或文件夹" placeholder="搜索知识库或文件夹" disabled={!view} value={query} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="清空位置搜索" onClick={()=>setQuery('')}><X size={14}/></button>}</label></div>
    <div className="location-picker-columns"><nav className="location-categories" aria-label="知识空间类型">{LOCATION_VIEWS.map(([id,label,Icon])=><button type="button" key={id} className={view===id?'active':''} aria-pressed={view===id} disabled={!!lockedView&&lockedView!==id||!!allowedViews.length&&!allowedViews.includes(id)} title={allowedViews.length&&!allowedViews.includes(id)?'请选择共享知识库或知识广场':lockedView&&lockedView!==id?'当前操作仅可选择当前知识空间':label} onClick={()=>{if(view!==id){onChange({view:id,spaceId:'',parentId:''});setQuery('');}}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="location-tree" aria-label="知识库和文件夹树">{!view?<div className="location-empty"><Books size={28}/><strong>先选择知识空间</strong><span>从左侧选择个人知识库、共享知识库或知识广场。</span></div>:!trees.length?<div className="location-empty"><FolderOpen size={28}/><strong>{keyword?'没有找到匹配的位置':'暂无可编辑的位置'}</strong><span>{keyword?'换个关键词试试，搜索仅包含可用的知识库和文件夹。':'请先创建知识库，或联系管理者获取编辑权限。'}</span></div>:trees.map(tree=>{
        const {space}=tree,reason=destinationReason(tree.space.id,''),children=tree.folders.filter(n=>!n.parentId),open=!!keyword||expanded.has(space.id),active=selected?.spaceId===space.id&&!selected.parentId;
        return <div key={space.id}><div className={`location-tree-row library ${active?'selected':''}`} style={{'--depth':0}}>{children.length?caret(space.id,`知识库 ${space.name}`,open):<span className="location-caret-slot"/>}<button type="button" className="location-node" aria-pressed={active} aria-label={`保存到知识库 ${space.name}`} disabled={!tree.rootEditable||!!reason} title={reason||(tree.rootEditable?`${space.name} / 根目录`:'根目录没有编辑权限，请展开并选择获授权的文件夹')} onClick={()=>choose(space.id)}><span>{space.name}</span><small>{tree.rootEditable?'根目录':'仅路径'}</small>{active&&<Check size={15}/>}</button></div>{open&&children.map(n=>renderFolder(tree,n,1))}</div>;
      })}</div></div>
  </>;
}

export default function LocationPicker({state,userId,value,lockedSpaceId='',lockedView='',blockedIds=[],onConfirm,onClose,title='选择保存位置',description='',confirmText='确认位置',nameValue,onNameChange,disabledReason='',destinationReason=()=>'',allowedViews=[],onPositionChange,selectionMessage,emptyLabel='请选择有编辑权限的目标位置'}){
  const [position,setPosition]=useState(value),[error,setError]=useState(''),root=useRef(null);
  useLocationDialog(root,onClose);
  const sameParent=confirmText==='确认移动'&&position.spaceId===value.spaceId&&(position.parentId||'')===(value.parentId||'');
  const choiceReason=position.spaceId?destinationReason(position.spaceId,position.parentId||''):'';
  const confirm=e=>{
    e.preventDefault();if(!position.spaceId||disabledReason||choiceReason||sameParent)return;
    try{validateDestination(loadState(),{...position,lockedSpaceId,category:lockedView||position.view},userId);onConfirm(position);}
    catch(err){setError(err.message);}
  };
  return <div className="knowledge-product-dialog-backdrop new-create-backdrop location-picker-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><form ref={root} className="location-picker" role="dialog" aria-modal="true" aria-label={title} onSubmit={confirm}>
    <header><div><h2>{title}</h2><p>{description||(lockedSpaceId?'当前知识库已固定，可选择库内有编辑权限的文件夹。':'选择知识空间，再选择知识库或文件夹。')}</p></div><button type="button" className="location-close" aria-label="关闭位置选择" onClick={onClose}><X size={19}/></button></header>
    {onNameChange&&<label className="location-name-field">副本名称<input data-name-field aria-label="副本名称" value={nameValue} maxLength={100} onChange={e=>{onNameChange(e.target.value);setError('');}}/><small>{nameValue.length} / 100</small></label>}
    <LocationBrowser emptyLabel={emptyLabel} state={state} userId={userId} value={position} onChange={next=>{setPosition(next);onPositionChange?.(next);setError('');}} destinationReason={destinationReason} allowedViews={allowedViews} lockedSpaceId={lockedSpaceId} lockedView={lockedView} blockedIds={blockedIds}/>
    {(error||disabledReason||choiceReason)&&<p className="new-create-error" role="alert">{error||disabledReason||choiceReason}</p>}
    <footer><span>{sameParent?'当前位置未改变，请选择其他目录':position.spaceId?(selectionMessage?.(position)||'已选择 1 个保存位置'):'请选择一个保存位置'}</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="location-confirm" disabled={!position.spaceId||sameParent||!!disabledReason||!!choiceReason}>{confirmText}</button></footer>
  </form></div>;
}
