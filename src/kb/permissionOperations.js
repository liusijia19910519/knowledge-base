import { recordSharingChange } from './sharing.js';
import { responsibleId } from './ownership.js';
import { accessFingerprint, effectiveAccess, spaceAccess, saveEntityAccess, validateAccess, contentRights, libraryRights, permissionLayers, protectedManagers, libraryLocalAccess, libraryType } from './access.js';
import { accessFromSubjects, toSubjectAccess, subjectKey } from './permissions.js';

export function permissionTarget(state,id,entity,userId){
  const item=state[entity==='space'?'spaces':'nodes'].find(n=>n.id===id),rights=entity==='space'?libraryRights(state,item,userId):contentRights(state,item,userId);
  if(!item||item.deletedAt||!rights.manage)throw Error('当前没有管理权限');
  if(entity==='node'&&item.creationDraft)throw Error('请先首次保存新建草稿，再配置权限或分享');
  const library=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId),owners=protectedManagers(state,item,entity).map(row=>row.id);
  const access=entity==='space'?libraryLocalAccess(state,item):item.localAccess||accessFromSubjects(state,[]);
  return {item,library,owners,access:toSubjectAccess(state,access,owners),...(entity==='node'?{layers:permissionLayers(state,item)}:{})};
}
export function addCollaborators(state,{id,entity='node',subjects,expected,confirmedIndependent=false},userId){
  const target=permissionTarget(state,id,entity,userId);
  if(expected&&accessFingerprint(state,target.item,entity)!==expected)throw Error('当前权限已变化，请关闭后重新打开核对');
  if(libraryType(target.library)==='personal')throw Error('个人内容不能直接添加协作者，请先移动到共享知识库或知识广场');
  const additions=validateAccess(state,accessFromSubjects(state,subjects),target.owners).subjects;
  if(!additions.length)throw Error('请至少添加一个新的协作者');
  const direct=entity==='node'?target.layers.local:target.access;
  const existing=new Set(direct.subjects.map(subjectKey));
  if(additions.some(s=>existing.has(subjectKey(s))))throw Error('部分对象已有直接授权，请在权限管理中修改');
  const combined=accessFromSubjects(state,[...direct.subjects,...additions]);
  return recordSharingChange(state,saveEntityAccess(state,{id,entity,access:combined,...(entity==='node'?{localAccess:combined,inheritedExclusions:target.layers.excluded}:{}),expected},userId),id,entity,userId);
}
export function savePermissionDetails(state,{id,entity='node',access,inherit,expected,name,description,expectedMetadata,localAccess,inheritedExclusions,icon,cover,expectedAppearance},userId){
  const target=permissionTarget(state,id,entity,userId);
  if(entity==='space'&&name!==undefined){
    if(expectedMetadata&&JSON.stringify([target.item.name,target.item.description||''])!==expectedMetadata)throw Error('知识库信息已在其他页面变化，请重新打开');
    if(expectedAppearance&&JSON.stringify([target.item.icon||null,target.item.cover||null])!==expectedAppearance)throw Error('知识库图标或封面已在其他页面变化，请重新打开');
    const title=name.trim();if(!title||title.length>40)throw Error('请输入 1–40 个字符的知识库名称');if(description.length>300)throw Error('简介不能超过 300 个字符');
    if(state.spaces.some(s=>s.id!==id&&!s.deletedAt&&responsibleId(s)===responsibleId(target.item)&&s.name.trim().toLocaleLowerCase()===title.toLocaleLowerCase()))throw Error('已有同名知识库，请换一个名称');
    const next=saveEntityAccess(state,{id,entity,access,inherit,expected},userId);
    return recordSharingChange(state,{...next,spaces:next.spaces.map(s=>s.id===id?{...s,name:title,description:description.trim(),...(icon?{icon}:{}),...(cover?{cover}:{})}:s)},id,entity,userId);
  }
  return recordSharingChange(state,saveEntityAccess(state,{id,entity,access,inherit,expected,localAccess,inheritedExclusions},userId),id,entity,userId);
}
