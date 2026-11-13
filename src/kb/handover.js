import { activeNode, libraryType, libraryRights, contentRights, contentTree, accessFingerprint, protectedManagers, effectiveAccess, spaceAccess } from './access.js';
import { creatorId, responsibleId } from './ownership.js';
import { subjectMatches, subjectLabel, PERMISSION_ROLES, roleRights } from './permissions.js';

export function handoverReason(state,id,entity='node',userId){
  if(!['space','node'].includes(entity))return '请选择有效的交接对象';
  const item=state[entity==='space'?'spaces':'nodes'].find(row=>row.id===id),library=entity==='space'?item:state.spaces.find(s=>s.id===item?.spaceId);
  if(!item||item.deletedAt||!library||library.deletedAt||entity==='node'&&!activeNode(state,item))return '内容已删除或不可用';
  if(libraryType(library)==='personal')return '个人资料仅本人管理，不提供负责人交接';
  if(userId!==responsibleId(item)&&userId!==responsibleId(library))return '只有当前负责人或知识库负责人可以交接';
  if(!(entity==='space'?libraryRights(state,item,userId):contentRights(state,item,userId)).manage)return '当前没有管理权限';
  return '';
}
export function handoverScope(state,id,entity='node'){
  const item=state[entity==='space'?'spaces':'nodes'].find(row=>row.id===id);if(!item)return {item:null,children:[],eligible:[]};
  const ids=entity==='space'?null:contentTree(state,item);
  const children=entity==='space'?state.nodes.filter(n=>n.spaceId===id):item.type==='folder'?state.nodes.filter(n=>n.id!==id&&ids.has(n.id)):[];
  return {item,children,eligible:children.filter(n=>responsibleId(n)===responsibleId(item))};
}
export function handoverSnapshot(state,id,entity='node'){
  const {item,children}=handoverScope(state,id,entity);if(!item)return '';
  return JSON.stringify([accessFingerprint(state,item,entity),item.updatedAt,item.deletedAt,children.map(n=>[n.id,n.parentId,n.spaceId,creatorId(n),responsibleId(n),n.updatedAt,n.deletedAt,n.localAccess,n.inheritedExclusions])]);
}
export function transferResponsibility(state,{id,entity='node',newResponsibleId,includeChildren=true,expected},userId){
  if(state.viewAs!==userId)throw Error('当前用户已变化，请重新操作');
  const reason=handoverReason(state,id,entity,userId);if(reason)throw Error(reason);
  if(expected&&expected!==handoverSnapshot(state,id,entity))throw Error('负责人、目录内容或权限已变化，请重新打开核对');
  const {item,eligible}=handoverScope(state,id,entity),oldResponsibleId=responsibleId(item),member=state.members.find(m=>m.id===newResponsibleId);
  if(!member||member.deletedAt||member.disabled||['inactive','disabled'].includes(member.status))throw Error('请选择有效的系统内部人员');
  if(newResponsibleId===oldResponsibleId)throw Error('请选择与当前负责人不同的人员');
  if(entity==='space'&&state.spaces.some(l=>l.id!==id&&!l.deletedAt&&responsibleId(l)===newResponsibleId&&l.name.trim().toLocaleLowerCase()===item.name.trim().toLocaleLowerCase()))throw Error('新负责人已有同名知识库，请先修改本知识库名称后再交接');
  const affected=includeChildren?eligible:[];
  if(affected.some(n=>!contentRights(state,n,userId,true).manage))throw Error('部分下级内容缺少管理权限，未执行交接');
  const time=new Date().toISOString(),ids=new Set(affected.map(n=>n.id));if(entity==='node')ids.add(id);
  const changed=row=>({...row,creatorId:creatorId(row),responsibleId:newResponsibleId,updatedAt:time,lastHandover:{from:oldResponsibleId,to:newResponsibleId,by:userId,at:time}});
  const next={...state,...(entity==='space'?{spaces:state.spaces.map(row=>row.id===id?changed(row):row)}:{}),nodes:state.nodes.map(row=>ids.has(row.id)?changed(row):row)};
  const remainingManagedCount=[...(entity==='space'?[libraryRights(next,next.spaces.find(s=>s.id===id),oldResponsibleId)]:[]),...next.nodes.filter(n=>ids.has(n.id)).map(n=>contentRights(next,n,oldResponsibleId,true))].filter(rights=>rights.manage).length;
  return {state:next,oldResponsibleId,newResponsibleId,changedCount:1+affected.length,deletedCount:affected.filter(n=>n.deletedAt).length,remainingManagedCount};
}
export function handoverAccessSummary(state,id,entity,userId){
  const item=state[entity==='space'?'spaces':'nodes'].find(row=>row.id===id);if(!item)return {label:'无权限',sources:[]};
  const rights=entity==='space'?libraryRights(state,item,userId):contentRights(state,item,userId,true),role=PERMISSION_ROLES.find(([role])=>Object.keys(roleRights(role)).every(key=>!!roleRights(role)[key]===!!rights[key]));
  const protectedRow=protectedManagers(state,item,entity).find(row=>row.id===userId),access=entity==='space'?spaceAccess(state,item):effectiveAccess(state,item);
  const sources=[...(protectedRow?.sources||[]),...access.subjects.filter(subject=>subjectMatches(state,subject,userId)&&!(protectedRow&&subject.type==='person'&&subject.id===userId)).map(subject=>`${subjectLabel(state,subject)}授权`)];
  return {label:role?.[1]||'无权限',sources:[...new Set(sources)]};
}
