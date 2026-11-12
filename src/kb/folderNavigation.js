import { contentRights, librariesForView, safeFolderTrail } from './access.js';
import { visitContent } from './personalization.js';

export function navigateFolder(state,spaceId,userId,view,folderId=''){
  if(!librariesForView(state,userId,view).some(space=>space.id===spaceId))throw Error('当前知识库已不可访问');
  const trail=safeFolderTrail(state,spaceId,userId,view,folderId);
  if(folderId&&trail.at(-1)!==folderId)throw Error('当前目录已不可访问');
  const node=state.nodes.find(item=>item.id===folderId);
  // A required ancestor is navigable, but does not acquire content rights or visits.
  return {trail,state:node&&contentRights(state,node,userId).view?visitContent(state,node.id,userId):state};
}
