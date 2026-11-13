import { didShareItem } from './sharing.js';
import { responsibleId } from './ownership.js';
import { librariesForView, contentRights, effectiveAccess, libraryType } from './access.js';
import { favorites } from './fileActions.js';

const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);
export function pinnedRecords(state,userId){
  const saved=state.pinsByUser?.[userId];
  if(owns(state.pinsByUser,userId))return Array.isArray(saved)?saved:[];
  return userId===state.meId?librariesForView(state,userId).slice(0,4).map(s=>({spaceId:s.id,view:libraryType(s)})):[];
}
function effectiveLibraryView(state,id,userId,preferred){return [preferred,'personal','shared','plaza'].filter(Boolean).find(view=>librariesForView(state,userId,view).some(s=>s.id===id))||'';}
export function visiblePins(state,userId){const seen=new Set();return pinnedRecords(state,userId).map(record=>({library:state.spaces.find(s=>s.id===record.spaceId),view:effectiveLibraryView(state,record.spaceId,userId,record.view)})).filter(p=>{if(!p.library||p.library.deletedAt||!p.view||seen.has(p.library.id))return false;seen.add(p.library.id);return true;});}
const PIN_SPACES=['personal','shared','plaza'];
export function pinnedLibrariesForView(state,userId,view){
  const available=new Map(librariesForView(state,userId,view).map(library=>[library.id,library]));
  const ids=visiblePins(state,userId).map(p=>p.library.id).filter(id=>available.has(id));
  const order=state.viewPinOrderByUser?.[userId]?.[view];
  return [...new Set([...(Array.isArray(order)?order:[]).filter(id=>ids.includes(id)),...ids])].map(id=>available.get(id));
}
function savePins(state,userId,records){
  const existing=state.pinsByUser||{[state.meId]:pinnedRecords(state,state.meId)};
  return {...state,pinsByUser:{...existing,[userId]:records}};
}
export function togglePin(state,userId,id,view){const current=pinnedRecords(state,userId),present=current.some(p=>p.spaceId===id);if(present)return savePins(state,userId,current.filter(p=>p.spaceId!==id));const origin=effectiveLibraryView(state,id,userId,view);if(!origin)throw Error('当前无法访问该知识库');return savePins(state,userId,[...current,{spaceId:id,view:origin}]);}
export function reorderPin(state,userId,id,targetId,after=false){
  const records=pinnedRecords(state,userId),source=records.find(p=>p.spaceId===id);if(!source||!records.some(p=>p.spaceId===targetId)||id===targetId)return state;
  const next=records.filter(p=>p.spaceId!==id),at=next.findIndex(p=>p.spaceId===targetId);next.splice(at+(after?1:0),0,source);return savePins(state,userId,next);
}
export function reorderViewPin(state,userId,view,id,targetId,after=false){
  if(!PIN_SPACES.includes(view))return state;
  const ids=pinnedLibrariesForView(state,userId,view).map(l=>l.id);
  if(id===targetId||!ids.includes(id)||!ids.includes(targetId))return state;
  const next=ids.filter(item=>item!==id),index=next.indexOf(targetId);next.splice(index+(after?1:0),0,id);
  return {...state,viewPinOrderByUser:{...state.viewPinOrderByUser,[userId]:{...state.viewPinOrderByUser?.[userId],[view]:next}}};
}
export function recentVisits(state,userId){if(owns(state.recentVisitsByUser,userId))return state.recentVisitsByUser[userId]||[];return userId===state.meId?(state.recents||[]).map(id=>({id,visitedAt:''})):[];}
export function visitContent(state,id,userId){const node=state.nodes.find(n=>n.id===id);if(!contentRights(state,node,userId).view)throw Error('当前没有查看权限');const records=[{id,visitedAt:new Date().toISOString()},...recentVisits(state,userId).filter(r=>r.id!==id)].slice(0,100);return {...state,recentVisitsByUser:{...(state.recentVisitsByUser||{[state.meId]:recentVisits(state,state.meId)}),[userId]:records},...(userId===state.meId?{recents:records.map(r=>r.id)}:{})};}
export function homeEntries(state,userId,tab,query=''){
  const visits=recentVisits(state,userId),favoriteIds=new Set(favorites(state,userId));
  const available=state.nodes.filter(n=>contentRights(state,n,userId).view).filter(n=>!query.trim()||`${n.name} ${(n.creationDraft?n.creationDraftBody:n.body)||''}`.includes(query.trim()));
  let result=available.filter(n=>tab==='recent'?visits.some(r=>r.id===n.id):tab==='favorite'?favoriteIds.has(n.id):tab==='mine'?didShareItem(state,n,userId):responsibleId(n)!==userId&&responsibleId(state.spaces.find(s=>s.id===n.spaceId))!==userId&&libraryType(state.spaces.find(s=>s.id===n.spaceId))==='shared');
  result=[...new Map(result.map(n=>[n.id,n])).values()];
  return result.sort((a,b)=>tab==='recent'?visits.findIndex(r=>r.id===a.id)-visits.findIndex(r=>r.id===b.id):new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
}
