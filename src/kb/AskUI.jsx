import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Books, Briefcase, CalendarBlank, ChartBar, CheckSquare, FileText, ListChecks, Note, PencilLine, ShieldCheck, Sparkle, UserCircle, X } from '@phosphor-icons/react';
const icons={Books,Briefcase,CalendarBlank,ChartBar,CheckSquare,FileText,ListChecks,Note,PencilLine,ShieldCheck,UserCircle};
export function SkillIcon({name,size=17,...props}){const Icon=icons[name]||Sparkle;return <Icon size={size} {...props}/>;}
export function AskDialog({title,children,onClose,footer,wide=false,busy=false}){
  const ref=useRef(null),id=useId();
  useEffect(()=>{const previous=document.activeElement;const frame=requestAnimationFrame(()=>ref.current?.querySelector('input:not([type=checkbox]),textarea,select,button')?.focus());return()=>{cancelAnimationFrame(frame);previous?.isConnected&&previous.focus();};},[]);
  return createPortal(<div className="ask-modal" onPointerDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}} onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();onClose();}if(e.key==='Tab'){const items=[...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select:not(:disabled),a[href]')].filter(n=>n.getClientRects().length);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}}}}><section ref={ref} className={`ask-dialog${wide?' wide':''}`} role="dialog" aria-modal="true" aria-labelledby={id}><header><h2 id={id}>{title}</h2><button type="button" className="ask-icon" aria-label="关闭弹窗" disabled={busy} onClick={onClose}><X size={19}/></button></header><div className="ask-dialog-body">{children}</div>{footer&&<footer>{footer}</footer>}</section></div>,document.body);
}
export function downloadText(name,body){const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
