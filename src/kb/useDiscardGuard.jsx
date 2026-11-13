import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocationDialog } from './LocationPicker.jsx';
function DiscardPrompt({onKeep,onDiscard}){const root=useRef(null);useLocationDialog(root,onKeep);return createPortal(<div className="action-backdrop discard-draft-backdrop" onMouseDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)onKeep();}}><section ref={root} className="action-dialog" role="dialog" aria-modal="true" aria-label="放弃未保存的更改" onKeyDownCapture={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onKeep();}}}><header><h2>放弃未保存的更改？</h2></header><p>本次修改尚未保存。</p><footer><button type="button" onClick={onKeep}>继续编辑</button><button type="button" className="discard-draft-confirm" onClick={onDiscard}>放弃更改</button></footer></section></div>,document.body);}
export default function useDiscardGuard(dirty,onClose,blocked=false){
  const [asking,setAsking]=useState(false),latest=useRef(null);latest.current={dirty,onClose,blocked};
  useEffect(()=>{const guard=event=>{if(latest.current.dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
  const requestClose=()=>{const current=latest.current;if(current.blocked)return;if(current.dirty)setAsking(true);else current.onClose();};
  const prompt=asking?<DiscardPrompt onKeep={()=>setAsking(false)} onDiscard={()=>{setAsking(false);latest.current.onClose();}}/>:null;
  return {requestClose,prompt};
}
