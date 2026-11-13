export function containsItem(state,parentId,id){
  const parent=state.nodes.find(n=>n.id===parentId),seen=new Set();let current=state.nodes.find(n=>n.id===id);
  while(current&&parent&&current.spaceId===parent.spaceId&&!seen.has(current.id)){if(current.id===parentId)return true;seen.add(current.id);current=state.nodes.find(n=>n.id===current.parentId);}
  return false;
}
export function selectionRoots(state,ids){const unique=[...new Set(ids)];return unique.filter(id=>!unique.some(parent=>parent!==id&&containsItem(state,parent,id)));}
export const itemChecked=(state,roots,id)=>roots.some(root=>containsItem(state,root,id));
export const itemPartial=(state,roots,id)=>!itemChecked(state,roots,id)&&roots.some(root=>containsItem(state,id,root));
export function toggleTreeSelection(state,roots,id,visibleIds){
  if(!itemChecked(state,roots,id))return selectionRoots(state,[...roots,id]);
  const ancestor=roots.find(root=>containsItem(state,root,id));
  const remaining=roots.filter(root=>root!==ancestor&&!containsItem(state,id,root));
  if(ancestor!==id)for(const candidate of visibleIds)if(containsItem(state,ancestor,candidate)&&!containsItem(state,candidate,id)&&!containsItem(state,id,candidate))remaining.push(candidate);
  return selectionRoots(state,remaining);
}
export function selectionSummary(state,ids){const roots=selectionRoots(state,ids).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean),folders=roots.filter(n=>n.type==='folder').length,files=roots.length-folders;return `已选${[folders?`${folders} 个文件夹`:'',files?`${files} 个文件`:''].filter(Boolean).join('、')}${folders?'（含文件夹内全部内容）':''}`;}
