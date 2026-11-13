import { activeNode, contentRights, libraryRights } from './access.js';

// Every operation that places content in a directory uses current edit rights.
export function validateContentDestination(state,{spaceId,parentId=''},userId){
  if(!spaceId)throw Error('请选择保存的知识库');
  const space=state.spaces.find(s=>s.id===spaceId);
  if(!space||space.deletedAt)throw Error('目标知识库已不存在或已删除，请重新选择');
  if(parentId){
    const parent=state.nodes.find(n=>n.id===parentId);
    if(!parent||parent.type!=='folder'||parent.spaceId!==spaceId||!activeNode(state,parent))throw Error('目标目录已不存在，请重新选择');
    if(!contentRights(state,parent,userId).edit)throw Error('没有目标目录的编辑权限，请另选位置');
  }else if(!libraryRights(state,space,userId).edit)throw Error('没有知识库根目录的编辑权限，请选择获授权的目录');
  return {spaceId,parentId};
}
