import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState } from './store.js';
import { createLibrary } from './libraryCreation.js';
import { createContent, renameContent } from './contentCreation.js';
import { accessFromSubjects, companyId } from './permissions.js';
import { accessFingerprint, contentRights, saveEntityAccess, restoreContent } from './access.js';
import { addCollaborators, savePermissionDetails } from './permissionOperations.js';
import { favorites, setFavorite, actionReason, batchPreflight, performBatch, sourceLocations } from './fileActions.js';
import { buildDownload, downloadPlan } from './bundles.js';
import { makeZip } from './zip.js';
import { printableMarkup } from './printable.js';
const person=(id,role)=>({type:'person',id,role});
function fixture(){
  let s=seedState();const r=createLibrary(s,{name:'交互验收',initializer:'shared',access:accessFromSubjects(s,[person('chen-ke','manager')])},s.meId);s=r.state;
  const add=(format,name,parentId='')=>{const r=createContent(s,{format,name,spaceId:rLib.id,parentId},s.meId);s=r.state;return r.node;};
  const rLib=r.library,a=add('doc','甲'),b=add('doc','乙'),folder=add('folder','目录'),child=add('doc','子文档',folder.id),target=add('folder','目标');
  return {s,lib:rLib,a,b,folder,child,target};
}
test('增量分享只增本项授权，不再冻结上级；父级撤权仅影响继承部分',()=>{
  let {s,lib,a}=fixture();const before=structuredClone(s),expected=accessFingerprint(s,a,'node'),args={id:a.id,subjects:[person('zhao-heng','editor')],expected};
  s=addCollaborators(s,args,s.meId);const item=s.nodes.find(n=>n.id===a.id);assert.equal(item.permissionMode,'layered');assert.equal(item.localAccess.subjects.length,1);assert.equal(contentRights(s,item,'chen-ke').manage,true);assert.equal(contentRights(s,item,'zhao-heng').edit,true);assert.deepEqual(before.nodes.find(n=>n.id===a.id).localAccess.subjects,[]);
  assert.throws(()=>addCollaborators(s,{id:a.id,subjects:[person('zhao-heng','viewer')]},s.meId),/已有直接授权/);
  s=saveEntityAccess(s,{id:lib.id,entity:'space',access:accessFromSubjects(s,[])},s.meId);assert.equal(contentRights(s,item,'chen-ke').manage,false);assert.equal(contentRights(s,item,'zhao-heng').edit,true);
});
test('继承分享保留组织来源及重叠授权最高档，不影响独立子项',()=>{
  let {s,lib,folder,child}=fixture();s=saveEntityAccess(s,{id:lib.id,entity:'space',access:accessFromSubjects(s,[{type:'company',id:companyId(s),role:'viewer'},{type:'department',id:'product',role:'editor'}])},s.meId);
  s=saveEntityAccess(s,{id:child.id,access:accessFromSubjects(s,[]),inherit:false},s.meId);
  const original=structuredClone(s.nodes.find(n=>n.id===child.id));
  s=addCollaborators(s,{id:folder.id,subjects:[person('chen-ke','viewer')],confirmedIndependent:true},s.meId);
  assert.equal(contentRights(s,s.nodes.find(n=>n.id===folder.id),'chen-ke').edit,true);assert.deepEqual(s.nodes.find(n=>n.id===child.id),original);
});
test('新增授权提交前撤权或变更授权会阻止，原状态完全不变',()=>{
  const {s,a}=fixture(),expected=accessFingerprint(s,a,'node');s.spaces.at(-1).access=accessFromSubjects(s,[]);const before=structuredClone(s);
  assert.throws(()=>addCollaborators(s,{id:a.id,subjects:[person('zhao-heng','editor')],confirmedIndependent:true,expected},'chen-ke'),/管理权限/);
  assert.throws(()=>addCollaborators(s,{id:a.id,subjects:[person('zhao-heng','editor')],confirmedIndependent:true,expected},s.meId),/权限已变化/);assert.deepEqual(s,before);
});
test('设置名称简介与权限一次保存，重名、超长或并发信息失败均不改任何字段',()=>{
  let {s,lib}=fixture();const before=structuredClone(s),args={id:lib.id,entity:'space',name:'已修改',description:'简介',access:accessFromSubjects(s,[person('zhao-heng','editor')]),expected:accessFingerprint(s,lib,'space'),expectedMetadata:JSON.stringify([lib.name,lib.description||''])};
  assert.throws(()=>savePermissionDetails(s,{...args,name:s.spaces[0].name},s.meId),/同名/);assert.throws(()=>savePermissionDetails(s,{...args,description:'a'.repeat(301)},s.meId),/300/);assert.deepEqual(s,before);
  const next=savePermissionDetails(s,args,s.meId);assert.equal(next.spaces.at(-1).name,'已修改');assert.equal(next.spaces.at(-1).access.subjects[0].id,'zhao-heng');assert.deepEqual(s,before);
  assert.throws(()=>savePermissionDetails(next,{...args,expected:undefined},s.meId),/其他页面/);
});
test('收藏按用户迁移，旧收藏仅归主用户，文件夹可收藏且权限丢失不能操作',()=>{
  let {s,folder}=fixture();assert.ok(favorites(s,s.meId).includes('doc-faq'));assert.deepEqual(favorites(s,'chen-ke'),[]);
  s=setFavorite(s,folder.id,'chen-ke');assert.ok(favorites(s,'chen-ke').includes(folder.id));assert.ok(favorites(s,s.meId).includes('doc-faq'));assert.equal(favorites(s,s.meId).includes(folder.id),false);
  s=setFavorite(s,folder.id,'chen-ke');assert.deepEqual(favorites(s,'chen-ke'),[]);assert.throws(()=>setFavorite(s,folder.id,'lin-xia'),/权限/);
});
test('批量移动重名整批阻止；复制自动唯一；原状态及缓存历史不变',()=>{
  let {s,lib,a,b,target}=fixture();s.nodes.find(n=>n.id===a.id).versions=[{body:'历史'}];const existing=createContent(s,{name:b.name,format:'doc',spaceId:lib.id,parentId:target.id},s.meId);s=existing.state;const before=structuredClone(s);
  assert.throws(()=>performBatch(s,{ids:[a.id,b.id],spaceId:lib.id,action:'move',parentId:target.id},s.meId),/同名/);assert.deepEqual(s,before);
  let result=performBatch(s,{ids:[a.id,b.id],spaceId:lib.id,action:'copy',parentId:''},s.meId);const again=performBatch(result.state,{ids:[a.id,b.id],spaceId:lib.id,action:'copy',parentId:''},s.meId);
  const siblings=again.state.nodes.filter(n=>n.spaceId===lib.id&&!n.parentId);assert.equal(new Set(siblings.map(n=>n.name)).size,siblings.length);assert.deepEqual(result.nodes[0].versions,[{body:'历史'}]);assert.deepEqual(s,before);
});
test('批量包含不可授权后代时拒绝且提示不泄露其名称，提交前重新检查撤权',()=>{
  let {s,lib,a,folder,child,target}=fixture();s.spaces.at(-1).access=accessFromSubjects(s,[person('chen-ke','editor')]);folder.localAccess=accessFromSubjects(s,[person('chen-ke','manager')]);s.nodes.find(n=>n.id===child.id).inheritedExclusions=[{type:'person',id:'chen-ke'}];const before=structuredClone(s);
  for(const action of ['move','copy','delete','download']){const reason=actionReason(s,folder,'chen-ke',action);assert.ok(reason);assert.equal(reason.includes(child.name),false);assert.throws(()=>performBatch(s,{ids:[a.id,folder.id],spaceId:lib.id,action,parentId:target.id},'chen-ke'));}
  assert.deepEqual(s,before);s.spaces.at(-1).access=accessFromSubjects(s,[person('chen-ke','viewer')]);assert.throws(()=>performBatch(s,{ids:[a.id],spaceId:lib.id,action:'delete'},'chen-ke'),/管理/);
});
test('批量仅当前库、不可自移或进入后代，过期位置拒绝，重复父子选项只操作一次',()=>{
  const {s,lib,a,folder,child,target}=fixture();assert.throws(()=>batchPreflight(s,{ids:[a.id,'doc-faq'],spaceId:lib.id,action:'copy'},s.meId),/当前知识库/);
  for(const parentId of ['',folder.id,child.id])assert.throws(()=>performBatch(s,{ids:[folder.id],spaceId:lib.id,action:'move',parentId},s.meId));
  const expected=sourceLocations(s,[a.id]);s.nodes.find(n=>n.id===a.id).parentId=folder.id;assert.throws(()=>performBatch(s,{ids:[a.id],spaceId:lib.id,action:'move',parentId:target.id,expected},s.meId),/位置或名称/);
  const r=performBatch(s,{ids:[folder.id,child.id],spaceId:lib.id,action:'copy',parentId:target.id},s.meId);assert.equal(r.nodes.length,1);assert.equal(r.state.nodes.filter(n=>n.sourceNodeId===child.id).length,1);
});
test('批量删除恢复不复活早先独立删除的项目',()=>{
  let {s,lib,a,folder,child}=fixture();s.nodes.find(n=>n.id===child.id).deletedAt='earlier';s.nodes.find(n=>n.id===child.id).deleteBatch='old';
  s=performBatch(s,{ids:[a.id,folder.id],spaceId:lib.id,action:'delete'},s.meId).state;s=restoreContent(s,folder.id,s.meId);assert.equal(s.nodes.find(n=>n.id===child.id).deletedAt,'earlier');assert.ok(s.nodes.find(n=>n.id===a.id).deletedAt);
});
test('各项分别有目标但整批没有共同可编辑位置时禁用',()=>{
  const {s,lib,folder,target}=fixture();s.spaces.at(-1).access=accessFromSubjects(s,[person('chen-ke','viewer')]);
  for(const node of [folder,target]){node.localAccess=accessFromSubjects(s,[person('chen-ke','manager')]);}
  assert.equal(actionReason(s,folder,'chen-ke','copy'),'');assert.equal(actionReason(s,target,'chen-ke','copy'),'');
  assert.throws(()=>batchPreflight(s,{ids:[folder.id,target.id],spaceId:lib.id,action:'copy'},'chen-ke'),/整批/);
});
test('上传文件复制与重命名保持扩展名和 Blob 引用',()=>{
  let {s,lib,target}=fixture();const uploaded={id:'upload',spaceId:lib.id,parentId:'',type:'doc',format:'file',fileName:'原件.txt',name:'原件.txt',blobId:'original',ownerId:s.meId,inherit:true};s.nodes.push(uploaded);
  assert.throws(()=>renameContent(s,uploaded.id,'新名称',s.meId),/扩展名/);s=renameContent(s,uploaded.id,'新名称.txt',s.meId);const r=performBatch(s,{ids:[uploaded.id],spaceId:lib.id,action:'copy',parentId:target.id},s.meId);assert.match(r.nodes[0].name,/副本\.txt$/);assert.equal(r.nodes[0].blobId,'original');
});
test('ZIP 包含目录、原件与在线导出；导出名称冲突处理；校验 UTF8 及原始字节',async()=>{
  let {s,lib,a,folder,child}=fixture();const original=new Blob(['真实原始数据\n']);s.nodes.push({id:'up',spaceId:lib.id,parentId:folder.id,type:'doc',format:'file',name:'原件.txt',blobId:'blob',ownerId:s.meId,inherit:true});
  s.nodes.find(n=>n.id===child.id).body='正文';s.nodes.push({id:'same',spaceId:lib.id,parentId:folder.id,type:'doc',format:'file',name:child.name+'.txt',blobId:'blob',ownerId:s.meId,inherit:true});
  const plan=downloadPlan(s,[folder.id,a.id],lib.id,s.meId);assert.ok(plan.entries.some(e=>e.path.endsWith('(2).txt')));assert.equal(new Set(plan.entries.map(e=>e.path)).size,plan.entries.length);
  const r=await buildDownload(s,[folder.id,a.id],lib.id,s.meId,{readBlob:async()=>original,latest:()=>s}),bytes=new Uint8Array(await r.blob.arrayBuffer()),view=new DataView(bytes.buffer);let at=0,paths=[];
  while(view.getUint32(at,true)===0x04034b50){const size=view.getUint32(at+18,true),len=view.getUint16(at+26,true),name=new TextDecoder().decode(bytes.slice(at+30,at+30+len));paths.push(name);if(name==='目录/原件.txt')assert.equal(new TextDecoder().decode(bytes.slice(at+30+len,at+30+len+size)),'真实原始数据\n');at+=30+len+size;}
  assert.ok(paths.includes('目录/'));assert.ok(paths.includes('目录/子文档.txt'));assert.equal(view.getUint32(at,true),0x02014b50);assert.match(r.name,/\.zip$/);
});
test('下载缺失原件、撤权、内容变化或取消时不产生可交付文件',async()=>{
  const {s,lib,folder}=fixture();s.nodes.push({id:'up',spaceId:lib.id,parentId:folder.id,type:'doc',format:'file',name:'原件.txt',blobId:'blob',ownerId:s.meId,inherit:true});
  await assert.rejects(buildDownload(s,[folder.id],lib.id,s.meId,{readBlob:async()=>{throw Error('原件缺失');},latest:()=>s}),/原件缺失/);
  const changed=structuredClone(s);changed.viewAs='chen-ke';changed.spaces.at(-1).access=accessFromSubjects(s,[person('chen-ke','viewer')]);await assert.rejects(buildDownload(s,[folder.id],lib.id,'chen-ke',{readBlob:async()=>new Blob(['x']),latest:()=>changed}),/下载权限/);
  const renamed=structuredClone(s);renamed.nodes.find(n=>n.id===folder.id).name='变更';await assert.rejects(buildDownload(s,[folder.id],lib.id,s.meId,{readBlob:async()=>new Blob(['x']),latest:()=>renamed}),/发生变化/);
  await assert.rejects(makeZip([{name:'a',blob:new Blob(['x'])}],{cancelled:()=>true}),/取消/);
});
test('打印包含全部幻灯片、表格及完整正文并转义 HTML',()=>{
  const html=printableMarkup({format:'slides',body:JSON.stringify({slides:[{title:'<第一页>',body:'一'},{title:'第二页',body:'二'}]})});assert.equal((html.match(/print-slide/g)||[]).length,2);assert.ok(html.includes('&lt;第一页&gt;'));assert.ok(printableMarkup({name:'文档',body:'<script>内容</script>'}).includes('&lt;script&gt;'));
});
