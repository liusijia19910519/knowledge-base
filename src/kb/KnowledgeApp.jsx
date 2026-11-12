import { useEffect, useRef, useState } from "react";
import {
  Archive, ArrowClockwise, ArrowCounterClockwise, ArrowUp, ArrowsDownUp, ArrowsOutSimple,
  BookBookmark, Books, Briefcase, CaretDown, CaretRight, ChartBar, ChatCircleDots,
  CheckSquare, Clock, Compass, Copy, CornersOut, DotsThree, Eraser, Eye, File, FileText,
  FolderOpen, Gear, Globe, House, Lightbulb, LinkSimple, List, ListNumbers, MagnifyingGlass,
  Microphone, Note, PaintRoller, PencilLine, PencilSimple, Plus, ProjectorScreenChart,
  PushPin, Robot, ShareNetwork, SidebarSimple, Sparkle, StarFour, TextAlignLeft, TextIndent,
  TextOutdent, Trash, UploadSimple, UserCircle, UsersThree, Warning, X,
} from "@phosphor-icons/react";
import { publicAsset } from "../publicAsset.js";
import AccessDialog, { ScopeBadge, LibraryCreateDialog, ShareDialog } from "./AccessDialog.jsx";
import FileMenu from './FileMenu.jsx';
import PinnedLibraries from './PinnedLibraries.jsx';
import HomeDisplaySettings from './HomeDisplaySettings.jsx';
import { homeColumns } from './homeDisplay.js';
import { homeEntries, recentVisits, visitContent } from './personalization.js';
import './refinements.css';
import { useLocationDialog } from './LocationPicker.jsx';
import { actionReason, favorites, setFavorite, batchPreflight, performBatch, sourceLocations } from './fileActions.js';
import { RenameDialog, FileInformation, DownloadDialog, PrintDialog, ConfirmAction } from './ActionDialogs.jsx';
import BatchRelocateDialog from './BatchRelocateDialog.jsx';
import { SCOPE_LABELS, VIEW_LABELS, activeNode, actualNodes, contentRights, effectiveAccess, libraryRights, librariesForView, libraryStats, projectedEntries, spaceAccess, validView, safeFolderTrail, deleteContent, restoreContent, contentTree } from "./access.js";
import CreationDialog, { CreateMenu, ContentIcon, launchDocument } from "./CreationFlow.jsx";
import { UploadDialog, UploadQueue } from "./UploadFlow.jsx";
import UploadedFilePreview from "./UploadedFilePreview.jsx";
import DocumentTitle from "./DocumentTitle.jsx";
import SimpleContentEditor from "./SimpleContentEditor.jsx";
import { LibraryPage, SpaceDetail } from "./LibraryViews.jsx";
import RelocateDialog from "./RelocateDialog.jsx";
import { relocationSource } from "./contentOperations.js";
import { contentView } from "./access.js";
import { contentLabel, contentText, folderTrail, parseContent, writableLibraries, validateDestination } from "./contentCreation.js";
import {
  can, loadState, memberName, nodeRole, resetState, ROLE_OPTIONS, roleLabel, saveState,
  spaceRole, teamRole, visibleNodes, visibleSpaces,
} from "./store.js";

const spaceUrl = (id, view, folder = "") => `/space/${id}?view=${view}${folder ? `&folder=${folder}` : ""}`;
const accessSavedText = visibility => visibility === "forwarded" ? "已分享给所选内部成员" : visibility === "public" ? "已设为全员可见，可在知识广场查看" : visibility === "members" ? "已共享，可在共享知识库查看" : "已设为仅自己，原内容保留在个人知识库";
const CARD_TONES = ["", "ice", "night", "amber"];
const CARD_ICONS = [FolderOpen, Briefcase, Lightbulb, Archive];

function useStore() {
  const [state, setState] = useState(loadState);
  useEffect(() => {
    const sync = event => { if (!event || event.key === "kb-prototype-v1") setState(loadState()); };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); };
  }, []);
  const update = recipe => {
    const next = recipe(loadState());
    saveState(next);
    setState(next);
    return next;
  };
  return [state, update];
}

function route() {
  const [pathname, search = ""] = (window.location.hash.replace(/^#/, "") || "/home").split("?");
  const parts = pathname.split("/").filter(Boolean), params = new URLSearchParams(search);
  return { path: parts[0] || "home", id: parts[1] || "", editing: params.get("edit") === "1", folder: params.get("folder") || "", view: params.get("view") || "", locate: params.get('locate') || '' };
}

function go(path) {
  window.location.hash = path.startsWith("/") ? path : `/${path}`;
}

function formatTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  const now = new Date();
  const hm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (date.toDateString() === now.toDateString()) return `今天 ${hm}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hm}`;
}

const answerAllowed = (state, userId, answer) => answer.citations.every(c => can(nodeRole(state, state.nodes.find(n => n.id === c.id), userId), "view"));

function mockAnswer(state, userId, pool, question, current) {
  const text = question.trim();
  if (!text) return { text: "请先写下问题。这是模拟回答，没有调用模型。", citations: [] };
  const faq = pool.find((node) => node.faq && (node.name === text || text.includes(node.name)));
  if (faq) return { text: `命中已维护的问答，没有再生成一段新的回答：${faq.body}`, citations: [{ id: faq.id, name: faq.name }] };
  const hits = pool.filter((node) => `${node.name}${node.body}`.includes(text.slice(0, 8)) || node.id === current?.id).slice(0, 3);
  if (!hits.length) return { text: "当前身份在这个范围内看不到可引用的文档。模拟回答不会编造来源。", citations: [] };
  return { text: `模拟回答：根据 ${hits.map((node) => `《${node.name}》`).join("、")}，${hits[0].body}`, citations: hits.map((node) => ({ id: node.id, name: node.name })) };
}

export function KnowledgeApp() {
  const [state, update] = useStore();
  const [location, setLocation] = useState(route);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [subnavCollapsed, setSubnavCollapsed] = useState(false);
  const [subnavWidth, setSubnavWidth] = useState(228);
  const [detailAiOpen, setDetailAiOpen] = useState(false);
  const [createContext, setCreateContext] = useState(null);
  const [folderDraft, setFolderDraft] = useState(null);
  const [uploadContext, setUploadContext] = useState(null);
  const [uploadJobs, setUploadJobs] = useState([]);
  const uploadInput=useRef(null),pendingUpload=useRef(null);
  const [relocateContext, setRelocateContext] = useState(null);
  const [libraryDialog, setLibraryDialog] = useState(false);
  const [accessTarget, setAccessTarget] = useState(null);
  const [actionContext, setActionContext] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [menuFor, setMenuFor] = useState("");
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(timer);},[notice]);

  useEffect(() => {
    const sync = () => setLocation(route());
    window.addEventListener("hashchange", sync);
    if (!window.location.hash) go("/home");
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => { setFolderPath(safeFolderTrail(state, location.id, state.viewAs, validView(state, state.spaces.find(s => s.id === location.id), state.viewAs, location.view), location.folder)); setDetailAiOpen(false); setMenuFor(""); setCreateContext(null); setLibraryDialog(false);setRelocateContext(null); setAccessTarget(null);setActionContext(null); setUploadContext(null);pendingUpload.current=null;setFolderDraft(current=>current&&location.path==='space'&&current.spaceId===location.id&&current.parentId===(location.folder||'')&&current.userId===state.viewAs?current:null); }, [location.path, location.id, location.folder, location.view, state.viewAs]);

  const userId = state.viewAs;
  const me = state.members.find((item) => item.id === userId);
  const spaces = visibleSpaces(state, userId);
  const say = (text) => setNotice(text);
  const openDoc = id => {
    try{update(current=>visitContent(current,id,userId));}catch(error){say(error.message);return;}
    const node = state.nodes.find(n => n.id === id), lib = state.spaces.find(s => s.id === node?.spaceId);
    const origin = location.path === "space" ? validView(state, lib, userId, location.view) : ["personal", "shared", "plaza"].includes(location.path) ? location.path : effectiveAccess(state, node).visibility === "public" ? "plaza" : lib?.ownerId === userId ? "personal" : "shared";
    if(node?.type==='folder'){go(spaceUrl(node.spaceId,origin,node.id));return;}
    const safePath = safeFolderTrail(state, lib?.id, userId, origin, node?.parentId);
    go(`/doc/${id}?view=${origin}${safePath.length ? `&folder=${safePath.at(-1)}` : ""}`);
  };
  const openAccess = (item, entity = "node") => setAccessTarget({ id: item.id, entity });
  const openShare = (item, entity = 'node') => setAccessTarget({ id: item.id, entity, mode: 'share' });
  const openSettings = item => setAccessTarget({id:item.id,entity:'space',mode:'settings'});
  const section = location.path === "plaza" ? "plaza" : location.path === "personal" ? "personal" : location.path === "shared" ? "shared" : "";
  const isLibrary = ["plaza", "shared", "personal"].includes(location.path);
  const isDetail = location.path === "space";
  const space = state.spaces.find((item) => item.id === location.id);

  const startSubnavResize = (event) => {
    if (subnavCollapsed) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = subnavWidth;
    const move = (moveEvent) => setSubnavWidth(Math.min(360, Math.max(190, startWidth + moveEvent.clientX - startX)));
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  };

  const beginFolder = position => {
    const view=contentView(state,{spaceId:position.spaceId,parentId:position.parentId||'',inherit:true,ownerId:userId},userId,position.view);
    setQuery('');setFolderDraft({...position,parentId:position.parentId||'',view,userId,token:crypto.randomUUID()});go(spaceUrl(position.spaceId,view,position.parentId));
  };
  const startCreate = (format, options = {}) => {
    const context={ format, view: location.path === "space" ? validView(state, space, userId, location.view) : section, ...options, ...(location.path === "home" ? { spaceId: "", parentId: "", lockedSpaceId: "", category: "", view: "" } : {}) };
    if(location.path!=='space'){setCreateContext(context);return;}
    try{validateDestination(loadState(),context,userId);if(format==='folder')beginFolder(context);else{const result=launchDocument(update,context,userId);created(result.node,{view:context.view});if(!result.opened)setCreateContext({...context,recoveryNode:result.node});}}catch(error){say(error.message);}
  };
  const enqueueUploads = (position,files) => {
    if(files.length>20){say('每次最多上传 20 个文件，请重新选择');return;}
    setUploadJobs(list=>[...list,...Array.from(files).map(file=>({id:crypto.randomUUID(),file,fields:{...position,lockedSpaceId:position.spaceId},userId,status:'pending',message:'等待上传',control:{cancelled:false}}))]);
  };
  const startUpload = (options={}) => {
    if(location.path!=='space'){setUploadContext({category:section});return;}
    const fields={spaceId:space.id,parentId:options.parentId??folderPath.at(-1)??'',lockedSpaceId:space.id};
    try{validateDestination(loadState(),fields,userId);pendingUpload.current=fields;uploadInput.current.value='';uploadInput.current.click();}catch(error){say(error.message);}
  };
  const created = (node, destination = {}) => {
    say(`已创建${contentLabel(node)}「${node.name}」。`);
    if (node.type === "folder") go(spaceUrl(node.spaceId, contentView(state, node, userId, destination.view || createContext?.view), node.parentId));
  };
  const openRelocate = (node, mode, view = "") => {
    try { relocationSource(state, node.id, mode, userId); setRelocateContext({ id: node.id, mode, spaceId: node.spaceId, parentId: node.parentId || "", view }); }
    catch (error) { say(error.message); }
  };
  const relocationDialog = relocateContext && <RelocateDialog state={state} userId={userId} context={relocateContext} update={update} onClose={() => setRelocateContext(null)} onSaved={(text, node) => { say(text); if (location.path === "doc" && relocateContext.mode === "move") go(`/doc/${node.id}?view=${contentView(state,node,userId,location.view)}${node.parentId ? `&folder=${node.parentId}` : ""}`); }} />;
  const uploadQueue=<UploadQueue jobs={uploadJobs} setJobs={setUploadJobs} update={update} onOpen={openDoc}/>;
  const fileAction=(action,node)=>{
    try{
      const latest=loadState(),current=latest.nodes.find(n=>n.id===node.id),reason=actionReason(latest,current,userId,action);if(reason)throw Error(reason);
      if(action==='open'){openDoc(current.id);return;}
      if(action==='favorite'){update(s=>setFavorite(s,current.id,userId));say(favorites(latest,userId).includes(current.id)?'已取消收藏':'已收藏');return;}
      if(action==='permissions'){openAccess(current);return;}
      if(action==='copy'||action==='move'){openRelocate(current,action,location.view);return;}
      if(action==='locate'){const view=contentView(latest,current,userId,location.view);go(`${spaceUrl(current.spaceId,view,current.parentId)}&locate=${current.id}`);return;}
      setActionContext({action,id:current.id,ids:[current.id],spaceId:current.spaceId,expected:sourceLocations(latest,[current.id])});
    }catch(error){say(error.message);}
  };
  const batchAction=(action,ids,spaceId,onSuccess)=>{
    try{const latest=loadState();batchPreflight(latest,{ids,spaceId,action},userId);setActionContext({action,ids:[...ids],spaceId,batch:true,onSuccess,expected:sourceLocations(latest,ids)});}catch(error){say(error.message);}
  };
  const closeAction=()=>setActionContext(null);
  const actionDone=text=>{actionContext?.onSuccess?.();setActionContext(null);say(text);};
  const actionNode=state.nodes.find(n=>n.id===actionContext?.id);
  const AccessComponent=accessTarget?.mode==='share'?ShareDialog:AccessDialog;
  const accessDialog=accessTarget&&<AccessComponent state={state} userId={userId} item={(accessTarget.entity==='space'?state.spaces:state.nodes).find(n=>n.id===accessTarget.id)} entity={accessTarget.entity} settings={accessTarget.mode==='settings'} update={update} onClose={()=>setAccessTarget(null)} onSaved={visibility=>{say(accessTarget.mode==='settings'?'知识库设置已保存':accessTarget.mode==='share'?accessSavedText(visibility):'权限已保存');if(accessTarget.entity==='space'&&location.path==='space'){const latest=loadState();if(!librariesForView(latest,userId,location.view).some(s=>s.id===location.id)){const next=['personal','shared','plaza'].find(v=>librariesForView(latest,userId,v).some(s=>s.id===location.id));go(next?spaceUrl(location.id,next):'/home');}}}}/>;
  const actionDialogs=<>{accessDialog}
    {actionContext?.action==='rename'&&actionNode&&<RenameDialog node={actionNode} userId={userId} update={update} onClose={saved=>{closeAction();if(saved)say('名称已保存');}}/>}
    {actionContext?.action==='info'&&actionNode&&<FileInformation state={state} node={actionNode} onClose={closeAction}/>}
    {actionContext?.action==='print'&&actionNode&&<PrintDialog state={state} node={actionNode} userId={userId} onClose={closeAction} onNotice={say}/>}
    {actionContext?.action==='download'&&<DownloadDialog state={state} {...actionContext} userId={userId} onClose={closeAction} onSuccess={()=>actionDone('下载文件已生成')}/>}
    {actionContext?.batch&&['move','copy'].includes(actionContext.action)&&<BatchRelocateDialog state={state} {...actionContext} mode={actionContext.action} view={location.view} userId={userId} update={update} onClose={closeAction} onSuccess={()=>{actionContext.onSuccess?.();say(actionContext.action==='move'?'已移动所选内容':'已创建副本');}}/>}
    {actionContext?.action==='delete'&&<ConfirmAction title={actionContext.batch?`删除所选 ${actionContext.ids.length} 项内容？`:`删除「${actionNode?.name}」？`} body={`${actionContext.ids.some(id=>state.nodes.find(n=>n.id===id)?.type==='folder')?'文件夹及其内容将移入回收站。':'内容将移入回收站。'}删除后可在回收站恢复。${actionContext.error?' '+actionContext.error:''}`} confirmText="删除" cancelText="取消" danger onClose={closeAction} onConfirm={()=>{try{update(s=>performBatch(s,{...actionContext,action:'delete'},userId).state);actionDone('已移入回收站');if(location.path==='doc')go(spaceUrl(actionNode.spaceId,location.view,actionNode.parentId));}catch(e){setActionContext(current=>({...current,error:e.message}));}}}/>}</>;

  if (location.path === "doc") {
    return <><DocumentPage state={state} update={update} userId={userId} nodeId={location.id} startEditing={location.editing} origin={location.view} fromFolder={location.folder} say={say} setConfirm={setConfirm} onOpen={openDoc} openShare={openShare} onAction={fileAction} notice={notice} setNotice={setNotice} />{actionDialogs}{relocationDialog}{uploadQueue}{confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}</>;
  }

  const shellColumns = isDetail
    ? (detailAiOpen ? "minmax(0,1fr) 420px" : "minmax(0,1fr)")
    : `${subnavCollapsed ? 58 : subnavWidth}px minmax(0,1fr)`;

  return <div className="knowledge-product">
    <section className={`knowledge-shell${subnavCollapsed ? " subnav-collapsed" : ""}${isDetail ? " detail-view" : ""}`} style={{ gridTemplateColumns: shellColumns }}>
      {!isDetail && <aside className="knowledge-subnav">
        <div className="knowledge-subnav-title">
          <Books size={21} weight="fill" />
          <strong>知识库</strong>
          <button type="button" className="knowledge-subnav-toggle" aria-label={subnavCollapsed ? "展开侧栏" : "收起侧栏"} onClick={() => setSubnavCollapsed((value) => !value)}><SidebarSimple size={19} /></button>
        </div>
        <label className="knowledge-subnav-search"><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索" /></label>
        <nav>
          <button className={location.path === "ask" ? "active" : ""} onClick={() => go("/ask")}><ChatCircleDots size={19} />问AI</button>
          <button className={location.path === "home" ? "active" : ""} onClick={() => { setQuery(""); go("/home"); }}><House size={19} />主页</button>
          <button className={location.path === "plaza" ? "active" : ""} onClick={() => { setQuery(""); go("/plaza"); }}><Compass size={19} />知识广场</button>
          <button className={location.path === "shared" ? "active" : ""} onClick={() => { setQuery(""); go("/shared"); }}><UsersThree size={19} />共享知识库</button>
          <button className={location.path === "personal" ? "active" : ""} onClick={() => { setQuery(""); go("/personal"); }}><BookBookmark size={19} weight="fill" />个人知识库</button>
          <button className={location.path === "recycle" ? "active" : ""} onClick={() => go("/recycle")}><Trash size={19} />回收站</button>
          <button className={location.path === "admin" ? "active" : ""} onClick={() => go("/admin")}><Gear size={19} />管理后台</button>
        </nav>
        <PinnedLibraries state={state} userId={userId} update={update} onOpen={(id,view)=>go(spaceUrl(id,view))} onNotice={say}/>
        <div className="kb-identity">
          <small>{state.org.name} · 当前身份</small>
          <select aria-label="当前身份" value={state.viewAs} onChange={(event) => update((current) => ({ ...current, viewAs: event.target.value }))}>
            {state.members.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.title}</option>)}
          </select>
          <button type="button" onClick={() => setConfirm({ title: "恢复示例数据", body: "这会清掉你在本机保存的演示内容。", action: () => update(() => resetState()) })}>恢复示例</button>
        </div>
        {!subnavCollapsed && <div className="knowledge-subnav-resize-handle" role="separator" aria-label="调整侧栏宽度" onPointerDown={startSubnavResize} />}
      </aside>}
      <div className={`knowledge-page${detailAiOpen && isDetail ? " detail-ai-open" : ""}`}>
        {location.path === "home" && <HomePage state={state} userId={userId} query={query} setQuery={setQuery} onOpen={openDoc} update={update} startUpload={startUpload} onCreateLibrary={()=>setLibraryDialog(true)} startCreate={startCreate} openRelocate={openRelocate} onAction={fileAction} openShare={openShare} />}
        {location.path === "ask" && <AskPage state={state} userId={userId} onOpen={openDoc} />}
        {isLibrary && <LibraryPage state={state} userId={userId} section={section} query={query} setQuery={setQuery} startCreate={startCreate} startUpload={startUpload} onCreateLibrary={() => setLibraryDialog(true)} update={update} openSettings={openSettings} say={say} />}
        {isDetail && <SpaceDetail state={state} userId={userId} space={space} query={query} folderPath={folderPath} setFolderPath={setFolderPath} menuFor={menuFor} setMenuFor={setMenuFor} detailAiOpen={detailAiOpen} setDetailAiOpen={setDetailAiOpen} openAccess={openAccess} openShare={openShare} openSettings={openSettings} onAction={fileAction} onBatch={batchAction} locateId={location.locate} origin={location.view} startCreate={startCreate} startUpload={startUpload} folderDraft={folderDraft} onCloseFolder={()=>setFolderDraft(null)} onFolderCreated={node=>say(`已创建文件夹「${node.name}」`)} openDoc={openDoc} openRelocate={openRelocate} say={say} setConfirm={setConfirm} update={update} />}
        {location.path === "recycle" && <RecyclePage state={state} userId={userId} update={update} setConfirm={setConfirm} />}
        {location.path === "admin" && (me?.admin ? <AdminPage state={state} update={update} /> : <Empty title="没有管理后台入口" body="当前身份不是管理员。换到周宁可以查看演示用的组织、许可和团队默认权限。" />)}
      </div>
      {isDetail && detailAiOpen && space && <SpaceAiDrawer state={state} userId={userId} space={space} onOpen={openDoc} onClose={() => setDetailAiOpen(false)} />}
    </section>
    <input ref={uploadInput} type="file" multiple hidden aria-label="库内上传文件" onCancel={()=>{pendingUpload.current=null;}} onChange={e=>{if(pendingUpload.current&&e.target.files.length)enqueueUploads(pendingUpload.current,Array.from(e.target.files));pendingUpload.current=null;e.target.value='';}}/>
    {createContext && <CreationDialog state={state} userId={userId} context={createContext} update={update} onClose={() => setCreateContext(null)} onCreated={created} onFolderLocation={beginFolder} />}
    {uploadContext&&<UploadDialog state={state} userId={userId} context={uploadContext} onClose={()=>setUploadContext(null)} onStart={(position,files)=>{enqueueUploads(position,files);if(section){const view=contentView(state,{spaceId:position.spaceId,parentId:position.parentId,inherit:true},userId,position.view);go(spaceUrl(position.spaceId,view,position.parentId));}setQuery('');}}/>}
    {uploadQueue}
    {relocationDialog}
    {libraryDialog && <LibraryCreateDialog state={state} userId={userId} view={section || "personal"} chooseInitializer={location.path==='home'} update={update} onClose={() => setLibraryDialog(false)} onCreated={lib => { const view = lib.access.visibility === "public" ? "plaza" : lib.access.visibility === "members" ? "shared" : "personal"; setQuery('');go(spaceUrl(lib.id, view)); say(`已创建知识库「${lib.name}」`); }} />}
    {actionDialogs}
    {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    {notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice("")}>知道了</button></div>}
  </div>;
}

function Empty({ title, body, action }) {
  return <div className="knowledge-empty"><MagnifyingGlass size={28} /><strong>{title}</strong><span>{body}</span>{action && <div className="new-create-empty">{action}</div>}</div>;
}

function HomePage({ state, userId, query, setQuery, onOpen, update, startUpload, onCreateLibrary, startCreate, openRelocate, onAction, openShare }) {
  const [tab, setTab] = useState("recent");
  const list=homeEntries(state,userId,tab,query);
  const visits=recentVisits(state,userId);
  const columns=homeColumns(state,userId).filter(column=>!column.hidden);
  const grid={gridTemplateColumns:`minmax(260px,2fr) ${columns.map(column=>column.width).join(' ')} 38px`,minWidth:314+18*(columns.length+1)+columns.reduce((sum,column)=>sum+({location:150,owner:110}[column.id]||130),0)};
  const editable = writableLibraries(state, userId)[0];
  return <>
    <header className="knowledge-home-header"><h1>主页</h1><label><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文档" /></label></header>
    <div className="knowledge-home-actions">
      <CreateMenu variant="home" disabled={!editable} reason="没有可编辑的知识库，请先创建知识库或获得编辑权限" onChoose={format => startCreate(format)} />
      <button type="button" disabled={!editable} title={!editable?'没有可编辑的位置':undefined} onClick={()=>startUpload()}><UploadSimple size={22} /><span><strong>上传</strong><small>上传本地文件</small></span><CaretDown size={15} /></button>
      <button type="button" onClick={onCreateLibrary}><Books size={22}/><span><strong>新建知识库</strong><small>设置初始权限，开始整理资料</small></span><CaretRight size={15}/></button>
    </div>
    <div className="knowledge-home-toolbar"><div role="tablist" aria-label="文档范围">{[["recent", "最近"], ["favorite", "收藏"], ["shared", "与我共享"], ["mine", "我共享的"]].map(([value, label]) => <button className={tab === value ? "active" : ""} role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}</button>)}</div><HomeDisplaySettings state={state} userId={userId} update={update}/></div>
    <div className="home-document-scroll"><div className="knowledge-document-table home-document-table">
      <div className="knowledge-document-row home-document-row head" style={grid}><span>标题</span>{columns.map(column=><span key={column.id} data-column={column.id}>{column.label}{column.id==='visitedAt'&&tab==='recent'?' ↓':''}</span>)}<span /></div>
      {list.map(node=>{
        const library=state.spaces.find(item=>item.id===node.spaceId),visited=visits.find(r=>r.id===node.id);
        const values={location:<span title={library?.name}>{library?.name||'—'}</span>,owner:<span><UserCircle size={18} weight="fill"/>{memberName(state,node.ownerId)}</span>,createdAt:node.createdAt?formatTime(node.createdAt):'—',updatedAt:node.updatedAt?formatTime(node.updatedAt):'—',visitedAt:visited?(visited.visitedAt?formatTime(visited.visitedAt):'更早访问'):'—'};
        return <div role="button" tabIndex={0} className="knowledge-document-row home-document-row" style={grid} key={node.id} onClick={()=>onOpen(node.id)} onKeyDown={e=>{if(e.target===e.currentTarget&&e.key==='Enter')onOpen(node.id);}}><span><ContentIcon node={node}/><span>{node.name}</span><ScopeBadge access={effectiveAccess(state,node)}/></span>{columns.map(column=><span key={column.id} data-column={column.id}>{values[column.id]}</span>)}<FileMenu state={state} node={node} userId={userId} onAction={onAction} showShare onShare={openShare}/></div>;
      })}
    </div></div>
    {!list.length && <Empty title={query.trim()?"没有找到相关内容":tab==="recent"?"还没有访问记录":tab==="favorite"?"还没有收藏":tab==="shared"?"暂无与我共享的内容":"还没有共享内容"} body={query.trim()?"换一个关键词试试。":tab==="favorite"?"在文件或文件夹菜单中点击收藏，便于下次快速打开。":tab==="mine"?"给自己的内容添加协作者后，会显示在这里。":tab==="shared"?"其他人与你定向共享的内容会显示在这里。":"打开知识库中的内容，开始使用。"} />}
  </>;
}

function SpaceAiDrawer({ state, userId, space, onOpen, onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const ask = () => {
    const question = message.trim();
    if (!question) return;
    const pool = visibleNodes(state, userId).filter((node) => node.type === "doc" && node.spaceId === space.id);
    const answer = mockAnswer(state, userId, pool, question);
    setMessages((current) => [...current, { question, answer }]);
    setMessage("");
  };
  return <aside className="knowledge-detail-ai-drawer document-ai-panel" aria-label="AI 对话">
    <header className="document-ai-header"><strong><Sparkle size={18} weight="fill" />问AI</strong><div><button aria-label="关闭 AI 面板" onClick={onClose}><X size={19} /></button></div></header>
    <div className="conversation-scroll document-ai-conversation-scroll"><article className="conversation-body">
      <section className="document-ai-overview"><button className="document-ai-section-title" type="button" onClick={() => setOverviewOpen((value) => !value)}><span>知识概览<Sparkle size={13} weight="fill" /></span><CaretDown size={16} className={overviewOpen ? "" : "closed"} /></button>{overviewOpen && <><p>当前已关联<strong>{space.name}</strong>。回答只引用当前身份看得到的文档，并标明这是模拟。</p><div className="document-ai-related"><span>相关知识</span><button type="button"><FolderOpen size={16} />{space.name}</button></div></>}</section>
      {messages.map((item, index) => <div key={index}><div className="question-bubble">{item.question}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>知识库助手</strong><small>模拟回答</small></div></div><p>{answerAllowed(state, userId, item.answer) ? item.answer.text : "来源权限已变化，此回答暂不可查看。"}</p><div className="kb-citations">{item.answer.citations.filter(cite => can(nodeRole(state, state.nodes.find(n => n.id === cite.id), userId), "view")).map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}>{cite.name}</button>)}</div></div></div>)}
      {!messages.length && <div className="document-ai-empty"><Robot size={28} /><strong>针对当前知识库提问</strong><p>试试问「报销需要哪些材料」</p></div>}
    </article></div>
    <div className="composer conversation-composer document-ai-system-composer">
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }} placeholder="继续追问，回答会带来源" />
      <div className="composer-bottom"><div className="composer-tools"><span className="kb-sim-note">模拟 · 当前库</span></div><div className="send-tools"><button className="send" aria-label="发送" onClick={ask}><ArrowUp size={22} weight="bold" /></button></div></div>
    </div>
    <p className="ai-content-disclaimer">内容由模拟回答生成，请核实重要信息。</p>
  </aside>;
}

const AI_SKILLS = [["帮我写作", "将零散材料整理成可交付初稿"], ["知识总结", "提炼要点、行动项与结论"], ["数据分析", "解读表格与指标，输出洞察"], ["会议纪要", "整理会议记录并分配待办"], ["生成图解", "把复杂内容转成结构化图解"], ["PPT 制作", "生成汇报大纲与页面建议"]];
const AI_EXPERTS = [["知识专家", "检索、引用并解释企业知识"], ["数据分析师", "发现数据异常与业务机会"], ["汇报助手", "把结论整理为管理层表达"], ["资深秘书", "规划事项、跟进任务与会议"]];

function AskPage({ state, userId, onOpen }) {
  const spaces = visibleSpaces(state, userId);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [skills, setSkills] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const [expert, setExpert] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [picker, setPicker] = useState("");
  const [capabilityTab, setCapabilityTab] = useState("skills");
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState("");
  const pool = visibleNodes(state, userId).filter((node) => node.type === "doc" && (!knowledge.length || knowledge.includes(node.spaceId)));
  const submit = (given) => {
    const question = (given ?? message).replace(/[\/@]$/, "").trim();
    if (!question) return;
    const answer = mockAnswer(state, userId, pool, question);
    const task = skills.length ? { title: skills[0], status: "已完成", output: skills[0] === "会议纪要" ? "已生成会议结论、待办和负责人。" : `已基于 ${knowledge.length ? knowledge.map(id => state.spaces.find(s => s.id === id)?.name || "不可访问知识").join("、") : "全部可见知识"} 生成可继续编辑的结果。` } : null;
    const entry = { id: Date.now(), question, answer, task, skills: [...skills], knowledge: [...knowledge], expert, webSearch };
    setMessages((current) => [...current, entry]);
    setHistory((current) => [{ id: entry.id, title: question.slice(0, 22), count: current.length + 1 }, ...current].slice(0, 6));
    setMessage(""); setPicker("");
  };
  const chooseSkill = (name) => { setSkills((current) => current.includes(name) ? current : [...current, name]); setPicker(""); setMessage((current) => current.replace(/\/[^\s]*$/, "")); };
  const chooseKnowledge = (name) => { setKnowledge((current) => current.includes(name) ? current : [...current, name]); setPicker(""); setMessage((current) => current.replace(/@[^\s]*$/, "")); };
  const onMessageChange = (value) => { setMessage(value); const trigger = value.match(/([/@])[^\s]*$/)?.[1]; setPicker(trigger === "/" ? "slash" : trigger === "@" ? "knowledge" : ""); };
  const toggleVoice = () => { if (recording) { setRecording(false); setMessage((value) => `${value}${value ? " " : ""}请根据当前知识整理三条可执行建议。`); setNotice("已完成语音转写"); } else { setRecording(true); setNotice("正在录音 00:00，再次点击结束"); } };
  const runTemplate = (name) => { setSkills((current) => current.includes(name) ? current : [...current, name]); setMessage(name === "数据分析" ? "请分析当前知识中的关键数据、风险和建议。" : `请使用${name}处理当前知识。`); };
  return <section className={`knowledge-ai-workspace ai-workbench${messages.length ? " has-thread" : ""}`}>
    <header className="ai-workbench-header"><div><Sparkle size={20} weight="fill" /><h1>问AI</h1><span>企业知识工作台</span></div><div><button type="button" onClick={() => { setMessages([]); setMessage(""); }}>新对话</button><button type="button" className={history.length ? "active" : ""} onClick={() => setPicker(picker === "history" ? "" : "history")}><Clock size={17} />历史</button></div></header>
    {picker === "history" && <section className="ai-history-popover"><strong>最近对话</strong>{history.length ? history.map((item) => <button key={item.id} type="button" onClick={() => setNotice(`已定位到「${item.title}」`)}>{item.title}<small>{item.count} 条消息</small></button>) : <p>还没有历史对话</p>}</section>}
    {!messages.length && <div className="ai-welcome"><div className="greeting"><p>企业知识助手</p><h2>今天想从哪里开始？</h2><span>提问、调用技能，或让 AI 直接完成一项工作。</span></div><div className="ai-template-grid">{[["知识问答", "快速查找制度、流程与项目资料", FileText], ["帮我写作", "基于企业知识起草内容", PencilLine], ["数据分析", "总结指标、风险和行动建议", ChartBar], ["会议纪要", "沉淀结论并生成待办", Briefcase]].map(([name, description, Icon]) => <button key={name} type="button" onClick={() => runTemplate(name)}><Icon size={20} weight="fill" /><strong>{name}</strong><span>{description}</span><CaretRight size={16} /></button>)}</div><div className="ai-suggested"><span>试试这样问</span>{["报销需要哪些材料", "知识库怎么授权", "帮我总结近期需要处理的事项"].map((item) => <button type="button" key={item} onClick={() => submit(item)}>{item}</button>)}</div><div className="composer-mascot" aria-hidden="true"><img src={publicAsset("/workbuddy-cat-mascot.png")} alt="" /></div></div>}
    {!!messages.length && <main className="ai-thread" aria-live="polite">{messages.map((item) => <article key={item.id} className="ai-turn"><div className="knowledge-ai-user">{item.question}</div><div className="ai-answer-card"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>{item.expert || "知识库助手"}</strong><small>{item.knowledge.length ? `已引用 ${item.knowledge.map(id => state.spaces.find(s => s.id === id)?.name || "不可访问知识").join("、")}` : "已检索全部可见知识"}{item.webSearch ? " · 已开启联网搜索" : ""}</small></div></div><p>{answerAllowed(state, userId, item.answer) ? item.answer.text : "来源权限已变化，此回答暂不可查看。"}</p>{item.task && <div className="ai-task-result"><span>任务结果</span><strong>{item.task.title}</strong><em>{item.task.status}</em><p>{item.task.output}</p><button type="button" onClick={() => setNotice("结果已保存到本次对话，可继续编辑或引用。")}>查看结果</button></div>}<div className="kb-citations">{item.answer.citations.filter(cite => can(nodeRole(state, state.nodes.find(n => n.id === cite.id), userId), "view")).map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}><FileText size={14} />{cite.name}</button>)}</div><footer><button type="button" onClick={() => setNotice("回答已复制")}>复制</button><button type="button" onClick={() => setMessage(`请继续展开：${item.question}`)}>继续追问</button><button type="button" onClick={() => setNotice("已收到反馈")}>有帮助</button></footer></div></article>)}</main>}
    <AIComposer {...{ message, onMessageChange, submit, skills, setSkills, knowledge, setKnowledge, expert, setExpert, webSearch, setWebSearch, recording, toggleVoice, attachments, setAttachments, picker, setPicker, capabilityTab, setCapabilityTab, spaces, chooseSkill, chooseKnowledge, stateName: id => state.spaces.find(s => s.id === id)?.name || "不可访问知识" }} />
    <p className="knowledge-ai-disclaimer">回答基于当前身份可见的知识生成；重要内容请核实来源。</p>{notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice("")}>知道了</button></div>}
  </section>;
}

function AIComposer({ message, onMessageChange, submit, skills, setSkills, knowledge, setKnowledge, expert, setExpert, webSearch, setWebSearch, recording, toggleVoice, attachments, setAttachments, picker, setPicker, capabilityTab, setCapabilityTab, spaces, chooseSkill, chooseKnowledge, stateName }) {
  const all = capabilityTab === "skills" ? AI_SKILLS : AI_EXPERTS;
  return <div className={`knowledge-ai-composer ai-composer${skills.length || knowledge.length || attachments.length ? " has-chips" : ""}`}>
    <div className="ai-composer-chips">{skills.map((item) => <span className="composer-skill-chip" key={item}><Sparkle size={13} weight="fill" />{item}<button type="button" aria-label={`移除技能${item}`} onClick={() => setSkills((current) => current.filter((value) => value !== item))}><X size={11} /></button></span>)}{knowledge.map((item) => <span className="composer-skill-chip knowledge-chip" key={item}><Books size={13} weight="fill" />{stateName(item)}<button type="button" aria-label={`移除知识${item}`} onClick={() => setKnowledge((current) => current.filter((value) => value !== item))}><X size={11} /></button></span>)}{attachments.map((item) => <span className="composer-skill-chip attachment-chip" key={item.name}><FileText size={13} />{item.name}<button type="button" aria-label={`移除附件${item.name}`} onClick={() => setAttachments((current) => current.filter((value) => value.name !== item.name))}><X size={11} /></button></span>)}</div>
    {picker === "slash" && <section className="ai-inline-picker slash-picker"><header><strong>调用技能或专家</strong><button onClick={() => setPicker("")}><X size={15} /></button></header><div className="ai-picker-tabs"><button className={capabilityTab === "skills" ? "active" : ""} onClick={() => setCapabilityTab("skills")}>技能</button><button className={capabilityTab === "experts" ? "active" : ""} onClick={() => setCapabilityTab("experts")}>专家</button></div>{all.map(([name, description]) => <button className="ai-picker-row" key={name} onClick={() => capabilityTab === "skills" ? chooseSkill(name) : (setExpert(name), setPicker(""))}><Sparkle size={16} /><span><strong>{name}</strong><small>{description}</small></span>{capabilityTab === "skills" && <Plus size={16} />}</button>)}<footer><button onClick={() => setPicker("capability")}>浏览全部能力 <CaretRight size={14} /></button></footer></section>}
    {(picker === "knowledge" || picker === "knowledge-center") && <section className="ai-inline-picker knowledge-picker"><header><strong>{picker === "knowledge-center" ? "从知识中心选择" : "指定知识"}</strong><button onClick={() => setPicker("")}><X size={15} /></button></header><p>{picker === "knowledge-center" ? "可多选知识库；选择后会作为本次对话的可追溯上下文。" : "选择后仅在对应知识范围内检索和引用。"}</p>{spaces.map((space) => <button className="ai-picker-row" key={space.id} onClick={() => chooseKnowledge(space.id)}><BookBookmark size={16} /><span><strong>{space.name}</strong><small>{space.description}</small></span>{knowledge.includes(space.id) ? <CheckSquare size={16} /> : <Plus size={16} />}</button>)}<footer>{picker === "knowledge" ? <button onClick={() => setPicker("knowledge-center")}>从知识中心选择更多 <CaretRight size={14} /></button> : <button onClick={() => setPicker("")}>完成选择 <CheckSquare size={14} /></button>}</footer></section>}
    {picker === "capability" && <section className="ai-inline-picker capability-picker"><header><strong>能力中心</strong><button onClick={() => setPicker("")}><X size={15} /></button></header><div className="ai-picker-tabs"><button className={capabilityTab === "skills" ? "active" : ""} onClick={() => setCapabilityTab("skills")}>技能</button><button className={capabilityTab === "experts" ? "active" : ""} onClick={() => setCapabilityTab("experts")}>专家</button></div>{all.map(([name, description]) => <button className="ai-picker-row" key={name} onClick={() => capabilityTab === "skills" ? chooseSkill(name) : (setExpert(name), setPicker(""))}><Sparkle size={16} /><span><strong>{name}</strong><small>{description}</small></span></button>)}</section>}
    <textarea value={message} onChange={(event) => onMessageChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setPicker(""); if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (picker === "slash") chooseSkill(AI_SKILLS[0][0]); else if (picker === "knowledge" && spaces[0]) chooseKnowledge(spaces[0].id); else submit(); } }} placeholder="输入问题；“/”调用技能或专家，“@”指定知识" />
    <div className="ai-composer-bottom"><div className="ai-composer-controls"><button className={expert ? "selected" : ""} type="button" onClick={() => setPicker("capability")}><Sparkle size={16} />{expert || "技能 / 专家"}<CaretDown size={13} /></button><button className={knowledge.length ? "selected" : ""} type="button" onClick={() => setPicker("knowledge")}><Books size={16} />{knowledge.length ? `${knowledge.length} 个知识` : "知识"}<CaretDown size={13} /></button></div><div className="send-tools"><label className="ai-attachment" title="添加附件"><UploadSimple size={19} /><input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) setAttachments((current) => [...current, file]); event.target.value = ""; }} /></label><button className={webSearch ? "web-search active" : "web-search"} type="button" aria-label="联网搜索" aria-pressed={webSearch} onClick={() => setWebSearch((value) => !value)}><Globe size={20} /></button><i /><button className={recording ? "voice-input active" : "voice-input"} type="button" aria-label={recording ? "停止语音输入" : "开始语音输入"} onClick={toggleVoice}><Microphone size={20} /></button><button className="send" aria-label="发送" onClick={() => submit()}><ArrowUp size={21} weight="bold" /></button></div></div>
  </div>;
}

function RecyclePage({ state, userId, update, setConfirm }) {
  const [error, setError] = useState("");
  const deleted = state.nodes.filter(node => node.deletedAt && contentRights(state, node, userId, true).manage && !state.nodes.some(p => p.id === node.parentId && p.deletedAt && p.deleteBatch && p.deleteBatch === node.deleteBatch));
  const run = recipe => { try { update(recipe); setError(""); } catch (err) { setError(err.message); } };
  return <><header className="knowledge-header"><div><h1>回收站</h1><p>恢复前可核对原位置和当前可见范围；删除与取消共享是不同操作。</p></div></header>{error && <p className="access-error" role="alert">{error}</p>}
    {!deleted.length && <Empty title="回收站是空的" body="删除内容后会出现在这里。" />}
    {!!deleted.length && <div className="knowledge-document-table"><div className="knowledge-document-row head"><span>标题 / 恢复信息</span><span>删除时间</span><span>所有者</span><span /><span /></div>{deleted.map(node => { const access = effectiveAccess(state, node), library = state.spaces.find(s => s.id === node.spaceId), position = [library?.name, ...folderTrail(state, node.parentId).map(id => state.nodes.find(n => n.id === id)?.name)].filter(Boolean).join(" / "), blocked = !!library?.deletedAt || !!node.parentId && !activeNode(state, state.nodes.find(n => n.id === node.parentId)); return <div className="knowledge-document-row" key={node.id}><span><ContentIcon node={node} /><span>{node.name}<small className="access-restore-meta">原位置：{position} · 恢复后：{SCOPE_LABELS[access.visibility]}</small></span></span><span>{formatTime(node.deletedAt)}</span><span>{memberName(state, node.ownerId)}</span><span><button className="kb-text-button" type="button" disabled={blocked} title={blocked ? "请先恢复上级目录或知识库" : undefined} onClick={() => setConfirm({ title: "恢复原内容", body: `将恢复到 ${position}，恢复后为“${SCOPE_LABELS[access.visibility]}”。${access.visibility === "public" ? "恢复后全员立即可查看。" : "独立设置保留，继承内容采用上级当前范围。"}此操作不创建副本。`, action: () => run(s => restoreContent(s, node.id, userId)) })}>恢复</button></span><button className="kb-text-button" type="button" onClick={() => setConfirm({ title: "彻底删除原内容", body: "永久删除原内容及全部子内容，无法恢复。", action: () => run(s => { const target = s.nodes.find(n => n.id === node.id); if (!contentRights(s, target, userId, true).manage) throw Error("没有管理权限"); const ids = contentTree(s, target); if (s.nodes.some(n => ids.has(n.id) && !contentRights(s, n, userId, true).manage)) throw Error("存在不能管理的子内容，未执行删除"); return { ...s, nodes: s.nodes.filter(n => !ids.has(n.id)) }; }) })}>删除</button></div>; })}</div>}</>;
}

function AdminPage({ state, update }) {
  const [section, setSection] = useState("members");
  const [name, setName] = useState("");
  const used = state.members.filter((item) => item.licensed).length;
  const addMember = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    update((current) => ({ ...current, members: [...current.members, { id: `member-${Date.now()}`, name: trimmed, staffId: `demo.${current.members.length + 1}`, deptId: "product", title: "演示成员", admin: false, licensed: current.members.filter((item) => item.licensed).length < current.licenseLimit, tags: [] }] }));
    setName("");
  };
  return <>
    <header className="knowledge-header"><div><h1>管理后台</h1><p>{state.org.name} 的演示组织。成员、许可和团队默认权限只写在这台浏览器里。</p></div></header>
    <div className="kb-admin-nav" role="tablist">{[["members", "组织与成员"], ["license", "管理员与许可"], ["teams", "团队默认权限"]].map(([id, label]) => <button key={id} className={section === id ? "active" : ""} type="button" onClick={() => setSection(id)}>{label}</button>)}</div>
    {section === "members" && <div>
      <ul className="kb-dept-list">{state.departments.map((dept) => <li key={dept.id}>{dept.name}</li>)}</ul>
      <p className="kb-meta">标签：{state.tags.map((tag) => tag.name).join("、")}</p>
      <div className="knowledge-document-table"><div className="knowledge-document-row head"><span>成员</span><span>部门</span><span>账号</span><span>标签</span><span /></div>{state.members.map((member) => <div className="knowledge-document-row" key={member.id}><span><UserCircle size={18} weight="fill" />{member.name}</span><span>{state.departments.find((dept) => dept.id === member.deptId)?.name}</span><span>{member.staffId}</span><span>{member.tags.map((id) => state.tags.find((tag) => tag.id === id)?.name).filter(Boolean).join("、") || "无标签"}</span><span /></div>)}</div>
      <div className="kb-add-row"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="演示成员姓名" /><button type="button" onClick={addMember}>添加演示成员</button></div>
    </div>}
    {section === "license" && <div>
      <div className="kb-license"><article><strong>{used}/{state.licenseLimit}</strong><span>已分配许可，不是真实套餐</span></article><article><strong>{state.members.filter((item) => item.admin).map((item) => item.name).join("、")}</strong><span>企业管理员</span></article></div>
      <div className="knowledge-document-table"><div className="knowledge-document-row head"><span>成员</span><span>职务</span><span>许可</span><span>管理员</span><span /></div>{state.members.map((member) => <div className="knowledge-document-row" key={member.id}><span>{member.name}</span><span>{member.title}</span><span>{member.licensed ? "已分配" : "未分配"}</span><span>{member.admin ? "是" : "否"}</span><span /></div>)}</div>
    </div>}
    {section === "teams" && <div>
      <div className="kb-add-row">
        <label className="kb-field">谁可以创建团队<select value={state.teamDefaults.whoCanCreate} onChange={(event) => update((current) => ({ ...current, teamDefaults: { ...current.teamDefaults, whoCanCreate: event.target.value } }))}><option value="all">所有人</option><option value="admin">仅企业管理员</option></select></label>
        <label className="kb-field">新知识库给团队成员的角色<select value={state.teamDefaults.spaceMemberInherit} onChange={(event) => update((current) => ({ ...current, teamDefaults: { ...current.teamDefaults, spaceMemberInherit: event.target.value } }))}>{ROLE_OPTIONS.filter(([value]) => value !== "none").map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {state.teams.map((team) => <article key={team.id}><h2 style={{ fontSize: 18, margin: "22px 0 6px" }}>{team.name}</h2><p className="kb-meta">{team.intro}</p><div className="knowledge-document-table"><div className="knowledge-document-row head"><span>成员</span><span>团队角色</span><span /><span /><span /></div>{Object.entries(team.members).map(([id, role]) => <div className="knowledge-document-row" key={id}><span>{memberName(state, id)}</span><span>{roleLabel(role)}</span><span /><span /><span /></div>)}</div></article>)}
    </div>}
  </>;
}

function DocumentPage({ state, update, userId, nodeId, startEditing = false, origin = "", fromFolder = "", say, setConfirm, onOpen, openShare, onAction, notice, setNotice }) {
  const node = state.nodes.find((item) => item.id === nodeId);
  const role = nodeRole(state, node, userId);
  const space = state.spaces.find((item) => item.id === node?.spaceId);
  const [draft, setDraft] = useState(node?.body || "");
  const [editing, setEditing] = useState(startEditing && node?.format!=='file' && role.edit);
  const [saveError, setSaveError] = useState("");
  const [leave, setLeave] = useState(null);
  const baseBody = useRef(node?.body || "");
  const [aiOpen, setAiOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState("doc");
  const [messages, setMessages] = useState([]);
  const [formats, setFormats] = useState(["bold"]);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  useEffect(()=>{
    const record=()=>{if(document.visibilityState!=='visible')return;try{const latest=loadState(),current=latest.nodes.find(n=>n.id===nodeId);if(latest.viewAs===userId&&contentRights(latest,current,userId).view)update(s=>visitContent(s,nodeId,userId));}catch{/* Reading remains available if recording a visit fails. */}};
    record();window.addEventListener('focus',record);document.addEventListener('visibilitychange',record);
    return()=>{window.removeEventListener('focus',record);document.removeEventListener('visibilitychange',record);};
  },[nodeId,userId]);
  useEffect(() => { const previous = document.title; document.title = node && role.view ? `${node.name} · ${contentLabel(node)}` : "文档不可用"; return () => { document.title = previous; }; }, [node?.id, node?.name, node?.format, role.view]);
  useEffect(() => { setDraft(node?.body || ""); baseBody.current = node?.body || ""; setEditing(startEditing && node?.format!=='file' && role.edit); setMessages([]); setSaveError(""); }, [nodeId]);
  useEffect(() => { if (!editing) { setDraft(node?.body || ""); baseBody.current = node?.body || ""; } }, [node?.body, editing]);
  useEffect(() => { const guard = event => { if (editing && draft !== baseBody.current) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard); }, [editing, draft]);
  if (!node || !can(role, "view")) return <div className="knowledge-doc-shell"><a className="knowledge-doc-back" href="#/home">返回知识库</a><Empty title="看不到这篇文档" body="它可能已删除，或当前身份没有权限。" /></div>;
  const view = validView(state, space, userId, origin);
  const backUrl = spaceUrl(space.id, view, fromFolder);
  const editable = can(role, "edit") && node.format !== 'file';
  const clearEditRoute = () => window.history.replaceState(null, "", `${window.location.href.split("#")[0]}#/doc/${nodeId}?view=${view}${fromFolder ? `&folder=${fromFolder}` : ""}`);
  const save = () => {
    try {
      update(current => {
        const latest = current.nodes.find(item => item.id === node.id);
        if (!latest || latest.deletedAt || !can(nodeRole(current, latest, userId), "edit")) throw Error("当前文档已不可编辑，请保留本次内容并核对权限。");
        if ((latest.body || "") !== baseBody.current) throw Error("其他标签页已更新正文，本次内容尚未覆盖。请先保留修改，再重新打开核对。");
        return { ...current, nodes: current.nodes.map(item => item.id === node.id ? { ...item, body: draft, updatedAt: new Date().toISOString() } : item) };
      });
      baseBody.current = draft; setEditing(false); setSaveError(""); clearEditRoute(); say("已保存"); return true;
    } catch (error) { setSaveError(error.message || "保存失败，请重试"); return false; }
  };
  const discard = () => { setDraft(node.body || ""); baseBody.current = node.body || ""; setEditing(false); setSaveError(""); clearEditRoute(); };
  const startEdit = () => { const latest=loadState(),current=latest.nodes.find(n=>n.id===node.id),reason=actionReason(latest,current,userId,"edit");if(reason){say(reason);return;}setDraft(current.body || ""); baseBody.current = current.body || ""; setEditing(true); setSaveError(""); };
  const ask = (value) => {
    const text = (value ?? question).trim();
    if (!text) return;
    const pool = scope === "doc" ? [node] : visibleNodes(state, userId).filter((item) => item.type === "doc" && (scope === "company" || item.spaceId === node.spaceId));
    setMessages((current) => [...current, { question: text, answer: mockAnswer(state, userId, pool, text, node) }]);
    setQuestion("");
    setAiOpen(true);
  };
  const plainText = contentText(node, editing ? draft : node.body);
  const paragraphs = plainText.split("\n").filter(Boolean);
  return <div className="knowledge-doc-shell">
    <a className="knowledge-doc-back" onClick={event => { if (editing && draft !== baseBody.current) { event.preventDefault(); setLeave("back"); } }} href={`#${backUrl}`}>返回 {space?.name || "知识库"}</a>
    <main className="standalone-document-page">
      <header className="document-window-bar">
        <div className="document-window-title"><ContentIcon node={node} size={20} /><DocumentTitle key={node.id} state={state} node={node} userId={userId} update={update} editable={role.edit}/><StarFour size={18} /></div>
        <div className="document-window-actions">
          <span className="new-saved-status" role="status">{editing ? draft !== baseBody.current ? "有未保存修改" : "编辑中" : "已保存"}</span><span>{formatTime(node.updatedAt)}</span>
          {!editable && <em className="kb-readonly">{node.format==='file'?'文件预览':`只读 · ${roleLabel(role)}`}</em>}
          <ScopeBadge access={effectiveAccess(state, node)} />
          {editing && <><button type="button" onClick={() => draft !== baseBody.current ? setLeave("cancel") : discard()}>取消编辑</button><button type="button" onClick={save}>保存</button></>}
          <button type="button" disabled={!role.manage||editing} title={editing?'请先保存或取消编辑':!role.manage?'需要管理权限':undefined} onClick={() => openShare(node)}><ShareNetwork size={18} />分享</button>
          <button type="button" aria-label="问 AI" onClick={() => setAiOpen(v=>!v)}><Sparkle size={18} />AI</button>
          <FileMenu state={state} node={node} userId={userId} context="document" editing={editing} onAction={(action,item)=>action==='edit'?startEdit():onAction(action,item)}/>
          <img className="avatar avatar-small" src={publicAsset("/user-avatar.png")} alt={memberName(state, node.ownerId)} />
        </div>
      </header>
      {saveError && <p className="new-document-error" role="alert">{saveError}</p>}
      <div className={`document-format-toolbar ${toolbarCollapsed ? "collapsed" : ""}`} role="toolbar" aria-label="文档编辑工具栏">
        <div className="document-toolbar-controls">
          <button type="button"><List size={19} />菜单</button><button type="button"><Plus size={18} weight="bold" />插入</button><button type="button" onClick={() => ask("请总结这篇文档")}><Sparkle size={18} />AI 创作</button><span className="document-toolbar-divider" />
          <button type="button" aria-label="撤销"><ArrowCounterClockwise size={18} /></button><button type="button" aria-label="重做"><ArrowClockwise size={18} /></button><button type="button" aria-label="格式刷"><PaintRoller size={18} /></button><button type="button" aria-label="清除格式"><Eraser size={18} /></button><span className="document-toolbar-divider" />
          <button type="button">默认<CaretDown size={13} /></button><button type="button">正文<CaretDown size={13} /></button><button type="button">16<CaretDown size={13} /></button><span className="document-toolbar-divider" />
          {[["bold", "B"], ["italic", "I"], ["underline", "U"], ["strike", "S"]].map(([id, label]) => <button key={id} type="button" className={formats.includes(id) ? "active" : ""} onClick={() => setFormats((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])}><strong>{label}</strong></button>)}
          <span className="document-toolbar-divider" />
          <button type="button" aria-label="项目列表"><List size={18} /></button><button type="button" aria-label="编号列表"><ListNumbers size={18} /></button><button type="button" aria-label="任务列表"><CheckSquare size={18} /></button><button type="button" aria-label="链接"><LinkSimple size={18} /></button>
          <button type="button" aria-label="行距"><ArrowsDownUp size={18} /></button><button type="button" aria-label="对齐"><TextAlignLeft size={18} /></button><button type="button" aria-label="减少缩进"><TextOutdent size={18} /></button><button type="button" aria-label="增加缩进"><TextIndent size={18} /></button>
        </div>
        <button className="document-toolbar-collapse" type="button" aria-label={toolbarCollapsed ? "展开工具栏" : "收起工具栏"} onClick={() => setToolbarCollapsed((value) => !value)}><CaretDown size={20} /></button>
      </div>
      <div className={`document-workspace${aiOpen ? "" : " ai-panel-closed"}`} style={aiOpen ? { gridTemplateColumns: "248px minmax(420px, 1fr) 420px" } : undefined}>
        <aside className="document-outline" aria-label="文档大纲">
          <div><strong>大纲</strong><button type="button" aria-label="收起大纲"><X size={17} /></button></div>
          <p>{node.name}</p>
          <nav><button type="button" className="active">正文</button>{node.faq && <button type="button">标准问答</button>}<button type="button">权限说明</button></nav>
        </aside>
        <section className="document-scroll-area">
          {!aiOpen && <button className="document-ai-open-button" type="button" aria-label="打开 AI 面板" onClick={() => setAiOpen(true)}><Sparkle size={22} weight="fill" /></button>}
          <article className="document-sheet">
            <h1>{node.name}</h1>
            <div className="document-meta"><UserCircle size={18} />{memberName(state, node.ownerId)} · {node.ownerId === userId ? "所有者" : roleLabel(role)}<span /><Clock size={18} />{formatTime(node.updatedAt)}{node.permissionMode==='layered'?" · 协作者权限":node.inherit !== false ? " · 继承上级范围" : " · 独立范围"}</div>
            {node.format==='file'?<UploadedFilePreview key={node.id} node={node} canDownload={role.download}/>:['sheet', 'slides'].includes(node.format) ? <SimpleContentEditor key={node.id} format={node.format} value={editing ? draft : node.body} editing={editing} onChange={setDraft} /> : <><section className="document-summary"><h2>文档摘要</h2><p>{paragraphs[0] || "这篇文档还没有正文。"}</p></section>
            {editing ? <textarea className="kb-body" aria-label="文档正文" value={draft} onChange={event => setDraft(event.target.value)} placeholder="开始撰写正文…" /> : paragraphs.slice(1).map((line, i) => <section className="document-report-section" key={i}><p>{line}</p></section>)}</>}

          </article>
        </section>
        {aiOpen && <aside className="document-ai-panel" aria-label="AI 对话">
          <header className="document-ai-header"><strong><Sparkle size={18} weight="fill" />问AI</strong><div><button aria-label="新建对话" onClick={() => setMessages([])}><Plus size={19} /></button><button aria-label="关闭 AI 面板" onClick={() => setAiOpen(false)}><X size={19} /></button></div></header>
          <div className="conversation-scroll document-ai-conversation-scroll"><article className="conversation-body">
            <section className="document-ai-overview"><button className="document-ai-section-title" type="button"><span>知识概览<Sparkle size={13} weight="fill" /></span><CaretDown size={16} /></button><p>可以围绕<strong>{node.name}</strong>提问。范围可以切到当前文档、当前知识库或全部可见知识。</p><div className="document-ai-actions"><button type="button" onClick={() => ask("请总结这篇文档")}><FileText size={16} weight="fill" />知识总结</button><button type="button"><ProjectorScreenChart size={16} weight="fill" />PPT制作</button><button type="button"><ChartBar size={16} weight="fill" />思维导图</button><button type="button"><BookBookmark size={16} weight="fill" />知识图解</button></div><div className="document-ai-related"><span>相关知识</span><button type="button"><FileText size={16} />{node.name}</button></div></section>
            {messages.map((item, index) => <div key={index}><div className="question-bubble">{item.question}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>知识库助手</strong><small>模拟回答</small></div></div><p>{answerAllowed(state, userId, item.answer) ? item.answer.text : "来源权限已变化，此回答暂不可查看。"}</p><div className="kb-citations">{item.answer.citations.filter(cite => can(nodeRole(state, state.nodes.find(n => n.id === cite.id), userId), "view")).map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}><Copy size={14} />{cite.name}</button>)}</div></div></div>)}
            {!messages.length && <div className="document-ai-empty"><Robot size={28} /><strong>针对当前文档提问</strong><p>试试问文档标题，命中问答时会返回原文。</p></div>}
          </article></div>
          <div className="composer conversation-composer document-ai-system-composer">
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }} placeholder="继续追问，或输入文档标题" />
            <div className="composer-bottom"><div className="composer-tools"><select className="kb-scope" aria-label="问答范围" value={scope} onChange={(event) => setScope(event.target.value)}><option value="doc">当前文档</option><option value="space">当前知识库</option><option value="company">全部知识</option></select></div><div className="send-tools"><button className="send" aria-label="发送" onClick={() => ask()}><ArrowUp size={22} weight="bold" /></button></div></div>
          </div>
          <p className="ai-content-disclaimer">内容由模拟回答生成，请核实重要信息。</p>
        </aside>}
      </div>
      <footer className="document-status-bar" aria-label="文档状态栏">
        <div className="document-status-left"><button type="button">{node.format === "slides" ? `幻灯片：共 ${parseContent("slides", editing ? draft : node.body).slides.length} 页` : node.format === "sheet" ? "工作表：1" : "页面：1/1"}</button><button type="button">字数：{plainText.replace(/\s/g, "").length}</button><button type="button">权限：{roleLabel(role)}</button>{!editable && <button className="status-warning" type="button"><Warning size={14} weight="fill" />只读</button>}</div>
        <div className="document-status-right"><button type="button" aria-label="阅读视图"><Eye size={17} /></button><button className="active" type="button" aria-label="页面视图"><Note size={17} /></button><button type="button" aria-label="大纲视图"><List size={17} /></button><button type="button" aria-label="网页视图"><Globe size={17} /></button><button type="button" aria-label="编辑模式"><PencilLine size={17} /></button><button type="button" aria-label="适应窗口"><CornersOut size={17} /></button><button className="zoom-value" type="button">100%<CaretDown size={11} /></button><button type="button" aria-label="缩小">−</button><input aria-label="缩放比例" type="range" min="50" max="200" defaultValue="100" /><button type="button" aria-label="放大">＋</button><button type="button" aria-label="全屏"><ArrowsOutSimple size={17} /></button></div>
      </footer>
    </main>
    {leave && <div className="knowledge-product-dialog-backdrop"><section className="knowledge-product-dialog" role="dialog" aria-modal="true" aria-label="未保存的修改"><h2>有未保存的修改</h2><p>保存后继续，或放弃这次修改。</p><div className="kb-dialog-actions"><button onClick={() => setLeave(null)}>继续编辑</button><button onClick={() => { const back = leave === "back"; discard(); setLeave(null); if (back) go(backUrl); }}>放弃修改</button><button onClick={() => { if (save()) { const back = leave === "back"; setLeave(null); if (back) go(backUrl); } }}>保存并继续</button></div></section></div>}
    {notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice("")}>知道了</button></div>}
  </div>;
}

function ConfirmDialog({ title, body, action, onClose }) {
  const root=useRef(null);useLocationDialog(root,onClose);const deleting=title.includes('删除');
  return <div className="knowledge-product-dialog-backdrop" onMouseDown={onClose}><section ref={root} className="knowledge-product-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><h2>{title}</h2><p>{body}</p><div className="kb-dialog-actions"><button type="button" onClick={onClose}>取消</button><button type="button" className={deleting?'danger-primary':''} onClick={() => { action(); onClose(); }}>{deleting?'删除':'确认'}</button></div></section></div>;
}

