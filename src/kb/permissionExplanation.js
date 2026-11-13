import { PERMISSION_ROLES, subjectKey, subjectLabel, subjectMatches, subjectRights } from './permissions.js';
export const permissionLabel=role=>PERMISSION_ROLES.find(([id])=>id===role)?.[1]||'原有权限';
export function explainPermission(state,subject,{local=[],inherited=[],excluded=[],floor=[],protectedRows=[],sourceLabel='父级'}={}){
  const blocked=new Set(excluded.map(subjectKey)),person=subject.type==='person',matches=grant=>person?subjectMatches(state,grant,subject.id):subjectKey(grant)===subjectKey(subject),entries=[];
  const add=(grants,origin,filter=()=>true)=>{for(const grant of grants)if(matches(grant)&&filter(grant))entries.push({origin,name:subjectLabel(state,grant),role:grant.role,rights:subjectRights(grant)});};
  add(local,'本项授权');add(inherited,`继承自${sourceLabel}`,grant=>!blocked.has(subjectKey(grant)));add(floor,'固定权限');
  if(person)for(const row of protectedRows)if(row.id===subject.id)for(const origin of row.sources)entries.push({origin:'负责人保护',name:origin,role:'manager',rights:{view:true,edit:true,download:true,manage:true}});
  const rights={};for(const entry of entries)for(const [key,value] of Object.entries(entry.rights))rights[key] ||= !!value;
  const effectiveRole=rights.manage?'manager':rights.edit?'editor':rights.download?'downloader':rights.view?'viewer':subject.role;
  return {entries,effectiveRole,person};
}
