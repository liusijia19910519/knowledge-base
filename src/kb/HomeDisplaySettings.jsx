import { useEffect, useRef, useState } from 'react';
import { DotsSixVertical, Eye, EyeSlash, SlidersHorizontal } from '@phosphor-icons/react';
import { homeColumns, reorderHomeColumn, toggleHomeColumn } from './homeDisplay.js';

export default function HomeDisplaySettings({state,userId,update}){
  const [open,setOpen]=useState(false),[over,setOver]=useState(''),root=useRef(null),trigger=useRef(null),drag=useRef('');
  const columns=homeColumns(state,userId);
  useEffect(()=>{setOpen(false);},[userId]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    const escape=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  const move=(id,target,after)=>update(s=>reorderHomeColumn(s,userId,id,target,after));
  return <div className="home-display-settings" ref={root}>
    <button ref={trigger} type="button" className={open?'active':''} aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(!open)}><SlidersHorizontal size={16}/>显示设置</button>
    {open&&<div className="home-display-popover" role="dialog" aria-label="显示设置"><strong>显示设置</strong>
      {columns.map((column,index)=><div className={`home-display-option ${column.hidden?'is-hidden':''} ${over===column.id?'drag-over':''}`} key={column.id} data-column={column.id} draggable onDragStart={e=>{drag.current=column.id;e.dataTransfer.setData('text/plain',column.id);e.dataTransfer.effectAllowed='move';}} onDragOver={e=>{if(drag.current){e.preventDefault();setOver(column.id);}}} onDrop={e=>{e.preventDefault();const b=e.currentTarget.getBoundingClientRect();move(drag.current,column.id,e.clientY>b.top+b.height/2);drag.current='';setOver('');}} onDragEnd={()=>{drag.current='';setOver('');}}>
        <button type="button" className="column-drag-handle" aria-label={`调整${column.label}列顺序`} title="拖拽排序，或按 Alt＋↑/↓" onKeyDown={e=>{if(!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const next=columns[index+(e.key==='ArrowUp'?-1:1)];if(next)move(column.id,next.id,e.key==='ArrowDown');}}><DotsSixVertical size={13}/></button>
        <span>{column.label}</span><button type="button" aria-label={`${column.hidden?'显示':'隐藏'}${column.label}`} aria-pressed={!column.hidden} title={column.hidden?'点击显示':'点击隐藏'} onClick={()=>update(s=>toggleHomeColumn(s,userId,column.id))}>{column.hidden?<EyeSlash size={15}/>:<Eye size={15}/>}</button>
      </div>)}
    </div>}
  </div>;
}
