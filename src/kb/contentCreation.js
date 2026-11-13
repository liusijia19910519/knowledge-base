import { validateContentDestination } from './destinations.js';
import { can, nodeRole, spaceRole } from './store.js';
import { fileType } from './fileTypes.js';
import { activeNode, creationAccess, librariesForView, libraryRights, validateAccess } from './access.js';

export const CONTENT_TYPES=[['doc','文档'],['sheet','表格'],['slides','幻灯片'],['folder','文件夹']];
export const contentLabel=node=>fileType(node).label;
export const initialContent=format=>format==='sheet'?JSON.stringify({rows:Array.from({length:5},()=>['','','',''])}):format==='slides'?JSON.stringify({slides:[{title:'',body:''}]}):'';
export function parseContent(format,body) {
  try {const value=JSON.parse(body);if(format==='sheet'&&Array.isArray(value.rows)&&value.rows.length&&value.rows.every(r=>Array.isArray(r)&&r.length))return value;if(format==='slides'&&Array.isArray(value.slides)&&value.slides.length)return value;} catch {}
  return JSON.parse(initialContent(format));
}
export function contentText(node,body=node.creationDraft?(node.creationDraftBody??node.body??''):(node.body||'')) {
  if(node.format==='sheet')return parseContent('sheet',body).rows.map(r=>r.join('\t')).join('\n');
  if(node.format==='slides')return parseContent('slides',body).slides.map(s=>[s.title,s.body].filter(Boolean).join('\n')).join('\n\n');
  return body;
}
export function activeFolder(state,folder,spaceId) {
  const seen=new Set();let cursor=folder;
  while(cursor){if(seen.has(cursor.id)||cursor.spaceId!==spaceId||cursor.type!=='folder'||cursor.deletedAt)return false;seen.add(cursor.id);if(!cursor.parentId)return true;cursor=state.nodes.find(n=>n.id===cursor.parentId);if(!cursor)return false;}
  return false;
}
export function folderTrail(state,id) {
  const trail=[],seen=new Set();let n=state.nodes.find(x=>x.id===id);
  while(n&&!seen.has(n.id)){seen.add(n.id);trail.unshift(n.id);n=state.nodes.find(x=>x.id===n.parentId);}
  return trail;
}
export function writableLibraries(state,userId,category='') {
  const shown=new Set(librariesForView(state,userId,category||'all').map(s=>s.id));
  return state.spaces.filter(s=>!s.deletedAt&&(!category||shown.has(s.id))&&(can(spaceRole(state,s,userId),'edit')||writableFolders(state,s.id,userId).length));
}
export function writableFolders(state,spaceId,userId) {
  return state.nodes.filter(n=>n.spaceId===spaceId&&activeFolder(state,n,spaceId)&&can(nodeRole(state,n,userId),'edit'));
}
export function validateDestination(state,{spaceId,parentId='',lockedSpaceId='',category=''},userId) {
  if(lockedSpaceId&&spaceId!==lockedSpaceId)throw Error('只能在当前知识库内新建');
  validateContentDestination(state,{spaceId,parentId},userId);
  if(category&&!writableLibraries(state,userId,category).some(s=>s.id===spaceId))throw Error('当前没有该位置的编辑权限，请重新选择');
  return {spaceId,parentId};
}
export function validateContentName(name) {
  const trimmed=name.trim();
  if(!trimmed)throw Error('请输入名称，不能只填写空格');
  if(trimmed.length>100)throw Error('名称不能超过 100 个字符');
  if(/[\\/:*?"<>|\u0000-\u001f]/.test(trimmed)||['.','..'].includes(trimmed))throw Error('名称不能包含 \\ / : * ? " < > | 等特殊字符');
  return trimmed;
}
export function uniqueContentName(state,spaceId,parentId,base,preserveExtension=false){
  const clean=base.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').trim()||'未命名文件';
  const at=preserveExtension?clean.lastIndexOf('.'):-1,extension=at>0?clean.slice(at).slice(0,20):'',stem=extension?clean.slice(0,at):clean;
  const names=new Set(state.nodes.filter(n=>!n.deletedAt&&n.spaceId===spaceId&&(n.parentId||'')===(parentId||'')).map(n=>n.name.trim().toLocaleLowerCase()));
  let index=0,candidate;do{const suffix=index?` (${index+1})`:'';candidate=stem.slice(0,100-extension.length-suffix.length)+suffix+extension;index++;}while(names.has(candidate.toLocaleLowerCase()));return candidate;
}
export const defaultContentName=(state,format,spaceId,parentId='')=>uniqueContentName(state,spaceId,parentId,`未命名${CONTENT_TYPES.find(([id])=>id===format)?.[1]||'文档'}`);
export function validateCreation(state,fields,userId) {
  const {format,name,spaceId,parentId=''}=fields;
  if(!CONTENT_TYPES.some(([id])=>id===format))throw Error('请选择支持的新建类型');
  const trimmed=validateContentName(name===undefined?defaultContentName(state,format,spaceId,parentId):name);
  validateDestination(state,fields,userId);
  if(state.nodes.some(n=>!n.deletedAt&&n.spaceId===spaceId&&(n.parentId||'')===parentId&&n.name.trim().toLocaleLowerCase()===trimmed.toLocaleLowerCase()))throw Error('当前目录已有同名内容，请换一个名称');
  const policy=creationAccess(state,fields);
  if(!policy.inherit)validateAccess(state,policy.access,[userId]);
  return trimmed;
}
export function renameContent(state,id,name,userId,expectedName){
  const node=state.nodes.find(n=>n.id===id);if(!activeNode(state,node)||!can(nodeRole(state,node,userId),'edit'))throw Error('当前没有重命名权限');
  if(expectedName!==undefined&&node.name!==expectedName)throw Error('名称已在其他页面改变，请重新打开修改');
  const next=validateContentName(name);
  const extension=uploadedExtension(node);if(extension&&!next.toLocaleLowerCase().endsWith(extension.toLocaleLowerCase()))throw Error(`请保留原文件扩展名 ${extension}`);
  if(state.nodes.some(n=>n.id!==id&&!n.deletedAt&&n.spaceId===node.spaceId&&(n.parentId||'')===(node.parentId||'')&&n.name.trim().toLocaleLowerCase()===next.toLocaleLowerCase()))throw Error('当前目录已有同名内容');
  return {...state,nodes:state.nodes.map(n=>n.id===id?{...n,name:next,updatedAt:new Date().toISOString()}:n)};
}
export function uploadedExtension(node){const value=node.format==='file'?(node.fileName||node.name):'',at=value.lastIndexOf('.');return at>0?value.slice(at):'';}
export function createContent(state,fields,userId,id=crypto.randomUUID()) {
  const name=validateCreation(state,fields,userId),time=new Date().toISOString();
  const policy=creationAccess(state,fields);
  const node={id,spaceId:fields.spaceId,parentId:fields.parentId||'',...(fields.creationDraft&&fields.format!=='folder'?{creationDraft:true,draftOwnerId:userId}:{}),type:fields.format==='folder'?'folder':'doc',format:fields.format==='folder'?undefined:fields.format,name,body:fields.format==='folder'?'':initialContent(fields.format),ownerId:userId,creatorId:userId,responsibleId:userId,ownership:state.spaces.find(s=>s.id===fields.spaceId)?.kind==='personal'?'personal':'organization',favorite:false,createdAt:time,updatedAt:time,deletedAt:'',permissionMode:'layered',localAccess:{subjects:[],visibility:'private',grants:{}},inheritedExclusions:[],inherit:policy.inherit,access:policy.inherit?undefined:validateAccess(state,policy.access,[userId]),members:[],faq:false};
  return {node,state:{...state,nodes:[...state.nodes,node],recents:node.type==='doc'?[id,...state.recents.filter(x=>x!==id)].slice(0,30):state.recents}};
}
