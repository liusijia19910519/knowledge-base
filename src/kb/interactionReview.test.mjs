import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState, normalizeState } from './store.js';
import { createLibrary } from './libraryCreation.js';
import { createContent } from './contentCreation.js';
import { commitCreationDraft, abandonCreationDraft } from './creationDrafts.js';
import { contentRights, saveEntityAccess, permissionLayers, deleteContent, restoreContent, parentAccess } from './access.js';
import { addCollaborators, savePermissionDetails } from './permissionOperations.js';
import { relocateContent } from './contentOperations.js';
import { didShareItem } from './sharing.js';
import { homeEntries } from './personalization.js';
import { transferResponsibility, handoverSnapshot } from './handover.js';
import { accessFromSubjects, companyId } from './permissions.js';
import { selectionRoots, toggleTreeSelection, itemChecked, itemPartial, selectionSummary } from './treeSelection.js';
import { explainPermission } from './permissionExplanation.js';
import { sortedDirectory } from './directorySort.js';
import { resultLocation } from './resultLocation.js';
const person=(id,role)=>({type:'person',id,role}),fresh=()=>normalizeState(seedState()),get=(s,id)=>s.nodes.find(n=>n.id===id);
function fixture(){let s=fresh();const made=createLibrary(s,{name:'新规则验收',initializer:'shared',access:accessFromSubjects(s,[person('chen-ke','viewer')])},s.meId);s=made.state;const add=(name,type='doc',parentId='')=>{const next=createContent(s,{spaceId:made.library.id,parentId,format:type,name},s.meId);s=next.state;return next.node;};const folder=add('目录','folder'),a=add('甲','doc',folder.id),b=add('乙','doc',folder.id);return {s,library:made.library,folder,a,b};}
test('我共享的没有操作者记录时不按负责人或创建者推断',()=>{const s=fresh();assert.equal(didShareItem(s,get(s,'doc-faq'),s.meId),false);assert.equal(homeEntries(s,s.meId,'mine').some(n=>n.id==='doc-faq'),false);});
test('实际新增授权按操作者记录，他人创建的内容也能归入我共享的',()=>{let s=fresh();s=addCollaborators(s,{id:'doc-guide',subjects:[person('lin-xia','viewer')]},s.meId);assert.equal(didShareItem(s,get(s,'doc-guide'),s.meId),true);assert.notEqual(get(s,'doc-guide').ownerId,s.meId);});
test('继承共享来源受排除约束，删除授权和他人重新添加不复活旧归属',()=>{let {s,library,a}=fixture();assert.equal(didShareItem(s,get(s,a.id),s.meId),true);s=savePermissionDetails(s,{id:a.id,localAccess:accessFromSubjects(s,[]),inheritedExclusions:[{type:'person',id:'chen-ke'}]},s.meId);assert.equal(didShareItem(s,get(s,a.id),s.meId),false);s=savePermissionDetails(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[])},s.meId);s.viewAs='zhou-ning';assert.equal(s.shareAttribution[`space:${library.id}`]['person:chen-ke'],undefined);});
test('仅修改名称不把历史授权认领为自己的共享',()=>{let s=fresh();const lib=s.spaces.find(n=>n.id==='space-handbook');s=savePermissionDetails(s,{id:lib.id,entity:'space',name:lib.name+'新',description:lib.description,access:lib.access},s.meId);assert.equal(didShareItem(s,get(s,'doc-faq'),s.meId),false);});
test('个人原件进入组织库记录实际分发，组织原件不能移回但可复制',()=>{const s=fresh(),moved=relocateContent(s,{id:'doc-note',mode:'move',spaceId:'space-handbook',parentId:''},s.meId);assert.equal(didShareItem(moved.state,moved.node,s.meId),true);assert.throws(()=>relocateContent(moved.state,{id:moved.node.id,mode:'move',spaceId:'space-personal',parentId:''},s.meId),/组织原件/);const copy=relocateContent(moved.state,{id:moved.node.id,mode:'copy',spaceId:'space-personal',parentId:''},s.meId);assert.notEqual(copy.node.id,moved.node.id);assert.equal(copy.node.responsibleId,s.meId);});
test('新建在线草稿仅本人可读，首次保存后才继承广场权限',()=>{let s=fresh();const made=createContent(s,{spaceId:'space-plaza',format:'doc',creationDraft:true,name:'新草稿'},'zhao-heng');s=made.state;assert.equal(contentRights(s,made.node,'chen-ke').view,false);assert.equal(contentRights(s,made.node,'zhao-heng').edit,true);assert.equal(contentRights(s,made.node,'zhao-heng').download,false);const saved=commitCreationDraft(s,made.node,'zhao-heng');s.nodes=s.nodes.map(n=>n.id===saved.id?saved:n);assert.equal(saved.creationDraft,undefined);assert.equal(contentRights(s,saved,'chen-ke').view,true);assert.equal(contentRights(s,saved,'chen-ke').download,false);});
test('首次保存重查目录编辑权限，临时稿不能先授权绕过',()=>{let {s,library}=fixture();const draft=createContent(s,{spaceId:library.id,format:'sheet',creationDraft:true},s.meId);s=draft.state;assert.throws(()=>addCollaborators(s,{id:draft.node.id,subjects:[person('lin-xia','editor')]},s.meId),/首次保存/);s.spaces=s.spaces.map(n=>n.id===library.id?{...n,responsibleId:'zhao-heng',access:accessFromSubjects(s,[])}:n);assert.throws(()=>commitCreationDraft(s,draft.node,s.meId),/编辑权限/);});
test('放弃新建只删除草稿，已提交内容不可冒充草稿删除',()=>{let {s,library,a}=fixture();const draft=createContent(s,{spaceId:library.id,format:'slides',creationDraft:true},s.meId);s=draft.state;const next=abandonCreationDraft(s,draft.node.id,s.meId);assert.equal(get(next,draft.node.id),undefined);assert.ok(get(next,a.id));assert.throws(()=>abandonCreationDraft(s,a.id,s.meId),/草稿状态/);});
test('父子选择按根去重，部分子项让父级半选',()=>{const {s,folder,a,b}=fixture();assert.deepEqual(selectionRoots(s,[folder.id,a.id,b.id]),[folder.id]);assert.equal(itemPartial(s,[a.id],folder.id),true);assert.equal(itemChecked(s,[folder.id],a.id),true);assert.match(selectionSummary(s,[folder.id,a.id]),/1 个文件夹/);});
test('选中父级后取消子项，不会重新包含被取消项',()=>{const {s,folder,a,b}=fixture(),ids=toggleTreeSelection(s,[folder.id],a.id,[folder.id,a.id,b.id]);assert.equal(itemChecked(s,ids,a.id),false);assert.equal(itemChecked(s,ids,b.id),true);assert.equal(itemPartial(s,ids,folder.id),true);});
test('权限说明把部门高权限与个人本项低权限分别展示',()=>{const s=fresh(),subject=person('chen-ke','viewer'),result=explainPermission(s,subject,{local:[subject],inherited:[{type:'department',id:'product',role:'editor'}],sourceLabel:'知识库'});assert.equal(result.effectiveRole,'editor');assert.deepEqual(result.entries.map(n=>n.role),['viewer','editor']);});
test('排除普通继承不会抵消固定公司查看及负责人保护',()=>{const s=fresh(),subject=person('chen-ke','viewer'),result=explainPermission(s,subject,{inherited:[{type:'department',id:'product',role:'editor'}],excluded:[{type:'department',id:'product'}],floor:[{type:'company',id:companyId(s),role:'viewer'}]});assert.equal(result.effectiveRole,'viewer');const protectedResult=explainPermission(s,subject,{protectedRows:[{id:'chen-ke',sources:['负责人']}]});assert.equal(protectedResult.effectiveRole,'manager');});
test('排序不打乱同值顺序，缺失时间保持末尾',()=>{const nodes=[{id:'a',name:'文档10',updatedAt:'2026-01-01'},{id:'b',name:'文档2',updatedAt:'2026-01-01'},{id:'c',name:'文档1'}];assert.deepEqual(sortedDirectory(nodes,{field:'name',direction:'asc'}).map(n=>n.id),['c','b','a']);for(const direction of ['asc','desc'])assert.deepEqual(sortedDirectory(nodes,{field:'updatedAt',direction}).map(n=>n.id),['a','b','c']);});
test('查看位置按最新ID定位，撤权或身份变化不使用旧路径',()=>{let s=fresh();const moved=relocateContent(s,{id:'doc-note',mode:'move',spaceId:'space-handbook',parentId:''},s.meId);s=moved.state;const target={entity:'node',id:moved.node.id,userId:s.meId};assert.match(resultLocation(s,target,s.meId),/space-handbook/);assert.throws(()=>resultLocation(s,target,'chen-ke'),/用户/);s=deleteContent(s,moved.node.id,s.meId);assert.throws(()=>resultLocation(s,target,s.meId),/删除/);});
test('交接保留历史创建人，原负责人仅凭历史创建不再拥有管理权',()=>{let s=fresh();s.viewAs='zhao-heng';let r=createLibrary(s,{name:'交接隔离',initializer:'shared',access:accessFromSubjects(s,[person('zhou-ning','editor')])},'zhao-heng');s=r.state;s.viewAs='zhou-ning';const made=createContent(s,{spaceId:r.library.id,format:'doc',name:'需交接'},'zhou-ning');s=made.state;const result=transferResponsibility(s,{id:made.node.id,newResponsibleId:'chen-ke',expected:handoverSnapshot(s,made.node.id)},'zhou-ning');const item=get(result.state,made.node.id);assert.equal(item.ownerId,'zhou-ning');assert.equal(item.responsibleId,'chen-ke');assert.equal(contentRights(result.state,item,'zhou-ning').manage,false);assert.equal(contentRights(result.state,item,'zhou-ning').edit,true);assert.equal(contentRights(result.state,item,'chen-ke').manage,true);assert.equal(didShareItem(result.state,item,'chen-ke'),false);});
test('库交接默认包含已删除下级，第三方负责人和历史创建人不变',()=>{
 let {s,library,folder,a,b}=fixture();s.nodes=s.nodes.map(n=>n.id===b.id?{...n,responsibleId:'lin-xia'}:n);s=deleteContent(s,a.id,s.meId);
 const next=transferResponsibility(s,{id:library.id,entity:'space',newResponsibleId:'chen-ke',expected:handoverSnapshot(s,library.id,'space')},s.meId).state;
 assert.equal(next.spaces.find(l=>l.id===library.id).responsibleId,'chen-ke');assert.equal(get(next,folder.id).responsibleId,'chen-ke');assert.equal(get(next,a.id).responsibleId,'chen-ke');assert.ok(get(next,a.id).deletedAt);assert.equal(get(next,b.id).responsibleId,'lin-xia');assert.equal(get(next,a.id).ownerId,s.meId);
});
test('交接取消未调用提交无副作用；旧树快照和普通管理者提交被阻止',()=>{
 let {s,library,a}=fixture();const before=structuredClone(s),expected=handoverSnapshot(s,library.id,'space');assert.ok(expected);assert.deepEqual(s,before);
 s=createContent(s,{spaceId:library.id,format:'folder',name:'并发新目录'},s.meId).state;assert.throws(()=>transferResponsibility(s,{id:library.id,entity:'space',newResponsibleId:'chen-ke',expected},s.meId),/已变化/);
 s=saveEntityAccess(s,{id:library.id,entity:'space',access:accessFromSubjects(s,[person('zhao-heng','manager')])},s.meId);s.viewAs='zhao-heng';assert.throws(()=>transferResponsibility(s,{id:a.id,newResponsibleId:'chen-ke'},'zhao-heng'),/只有当前负责人/);
});
test('移动确认后的目标授权变化拒绝旧提交，不改变源位置',()=>{
 let {s,library,a}=fixture();const target=parentAccess(s,{spaceId:'space-retro',parentId:''}),before=get(s,a.id);s=saveEntityAccess(s,{id:'space-retro',entity:'space',access:accessFromSubjects(s,[person(s.meId,'editor')])},'zhao-heng');
 assert.throws(()=>relocateContent(s,{id:a.id,mode:'move',spaceId:'space-retro',parentId:'',expectedTargetAccess:JSON.stringify(target)},s.meId),/目标目录权限已变化/);assert.equal(get(s,a.id).spaceId,library.id);assert.equal(get(s,a.id),before);
});
test('组织资料恢复不能绕过转私有限制，合法共享目标保留ID',()=>{
 let {s,library,a}=fixture();s=deleteContent(s,a.id,s.meId);assert.throws(()=>restoreContent(s,a.id,s.meId,{spaceId:'space-personal',parentId:''}),/组织原件/);
 const next=restoreContent(s,a.id,s.meId,{spaceId:library.id,parentId:''});assert.equal(get(next,a.id).id,a.id);assert.equal(get(next,a.id).ownership,'organization');assert.equal(get(next,a.id).deletedAt,'');
});
test('交接负责人同名冲突不覆盖任一知识库，修改名称后才能继续',()=>{
 let {s,library}=fixture();s.viewAs='chen-ke';s=createLibrary(s,{name:library.name,initializer:'shared',access:accessFromSubjects(s,[person('lin-xia','viewer')])},'chen-ke').state;s.viewAs=s.meId;const before=structuredClone(s);
 assert.throws(()=>transferResponsibility(s,{id:library.id,entity:'space',newResponsibleId:'chen-ke'},s.meId),/同名知识库/);assert.deepEqual(s,before);
});
