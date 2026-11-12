import { activeNode, contentRights, contentTree, libraryType } from './access.js';
import { validateContentName, validateDestination, uploadedExtension } from './contentCreation.js';

export function relocationSource(state,id,mode,userId){
  if(!['move','copy'].includes(mode))throw Error('请选择移动或复制');
  const node=state.nodes.find(n=>n.id===id);if(!activeNode(state,node))throw Error('原内容已不存在或已删除，请重新打开');
  const ids=contentTree(state,node),items=state.nodes.filter(n=>ids.has(n.id)&&activeNode(state,n)),capability=mode==='move'?'manage':'view';
  if(items.some(n=>!contentRights(state,n,userId)[capability]))throw Error(mode==='move'?'需要管理原内容及全部子内容才能移动':'需要查看原内容及全部子内容才能复制');
  if(mode==='copy'&&items.some(n=>!contentRights(state,n,userId).download))throw Error('需要全部源内容的查看并下载权限，不能通过复制绕过下载限制');
  return {node,ids,items};
}
export function relocationTargetReason(state,items,mode,spaceId,userId){
  const library=state.spaces.find(s=>s.id===spaceId);if(!library||library.deletedAt)return '目标知识库已不可用';
  if(libraryType(library)==='personal'){
    if(library.ownerId!==userId)return '只能选择自己的个人知识库';
    if(mode==='move'&&items.some(n=>n.ownerId!==userId))return '包含非本人创建的内容，不能移动到个人知识库；可以改用复制';
  }
  return '';
}
export function duplicateName(state,node,parentId=node.parentId||'',targetSpaceId=node.spaceId){
  const names=new Set(state.nodes.filter(n=>n.spaceId===targetSpaceId&&!n.deletedAt&&(n.parentId||'')===parentId).map(n=>n.name.trim().toLocaleLowerCase()));
  let index=1,name;const extension=uploadedExtension(node),stem=extension&&node.name.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase())?node.name.slice(0,-extension.length):node.name;
  do{const suffix=index===1?' · 副本':` · 副本 ${index}`;name=stem.slice(0,100-suffix.length-extension.length)+suffix+extension;index++;}while(names.has(name.toLocaleLowerCase()));return name;
}
export function relocateContent(state,{id,mode,spaceId,parentId='',name,expectedParentId,expectedSpaceId,expectedName},userId){
  const {node,ids,items}=relocationSource(state,id,mode,userId);
  if(expectedSpaceId!==undefined&&node.spaceId!==expectedSpaceId||expectedParentId!==undefined&&(node.parentId||'')!==expectedParentId||expectedName!==undefined&&node.name!==expectedName)throw Error('原内容的位置或名称已变化，请关闭后重新选择');
  validateDestination(state,{spaceId,parentId},userId);
  const reason=relocationTargetReason(state,items,mode,spaceId,userId);if(reason)throw Error(reason);
  if(ids.has(parentId))throw Error('不能选择原内容自身或其子目录');
  if(mode==='move'&&spaceId===node.spaceId&&parentId===(node.parentId||''))throw Error('当前位置未改变，请选择其他目录');
  const targetName=mode==='copy'?validateContentName(name||duplicateName(state,node,parentId,spaceId)):node.name;
  const extension=uploadedExtension(node);if(mode==='copy'&&extension&&!targetName.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase()))throw Error(`请保留原文件扩展名 ${extension}`);
  if(state.nodes.some(n=>!n.deletedAt&&n.spaceId===spaceId&&(n.parentId||'')===parentId&&n.name.trim().toLocaleLowerCase()===targetName.toLocaleLowerCase()))throw Error(mode==='copy'?'目标目录已有同名内容，请修改副本名称':'目标目录已有同名内容，请选择其他目录或先重命名原内容');
  const time=new Date().toISOString(),reset={inherit:true,permissionMode:'layered',localAccess:{subjects:[],visibility:'private',grants:{}},inheritedExclusions:[],access:undefined,acl:undefined,members:[],updatedAt:time};
  if(mode==='move'){
    const moving=new Set(items.map(n=>n.id));const nodes=state.nodes.map(n=>moving.has(n.id)?{...n,...reset,spaceId,...(n.id===id?{parentId}:{})}:n);
    return {state:{...state,nodes},node:nodes.find(n=>n.id===id)};
  }
  const mapping=new Map(items.map(n=>[n.id,crypto.randomUUID()]));
  const copies=items.map(n=>({...n,...reset,id:mapping.get(n.id),spaceId,parentId:n.id===id?parentId:mapping.get(n.parentId),name:n.id===id?targetName:n.name,ownerId:userId,favorite:false,deletedAt:'',deletedBy:undefined,deleteBatch:undefined,originalLocation:undefined,createdAt:time,sourceNodeId:n.id,sourceOwnerId:n.ownerId}));
  return {state:{...state,nodes:[...state.nodes,...copies]},node:copies.find(n=>n.id===mapping.get(id))};
}
