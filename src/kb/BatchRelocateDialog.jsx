import { useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { LocationBrowser, useLocationDialog } from './LocationPicker.jsx';
import { batchPreflight, performBatch, sourceLocations } from './fileActions.js';
import { contentTree, contentView, activeNode, libraryType } from './access.js';
import { relocationTargetReason } from './contentOperations.js';
export default function BatchRelocateDialog({state,ids,spaceId,mode,userId,view,update,onClose,onSuccess}){
  const nodes=ids.map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean),parentId=nodes[0]?.parentId||'',label=mode==='move'?'移动':'复制';
  const [position,setPosition]=useState({spaceId,parentId,view:contentView(state,nodes[0],userId)}),[error,setError]=useState(''),expected=useRef(sourceLocations(state,ids)),root=useRef(null);useLocationDialog(root,onClose);
  const blocked=[...new Set(nodes.flatMap(n=>[...contentTree(state,n)]))],items=state.nodes.filter(n=>blocked.includes(n.id)&&activeNode(state,n));
  const destinationReason=id=>relocationTargetReason(state,items,mode,id,userId);
  let reason='';try{batchPreflight(state,{ids,sourceSpaceId:spaceId,targetSpaceId:position.spaceId,spaceId,action:mode,...(position.spaceId&&!(mode==='move'&&position.spaceId===spaceId&&position.parentId===parentId)?{parentId:position.parentId}:{})},userId);}catch(e){reason=e.message;}
  const same=mode==='move'&&position.spaceId===spaceId&&position.parentId===parentId;
  const submit=e=>{e.preventDefault();if(!position.spaceId||same||reason)return;try{update(s=>{if(s.viewAs!==userId)throw Error('当前用户已变化，请重新操作');return performBatch(s,{ids,sourceSpaceId:spaceId,targetSpaceId:position.spaceId,spaceId,action:mode,parentId:position.parentId,expected:expected.current},userId).state;});onSuccess();onClose();}catch(err){setError(err.message);}};
  return <div className="action-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><form ref={root} className="location-picker" role="dialog" aria-modal="true" aria-label={`批量${label}`} onSubmit={submit}><header><div><h2>{label} {nodes.length} 项内容</h2><p>{mode==='move'?'可跨知识库移动。普通授权重置，创建者保护保留；原协作者可能失去访问。遇到重名整批停止，不覆盖。':'可跨知识库复制。副本由你创建并继承目标目录权限，自动生成唯一名称。'}</p></div><button type="button" className="location-close" aria-label={`关闭批量${label}`} onClick={onClose}><X size={19}/></button></header><LocationBrowser emptyLabel={`请选择有编辑权限的${label}位置`} state={state} userId={userId} value={position} onChange={p=>{setPosition(p);setError('');}} blockedIds={blocked} destinationReason={destinationReason}/>{(error||reason)&&<p role="alert" className="new-create-error">{error||reason}</p>}<footer><span>{same?'当前位置未改变':mode==='move'?(position.spaceId&&libraryType(state.spaces.find(space=>space.id===position.spaceId))==='personal'?'移动后仅自己可见':'个人库仅接受全部由本人创建的内容'):'复制后保留原内容，产生独立副本'}</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="location-confirm" disabled={!position.spaceId||same||!!reason}>确认{label}</button></footer></form></div>;
}
