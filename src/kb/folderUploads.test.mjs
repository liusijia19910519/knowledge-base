import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeState, seedState } from './store.js';
import { createContent } from './contentCreation.js';
import { prepareUploadLocation, uploadResultPath, validateUploadSelection } from './folderUploads.js';
import { prepareUploadedNode } from './uploads.js';
import { contentRights } from './access.js';

const fresh=()=>normalizeState(seedState());
const fields=()=>({spaceId:'space-personal',parentId:'',folderSession:{folders:new Map()}});
function commit(state,base,path){
  const file={name:path.split('/').at(-1),size:17,type:'text/plain'};
  const ready=prepareUploadLocation(state,{...base,relativePath:path},state.meId);
  const node=prepareUploadedNode(ready.state,file,ready.fields,state.meId,'original-blob','original body');
  const next={...ready.state,nodes:[...ready.state.nodes,node]};
  for(const [key,id] of ready.assignments)base.folderSession.folders.set(key,id);
  return {state:next,node};
}
test('保留中文根目录、多级目录、原件引用及不同目录下同名文件',()=>{
  let s=fresh();const f=fields();
  for(const path of ['项目/说明.txt','项目/资料/说明.txt','项目/资料/二级/清单.csv'])s=commit(s,f,path).state;
  const root=s.nodes.find(n=>n.id===f.folderSession.folders.get('项目'));
  assert.equal(root.parentId,'');assert.equal(root.name,'项目');
  assert.equal(s.nodes.filter(n=>n.name==='说明.txt').length,2);
  const deepest=s.nodes.find(n=>n.name==='清单.csv');assert.equal(deepest.parentId,f.folderSession.folders.get('项目/资料/二级'));assert.equal(deepest.blobId,'original-blob');assert.equal(deepest.body,'original body');
});
test('同名根目录不合并不覆盖；重试同一批复用已经提交的目录',()=>{
  let s=fresh();const first=fields(),second=fields();s=commit(s,first,'项目/一.txt').state;
  s=commit(s,second,'项目/二.txt').state;s=commit(s,second,'项目/资料/三.txt').state;
  const roots=s.nodes.filter(n=>n.type==='folder'&&n.spaceId==='space-personal'&&n.name.startsWith('项目'));
  assert.deepEqual(roots.map(n=>n.name),['项目','项目 (2)']);
  assert.equal(s.nodes.find(n=>n.name==='二.txt').parentId,second.folderSession.folders.get('项目'));
  assert.notEqual(first.folderSession.folders.get('项目'),second.folderSession.folders.get('项目'));
});
test('未提交的目录规划不修改原数据或路径映射，取消或失败后重规划不占名字',()=>{
  const s=fresh(),before=JSON.stringify(s),f=fields();
  const first=prepareUploadLocation(s,{...f,relativePath:'取消/深层/a.txt'},s.meId);
  assert.equal(first.assignments.length,2);assert.equal(JSON.stringify(s),before);assert.equal(f.folderSession.folders.size,0);
  const retry=prepareUploadLocation(s,{...f,relativePath:'取消/深层/a.txt'},s.meId);
  assert.equal(retry.state.nodes.at(-2).name,'取消');
});
test('上传位置固定在捕获的目录，新目录和文件继承权限并具有创建者保护',()=>{
  let s=fresh();const parent=createContent(s,{spaceId:'space-retro',parentId:'folder-retro',format:'folder',name:'上传目标'},'lin-xia');s=parent.state;
  const f={spaceId:'space-retro',parentId:parent.node.id,folderSession:{folders:new Map()}};
  const ready=prepareUploadLocation(s,{...f,relativePath:'项目/资料/a.txt'},'lin-xia');
  const node=prepareUploadedNode(ready.state,{name:'a.txt',size:1,type:'text/plain'},ready.fields,'lin-xia','blob');
  s={...ready.state,nodes:[...ready.state.nodes,node]};
  assert.equal(s.nodes.find(n=>n.name==='项目').parentId,parent.node.id);
  for(const id of ['lin-xia','zhou-ning','zhao-heng'])assert.equal(contentRights(s,node,id).manage,true);
  assert.equal(node.inherit,true);assert.deepEqual(node.localAccess.subjects,[]);
});
test('目录被删除或跨库移动后，后续上传和重试拒绝且不另建目录',()=>{
  let s=fresh();const f=fields();s=commit(s,f,'项目/已完成.txt').state;
  const id=f.folderSession.folders.get('项目');
  for(const patch of [{deletedAt:new Date().toISOString()},{spaceId:'space-retro'},{parentId:'folder-retro'}]){
    const changed={...s,nodes:s.nodes.map(n=>n.id===id?{...n,...patch}:n)},before=JSON.stringify(changed);
    assert.throws(()=>prepareUploadLocation(changed,{...f,relativePath:'项目/待上传.txt'},s.meId),/移动或删除/);
    assert.equal(JSON.stringify(changed),before);
  }
});
test('目标失效或身份无权时，不创建任何目录',()=>{
  const s=fresh(),before=JSON.stringify(s),f=fields();
  assert.throws(()=>prepareUploadLocation(s,{...f,parentId:'missing',relativePath:'项目/a.txt'},s.meId),/不存在/);
  assert.throws(()=>prepareUploadLocation(s,{...f,relativePath:'项目/a.txt'},'chen-ke'),/编辑权限/);
  assert.equal(JSON.stringify(s),before);assert.equal(f.folderSession.folders.size,0);
});
test('最多20个文件，拒绝空选择、路径穿越和相对路径与文件名不匹配',()=>{
  const file={name:'a.txt',webkitRelativePath:'目录/a.txt'};
  validateUploadSelection(Array.from({length:20},()=>file));
  assert.throws(()=>validateUploadSelection(Array.from({length:21},()=>file)),/20/);
  assert.throws(()=>validateUploadSelection([]),/先选择/);
  for(const path of ['../a.txt','目录//a.txt','目录/b.txt','目录/../a.txt'])assert.throws(()=>validateUploadSelection([{...file,webkitRelativePath:path}]),/路径无效/);
});
test('普通文件上传不创建目录且保留扩展名自动处理同名文件',()=>{
  const s=fresh(),f=fields();const first=commit(s,f,'说明.txt'),second=commit(first.state,f,'说明.txt');
  assert.equal(second.node.name,'说明 (2).txt');assert.equal(second.node.parentId,'');assert.equal(f.folderSession.folders.size,0);
});

test('任务结果显示实际副本目录和文件名，不再显示冲突前路径',()=>{
  let s=fresh();const first=fields(),second=fields();s=commit(s,first,'项目/说明.txt').state;
  const copy=commit(s,second,'项目/说明.txt');assert.equal(uploadResultPath(copy.state,copy.node),'项目 (2)/说明.txt');
  const same=commit(copy.state,second,'项目/说明.txt');assert.equal(uploadResultPath(same.state,same.node),'项目 (2)/说明 (2).txt');
  assert.equal(uploadResultPath(same.state,same.node,second.folderSession.folders.get('项目')),'说明 (2).txt');
});
