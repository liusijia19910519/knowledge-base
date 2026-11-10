import { useEffect, useRef, useState } from 'react';
import { Plus, UploadSimple, FileText, FolderOpen, MagnifyingGlass, DotsThree, StarFour, X, Clock, CaretRight, Trash, Books } from '@phosphor-icons/react';
import { can, visibleNodes, visibleSpaces, spaceRole, nodeRole, memberName } from './store.js';
import { readFile, storeFile } from './fileStore.js';
import './home.css';

const go = (path) => { window.location.hash = path; };
const time = (value) => value ? new Date(value).toLocaleString('zh-CN', {month:'numeric', day:'numeric',hour:'2-digit',minute:'2-digit'}) : '未访问';
export default function HomeWorkspace({state, userId, query, setQuery, update, onOpen}) {
  const [tab,setTab] = useState('recent');
  const [sort,setSort] = useState('recent');
  const [menu,setMenu] = useState('');
  const [dialog,setDialog] = useState(null);
  const [name,setName] = useState('');
  const [destination,setDestination] = useState('');
  const [files,setFiles] = useState([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [preview,setPreview] = useState(null);
  const [previewUrl,setPreviewUrl] = useState('');
  const [previewText,setPreviewText] = useState('');
  const [uploads,setUploads] = useState([]);
  const fileInput = useRef(null);
  const root = useRef(null);
  const docs = visibleNodes(state,userId).filter(n=>n.type==='doc');
  const spaces = visibleSpaces(state,userId);
  const writable = spaces.filter(s=>can(spaceRole(state,s,userId),'edit'));
  const defaultSpace = writable.find(s=>s.personal)?.id || writable[0]?.id || '';
  const favorites = state.homeFavorites?.[userId] || [];
  const seen = state.homeSeen?.[userId] || {};
  const unread = docs.filter(n=>n.ownerId!==userId && (!seen[n.id] || seen[n.id]<n.updatedAt));
  const drafts = docs.filter(n=>n.ownerId===userId && n.plazaStatus==='draft');
  const list = docs.filter(n=> (!query.trim() || `${n.name} ${n.body}`.toLowerCase().includes(query.trim().toLowerCase())) && (tab==='all'||tab==='recent' && state.recents.includes(n.id)||tab==='owned' && n.ownerId===userId||tab==='shared' && n.ownerId!==userId||tab==='favorite' && favorites.includes(n.id))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'zh-CN'):sort==='updated'?new Date(b.updatedAt)-new Date(a.updatedAt):state.recents.indexOf(a.id)-state.recents.indexOf(b.id));
  useEffect(()=>{ const outside=e=>{if(!e.target.closest('.hw-menu-wrap'))setMenu('');}; const escape=e=>{if(e.key==='Escape'&&!busy){setMenu('');setDialog(null);setPreview(null);}}; document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[busy]);
  useEffect(()=>{if(!preview)return;let url='';let active=true;(async()=>{try{const file=await readFile(preview.fileId);if(!file)throw Error('找不到原文件，请重新上传。');url=URL.createObjectURL(file);if(active){setPreviewUrl(url);if(/text|json|csv|markdown/.test(file.type)||/\.(txt|md|csv|json)$/i.test(file.name))setPreviewText(await file.text());}}catch(e){setError(e.message);}})();return()=>{active=false;if(url)URL.revokeObjectURL(url);setPreviewUrl('');setPreviewText('');};},[preview]);
  const openDialog=(kind,node=null)=>{setMenu('');setError('');setName(node?.name||'');setDestination(node?.spaceId||defaultSpace);setDialog({kind,node});};
  const touch=(id)=>update(s=>({...s,homeSeen:{...s.homeSeen,[userId]:{...s.homeSeen?.[userId],[id]:new Date().toISOString()}},recents:[id,...s.recents.filter(x=>x!==id)],visitedAt:{...s.visitedAt,[userId]:{...s.visitedAt?.[userId],[id]:new Date().toISOString()}}}));
  const open=(node)=>{touch(node.id);if(node.fileId){setError('');setPreview(node);}else onOpen(node.id);};
  const favorite=(node)=>update(s=>({...s,homeFavorites:{...s.homeFavorites,[userId]:favorites.includes(node.id)?favorites.filter(id=>id!==node.id):[...favorites,node.id]}}));
  const mutateNode=(node,values)=>update(s=>({...s,nodes:s.nodes.map(n=>n.id===node.id?{...n,...values}:n)}));
  async function submit(e){e.preventDefault();setError('');if(busy)return;const kind=dialog.kind;const node=dialog.node;
    if(['doc','folder','rename'].includes(kind)&&!name.trim()){setError('请输入名称');return;}
    if(['doc','folder','upload','move'].includes(kind)&&!writable.some(s=>s.id===destination)){setError('请选择有编辑权限的知识库');return;}
    if(['doc','folder','rename','move'].includes(kind)&&state.nodes.some(n=>!n.deletedAt&&n.id!==node?.id&&n.spaceId===destination&&!n.parentId&&n.name===(kind==='move'?node.name:name.trim()))){setError('目标位置已有同名内容，请修改名称或位置');return;}
    setBusy(true);
    try{
      if(kind==='upload'){
        if(!files.length)throw Error('请先选择文件');
        const oversized = files.find(f=>f.size>50*1024*1024);
        if(oversized)throw Error(`${oversized.name} 超过 50 MB，请移除后重试`);
        if(new Set(files.map(f=>f.name)).size!==files.length || files.some(f=>state.nodes.some(n=>!n.deletedAt&&n.spaceId===destination&&!n.parentId&&n.name===f.name)))throw Error('包含同名文件，请修改文件名或选择其他知识库');
        const rows=[];setUploads(files.map(f=>({name:f.name,status:'等待上传'})));
        for(let index=0;index<files.length;index++){
          const file=files[index];setUploads(current=>current.map((r,i)=>i===index?{...r,status:'正在保存'}:r));
          if(file.size>50*1024*1024)throw Error(`${file.name} 超过 50 MB，请移除后重试`);
          const id=crypto.randomUUID();await storeFile(id,file);
          const body=/text|json|csv|markdown/.test(file.type)||/\.(txt|md|csv|json)$/i.test(file.name)?await file.text():'';
          rows.push({id,spaceId:destination,parentId:'',type:'doc',name:file.name,body:body.slice(0,200000),fileId:id,mime:file.type,size:file.size,ownerId:userId,updatedAt:new Date().toISOString(),deletedAt:'',inherit:true,members:[]});
          setUploads(current=>current.map((r,i)=>i===index?{...r,status:'已保存'}:r));
        }
        update(s=>({...s,nodes:[...s.nodes,...rows],recents:[...rows.map(r=>r.id),...s.recents]}));setNotice(`已上传 ${rows.length} 个文件，可点击查看原文件`);setTab('recent');setQuery('');
      }else if(kind==='doc'||kind==='folder'){
        const id=crypto.randomUUID();update(s=>({...s,nodes:[...s.nodes,{id,spaceId:destination,parentId:'',type:kind,name:name.trim(),body:'',ownerId:userId,updatedAt:new Date().toISOString(),deletedAt:'',inherit:true,members:[]}],recents:[id,...s.recents]}));
        setDialog(null);if(kind==='doc')onOpen(id);else go(`/space/${destination}`);
      }else if(kind==='rename'){mutateNode(node,{name:name.trim(),updatedAt:new Date().toISOString()});setNotice('已重命名');}
      else if(kind==='move'){mutateNode(node,{spaceId:destination,parentId:'',updatedAt:new Date().toISOString()});setNotice('已移动到所选知识库');}
      else if(kind==='delete'){mutateNode(node,{deletedAt:new Date().toISOString()});setNotice('已移入回收站，可前往恢复');}
      else if(kind==='publish'){
        const id=crypto.randomUUID(), spaceId='space-publications';
        update(s=>({...s,spaces:s.spaces.some(x=>x.id===spaceId)?s.spaces:[...s.spaces,{id:spaceId,name:'广场发布',description:'全员可见的已发布知识',ownerId:userId,personal:false,visibility:'public',members:[]}],nodes:[...s.nodes.map(n=>n.id===node.id?{...n,plazaStatus:'published'}:n),{...node,id,spaceId,parentId:'',sourceId:node.id,sourceSpaceId:node.spaceId,inherit:true,members:[],plazaStatus:'published',updatedAt:new Date().toISOString()}]}));setNotice('已发布公开副本，原文档保留在原知识库');
      }
      setDialog(null);
    }catch(e){setError(e.message||'操作失败，请重试');}finally{setBusy(false);}
  }
  const navTab=value=>{setTab(value);setQuery('');};
  return <div className="hw" ref={root}>
    <header className="hw-header"><div><h1>主页</h1><p>继续最近的工作，管理你的知识与文档</p></div><label className="hw-search"><MagnifyingGlass size={17}/><input aria-label="搜索文档" placeholder="搜索标题或正文" value={query} onChange={e=>{setQuery(e.target.value);setTab('all');}}/>{query&&<button aria-label="清空搜索" onClick={()=>setQuery('')}><X size={15}/></button>}</label></header>
    <div className="hw-actions"><div className="hw-menu-wrap"><button className="hw-primary" disabled={!writable.length} aria-expanded={menu==='new'} onClick={()=>setMenu(menu==='new'?'':'new')}><Plus size={18}/>新建</button>{menu==='new'&&<div className="hw-menu"><button onClick={()=>openDialog('doc')}>新建文档</button><button onClick={()=>openDialog('folder')}>新建文件夹</button></div>}</div><button disabled={!writable.length} onClick={()=>{setFiles([]);setUploads([]);openDialog('upload');}}><UploadSimple size={18}/>上传文件</button><button onClick={()=>go('/personal')}><Books size={18}/>个人知识库</button><button onClick={()=>go('/recycle')}><Trash size={18}/>回收站</button>{!writable.length&&<span>当前没有可编辑的知识库</span>}</div>
    <div className="hw-overview"><section><header><h2>待处理</h2><span>{drafts.length+unread.length}</span></header>{drafts.map(n=><div className="hw-pending" key={n.id}><span><b>{n.name}</b><small>待发布 · 仅自己可见</small></span><button onClick={()=>openDialog('publish',n)}>预览发布</button></div>)}{unread.length>0&&<div className="hw-pending"><span><b>共享文档有更新</b><small>{unread.length} 篇尚未查看</small></span><button onClick={()=>navTab('shared')}>查看</button><button onClick={()=>{update(s=>({...s,homeSeen:{...s.homeSeen,[userId]:Object.fromEntries(docs.map(n=>[n.id,n.updatedAt]))}}));setNotice('已将更新标为已读');}}>标为已读</button></div>}{!drafts.length&&!unread.length&&<p className="hw-muted">所有事项已处理完毕</p>}</section><section><header><h2>快速访问</h2></header>{spaces.slice(0,3).map(s=><button className="hw-link-row" key={s.id} onClick={()=>go(`/space/${s.id}`)}><FolderOpen size={22}/><span><b>{s.name}</b><small>{s.personal?'仅自己可见':s.visibility==='public'?'全员可见':'共享知识库'}</small></span><CaretRight size={15}/></button>)}{!spaces.length&&<p className="hw-muted">暂无可访问的知识库</p>}</section><section><header><h2>知识动态</h2><button onClick={()=>go('/plaza')}>前往广场</button></header>{[...docs].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,3).map(n=><button className="hw-link-row" key={n.id} onClick={()=>open(n)}><FileText size={18}/><span><b>{n.name}</b><small>{memberName(state,n.ownerId)} · {time(n.updatedAt)}</small></span></button>)}</section></div>
    <div className="hw-table-toolbar"><div role="tablist" aria-label="文档范围">{[['recent','最近访问'],['all','全部文档'],['owned','我创建的'],['shared','与我共享'],['favorite','收藏']].map(([value,label])=><button role="tab" aria-selected={tab===value} className={tab===value?'active':''} key={value} onClick={()=>navTab(value)}>{label}</button>)}</div><label>排序<select aria-label="文档排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">最近访问</option><option value="updated">最近更新</option><option value="name">名称</option></select></label></div>
    <div className="hw-table"><div className="hw-row hw-head"><span>名称 · {list.length} 项</span><span>所在知识库</span><span>创建人</span><span>{sort==='recent'?'访问时间':'更新时间'}</span><span>操作</span></div>{list.map(n=><div className="hw-row" key={n.id}><button className="hw-doc-title" onClick={()=>open(n)}><FileText size={20}/><span><b>{n.name}</b><small>{n.fileId?`附件 · ${Math.ceil(n.size/1024)} KB`:n.body.slice(0,65)||'空白文档'}</small></span></button><button className="hw-location" onClick={()=>go(`/space/${n.spaceId}`)}>{spaces.find(s=>s.id===n.spaceId)?.name}</button><span>{memberName(state,n.ownerId)}</span><span>{time(sort==='recent'?state.visitedAt?.[userId]?.[n.id]:n.updatedAt)}</span><div className="hw-menu-wrap hw-row-actions"><button aria-label={`${favorites.includes(n.id)?'取消收藏':'收藏'}${n.name}`} aria-pressed={favorites.includes(n.id)} onClick={()=>favorite(n)}><StarFour weight={favorites.includes(n.id)?'fill':'regular'} size={17}/></button><button aria-label={`${n.name}更多操作`} onClick={()=>setMenu(menu===n.id?'':n.id)}><DotsThree size={21}/></button>{menu===n.id&&<div className="hw-menu"><button onClick={()=>open(n)}>打开</button><button onClick={()=>favorite(n)}>{favorites.includes(n.id)?'取消收藏':'收藏'}</button>{can(nodeRole(state,n,userId),'edit')&&<><button onClick={()=>openDialog('rename',n)}>重命名</button><button onClick={()=>openDialog('move',n)}>移动到</button><button onClick={()=>openDialog('delete',n)}>移入回收站</button></>}{n.ownerId===userId&&<button onClick={()=>{mutateNode(n,{plazaStatus:'draft'});setMenu('');setNotice('已加入待发布，确认后才会公开');}}>准备发布到广场</button>}</div>}</div></div>)}</div>
    {!list.length&&<div className="hw-empty"><FileText size={32}/><h3>{query?'没有找到匹配文档':'这里还没有文档'}</h3><p>{tab==='favorite'?'在文档行点击星标即可收藏。':'创建或上传文档，开始积累知识。'}</p><button onClick={()=>{setQuery('');setTab('all');}}>查看全部文档</button></div>}
    {dialog&&<div className="hw-backdrop" onClick={()=>!busy&&setDialog(null)}><form className="hw-dialog" role="dialog" aria-modal="true" aria-label="文档操作" onClick={e=>e.stopPropagation()} onSubmit={submit}><header><h2>{{doc:'新建文档',folder:'新建文件夹',upload:'上传文件',rename:'重命名',move:'移动文档',delete:'移入回收站',publish:'发布到知识广场'}[dialog.kind]}</h2><button type="button" disabled={busy} aria-label="关闭弹窗" onClick={()=>setDialog(null)}><X size={20}/></button></header>
    {['doc','folder','rename'].includes(dialog.kind)&&<label>名称<input autoFocus maxLength={120} placeholder="请输入名称" value={name} onChange={e=>setName(e.target.value)}/></label>}
    {['doc','folder','move','upload'].includes(dialog.kind)&&<label>保存到<select aria-label="保存位置" value={destination} onChange={e=>setDestination(e.target.value)}>{writable.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><small>保存至所选知识库的根目录，沿用该库的访问权限。</small></label>}
    {dialog.kind==='upload'&&<><input ref={fileInput} aria-label="选择上传文件" type="file" multiple onChange={e=>{setFiles(Array.from(e.target.files));setUploads([]);}}/><p className="hw-muted">每个文件最多 50 MB。文本、图片、PDF 可直接预览，其他格式可下载原文件。</p>{files.map((f,i)=><div className="hw-upload-row" key={`${f.name}-${i}`}><span>{f.name} · {Math.ceil(f.size/1024)} KB</span><small>{uploads[i]?.status}</small><button type="button" disabled={busy} aria-label={`移除${f.name}`} onClick={()=>setFiles(current=>current.filter((_,index)=>index!==i))}><X size={16}/></button></div>)}</>}
    {dialog.kind==='delete'&&<p>《{dialog.node.name}》将进入回收站，你可以在那里恢复。</p>}
    {dialog.kind==='publish'&&<><p>将《{dialog.node.name}》发布为全员可见的副本，原文保留。</p><pre className="hw-publish-preview">{dialog.node.body||'附件内容请先打开核对。'}</pre><p>来源：{spaces.find(s=>s.id===dialog.node.spaceId)?.name}</p></>}
    {error&&<p className="hw-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={()=>setDialog(null)}>取消</button><button className="hw-primary" disabled={busy} type="submit">{busy?'处理中…':dialog.kind==='upload'?'开始上传':dialog.kind==='publish'?'确认发布':dialog.kind==='delete'?'确认删除':'保存'}</button></footer></form></div>}
    {preview&&<div className="hw-backdrop"><section className="hw-preview" role="dialog" aria-label="文件预览"><header><h2>{preview.name}</h2>{previewUrl&&<a href={previewUrl} download={preview.name}>下载原文件</a>}<button aria-label="关闭预览" onClick={()=>setPreview(null)}><X size={20}/></button></header>{error?<p role="alert">{error}</p>:previewText?<pre>{previewText}</pre>:preview.mime?.startsWith('image/')?<img src={previewUrl} alt={preview.name}/>:preview.mime==='application/pdf'?<iframe title={preview.name} src={previewUrl}/>:<div className="hw-empty"><FileText size={40}/><h3>文件已保存</h3><p>此格式请下载后在本地应用中打开。</p></div>}</section></div>}
    {notice&&<div className="hw-toast" role="status">{notice}<button aria-label="关闭提示" onClick={()=>setNotice('')}><X size={16}/></button></div>}
  </div>;
}
