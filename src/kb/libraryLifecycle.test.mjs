import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, seedState } from './store.js';
import { contentRights, deleteContent, librariesForView, saveEntityAccess } from './access.js';
import { accessFromSubjects } from './permissions.js';
import { deleteLibrary, restoreLibrary, permanentlyDeleteLibrary, libraryDeletionSnapshot } from './libraryLifecycle.js';
import { navigateFolder } from './folderNavigation.js';
import { relocateContent } from './contentOperations.js';
import { createContent } from './contentCreation.js';

const fresh=()=>normalizeState(seedState()),get=(s,id)=>s.nodes.find(n=>n.id===id);
test('整库删除隐藏卡片和内容；恢复保留ID、创建者、正文及普通授权',()=>{
  const s=fresh(),before=structuredClone(s),deleted=deleteLibrary(s,'space-handbook',s.meId,libraryDeletionSnapshot(s,'space-handbook'));
  assert.deepEqual(s,before);assert.ok(!librariesForView(deleted,s.meId).some(l=>l.id==='space-handbook'));
  assert.equal(contentRights(deleted,get(deleted,'doc-guide'),'chen-ke').view,false);
  const restored=restoreLibrary(deleted,'space-handbook',s.meId);
  for(const n of s.nodes.filter(n=>n.spaceId==='space-handbook')){
    const r=get(restored,n.id);assert.equal(r.ownerId,n.ownerId);assert.equal(r.body,n.body);assert.deepEqual(r.localAccess,n.localAccess);assert.equal(r.deletedAt,'');
  }
  assert.ok(librariesForView(restored,s.meId).some(l=>l.id==='space-handbook'));
});
test('整库恢复不复活之前单独删除的内容',()=>{
  const s=deleteContent(fresh(),'doc-guide','zhou-ning'),batch=get(s,'doc-guide').deleteBatch;
  const restored=restoreLibrary(deleteLibrary(s,'space-handbook','zhou-ning'),'space-handbook','zhou-ning');
  assert.ok(get(restored,'doc-guide').deletedAt);assert.equal(get(restored,'doc-guide').deleteBatch,batch);assert.equal(get(restored,'folder-guide').deletedAt,'');
});
test('删除前再核权限和内容快照，失败不部分写入',()=>{
  let s=fresh();assert.throws(()=>deleteLibrary(s,'space-handbook','lin-xia'),/管理权限/);
  const snapshot=libraryDeletionSnapshot(s,'space-handbook');s=createContent(s,{spaceId:'space-handbook',format:'doc'},s.meId).state;
  const before=structuredClone(s);assert.throws(()=>deleteLibrary(s,'space-handbook',s.meId,snapshot),/已变化/);assert.deepEqual(s,before);
});
test('普通管理者被子项排除时不能通过整库删除绕过权限',()=>{
  let s=fresh();s=saveEntityAccess(s,{id:'space-handbook',entity:'space',access:accessFromSubjects(s,[{type:'person',id:'lin-xia',role:'manager'}])},s.meId);
  s=saveEntityAccess(s,{id:'doc-faq',localAccess:accessFromSubjects(s,[]),inheritedExclusions:[{type:'person',id:'lin-xia'}]},s.meId);
  assert.throws(()=>deleteLibrary(s,'space-handbook','lin-xia'),/部分内容/);
});
test('恢复同名冲突不覆盖，非管理者不能恢复或彻底删除',()=>{
  let s=deleteLibrary(fresh(),'space-handbook','zhou-ning');
  assert.throws(()=>restoreLibrary(s,'space-handbook','lin-xia'),/管理权限/);assert.throws(()=>permanentlyDeleteLibrary(s,'space-handbook','lin-xia'),/管理权限/);
  s={...s,spaces:[...s.spaces,{...s.spaces.find(l=>l.id==='space-handbook'),id:'collision',deletedAt:''}]};
  assert.throws(()=>restoreLibrary(s,'space-handbook','zhou-ning'),/同名/);
});
test('彻底删除仅移除目标库；外部副本原始文件引用不受损',()=>{
  let s=fresh();s={...s,nodes:s.nodes.map(n=>n.id==='doc-guide'?{...n,blobId:'stable-original',format:'file'}:n)};
  const copied=relocateContent(s,{id:'doc-guide',mode:'copy',spaceId:'space-personal',parentId:''},s.meId);s=copied.state;
  s=permanentlyDeleteLibrary(deleteLibrary(s,'space-handbook',s.meId),'space-handbook',s.meId);
  assert.equal(s.spaces.some(l=>l.id==='space-handbook'),false);assert.equal(s.nodes.some(n=>n.spaceId==='space-handbook'),false);assert.equal(get(s,copied.node.id).blobId,'stable-original');
});
test('仅文件授权允许上级路径导航，不产生访问记录或扩大其他内容权限',()=>{
  let s=fresh();s=saveEntityAccess(s,{id:'space-handbook',entity:'space',access:accessFromSubjects(s,[])},s.meId);s=saveEntityAccess(s,{id:'doc-guide',localAccess:accessFromSubjects(s,[{type:'person',id:'lin-xia',role:'viewer'}])},s.meId);
  assert.equal(contentRights(s,get(s,'folder-guide'),'lin-xia').view,false);
  const navigation=navigateFolder(s,'space-handbook','lin-xia','shared','folder-guide');
  assert.deepEqual(navigation.trail,['folder-guide']);assert.equal(navigation.state,s);assert.equal(contentRights(s,get(s,'doc-faq'),'lin-xia').view,false);
  assert.throws(()=>navigateFolder(s,'space-handbook','lin-xia','shared','folder-retro'),/不可访问/);
});
test('真实有权文件夹记录访问，目录撤权后拒绝导航',()=>{
  const s=fresh(),r=navigateFolder(s,'space-handbook',s.meId,'shared','folder-guide');
  assert.equal(r.state.recentVisitsByUser[s.meId][0].id,'folder-guide');
  assert.throws(()=>navigateFolder(s,'space-personal','lin-xia','personal',''),/不可访问/);
});
