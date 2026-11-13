const fields=['updatedAt','createdAt','name'];
const collator=new Intl.Collator('zh-CN',{numeric:true,sensitivity:'base'});
export function directorySort(state,userId,spaceId){
  const stored=state.directorySortByUser?.[userId]?.[spaceId];
  return {field:fields.includes(stored?.field)?stored.field:'updatedAt',direction:stored?.direction==='asc'?'asc':'desc'};
}
export function sortedDirectory(nodes,sort){
  return nodes.map((node,index)=>({node,index})).sort((a,b)=>{
    let result;
    if(sort.field==='name')result=collator.compare(a.node.name||'',b.node.name||'');
    else {
      const left=Date.parse(a.node[sort.field]),right=Date.parse(b.node[sort.field]);
      if(!Number.isFinite(left)||!Number.isFinite(right))return Number.isFinite(left)?-1:Number.isFinite(right)?1:a.index-b.index;
      result=left-right;
    }
    return (sort.direction==='asc'?result:-result)||a.index-b.index;
  }).map(item=>item.node);
}
