import test from 'node:test';
import assert from 'node:assert/strict';
import { seedState,normalizeState } from './store.js';
import { createContent } from './contentCreation.js';
import { contentRights,deleteContent,restoreContent,restoreNeedsLocation,saveEntityAccess } from './access.js';
import { accessFromSubjects } from './permissions.js';
import { searchKnowledge } from './knowledgeSearch.js';
import { releasedResources } from './resourceCleanup.js';
import { visitContent } from './personalization.js';
import { dismissUploadTasks } from './uploadTasks.js';
const fresh=()=>normalizeState(seedState());
test('恢复原位置也检查当前编辑权限，撤权后必须另选合法位置',()=>{
  let s=fresh();const made=createContent(s,{spaceId:'space-retro',parentId:'folder-retro',format:'doc',name:'待恢复'},'lin-xia');s=deleteContent(made.state,made.node.id,'lin-xia');
  s=saveEntityAccess(s,{id:'space-retro',entity:'space',access:accessFromSubjects(s,[])},s.meId);s=saveEntityAccess(s,{id:'folder-retro',localAccess:accessFromSubjects(s,[])},s.meId);
  const node=s.nodes.find(n=>n.id===made.node.id);assert.equal(contentRights(s,s.nodes.find(n=>n.id==='folder-retro'),'lin-xia').edit,false);
  assert.equal(restoreNeedsLocation(s,node,'lin-xia'),true);assert.throws(()=>restoreContent(s,node.id,'lin-xia'),/选择恢复位置|编辑权限/);
});
test('恢复同名冲突可以改名，保留ID、正文和原有授权',()=>{
  let s=fresh();const made=createContent(s,{spaceId:'space-personal',format:'doc',name:'冲突'},s.meId);s=deleteContent(made.state,made.node.id,s.meId);s=createContent(s,{spaceId:'space-personal',format:'doc',name:'冲突'},s.meId).state;
  const old=s.nodes.find(n=>n.id===made.node.id);assert.equal(restoreNeedsLocation(s,old,s.meId),true);
  assert.throws(()=>restoreContent(s,old.id,s.meId),/恢复位置/);
  const restored=restoreContent(s,old.id,s.meId,{spaceId:old.spaceId,parentId:'',name:'冲突-恢复'}).nodes.find(n=>n.id===old.id);
  assert.equal(restored.name,'冲突-恢复');assert.equal(restored.deletedAt,'');assert.deepEqual(restored.localAccess,old.localAccess);
});
test('恢复原件改名保留扩展名，目标失效与取消不修改源数据',()=>{
  let s=fresh();s={...s,nodes:[...s.nodes,{id:'uploaded',spaceId:'space-personal',parentId:'',type:'doc',format:'file',fileName:'原件.pdf',name:'原件.pdf',ownerId:s.meId,body:'',blobId:'original',deletedAt:'now',localAccess:accessFromSubjects(s,[])}]};
  const before=JSON.stringify(s);assert.throws(()=>restoreContent(s,'uploaded',s.meId,{spaceId:'space-personal',name:'改名.txt'}),/扩展名/);assert.equal(JSON.stringify(s),before);
  const n=restoreContent(s,'uploaded',s.meId,{spaceId:'space-personal',name:'恢复.pdf'}).nodes.at(-1);assert.equal(n.blobId,'original');assert.equal(n.fileName,'原件.pdf');
});
test('全局搜索包含未访问、未收藏的个人资料，支持多关键词和分类',()=>{
  let s=fresh();s=visitContent(s,'doc-note',s.meId);s=createContent(s,{spaceId:'space-personal',format:'doc',name:'季度 交付说明'},s.meId).state;
  assert.equal(searchKnowledge(s,s.meId,'季度 交付','file').length,1);assert.equal(searchKnowledge(s,s.meId,'季度 交付','library').length,0);
  assert.equal(searchKnowledge(s,s.meId,'个人','library').some(r=>r.id==='space-personal'),true);
});
test('全局搜索按当前身份过滤撤权、私有和删除内容，并按ID去重',()=>{
  let s=fresh();s=createContent(s,{spaceId:'space-personal',format:'doc',name:'私有暗号'},s.meId).state;
  assert.equal(searchKnowledge(s,'chen-ke','私有暗号').length,0);const node=s.nodes.at(-1);s=deleteContent(s,node.id,s.meId);assert.equal(searchKnowledge(s,s.meId,'私有暗号').length,0);
  const rows=searchKnowledge(s,s.meId,'说明');assert.equal(new Set(rows.map(r=>`${r.kind}:${r.id}`)).size,rows.length);
});
test('资源清理保留回收站和副本引用，最后一个引用移除才释放',()=>{
  const s={nodes:[{id:'a',blobId:'same'},{id:'b',blobId:'same',deletedAt:'now'}],spaces:[]};
  const one={...s,nodes:s.nodes.slice(1)};assert.deepEqual(releasedResources(s,one),[]);assert.deepEqual(releasedResources(one,{...s,nodes:[]}),[{store:'files',id:'same'}]);
});
test('更换图标封面释放旧资源，上传重试源仅完成或清除任务后释放',()=>{
  const before={nodes:[],spaces:[{icon:{kind:'image',blobId:'old'},cover:{kind:'image',blobId:'cover'}}],uploadTasks:[{id:'task',status:'cancelled',stagedBlobId:'pending:task'}]};
  const same={...before,spaces:[{icon:{kind:'preset',key:'book'},cover:{kind:'image',blobId:'cover'}}]};assert.deepEqual(releasedResources(before,same),[{store:'images',id:'old'}]);
  assert.deepEqual(releasedResources(same,{...same,uploadTasks:[{...same.uploadTasks[0],status:'done'}]}),[{store:'files',id:'pending:task'}]);
});
test('关闭本人的上传面板不删除其他人的任务或目录映射',()=>{
  const s={uploadTasks:[{id:'a',userId:'me',fields:{sessionId:'one'}},{id:'b',userId:'other',fields:{sessionId:'two'}}],uploadSessions:{one:{folders:{root:'folder1'}},two:{folders:{root:'folder2'}}}};
  const next=dismissUploadTasks(s,'me');assert.deepEqual(next.uploadTasks.map(t=>t.id),['b']);assert.deepEqual(Object.keys(next.uploadSessions),['two']);assert.equal(s.uploadTasks.length,2);
});

test('上传已经原子提交但页面未收到完成结果，重入不会再次创建文件',async()=>{
  const { persistUpload }=await import('./uploads.js');const previous=globalThis.localStorage;
  const s=fresh(),made=createContent(s,{spaceId:'space-personal',format:'doc',name:'已提交'},s.meId);
  made.state.uploadTasks=[{id:'durable-task',status:'done',nodeId:made.node.id}];
  const rows=new Map([['kb-prototype-v3',JSON.stringify(made.state)]]);globalThis.localStorage={getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
  try{const existing=await persistUpload({name:'已提交.txt',size:1},{taskId:'durable-task'},s.meId,()=>{throw Error('不应再次写入');});assert.equal(existing.id,made.node.id);}finally{globalThis.localStorage=previous;}
});
