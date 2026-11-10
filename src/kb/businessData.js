export const RIGHTS = [['view','查看'],['edit','编辑'],['share','分享'],['manage','管理']];
export const ALL = {view:true,edit:true,share:true,manage:true};
export const NONE = {view:false,edit:false,share:false,manage:false};
export const stamp = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
const roleRights = role => ({view:role && role!=='none',edit:['editor','manager'].includes(role),share:role==='manager',manage:role==='manager'});
export function upgradeBusiness(s) {
  if(s.businessVersion===1)return s;
  const spaces=s.spaces.map(space=>{
    const acl={};
    const team=s.teams.find(t=>t.id===space.teamId);
    Object.entries(team?.members||{}).forEach(([id,role])=>{acl[id]=roleRights(role);});
    (space.members||[]).forEach(m=>{acl[m.id]=roleRights(m.role);});
    return {...space,kind:space.personal?'personal':space.visibility==='public'?'plaza':'shared',status:space.visibility==='public'?'published':'draft',acl,createdAt:space.createdAt||stamp(),updatedAt:space.updatedAt||stamp()};
  });
  const nodes=s.nodes.map(n=>({...n,acl:Object.fromEntries((n.members||[]).map(m=>[m.id,roleRights(m.role)])),versions:n.versions||[],comments:n.comments||[],createdAt:n.createdAt||n.updatedAt}));
  if(!spaces.some(x=>x.kind==='plaza')){
    spaces.push({id:'plaza-guide',name:'公共知识与办事指南',description:'全员可见的制度、流程与常见问题',kind:'plaza',status:'published',ownerId:s.members[0].id,acl:{},members:[],personal:false,visibility:'public',createdAt:stamp(),updatedAt:stamp()});
    nodes.push({id:'plaza-welcome',spaceId:'plaza-guide',parentId:'',type:'doc',name:'知识分享与使用指南',body:'欢迎来到知识广场\n所有成员都可以阅读已发布的知识。\n创建者可以维护内容，并单独指定编辑、分享和管理权限。\n个人草稿可以转入共享知识库，确认发布后沉淀为组织知识。',ownerId:s.members[0].id,acl:{},inherit:true,versions:[],comments:[],updatedAt:stamp(),createdAt:stamp()});
  }
  return {...s,spaces,nodes,businessVersion:1,audit:s.audit||[],requests:s.requests||[],links:s.links||[]};
}
export function libraryRights(s,space,userId,includeDeleted=false){
  if(!space||(!includeDeleted&&space.deletedAt))return {...NONE};
  if(space.kind==='personal')return space.ownerId===userId?{...ALL}:{...NONE};
  if(space.ownerId===userId)return {...ALL};
  const rights={...NONE,...space.acl?.[userId]};
  if(space.kind==='plaza'&&space.status==='published')rights.view=true;
  return rights;
}
export function fileRights(s,node,userId,includeDeleted=false,visited=new Set()){
  if(!node||visited.has(node.id)||(!includeDeleted&&node.deletedAt))return {...NONE};
  visited.add(node.id);
  const space=s.spaces.find(x=>x.id===node.spaceId);
  if(!space||(!includeDeleted&&space.deletedAt))return {...NONE};
  if(space.kind==='personal')return space.ownerId===userId?{...ALL}:{...NONE};
  let parent=node.parentId?s.nodes.find(n=>n.id===node.parentId):null;
  if(parent&&!includeDeleted&&parent.deletedAt)return {...NONE};
  let pending=!!node.publicationPending,cursor=parent;
  const ancestors=new Set();
  while(cursor&&!ancestors.has(cursor.id)){ancestors.add(cursor.id);pending=pending||!!cursor.publicationPending;cursor=s.nodes.find(n=>n.id===cursor.parentId);}
  const base=parent?fileRights(s,parent,userId,includeDeleted,visited):libraryRights(s,space,userId,includeDeleted);
  // Library managers can recover document access and maintain permissions.
  if(space.ownerId===userId)return {...ALL};
  if(space.kind==='plaza'&&space.status==='published'&&pending){
    if(node.ownerId===userId)return {...ALL};
    let explicit=node,seen=new Set();while(explicit.inherit!==false&&explicit.parentId&&!seen.has(explicit.id)){seen.add(explicit.id);const ancestor=s.nodes.find(n=>n.id===explicit.parentId);if(!ancestor)break;explicit=ancestor;}
    const scoped={...NONE,...(explicit.inherit===false?explicit.acl?.[userId]:space.acl?.[userId])};
    if(libraryRights(s,space,userId,includeDeleted).manage)scoped.manage=true;
    return scoped;
  }
  const own=node.ownerId===userId && accessible(libraryRights(s,space,userId,includeDeleted));
  const rights=own?{...ALL}:node.inherit===false?{...NONE,...node.acl?.[userId]}:{...base};
  if(libraryRights(s,space,userId,includeDeleted).manage)rights.manage=true;
  if(space.kind==='plaza'&&space.status==='published')rights.view=true;
  return rights;
}
export const accessible = r=>RIGHTS.some(([key])=>r[key]);
export function businessSpaces(s,userId){return s.spaces.filter(space=>!space.deletedAt&&(accessible(libraryRights(s,space,userId))||s.nodes.some(n=>n.spaceId===space.id&&accessible(fileRights(s,n,userId)))));}
export const businessNodes=(s,userId)=>s.nodes.filter(n=>!n.deletedAt&&accessible(fileRights(s,n,userId)));
export function descendants(s,node){const ids=new Set([node.id]);let changed=true;while(changed){changed=false;s.nodes.forEach(n=>{if(ids.has(n.parentId)&&!ids.has(n.id)){ids.add(n.id);changed=true;}});}return ids;}
export function record(s,userId,action,name){return {...s,audit:[{id:uid(),userId,action,name,time:stamp()},...(s.audit||[])].slice(0,300)};}
export function trashEntity(s,type,item,userId){
  if(type!=='space')for(const child of s.nodes.filter(n=>descendants(s,item).has(n.id)&&!n.deletedAt))if(!fileRights(s,child,userId).manage)throw Error(`没有管理「${child.name}」的权限，目录未删除`);
  const batch=uid(),date=stamp();
  return record({...s,spaces:type==='space'?s.spaces.map(x=>x.id===item.id?{...x,deletedAt:date,deletedBy:userId,deleteBatch:batch}:x):s.spaces,nodes:type==='space'?s.nodes:s.nodes.map(n=>descendants(s,item).has(n.id)&&!n.deletedAt?{...n,deletedAt:date,deletedBy:userId,deleteBatch:batch,deleteRoot:n.id===item.id}:n)},userId,'删除',item.name);
}
export function duplicateTree(s,items,targetSpace,targetFolder,userId,move=false,rootNames={}){
  const ids=new Set();items.forEach(item=>descendants(s,item).forEach(id=>ids.add(id)));
  const mapping=Object.fromEntries([...ids].map(id=>[id,move?id:uid()]));
  const selectedIds=new Set(items.map(n=>n.id));
  const roots=new Set(items.filter(n=>{let p=n.parentId;const seen=new Set();while(p&&!seen.has(p)){seen.add(p);if(selectedIds.has(p))return false;p=s.nodes.find(x=>x.id===p)?.parentId;}return true;}).map(n=>n.id));
  if(move&&ids.has(targetFolder))throw Error('不能移动到自身或子目录');
  const target=s.spaces.find(x=>x.id===targetSpace);
  const included=s.nodes.filter(n=>ids.has(n.id)&&!n.deletedAt);
  for(const child of included)if(!fileRights(s,child,userId)[move?'manage':'view'])throw Error(`没有${move?'管理':'查看'}「${child.name}」的权限，目录未${move?'移动':'复制'}`);
  const changed=included.map(n=>({...n,...(!move?{versions:[],comments:[],draftBody:undefined}:{}),publicationPending:target?.kind==='plaza'&&target.status==='published',id:mapping[n.id],name:roots.has(n.id)?rootNames[n.id]||n.name:n.name,spaceId:targetSpace,parentId:roots.has(n.id)?targetFolder:mapping[n.parentId]||'',createdBy:move?(n.createdBy||n.ownerId):userId,createdAt:move?n.createdAt:stamp(),ownerId:move?(n.spaceId===targetSpace?n.ownerId:target.ownerId):userId,inherit:true,acl:{},sourceId:n.sourceId||n.id,sourceSpaceId:n.sourceSpaceId||n.spaceId,sourceTitle:n.sourceTitle||n.name,sourceLibrary:n.sourceLibrary||s.spaces.find(x=>x.id===n.spaceId)?.name,updatedAt:stamp()}));
  return {...s,nodes:move?s.nodes.map(n=>changed.find(x=>x.id===n.id)||n):[...s.nodes,...changed]};
}
