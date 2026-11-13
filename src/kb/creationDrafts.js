import { validateDestination } from './contentCreation.js';
import { creatorId } from './ownership.js';
export function commitCreationDraft(state,node,userId){
  if(!node.creationDraft)return node;
  if((node.draftOwnerId||creatorId(node))!==userId)throw Error('只能保存自己的新建草稿');
  validateDestination(state,{spaceId:node.spaceId,parentId:node.parentId||''},userId);
  if(state.nodes.some(other=>other.id!==node.id&&!other.deletedAt&&other.spaceId===node.spaceId&&(other.parentId||'')===(node.parentId||'')&&other.name.trim().toLocaleLowerCase()===node.name.trim().toLocaleLowerCase()))throw Error('目标目录已有同名内容，请先重命名草稿');
  const {creationDraft,draftOwnerId,creationDraftBody,draftUpdatedAt,...saved}=node;return saved;
}
export function abandonCreationDraft(state,id,userId){
  const node=state.nodes.find(n=>n.id===id);
  if(!node?.creationDraft||(node.draftOwnerId||creatorId(node))!==userId)throw Error('草稿状态已变化，未执行放弃');
  const filterMap=(map,objects=false)=>map?Object.fromEntries(Object.entries(map).map(([key,items])=>[key,(Array.isArray(items)?items:[]).filter(item=>(objects?item.id:item)!==id)])):map;
  return {...state,nodes:state.nodes.filter(n=>n.id!==id),recents:(state.recents||[]).filter(value=>value!==id),recentVisitsByUser:filterMap(state.recentVisitsByUser,true),favoritesByUser:filterMap(state.favoritesByUser)};
}
