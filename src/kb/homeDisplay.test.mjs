import test from 'node:test';
import assert from 'node:assert/strict';
import { homeColumns, toggleHomeColumn, reorderHomeColumn } from './homeDisplay.js';

test('主页默认显示创建时间和最近访问，修改时间默认隐藏，个人设置不污染默认值',()=>{
  const state={};const columns=homeColumns(state,'one');
  assert.deepEqual(columns.filter(c=>!c.hidden).map(c=>c.id),['location','owner','createdAt','visitedAt']);
  columns[0].hidden=true;assert.equal(homeColumns(state,'one')[0].hidden,undefined);
  const next=toggleHomeColumn(state,'one','createdAt');
  assert.equal(homeColumns(next,'one').find(c=>c.id==='createdAt').hidden,true);
  assert.equal(homeColumns(next,'two').find(c=>c.id==='createdAt').hidden,undefined);
  assert.deepEqual(state,{});
});
test('列拖拽和键盘排序保留隐藏状态，刷新兼容和身份隔离，非法字段不显示',()=>{
  let state=toggleHomeColumn({},'one','updatedAt');
  state=reorderHomeColumn(state,'one','createdAt','location');
  state=reorderHomeColumn(state,'one','owner','visitedAt',true);
  state=JSON.parse(JSON.stringify(state));
  assert.deepEqual(homeColumns(state,'one').map(c=>c.id),['createdAt','location','updatedAt','visitedAt','owner']);
  assert.equal(homeColumns(state,'one').find(c=>c.id==='updatedAt').hidden,false);
  assert.equal(homeColumns(state,'two')[0].id,'location');
  assert.equal(reorderHomeColumn(state,'one','bogus','location'),state);
  state.homeColumnsByUser.one.push({id:'bogus'},{id:'owner'});
  assert.equal(homeColumns(state,'one').length,5);
});
