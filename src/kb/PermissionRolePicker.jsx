import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check, DownloadSimple, Eye, LockSimple, PencilSimple, ShieldCheck, Trash } from '@phosphor-icons/react';
import { PERMISSION_ROLES } from './permissions.js';
import './permissionRolePicker.css';

const roleDetails={
  manager:{description:'管理内容、协作者及权限',Icon:ShieldCheck},
  editor:{description:'编辑、新建、上传与下载',Icon:PencilSimple},
  downloader:{description:'查看、下载、复制与打印',Icon:DownloadSimple},
  viewer:{description:'仅在线查看，不能下载或复制',Icon:Eye},
  legacy:{description:'保持原有权限，不自动扩大授权',Icon:LockSimple},
};
export function permissionRoleOptions(value,actions=[{value:'remove',label:'移除',description:'移除此授权对象'}]){
  return [
    ...(value==='legacy'?[{value:'legacy',label:'原有权限（保留）',disabled:true}]:[]),
    ...PERMISSION_ROLES.map(([value,label])=>({value,label})),
    ...actions.map((action,index)=>({...action,danger:true,separated:index===0})),
  ];
}

export default function PermissionRolePicker({label,value,displayValue=value,onChange,options,groupLabel='',disabled=false}){
  const [open,setOpen]=useState(false),[position,setPosition]=useState(null),trigger=useRef(null),menu=useRef(null),startFocus=useRef('current'),id=useId();
  const selected=options.find(item=>item.value===displayValue),caption=selected?.label||PERMISSION_ROLES.find(([id])=>id===displayValue)?.[1]||'选择权限';
  const [status,setStatus]=useState(''),changed=useRef(false);
  useEffect(()=>{if(!changed.current)return;changed.current=false;setStatus(displayValue!==value?`本项：${PERMISSION_ROLES.find(([id])=>id===value)?.[1]||'原有权限'}；实际：${caption}`:'');},[value,displayValue]);
  useEffect(()=>{if(!status)return;const timer=setTimeout(()=>setStatus(''),5000);return()=>clearTimeout(timer);},[status]);
  const close=(restore=true)=>{
    const fallback=trigger.current?.closest('[role="dialog"]')?.querySelector('.grant-add,button[type="submit"]');
    setOpen(false);setPosition(null);
    if(restore)requestAnimationFrame(()=>{const target=trigger.current?.isConnected?trigger.current:fallback;if(target?.isConnected)target.focus();});
  };
  useEffect(()=>{if(disabled&&open)close(false);},[disabled,open]);
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const box=trigger.current?.getBoundingClientRect();if(!box)return;
      const width=Math.min(290,innerWidth-24),below=innerHeight-box.bottom-18,above=box.top-18;
      const height=Math.min(menu.current?.scrollHeight||360,420),up=below<Math.min(height,240)&&above>below;
      const maxHeight=Math.max(80,Math.min(420,up?above:below));
      setPosition({width,maxHeight,left:Math.max(12,Math.min(innerWidth-width-12,box.right-width)),top:up?Math.max(12,box.top-Math.min(height,maxHeight)-6):box.bottom+6});
    };
    place();const frame=requestAnimationFrame(()=>{
      const enabled=[...menu.current.querySelectorAll('button:not(:disabled)')];
      const active=startFocus.current==='last'?enabled.at(-1):startFocus.current==='first'?enabled[0]:menu.current.querySelector('[aria-checked="true"]:not(:disabled)')||enabled[0];
      active?.focus({preventScroll:true});
    });
    window.addEventListener('resize',place);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',place);};
  },[open]);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!menu.current?.contains(e.target)&&!trigger.current?.contains(e.target))close(false);};
    const scroll=e=>{if(!menu.current?.contains(e.target))close(false);};
    const keys=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.key==='Tab'){
        e.preventDefault();e.stopPropagation();
        const dialog=trigger.current?.closest('[role="dialog"]');
        const items=dialog?[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]')].filter(el=>el.getClientRects().length&&!el.closest('[inert]')):[];
        const index=items.indexOf(trigger.current),next=items.length?items[(index+(e.shiftKey?-1:1)+items.length)%items.length]:trigger.current;
        close(false);next?.focus();return;
      }
      if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();
      const items=[...menu.current.querySelectorAll('button:not(:disabled)')],at=items.indexOf(document.activeElement);
      const next=e.key==='Home'?0:e.key==='End'?items.length-1:(at+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
      items[next]?.focus();items[next]?.scrollIntoView({block:'nearest'});
    };
    document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);document.addEventListener('keydown',keys,true);window.addEventListener('scroll',scroll,true);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside);document.removeEventListener('keydown',keys,true);window.removeEventListener('scroll',scroll,true);};
  },[open]);
  return <div className="permission-role-control"><button ref={trigger} type="button" className="permission-role-trigger" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} disabled={disabled} onClick={()=>{if(open)close();else{startFocus.current='current';setOpen(true);}}} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();startFocus.current=e.key==='ArrowUp'?'last':'current';setOpen(true);}}}><span>{caption}</span><CaretDown size={12}/></button>
    {open&&createPortal(<div ref={menu} id={id} className="permission-role-menu" role="menu" aria-label={label} style={position||{top:0,left:0,opacity:0}} onClick={e=>e.stopPropagation()}>
      {groupLabel&&<p className="permission-role-group">{groupLabel}</p>}{displayValue!==value&&<p className="permission-role-effective">实际生效：{caption}</p>}
      {options.map(option=>{const detail=roleDetails[option.value],Icon=option.danger?Trash:detail?.Icon||Eye;
        return <button type="button" role={option.danger?'menuitem':'menuitemradio'} aria-checked={option.danger?undefined:option.value===value} disabled={option.disabled} className={`${option.danger?'is-danger':''} ${option.separated?'is-separated':''}`} key={option.value} onClick={()=>{changed.current=true;close();onChange(option.value);}}><Icon size={17}/><span><b>{option.label}</b>{(option.description||detail?.description)&&<small>{option.description||detail.description}</small>}</span>{!option.danger&&option.value===value&&<Check size={15} weight="bold"/>}</button>;
      })}
    </div>,document.body)}
    {status&&<span className="permission-role-status" role="status">{status}</span>}
  </div>;
}
