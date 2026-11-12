import { useEffect, useRef, useState } from 'react';
import { BookBookmark, PushPin, Gear, MagnifyingGlass, CaretRight, FolderOpen, Briefcase, Lightbulb, Archive, ShareNetwork, UserCircle, Sparkle, UploadSimple, DotsThree } from '@phosphor-icons/react';
import { CreateMenu, ContentIcon } from './CreationFlow.jsx';
import { ScopeBadge } from './AccessDialog.jsx';
import { contentLabel, contentText, writableLibraries } from './contentCreation.js';
import { VIEW_LABELS, activeNode, actualNodes, effectiveAccess, libraryRights, librariesForView, libraryStats, projectedEntries, validView, safeFolderTrail, deleteContent, libraryType, LIBRARY_TYPES } from './access.js';
import { can, memberName, nodeRole, spaceRole } from './store.js';
import InlineFolder from './InlineFolder.jsx';
import { LibraryIcon } from './libraryIcons.jsx';
import { LibraryCoverSurface } from './LibraryMetadata.jsx';
import { pinnedRecords, togglePin, visitContent } from './personalization.js';
import FileMenu from './FileMenu.jsx';
import { NameForm } from './ActionDialogs.jsx';
import { navigateFolder } from './folderNavigation.js';
import { batchPreflight } from './fileActions.js';
const go=path=>{window.location.hash=path;};
const url=(id,view,folder='')=>`/space/${id}?view=${view}${folder?`&folder=${folder}`:''}`;
const times=value=>value?new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const tones=['','ice','night','amber'],icons=[FolderOpen,Briefcase,Lightbulb,Archive];
const titles={personal:'个人知识库',shared:'共享知识库',plaza:'知识广场'};
const Empty=({title,body,action})=><div className="knowledge-empty"><MagnifyingGlass size={28}/><strong>{title}</strong><span>{body}</span>{action&&<div className="new-create-empty">{action}</div>}</div>;

function LibraryCard({state,userId,space,section,update,openSettings,say}){
  const hasCover=!!space.cover&&space.cover.key!=='original',index=state.spaces.findIndex(s=>s.id===space.id),pinned=pinnedRecords(state,userId).some(p=>p.spaceId===space.id),canManage=libraryRights(state,space,userId).manage;
  const toggle=()=>{try{update(s=>togglePin(s,userId,space.id,section));say(pinned?'已取消置顶':'已添加到左侧置顶知识库');}catch(e){say(e.message);}};
  return <article className={`knowledge-card library-wide-card ${tones[index%tones.length]} ${hasCover?'has-library-cover':''}`}>{hasCover&&<LibraryCoverSurface cover={space.cover}/>}<button className={`knowledge-card-pin ${pinned?'is-pinned':''}`} type="button" aria-label={`${pinned?'取消置顶':'置顶'} ${space.name}`} aria-pressed={pinned} onClick={toggle}><PushPin size={16} weight={pinned?'fill':'regular'}/></button><button type="button" className="knowledge-card-main" aria-label={`打开知识库 ${space.name}`} onClick={()=>go(url(space.id,section))}><div><LibraryIcon library={space} size={26}/><strong title={space.name}>{space.name}</strong></div><p title={space.description||''}>{space.description||'暂无简介'}</p></button><button type="button" className="knowledge-card-settings" aria-label={`知识库设置 ${space.name}`} disabled={!canManage} title={canManage?'知识库设置':'需要管理权限'} onClick={()=>openSettings(space)}><Gear size={16}/><span>知识库设置</span></button></article>;
}

export function LibraryPage({state,userId,section,query,setQuery,startCreate,startUpload,onCreateLibrary,update,openSettings,say}){
  const [scope,setScope]=useState('all');
  const hint=section==='shared'?'按授权访问协作资料，授权全公司也仍属于共享知识库':section==='plaza'?'公司全员始终可查看，编辑与管理权限另行配置':'仅自己可见、管理的资料，协作前请移动到共享知识库或知识广场';
  const visible=librariesForView(state,userId,section).filter(s=>!(section==='shared'&&scope==='created'&&s.ownerId!==userId)&&!(section==='shared'&&scope==='joined'&&s.ownerId===userId)&&`${s.name}${s.description||''}`.includes(query.trim()));
  const editable=writableLibraries(state,userId,section).length>0;
  const cardProps={state,userId,section,update,openSettings,say};

  return <><header className="knowledge-header"><div><h1>{titles[section]}</h1><p>{hint}</p></div></header><div className="knowledge-actions with-upload"><CreateMenu variant="library" disabled={!editable} reason="当前没有可编辑的位置，请先创建知识库或获得编辑权限" onChoose={format=>startCreate(format,{category:section})}/><button type="button" disabled={!editable} title={!editable?'没有可编辑的位置':undefined} onClick={()=>startUpload()}><span><UploadSimple size={22}/></span><div><strong>上传文件</strong><small>选择保存位置并上传</small></div><CaretRight size={17}/></button><button type="button" onClick={onCreateLibrary}><span><BookBookmark size={22} weight="fill"/></span><div><strong>新建知识库</strong><small>设置类型与协作权限</small></div><CaretRight size={17}/></button></div>

    <section className="all-library-section" aria-label="全部知识库"><div className="knowledge-section-heading"><div className="knowledge-heading-main"><h2>全部知识库</h2>{section==='shared'&&<div className="knowledge-scope-tabs" role="tablist">{[['all','全部'],['created','我共享的'],['joined','与我共享']].map(([value,label])=><button className={scope===value?'active':''} type="button" key={value} onClick={()=>setScope(value)}>{label}</button>)}</div>}</div><label className="knowledge-inline-search"><MagnifyingGlass size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索知识库"/></label></div>
      <div className="knowledge-grid library-wide-grid">{visible.map(space=><LibraryCard key={space.id} {...cardProps} space={space}/>)}</div>
      {!visible.length&&<Empty title={query.trim()?'没有找到相关知识库':section==='shared'?'暂无共享知识库':section==='plaza'?'暂无全员可见内容':'还没有自己的知识库'} body={query.trim()?'换一个关键词试试。':section==='shared'?'创建共享知识库，或请协作者授权公司、部门或人员。':section==='plaza'?'创建广场知识库，或将内容移动到有编辑权限的广场目录。':'新建一个知识库，开始积累自己的资料。'}/>}</section></>;
}

export function SpaceDetail({state,userId,space,folderPath:requestedPath,detailAiOpen,setDetailAiOpen,openAccess,openShare,openSettings,onAction,onBatch,locateId,origin,startCreate,startUpload,folderDraft,onCloseFolder,onFolderCreated,openDoc,say,update}){
  const [search,setSearch]=useState(''),[selected,setSelected]=useState([]),[renameId,setRenameId]=useState(''),allBox=useRef(null);
  const role=spaceRole(state,space,userId),view=validView(state,space,userId,origin);
  const known=space&&!space.deletedAt&&librariesForView(state,userId,view).some(s=>s.id===space.id);
  const folderPath=known?safeFolderTrail(state,space.id,userId,view,requestedPath.at(-1)):[];
  const folderId=folderPath.at(-1)||'',projected=known?projectedEntries(state,space,userId,view,folderId):[];
  const entries=projected.filter(n=>!search.trim()||n.name.includes(search.trim())||!n.pathOnly&&nodeRole(state,n,userId).view&&contentText(n).includes(search.trim()));
  const selectable=entries.filter(n=>!n.pathOnly&&nodeRole(state,n,userId).view).map(n=>n.id),availableKey=selectable.join('|');
  const picked=selected.filter(id=>selectable.includes(id)),all=selectable.length>0&&picked.length===selectable.length;
  useEffect(()=>{setSearch('');setSelected([]);setRenameId('');},[space?.id,origin,folderId,userId]);
  useEffect(()=>{setSelected([]);setRenameId('');},[search]);
  useEffect(()=>{setSelected(ids=>ids.filter(id=>selectable.includes(id)));},[availableKey]);
  useEffect(()=>{if(allBox.current)allBox.current.indeterminate=picked.length>0&&!all;},[all,picked.length]);
  useEffect(()=>{if(folderDraft)setSearch('');},[folderDraft?.token]);
  useEffect(()=>{if(!locateId)return;const row=document.getElementById(`content-${locateId}`);row?.scrollIntoView({block:'center'});row?.focus();},[locateId,space?.id,folderId,availableKey]);
  if(!known)return <><button className="kb-text-button" onClick={()=>go(`/${view}`)}>返回{titles[view]}</button><Empty title="当前范围没有可访问内容" body="内容的可见范围可能已调整，或你已没有访问权限。"/></>;
  const folder=state.nodes.find(n=>n.id===folderId),folderIsPath=folderId&&!actualNodes(state,space,userId,view).some(n=>n.id===folderId);
  const canCreateHere=!folderIsPath&&(folder?nodeRole(state,folder,userId).edit:role.edit);
  const changeFolder=ids=>{try{let trail;update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化，请重新操作');const result=navigateFolder(current,space.id,userId,view,ids.at(-1)||'');trail=result.trail;return result.state;});onCloseFolder();setSelected([]);setRenameId('');go(url(space.id,view,trail.at(-1)));}catch(error){say(error.message);}};
  const index=Math.max(0,state.spaces.findIndex(s=>s.id===space.id)),Icon=icons[index%icons.length],tone=tones[index%tones.length]||'ocean';
  const toggle=id=>setSelected(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);
  const batchReason=action=>{try{batchPreflight(state,{ids:picked,spaceId:space.id,action},userId);return '';}catch(e){return e.message;}};
  const rowAction=(action,node)=>{if(action==='rename')setRenameId(node.id);else onAction(action,node);};
  return <div className={`knowledge-library-detail ${tone}`}><header className="knowledge-detail-toolbar"><button type="button" onClick={()=>go(`/${view}`)}><CaretRight size={17}/><span>{titles[view]}</span></button><div><label className="kb-inline-identity">身份<select aria-label="当前身份" value={userId} onChange={e=>update(s=>({...s,viewAs:e.target.value}))}>{state.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>{libraryType(space)!=='personal'&&<button type="button" disabled={!role.manage} title={!role.manage?'需要管理权限':undefined} onClick={()=>openShare(space,'space')}><ShareNetwork size={17}/>分享</button>}<button type="button" disabled={!role.manage} title={!role.manage?'需要管理权限':undefined} onClick={()=>openSettings(space)}><Gear size={17}/>设置</button></div></header>
    <section className="knowledge-detail-hero"><span className="knowledge-detail-icon"><LibraryIcon library={space} size={54}/></span><div><h1>{space.name}</h1><p>{space.description}</p><small><UserCircle size={16}/>{memberName(state,space.ownerId)} · {actualNodes(state,space,userId,view).length} 项可访问内容</small><p className="access-view-note">{LIBRARY_TYPES[libraryType(space)]} · 当前展示：{VIEW_LABELS[view]}</p></div>{!detailAiOpen&&<button type="button" onClick={()=>setDetailAiOpen(true)}><Sparkle size={18} weight="fill"/>问AI</button>}</section>
    <div className="knowledge-detail-list-toolbar"><nav className="knowledge-detail-breadcrumb" aria-label="文件夹路径"><button className={!folderPath.length?'current':''} type="button" onClick={()=>changeFolder([])}>全部</button>{folderPath.map((id,i)=><span key={id}><CaretRight size={16}/><button className={i===folderPath.length-1?'current':''} type="button" onClick={()=>changeFolder(folderPath.slice(0,i+1))}>{state.nodes.find(n=>n.id===id)?.name}</button></span>)}</nav><div><label><MagnifyingGlass size={16}/><input aria-label="搜索当前目录" value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索当前文件夹"/></label>{canCreateHere&&<button type="button" onClick={()=>startUpload({parentId:folderId})}><UploadSimple size={16}/>上传</button>}<CreateMenu disabled={!canCreateHere} reason={folderIsPath?'此目录仅用于路径导航':'需要当前位置的编辑权限'} onChoose={format=>startCreate(format,{view,lockedSpaceId:space.id,spaceId:space.id,parentId:folderId})}/></div></div>
    {picked.length>0&&<div className="batch-toolbar" role="toolbar" aria-label="批量操作"><span>已选择 {picked.length} 项</span>{[['move','移动'],['copy','复制'],['delete','删除'],['download','下载']].map(([action,label])=>{const reason=batchReason(action);return <button key={action} type="button" disabled={!!reason} title={reason||`批量${label}`} onClick={()=>onBatch(action,picked,space.id,()=>setSelected([]))}>{label}</button>;})}<button type="button" onClick={()=>setSelected([])}>取消选择</button></div>}
    {folderDraft?.spaceId===space.id&&folderDraft.parentId===folderId&&<InlineFolder key={folderDraft.token} state={state} userId={userId} context={folderDraft} update={update} onClose={onCloseFolder} onCreated={onFolderCreated}/>}
    <div className="knowledge-detail-table selectable">
      <div className="knowledge-detail-row head"><label className="row-checkbox"><input ref={allBox} type="checkbox" aria-label="全选当前筛选结果" checked={all} disabled={!selectable.length} onChange={()=>setSelected(all?[]:selectable)}/></label><span>名称</span><span>所有者</span><span>修改时间</span><span>类型</span><span aria-hidden="true"/></div>
      {entries.map(node=>{
        const open=()=>node.type==='folder'?changeFolder([...folderPath,node.id]):openDoc(node.id);
        return <div id={`content-${node.id}`} className={`knowledge-detail-row ${node.pathOnly?'path-only':''} ${picked.includes(node.id)?'is-selected':''} ${locateId===node.id?'located-row':''} ${node.type==='folder'?'folder':'file'}`} role="button" tabIndex={0} key={node.id} onClick={open} onKeyDown={e=>{if(e.target===e.currentTarget&&e.key==='Enter')open();if(e.target===e.currentTarget&&e.key===' '&&!node.pathOnly){e.preventDefault();toggle(node.id);}}}>
          <label className="row-checkbox" onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={`选择 ${node.name}`} disabled={!!node.pathOnly||!nodeRole(state,node,userId).view} title={node.pathOnly?'路径导航文件夹不可选择':!nodeRole(state,node,userId).view?'需要查看权限':undefined} checked={picked.includes(node.id)} onChange={()=>toggle(node.id)}/></label>
          <div className="row-main-name"><ContentIcon node={node} size={18}/>{renameId===node.id?<NameForm key={node.id} node={node} userId={userId} update={update} inline onClose={saved=>{setRenameId('');if(saved)say('名称已保存');}}/>:<><span title={node.name}>{node.name}</span>{node.pathOnly?<small className="access-path-note">路径导航</small>:<ScopeBadge access={effectiveAccess(state,node)}/>}</>}</div><span>{memberName(state,node.ownerId)}</span><span>{times(node.updatedAt)}</span><span className="file-type-label" title={contentLabel(node)}>{contentLabel(node)}</span>
          {!node.pathOnly&&<FileMenu state={state} node={node} userId={userId} showShare onShare={openShare} onAction={rowAction}/>}
        </div>;
      })}
    </div>
    {!entries.length&&!folderDraft&&<Empty title={search.trim()?'没有找到相关内容':'这个目录是空的'} body={search.trim()?'请调整关键词，搜索仅覆盖当前入口可访问的内容。':'新建内容，开始整理当前目录。'} action={!search.trim()&&canCreateHere?<CreateMenu onChoose={format=>startCreate(format,{view,lockedSpaceId:space.id,spaceId:space.id,parentId:folderId})}/>:null}/>}</div>;
}
