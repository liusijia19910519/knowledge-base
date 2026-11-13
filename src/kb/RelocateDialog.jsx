import { recordSharePlacement } from './sharing.js';
import MovePreview from './MovePreview.jsx';
import { isOrganizationContent } from './ownership.js';
import { useState } from 'react';
import LocationPicker, { locationLabel } from './LocationPicker.jsx';
import { contentTree, contentView, libraryType, parentAccess } from './access.js';
import { duplicateName, relocateContent, relocationSource, relocationTargetReason } from './contentOperations.js';

export default function RelocateDialog({state,userId,context,update,onClose,onSaved}){
  const node=state.nodes.find(n=>n.id===context.id),[name,setName]=useState(()=>node?duplicateName(state,node):''),[dirty,setDirty]=useState(false);
  let disabledReason='',items=[];try{items=relocationSource(state,context.id,context.mode,userId).items;}catch(err){disabledReason=err.message;}
  const move=context.mode==='move',label=move?'移动':'复制',view=node?contentView(state,node,userId):context.view||'personal';
  const reason=spaceId=>context.sharing&&libraryType(state.spaces.find(s=>s.id===spaceId))==='personal'?'协作需要移动到共享知识库或知识广场':relocationTargetReason(state,items,context.mode,spaceId,userId);
  const save=position=>{
    let result;update(latest=>{if(latest.viewAs!==userId)throw Error('当前用户已变化，请重新操作');result=relocateContent(latest,{id:context.id,mode:context.mode,...position,name,...(move?{expectedTargetAccess:JSON.stringify(parentAccess(state,position))}:{}),expectedSpaceId:context.spaceId,expectedParentId:context.parentId,expectedName:context.name},userId);if(context.sharing)result.state=recordSharePlacement(result.state,result.node.id,userId);return result.state;});
    onSaved(`已${label}到「${locationLabel(result.state,position.spaceId,position.parentId)}」`,result.node);onClose();
  };
  return <LocationPicker emptyLabel={`请选择有编辑权限的${label}位置`} state={state} userId={userId} value={{spaceId:context.spaceId,parentId:context.parentId,view}} blockedIds={node?[...contentTree(state,node)]:[]} destinationReason={reason} allowedViews={context.sharing||move&&items.some(n=>isOrganizationContent(state,n))?['shared','plaza']:[]} title={`${label}「${node?.name||'原内容'}」`} confirmText={`确认${label}`} selectionDetails={position=><MovePreview state={state} items={items} position={position} mode={context.mode}/>} nameValue={name} onNameChange={move?undefined:value=>{setName(value);setDirty(true);}} onPositionChange={position=>{if(!move&&!dirty&&position.spaceId&&node)setName(duplicateName(state,node,position.parentId||'',position.spaceId));}} disabledReason={disabledReason} onConfirm={save} onClose={onClose}/>;
}
