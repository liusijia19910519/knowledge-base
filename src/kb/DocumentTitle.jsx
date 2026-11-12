import { useRef, useState } from 'react';
import { renameContent } from './contentCreation.js';
export default function DocumentTitle({state,node,userId,update,editable}){
  const [editing,setEditing]=useState(false),[value,setValue]=useState(node.name),[error,setError]=useState(''),expected=useRef(node.name),cancelled=useRef(false);
  const start=()=>{expected.current=node.name;cancelled.current=false;setValue(node.name);setError('');setEditing(true);};
  const save=()=>{if(cancelled.current)return;try{update(s=>renameContent(s,node.id,value,userId,expected.current));setEditing(false);setError('');}catch(e){setError(e.message);}};
  return <span className="document-title-edit">{editing?<input className="document-title-input" autoFocus aria-label="文档名称" maxLength={100} value={value} onFocus={e=>e.target.select()} onChange={e=>{setValue(e.target.value);setError('');}} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){cancelled.current=true;setEditing(false);setError('');}}}/>:editable?<button type="button" className="document-title-button" title="点击重命名" onClick={start}><strong>{node.name}</strong></button>:<strong>{node.name}</strong>}{error&&<small role="alert" style={{display:'block',color:'#bc6565',fontSize:10}}>{error}</small>}</span>;
}
