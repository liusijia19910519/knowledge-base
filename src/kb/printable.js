import { parseContent } from './contentCreation.js';
import { actionReason } from './fileActions.js';
import { authorizedBlob } from './uploads.js';
import { loadState } from './store.js';
export const htmlEscape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function printableMarkup(node,{text=node.body||'',url=''}={}){
  const title=`<h1>${htmlEscape(node.name)}</h1>`;
  if(node.format==='sheet')return title+`<table>${parseContent('sheet',node.body).rows.map(row=>`<tr>${row.map(cell=>`<td>${htmlEscape(cell)}</td>`).join('')}</tr>`).join('')}</table>`;
  if(node.format==='slides')return parseContent('slides',node.body).slides.map(slide=>`<section class="print-slide"><h1>${htmlEscape(slide.title)}</h1><p>${htmlEscape(slide.body)}</p></section>`).join('');
  if(node.format==='file'&&(node.mime?.startsWith('image/')||/\.(png|jpe?g|gif|webp)$/i.test(node.fileName)))return title+`<img src="${htmlEscape(url)}" alt="${htmlEscape(node.name)}">`;
  if(node.format==='file'&&(node.mime==='application/pdf'||/\.pdf$/i.test(node.fileName)))return `<iframe title="${htmlEscape(node.name)}" src="${htmlEscape(url)}"></iframe>`;
  return title+`<pre>${htmlEscape(text)}</pre>`;
}
export async function preparePrint(id){
  const state=loadState(),node=state.nodes.find(n=>n.id===id),reason=actionReason(state,node,state.viewAs,'print');if(reason)throw Error(reason);
  let url='',text=node.body||'';
  if(node.format==='file'){const blob=await authorizedBlob(id,'download');if(node.mime?.startsWith('text/')||/\.(txt|md|csv|json|log)$/i.test(node.fileName))text=await blob.text();else url=URL.createObjectURL(blob);}
  return {id,name:node.name,html:printableMarkup(node,{text,url}),url,expected:node.updatedAt};
}
