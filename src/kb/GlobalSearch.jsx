import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass, X, Books } from '@phosphor-icons/react';
import { searchKnowledge } from './knowledgeSearch.js';
import { librariesForView, LIBRARY_TYPES } from './access.js';
import { loadState } from './store.js';
import ContentIcon from './ContentIcon.jsx';
import './globalSearch.css';
export default function GlobalSearch({state,userId,onOpen,onLibrary,onNotice}){
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[type,setType]=useState('all'),[limit,setLimit]=useState(20),[position,setPosition]=useState({left:12,top:80});
  const root=useRef(null),panel=useRef(null),input=useRef(null),rows=searchKnowledge(state,userId,query,type);
  useEffect(()=>{setOpen(false);setQuery('');},[userId]);
  useEffect(()=>{setLimit(20);},[query,type]);
  useEffect(()=>{
    if(!open)return;const place=()=>{const b=input.current.getBoundingClientRect();setPosition({left:Math.max(12,Math.min(innerWidth-Math.min(620,innerWidth-24)-12,b.left)),top:Math.min(b.bottom+8,innerHeight-240)});};place();
    const outside=e=>{if(!root.current?.contains(e.target)&&!panel.current?.contains(e.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);};
  },[open]);
  const close=()=>{input.current?.focus();setOpen(false);};
  const choose=row=>{try{const fresh=loadState();if(row.kind==='library'){if(!librariesForView(fresh,userId).some(l=>l.id===row.id))throw Error('该知识库已不可访问');onLibrary(row.id,row.view);}else onOpen(row.id);setOpen(false);}catch(error){onNotice(error.message);}};
  const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&(e.target!==input.current||e.key.startsWith('Arrow'))){const buttons=[...panel.current?.querySelectorAll('[data-search-result]')||[]];if(!buttons.length)return;e.preventDefault();const index=buttons.indexOf(document.activeElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Enter'&&e.target===input.current){e.preventDefault();if(rows[0])choose(rows[0]);}};
  return <div ref={root} className="global-search" onKeyDown={keys}><label className="knowledge-subnav-search"><MagnifyingGlass size={17}/><input ref={input} aria-label="全局搜索" placeholder="搜索" value={query} aria-expanded={open} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}}/></label>{open&&createPortal(<section ref={panel} className="global-search-results" style={position} role="dialog" aria-label="全局搜索结果" onKeyDown={keys}><header><strong>搜索全部可访问知识</strong><button type="button" aria-label="关闭搜索结果" onClick={close}><X size={17}/></button></header><nav aria-label="搜索类型">{[['all','全部'],['library','知识库'],['folder','文件夹'],['file','文件']].map(([id,label])=><button type="button" key={id} aria-pressed={type===id} onClick={()=>setType(id)}>{label}</button>)}</nav><div className="global-search-list">{!query.trim()?<p>输入名称或内容关键词，跨个人、共享及广场搜索。</p>:!rows.length?<p>没有找到可访问的结果，请调整关键词。</p>:rows.slice(0,limit).map(row=><button type="button" data-search-result key={`${row.kind}:${row.id}`} onClick={()=>choose(row)}>{row.kind==='library'?<Books size={25}/>:<ContentIcon node={row.node}/>}<span><strong title={row.name}>{row.name}</strong><small title={row.path}>{LIBRARY_TYPES[row.view]} · {row.path}</small>{row.description&&<em>{row.description}</em>}</span><small>{row.kind==='library'?'知识库':row.kind==='folder'?'文件夹':'文件'}</small></button>)}</div><footer><span>{query.trim()?`${rows.length} 项结果`:'仅搜索当前身份有权查看的内容'}</span>{rows.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+20)}>加载更多</button>}</footer></section>,document.body)}</div>;
}
