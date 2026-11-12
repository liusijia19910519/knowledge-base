import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState, normalizeState } from './store.js';
import { createLibrary } from './libraryCreation.js';
import { createContent } from './contentCreation.js';
import { accessFromSubjects, companyId } from './permissions.js';
import { contentRights, effectiveAccess, accessFingerprint, saveEntityAccess, permissionLayers, migrateAccess, librariesForView } from './access.js';
import { addCollaborators } from './permissionOperations.js';
import { pinnedRecords, visiblePins, pinnedLibrariesForView, togglePin, reorderPin, reorderViewPin, recentVisits, visitContent, homeEntries } from './personalization.js';
const person=(id,role)=>({type:'person',id,role}),empty=state=>accessFromSubjects(state,[]);
function fixture(){let s=normalizeState(seedState());let r=createLibrary(s,{name:'分层授权验收',initializer:'shared',access:accessFromSubjects(s,[person('chen-ke','viewer'),person('zhao-heng','editor')])},s.meId);s=r.state;const library=r.library;const add=(format,name,parentId='')=>{const r=createContent(s,{format,name,parentId,spaceId:library.id},s.meId);s=r.state;return r.node;};const folder=add('folder','资料'),file=add('doc','授权说明',folder.id),other=add('doc','另一个文件');return {s,library,folder,file,other};}
const setLocal=(s,id,subjects,excluded=[])=>saveEntityAccess(s,{id,localAccess:accessFromSubjects(s,subjects),inheritedExclusions:excluded},s.meId);
test('父级更新仅更新继承层，自定义保留且同人按最高权限生效',()=>{
  let {s,library,file}=fixture();s=setLocal(s,file.id,[person('chen-ke','editor')]);
  assert.equal(contentRights(s,file,'chen-ke').edit,false); // The original immutable snapshot is unchanged.
  let current=s.nodes.find(n=>n.id===file.id);assert.equal(contentRights(s,current,'chen-ke').edit,true);
  s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[person('chen-ke','manager')])},s.meId);
  current=s.nodes.find(n=>n.id===file.id);assert.equal(contentRights(s,current,'chen-ke').manage,true);assert.equal(contentRights(s,current,'zhao-heng').view,false);assert.equal(current.localAccess.subjects[0].role,'editor');
  s=saveEntityAccess(s,{id:library.id,entity:'space',access:empty(s)},s.meId);assert.equal(contentRights(s,current,'chen-ke').edit,true);assert.equal(contentRights(s,current,'chen-ke').manage,false);
});
test('移除的继承来源不会因父级改档、删除后重加或刷新复活，自定义不受影响',()=>{
  let {s,library,file}=fixture();s=setLocal(s,file.id,[person('chen-ke','editor')],[{type:'person',id:'chen-ke'},{type:'person',id:'zhao-heng'}]);
  s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[person('chen-ke','manager'),person('zhao-heng','manager')])},s.meId);
  let current=s.nodes.find(n=>n.id===file.id);assert.equal(contentRights(s,current,'chen-ke').manage,false);assert.equal(contentRights(s,current,'chen-ke').edit,true);assert.equal(contentRights(s,current,'zhao-heng').view,false);
  s=saveEntityAccess(s,{id:library.id,entity:'space',access:empty(s)},s.meId);s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[person('zhao-heng','manager')])},s.meId);s=normalizeState(JSON.parse(JSON.stringify(s)));current=s.nodes.find(n=>n.id===file.id);assert.equal(contentRights(s,current,'zhao-heng').view,false);assert.equal(current.inheritedExclusions.length,2);
  s=setLocal(s,file.id,current.localAccess.subjects,[{type:'person',id:'chen-ke'}]);assert.equal(contentRights(s,s.nodes.find(n=>n.id===file.id),'zhao-heng').manage,true);
});
test('公司、部门、人员来源分别排除；排除一项不影响其他来源及下级本项授权',()=>{
  let {s,library,folder,file}=fixture();s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[{type:'company',id:companyId(s),role:'viewer'},{type:'department',id:'product',role:'editor'}])},s.meId);
  s=setLocal(s,folder.id,[],[{type:'company',id:companyId(s)}]);s=setLocal(s,file.id,[person('lin-xia','downloader')]);
  const current=s.nodes.find(n=>n.id===file.id);assert.equal(contentRights(s,current,'chen-ke').edit,true);assert.equal(contentRights(s,current,'zhao-heng').view,false);assert.equal(contentRights(s,current,'lin-xia').download,true);assert.equal(effectiveAccess(s,current).visibility,'members');
  assert.equal(librariesForView(s,'lin-xia','shared').some(l=>l.id===library.id),true);
});
test('新增分享只写本项，不把父级快照保存为自定义；相同继承对象可补充本项授权',()=>{
  let {s,file}=fixture();s=addCollaborators(s,{id:file.id,subjects:[person('chen-ke','editor')]},s.meId);const current=s.nodes.find(n=>n.id===file.id),layers=permissionLayers(s,current);
  assert.deepEqual(layers.local.subjects,[person('chen-ke','editor')]);assert.equal(layers.inherited.subjects.length,2);assert.equal(layers.excluded.length,0);
  assert.throws(()=>addCollaborators(s,{id:file.id,subjects:[person('chen-ke','viewer')]},s.meId),/已有直接授权/);
});
test('权限草稿取消不改状态；父级变动或操作者撤权后提交失败；创建者不可移除',()=>{
  let {s,library,file}=fixture();const before=structuredClone(s),draft=permissionLayers(s,file);draft.excluded=[{type:'person',id:'chen-ke'}];draft.local.subjects.push(person('lin-xia','viewer'));assert.deepEqual(s,before);
  const expected=accessFingerprint(s,file,'node');s=saveEntityAccess(s,{id:library.id,entity:'space',access:empty(s)},s.meId);
  assert.throws(()=>saveEntityAccess(s,{id:file.id,localAccess:empty(s),expected},s.meId),/其他页面/);assert.throws(()=>saveEntityAccess(s,{id:file.id,localAccess:empty(s)},'chen-ke'),/管理权限/);
  s=setLocal(s,file.id,[person(s.meId,'viewer')],[{type:'person',id:s.meId}]);const current=s.nodes.find(n=>n.id===file.id);assert.equal(current.localAccess.subjects.length,0);assert.equal(current.inheritedExclusions.length,0);assert.equal(contentRights(s,current,s.meId).manage,true);
});
test('缓存迁移保留显式自定义，忽略旧纯继承快照，不改原数据且幂等',()=>{
  const s=seedState();s.accessModelVersion=1;s.nodes[0].access=accessFromSubjects(s,[person('lin-xia','manager')]);s.nodes[1].inherit=false;s.nodes[1].access=accessFromSubjects(s,[person('zhao-heng','editor')]);s.nodes[1].versions=[{body:'历史'}];s.nodes[1].blobId='original';const before=structuredClone(s),next=migrateAccess(s);
  assert.deepEqual(s,before);assert.equal(next.nodes[0].localAccess.subjects.length,0);assert.deepEqual(next.nodes[1].localAccess.subjects,[person('zhao-heng','editor')]);assert.deepEqual(next.nodes[1].versions,before.nodes[1].versions);assert.equal(next.nodes[1].blobId,'original');assert.deepEqual(migrateAccess(next),next);
});
test('置顶主用户初始四项、跨入口去重、取消后不自动补齐，排序按用户刷新保留',()=>{
  let {s,library}=fixture();const initial=pinnedRecords(s,s.meId);assert.equal(initial.length,3);assert.deepEqual(pinnedRecords(s,'chen-ke'),[]);
  s=togglePin(s,s.meId,library.id,'personal');assert.equal(visiblePins(s,s.meId).length,initial.length+1);s=reorderPin(s,s.meId,library.id,initial[0].spaceId);assert.equal(visiblePins(s,s.meId)[0].library.id,library.id);
  s=normalizeState(JSON.parse(JSON.stringify(s)));assert.equal(visiblePins(s,s.meId)[0].library.id,library.id);s=togglePin(s,s.meId,library.id,'shared');assert.equal(visiblePins(s,s.meId).length,initial.length);
  s=togglePin(s,'chen-ke',library.id,'shared');assert.equal(pinnedRecords(s,'chen-ke').length,1);s=saveEntityAccess(s,{id:library.id,entity:'space',access:empty(s)},s.meId);assert.equal(visiblePins(s,'chen-ke').length,0);
  for(const p of [...pinnedRecords(s,s.meId)])s=togglePin(s,s.meId,p.spaceId);assert.deepEqual(visiblePins(s,s.meId),[]);
});
test('主页四个范围按本人记录、实际权限和归属过滤；仅查看的他人广场内容不算与我共享',()=>{
  let {s,library,file,other,folder}=fixture();s=visitContent(s,other.id,s.meId);s=visitContent(s,file.id,s.meId);assert.deepEqual(homeEntries(s,s.meId,'recent').slice(0,2).map(n=>n.id),[file.id,other.id]);assert.equal(recentVisits(s,'lin-xia').length,0);
  assert.ok(homeEntries(s,s.meId,'mine').some(n=>n.id===folder.id));assert.ok(homeEntries(s,'chen-ke','shared').some(n=>n.id===file.id));
  s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[{type:'company',id:companyId(s),role:'viewer'}])},s.meId);assert.equal(homeEntries(s,'chen-ke','shared').some(n=>n.id===file.id),false);assert.ok(homeEntries(s,s.meId,'mine').some(n=>n.id===file.id));
  s=visitContent(s,file.id,'chen-ke');assert.equal(homeEntries(s,'chen-ke','recent')[0].id,file.id);assert.equal(homeEntries(s,s.meId,'recent')[0].id,file.id);assert.equal(homeEntries(s,s.meId,'mine','不匹配').length,0);
});
test('卡片页置顶按当前空间过滤，排序与左侧独立且跨入口不重复置顶',()=>{
  let {s,library}=fixture();s=togglePin(s,s.meId,library.id,'personal');
  assert.ok(pinnedLibrariesForView(s,s.meId,'shared').some(l=>l.id===library.id));
  assert.equal(pinnedLibrariesForView(s,s.meId,'shared').some(l=>l.id==='space-personal'),false);
  s=reorderPin(s,s.meId,library.id,pinnedRecords(s,s.meId)[0].spaceId);
  assert.notEqual(pinnedLibrariesForView(s,s.meId,'shared')[0].id,library.id);
  const sidebar=visiblePins(s,s.meId).map(p=>p.library.id);
  s=reorderViewPin(s,s.meId,'shared',library.id,pinnedLibrariesForView(s,s.meId,'shared')[0].id);
  assert.equal(pinnedLibrariesForView(s,s.meId,'shared')[0].id,library.id);
  assert.deepEqual(visiblePins(s,s.meId).map(p=>p.library.id),sidebar);
  assert.ok(librariesForView(s,s.meId,'shared').some(l=>l.id===library.id));
  s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[{type:'company',id:companyId(s),role:'viewer'}])},s.meId);
  assert.equal(pinnedLibrariesForView(s,s.meId,'shared').some(l=>l.id===library.id),false);
  assert.ok(pinnedLibrariesForView(s,s.meId,'plaza').some(l=>l.id===library.id));
  s=togglePin(s,s.meId,library.id);assert.equal(pinnedLibrariesForView(s,s.meId,'plaza').some(l=>l.id===library.id),false);
  s.pinsByUser[s.meId]=[];assert.deepEqual(pinnedLibrariesForView(s,s.meId,'personal'),[]);
});

test('空间卡片与左侧排序各自刷新保留，三个空间及用户间隔离，取消置顶同步移除',()=>{
  let {s,library}=fixture();s=togglePin(s,s.meId,library.id,'personal');
  const homeBefore=pinnedLibrariesForView(s,s.meId,'personal').map(l=>l.id);
  s=reorderPin(s,s.meId,library.id,pinnedRecords(s,s.meId)[0].spaceId);
  assert.deepEqual(pinnedLibrariesForView(s,s.meId,'personal').map(l=>l.id),homeBefore);
  const sidebarBefore=visiblePins(s,s.meId).map(p=>p.library.id),sharedBefore=pinnedLibrariesForView(s,s.meId,'shared').map(l=>l.id);
  s=reorderViewPin(s,s.meId,'personal',library.id,homeBefore[0]);
  s=normalizeState(JSON.parse(JSON.stringify(s)));
  assert.equal(pinnedLibrariesForView(s,s.meId,'personal')[0].id,library.id);
  assert.deepEqual(visiblePins(s,s.meId).map(p=>p.library.id),sidebarBefore);
  assert.deepEqual(pinnedLibrariesForView(s,s.meId,'shared').map(l=>l.id),sharedBefore);
  assert.deepEqual(pinnedLibrariesForView(s,'chen-ke','shared'),[]);
  s=reorderPin(s,s.meId,library.id,sidebarBefore.at(-1),true);
  assert.equal(pinnedLibrariesForView(s,s.meId,'personal')[0].id,library.id);
  s=togglePin(s,s.meId,library.id);
  assert.equal(pinnedLibrariesForView(s,s.meId,'personal').some(l=>l.id===library.id),false);
  assert.equal(pinnedLibrariesForView(s,s.meId,'shared').some(l=>l.id===library.id),false);
  s=togglePin(s,s.meId,library.id,'shared');
  assert.equal(pinnedLibrariesForView(s,s.meId,'personal').at(-1).id,library.id);
});
