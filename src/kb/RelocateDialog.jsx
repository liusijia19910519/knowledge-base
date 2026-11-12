import { useState } from 'react';
import LocationPicker, { locationLabel } from './LocationPicker.jsx';
import { contentTree, contentView, libraryType } from './access.js';
import { duplicateName, relocateContent, relocationSource, relocationTargetReason } from './contentOperations.js';

export default function RelocateDialog({state,userId,context,update,onClose,onSaved}){
  const node=state.nodes.find(n=>n.id===context.id),[name,setName]=useState(()=>node?duplicateName(state,node):''),[dirty,setDirty]=useState(false);
  let disabledReason='',items=[];try{items=relocationSource(state,context.id,context.mode,userId).items;}catch(err){disabledReason=err.message;}
  const move=context.mode==='move',label=move?'移动':'复制',view=node?contentView(state,node,userId):context.view||'personal';
  const reason=spaceId=>context.sharing&&libraryType(state.spaces.find(s=>s.id===spaceId))==='personal'?'协作需要移动到共享知识库或知识广场':relocationTargetReason(state,items,context.mode,spaceId,userId);
  const save=position=>{
    let result;update(latest=>{if(latest.viewAs!==userId)throw Error('当前用户已变化，请重新操作');result=relocateContent(latest,{id:context.id,mode:context.mode,...position,name,expectedSpaceId:context.spaceId,expectedParentId:context.parentId,expectedName:context.name},userId);return result.state;});
    onSaved(`已${label}到「${locationLabel(result.state,position.spaceId,position.parentId)}」`,result.node);onClose();
  };
  return <LocationPicker emptyLabel={`请选择有编辑权限的${label}位置`} state={state} userId={userId} value={{spaceId:context.spaceId,parentId:context.parentId,view}} blockedIds={node?[...contentTree(state,node)]:[]} destinationReason={reason} allowedViews={context.sharing?['shared','plaza']:[]} title={`${label}「${node?.name||'原内容'}」`} description={move?'可跨知识库移动。普通授权将重置并继承目标目录，创建者管理权保留；原协作者可能失去访问。只有本人创建的内容才能移入个人库。':'可复制到有编辑权限的知识库目录。副本独立保存，由你创建并继承目标权限，原内容保持不变。'} confirmText={`确认${label}`} selectionMessage={position=>move&&libraryType(state.spaces.find(space=>space.id===position.spaceId))==='personal'?'移动后仅自己可见':''} nameValue={name} onNameChange={move?undefined:value=>{setName(value);setDirty(true);}} onPositionChange={position=>{if(!move&&!dirty&&position.spaceId&&node)setName(duplicateName(state,node,position.parentId||'',position.spaceId));}} disabledReason={disabledReason} onConfirm={save} onClose={onClose}/>;
}
