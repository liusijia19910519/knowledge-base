import { activeNode, contentRights, contentTree, deleteContent } from './access.js';
import { relocationSource, relocateContent, duplicateName, relocationTargetReason } from './contentOperations.js';
import { validateDestination, writableFolders, writableLibraries } from './contentCreation.js';
import { libraryRights, libraryType } from './access.js';

export function favorites(state,userId){return state.favoritesByUser?.[userId]||(!state.favoritesByUser&&userId===state.meId?state.nodes.filter(n=>n.favorite).map(n=>n.id):[]);}
export function setFavorite(state,id,userId){const node=state.nodes.find(n=>n.id===id);if(!contentRights(state,node,userId).view)throw Error('当前没有查看权限');const migrated=state.favoritesByUser||{[state.meId]:favorites(state,state.meId)},ids=favorites(state,userId);return {...state,favoritesByUser:{...migrated,[userId]:ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]}};}
export function printable(node){return node?.type!=='folder'&&(node.format!=='file'||/^(image\/|text\/|application\/pdf)/.test(node.mime||'')||/\.(txt|md|csv|json|log|png|jpe?g|gif|webp|pdf)$/i.test(node.fileName||''));}
export function actionReason(state,node,userId,action){
  if(!activeNode(state,node))return '原内容已不存在或已删除';const rights=contentRights(state,node,userId);
  const required={open:'view',favorite:'view',info:'view',locate:'view',rename:'edit',edit:'edit',permissions:'manage',share:'manage',download:'download',print:'download',delete:'manage',move:'manage',copy:'download'}[action];
  if(required&&!rights[required])return {view:'需要查看权限',edit:'需要编辑权限',manage:'需要管理权限',download:'需要查看并下载权限'}[required];
  if(action==='permissions'&&libraryType(state.spaces.find(space=>space.id===node.spaceId))==='personal')return '个人内容仅自己可见，无需配置权限';
  if(['download','print','copy'].includes(action)&&!rights.view)return '需要查看权限';
  if(action==='print'&&!printable(node))return '此格式不支持在线打印';
  if(action==='edit'&&(node.type==='folder'||node.format==='file'))return '此格式不支持在线编辑';
  try{
    if(action==='copy'||action==='move'){
      const items=relocationSource(state,node.id,action,userId).items,blocked=contentTree(state,node);
      const possible=writableLibraries(state,userId).some(space=>!relocationTargetReason(state,items,action,space.id,userId)&&[...(libraryRights(state,space,userId).edit?['']:[]),...writableFolders(state,space.id,userId).map(n=>n.id)].some(id=>!blocked.has(id)&&(action==='copy'||space.id!==node.spaceId||id!==(node.parentId||''))));
      if(!possible)return '没有符合权限要求的目标目录';
    }
    if(action==='delete'||action==='download')for(const n of state.nodes.filter(n=>contentTree(state,node).has(n.id)&&activeNode(state,n))){const r=contentRights(state,n,userId);if(action==='delete'?!r.manage:!r.view||!r.download)return action==='delete'?'部分子内容缺少管理权限':'部分子内容缺少查看或下载权限';}
  }catch(error){return error.message;}
  return '';
}
export function selectionRoots(state,ids,spaceId){
  if(!ids.length)throw Error('请先选择内容');const unique=[...new Set(ids)],nodes=unique.map(id=>state.nodes.find(n=>n.id===id));
  if(nodes.some(n=>!activeNode(state,n)))throw Error('部分内容已删除或失效，请重新选择');
  if(nodes.some(n=>n.spaceId!==spaceId))throw Error('只能操作当前知识库内的内容');
  return nodes.filter(n=>!nodes.some(parent=>parent.id!==n.id&&contentTree(state,parent).has(n.id)));
}
export const sourceLocations=(state,ids)=>Object.fromEntries(ids.map(id=>{const n=state.nodes.find(n=>n.id===id);return [id,{spaceId:n?.spaceId,parentId:n?.parentId||'',name:n?.name}];}));
export function batchPreflight(state,{ids,spaceId,sourceSpaceId=spaceId,targetSpaceId=spaceId,action,parentId,expected},userId){
  const roots=selectionRoots(state,ids,sourceSpaceId),blocked=new Set(roots.flatMap(n=>[...contentTree(state,n)])),items=state.nodes.filter(n=>blocked.has(n.id)&&activeNode(state,n));
  for(const node of roots){
    if(expected?.[node.id]&&JSON.stringify(expected[node.id])!==JSON.stringify({spaceId:node.spaceId,parentId:node.parentId||'',name:node.name}))throw Error('原内容的位置或名称已变化，请关闭后重新选择');
    if(['move','copy'].includes(action))relocationSource(state,node.id,action,userId);else {const reason=actionReason(state,node,userId,action);if(reason)throw Error(reason);}
  }
  if(parentId===undefined&&['move','copy'].includes(action)){
    const possible=writableLibraries(state,userId).some(library=>!relocationTargetReason(state,items,action,library.id,userId)&&[...(libraryRights(state,library,userId).edit?['']:[]),...writableFolders(state,library.id,userId).map(n=>n.id)].some(id=>!blocked.has(id)&&(action==='copy'||roots.every(n=>library.id!==n.spaceId||(n.parentId||'')!==id))));
    if(!possible)throw Error('没有可用于整批操作的目标目录');
  }
  if(parentId!==undefined&&['move','copy'].includes(action)){
    validateDestination(state,{spaceId:targetSpaceId,parentId},userId);
    const reason=relocationTargetReason(state,items,action,targetSpaceId,userId);if(reason)throw Error(reason);
    if(blocked.has(parentId))throw Error('不能选择原内容自身或其子目录');
    if(action==='move'){
      if(roots.some(n=>n.spaceId===targetSpaceId&&(n.parentId||'')===parentId))throw Error('部分内容已在目标目录，请选择其他位置');
      const names=new Set();for(const n of roots){const key=n.name.trim().toLocaleLowerCase();if(names.has(key)||state.nodes.some(x=>!x.deletedAt&&x.spaceId===targetSpaceId&&(x.parentId||'')===parentId&&x.name.trim().toLocaleLowerCase()===key))throw Error('目标目录存在同名内容，未执行移动');names.add(key);}
    }
  }
  return roots;
}
export function performBatch(state,request,userId){
  if(!['move','copy','delete'].includes(request.action))throw Error('不支持的批量操作');
  const roots=batchPreflight(state,request,userId);let next=state;const result=[],targetSpaceId=request.targetSpaceId||request.spaceId;
  for(const node of roots){
    if(request.action==='delete')next=deleteContent(next,node.id,userId);
    else {const moved=relocateContent(next,{id:node.id,mode:request.action,spaceId:targetSpaceId,parentId:request.parentId,name:request.action==='copy'?duplicateName(next,node,request.parentId,targetSpaceId):undefined,expectedSpaceId:node.spaceId,expectedParentId:node.parentId||'',expectedName:node.name},userId);next=moved.state;result.push(moved.node);}
  }
  return {state:next,nodes:result};
}
