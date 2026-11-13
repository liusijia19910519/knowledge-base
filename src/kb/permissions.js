export const PERMISSION_ROLES=[['manager','可管理'],['editor','可编辑'],['downloader','可查看并下载'],['viewer','仅查看']];
const capabilities=['view','edit','share','manage','download'];
export const companyId=state=>state.org?.code||'company';
export const subjectKey=s=>`${s.type}:${s.id}`;
export const roleRights=role=>({view:['viewer','downloader','editor','manager'].includes(role),edit:['editor','manager'].includes(role),share:role==='manager',manage:role==='manager',download:['downloader','editor','manager'].includes(role)});
export const legacyRights=r=>Object.fromEntries(capabilities.map(k=>[k,k==='download'?r?.download??!!r?.view:!!r?.[k]]));
export function departmentContains(state,parent,id){const seen=new Set();while(id&&!seen.has(id)){if(id===parent)return true;seen.add(id);id=state.departments.find(d=>d.id===id)?.parentId;}return false;}
export function subjectExists(state,s){return s.type==='company'?s.id===companyId(state):s.type==='department'?state.departments.some(d=>d.id===s.id):s.type==='person'&&state.members.some(m=>m.id===s.id);}
export function subjectMatches(state,s,userId){const member=state.members.find(m=>m.id===userId);if(!member)return false;return s.type==='company'?s.id===companyId(state):s.type==='department'?departmentContains(state,s.id,member.deptId):s.type==='person'&&s.id===userId;}
export function subjectLabel(state,s){return s.type==='company'?state.org.name:s.type==='department'?state.departments.find(d=>d.id===s.id)?.name||'已失效部门':state.members.find(m=>m.id===s.id)?.name||'已失效人员';}
export function subjectRights(s){return s.role==='legacy'?legacyRights(s.rights):roleRights(s.role);}
export function subjectVisibility(state,subjects){return subjects.some(s=>s.type==='company'&&s.id===companyId(state)&&subjectRights(s).view)?'public':subjects.length?'members':'private';}
export function accessFromSubjects(state,subjects){return {subjects,visibility:subjectVisibility(state,subjects),grants:{}};}
export function mergeSubjects(...groups){
  const merged=new Map();
  for(const subject of groups.flat()){
    const key=subjectKey(subject),previous=merged.get(key);
    if(!previous){merged.set(key,{...subject});continue;}
    const a=subjectRights(previous),b=subjectRights(subject),rights=Object.fromEntries(capabilities.map(k=>[k,a[k]||b[k]]));
    const role=PERMISSION_ROLES.find(([r])=>capabilities.every(k=>roleRights(r)[k]===rights[k]))?.[0];
    merged.set(key,{type:subject.type,id:subject.id,role:role||'legacy',...(role?{}:{rights})});
  }
  return [...merged.values()];
}
export function initialAccess(state,view){return accessFromSubjects(state,[]);}
export function toSubjectAccess(state,access,ownerIds=[]){
  if(Array.isArray(access.subjects))return accessFromSubjects(state,access.subjects.map(s=>({...s})).filter(s=>!(s.type==='person'&&ownerIds.includes(s.id))));
  const subjects=[];
  // Preserve the old runtime's download behaviour without raising legacy
  // independent capabilities into a broader hierarchical role.
  if(access.visibility==='public')subjects.push({type:'company',id:companyId(state),role:access.publicDownload===false?'viewer':'downloader'});
  if(access.visibility!=='private')for(const [id,rights] of Object.entries(access.grants||{})){
    if(ownerIds.includes(id)||!state.members.some(m=>m.id===id)||!Object.values(rights).some(Boolean))continue;
    const normalized=legacyRights(rights),role=PERMISSION_ROLES.find(([r])=>capabilities.every(k=>roleRights(r)[k]===normalized[k]))?.[0];
    subjects.push({type:'person',id,role:role||'legacy',...(role?{}:{rights:normalized})});
  }
  return accessFromSubjects(state,subjects);
}
