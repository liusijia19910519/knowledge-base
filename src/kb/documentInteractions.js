import { useEffect, useRef, useState } from 'react';
import { parseContent } from './contentCreation.js';

export function scrollDocumentSection(container,target){
  if(!container||!target)return;
  const top=container.scrollTop+target.getBoundingClientRect().top-container.getBoundingClientRect().top-24;
  container.scrollTo({top:Math.max(0,top),behavior:'smooth'});
}

export function useDocumentPanel(identity,enabled){
  const workspace=useRef(null),stopDrag=useRef(null),[width,setWidth]=useState(470),[maximum,setMaximum]=useState(700);
  const limit=()=>{
    const container=workspace.current,available=container?.clientWidth||innerWidth;
    const outline=container?.querySelector('.document-outline')?.getBoundingClientRect().width||248;
    return Math.max(280,Math.floor(Math.min(available*.55,available-outline-420)));
  };
  useEffect(()=>{
    if(!enabled||!workspace.current)return;
    const fit=()=>{const max=limit();setMaximum(max);setWidth(current=>Math.max(280,Math.min(max,current)));};
    fit();const observer=new ResizeObserver(fit);observer.observe(workspace.current);window.addEventListener('resize',fit);
    return()=>{observer.disconnect();window.removeEventListener('resize',fit);stopDrag.current?.();};
  },[identity,enabled]);
  const startResize=event=>{
    if(event.button!==0)return;event.preventDefault();stopDrag.current?.();
    const startX=event.clientX,startWidth=width,cursor=document.body.style.cursor,selection=document.body.style.userSelect;
    document.body.style.cursor='col-resize';document.body.style.userSelect='none';
    const move=e=>setWidth(Math.min(limit(),Math.max(280,startWidth+startX-e.clientX)));
    const stop=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',stop);window.removeEventListener('pointercancel',stop);document.body.style.cursor=cursor;document.body.style.userSelect=selection;stopDrag.current=null;};
    stopDrag.current=stop;window.addEventListener('pointermove',move);window.addEventListener('pointerup',stop,{once:true});window.addEventListener('pointercancel',stop,{once:true});
  };
  const resizeKey=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
    setWidth(current=>Math.min(limit(),Math.max(280,event.key==='Home'?280:event.key==='End'?limit():current+(event.key==='ArrowLeft'?16:-16))));
  };
  return {workspace,width,maximum,startResize,resizeKey};
}

export function documentSections(node,body){
  if(!node||node.format==='file'||['sheet','slides'].includes(node.format))return [];
  const lines=body.split(/\r?\n/).filter(line=>line.trim());
  return lines.slice(1).map((text,index)=>{
    const trimmed=text.trim(),markdown=trimmed.match(/^#{1,6}\s+(.+)$/);
    const heading=markdown?.[1]||((trimmed.length<=64&&/^(?:[一二三四五六七八九十]+[、．.]|\d+(?:\.\d+)*[、．.]\s)/.test(trimmed))?trimmed:'');
    return {id:`doc-section-${index}`,text,heading};
  });
}
export function documentOutline(node,body){
  if(!node)return [];
  if(node.format==='file')return [{id:'doc-body',label:'文件预览'}];
  if(node.format==='sheet')return [{id:'doc-body',label:'表格内容'}];
  if(node.format==='slides')return parseContent('slides',body).slides.map((slide,index)=>({id:'doc-body',key:`slide-${index}`,label:`${index+1}. ${slide.title||'未命名页'}`,slide:index}));
  return [{id:'doc-summary',label:node.faq?'标准问答':'文档摘要'},{id:'doc-body',label:'正文'},...documentSections(node,body).filter(section=>section.heading).map(section=>({id:section.id,label:section.heading}))];
}
