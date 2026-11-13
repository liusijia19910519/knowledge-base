export const HOME_COLUMNS = [
  {id:'location',label:'位置',width:'minmax(150px,1.1fr)'},
  {id:'owner',label:'负责人',width:'minmax(110px,.8fr)'},
  {id:'updatedAt',label:'修改时间',width:'130px',hidden:true},
  {id:'createdAt',label:'创建时间',width:'130px'},
  {id:'visitedAt',label:'最近访问',width:'130px'},
];
export function homeColumns(state,userId){
  const saved=state.homeColumnsByUser?.[userId];
  const seen=new Set(),result=[];
  for(const item of Array.isArray(saved)?saved:[]){
    const column=HOME_COLUMNS.find(c=>c.id===item?.id);
    if(!column||seen.has(column.id))continue;
    seen.add(column.id);result.push({...column,hidden:!!item.hidden});
  }
  return [...result,...HOME_COLUMNS.filter(c=>!seen.has(c.id)).map(c=>({...c}))];
}
function save(state,userId,columns){return {...state,homeColumnsByUser:{...state.homeColumnsByUser,[userId]:columns.map(({id,hidden})=>({id,hidden:!!hidden}))}};}
export function toggleHomeColumn(state,userId,id){return save(state,userId,homeColumns(state,userId).map(c=>c.id===id?{...c,hidden:!c.hidden}:c));}
export function reorderHomeColumn(state,userId,id,targetId,after=false){
  const columns=homeColumns(state,userId),source=columns.find(c=>c.id===id);
  if(!source||id===targetId||!columns.some(c=>c.id===targetId))return state;
  const next=columns.filter(c=>c.id!==id),index=next.findIndex(c=>c.id===targetId);
  next.splice(index+(after?1:0),0,source);return save(state,userId,next);
}
