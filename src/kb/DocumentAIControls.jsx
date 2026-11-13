import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Books, CaretDown, CaretRight, Check, FileText, Folder, FolderOpen, MagnifyingGlass, Sparkle, UserCircle, X } from '@phosphor-icons/react';
import { AI_SKILLS, AI_EXPERTS } from './aiCatalog.js';
import { actualNodes, contentRights, contentTree, librariesForView, projectedEntries, libraryType } from './access.js';
import { loadState } from './store.js';
import { folderTrail } from './contentCreation.js';
import { useLocationDialog } from './LocationPicker.jsx';
import { LibraryIcon } from './libraryIcons.jsx';
import { ContentIcon } from './CreationFlow.jsx';

function usePopover(open,onClose,kind){
  const root=useRef(null),menu=useRef(null),trigger=useRef(null),[position,setPosition]=useState({opacity:0}),[compact,setCompact]=useState(true);
  useEffect(()=>{
    if(!open)return;
    const place=()=>{
      const box=trigger.current?.getBoundingClientRect();if(!box)return;
      const narrow=(root.current.closest('.composer')?.clientWidth||400)<=540;setCompact(narrow);
      const width=Math.min(innerWidth-24,kind==='capability'?(narrow?332:470):292),above=box.top-20,below=innerHeight-box.bottom-20;
      const upward=above>=250||above>below,maxHeight=Math.max(90,Math.min(kind==='capability'?450:310,upward?above:below));
      setPosition({left:Math.max(12,Math.min(innerWidth-width-12,box.left)),width,maxHeight,...(upward?{bottom:innerHeight-box.top+8,top:'auto'}:{top:box.bottom+8,bottom:'auto'})});
    };
    const outside=e=>{if(!root.current?.contains(e.target)&&!menu.current?.contains(e.target))onClose();};
    const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();trigger.current?.focus();}};
    const scroll=e=>{if(!menu.current?.contains(e.target))onClose();};
    place();window.addEventListener('resize',place);window.addEventListener('scroll',scroll,true);document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',escape,true);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',scroll,true);document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape,true);};
  },[open]);
  return {root,menu,trigger,position,compact};
}

export function DocumentCapabilityPicker({expert,onExpertChange,onSkillSelect}){
  const [open,setOpen]=useState(false),[category,setCategory]=useState('专家'),[query,setQuery]=useState(''),search=useRef(null);
  const popup=usePopover(open,()=>setOpen(false),'capability'),catalog=category==='专家'?AI_EXPERTS:AI_SKILLS;
  const options=catalog.filter(([name,description])=>`${name}${description}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(()=>{if(open)requestAnimationFrame(()=>search.current?.focus({preventScroll:true}));},[open,category]);
  const choose=name=>{if(category==='专家')onExpertChange(expert===name?'':name);else onSkillSelect(name);setOpen(false);};
  const changeCategory=label=>{if(category!==label){setCategory(label);setQuery('');}};
  return <div ref={popup.root} className="capability-picker doc-capability-picker"><div className={`capability-trigger-shell ${expert?'has-selection':''}`}>
    <button ref={popup.trigger} type="button" className={`capability-trigger ${open||expert?'active':''}`} aria-label={expert?`专家：${expert}`:'调用技能或专家'} title={expert||'技能 / 专家'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(!open)}>{expert?<UserCircle size={18}/>:<Sparkle size={18}/>}<span>{expert||'技能 / 专家'}</span>{!expert&&<CaretDown className="capability-caret" size={12}/>}</button>
    {expert&&<button type="button" className="capability-clear" aria-label="移除已选专家" onClick={()=>{onExpertChange('');setOpen(false);}}><X size={11}/></button>}
  </div>{open&&createPortal(<div ref={popup.menu} className={`doc-ai-flyout ${popup.compact?'is-compact':''}`} style={popup.position} role="dialog" aria-label="调用技能或专家">
    <nav className="doc-capability-categories" aria-label="能力分类">{['专家','技能'].map(label=><button type="button" className={category===label?'active':''} key={label} onPointerEnter={()=>changeCategory(label)} onClick={()=>changeCategory(label)}>{label==='专家'?<UserCircle size={17}/>:<Sparkle size={17}/>}<span>{label}</span><CaretRight size={13}/></button>)}</nav>
    <div className="doc-capability-options"><label className="doc-capability-search"><MagnifyingGlass size={15}/><input ref={search} aria-label={`搜索${category}`} placeholder={`搜索${category}`} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&options.length){e.preventDefault();choose(options[0][0]);}}}/></label>
      <div className="doc-capability-list">{options.map(([name,description])=><button type="button" className={category==='专家'&&expert===name?'selected':''} key={name} onClick={()=>choose(name)}><span className="doc-capability-icon">{category==='专家'?<UserCircle size={18}/>:<Sparkle size={18}/>}</span><span><strong>{name}</strong><small>{description}</small></span>{category==='专家'&&expert===name&&<Check size={15}/>}</button>)}{!options.length&&<p className="doc-picker-empty">没有匹配的{category}</p>}</div>
    </div>
  </div>,document.body)}</div>;
}

const selectionKey=item=>`${item.type}:${item.id}`;
export function knowledgePool(state,userId,current,knowledge){
  const readable=state.nodes.filter(n=>n.type!=='folder'&&contentRights(state,n,userId).view);
  if(knowledge.mode==='all')return readable;
  if(knowledge.mode==='space')return readable.filter(n=>n.spaceId===current.spaceId);
  if(knowledge.mode==='selection'){
    const libraries=new Set(knowledge.items.filter(i=>i.type==='library').map(i=>i.id)),ids=new Set();
    for(const item of knowledge.items.filter(i=>i.type==='node')){const source=state.nodes.find(n=>n.id===item.id);if(source&&contentRights(state,source,userId).view)for(const id of contentTree(state,source))ids.add(id);}
    return readable.filter(n=>libraries.has(n.spaceId)||ids.has(n.id));
  }
  return readable.filter(n=>n.id===current.id);
}
export function availableKnowledgeSelection(state,userId,items){
  const libraries=new Set(librariesForView(state,userId).map(l=>l.id));
  return items.filter(item=>item.type==='library'?libraries.has(item.id):contentRights(state,state.nodes.find(n=>n.id===item.id),userId).view);
}

function KnowledgeDialog({state,userId,node,selected,onConfirm,onClose}){
  const libraries=librariesForView(state,userId),[active,setActive]=useState(()=>libraries.some(l=>l.id===node.spaceId)?node.spaceId:libraries[0]?.id||''),[draft,setDraft]=useState(selected),[query,setQuery]=useState(''),[error,setError]=useState(''),[expanded,setExpanded]=useState(()=>new Set(folderTrail(state,node.parentId))),root=useRef(null);
  useLocationDialog(root,onClose);
  const keyword=query.trim().toLowerCase(),filtered=libraries.filter(l=>!keyword||l.name.toLowerCase().includes(keyword)||actualNodes(state,l,userId).some(n=>n.name.toLowerCase().includes(keyword)));
  const library=filtered.find(l=>l.id===active)||filtered[0],keys=new Set(draft.map(selectionKey));
  const toggle=item=>{setDraft(list=>keys.has(selectionKey(item))?list.filter(i=>selectionKey(i)!==selectionKey(item)):[...list,item]);setError('');};
  const expand=id=>setExpanded(ids=>{const next=new Set(ids);next.has(id)?next.delete(id):next.add(id);return next;});
  const matched=new Set();if(library&&keyword&&!library.name.toLowerCase().includes(keyword))for(const n of actualNodes(state,library,userId).filter(n=>n.name.toLowerCase().includes(keyword))){matched.add(n.id);for(const id of folderTrail(state,n.parentId))matched.add(id);}
  const rows=(parentId='',depth=0)=>library?projectedEntries(state,library,userId,libraryType(library),parentId).filter(n=>!keyword||library.name.toLowerCase().includes(keyword)||matched.has(n.id)).map(n=>{
    const folder=n.type==='folder',open=!!keyword||expanded.has(n.id),item={type:'node',id:n.id};
    return <div key={n.id}><div className={`doc-knowledge-tree-row ${n.pathOnly?'path-only':''}`} style={{paddingLeft:depth*17}}>{folder?<button type="button" className="doc-knowledge-expand" aria-label={`${open?'收起':'展开'} ${n.name}`} aria-expanded={open} onClick={()=>expand(n.id)}><CaretRight size={13} className={open?'open':''}/></button>:<span className="doc-knowledge-caret-slot"/>}<label><input type="checkbox" disabled={!!n.pathOnly} checked={keys.has(selectionKey(item))} aria-label={`选择知识 ${n.name}`} onChange={()=>toggle(item)}/><ContentIcon node={n} size={17}/><span>{n.name}</span>{n.pathOnly&&<small>仅路径</small>}</label></div>{folder&&open&&rows(n.id,depth+1)}</div>;
  }):null;
  const confirm=()=>{
    const latest=loadState();if(latest.viewAs!==userId){setError('当前用户已变化，请重新选择');return;}
    const valid=availableKnowledgeSelection(latest,userId,draft);if(valid.length!==draft.length){setDraft(valid);setError('部分知识已不可访问，请核对后重新确认');return;}
    if(!valid.length){setError('请至少选择一项知识');return;}onConfirm(valid);onClose();
  };
  return createPortal(<div className="subject-picker-backdrop doc-knowledge-backdrop" onMouseDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}><section ref={root} className="doc-knowledge-dialog" role="dialog" aria-modal="true" aria-label="选择知识" onKeyDownCapture={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}>
    <header><h2>选择知识</h2><button type="button" aria-label="关闭知识选择" onClick={onClose}><X size={19}/></button></header><label className="doc-knowledge-search"><MagnifyingGlass size={16}/><input data-name-field aria-label="搜索知识库或内容" placeholder="搜索知识库或内容" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/></label>
    <div className="doc-knowledge-columns"><section aria-label="知识库"><h3>知识库</h3>{filtered.map(l=>{const item={type:'library',id:l.id};return <div className={`doc-knowledge-library ${library?.id===l.id?'active':''}`} key={l.id}><input type="checkbox" aria-label={`选择知识库 ${l.name}`} checked={keys.has(selectionKey(item))} onChange={()=>toggle(item)}/><button type="button" onClick={()=>setActive(l.id)}><LibraryIcon library={l} size={24}/><span>{l.name}</span><CaretRight size={13}/></button></div>;})}{!filtered.length&&<p className="doc-picker-empty">没有匹配的知识库</p>}</section><section aria-label="知识库目录"><h3>{library?.name||'知识库目录'}</h3>{rows()}{library&&!projectedEntries(state,library,userId).length&&<p className="doc-picker-empty">暂无可查看内容</p>}</section></div>
    {error&&<p className="doc-control-error" role="alert">{error}</p>}<footer><span>已选 {draft.length} 项 · 仅使用你可查看的内容</span><button type="button" onClick={onClose}>取消</button><button type="button" className="primary" disabled={!draft.length} onClick={confirm}>确认选择</button></footer>
  </section></div>,document.body);
}

export function DocumentKnowledgePicker({state,userId,node,value,onChange,attachments,onAttachmentsChange,onNotice}){
  const [open,setOpen]=useState(false),[large,setLarge]=useState(false),input=useRef(null),popup=usePopover(open,()=>setOpen(false),'knowledge');
  const label=value.mode==='doc'?'当前文档':value.mode==='space'?'当前知识库':value.mode==='all'?'全部知识':value.mode==='selection'?`${value.items.length} 项知识`:'知识',selected=value.mode!=='none';
  const chooseMode=mode=>{
    setOpen(false);
    if(mode==='selection'){setLarge(true);return;}
    if(mode==='local'){input.current?.click();return;}
    onChange({mode,items:[]});
  };
  return <div ref={popup.root} className={`knowledge-picker doc-knowledge-picker ${selected?'has-selection':''}`}><button ref={popup.trigger} type="button" className={`knowledge-trigger ${open||selected?'active':''}`} title={label} aria-label={`知识范围：${label}`} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(!open)}><Books size={18}/><span>{label}</span>{!selected&&<CaretDown size={12}/>}</button>{selected&&<button type="button" className="knowledge-clear" aria-label="移除知识范围" onClick={()=>{onChange({mode:'none',items:[]});setOpen(false);}}><X size={11}/></button>}
    <input ref={input} type="file" multiple hidden aria-label="添加文档AI本地附件" onChange={e=>{const files=Array.from(e.target.files||[]),known=new Set(attachments.map(f=>`${f.name}:${f.size}:${f.lastModified}`));onAttachmentsChange([...attachments,...files.filter(f=>{const key=`${f.name}:${f.size}:${f.lastModified}`;if(known.has(key))return false;known.add(key);return true;})]);e.target.value='';setOpen(false);if(files.length)onNotice('已添加本地附件，本原型仅展示附件信息');}}/>
    {open&&createPortal(<div ref={popup.menu} className="doc-knowledge-menu" role="menu" aria-label="指定知识范围" style={popup.position}>{[['doc','当前文档','围绕正在阅读的文件提问'],['space','当前知识库','使用本库内可访问的内容'],['all','全部知识','使用全部可访问的知识'],['selection','从知识库选择','选择知识库、文件夹或文件'],['local','添加本地文件','添加附件并显示文件信息']].map(([mode,text,description])=><button type="button" role={['selection','local'].includes(mode)?'menuitem':'menuitemradio'} aria-checked={['selection','local'].includes(mode)?undefined:value.mode===mode} key={mode} onClick={()=>chooseMode(mode)}>{mode==='local'?<FileText size={17}/>:<Books size={17}/>}<span><strong>{text}</strong><small>{description}</small></span>{value.mode===mode&&<Check size={14}/>}</button>)}</div>,document.body)}
    {large&&<KnowledgeDialog state={state} userId={userId} node={node} selected={value.mode==='selection'?value.items:[]} onClose={()=>setLarge(false)} onConfirm={items=>onChange({mode:'selection',items})}/>}
  </div>;
}
