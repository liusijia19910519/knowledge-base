import { useState } from 'react';
import LocationPicker, { locationLabel } from './LocationPicker.jsx';
import { contentTree, contentView } from './access.js';
import { duplicateName, relocateContent, relocationSource } from './contentOperations.js';

export default function RelocateDialog({state,userId,context,update,onClose,onSaved}){
  const node=state.nodes.find(n=>n.id===context.id);
  const [name,setName]=useState(()=>node?duplicateName(state,node):'');
  let disabledReason='';
  try{relocationSource(state,context.id,context.mode,userId);}catch(err){disabledReason=err.message;}
  const move=context.mode==='move',label=move?'移动':'复制',view=node?contentView(state,node,userId,context.view):context.view||'personal';
  const save=position=>{
    let result;update(latest=>{result=relocateContent(latest,{id:context.id,mode:context.mode,...position,name,expectedParentId:context.parentId},userId);return result.state;});
    onSaved(`已${label}到「${locationLabel(result.state,position.spaceId,position.parentId)}」`,result.node);onClose();
  };
  return <LocationPicker state={state} userId={userId} value={{spaceId:context.spaceId,parentId:context.parentId,view}} lockedSpaceId={context.spaceId} lockedView={view} blockedIds={node?[...contentTree(state,node)]:[]} title={`${label}「${node?.name||'原内容'}」`} description={`仅可在当前知识库内${label}，${move?'移动的内容':'副本'}将继承目标目录权限。`} confirmText={`确认${label}`} nameValue={name} onNameChange={move?undefined:setName} disabledReason={disabledReason} onConfirm={save} onClose={onClose}/>;
}
