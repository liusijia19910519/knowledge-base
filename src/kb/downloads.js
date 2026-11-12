import { parseContent } from './contentCreation.js';
import { contentRights } from './access.js';
import { loadState } from './store.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exportContent(node){
  if(node.format==='sheet')return {name:`${node.name}.csv`,mime:'text/csv;charset=utf-8',body:'\ufeff'+parseContent('sheet',node.body).rows.map(row=>row.map(cell=>'"'+String(cell).replaceAll('"','""')+'"').join(',')).join('\r\n')};
  if(node.format==='slides')return {name:`${node.name}.html`,mime:'text/html;charset=utf-8',body:`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escape(node.name)}</title><style>body{margin:0;background:#edf1f6;font-family:system-ui;color:#263851}section{box-sizing:border-box;aspect-ratio:16/9;max-width:1000px;margin:30px auto;padding:60px;background:white;box-shadow:0 5px 30px #1232}h1{font-size:36px}p{font-size:22px;line-height:1.8;white-space:pre-wrap}@media print{body{background:white}section{break-after:page;margin:0;box-shadow:none}}</style>${parseContent('slides',node.body).slides.map(s=>`<section><h1>${escape(s.title)}</h1><p>${escape(s.body)}</p></section>`).join('')}</html>`};
  return {name:`${node.name}.txt`,mime:'text/plain;charset=utf-8',body:node.body||''};
}
export function downloadNativeContent(id){
  const state=loadState(),node=state.nodes.find(n=>n.id===id),rights=contentRights(state,node,state.viewAs);
  if(!rights.view||!rights.download)throw Error('当前没有下载权限');
  if(node.format==='file')throw Error('请使用原文件预览中的下载入口');
  const file=exportContent(node),href=URL.createObjectURL(new Blob([file.body],{type:file.mime})),a=document.createElement('a');a.href=href;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
