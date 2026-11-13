import MovePreview from './MovePreview.jsx';
import { isOrganizationContent } from './ownership.js';
import { useState } from 'react';
import { validateContentDestination } from './destinations.js';
import LocationPicker from './LocationPicker.jsx';
import { contentTree, restoreContent } from './access.js';
import { relocationTargetReason } from './contentOperations.js';

export default function RestoreLocationDialog({state,node,userId,update,onClose,onSaved}){
  const [name,setName]=useState(node.name);
  let available=true;try{validateContentDestination(state,{spaceId:node.spaceId,parentId:node.parentId||''},userId);}catch{available=false;}
  const ids=contentTree(state,node),items=state.nodes.filter(n=>ids.has(n.id)&&n.deletedAt&&(n.id===node.id||node.deleteBatch&&n.deleteBatch===node.deleteBatch));
  return <LocationPicker state={state} userId={userId} value={available?{view:state.spaces.find(s=>s.id===node.spaceId)?.kind,spaceId:node.spaceId,parentId:node.parentId||''}:{view:'',spaceId:'',parentId:''}} nameLabel="恢复名称" nameValue={name} onNameChange={setName} blockedIds={[...ids]} allowedViews={items.some(n=>isOrganizationContent(state,n))?['shared','plaza']:[]} title={`选择「${node.name}」的恢复位置`} selectionDetails={position=><MovePreview state={state} items={items} position={position} mode="restore"/>} emptyLabel="请选择有编辑权限的恢复位置" confirmText="确认恢复" destinationReason={spaceId=>relocationTargetReason(state,items,'move',spaceId,userId)} onClose={onClose} onConfirm={position=>{let restored;update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化，请重新操作');const next=restoreContent(current,node.id,userId,{...position,name});restored=next.nodes.find(item=>item.id===node.id);return next;});onSaved(restored);onClose();}}/>;
}
