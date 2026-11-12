import { activeNode } from './access.js';
import { batchPreflight } from './fileActions.js';
import { exportContent } from './downloads.js';
import { authorizedBlob } from './uploads.js';
import { loadState } from './store.js';
import { makeZip } from './zip.js';
const safe=name=>name.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/^\.+$/,'_')||'未命名';
export function downloadPlan(state,ids,spaceId,userId){
  const roots=batchPreflight(state,{ids,spaceId,action:'download'},userId),entries=[],used=new Set();
  const unique=path=>{let candidate=path,index=2;while(used.has(candidate.toLocaleLowerCase())){const end=path.endsWith('/')?'/' :'',base=end?path.slice(0,-1):path,at=base.lastIndexOf('.'),slash=base.lastIndexOf('/'),ext=at>slash?base.slice(at):'',stem=ext?base.slice(0,at):base;candidate=`${stem} (${index++})${ext}${end}`;}used.add(candidate.toLocaleLowerCase());return candidate;};
  const visit=(node,prefix)=>{
    if(node.type==='folder'){const path=unique(`${prefix}${safe(node.name)}/`);entries.push({node,path,directory:true});for(const child of state.nodes.filter(n=>n.spaceId===spaceId&&(n.parentId||'')===node.id&&activeNode(state,n)))visit(child,path);}
    else entries.push({node,path:unique(prefix+safe(node.format==='file'?node.name:exportContent(node).name)),directory:false});
  };
  for(const root of roots)visit(root,'');
  return {roots,entries,fingerprint:JSON.stringify(entries.map(({node,path})=>[node.id,node.parentId,node.name,node.updatedAt,node.blobId,path]))};
}
export async function buildDownload(state,ids,spaceId,userId,{readBlob=id=>authorizedBlob(id,'download'),latest=loadState,cancelled=()=>false,onProgress=()=>{}}={}){
  const plan=downloadPlan(state,ids,spaceId,userId),entries=[];
  for(let i=0;i<plan.entries.length;i++){
    if(cancelled())throw Error('已取消下载');const entry=plan.entries[i],node=entry.node;
    const blob=entry.directory?new Blob([]):node.format==='file'?await readBlob(node.id):new Blob([exportContent(node).body],{type:exportContent(node).mime});
    entries.push({name:entry.path,blob});onProgress(`正在准备 ${i+1}/${plan.entries.length}`);
  }
  const single=plan.roots.length===1&&plan.roots[0].type!=='folder';
  const blob=single?entries[0].blob:await makeZip(entries,{cancelled,onProgress:(n,total)=>onProgress(`正在打包 ${n}/${total}`)});
  const current=latest();if(current.viewAs!==undefined&&current.viewAs!==userId)throw Error('当前用户已变化，请重新下载');
  const refreshed=downloadPlan(current,ids,spaceId,userId);if(refreshed.fingerprint!==plan.fingerprint)throw Error('内容在准备下载期间发生变化，请重试');
  if(cancelled())throw Error('已取消下载');
  return {blob,name:single?entries[0].name:`${safe(state.spaces.find(s=>s.id===spaceId)?.name||'知识资料')} · ${plan.roots.length}项.zip`};
}
export function offerDownload({blob,name}){const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),1500);}
