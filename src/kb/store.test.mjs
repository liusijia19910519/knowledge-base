import test from 'node:test';
import assert from 'node:assert/strict';
import { loadState, normalizeState, seedState, spaceRole, nodeRole, visibleNodes } from './store.js';

test('restored data completes missing member lists without mutating cached records', () => {
  const source=seedState();
  delete source.nodes[0].members;
  source.nodes[0].acl={'chen-ke':{view:true,edit:false,share:true,manage:false}};
  source.nodes[0].body='保留用户正文';
  delete source.spaces[1].members;
  const before=structuredClone(source),normalized=normalizeState(source);
  assert.deepEqual(source,before);
  assert.deepEqual(normalized.nodes[0].members,[]);
  assert.deepEqual(normalized.spaces[1].members,[]);
  assert.equal(normalized.nodes[0].body,'保留用户正文');
  assert.deepEqual(normalized.nodes[0].acl,source.nodes[0].acl);
  assert.equal(normalized.nodes.length,source.nodes.length);
  assert.equal(normalized.spaces.length,source.spaces.length);
  assert.doesNotThrow(()=>visibleNodes(normalized,normalized.meId));
});

test('membership arrays do not override current department grants or freeze inheritance', () => {
  const state=seedState();delete state.spaces[1].members;delete state.nodes[0].members;
  assert.equal(spaceRole(state,state.spaces[1],'chen-ke').view,true);
  assert.equal(spaceRole(state,state.spaces[1],'chen-ke').edit,true);
  assert.equal(nodeRole(state,state.nodes[0],'chen-ke').view,true);
  assert.equal(nodeRole(state,{...state.nodes[0],inherit:false},'chen-ke').view,true);
  assert.equal(nodeRole(state,{...state.nodes[0],spaceId:'missing'},'chen-ke').view,false);
});

test('existing grants, custom fields, folders and deleted records survive normalization', () => {
  const state=seedState();state.businessVersion=1;state.internalShares=[{id:'share-record'}];state.nodes[4].deletedAt='2026-11-10';
  const normalized=normalizeState(state);
  assert.deepEqual(normalized.internalShares,state.internalShares);
  for(const [index,node] of state.nodes.entries())for(const [key,value] of Object.entries(node))assert.deepEqual(normalized.nodes[index][key],value);
  assert.ok(normalized.nodes.every(n=>n.permissionMode==='layered'));
  assert.equal(normalized.accessModelVersion,3);
  for(const [i,library] of state.spaces.entries())for(const [key,value] of Object.entries(library))assert.deepEqual(normalized.spaces[i][key],value);assert.equal(normalized.spaces[1].responsibleId,state.spaces[1].ownerId);
  assert.equal(nodeRole(normalized,normalized.nodes[4],'lin-xia').view,false);
});

test('partial collection fields cannot crash list or membership rendering', () => {
  const state=seedState();state.nodes[0].members=null;state.spaces[1].members={};state.members[0].tags=null;state.teams[0].members=null;state.recents=null;
  const normalized=normalizeState(state);
  assert.deepEqual(normalized.recents,[]);
  assert.deepEqual(normalized.members[0].tags,[]);
  assert.deepEqual(normalized.teams[0].members,{});
  assert.doesNotThrow(()=>visibleNodes(normalized,normalized.meId));
});

test('loading repairs in memory while preserving the original browser cache', () => {
  const state=seedState();delete state.nodes[0].members;
  const raw=JSON.stringify(state),writes=[];
  globalThis.localStorage={getItem:()=>raw,setItem:(...args)=>writes.push(args)};
  try {
    assert.deepEqual(loadState().nodes[0].members,[]);
    assert.equal(localStorage.getItem('kb-prototype-v1'),raw);
    assert.equal(writes.length,0);
  } finally {delete globalThis.localStorage;}
});
