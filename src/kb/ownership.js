// ownerId remains the legacy historical creator field; never rewrite it on handover.
export const creatorId=item=>item?.creatorId||item?.ownerId||'';
export const responsibleId=item=>item?.responsibleId||item?.ownerId||'';
export const isOrganizationContent=(state,item,entity='node')=>{
  if(!item)return false;
  const library=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId);
  return item.ownership==='organization'||!!library&&library.kind!=='personal';
};
export function initializeOwnership(state){
  const spaces=state.spaces.map(space=>({...space,creatorId:creatorId(space),responsibleId:responsibleId(space),ownership:space.kind==='personal'?'personal':'organization'}));
  return {...state,ownershipModelVersion:1,spaces,nodes:state.nodes.map(node=>({...node,creatorId:creatorId(node),responsibleId:responsibleId(node),ownership:node.ownership||((spaces.find(s=>s.id===node.spaceId)?.kind||'shared')==='personal'?'personal':'organization')}))};
}
