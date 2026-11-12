import { useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { LocationBrowser, useLocationDialog } from './LocationPicker.jsx';
import { batchPreflight, performBatch, sourceLocations } from './fileActions.js';
import { contentTree, contentView } from './access.js';
export default function BatchRelocateDialog({state,ids,spaceId,mode,userId,view,update,onClose,onSuccess}){
  const nodes=ids.map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean),parentId=nodes[0]?.parentId||'',label=mode==='move'?'移动':'复制';
  const [position,setPosition]=useState({spaceId,parentId,view:view||contentView(state,nodes[0],userId)}),[error,setError]=useState(''),expected=useRef(sourceLocations(state,ids)),root=useRef(null);useLocationDialog(root,onClose);
  const blocked=[...new Set(nodes.flatMap(n=>[...contentTree(state,n)]))];let reason='';try{batchPreflight(state,{ids,spaceId,action:mode,parentId:position.parentId},userId);}catch(e){reason=e.message;}
  const same=mode==='move'&&position.parentId===parentId;
  const submit=e=>{e.preventDefault();try{update(s=>performBatch(s,{ids,spaceId,action:mode,parentId:position.parentId,expected:expected.current},userId).state);onSuccess();onClose();}catch(err){setError(err.message);}};
  return <div className="action-backdrop"><form ref={root} className="location-picker" role="dialog" aria-modal="true" aria-label={`批量${label}`} onSubmit={submit}><header><div><h2>{label} {nodes.length} 项内容</h2><p>仅可选择当前知识库内的位置。{mode==='copy'?'副本名称自动生成，避免覆盖。':'遇到重名时整批停止，不覆盖。'}</p></div><button type="button" className="location-close" aria-label={`关闭批量${label}`} onClick={onClose}><X size={19}/></button></header><LocationBrowser state={state} userId={userId} value={position} onChange={p=>{setPosition(p);setError('');}} lockedSpaceId={spaceId} lockedView={position.view} blockedIds={blocked}/>{(error||reason)&&<p role="alert" className="new-create-error">{error||reason}</p>}<footer><span>{same?'当前位置未改变':'操作后继承目标目录权限'}</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="location-confirm" disabled={same||!!reason}>确认{label}</button></footer></form></div>;
}
