import { useEffect, useRef, useState } from 'react';

// Pointer hover never steals focus; click and keyboard explicitly enter the menu.
export default function useHoverMenu(disabled=false){
  const [open,setOpen]=useState(false),root=useRef(null),trigger=useRef(null),timer=useRef(null),pinned=useRef(false),focusPending=useRef(false);
  const clear=()=>{clearTimeout(timer.current);timer.current=null;};
  const close=(restore=false)=>{clear();pinned.current=false;focusPending.current=false;setOpen(false);if(restore)trigger.current?.focus();};
  const announce=()=>document.dispatchEvent(new CustomEvent('kb-hover-menu-open',{detail:root.current}));
  const enter=()=>{if(disabled)return;clear();announce();focusPending.current=true;pinned.current=true;setOpen(true);if(open){focusPending.current=false;root.current?.querySelector('[role^="menuitem"]:not(:disabled)')?.focus();}};
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{const other=e=>{if(e.detail!==root.current)close();};document.addEventListener('kb-hover-menu-open',other);return()=>document.removeEventListener('kb-hover-menu-open',other);},[]);
  useEffect(()=>{if(disabled)close();},[disabled]);
  useEffect(()=>{
    if(!open)return;
    if(focusPending.current){focusPending.current=false;root.current?.querySelector('[role^="menuitem"]:not(:disabled)')?.focus();}
    const outside=e=>{if(!root.current?.contains(e.target))close();};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[open]);
  const keys=e=>{
    if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close(true);return;}
    if(e.key==='Tab'){if(open&&root.current?.querySelector('[role="menu"]')?.contains(document.activeElement))trigger.current?.focus();close();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
    if(disabled)return;
    e.preventDefault();e.stopPropagation();
    if(!open){enter();return;}
    const rows=[...root.current.querySelectorAll('[role^="menuitem"]:not(:disabled)')],index=rows.indexOf(document.activeElement);
    const next=e.key==='Home'?0:e.key==='End'?rows.length-1:index<0?(e.key==='ArrowUp'?rows.length-1:0):(index+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;
    rows[next]?.focus();
  };
  return {open,root,trigger,close,rootProps:{onKeyDown:keys,onPointerEnter:e=>{if(disabled||e.pointerType==='touch')return;clear();announce();setOpen(true);},onPointerLeave:()=>{clear();if(!pinned.current&&!root.current?.contains(document.activeElement))timer.current=setTimeout(()=>close(),180);},onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget))close();}},triggerProps:{onClick:()=>{if(open&&pinned.current)close(true);else enter();}}};
}
