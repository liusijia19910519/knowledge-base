import { accessFromSubjects, legacyRights, PERMISSION_ROLES, subjectExists, subjectKey, subjectMatches, subjectRights, subjectVisibility, toSubjectAccess, mergeSubjects } from './permissions.js';
export const ACCESS_VERSION=2;
export const CAPABILITIES=[['view','查看'],['edit','编辑'],['share','分享'],['manage','管理'],['download','下载']];
export const ALL_RIGHTS={view:true,edit:true,share:true,manage:true,download:true};
export const NO_RIGHTS={view:false,edit:false,share:false,manage:false,download:false};
export const SCOPE_LABELS={private:'仅自己',members:'指定成员',public:'全员可见'};
export const VIEW_LABELS={personal:'我的完整内容',shared:'共享内容',plaza:'全员可见内容'};
export const hasRights=r=>CAPABILITIES.some(([k])=>r?.[k]);
const copy=value=>JSON.parse(JSON.stringify(value));
const fromRole=role=>legacyRights({view:['viewer','downloader','editor','manager'].includes(role),edit:['editor','manager'].includes(role),share:role==='manager',manage:role==='manager'});
const cleanGrants=grants=>Object.fromEntries(Object.entries(grants||{}).map(([id,r])=>[id,legacyRights(r)]));
const currentAccess=(state,access)=>Array.isArray(access.subjects)?{...access,visibility:subjectVisibility(state,access.subjects)}:access;
function legacySpace(state,space){
  if(space.personal||space.kind==='personal')return {visibility:'private',grants:{}};
  let grants={};
  if(space.acl)grants=cleanGrants(space.acl);
  else for(const m of state.members||[]){const direct=space.members?.find(x=>x.type==='staff'&&x.id===m.id),role=state.teams?.find(t=>t.id===space.teamId)?.members?.[m.id];const inherited=role==='manager'?(space.managerInherit||'manager'):role&&role!=='none'?(space.memberInherit==='default'?role:space.memberInherit||'none'):'none';const rights=fromRole(direct?.role||inherited);if(hasRights(rights))grants[m.id]=rights;}
  const published=(space.kind==='plaza'&&space.status==='published')||(space.visibility==='public'&&space.status!=='draft');
  return {visibility:published?'public':Object.entries(grants).some(([id,r])=>id!==space.ownerId&&hasRights(r))?'members':'private',grants};
}
export function spaceAccess(state,space){return currentAccess(state,space?.access|| (space?legacySpace(state,space):{visibility:'private',grants:{}}));}
export function activeNode(state,node,includeDeleted=false){
  if(!node)return false;const space=state.spaces.find(s=>s.id===node.spaceId);if(!space||(!includeDeleted&&space.deletedAt))return false;
  let cursor=node;const seen=new Set();
  while(cursor){if(seen.has(cursor.id)||cursor.spaceId!==space.id||(!includeDeleted&&cursor.deletedAt))return false;seen.add(cursor.id);if(!cursor.parentId)return true;cursor=state.nodes.find(n=>n.id===cursor.parentId);if(!cursor||cursor.type!=='folder')return false;}
  return false;
}
export function parentAccess(state,node){const parent=node?.parentId?state.nodes.find(n=>n.id===node.parentId):null;return parent?effectiveAccess(state,parent):spaceAccess(state,state.spaces.find(s=>s.id===node?.spaceId));}
export function effectiveAccess(state,node,seen=new Set()){
  if(!node||seen.has(node.id))return {visibility:'private',grants:{}};seen.add(node.id);
  if(node.permissionMode==='layered'){
    const parent=node.parentId?state.nodes.find(n=>n.id===node.parentId):null;
    const base=toSubjectAccess(state,parent?effectiveAccess(state,parent,seen):spaceAccess(state,state.spaces.find(s=>s.id===node.spaceId)));
    const excluded=new Set((node.inheritedExclusions||[]).map(subjectKey));
    return accessFromSubjects(state,mergeSubjects(base.subjects.filter(s=>!excluded.has(subjectKey(s))),node.localAccess?.subjects||[]));
  }
  if(node.inherit===false){if(node.access)return currentAccess(state,node.access);const grants=node.acl?cleanGrants(node.acl):Object.fromEntries((node.members||[]).filter(m=>m.type==='staff').map(m=>[m.id,fromRole(m.role)]));return {visibility:Object.entries(grants).some(([id,r])=>id!==node.ownerId&&hasRights(r))?'members':'private',grants};}
  const parent=node.parentId?state.nodes.find(n=>n.id===node.parentId):null;
  return parent?effectiveAccess(state,parent,seen):spaceAccess(state,state.spaces.find(s=>s.id===node.spaceId));
}
function applyAccess(state,access,userId){
  if(Array.isArray(access.subjects)){const r={...NO_RIGHTS};for(const s of access.subjects)if(subjectMatches(state,s,userId)){const rights=subjectRights(s);for(const [k] of CAPABILITIES)r[k]=r[k]||rights[k];}return r;}
  const r=legacyRights(access.grants?.[userId]);if(access.visibility==='private')return {...NO_RIGHTS};if(access.visibility==='public'){r.view=true;r.download=access.publicDownload??true;}return r;
}
export function libraryRights(state,space,userId,includeDeleted=false){if(!space||(!includeDeleted&&space.deletedAt))return {...NO_RIGHTS};return space.ownerId===userId?{...ALL_RIGHTS}:applyAccess(state,spaceAccess(state,space),userId);}
export function contentRights(state,node,userId,includeDeleted=false){
  if(!activeNode(state,node,includeDeleted))return {...NO_RIGHTS};const space=state.spaces.find(s=>s.id===node.spaceId);
  if(space.ownerId===userId||node.ownerId===userId)return {...ALL_RIGHTS};
  const r=applyAccess(state,effectiveAccess(state,node),userId);if(node.permissionMode!=='layered'&&libraryRights(state,space,userId,includeDeleted).manage)r.manage=true;return r;
}
export function migrateAccess(state){
  if(state.accessModelVersion===ACCESS_VERSION&&state.nodes.every(n=>n.permissionMode==='layered'))return state;
  const migrated={...state,spaces:state.spaces.map(s=>({...s,access:copy(spaceAccess(state,s))})),nodes:state.nodes.map(n=>({...n}))};
  for(const node of migrated.nodes){
    if(node.access)continue;
    const space=migrated.spaces.find(s=>s.id===node.spaceId);let cursor=node,pending=false,seen=new Set();
    while(cursor&&!seen.has(cursor.id)){seen.add(cursor.id);pending=pending||!!cursor.publicationPending;cursor=migrated.nodes.find(n=>n.id===cursor.parentId);}
    if(pending){const base=node.inherit===false?effectiveAccess(state,node):{visibility:'members',grants:cleanGrants(space?.acl||{})};node.access={...copy(base),visibility:Object.entries(base.grants).some(([id,r])=>id!==node.ownerId&&hasRights(r))?'members':'private'};node.inherit=false;}
    else if(node.inherit===false){node.access=copy(effectiveAccess(state,node));if(state.businessVersion===1&&space?.access.visibility==='public')node.access.visibility='public';}
  }
  migrated.nodes=migrated.nodes.map(node=>{
    if(node.permissionMode==='layered')return node;
    const owners=[node.ownerId,migrated.spaces.find(s=>s.id===node.spaceId)?.ownerId];
    let cursor=node,pending=false,seen=new Set();while(cursor&&!seen.has(cursor.id)){seen.add(cursor.id);pending ||= !!cursor.publicationPending;cursor=migrated.nodes.find(n=>n.id===cursor.parentId);}
    return {...node,permissionMode:'layered',localAccess:node.inherit===false?toSubjectAccess(migrated,node.access||effectiveAccess(state,node),owners):accessFromSubjects(migrated,[]),inheritedExclusions:pending?toSubjectAccess(migrated,parentAccess(migrated,node)).subjects.map(({type,id})=>({type,id})):[]};
  });
  return {...migrated,accessModelVersion:ACCESS_VERSION};
}
export function permissionLayers(state,node){
  const owners=[node.ownerId,state.spaces.find(s=>s.id===node.spaceId)?.ownerId];
  const inherited=toSubjectAccess(state,parentAccess(state,node),owners);
  const local=toSubjectAccess(state,node.permissionMode==='layered'?node.localAccess||accessFromSubjects(state,[]):node.inherit===false?effectiveAccess(state,node):accessFromSubjects(state,[]),owners);
  return {inherited,local,excluded:node.inheritedExclusions||[]};
}
export function actualNodes(state,space,userId,view='all'){
  if(!space||space.deletedAt||(view==='personal'&&space.ownerId!==userId))return [];
  return state.nodes.filter(n=>n.spaceId===space.id&&activeNode(state,n)&&((view==='personal')||(contentRights(state,n,userId).view||contentRights(state,n,userId).manage))&&(view==='shared'?effectiveAccess(state,n).visibility==='members':view==='plaza'?effectiveAccess(state,n).visibility==='public':true));
}
export function projectedEntries(state,space,userId,view='all',parentId=''){
  const nodes=actualNodes(state,space,userId,view),actual=new Set(nodes.map(n=>n.id)),paths=new Set();
  for(const node of nodes){let id=node.parentId;const seen=new Set();while(id&&!seen.has(id)){seen.add(id);paths.add(id);id=state.nodes.find(n=>n.id===id)?.parentId;}}
  return state.nodes.filter(n=>n.spaceId===space.id&&(n.parentId||'')===parentId&&(actual.has(n.id)||paths.has(n.id))).map(n=>({...n,pathOnly:!actual.has(n.id)}));
}
export function safeFolderTrail(state,spaceId,userId,view,folderId){
  if(!folderId)return [];const space=state.spaces.find(s=>s.id===spaceId),folder=state.nodes.find(n=>n.id===folderId);
  if(!space||folder?.type!=='folder'||folder.spaceId!==spaceId||!activeNode(state,folder))return [];
  const real=actualNodes(state,space,userId,view);let allowed=real.some(n=>n.id===folderId);
  if(!allowed)allowed=real.some(n=>{let id=n.parentId,seen=new Set();while(id&&!seen.has(id)){seen.add(id);if(id===folderId)return true;id=state.nodes.find(x=>x.id===id)?.parentId;}return false;});
  if(!allowed)return [];const trail=[];let current=folder;while(current){trail.unshift(current.id);current=state.nodes.find(n=>n.id===current.parentId);}return trail;
}
export function libraryStats(state,space,userId,view='all'){
  const all=state.nodes.filter(n=>n.spaceId===space.id&&activeNode(state,n)),nodes=actualNodes(state,space,userId,view);
  return {count:nodes.length,total:all.length,partial:nodes.length<all.length,shared:all.filter(n=>effectiveAccess(state,n).visibility==='members').length,public:all.filter(n=>effectiveAccess(state,n).visibility==='public').length};
}
export function librariesForView(state,userId,view='all'){
  return state.spaces.filter(s=>{
    if(s.deletedAt)return false;if(view==='personal')return s.ownerId===userId;
    const nodes=actualNodes(state,s,userId,view);if(nodes.length)return true;
    const empty=!state.nodes.some(n=>n.spaceId===s.id&&activeNode(state,n)),access=spaceAccess(state,s),r=libraryRights(state,s,userId);
    return empty&&(r.view||r.manage)&&(view==='shared'?access.visibility==='members':view==='plaza'?access.visibility==='public':true);
  });
}
export function validView(state,space,userId,view){return ['personal','shared','plaza'].includes(view)?view:space?.ownerId===userId?'personal':actualNodes(state,space,userId,'shared').length?'shared':actualNodes(state,space,userId,'plaza').length||spaceAccess(state,space).visibility==='public'?'plaza':'shared';}
export function contentView(state,node,userId,preferred){const space=state.spaces.find(s=>s.id===node.spaceId),scope=effectiveAccess(state,node).visibility;if(preferred==='personal'&&space?.ownerId===userId||preferred==='shared'&&scope==='members'||preferred==='plaza'&&scope==='public')return preferred;return space?.ownerId===userId?'personal':scope==='public'?'plaza':'shared';}
export function scopeSummary(access){const count=access.subjects?.length??Object.values(access.grants||{}).filter(hasRights).length;return `${SCOPE_LABELS[access.visibility]}${access.visibility==='members'?` · ${count} 个授权对象`:''}`;}
export function validateAccess(state,access,ownerIds=[]){
  if(Array.isArray(access?.subjects)){
    const seen=new Set(),subjects=access.subjects.filter(s=>!(s.type==='person'&&ownerIds.includes(s.id))).map(s=>{
      if(!subjectExists(state,s))throw Error('部分公司、部门或人员已失效，请重新选择');
      const key=subjectKey(s);if(seen.has(key))throw Error('同一授权对象不能重复添加');seen.add(key);
      if(!PERMISSION_ROLES.some(([role])=>role===s.role)&&s.role!=='legacy')throw Error('请选择有效权限');
      return {type:s.type,id:s.id,role:s.role,...(s.role==='legacy'?{rights:legacyRights(s.rights)}:{})};
    });return accessFromSubjects(state,subjects);
  }
  if(!['private','members','public'].includes(access?.visibility))throw Error('请选择有效的可见范围');
  const grants=cleanGrants(access.grants);
  for(const id of Object.keys(grants))if(!state.members.some(m=>m.id===id))throw Error('只能授权给系统内部成员');
  for(const id of ownerIds)delete grants[id];
  if(access.visibility==='members'&&!Object.values(grants).some(hasRights))throw Error('请至少添加一位成员并分配权限');
  return {visibility:access.visibility,grants:access.visibility==='private'?{}:grants};
}
export function accessFingerprint(state,item,entity){return JSON.stringify([item?.ownerId,item?.access,item?.inherit,item?.localAccess,item?.inheritedExclusions,entity==='node'?parentAccess(state,item):null]);}
export function saveEntityAccess(state,{id,entity='node',access,inherit=false,expected,localAccess,inheritedExclusions},userId){
  const collection=entity==='space'?'spaces':'nodes',item=state[collection].find(n=>n.id===id);
  const rights=entity==='space'?libraryRights(state,item,userId):contentRights(state,item,userId);
  if(!item||item.deletedAt||!rights.manage)throw Error('当前没有管理权限，无法调整授权');
  if(expected&&accessFingerprint(state,item,entity)!==expected)throw Error('权限已在其他页面发生变化，请关闭后重新打开核对');
  const ownerIds=[item.ownerId,entity==='node'?state.spaces.find(s=>s.id===item.spaceId)?.ownerId:item.ownerId];
  if(entity==='node'&&(localAccess!==undefined||item.permissionMode==='layered')){
    const nextAccess=validateAccess(state,localAccess??(inherit?accessFromSubjects(state,[]):access),ownerIds);
    const seen=new Set(),excluded=(inheritedExclusions??item.inheritedExclusions??[]).filter(s=>['company','department','person'].includes(s.type)&&typeof s.id==='string'&&!(s.type==='person'&&ownerIds.includes(s.id))).filter(s=>{const key=subjectKey(s);if(seen.has(key))return false;seen.add(key);return true;}).map(({type,id})=>({type,id}));
    return {...state,nodes:state.nodes.map(n=>n.id===id?{...n,permissionMode:'layered',localAccess:nextAccess,inheritedExclusions:excluded,updatedAt:new Date().toISOString()}:n)};
  }
  const nextAccess=entity==='node'&&inherit?item.access:validateAccess(state,access,ownerIds);
  return {...state,[collection]:state[collection].map(n=>n.id===id?{...n,access:nextAccess,...(entity==='node'?{inherit}:{}),updatedAt:new Date().toISOString()}:n)};
}
export function creationAccess(state,fields){
  return {inherit:true,access:parentAccess(state,fields)};
}
export function restorableAccess(state,node){return effectiveAccess(state,node);}
export function contentTree(state,node){const ids=new Set([node.id]);let size=-1;while(ids.size!==size){size=ids.size;for(const n of state.nodes)if(n.spaceId===node.spaceId&&ids.has(n.parentId))ids.add(n.id);}return ids;}
export function deleteContent(state,nodeId,userId){const node=state.nodes.find(n=>n.id===nodeId);if(!node||!contentRights(state,node,userId).manage)throw Error('没有删除此内容的管理权限');const ids=contentTree(state,node),affected=state.nodes.filter(n=>ids.has(n.id)&&!n.deletedAt);if(affected.some(n=>!contentRights(state,n,userId).manage))throw Error('目录中存在不能管理的内容，未执行删除');const time=new Date().toISOString(),batch=crypto.randomUUID();return {...state,nodes:state.nodes.map(n=>affected.some(x=>x.id===n.id)?{...n,deletedAt:time,deletedBy:userId,deleteBatch:batch}:n)};}
export function restoreContent(state,nodeId,userId){const node=state.nodes.find(n=>n.id===nodeId);if(!node?.deletedAt||!contentRights(state,node,userId,true).manage)throw Error('当前无权恢复此内容');const space=state.spaces.find(s=>s.id===node.spaceId);if(space?.deletedAt)throw Error('请先恢复所属知识库');if(node.parentId&&!activeNode(state,state.nodes.find(n=>n.id===node.parentId)))throw Error('请先恢复上级目录');const ids=contentTree(state,node),affected=state.nodes.filter(n=>ids.has(n.id)&&n.deletedAt&&(n.id===node.id||node.deleteBatch&&n.deleteBatch===node.deleteBatch));if(affected.some(n=>state.nodes.some(x=>!x.deletedAt&&x.spaceId===n.spaceId&&(x.parentId||'')===(n.parentId||'')&&x.name.trim().toLocaleLowerCase()===n.name.trim().toLocaleLowerCase())))throw Error('原位置已有同名内容，无法恢复，请先重命名原位置内容');return {...state,nodes:state.nodes.map(n=>affected.some(x=>x.id===n.id)?{...n,deletedAt:'',deleteBatch:undefined}:n)};}
