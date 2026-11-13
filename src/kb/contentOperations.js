import { recordSharePlacement } from './sharing.js';
import { creatorId, responsibleId, isOrganizationContent } from './ownership.js';
import { activeNode, contentRights, contentTree, libraryType, parentAccess } from './access.js';
import { validateContentName, validateDestination, uploadedExtension } from './contentCreation.js';

export function relocationSource(state,id,mode,userId){
  if(!['move','copy'].includes(mode))throw Error('请选择移动或复制');
  const node=state.nodes.find(n=>n.id===id);if(!activeNode(state,node))throw Error('原内容已不存在或已删除，请重新打开');
  const ids=contentTree(state,node),items=state.nodes.filter(n=>ids.has(n.id)&&activeNode(state,n)),capability=mode==='move'?'manage':'view';
  if(items.some(n=>n.creationDraft))throw Error('包含尚未首次保存的新建草稿，请先保存或放弃草稿');
  if(items.some(n=>!contentRights(state,n,userId)[capability]))throw Error(mode==='move'?'需要管理原内容及全部子内容才能移动':'需要查看原内容及全部子内容才能复制');
  if(mode==='copy'&&items.some(n=>!contentRights(state,n,userId).download))throw Error('需要全部源内容的查看并下载权限，不能通过复制绕过下载限制');
  return {node,ids,items};
}
export function relocationTargetReason(state,items,mode,spaceId,userId){
  const library=state.spaces.find(s=>s.id===spaceId);if(!library||library.deletedAt)return '目标知识库已不可用';
  if(libraryType(library)==='personal'){
    if(responsibleId(library)!==userId)return '只能选择自己的个人知识库';
    if(mode==='move'&&items.some(n=>isOrganizationContent(state,n)))return '组织原件不能移入个人知识库，请选择共享知识库或知识广场；有下载权限时可保留个人副本';
    if(mode==='move'&&items.some(n=>creatorId(n)!==userId))return '包含非本人创建的个人内容，不能移动到个人知识库';
  }
  return '';
}
export function duplicateName(state,node,parentId=node.parentId||'',targetSpaceId=node.spaceId){
  const names=new Set(state.nodes.filter(n=>n.spaceId===targetSpaceId&&!n.deletedAt&&(n.parentId||'')===parentId).map(n=>n.name.trim().toLocaleLowerCase()));
  let index=1,name;const extension=uploadedExtension(node),stem=extension&&node.name.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase())?node.name.slice(0,-extension.length):node.name;
  do{const suffix=index===1?' · 副本':` · 副本 ${index}`;name=stem.slice(0,100-suffix.length-extension.length)+suffix+extension;index++;}while(names.has(name.toLocaleLowerCase()));return name;
}
export function relocateContent(state,{id,mode,spaceId,parentId='',name,expectedParentId,expectedSpaceId,expectedName,expectedTargetAccess},userId){
  const {node,ids,items}=relocationSource(state,id,mode,userId);
  if(expectedSpaceId!==undefined&&node.spaceId!==expectedSpaceId||expectedParentId!==undefined&&(node.parentId||'')!==expectedParentId||expectedName!==undefined&&node.name!==expectedName)throw Error('原内容的位置或名称已变化，请关闭后重新选择');
  validateDestination(state,{spaceId,parentId},userId);
  if(expectedTargetAccess&&JSON.stringify(parentAccess(state,{spaceId,parentId}))!==expectedTargetAccess)throw Error('目标目录权限已变化，请重新核对移动提示');
  const reason=relocationTargetReason(state,items,mode,spaceId,userId);if(reason)throw Error(reason);
  if(ids.has(parentId))throw Error('不能选择原内容自身或其子目录');
  if(mode==='move'&&spaceId===node.spaceId&&parentId===(node.parentId||''))throw Error('当前位置未改变，请选择其他目录');
  const targetName=mode==='copy'?validateContentName(name||duplicateName(state,node,parentId,spaceId)):node.name;
  const extension=uploadedExtension(node);if(mode==='copy'&&extension&&!targetName.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase()))throw Error(`请保留原文件扩展名 ${extension}`);
  if(state.nodes.some(n=>!n.deletedAt&&n.spaceId===spaceId&&(n.parentId||'')===parentId&&n.name.trim().toLocaleLowerCase()===targetName.toLocaleLowerCase()))throw Error(mode==='copy'?'目标目录已有同名内容，请修改副本名称':'目标目录已有同名内容，请选择其他目录或先重命名原内容');
  const time=new Date().toISOString(),reset={inherit:true,permissionMode:'layered',localAccess:{subjects:[],visibility:'private',grants:{}},inheritedExclusions:[],access:undefined,acl:undefined,members:[],updatedAt:time};
  if(mode==='move'){
    const moving=new Set(items.map(n=>n.id));const nodes=state.nodes.map(n=>moving.has(n.id)?{...n,...reset,spaceId,ownership:libraryType(state.spaces.find(s=>s.id===spaceId))==='personal'?'personal':'organization',...(n.id===id?{parentId}:{})}:n);
    const shareAttribution={...state.shareAttribution},sharePlacements={...state.sharePlacements};for(const movedId of moving){delete shareAttribution[`node:${movedId}`];delete sharePlacements[movedId];}
    let next={...state,nodes,shareAttribution,sharePlacements};if(libraryType(state.spaces.find(s=>s.id===node.spaceId))==='personal'&&libraryType(state.spaces.find(s=>s.id===spaceId))!=='personal')next=recordSharePlacement(next,id,userId);
    return {state:next,node:nodes.find(n=>n.id===id)};
  }
  const mapping=new Map(items.map(n=>[n.id,crypto.randomUUID()]));
  const copies=items.map(n=>({...n,...reset,id:mapping.get(n.id),spaceId,parentId:n.id===id?parentId:mapping.get(n.parentId),name:n.id===id?targetName:n.name,ownerId:userId,creatorId:userId,responsibleId:userId,ownership:libraryType(state.spaces.find(s=>s.id===spaceId))==='personal'?'personal':'organization',favorite:false,deletedAt:'',deletedBy:undefined,deleteBatch:undefined,originalLocation:undefined,createdAt:time,lastHandover:undefined,sourceNodeId:n.id,sourceOwnerId:creatorId(n)}));
  return {state:{...state,nodes:[...state.nodes,...copies]},node:copies.find(n=>n.id===mapping.get(id))};
}
