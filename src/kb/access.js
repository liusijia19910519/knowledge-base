import { creatorId, responsibleId, isOrganizationContent, initializeOwnership } from './ownership.js';
import { validateContentDestination } from './destinations.js';
import { validateContentName, uploadedExtension } from './contentCreation.js';
import { accessFromSubjects, companyId, legacyRights, PERMISSION_ROLES, subjectExists, subjectKey, subjectMatches, subjectRights, toSubjectAccess, mergeSubjects } from './permissions.js';
export const ACCESS_VERSION=3;
export const LIBRARY_TYPES={personal:'个人知识库',shared:'共享知识库',plaza:'知识广场'};
export const libraryType=space=>space?.kind||'shared';
export const CAPABILITIES=[['view','查看'],['edit','编辑'],['share','分享'],['manage','管理'],['download','下载']];
export const ALL_RIGHTS={view:true,edit:true,share:true,manage:true,download:true};
export const NO_RIGHTS={view:false,edit:false,share:false,manage:false,download:false};
export const SCOPE_LABELS={private:'仅自己',members:'指定成员',public:'全员可见'};
export const VIEW_LABELS={personal:'个人内容',shared:'已获授权的共享内容',plaza:'全员可见内容'};
export const hasRights=r=>CAPABILITIES.some(([k])=>r?.[k]);
const empty=()=>({subjects:[],visibility:'private',grants:{}});
const manager=id=>({type:'person',id,role:'manager'});
function scopedAccess(state,subjects,ownerId,kind){const access=accessFromSubjects(state,subjects);if(kind==='personal'||!subjects.some(s=>!(s.type==='person'&&s.id===ownerId)))access.visibility='private';return access;}
export function activeNode(state,node,includeDeleted=false){
  if(!node)return false;const space=state.spaces.find(s=>s.id===node.spaceId);if(!space||(!includeDeleted&&space.deletedAt))return false;
  let cursor=node;const seen=new Set();
  while(cursor){if(seen.has(cursor.id)||cursor.spaceId!==space.id||(!includeDeleted&&cursor.deletedAt))return false;seen.add(cursor.id);if(!cursor.parentId)return true;cursor=state.nodes.find(n=>n.id===cursor.parentId);if(!cursor||cursor.type!=='folder')return false;}
  return false;
}
export function protectedManagers(state,item,entity='node'){
  if(!item)return [];
  const space=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId);if(!space)return [];
  const rows=new Map();
  const add=(id,source)=>{if(!id)return;const row=rows.get(id)||{id,sources:[]};if(!row.sources.includes(source))row.sources.push(source);rows.set(id,row);};
  add(responsibleId(space),'知识库负责人');
  if(libraryType(space)==='personal')return [...rows.values()];
  if(entity==='node'){
    add(responsibleId(item),item.type==='folder'?'本文件夹负责人':'文件负责人');
    let parent=item.parentId?state.nodes.find(n=>n.id===item.parentId):null;const seen=new Set([item.id]);
    while(parent&&parent.spaceId===space.id&&parent.type==='folder'&&!seen.has(parent.id)){seen.add(parent.id);add(responsibleId(parent),`上级文件夹「${parent.name}」负责人`);parent=state.nodes.find(n=>n.id===parent.parentId);}
  }
  return [...rows.values()];
}
export function libraryLocalAccess(state,space){return toSubjectAccess(state,space?.access||empty(),[responsibleId(space)]);}
export function plazaFloor(state,space){return libraryType(space)==='plaza'?[{type:'company',id:companyId(state),role:'viewer'}]:[];}
export function spaceAccess(state,space){
  if(!space)return empty();
  if(libraryType(space)==='personal')return scopedAccess(state,[manager(responsibleId(space))],responsibleId(space),'personal');
  return scopedAccess(state,mergeSubjects(libraryLocalAccess(state,space).subjects,plazaFloor(state,space),[manager(responsibleId(space))]),responsibleId(space),libraryType(space));
}
function ordinaryAccess(state,node,seen=new Set()){
  if(!node||seen.has(node.id))return empty();seen.add(node.id);
  const space=state.spaces.find(s=>s.id===node.spaceId);if(!space||libraryType(space)==='personal')return empty();
  const parent=state.nodes.find(n=>n.id===node.parentId&&n.spaceId===node.spaceId&&n.type==='folder');
  const inherited=parent?ordinaryAccess(state,parent,seen):libraryLocalAccess(state,space);
  const excluded=new Set((node.inheritedExclusions||[]).map(subjectKey));
  return accessFromSubjects(state,mergeSubjects(inherited.subjects.filter(s=>!excluded.has(subjectKey(s))),node.localAccess?.subjects||[]));
}
export function parentAccess(state,node){const parent=state.nodes.find(n=>n.id===node?.parentId&&n.spaceId===node?.spaceId&&n.type==='folder');return parent?effectiveAccess(state,parent):spaceAccess(state,state.spaces.find(s=>s.id===node?.spaceId));}
export function effectiveAccess(state,node){
  if(!node)return empty();if(node.creationDraft)return scopedAccess(state,[manager(node.draftOwnerId||creatorId(node))],node.draftOwnerId||creatorId(node),'personal');const space=state.spaces.find(s=>s.id===node.spaceId);if(!space)return empty();
  const protections=protectedManagers(state,node).map(row=>manager(row.id));
  if(libraryType(space)==='personal')return scopedAccess(state,protections,responsibleId(space),'personal');
  return scopedAccess(state,mergeSubjects(ordinaryAccess(state,node).subjects,plazaFloor(state,space),protections),responsibleId(node),libraryType(space));
}
function applyAccess(state,access,userId){const rights={...NO_RIGHTS};for(const s of access.subjects||[])if(subjectMatches(state,s,userId)){const r=subjectRights(s);for(const [key] of CAPABILITIES)rights[key] ||= !!r[key];}return rights;}
export function libraryRights(state,space,userId,includeDeleted=false){if(!space||(!includeDeleted&&space.deletedAt))return {...NO_RIGHTS};return applyAccess(state,spaceAccess(state,space),userId);}
export function contentRights(state,node,userId,includeDeleted=false){
  if(node?.creationDraft&&(node.draftOwnerId||creatorId(node))!==userId){const library=state.spaces.find(s=>s.id===node.spaceId);return {...NO_RIGHTS,manage:protectedManagers(state,node).some(row=>row.id===userId)||libraryRights(state,library,userId,includeDeleted).manage};}
  if(!activeNode(state,node,includeDeleted)){
    const space=state.spaces.find(s=>s.id===node?.spaceId);
    if(includeDeleted&&node?.deletedAt&&space&&(responsibleId(space)===userId||libraryType(space)!=='personal'&&(protectedManagers(state,node).some(row=>row.id===userId)||libraryRights(state,space,userId,true).manage)))return {...ALL_RIGHTS};
    return {...NO_RIGHTS};
  }
  if(node.creationDraft)return {...NO_RIGHTS,view:true,edit:true,manage:true};
  return applyAccess(state,effectiveAccess(state,node),userId);
}
// New prototype datasets use fixed types; no legacy permission migration is performed.
export function migrateAccess(state){const owned=initializeOwnership(state);return {...owned,accessModelVersion:ACCESS_VERSION,nodes:owned.nodes.map(n=>({...n,permissionMode:'layered',localAccess:n.localAccess||empty(),inheritedExclusions:n.inheritedExclusions||[]}))};}
export function permissionLayers(state,node){
  const space=state.spaces.find(s=>s.id===node.spaceId),protectedRows=protectedManagers(state,node),owners=protectedRows.map(row=>row.id);
  const parent=state.nodes.find(n=>n.id===node.parentId&&n.spaceId===node.spaceId&&n.type==='folder');
  return {inherited:toSubjectAccess(state,parent?ordinaryAccess(state,parent):libraryLocalAccess(state,space),owners),local:toSubjectAccess(state,node.localAccess||empty(),owners),excluded:(node.inheritedExclusions||[]).filter(s=>!(s.type==='person'&&owners.includes(s.id))),protectedRows,floor:plazaFloor(state,space),personal:libraryType(space)==='personal'};
}
export function actualNodes(state,space,userId,view='all'){
  if(!space||space.deletedAt||view!=='all'&&view!==libraryType(space))return [];
  return state.nodes.filter(n=>n.spaceId===space.id&&activeNode(state,n)&&contentRights(state,n,userId).view);
}
export function projectedEntries(state,space,userId,view='all',parentId=''){
  const nodes=actualNodes(state,space,userId,view),actual=new Set(nodes.map(n=>n.id)),paths=new Set();
  for(const node of nodes){let id=node.parentId;const seen=new Set();while(id&&!seen.has(id)){seen.add(id);paths.add(id);id=state.nodes.find(n=>n.id===id&&n.spaceId===space.id)?.parentId;}}
  return state.nodes.filter(n=>n.spaceId===space.id&&(n.parentId||'')===parentId&&(actual.has(n.id)||paths.has(n.id))).map(n=>({...n,pathOnly:!actual.has(n.id)}));
}
export function safeFolderTrail(state,spaceId,userId,view,folderId){
  if(!folderId)return [];const space=state.spaces.find(s=>s.id===spaceId),folder=state.nodes.find(n=>n.id===folderId);
  if(!space||folder?.type!=='folder'||folder.spaceId!==spaceId||!activeNode(state,folder))return [];
  const real=actualNodes(state,space,userId,view);let allowed=real.some(n=>n.id===folderId);
  if(!allowed)allowed=real.some(n=>{let id=n.parentId,seen=new Set();while(id&&!seen.has(id)){seen.add(id);if(id===folderId)return true;id=state.nodes.find(x=>x.id===id&&x.spaceId===spaceId)?.parentId;}return false;});
  if(!allowed)return [];const trail=[],seen=new Set();let current=folder;while(current&&!seen.has(current.id)){seen.add(current.id);trail.unshift(current.id);current=state.nodes.find(n=>n.id===current.parentId&&n.spaceId===spaceId);}return trail;
}
export function libraryStats(state,space,userId,view='all'){const all=state.nodes.filter(n=>n.spaceId===space.id&&activeNode(state,n)),nodes=actualNodes(state,space,userId,view);return {count:nodes.length,total:all.length,partial:nodes.length<all.length,shared:libraryType(space)==='shared'?nodes.length:0,public:libraryType(space)==='plaza'?nodes.length:0};}
export function librariesForView(state,userId,view='all'){return state.spaces.filter(space=>!space.deletedAt&&(view==='all'||libraryType(space)===view)&&(libraryRights(state,space,userId).view||actualNodes(state,space,userId).length>0));}
export function validView(state,space,userId,view){return libraryType(space);}
export function contentView(state,node,userId,preferred){return libraryType(state.spaces.find(s=>s.id===node?.spaceId));}
export function scopeSummary(access){return `${SCOPE_LABELS[access.visibility]}${access.visibility==='members'?` · ${access.subjects?.length||0} 个授权对象`:''}`;}
export function validateAccess(state,access,ownerIds=[]){
  const seen=new Set(),source=Array.isArray(access?.subjects)?access.subjects:toSubjectAccess(state,access||empty(),ownerIds).subjects;
  const subjects=source.filter(s=>!(s.type==='person'&&ownerIds.includes(s.id))).map(s=>{
    if(!subjectExists(state,s))throw Error('部分公司、部门或人员已失效，请重新选择');const key=subjectKey(s);if(seen.has(key))throw Error('同一授权对象不能重复添加');seen.add(key);
    if(!PERMISSION_ROLES.some(([role])=>role===s.role)&&s.role!=='legacy')throw Error('请选择有效权限');
    return {type:s.type,id:s.id,role:s.role,...(s.role==='legacy'?{rights:legacyRights(s.rights)}:{})};
  });return accessFromSubjects(state,subjects);
}
export function accessFingerprint(state,item,entity){const space=entity==='space'?item:state.spaces.find(s=>s.id===item?.spaceId);return JSON.stringify([creatorId(item),responsibleId(item),item?.ownership,item?.spaceId,space?.kind,item?.access,item?.localAccess,item?.inheritedExclusions,entity==='node'?parentAccess(state,item):null,protectedManagers(state,item,entity)]);}
export function saveEntityAccess(state,{id,entity='node',access,expected,localAccess,inheritedExclusions},userId){
  const collection=entity==='space'?'spaces':'nodes',item=state[collection].find(n=>n.id===id),rights=entity==='space'?libraryRights(state,item,userId):contentRights(state,item,userId);
  if(!item||item.deletedAt||!rights.manage)throw Error('当前没有管理权限，无法调整授权');
  if(expected&&accessFingerprint(state,item,entity)!==expected)throw Error('权限或位置已变化，请关闭后重新打开核对');
  const space=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId),owners=protectedManagers(state,item,entity).map(row=>row.id);
  const checked=validateAccess(state,entity==='node'?localAccess??access??empty():access??empty(),owners);
  if(libraryType(space)==='personal'&&(checked.subjects.length||(inheritedExclusions||[]).length))throw Error('个人知识库仅本人管理，协作前请先移动到共享知识库或知识广场');
  // Protected rows are locked in the editor. Keep their underlying ordinary
  // grants/exclusions so unrelated saves do not erase post-handover rights.
  const isProtected=s=>s.type==='person'&&owners.includes(s.id);
  const retained=libraryType(space)==='personal'?[]:toSubjectAccess(state,(entity==='space'?item.access:item.localAccess)||empty()).subjects.filter(isProtected);
  const savedAccess=accessFromSubjects(state,mergeSubjects(retained,checked.subjects));
  const excluded=[...new Map([
    ...(inheritedExclusions??item.inheritedExclusions??[]).filter(s=>!isProtected(s)),
    ...(item.inheritedExclusions||[]).filter(isProtected),
  ].filter(s=>['company','department','person'].includes(s.type)&&typeof s.id==='string').map(s=>[subjectKey(s),{type:s.type,id:s.id}])).values()];
  return {...state,[collection]:state[collection].map(n=>n.id===id?{...n,...(entity==='space'?{access:savedAccess}:{permissionMode:'layered',localAccess:savedAccess,inheritedExclusions:excluded}),updatedAt:new Date().toISOString()}:n)};
}
export function creationAccess(state,fields){return {inherit:true,access:parentAccess(state,fields)};}
export function restorableAccess(state,node){return effectiveAccess(state,node);}
export function contentTree(state,node){const ids=new Set([node.id]);let size=-1;while(ids.size!==size){size=ids.size;for(const n of state.nodes)if(n.spaceId===node.spaceId&&ids.has(n.parentId))ids.add(n.id);}return ids;}
export function originalPosition(state,node){const parts=[node.name],seen=new Set([node.id]);let parent=state.nodes.find(n=>n.id===node.parentId&&n.spaceId===node.spaceId);while(parent&&!seen.has(parent.id)){seen.add(parent.id);parts.unshift(parent.name);parent=state.nodes.find(n=>n.id===parent.parentId&&n.spaceId===node.spaceId);}parts.unshift(state.spaces.find(s=>s.id===node.spaceId)?.name||'原知识库');return parts.join(' / ');}
export function deleteContent(state,nodeId,userId){
  const node=state.nodes.find(n=>n.id===nodeId);if(!node||!contentRights(state,node,userId).manage)throw Error('没有删除此内容的管理权限');
  const ids=contentTree(state,node),affected=state.nodes.filter(n=>ids.has(n.id)&&!n.deletedAt);if(affected.some(n=>!contentRights(state,n,userId).manage))throw Error('目录中存在不能管理的内容，未执行删除');
  const time=new Date().toISOString(),batch=crypto.randomUUID();return {...state,nodes:state.nodes.map(n=>affected.some(x=>x.id===n.id)?{...n,deletedAt:time,deletedBy:userId,deleteBatch:batch,originalLocation:originalPosition(state,n)}:n)};
}
export function restoreLocationReason(state,node,userId=state.viewAs){
  try{validateContentDestination(state,{spaceId:node.spaceId,parentId:node.parentId||''},userId);}catch(error){return error.message;}
  if(state.nodes.some(n=>!n.deletedAt&&n.spaceId===node.spaceId&&(n.parentId||'')===(node.parentId||'')&&n.name.trim().toLocaleLowerCase()===node.name.trim().toLocaleLowerCase()))return '原位置已有同名内容，请修改恢复名称或另选目录';
  return '';
}
export function restoreNeedsLocation(state,node,userId=state.viewAs){return !!restoreLocationReason(state,node,userId);}

export function restoreContent(state,nodeId,userId,position){
  const node=state.nodes.find(n=>n.id===nodeId);if(!node?.deletedAt||!contentRights(state,node,userId,true).manage)throw Error('当前无权恢复此内容');
  const ids=contentTree(state,node),affected=state.nodes.filter(n=>ids.has(n.id)&&n.deletedAt&&(n.id===node.id||node.deleteBatch&&n.deleteBatch===node.deleteBatch));
  if(affected.some(n=>!contentRights(state,n,userId,true).manage))throw Error('部分内容缺少恢复权限');
  if(!position&&restoreNeedsLocation(state,node,userId))throw Error('原位置不可用，请选择恢复位置');
  const target=position||{spaceId:node.spaceId,parentId:node.parentId||''},space=state.spaces.find(s=>s.id===target.spaceId),parent=state.nodes.find(n=>n.id===target.parentId);
  if(!space||space.deletedAt)throw Error('目标知识库已不可用');
  validateContentDestination(state,target,userId);
  const name=validateContentName(position?.name??node.name),extension=uploadedExtension(node);
  if(extension&&!name.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase()))throw Error(`请保留原文件扩展名 ${extension}`);
  if(ids.has(target.parentId))throw Error('不能恢复到自身或其子目录');
  if(libraryType(space)==='personal'&&affected.some(n=>isOrganizationContent(state,n)))throw Error('组织原件不能恢复到个人知识库，请选择共享知识库或知识广场');
  if(libraryType(space)==='personal'&&(responsibleId(space)!==userId||affected.some(n=>creatorId(n)!==userId)))throw Error('只能将本人创建的个人内容恢复到个人知识库');
  const moving=new Set(affected.map(n=>n.id)),changed=target.spaceId!==node.spaceId||(target.parentId||'')!==(node.parentId||'');
  if(affected.some(n=>state.nodes.some(x=>!x.deletedAt&&!moving.has(x.id)&&x.spaceId===target.spaceId&&(x.parentId||'')===(n.id===nodeId?(target.parentId||''):n.parentId)&&x.name.trim().toLocaleLowerCase()===(n.id===nodeId?name:n.name).trim().toLocaleLowerCase())))throw Error('恢复位置已有同名内容，请另选目录');
  return {...state,nodes:state.nodes.map(n=>moving.has(n.id)?{...n,spaceId:target.spaceId,ownership:libraryType(space)==='personal'?'personal':'organization',...(n.id===nodeId?{parentId:target.parentId||'',name}:{}),...(changed?{localAccess:empty(),inheritedExclusions:[]}:{}),deletedAt:'',deletedBy:undefined,deleteBatch:undefined,originalLocation:undefined,updatedAt:new Date().toISOString()}:n)};
}
