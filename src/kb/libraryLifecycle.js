import { responsibleId } from './ownership.js';
import { activeNode, contentRights, libraryRights } from './access.js';

const library=(state,id)=>state.spaces.find(space=>space.id===id);
export function libraryDeletionSnapshot(state,id){
  return JSON.stringify([library(state,id),state.nodes.filter(node=>node.spaceId===id).map(node=>[node.id,node.parentId,node.updatedAt,node.deletedAt,node.localAccess,node.inheritedExclusions])]);
}
export function deleteLibrary(state,id,userId,expected){
  const space=library(state,id);
  if(!space||space.deletedAt||!libraryRights(state,space,userId).manage)throw Error('当前没有删除知识库的管理权限');
  if(expected&&libraryDeletionSnapshot(state,id)!==expected)throw Error('知识库或其中内容已变化，请取消后重新确认删除');
  const active=state.nodes.filter(node=>node.spaceId===id&&activeNode(state,node));
  if(active.some(node=>!contentRights(state,node,userId).manage))throw Error('部分内容缺少管理权限，未删除知识库');
  const ids=new Set(active.map(node=>node.id)),batch=crypto.randomUUID(),time=new Date().toISOString();
  return {...state,spaces:state.spaces.map(item=>item.id===id?{...item,deletedAt:time,deletedBy:userId,deleteBatch:batch}:item),nodes:state.nodes.map(node=>ids.has(node.id)?{...node,deletedAt:time,deletedBy:userId,deleteBatch:batch,libraryDeleteBatch:batch}:node)};
}
export function restoreLibrary(state,id,userId){
  const space=library(state,id);
  if(!space?.deletedAt||!libraryRights(state,space,userId,true).manage)throw Error('当前没有恢复知识库的管理权限');
  if(state.spaces.some(item=>item.id!==id&&!item.deletedAt&&responsibleId(item)===responsibleId(space)&&item.name.trim().toLocaleLowerCase()===space.name.trim().toLocaleLowerCase()))throw Error('已存在同名知识库，请先重命名现有知识库后再恢复');
  return {...state,spaces:state.spaces.map(item=>item.id===id?{...item,deletedAt:'',deletedBy:undefined,deleteBatch:undefined}:item),nodes:state.nodes.map(node=>node.spaceId===id&&space.deleteBatch&&node.libraryDeleteBatch===space.deleteBatch?{...node,deletedAt:'',deletedBy:undefined,deleteBatch:undefined,libraryDeleteBatch:undefined}:node)};
}
export function permanentlyDeleteLibrary(state,id,userId){
  const space=library(state,id);
  if(!space?.deletedAt||!libraryRights(state,space,userId,true).manage)throw Error('当前没有彻底删除知识库的管理权限');
  if(state.nodes.some(node=>node.spaceId===id&&!contentRights(state,node,userId,true).manage))throw Error('部分内容缺少管理权限，未彻底删除知识库');
  // Keep original Blob storage: copies outside this library can still reference it.
  return {...state,spaces:state.spaces.filter(item=>item.id!==id),nodes:state.nodes.filter(node=>node.spaceId!==id)};
}
