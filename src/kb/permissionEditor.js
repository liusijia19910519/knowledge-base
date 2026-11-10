import { ALL, NONE, RIGHTS, accessible, fileRights, libraryRights } from './businessData.js';

export const permissionPresets = [
  {name:'仅查看',description:'阅读、预览和下载，不授予其他能力',rights:{...NONE,view:true}},
  {name:'可编辑',description:'查看并编辑，不授予分享或管理',rights:{...NONE,view:true,edit:true}},
];
export function permissionLabel(rights) {
  const preset=permissionPresets.find(p=>RIGHTS.every(([k])=>!!p.rights[k]===!!rights[k]));
  return preset?.name || (accessible(rights)?'自定义权限':'未授予权限');
}
// Display effective rights without allowing implicit creator/manager/public grants to be revoked.
export function permissionPolicy(state,item,entity,memberId,inherit=false,requiredViewer='') {
  const library=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId);
  const libRights=libraryRights(state,library,memberId);
  const effective=entity==='space'?libRights:fileRights(state,item,memberId);
  const inherited=entity==='node'&&inherit;
  const manager=entity==='node'&&libRights.manage;
  let pending=!!item.publicationPending,cursor=entity==='node'?item:null,seen=new Set();
  while(cursor?.parentId&&!seen.has(cursor.id)) {seen.add(cursor.id);cursor=state.nodes.find(n=>n.id===cursor.parentId);pending=pending||!!cursor?.publicationPending;}
  const owner=library?.ownerId===memberId || (entity==='node'&&item.ownerId===memberId&&(accessible(libRights)||(library?.kind==='plaza'&&library.status==='published'&&pending)));
  const publicView=library?.kind==='plaza'&&library.status==='published'&&!pending;
  const locks={view:publicView||memberId===requiredViewer,manage:!!manager};
  return {owner,inherited,manager,publicView,effective,locks,
    removeDisabled:owner||inherited||manager||memberId===requiredViewer,
    apply:rights=>owner?{...ALL}:inherited?{...effective}:Object.fromEntries(RIGHTS.map(([k])=>[k,!!(locks[k]||rights[k])]))};
}
