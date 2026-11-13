import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Sparkle } from '@phosphor-icons/react';

export default function DocumentSelectionToolbar({position,canCopy,onCopy,onRewrite,onClose}){
  useEffect(()=>{
    const outside=e=>{if(!e.target.closest('.doc-selection-toolbar'))onClose();};
    const close=e=>{if(e.key==='Escape')onClose();};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',close);window.addEventListener('resize',onClose);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',close);window.removeEventListener('resize',onClose);};
  },[]);
  return createPortal(<div className="doc-selection-toolbar" role="toolbar" aria-label="选中文本操作" style={{left:Math.max(12,Math.min(innerWidth-240,position.left)),top:Math.max(12,Math.min(innerHeight-65,position.top))}} onMouseDown={e=>e.preventDefault()}><button type="button" onClick={()=>{onRewrite();onClose();}}><span className="rewrite-avatar"><Sparkle size={17}/></span>AI 改写</button><i/><button type="button" disabled={!canCopy} title={canCopy?'复制选中文字':'仅查看不包含复制权限'} onClick={onCopy}><Copy size={17}/>复制</button></div>,document.body);
}
