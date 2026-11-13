import KnowledgeNotice from './KnowledgeNotice.jsx';
import { resultLocation } from './resultLocation.js';
import { commitCreationDraft, abandonCreationDraft } from './creationDrafts.js';
import { selectionSummary } from './treeSelection.js';
import './recycle.css';
import HandoverDialog from './HandoverDialog.jsx';
import { handoverReason } from './handover.js';
import { creatorId, responsibleId } from './ownership.js';
import { queueReleasedResources, flushResourceCleanup } from './resourceCleanup.js';
import { stageUploadBatch, visibleUploadTasks } from './uploadTasks.js';
import GlobalSearch from './GlobalSearch.jsx';
import { readDocumentDraft, storeDocumentDraft, removeDocumentDraft } from './documentDrafts.js';
import { uploadPath, validateUploadSelection } from './folderUploads.js';
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
import RestoreLocationDialog from './RestoreLocationDialog.jsx';
import { deleteLibrary, restoreLibrary, permanentlyDeleteLibrary, libraryDeletionSnapshot } from './libraryLifecycle.js';
import { SCOPE_LABELS, VIEW_LABELS, activeNode, actualNodes, contentRights, effectiveAccess, libraryRights, librariesForView, libraryStats, projectedEntries, spaceAccess, validView, safeFolderTrail, deleteContent, restoreContent, contentTree, libraryType, LIBRARY_TYPES, restoreNeedsLocation } from "./access.js";
import CreationDialog, { CreateMenu, ContentIcon, launchDocument } from "./CreationFlow.jsx";
import { UploadDialog, UploadQueue, UploadMenu } from "./UploadFlow.jsx";
import UploadedFilePreview from "./UploadedFilePreview.jsx";
import DocumentTitle from "./DocumentTitle.jsx";
import SimpleContentEditor from "./SimpleContentEditor.jsx";
import { useDocumentPanel, documentOutline, documentSections, scrollDocumentSection } from './documentInteractions.js';
import { DocumentCapabilityPicker, DocumentKnowledgePicker, knowledgePool, availableKnowledgeSelection } from './DocumentAIControls.jsx';
import DocumentSelectionToolbar from './DocumentSelectionToolbar.jsx';
import { AI_SKILLS, AI_EXPERTS } from './aiCatalog.js';
import './documentInteractions.css';
import { LibraryPage, SpaceDetail } from "./LibraryViews.jsx";
import RelocateDialog from "./RelocateDialog.jsx";
import { relocationSource } from "./contentOperations.js";
import { contentView } from "./access.js";
import { contentLabel, contentText, folderTrail, parseContent, writableLibraries, validateDestination } from "./contentCreation.js";
import {
  can, loadState, memberName, nodeRole, normalizeState, seedState, ROLE_OPTIONS, roleLabel, saveState,
  spaceRole, teamRole, visibleNodes, visibleSpaces, STORAGE_KEY,
} from "./store.js";

const spaceUrl = (id, view, folder = "") => `/space/${id}?view=${view}${folder ? `&folder=${folder}` : ""}`;
const accessSavedText = () => '协作者权限已保存，知识库类型保持不变';
const CARD_TONES = ["", "ice", "night", "amber"];
const CARD_ICONS = [FolderOpen, Briefcase, Lightbulb, Archive];

function useStore() {
  const [state, setState] = useState(loadState);
  useEffect(() => {
    const sync = event => { if (!event || event.type==='focus' || event.key === STORAGE_KEY) setState(loadState()); };
    sync();flushResourceCleanup(loadState).catch(()=>{});
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); };
  }, []);
  const update = recipe => {
    const previous=loadState();let next;
    try{next=saveState(recipe(previous),{expectedRevision:previous.writeRevision||''});}
    catch(error){if(error.code==='STALE_WRITE'){setState(loadState());window.dispatchEvent(new CustomEvent('kb-write-conflict',{detail:error.message}));}throw error;}
    setState(next);
    try{queueReleasedResources(previous,next);}catch{}
    flushResourceCleanup(loadState).catch(()=>{});
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
  const navigationGuard=useRef(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeAction,setNoticeAction]=useState(null),[noticePaused,setNoticePaused]=useState(false);
  const [confirm, setConfirm] = useState(null);
  const [subnavCollapsed, setSubnavCollapsed] = useState(false);
  const [subnavWidth, setSubnavWidth] = useState(228);
  const [detailAiOpen, setDetailAiOpen] = useState(false);
  const [detailAiTarget,setDetailAiTarget]=useState(null),detailAiReturnFocus=useRef(null);
  const [createContext, setCreateContext] = useState(null);
  const [folderDraft, setFolderDraft] = useState(null);
  const [uploadContext, setUploadContext] = useState(null);
  const uploadJobs=visibleUploadTasks(state,state.viewAs);
  const uploadInput=useRef(null),folderUploadInput=useRef(null),pendingUpload=useRef(null);
  const [relocateContext, setRelocateContext] = useState(null);
  const [shareAfterMove,setShareAfterMove]=useState(null);
  const [libraryDialog, setLibraryDialog] = useState(false);
  const [accessTarget, setAccessTarget] = useState(null);
  const [handoverTarget,setHandoverTarget]=useState(null);
  const [actionContext, setActionContext] = useState(null);
  const [menuFor, setMenuFor] = useState("");
  useEffect(()=>{if(!notice||noticePaused)return;const timer=setTimeout(()=>{setNotice('');setNoticeAction(null);},noticeAction?12000:5000);return()=>clearTimeout(timer);},[notice,noticeAction,noticePaused]);

  useEffect(() => {
    const sync = event => {
      if(navigationGuard.current&&!navigationGuard.current(window.location.hash)){
        window.history.replaceState(null,'',event.oldURL);return;
      }
      setLocation(route());
    };
    window.addEventListener("hashchange", sync);
    if (!window.location.hash) go("/home");
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => { setDetailAiOpen(false);setDetailAiTarget(null); setMenuFor(""); setCreateContext(null); setLibraryDialog(false);setRelocateContext(null); setAccessTarget(null);setHandoverTarget(null);setActionContext(null); setConfirm(null); setUploadContext(null);pendingUpload.current=null;setFolderDraft(current=>current&&location.path==='space'&&current.spaceId===location.id&&current.parentId===(location.folder||'')&&current.userId===state.viewAs?current:null); }, [location.path, location.id, location.folder, location.view, state.viewAs]);

  const userId = state.viewAs;
  const me = state.members.find((item) => item.id === userId);
  const spaces = visibleSpaces(state, userId);
  const say=(text,target=null)=>{setNotice(text);setNoticeAction(target?{...target,userId}:null);setNoticePaused(false);};
  const closeNotice=()=>{setNotice('');setNoticeAction(null);setNoticePaused(false);};
  useEffect(()=>{
    const showConflict=event=>{setNotice(event.detail);setNoticeAction(null);setNoticePaused(false);};
    window.addEventListener('kb-write-conflict',showConflict);
    return()=>window.removeEventListener('kb-write-conflict',showConflict);
  },[]);
  const viewNotice=()=>{try{const destination=resultLocation(loadState(),noticeAction,userId);setNoticePaused(false);go(destination);}catch(error){say(error.message);}};
  useEffect(()=>{setNotice('');setNoticeAction(null);setNoticePaused(false);},[userId]);
  const openDoc = id => {
    try{update(current=>visitContent(current,id,userId));}catch(error){say(error.message);return;}
    const node = state.nodes.find(n => n.id === id), lib = state.spaces.find(s => s.id === node?.spaceId);
    const origin = contentView(state,node,userId);
    if(node?.type==='folder'){go(spaceUrl(node.spaceId,origin,node.id));return;}
    const safePath = safeFolderTrail(state, lib?.id, userId, origin, node?.parentId);
    go(`/doc/${id}?view=${origin}${safePath.length ? `&folder=${safePath.at(-1)}` : ""}`);
  };
  const openAccess = (item, entity = "node") => setAccessTarget({ id: item.id, entity });
  const openShare = (item, entity = 'node') => {
    const library=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId);
    if(libraryType(library)==='personal'){
      if(entity==='space'){say('个人知识库不能直接共享，请移动需要协作的文件或文件夹');return;}
      setConfirm({title:'个人内容仅本人可见',body:'协作前请先移动到共享知识库或知识广场。移动后成为组织资料，个人库不再保留原件，继承目标位置权限，且原件不能移回个人知识库。',confirmText:'移动并继续分享',action:()=>openRelocate(item,'move','personal',true)});return;
    }
    setAccessTarget({id:item.id,entity,mode:'share'});
  };
  const openHandover=(item,entity='node')=>{const reason=handoverReason(loadState(),item.id,entity,userId);if(reason){say(reason);return;}setHandoverTarget({id:item.id,entity});};
  const openSettings = item => setAccessTarget({id:item.id,entity:'space',mode:'settings'});
  const section = location.path === "plaza" ? "plaza" : location.path === "personal" ? "personal" : location.path === "shared" ? "shared" : "";
  const isLibrary = ["plaza", "shared", "personal"].includes(location.path);
  const isDetail = location.path === "space";
  const space = state.spaces.find((item) => item.id === location.id);
  const folderPath=safeFolderTrail(state,space?.id,userId,libraryType(space),location.folder);
  useEffect(()=>{
    if(!detailAiTarget)return;
    const target=state.nodes.find(node=>node.id===detailAiTarget.id);
    if(!activeNode(state,target)||!contentRights(state,target,userId).view||(isDetail&&target.spaceId!==space?.id)){
      setDetailAiOpen(false);setDetailAiTarget(null);
    }
  },[state,userId,detailAiTarget,isDetail,space?.id]);
  useEffect(()=>{
    const current=location.path==='doc'?state.nodes.find(n=>n.id===location.id):null,library=location.path==='space'?state.spaces.find(s=>s.id===location.id):state.spaces.find(s=>s.id===current?.spaceId);
    if(!library||!['space','doc'].includes(location.path))return;
    const kind=libraryType(library),folder=location.path==='doc'?current?.parentId||'':safeFolderTrail(state,library.id,userId,kind,location.folder).at(-1)||'';
    if(location.view!==kind||location.folder!==folder)go(location.path==='space'?spaceUrl(library.id,kind,folder):`/doc/${current.id}?view=${kind}${folder?`&folder=${folder}`:''}${location.editing?'&edit=1':''}`);
  },[state,location.path,location.id,location.view,location.folder]);


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
    const context={ format, view: location.path === "space" ? validView(state, space, userId, location.view) : section, ...options, ...(location.path === "home"&&!options.lockedSpaceId ? { spaceId: "", parentId: "", lockedSpaceId: "", category: "", view: "" } : {}) };
    if(location.path!=='space'&&!options.lockedSpaceId){setCreateContext(context);return;}
    try{validateDestination(loadState(),context,userId);if(format==='folder')beginFolder(context);else{const result=launchDocument(update,context,userId);created(result.node,{view:context.view});if(!result.opened)setCreateContext({...context,recoveryNode:result.node});}}catch(error){say(error.message);}
  };
  const enqueueUploads = async (position,files) => {
    try{await stageUploadBatch(update,position,files,userId);}catch(error){say(error.message);throw error;}
  };
  const startUpload = (options={}) => {
    if(location.path!=='space'&&!options.spaceId){setUploadContext({category:section,kind:options.kind||'file'});return;}
    const targetSpaceId=options.spaceId||space.id;
    const fields={spaceId:targetSpaceId,parentId:options.parentId??folderPath.at(-1)??'',lockedSpaceId:targetSpaceId};
    try{validateDestination(loadState(),fields,userId);pendingUpload.current=fields;const chooser=options.kind==='folder'?folderUploadInput.current:uploadInput.current;chooser.value='';chooser.click();}catch(error){say(error.message);}
  };
  const created = (node, destination = {}) => {
    say(`已创建${contentLabel(node)}「${node.name}」。`);
    if (node.type === "folder") go(spaceUrl(node.spaceId, contentView(state, node, userId, destination.view || createContext?.view), node.parentId));
  };
  const openRelocate = (node, mode, view = "", sharing=false) => {
    try { const current=loadState(),source=relocationSource(current,node.id,mode,userId).node;setRelocateContext({id:source.id,mode,spaceId:source.spaceId,parentId:source.parentId||"",name:source.name,view,sharing}); }
    catch (error) { say(error.message); }
  };
  const relocationDialog = relocateContext && <RelocateDialog state={state} userId={userId} context={relocateContext} update={update} onClose={() => setRelocateContext(null)} onSaved={(text,node)=>{const latest=loadState(),view=contentView(latest,node,userId),library=latest.spaces.find(s=>s.id===node.spaceId);if(relocateContext.sharing){const destination=spaceUrl(node.spaceId,view,node.parentId);if(libraryType(library)==='shared'){setShareAfterMove({id:node.id,route:destination,userId});say('已移动到共享知识库，请继续邀请协作者');}else say('已移至知识广场，公司全员可查看',{entity:'node',id:node.id});go(destination);return;}say(text,{entity:'node',id:node.id});if(location.path==='doc'&&relocateContext.mode==='move')go(`/doc/${node.id}?view=${view}${node.parentId?`&folder=${node.parentId}`:''}`);}} />;
  useEffect(()=>{
    if(!shareAfterMove)return;
    if(shareAfterMove.userId!==userId||window.location.hash!==`#${shareAfterMove.route}`){setShareAfterMove(null);return;}
    if(location.path!=='space'||spaceUrl(location.id,location.view,location.folder)!==shareAfterMove.route)return;
    const current=loadState(),target=current.nodes.find(n=>n.id===shareAfterMove.id);
    setShareAfterMove(null);
    if(!target||!contentRights(current,target,userId).manage){say('移动已完成，当前无法继续授权，请在目标位置核对权限');return;}
    setAccessTarget({id:target.id,entity:'node',mode:'share',afterMove:true});
  },[shareAfterMove,location.path,location.id,location.view,location.folder,userId]);
  const uploadQueue=<UploadQueue jobs={uploadJobs} userId={userId} update={update} onOpen={openDoc}/>;
  const fileAction=(action,node,options={})=>{
    try{
      const latest=loadState(),current=latest.nodes.find(n=>n.id===node.id),reason=actionReason(latest,current,userId,action);if(reason)throw Error(reason);
      if(action==='create-in'){if(current.type!=='folder')throw Error('请选择文件夹');startCreate(options.format,{view:libraryType(latest.spaces.find(s=>s.id===current.spaceId)),lockedSpaceId:current.spaceId,spaceId:current.spaceId,parentId:current.id});return;}
      if(action==='upload-in'){if(current.type!=='folder')throw Error('请选择文件夹');startUpload({spaceId:current.spaceId,parentId:current.id,kind:options.kind});return;}
      if(action==='discard-draft'){setConfirm({title:`放弃新建「${current.name}」？`,body:'该草稿尚未首次保存，放弃后将删除草稿及暂存内容。',confirmText:'放弃新建',action:()=>{try{update(value=>{if(value.viewAs!==userId)throw Error('当前用户已变化');return abandonCreationDraft(value,current.id,userId);});removeDocumentDraft(userId,current.id);say('已放弃新建');}catch(error){say(error.message);}}});return;}
      if(action==='open'){openDoc(current.id);return;}
      if(action==='ai'){detailAiReturnFocus.current=document.activeElement;setDetailAiTarget({id:current.id,spaceId:current.spaceId});setDetailAiOpen(true);return;}
      if(action==='favorite'){update(s=>setFavorite(s,current.id,userId));say(favorites(latest,userId).includes(current.id)?'已取消收藏':'已收藏');return;}
      if(action==='permissions'){openAccess(current);return;}
      if(action==='handover'){openHandover(current);return;}
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
  const requestLibraryDelete=item=>{const latest=loadState(),library=latest.spaces.find(space=>space.id===item.id);if(!library||!libraryRights(latest,library,userId).manage){say('当前没有管理权限');return;}setActionContext({action:'delete-library',id:item.id,name:library.name,kind:libraryType(library),expected:libraryDeletionSnapshot(latest,item.id)});};
  const confirmLibraryDelete=()=>{
    try{
      update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化，请重新操作');return deleteLibrary(current,actionContext.id,userId,actionContext.expected);});
      setAccessTarget(null);setActionContext(null);say('知识库已移入回收站');
      if(location.path==='space'||location.path==='doc')go(`/${actionContext.kind}`);
    }catch(error){setActionContext(current=>({...current,error:error.message}));}
  };
  const AccessComponent=accessTarget?.mode==='share'?ShareDialog:AccessDialog;
  const accessDialog=accessTarget&&<AccessComponent state={state} userId={userId} item={(accessTarget.entity==='space'?state.spaces:state.nodes).find(n=>n.id===accessTarget.id)} entity={accessTarget.entity} settings={accessTarget.mode==='settings'} afterMove={accessTarget.afterMove} onDelete={requestLibraryDelete} onHandover={openHandover} update={update} onClose={()=>setAccessTarget(null)} onSaved={visibility=>{say(accessTarget.mode==='settings'?'知识库设置已保存':accessTarget.mode==='share'?accessSavedText(visibility):'权限已保存');if(accessTarget.entity==='space'&&location.path==='space'){const latest=loadState();if(!librariesForView(latest,userId,location.view).some(s=>s.id===location.id)){const next=['personal','shared','plaza'].find(v=>librariesForView(latest,userId,v).some(s=>s.id===location.id));go(next?spaceUrl(location.id,next):'/home');}}}}/>;
  const handoverDialog=handoverTarget&&<HandoverDialog state={state} userId={userId} {...handoverTarget} update={update} onClose={()=>setHandoverTarget(null)} onSaved={result=>{const {id,entity}=handoverTarget;setAccessTarget(null);setHandoverTarget(null);say(`已交接 ${result.changedCount} 项内容的负责人`);const target=result.state[entity==='space'?'spaces':'nodes'].find(row=>row.id===id),rights=entity==='space'?libraryRights(result.state,target,userId):contentRights(result.state,target,userId);if(!rights.view)go('/home');}}/>;
  const actionDialogs=<>{accessDialog}{handoverDialog}
    {actionContext?.action==='delete-library'&&<ConfirmAction title={`删除知识库「${actionContext.name}」？`} body={`知识库及其中内容将移入回收站，原有单独删除的内容保持删除。删除后可在回收站恢复。未保存的设置不会生效。${actionContext.error?' '+actionContext.error:''}`} confirmText="删除" cancelText="取消" danger onClose={closeAction} onConfirm={confirmLibraryDelete}/>}

    {actionContext?.action==='rename'&&actionNode&&<RenameDialog node={actionNode} userId={userId} update={update} onClose={saved=>{closeAction();if(saved)say('名称已保存');}}/>}
    {actionContext?.action==='info'&&actionNode&&<FileInformation state={state} node={actionNode} userId={userId} onClose={closeAction}/>}
    {actionContext?.action==='print'&&actionNode&&<PrintDialog state={state} node={actionNode} userId={userId} onClose={closeAction} onNotice={say}/>}
    {actionContext?.action==='download'&&<DownloadDialog state={state} {...actionContext} userId={userId} onClose={closeAction} onSuccess={()=>actionDone('下载文件已生成')}/>}
    {actionContext?.batch&&['move','copy'].includes(actionContext.action)&&<BatchRelocateDialog state={state} {...actionContext} mode={actionContext.action} view={location.view} userId={userId} update={update} onClose={closeAction} onSuccess={result=>{actionContext.onSuccess?.();say(actionContext.action==='move'?'已移动所选内容':'已创建副本',{entity:'nodes',ids:result.nodes.map(node=>node.id)});}}/>}
    {actionContext?.action==='delete'&&<ConfirmAction title={actionContext.batch?`删除所选 ${actionContext.ids.length} 项内容？`:`删除「${actionNode?.name}」？`} body={`${actionContext.batch?selectionSummary(state,actionContext.ids)+'。':''}${actionContext.ids.some(id=>state.nodes.find(n=>n.id===id)?.type==='folder')?'文件夹及其全部子内容将移入回收站。':'内容将移入回收站。'}删除后可在回收站恢复。${actionContext.error?' '+actionContext.error:''}`} confirmText="删除" cancelText="取消" danger onClose={closeAction} onConfirm={()=>{try{update(s=>performBatch(s,{...actionContext,action:'delete'},userId).state);actionDone('已移入回收站');if(location.path==='doc')go(spaceUrl(actionNode.spaceId,location.view,actionNode.parentId));}catch(e){setActionContext(current=>({...current,error:e.message}));}}}/>}</>;

  if (location.path === "doc") {
    return <><DocumentPage key={`${location.id}:${userId}`} navigationGuard={navigationGuard} state={state} update={update} userId={userId} nodeId={location.id} startEditing={location.editing} origin={location.view} fromFolder={location.folder} say={say} setConfirm={setConfirm} onOpen={openDoc} openShare={openShare} onAction={fileAction} notice={notice} setNotice={setNotice} noticeAction={noticeAction} onNoticeView={viewNotice} onNoticePause={setNoticePaused} onNoticeClose={closeNotice} />{actionDialogs}{relocationDialog}{uploadQueue}{confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}</>;
  }

  const drawerSpace=detailAiTarget?state.spaces.find(item=>item.id===state.nodes.find(node=>node.id===detailAiTarget.id)?.spaceId):space;
  const drawerVisible=detailAiOpen&&(isDetail||location.path==='home')&&!!drawerSpace;
  const drawerColumn='clamp(280px, 32vw, 420px)';
  const shellColumns = isDetail
    ? (drawerVisible ? `minmax(0,1fr) ${drawerColumn}` : "minmax(0,1fr)")
    : `${subnavCollapsed ? 58 : subnavWidth}px minmax(0,1fr)${drawerVisible?` ${drawerColumn}`:''}`;

  return <div className="knowledge-product">
    <section className={`knowledge-shell${subnavCollapsed ? " subnav-collapsed" : ""}${isDetail ? " detail-view" : ""}${drawerVisible?" has-context-ai-drawer":""}`} style={{ gridTemplateColumns: shellColumns }}>
      {!isDetail && <aside className="knowledge-subnav">
        <div className="knowledge-subnav-title">
          <Books size={21} weight="fill" />
          <strong>知识库</strong>
          <button type="button" className="knowledge-subnav-toggle" aria-label={subnavCollapsed ? "展开侧栏" : "收起侧栏"} onClick={() => setSubnavCollapsed((value) => !value)}><SidebarSimple size={19} /></button>
        </div>
        <GlobalSearch state={state} userId={userId} onOpen={openDoc} onLibrary={(id,view)=>go(spaceUrl(id,view))} onNotice={say}/>
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
          <div className="kb-footer-actions">
            <a className="kb-product-intro" href={publicAsset('product-introduction.html')} target="_blank" rel="noopener noreferrer"><Books size={15}/>产品介绍</a>
            <button className="kb-reset-example" type="button" onClick={() => setConfirm({ title: "恢复示例数据", body: "这会清掉你在本机保存的演示内容。", action: () => update(() => normalizeState(seedState())) })}>恢复示例</button>
          </div>
        </div>
        {!subnavCollapsed && <div className="knowledge-subnav-resize-handle" role="separator" aria-label="调整侧栏宽度" onPointerDown={startSubnavResize} />}
      </aside>}
      <div className={`knowledge-page${detailAiOpen && isDetail ? " detail-ai-open" : ""}`}>
        {location.path === "home" && <HomePage state={state} userId={userId} query={query} setQuery={setQuery} onOpen={openDoc} update={update} startUpload={startUpload} onCreateLibrary={()=>setLibraryDialog(true)} startCreate={startCreate} openRelocate={openRelocate} onAction={fileAction} openShare={openShare} />}
        {location.path === "ask" && <AskPage state={state} userId={userId} onOpen={openDoc} />}
        {isLibrary && <LibraryPage state={state} userId={userId} section={section} query={query} setQuery={setQuery} startCreate={startCreate} startUpload={startUpload} onCreateLibrary={() => setLibraryDialog(true)} update={update} openSettings={openSettings} say={say} />}
        {isDetail && <SpaceDetail state={state} userId={userId} space={space} query={query} folderPath={folderPath} menuFor={menuFor} setMenuFor={setMenuFor} detailAiOpen={detailAiOpen} setDetailAiOpen={setDetailAiOpen} openAccess={openAccess} openShare={openShare} openSettings={openSettings} onAction={fileAction} onBatch={batchAction} locateId={location.locate} origin={location.view} startCreate={startCreate} startUpload={startUpload} folderDraft={folderDraft} onCloseFolder={()=>setFolderDraft(null)} onFolderCreated={node=>say(`已创建文件夹「${node.name}」`)} openDoc={openDoc} openRelocate={openRelocate} say={say} setConfirm={setConfirm} update={update} />}
        {location.path === "recycle" && <RecyclePage state={state} userId={userId} update={update} setConfirm={setConfirm} say={say} />}
        {location.path === "admin" && (me?.admin ? <AdminPage state={state} update={update} /> : <Empty title="没有管理后台入口" body="当前身份不是管理员。换到周宁可以查看演示用的组织、许可和团队默认权限。" />)}
      </div>
      {(isDetail||location.path==='home')&&drawerSpace&&<SpaceAiDrawer open={drawerVisible} key={`${userId}:${detailAiTarget?.id||drawerSpace.id}`} state={state} userId={userId} space={drawerSpace} targetId={detailAiTarget?.id} onOpen={openDoc} onClose={() => {setDetailAiOpen(false);requestAnimationFrame(()=>{const target=document.querySelector('[aria-controls="knowledge-context-ai-drawer"]')||(detailAiReturnFocus.current?.isConnected?detailAiReturnFocus.current:document.querySelector('.knowledge-home-header input'));if(target?.isConnected)target.focus();});}} />}
    </section>
    <input ref={uploadInput} type="file" multiple hidden aria-label="库内上传文件" onCancel={()=>{pendingUpload.current=null;}} onChange={e=>{if(pendingUpload.current&&e.target.files.length)enqueueUploads(pendingUpload.current,Array.from(e.target.files)).catch(()=>{});pendingUpload.current=null;e.target.value='';}}/>
    {createContext && <CreationDialog state={state} userId={userId} context={createContext} update={update} onClose={() => setCreateContext(null)} onCreated={created} onFolderLocation={beginFolder} />}
    <input ref={folderUploadInput} type="file" webkitdirectory="" directory="" multiple hidden aria-label="库内上传文件夹" onCancel={()=>{pendingUpload.current=null;}} onChange={e=>{if(pendingUpload.current&&e.target.files.length)enqueueUploads(pendingUpload.current,Array.from(e.target.files)).catch(()=>{});pendingUpload.current=null;e.target.value='';}}/>
    {uploadContext&&<UploadDialog state={state} userId={userId} context={uploadContext} onClose={()=>setUploadContext(null)} onStart={async(position,files)=>{await enqueueUploads(position,files);if(section){const view=contentView(state,{spaceId:position.spaceId,parentId:position.parentId,inherit:true},userId,position.view);go(spaceUrl(position.spaceId,view,position.parentId));}setQuery('');}}/>}
    {uploadQueue}
    {relocationDialog}
    {libraryDialog && <LibraryCreateDialog state={state} userId={userId} view={section || "personal"} chooseInitializer={location.path==='home'} update={update} onClose={() => setLibraryDialog(false)} onCreated={lib => { const view = libraryType(lib); setQuery('');go(spaceUrl(lib.id, view)); say(`已创建知识库「${lib.name}」`); }} />}
    {actionDialogs}
    {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    {notice&&<KnowledgeNotice text={notice} onClose={closeNotice} onView={noticeAction?viewNotice:undefined} onPause={setNoticePaused}/>}
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
  const grid={gridTemplateColumns:`minmax(260px,2fr) ${columns.map(column=>column.width).join(' ')} 104px`,minWidth:380+18*(columns.length+1)+columns.reduce((sum,column)=>sum+({location:150,owner:110}[column.id]||130),0)};
  const editable = writableLibraries(state, userId)[0];
  return <>
    <header className="knowledge-home-header"><h1>主页</h1><label><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文档" /></label></header>
    <div className="knowledge-home-actions">
      <CreateMenu variant="home" disabled={!editable} reason="没有可编辑的知识库，请先创建知识库或获得编辑权限" onChoose={format => startCreate(format)} />
      <UploadMenu variant="home" disabled={!editable} reason="没有可编辑的位置" onChoose={kind=>startUpload({kind})}/>
      <button type="button" onClick={onCreateLibrary}><Books size={22}/><span><strong>新建知识库</strong></span><CaretRight size={15}/></button>
    </div>
    <div className="knowledge-home-toolbar"><div role="tablist" aria-label="文档范围">{[["recent", "最近"], ["favorite", "收藏"], ["shared", "与我共享"], ["mine", "我共享的"]].map(([value, label]) => <button className={tab === value ? "active" : ""} role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}</button>)}</div><HomeDisplaySettings state={state} userId={userId} update={update}/></div>
    <div className="home-document-scroll"><div className="knowledge-document-table home-document-table">
      <div className="knowledge-document-row home-document-row head" style={grid}><span>标题</span>{columns.map(column=><span key={column.id} data-column={column.id}>{column.label}{column.id==='visitedAt'&&tab==='recent'?' ↓':''}</span>)}<span /></div>
      {list.map(node=>{
        const library=state.spaces.find(item=>item.id===node.spaceId),visited=visits.find(r=>r.id===node.id);
        const values={location:<span title={library?.name}>{library?.name||'—'}</span>,owner:<span><UserCircle size={18} weight="fill"/>{memberName(state,responsibleId(node))}</span>,createdAt:node.createdAt?formatTime(node.createdAt):'—',updatedAt:node.updatedAt?formatTime(node.updatedAt):'—',visitedAt:visited?(visited.visitedAt?formatTime(visited.visitedAt):'更早访问'):'—'};
        return <div role="button" aria-label={`打开 ${node.name}`} tabIndex={0} className="knowledge-document-row home-document-row" style={grid} key={node.id} onClick={()=>onOpen(node.id)} onKeyDown={e=>{if(e.target===e.currentTarget&&e.key==='Enter')onOpen(node.id);}}><span><ContentIcon node={node}/><span title={node.name}>{node.name}</span>{node.creationDraft?<span className="creation-draft-badge">新建草稿</span>:<ScopeBadge access={effectiveAccess(state,node)}/>}</span>{columns.map(column=><span key={column.id} data-column={column.id}>{values[column.id]}</span>)}<FileMenu state={state} node={node} userId={userId} onAction={onAction} showShare onShare={openShare}/></div>;
      })}
    </div></div>
    {!list.length && <Empty title={query.trim()?"没有找到相关内容":tab==="recent"?"还没有访问记录":tab==="favorite"?"还没有收藏":tab==="shared"?"暂无与我共享的内容":"还没有共享内容"} body={query.trim()?"换一个关键词试试。":tab==="favorite"?"在文件或文件夹菜单中点击收藏，便于下次快速打开。":tab==="mine"?"给自己的内容添加协作者后，会显示在这里。":tab==="shared"?"其他人与你定向共享的内容会显示在这里。":"打开知识库中的内容，开始使用。"} />}
  </>;
}

function SpaceAiDrawer({ state, userId, space, targetId, onOpen, onClose,open=true }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [error,setError]=useState('');
  const scope=current=>{
    const target=targetId?current.nodes.find(node=>node.id===targetId):null;
    const library=current.spaces.find(item=>item.id===(target?.spaceId||space.id));
    const allowed=targetId?activeNode(current,target)&&contentRights(current,target,userId).view:!!library&&!library.deletedAt&&librariesForView(current,userId).some(item=>item.id===library.id);
    const ids=target?(target.type==='folder'?contentTree(current,target):new Set([target.id])):null;
    return {target,library,allowed,pool:allowed?current.nodes.filter(node=>activeNode(current,node)&&node.type!=='folder'&&node.spaceId===library.id&&(!ids||ids.has(node.id))&&contentRights(current,node,userId).view).map(node=>({...node,body:contentText(node)})):[]};
  };
  const context=scope(state),label=context.allowed?(context.target?.name||context.library?.name):'关联内容不可访问';
  const kind=context.target?(context.target.type==='folder'?'文件夹':'文件'):'知识库';
  const validIds=new Set(context.pool.map(node=>node.id));
  const ask = () => {
    const question = message.trim();
    if (!question) return;
    const latest=loadState(),fresh=scope(latest);
    if(latest.viewAs!==userId||!fresh.allowed){setError('关联内容已删除或权限发生变化，请重新选择可访问的内容。');return;}
    const answer = mockAnswer(latest, userId, fresh.pool, question, fresh.target?.type==='folder'?null:fresh.target);
    setMessages(current=>[...current,{question,answer}]);setError('');setMessage("");
  };
  return <aside id="knowledge-context-ai-drawer" hidden={!open} aria-hidden={!open} className="knowledge-detail-ai-drawer document-ai-panel" aria-label="AI 对话">
    <header className="document-ai-header"><strong><Sparkle size={18} weight="fill" />问AI</strong><div><button type="button" aria-label="收起 AI 面板" onClick={onClose}><X size={19} /></button></div></header>
    <div className="conversation-scroll document-ai-conversation-scroll"><article className="conversation-body">
      <section className="document-ai-overview"><button className="document-ai-section-title" type="button" onClick={()=>setOverviewOpen(value=>!value)}><span>知识概览<Sparkle size={13} weight="fill" /></span><CaretDown size={16} className={overviewOpen?'':'closed'} /></button>{overviewOpen&&<><p>当前已关联{kind}<strong>{label}</strong>。回答仅引用该范围内你可查看的文件，以下为模拟回答。</p><div className="document-ai-related"><span>相关知识</span><div className="context-ai-knowledge" title={label}>{context.target?<ContentIcon node={context.target} size={16}/>:<Books size={16}/>}<span>{label}</span></div></div></>}</section>
      {messages.map((item,index)=>{const allowed=context.allowed&&item.answer.citations.every(cite=>validIds.has(cite.id));return <div key={index}><div className="question-bubble">{item.question}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>知识库助手</strong><small>模拟回答</small></div></div><p>{allowed?item.answer.text:'来源权限或关联范围已变化，此回答暂不可查看。'}</p><div className="kb-citations">{allowed&&item.answer.citations.map(cite=><button key={cite.id} type="button" onClick={()=>{const current=loadState(),fresh=scope(current);if(current.viewAs===userId&&fresh.pool.some(node=>node.id===cite.id))onOpen(cite.id);else setError('来源已不可访问，请重新提问。');}}>{cite.name}</button>)}</div></div></div>;})}
      {!messages.length&&<div className="document-ai-empty"><Robot size={28}/><strong>针对当前{kind}提问</strong><p>{context.allowed?'输入问题，回答将附上可访问的来源。':'关联内容已删除或当前没有查看权限。'}</p></div>}
    </article></div>
    <div className="composer conversation-composer document-ai-system-composer">
      {error&&<p className="access-error" role="alert">{error}</p>}
      <textarea aria-label="向AI提问" disabled={!context.allowed} value={message} onChange={event=>setMessage(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();ask();}}} placeholder="继续追问，回答会带来源" />
      <div className="composer-bottom"><div className="composer-tools"><span className="kb-sim-note" title={label}>模拟 · 当前{kind}</span></div><div className="send-tools"><button type="button" className="send" aria-label="发送" disabled={!message.trim()||!context.allowed} onClick={ask}><ArrowUp size={22} weight="bold" /></button></div></div>
    </div>
    <p className="ai-content-disclaimer">内容由模拟回答生成，请核实重要信息。</p>
  </aside>;
}

function AskPage({ state, userId, onOpen }) {
  const spaces = visibleSpaces(state, userId);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [skills, setSkills] = useState([]);
  const [knowledge, setKnowledge] = useState([]);
  const availableKnowledge=spaces.map(s=>s.id).join('|');
  useEffect(()=>{setKnowledge(ids=>ids.filter(id=>spaces.some(s=>s.id===id)));},[availableKnowledge,userId]);
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

function RecyclePage({state,userId,update,setConfirm,say}){
  const [error,setError]=useState(''),[restoring,setRestoring]=useState('');
  useEffect(()=>{setRestoring('');setError('');},[userId]);
  const deletedLibraries=state.spaces.filter(space=>space.deletedAt&&libraryRights(state,space,userId,true).manage);
  const deleted=state.nodes.filter(node=>!state.spaces.find(space=>space.id===node.spaceId)?.deletedAt&&node.deletedAt&&contentRights(state,node,userId,true).manage&&!state.nodes.some(p=>p.id===node.parentId&&p.spaceId===node.spaceId&&p.deletedAt&&p.deleteBatch&&p.deleteBatch===node.deleteBatch));
  const run=(recipe,result)=>{try{update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化，请重新操作');return recipe(current);});setError('');if(result)say(result.text,result.target);}catch(err){setError(err.message);}};
  const restore=node=>{
    if(restoreNeedsLocation(state,node,userId)){setRestoring(node.id);return;}
    setConfirm({title:'恢复原内容',body:`将恢复到原位置，并按当前知识库规则和权限提供访问，不创建副本。`,action:()=>run(current=>restoreContent(current,node.id,userId),{text:'内容已恢复',target:{entity:'node',id:node.id}})});
  };
  const selected=state.nodes.find(n=>n.id===restoring&&n.deletedAt);
  return <><header className="knowledge-header"><div><h1>回收站</h1></div></header>{error&&<p className="access-error" role="alert">{error}</p>}
    {!deleted.length&&!deletedLibraries.length&&<Empty title="回收站是空的" body="删除内容后会出现在这里。"/>}
    {(!!deleted.length||!!deletedLibraries.length)&&<div className="knowledge-document-table recycle-table"><div className="knowledge-document-row recycle-row head"><span>名称 / 原位置</span><span>删除时间</span><span>历史创建人</span><span className="recycle-actions-heading">操作</span></div>{deletedLibraries.map(library=><div className="knowledge-document-row recycle-row" data-recycled-library={library.id} key={library.id}>
      <div className="recycle-item-main"><Books size={23} className="recycle-item-icon"/><div className="recycle-item-copy"><div className="recycle-name-line"><strong title={library.name}>{library.name}</strong></div><div className="recycle-location" title={`${LIBRARY_TYPES[libraryType(library)]} / ${library.name}`}>原位置：{LIBRARY_TYPES[libraryType(library)]} / {library.name}</div></div></div>
      <span className="recycle-time">{formatTime(library.deletedAt)}</span><span className="recycle-creator" title={memberName(state,creatorId(library))}>{memberName(state,creatorId(library))}</span>
      <div className="recycle-row-actions"><button className="recycle-icon-action" type="button" aria-label="恢复" title="恢复" onClick={()=>setConfirm({title:'恢复知识库',body:'恢复知识库及本次一起删除的内容。原来单独删除的内容仍保留在回收站，权限按恢复时的组织授权生效。',action:()=>run(current=>restoreLibrary(current,library.id,userId),{text:'知识库已恢复',target:{entity:'space',id:library.id}})})}><ArrowCounterClockwise size={17}/></button><button className="recycle-icon-action recycle-delete" type="button" aria-label="删除" title="删除" onClick={()=>setConfirm({title:'彻底删除知识库',body:'知识库及其中全部内容将永久删除，无法恢复。其他位置的独立副本保留。',action:()=>run(current=>permanentlyDeleteLibrary(current,library.id,userId))})}><Trash size={17}/></button></div>
    </div>)}{deleted.map(node=>{
      const library=state.spaces.find(s=>s.id===node.spaceId),position=node.originalLocation||[library?.name,...folderTrail(state,node.parentId).map(id=>state.nodes.find(n=>n.id===id)?.name),node.name].filter(Boolean).join(' / ');
      return <div className="knowledge-document-row recycle-row" key={node.id}>
        <div className="recycle-item-main"><ContentIcon node={node}/><div className="recycle-item-copy"><div className="recycle-name-line"><strong title={node.name}>{node.name}</strong></div><div className="recycle-location" title={`原位置：${position}`}>原位置：{position}</div></div></div>
        <span className="recycle-time">{formatTime(node.deletedAt)}</span><span className="recycle-creator" title={memberName(state,creatorId(node))}>{memberName(state,creatorId(node))}</span>
        <div className="recycle-row-actions"><button className="recycle-icon-action" type="button" aria-label="恢复" title="恢复" onClick={()=>restore(node)}><ArrowCounterClockwise size={17}/></button><button className="recycle-icon-action recycle-delete" type="button" aria-label="删除" title="删除" onClick={()=>setConfirm({title:'彻底删除原内容',body:'永久删除原内容及全部子内容，无法恢复。',action:()=>run(current=>{const target=current.nodes.find(n=>n.id===node.id);if(!target?.deletedAt||!contentRights(current,target,userId,true).manage)throw Error('没有管理权限');const ids=contentTree(current,target);if(current.nodes.some(n=>ids.has(n.id)&&!contentRights(current,n,userId,true).manage))throw Error('存在不能管理的子内容，未执行删除');return {...current,nodes:current.nodes.filter(n=>!ids.has(n.id))};})})}><Trash size={17}/></button></div>
      </div>;
    })}</div>}
    {selected&&<RestoreLocationDialog state={state} node={selected} userId={userId} update={update} onClose={()=>setRestoring('')} onSaved={restored=>say('内容已恢复到所选位置',{entity:'node',id:restored.id})}/>}
  </>;
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

function DocumentPage({ navigationGuard, state, update, userId, nodeId, startEditing = false, origin = "", fromFolder = "", say, setConfirm, onOpen, openShare, onAction, notice, setNotice,noticeAction,onNoticeView,onNoticePause,onNoticeClose }) {
  const node = state.nodes.find((item) => item.id === nodeId);
  const role = nodeRole(state, node, userId);
  const space = state.spaces.find((item) => item.id === node?.spaceId);
  const [draft, setDraft] = useState(()=>readDocumentDraft(userId,nodeId)?.body??node?.creationDraftBody??node?.body??"");
  const [recoveredDraft,setRecoveredDraft]=useState(!!readDocumentDraft(userId,nodeId)||!!node?.creationDraftBody);
  const draftLoadedFor=useRef(null);
  const storedCreationBody=useRef(node?.creationDraftBody??node?.body??'');
  const isNewDraft=!!node?.creationDraft;
  const [editing, setEditing] = useState((startEditing||!!readDocumentDraft(userId,nodeId)||!!node?.creationDraft) && node?.format!=='file' && role.edit);
  const [saveError, setSaveError] = useState("");
  const [leave, setLeave] = useState(null);
  const baseBody = useRef(readDocumentDraft(userId,nodeId)?.baseBody??node?.body??"");
  const [aiOpen, setAiOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [knowledge,setKnowledge]=useState({mode:'doc',items:[]});
  const [documentSkills,setDocumentSkills]=useState([]),[documentExpert,setDocumentExpert]=useState(''),[documentAttachments,setDocumentAttachments]=useState([]),[selectedQuote,setSelectedQuote]=useState(null),[selectionToolbar,setSelectionToolbar]=useState(null),[overviewOpen,setOverviewOpen]=useState(true),[outlineActive,setOutlineActive]=useState('doc-body'),[activeSlide,setActiveSlide]=useState(0);
  const panel=useDocumentPanel(nodeId,role.view&&aiOpen);
  const bodyElement=useRef(null);
  const [messages, setMessages] = useState([]);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  useEffect(()=>{
    const record=()=>{if(document.visibilityState!=='visible')return;try{const latest=loadState(),current=latest.nodes.find(n=>n.id===nodeId);if(latest.viewAs===userId&&contentRights(latest,current,userId).view)update(s=>visitContent(s,nodeId,userId));}catch{/* Reading remains available if recording a visit fails. */}};
    record();window.addEventListener('focus',record);document.addEventListener('visibilitychange',record);
    return()=>{window.removeEventListener('focus',record);document.removeEventListener('visibilitychange',record);};
  },[nodeId,userId]);
  useEffect(() => { const previous = document.title; document.title = node && role.view ? `${node.name} · ${contentLabel(node)}` : "文档不可用"; return () => { document.title = previous; }; }, [node?.id, node?.name, node?.format, role.view]);
  useEffect(() => { const key=`${userId}:${nodeId}`;if(draftLoadedFor.current===key)return;draftLoadedFor.current=key;const cached=readDocumentDraft(userId,nodeId);setDraft(cached?.body??node?.creationDraftBody??node?.body??'');storedCreationBody.current=node?.creationDraftBody??node?.body??'';baseBody.current=cached?.baseBody??node?.body??'';setEditing((!!cached||startEditing||!!node?.creationDraft)&&node?.format!=='file'&&role.edit);setRecoveredDraft(!!cached||!!node?.creationDraftBody);setMessages([]);setSaveError(''); }, [nodeId,userId]);
  useEffect(()=>{
    if(editing&&(draft!==baseBody.current||isNewDraft)){try{storeDocumentDraft(userId,nodeId,draft,baseBody.current);}catch{setSaveError('草稿暂存失败，请尽快保存；离开页面可能丢失修改。');}}
  },[draft,editing,nodeId,userId]);
  useEffect(()=>{
    if(!editing||!isNewDraft||draft===storedCreationBody.current)return;
    try{update(current=>{const target=current.nodes.find(item=>item.id===nodeId);if(current.viewAs!==userId||!target?.creationDraft||target.draftOwnerId!==userId)throw Error('草稿状态已变化，请核对后保存');if((target.creationDraftBody??target.body??'')!==storedCreationBody.current)throw Error('草稿已在其他标签页变化，本次输入仍保留在当前标签页');return {...current,nodes:current.nodes.map(item=>item.id===nodeId?{...item,creationDraftBody:draft,draftUpdatedAt:new Date().toISOString()}:item)};});storedCreationBody.current=draft;}catch(error){setSaveError(error.message);}
  },[draft,editing,isNewDraft,nodeId,userId]);

  useEffect(()=>{
    const currentHash=window.location.hash;
    const guard=target=>{if(!role.view||!editing||!isNewDraft&&draft===baseBody.current||target===currentHash)return true;setLeave({target});return false;};
    navigationGuard.current=guard;return()=>{if(navigationGuard.current===guard)navigationGuard.current=null;};
  },[editing,draft,nodeId,userId,role.view,isNewDraft]);
  useEffect(() => { if (!editing) { setDraft(node?.body || ""); baseBody.current = node?.body || ""; } }, [node?.body, editing]);
  useEffect(() => { const guard = event => { if (editing && (isNewDraft||draft !== baseBody.current)) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard); }, [editing, draft,isNewDraft]);
  useEffect(()=>{setKnowledge({mode:'doc',items:[]});setDocumentSkills([]);setDocumentExpert('');setDocumentAttachments([]);setSelectedQuote(null);setSelectionToolbar(null);setOverviewOpen(true);setOutlineActive('doc-body');setActiveSlide(0);setQuestion('');setMessages([]);},[nodeId,userId]);
  useEffect(()=>{
    setKnowledge(current=>{if(current.mode!=='selection')return current;const valid=availableKnowledgeSelection(state,userId,current.items);return valid.length===current.items.length?current:{mode:'selection',items:valid};});
    if(!role.view){setSelectedQuote(null);setSelectionToolbar(null);}
  },[state,userId,nodeId]);
  if (!node || !can(role, "view")) return <div className="knowledge-doc-shell"><a className="knowledge-doc-back" href="#/home">返回知识库</a><Empty title="看不到这篇文档" body="它可能已删除，或当前身份没有权限。" /></div>;
  const view = validView(state, space, userId, origin);
  const backUrl = spaceUrl(space.id, view, node.parentId);
  const editable = can(role, "edit") && node.format !== 'file';
  const clearEditRoute = () => window.history.replaceState(null, "", `${window.location.href.split("#")[0]}#/doc/${nodeId}?view=${view}${node.parentId ? `&folder=${node.parentId}` : ""}`);
  const save = () => {
    try {
      update(current => {
        const latest = current.nodes.find(item => item.id === node.id);
        if (current.viewAs!==userId || !latest || latest.deletedAt || !can(nodeRole(current, latest, userId), "edit")) throw Error("当前文档已不可编辑，请保留本次内容并核对权限。");
        if ((latest.body || "") !== baseBody.current) throw Error("其他标签页已更新正文，本次内容尚未覆盖。请先保留修改，再重新打开核对。");
        if(latest.creationDraft&&(latest.creationDraftBody??latest.body??'')!==storedCreationBody.current)throw Error('草稿已在其他标签页变化，请先核对，未覆盖原草稿');
        const committed=commitCreationDraft(current,latest,userId);
        return {...current,nodes:current.nodes.map(item=>item.id===node.id?{...committed,body:draft,updatedAt:new Date().toISOString()}:item)};
      });
      removeDocumentDraft(userId,nodeId);setRecoveredDraft(false);baseBody.current = draft; setEditing(false); setSaveError(""); clearEditRoute(); say("已保存"); return true;
    } catch (error) { setSaveError(error.message || "保存失败，请重试"); return false; }
  };
  const discard = () => { removeDocumentDraft(userId,nodeId);setRecoveredDraft(false);setDraft(node.body || ""); baseBody.current = node.body || ""; setEditing(false); setSaveError(""); clearEditRoute(); };
  const abandonNew=()=>{try{update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化');return abandonCreationDraft(current,nodeId,userId);});removeDocumentDraft(userId,nodeId);navigationGuard.current=null;const target=leave?.target;setLeave(null);if(target)window.location.hash=target;else go(backUrl);return true;}catch(error){setSaveError(error.message);return false;}};
  const startEdit = () => { const latest=loadState(),current=latest.nodes.find(n=>n.id===node.id),reason=actionReason(latest,current,userId,"edit");if(reason){say(reason);return;}setDraft(current.body || ""); baseBody.current = current.body || ""; setEditing(true); setSaveError(""); };
  const continueNavigation=()=>{const target=leave==='back'?`#${backUrl}`:leave?.target;navigationGuard.current=null;setLeave(null);if(target)window.location.hash=target;};
  const chooseDocumentSkill=name=>setDocumentSkills(current=>current.includes(name)?current:[...current,name]);
  const captureSelection=event=>{
    if(!role.view)return;
    let text='',box,range;const field=event.target.closest?.('textarea,input');
    if(field&&typeof field.selectionStart==='number'){
      text=field.value.slice(field.selectionStart,field.selectionEnd);box=field.getBoundingClientRect();
    }else{
      const selection=window.getSelection();if(!selection?.rangeCount||!bodyElement.current?.contains(selection.anchorNode)||!bodyElement.current?.contains(selection.focusNode))return;
      text=selection.toString();range=selection.getRangeAt(0).cloneRange();box=range.getBoundingClientRect();
    }
    if(!text.trim())return;
    setSelectedQuote({nodeId:node.id,text});chooseDocumentSkill('帮我写作');setAiOpen(true);
    setSelectionToolbar({left:box.left+Math.min(box.width/2,180),top:box.bottom+8});
    requestAnimationFrame(()=>{const current=field?.isConnected?field.getBoundingClientRect():range?.startContainer?.isConnected?range.getBoundingClientRect():null;if(current)setSelectionToolbar({left:current.left+Math.min(current.width/2,180),top:current.bottom+8});});
  };
  const copySelection=async()=>{
    try{const latest=loadState();if(latest.viewAs!==userId||!contentRights(latest,latest.nodes.find(n=>n.id===selectedQuote?.nodeId),userId).download)throw Error('当前没有复制权限');if(!navigator.clipboard?.writeText)throw Error('浏览器暂不支持复制');await navigator.clipboard.writeText(selectedQuote.text);say('已复制选中文字');}catch(error){say(error.message);}
  };
  const ask = value => {
    const text=(value??question).trim();if(!text)return;
    const latest=loadState(),current=latest.nodes.find(n=>n.id===node.id);
    if(latest.viewAs!==userId||!contentRights(latest,current,userId).view){say('当前文档已不可访问，请重新打开');return;}
    if(knowledge.mode==='selection'&&(!knowledge.items.length||availableKnowledgeSelection(latest,userId,knowledge.items).length!==knowledge.items.length)){say('所选知识已不可用，请重新选择知识范围');return;}
    const pool=knowledgePool(latest,userId,current,knowledge);
    if(selectedQuote&&!pool.some(n=>n.id===node.id))pool.unshift(current);
    const answer=selectedQuote&&documentSkills.includes('帮我写作')&&/改写|润色|重写|优化|写作/.test(text)?{text:`模拟改写建议（原型演示）：\n${selectedQuote.text.trim().replace(/。(?=\S)/g,'。\n')}\n\n可继续补充目标语气、篇幅和使用场景。`,citations:[{id:current.id,name:current.name}]}:mockAnswer(latest,userId,pool,text,current);
    setMessages(items=>[...items,{question:text,quote:selectedQuote?.text||'',skills:[...documentSkills],expert:documentExpert,attachments:documentAttachments.map(file=>file.name),answer}]);setQuestion('');setSelectionToolbar(null);setAiOpen(true);
  };
  const freshConversation=()=>{setMessages([]);setQuestion('');setSelectedQuote(null);setSelectionToolbar(null);setDocumentSkills([]);setDocumentExpert('');setDocumentAttachments([]);setKnowledge({mode:'doc',items:[]});};
  const plainText = contentText(node, editing ? draft : node.body);
  const paragraphs=plainText.split(/\r?\n/).filter(line=>line.trim());
  const outline=documentOutline(node,editing?draft:node.body||'').filter(item=>!editing||!item.id.startsWith('doc-section-')),sections=documentSections(node,editing?draft:node.body||'');
  const jumpTo=item=>{if(item.slide!==undefined)setActiveSlide(item.slide);setOutlineActive(item.key||item.id);requestAnimationFrame(()=>scrollDocumentSection(bodyElement.current?.closest('.document-scroll-area'),bodyElement.current?.querySelector(`[id="${item.id==='doc-body'&&!editing&&!['sheet','slides','file'].includes(node.format)&&paragraphs.length<=1?'doc-summary':item.id}"]`)));};
  return <div className="knowledge-doc-shell">
    <a className="knowledge-doc-back" title={space?.name||'知识库'} onClick={event => { if (editing && (isNewDraft||draft !== baseBody.current)) { event.preventDefault(); setLeave("back"); } }} href={`#${backUrl}`}>返回 {space?.name || "知识库"}</a>
    <main className="standalone-document-page">
      <header className="document-window-bar">
        <div className="document-window-title"><ContentIcon node={node} size={20} /><DocumentTitle key={node.id} state={state} node={node} userId={userId} update={update} editable={role.edit}/><StarFour size={18} /></div>
        <div className="document-window-actions">
          <span className="new-saved-status" role="status">{isNewDraft?"新建草稿 · 首次保存后生效":editing ? draft !== baseBody.current ? "有未保存修改" : "编辑中" : "已保存"}</span><span>{formatTime(node.updatedAt)}</span>
          {!editable && <em className="kb-readonly">{node.format==='file'?'文件预览':`只读 · ${roleLabel(role)}`}</em>}
          <ScopeBadge access={effectiveAccess(state, node)} />
          {editing && <><button type="button" onClick={() => isNewDraft||draft !== baseBody.current ? setLeave("cancel") : discard()}>{isNewDraft?'放弃新建':'取消编辑'}</button><button type="button" onClick={save}>保存</button></>}
          <button type="button" disabled={!role.manage||editing} title={editing?'请先保存或取消编辑':!role.manage?'需要管理权限':undefined} onClick={() => openShare(node)}><ShareNetwork size={18} />分享</button>
          <button type="button" aria-label="问 AI" onClick={() => setAiOpen(v=>!v)}><Sparkle size={18} />AI</button>
          <FileMenu state={state} node={node} userId={userId} context="document" editing={editing} onAction={(action,item)=>{if(action==='edit')startEdit();else if(action==='ai'){setKnowledge({mode:'doc',items:[]});setAiOpen(true);}else onAction(action,item);}}/>
          <img className="avatar avatar-small" src={publicAsset("/user-avatar.png")} alt={memberName(state, node.ownerId)} />
        </div>
      </header>
      {recoveredDraft&&editing&&<p className="draft-recovered-note" role="status">已恢复本标签页未保存的草稿，请核对后保存。</p>}
      {saveError && <p className="new-document-error" role="alert">{saveError}</p>}
      <div className={`document-format-toolbar ${toolbarCollapsed&&node.format!=='file' ? "collapsed" : ""}`} role="toolbar" aria-label="文档编辑工具栏">
        <div className="document-toolbar-controls">
          {node.format==='file'?<div className="uploaded-preview-toolbar"><File size={17}/><span>文件预览</span><small>此文件不可在线编辑，下载等操作请使用右上角菜单。</small></div>:<>
          <button type="button" disabled title="暂不支持此编辑操作"><List size={19} />菜单</button><button type="button" disabled title="暂不支持此编辑操作"><Plus size={18} weight="bold" />插入</button><button type="button" onClick={() => ask("请总结这篇文档")}><Sparkle size={18} />AI 创作</button><span className="document-toolbar-divider" />
          <button type="button" disabled title="暂不支持此排版操作" aria-label="撤销"><ArrowCounterClockwise size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="重做"><ArrowClockwise size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="格式刷"><PaintRoller size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="清除格式"><Eraser size={18} /></button><span className="document-toolbar-divider" />
          <button type="button" disabled title="暂不支持此排版操作">默认<CaretDown size={13} /></button><button type="button" disabled title="暂不支持此排版操作">正文<CaretDown size={13} /></button><button type="button" disabled title="暂不支持此排版操作">16<CaretDown size={13} /></button><span className="document-toolbar-divider" />
          {[["bold", "B"], ["italic", "I"], ["underline", "U"], ["strike", "S"]].map(([id, label]) => <button key={id} type="button" disabled title="暂不支持此排版操作"><strong>{label}</strong></button>)}
          <span className="document-toolbar-divider" />
          <button type="button" disabled title="暂不支持此排版操作" aria-label="项目列表"><List size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="编号列表"><ListNumbers size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="任务列表"><CheckSquare size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="链接"><LinkSimple size={18} /></button>
          <button type="button" disabled title="暂不支持此排版操作" aria-label="行距"><ArrowsDownUp size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="对齐"><TextAlignLeft size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="减少缩进"><TextOutdent size={18} /></button><button type="button" disabled title="暂不支持此排版操作" aria-label="增加缩进"><TextIndent size={18} /></button>
          </>}
        </div>
        {node.format!=='file'&&<button className="document-toolbar-collapse" type="button" aria-label={toolbarCollapsed ? "展开工具栏" : "收起工具栏"} onClick={() => setToolbarCollapsed((value) => !value)}><CaretDown size={20} /></button>}
      </div>
      <div ref={panel.workspace} className={`document-workspace doc-interactive-workspace${aiOpen ? "" : " ai-panel-closed"}`} style={{'--document-ai-width':`${panel.width}px`}}>
        <aside className="document-outline" aria-label="文档大纲">
          <div><strong>大纲</strong><button type="button" aria-label="收起大纲"><X size={17} /></button></div>
          <p>{node.name}</p>
          <nav>{outline.map(item=><button type="button" key={item.key||item.id} className={`${outlineActive===(item.key||item.id)?'active':''} ${item.id.startsWith('doc-section')?'is-subsection':''}`} title={item.label} onClick={()=>jumpTo(item)}>{item.label}</button>)}<button type="button" className={outlineActive==='doc-permissions'?'active':''} onClick={()=>jumpTo({id:'doc-permissions'})}>权限说明</button></nav>
        </aside>
        <section className="document-scroll-area">
          {!aiOpen && <button className="document-ai-open-button" type="button" aria-label="打开 AI 面板" onClick={() => setAiOpen(true)}><Sparkle size={22} weight="fill" /></button>}
          <article ref={bodyElement} className="document-sheet" onMouseUp={captureSelection}>
            <h1>{node.name}</h1>
            <div id="doc-permissions" className="document-meta"><UserCircle size={18} />{memberName(state, responsibleId(node))} · {responsibleId(node) === userId ? "负责人" : roleLabel(role)}<span /><Clock size={18} />{formatTime(node.updatedAt)}{node.permissionMode==='layered'?" · 协作者权限":node.inherit !== false ? " · 继承上级范围" : " · 独立范围"}</div>
            {node.format==='file'?<div id="doc-body"><UploadedFilePreview key={node.id} node={node} canDownload={role.download}/></div>:['sheet','slides'].includes(node.format)?<div id="doc-body"><SimpleContentEditor key={node.id} format={node.format} value={editing?draft:node.body} editing={editing} onChange={setDraft} activeIndex={activeSlide} onActiveChange={setActiveSlide}/></div>:<><section className="document-summary" id="doc-summary"><h2>{node.faq?'标准问答':'文档摘要'}</h2><p>{paragraphs[0]||'这篇文档还没有正文。'}</p></section><div id="doc-body">{editing?<textarea className="kb-body" aria-label="文档正文" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="开始撰写正文…"/>:sections.map(section=><section className="document-report-section" id={section.id} key={section.id}>{section.heading?<h2>{section.heading}</h2>:<p>{section.text}</p>}</section>)}</div></>}

          </article>
        </section>
        {aiOpen&&<aside className={`document-ai-panel ${selectedQuote||documentSkills.length||documentAttachments.length?'has-ai-context':''}`} aria-label="AI 对话">
          <div className="document-ai-resize-handle" role="separator" tabIndex={0} aria-label="调整 AI 面板宽度" aria-orientation="vertical" aria-valuemin={280} aria-valuemax={panel.maximum} aria-valuenow={panel.width} onPointerDown={panel.startResize} onKeyDown={panel.resizeKey}/>
          <header className="document-ai-header"><strong><Sparkle size={18} weight="fill"/>问AI</strong><div><button type="button" aria-label="新建对话" onClick={freshConversation}><Plus size={19}/></button><button type="button" aria-label="关闭 AI 面板" onClick={()=>setAiOpen(false)}><X size={19}/></button></div></header>
          <div className="conversation-scroll document-ai-conversation-scroll"><article className="conversation-body">
            <section className="document-ai-overview"><button className="document-ai-section-title" type="button" aria-expanded={overviewOpen} onClick={()=>setOverviewOpen(open=>!open)}><span>知识概览<Sparkle size={13} weight="fill"/></span><CaretDown size={16} className={overviewOpen?'':'closed'}/></button>{overviewOpen&&<><p>可以围绕<strong>{node.name}</strong>提问，也可选择其他有权查看的知识。</p><div className="document-ai-actions"><button type="button" onClick={()=>ask('请总结这篇文档')}><FileText size={16} weight="fill"/>知识总结</button><button type="button"><ProjectorScreenChart size={16} weight="fill"/>PPT制作</button><button type="button"><ChartBar size={16} weight="fill"/>思维导图</button><button type="button"><BookBookmark size={16} weight="fill"/>知识图解</button></div><div className="document-ai-related"><span>相关知识</span><button type="button"><FileText size={16}/>{node.name}</button></div></>}</section>
            {messages.map((item, index) => <div key={index}><div className="question-bubble">{item.quote&&<span className="doc-message-quote">{item.quote}</span>}{item.question}{!!(item.skills?.length||item.expert||item.attachments?.length)&&<div className="doc-message-context">{[item.expert,...(item.skills||[]),...(item.attachments||[])].filter(Boolean).join(' · ')}</div>}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>知识库助手</strong><small>模拟回答</small></div></div><p>{answerAllowed(state, userId, item.answer) ? item.answer.text : "来源权限已变化，此回答暂不可查看。"}</p><div className="kb-citations">{item.answer.citations.filter(cite => can(nodeRole(state, state.nodes.find(n => n.id === cite.id), userId), "view")).map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}><Copy size={14} />{cite.name}</button>)}</div></div></div>)}
            {!messages.length && <div className="document-ai-empty"><Robot size={28} /><strong>针对当前文档提问</strong><p>试试问文档标题，命中问答时会返回原文。</p></div>}
          </article></div>
          <div className="composer conversation-composer document-ai-system-composer doc-interactive-composer">
            {(selectedQuote||documentSkills.length>0||documentAttachments.length>0)&&<div className="doc-composer-context">{selectedQuote&&<div className="doc-selection-quote" aria-label="引用的文档内容"><span>{selectedQuote.text}</span><button type="button" aria-label="移除引用内容" onClick={()=>{setSelectedQuote(null);setSelectionToolbar(null);}}><X size={12}/></button></div>}{!!documentSkills.length&&<div className="doc-skill-chips" aria-label="已选技能">{documentSkills.map(skill=><span className="doc-skill-chip" key={skill}><Sparkle size={12}/><span>{skill}</span><button type="button" aria-label={`移除技能 ${skill}`} onClick={()=>setDocumentSkills(items=>items.filter(item=>item!==skill))}><X size={11}/></button></span>)}</div>}{!!documentAttachments.length&&<div className="doc-ai-attachments" aria-label="本地附件">{documentAttachments.map(file=><div className="doc-ai-attachment" key={`${file.name}:${file.size}:${file.lastModified}`}><FileText size={18}/><span><strong title={file.name}>{file.name}</strong><small>{file.size<1024?`${file.size} B`:`${(file.size/1024).toFixed(1)} KB`}</small></span><button type="button" aria-label={`移除附件 ${file.name}`} onClick={()=>setDocumentAttachments(files=>files.filter(item=>item!==file))}><X size={12}/></button></div>)}</div>}</div>}
            <textarea value={question} onChange={event=>setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();ask();}}} placeholder={selectedQuote||documentSkills.length?'':'围绕文档提问，或选中正文引用'}/>
            <div className="composer-bottom"><div className="composer-tools"><DocumentCapabilityPicker expert={documentExpert} onExpertChange={setDocumentExpert} onSkillSelect={chooseDocumentSkill}/><DocumentKnowledgePicker state={state} userId={userId} node={node} value={knowledge} onChange={setKnowledge} attachments={documentAttachments} onAttachmentsChange={setDocumentAttachments} onNotice={say}/></div><div className="send-tools"><button type="button" className="send" aria-label="发送" disabled={!question.trim()} onClick={()=>ask()}><ArrowUp size={22} weight="bold"/></button></div></div>
          </div>
          <p className="ai-content-disclaimer">内容由模拟回答生成，请核实重要信息。</p>
        </aside>}
      </div>
      <footer className="document-status-bar" aria-label="文档状态栏">
        <div className="document-status-left"><button type="button">{node.format === "slides" ? `幻灯片：共 ${parseContent("slides", editing ? draft : node.body).slides.length} 页` : node.format === "sheet" ? "工作表：1" : "页面：1/1"}</button><button type="button">字数：{plainText.replace(/\s/g, "").length}</button><button type="button">权限：{roleLabel(role)}</button>{!editable && <button className="status-warning" type="button"><Warning size={14} weight="fill" />只读</button>}</div>
        <div className="document-status-right"><button type="button" aria-label="阅读视图"><Eye size={17} /></button><button className="active" type="button" aria-label="页面视图"><Note size={17} /></button><button type="button" aria-label="大纲视图"><List size={17} /></button><button type="button" aria-label="网页视图"><Globe size={17} /></button><button type="button" aria-label="编辑模式"><PencilLine size={17} /></button><button type="button" aria-label="适应窗口"><CornersOut size={17} /></button><button className="zoom-value" type="button">100%<CaretDown size={11} /></button><button type="button" aria-label="缩小">−</button><input aria-label="缩放比例" type="range" min="50" max="200" defaultValue="100" /><button type="button" aria-label="放大">＋</button><button type="button" aria-label="全屏"><ArrowsOutSimple size={17} /></button></div>
      </footer>
    </main>
    {selectionToolbar&&selectedQuote&&<DocumentSelectionToolbar position={selectionToolbar} canCopy={role.download} onCopy={copySelection} onRewrite={()=>{chooseDocumentSkill('帮我写作');setQuestion(current=>current||'请润色这段内容，保持原意。');setAiOpen(true);}} onClose={()=>setSelectionToolbar(null)}/>}
    {leave&&<DocumentLeaveDialog isNewDraft={isNewDraft} error={saveError} onClose={()=>setLeave(null)} onDiscard={()=>{if(isNewDraft)abandonNew();else{discard();continueNavigation();}}} onSave={()=>{if(save())continueNavigation();}}/>}
    {notice&&<KnowledgeNotice text={notice} onClose={onNoticeClose} onView={noticeAction?onNoticeView:undefined} onPause={onNoticePause}/>} 
  </div>;
}

function DocumentLeaveDialog({isNewDraft,error,onClose,onDiscard,onSave}){
  const root=useRef(null);useLocationDialog(root,onClose);
  return <div className="knowledge-product-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={root} className="knowledge-product-dialog" role="dialog" aria-modal="true" aria-label="未保存的修改"><h2>{isNewDraft?'新建内容尚未保存':'有未保存的修改'}</h2><p>{isNewDraft?'草稿已暂存。首次保存后才按目标目录权限生效；放弃新建将删除此草稿。':'保存后继续，或放弃这次修改。'}</p>{error&&<p role="alert">{error}</p>}<div className="kb-dialog-actions"><button type="button" onClick={onClose}>继续编辑</button><button type="button" onClick={onDiscard}>{isNewDraft?'放弃新建':'放弃修改'}</button><button type="button" onClick={onSave}>保存并继续</button></div></section></div>;
}

function ConfirmDialog({ title, body, action, onClose, confirmText }) {
  const root=useRef(null);useLocationDialog(root,onClose);const deleting=title.includes('删除');
  return <div className="knowledge-product-dialog-backdrop" onMouseDown={onClose}><section ref={root} className="knowledge-product-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><h2>{title}</h2><p>{body}</p><div className="kb-dialog-actions"><button type="button" onClick={onClose}>取消</button><button type="button" className={deleting?'danger-primary':''} onClick={() => { action(); onClose(); }}>{confirmText||(deleting?'删除':'确认')}</button></div></section></div>;
}

