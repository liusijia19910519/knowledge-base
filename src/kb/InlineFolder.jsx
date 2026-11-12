import { useEffect, useRef, useState } from 'react';
import ContentIcon from './ContentIcon.jsx';
import { createContent, defaultContentName } from './contentCreation.js';
export default function InlineFolder({state,userId,context,update,onClose,onCreated}){
  const [name,setName]=useState(()=>defaultContentName(state,'folder',context.spaceId,context.parentId)),[error,setError]=useState(''),input=useRef(null),lock=useRef(false);
  useEffect(()=>{input.current?.focus();input.current?.select();},[]);
  const submit=e=>{e.preventDefault();if(lock.current)return;try{lock.current=true;let node;update(s=>{const result=createContent(s,{format:'folder',name,spaceId:context.spaceId,parentId:context.parentId,lockedSpaceId:context.spaceId},userId);node=result.node;return result.state;});onCreated(node);onClose();}catch(err){setError(err.message);}finally{lock.current=false;}};
  return <div className="inline-folder-draft"><form onSubmit={submit} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}><ContentIcon node={{type:'folder'}} size={18}/><input ref={input} aria-label="新文件夹名称" maxLength={100} value={name} onChange={e=>{setName(e.target.value);setError('');}}/><button type="submit">确认</button><button type="button" onClick={onClose}>取消</button></form>{error&&<p role="alert">{error}</p>}</div>;
}
