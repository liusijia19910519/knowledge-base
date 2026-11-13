import { activeNode, contentRights, librariesForView, libraryType, safeFolderTrail } from './access.js';
export function resultLocation(state,target,userId){
  if(!target||target.userId!==userId||state.viewAs!==userId)throw Error('当前用户已变化，请重新查找内容');
  if(target.entity==='space'){
    const library=librariesForView(state,userId).find(item=>item.id===target.id);if(!library)throw Error('该知识库已不可访问');
    return `/space/${library.id}?view=${libraryType(library)}`;
  }
  const ids=target.entity==='nodes'?target.ids:[target.id],node=ids.map(id=>state.nodes.find(item=>item.id===id)).find(item=>activeNode(state,item)&&contentRights(state,item,userId).view);
  if(!node)throw Error('结果已删除或没有查看权限，请重新查找');
  const library=state.spaces.find(item=>item.id===node.spaceId),view=libraryType(library),folder=safeFolderTrail(state,node.spaceId,userId,view,node.parentId).at(-1)||'';
  if(node.parentId&&folder!==node.parentId)throw Error('当前目录已不可访问，请重新查找');
  return `/space/${node.spaceId}?view=${view}${folder?`&folder=${folder}`:''}&locate=${node.id}`;
}
