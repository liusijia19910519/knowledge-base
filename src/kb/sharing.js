import { libraryType, plazaFloor, activeNode, effectiveAccess, contentRights } from './access.js';
import { subjectKey, subjectMatches, toSubjectAccess } from './permissions.js';
const rank={viewer:1,downloader:2,editor:3,manager:4};
const key=(entity,id)=>`${entity}:${id}`;
const contributionKey=subject=>`${subject.source==='floor'?'floor:':''}${subjectKey(subject)}`;
// Keep attribution for ordinary grants hidden by responsibility protection.
const subjects=(state,item,entity)=>!item?[]:entity==='space'?[...toSubjectAccess(state,item.access||{}).subjects,...plazaFloor(state,item).map(subject=>({...subject,source:'floor'}))]:item.localAccess?.subjects||[];
const hasAudience=(state,subject,actor)=>state.members.some(member=>member.id!==actor&&subjectMatches(state,subject,member.id));
// Attribute committed grant additions/elevations; neither responsibility nor legacy ACLs imply an actor.
export function recordSharingChange(before,after,id,entity,actor){
  const collection=entity==='space'?'spaces':'nodes',old=before[collection].find(item=>item.id===id),item=after[collection].find(item=>item.id===id),library=entity==='space'?item:after.spaces.find(s=>s.id===item?.spaceId);
  if(!item||libraryType(library)==='personal')return after;
  const previous=new Map(subjects(before,old,entity).map(s=>[contributionKey(s),s])),stored=before.shareAttribution?.[key(entity,id)]||{},next={};
  for(const subject of subjects(after,item,entity)){
    const subjectId=contributionKey(subject),prior=previous.get(subjectId),record=stored[subjectId];
    if(!prior||(rank[subject.role]||0)>(rank[prior.role]||0))next[subjectId]={...subject,actorId:actor,actors:[...new Set([...(record?.actors||[record?.actorId].filter(Boolean)),actor])],at:new Date().toISOString()};
    else if(record)next[subjectId]={...record,role:subject.role};
  }
  return {...after,shareAttribution:{...after.shareAttribution,[key(entity,id)]:next}};
}
export function recordSharePlacement(state,id,actor){const node=state.nodes.find(n=>n.id===id);if(!node||!activeNode(state,node)||libraryType(state.spaces.find(s=>s.id===node.spaceId))==='personal')return state;return {...state,sharePlacements:{...state.sharePlacements,[id]:{actorId:actor,spaceId:node.spaceId,parentId:node.parentId||'',at:new Date().toISOString()}}};}
function hasAttributedGrant(state,item,entity,actor,excluded=new Set()){
  const records=state.shareAttribution?.[key(entity,item.id)]||{};
  return subjects(state,item,entity).some(subject=>{const id=subjectKey(subject),record=records[contributionKey(subject)];return (!excluded.has(id)||subject.source==='floor')&&(record?.actors||[record?.actorId]).includes(actor)&&record?.role===subject.role&&hasAudience(state,subject,actor);});
}
export function didShareItem(state,node,actor){
  if(!node||node.creationDraft||!activeNode(state,node)||!contentRights(state,node,actor).view)return false;
  const library=state.spaces.find(s=>s.id===node.spaceId);if(libraryType(library)==='personal')return false;
  const audience=effectiveAccess(state,node).subjects.some(s=>hasAudience(state,s,actor));if(!audience)return false;
  let current=node;const seen=new Set(),excluded=new Set();
  while(current&&!seen.has(current.id)){
    seen.add(current.id);
    if(hasAttributedGrant(state,current,'node',actor,excluded))return true;
    const placement=state.sharePlacements?.[current.id];
    if(placement?.actorId===actor&&placement.spaceId===current.spaceId&&placement.parentId===(current.parentId||'')&&effectiveAccess(state,current).subjects.some(s=>hasAudience(state,s,actor)))return true;
    for(const source of current.inheritedExclusions||[])excluded.add(subjectKey(source));
    current=state.nodes.find(n=>n.id===current.parentId&&n.spaceId===node.spaceId&&n.type==='folder');
  }
  return hasAttributedGrant(state,library,'space',actor,excluded);
}
export function didShareLibrary(state,library,actor){return !!library&&!library.deletedAt&&(hasAttributedGrant(state,library,'space',actor)||state.nodes.some(node=>node.spaceId===library.id&&didShareItem(state,node,actor)));}
