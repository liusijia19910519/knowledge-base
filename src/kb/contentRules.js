import { NONE, descendants, duplicateTree, fileRights, libraryRights, record, stamp, uid } from './businessData.js';

export function creationLibrary(contextPath,currentId,chosenId){
  if(contextPath!=='home'&&(!currentId||chosenId!==currentId))throw Error('库内新建只能保存在当前知识库');
  return chosenId;
}
const rootItems=(s,items)=>{const chosen=new Set(items.map(n=>n.id));return items.filter(n=>{let p=n.parentId;const seen=new Set();while(p&&!seen.has(p)){if(chosen.has(p))return false;seen.add(p);p=s.nodes.find(x=>x.id===p)?.parentId;}return true;});};
export function relocateInsideLibrary(s,items,targetId,parentId,userId,move=false,names={}){
  const current=items.map(n=>s.nodes.find(x=>x.id===n.id&&!x.deletedAt));
  if(!current.length||current.some(n=>!n))throw Error('所选内容已删除或不存在');
  if(new Set(current.map(n=>n.spaceId)).size!==1||current.some(n=>n.spaceId!==targetId))throw Error('移动和复制仅支持同一知识库内的目录，不支持跨知识库');
  const target=s.spaces.find(x=>x.id===targetId&&!x.deletedAt);if(!target)throw Error('知识库不可用');
  const parent=parentId?s.nodes.find(n=>n.id===parentId&&n.type==='folder'&&n.spaceId===targetId&&!n.deletedAt):null;
  if(parentId&&!parent)throw Error('目标目录不可用');
  if(!(parent?fileRights(s,parent,userId).edit:libraryRights(s,target,userId).edit))throw Error('没有目标目录的编辑权限');
  let roots=rootItems(s,current);if(roots.some(n=>descendants(s,n).has(parentId)))throw Error('不能移动或复制到自身或子目录');
  if(move){roots=roots.filter(n=>(n.parentId||'')!==(parentId||''));if(!roots.length)throw Error('内容已在所选目录，无需移动');}
  const used=new Set(s.nodes.filter(n=>n.spaceId===targetId&&(n.parentId||'')===(parentId||'')&&!n.deletedAt&&(!move||!roots.some(x=>x.id===n.id))).map(n=>n.name)),rootNames={};
  for(const node of roots){let name=move?node.name:names[node.id]?.trim();if(!move&&!name){const base=node.name.slice(0,94)+' 副本';name=base;let index=2;while(used.has(name))name=base.slice(0,92)+` (${index++})`;}
    if(!name||name.length>100)throw Error('副本名称需为 1～100 个字符');if(used.has(name))throw Error(`目标目录已有「${name}」，请修改名称或选择其他目录`);rootNames[node.id]=name;used.add(name);}
  return duplicateTree(s,roots,targetId,parentId||'',userId,move,rootNames);
}
export function shareInternally(s,item,entity,userId,recipients,{grantView=false,allowIndependent=false}={}){
  const target=(entity==='space'?s.spaces:s.nodes).find(n=>n.id===item.id&&!n.deletedAt),space=entity==='space'?target:s.spaces.find(n=>n.id===target?.spaceId&&!n.deletedAt);
  if(!target||!space)throw Error('分享对象不存在或已删除');if(space.kind==='personal')throw Error('个人知识库仅本人可见，请先转为共享知识库');
  const rights=id=>entity==='space'?libraryRights(s,target,id):fileRights(s,target,id),actor=rights(userId);
  if(!actor.share)throw Error('没有分享权限');
  const ids=[...new Set(recipients)];if(!ids.length)throw Error('请选择系统内部成员');if(ids.some(id=>id===userId||!s.members.some(m=>m.id===id)))throw Error('只能分享给其他系统内部成员');
  const missing=ids.filter(id=>!rights(id).view);let next=s;
  if(missing.length){if(!actor.manage)throw Error('所选成员没有查看权限，请联系创建者或管理者先授权');if(!grantView)throw Error('请确认同时授予未授权成员查看权限');if(entity==='node'&&target.inherit!==false&&!allowIndependent)throw Error('请确认将此内容改为独立权限，原有成员权限会保留');
    const acl=entity==='node'&&target.inherit!==false?Object.fromEntries(s.members.map(m=>[m.id,rights(m.id)])):{...target.acl};missing.forEach(id=>{acl[id]={...NONE,...acl[id],view:true};});
    next={...s,[entity==='space'?'spaces':'nodes']:s[entity==='space'?'spaces':'nodes'].map(n=>n.id===target.id?{...n,acl,...(entity==='node'?{inherit:false}:{})}:n)};
  }
  const time=stamp(),history=[...(next.internalShares||[])];for(const toId of ids){const old=history.findIndex(x=>x.entity===entity&&x.targetId===target.id&&x.fromId===userId&&x.toId===toId);const value={id:old>=0?history[old].id:uid(),entity,targetId:target.id,fromId:userId,toId,time,readAt:''};if(old>=0)history[old]=value;else history.push(value);}
  return record({...next,internalShares:history},userId,'分享给内部成员',target.name);
}
export function internalInbox(s,userId){return (s.internalShares||[]).filter(r=>r.toId===userId&&!r.readAt).map(r=>({...r,item:(r.entity==='space'?s.spaces:s.nodes).find(x=>x.id===r.targetId)})).filter(r=>(r.entity==='space'?libraryRights(s,r.item,userId):fileRights(s,r.item,userId)).view);}
