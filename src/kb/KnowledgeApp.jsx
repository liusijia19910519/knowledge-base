import { useEffect, useState } from "react";
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
import {
  can, loadState, memberName, nodeRole, resetState, ROLE_OPTIONS, roleLabel, saveState,
  spaceRole, teamRole, visibleNodes, visibleSpaces,
} from "./store.js";

const CARD_TONES = ["", "ice", "night", "amber"];
const CARD_ICONS = [FolderOpen, Briefcase, Lightbulb, Archive];

function useStore() {
  const [state, setState] = useState(loadState);
  const update = (recipe) => setState((current) => {
    const next = recipe(current);
    saveState(next);
    return next;
  });
  return [state, update];
}

function route() {
  const parts = (window.location.hash.replace(/^#/, "") || "/home").split("/").filter(Boolean);
  return { path: parts[0] || "home", id: parts[1] || "" };
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
  const [createMenu, setCreateMenu] = useState(false);
  const [libraryDialog, setLibraryDialog] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [folderPath, setFolderPath] = useState([]);
  const [menuFor, setMenuFor] = useState("");

  useEffect(() => {
    const sync = () => setLocation(route());
    window.addEventListener("hashchange", sync);
    if (!window.location.hash) go("/home");
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => { setFolderPath([]); setDetailAiOpen(false); setMemberOpen(false); setMenuFor(""); }, [location.path, location.id]);

  const userId = state.viewAs;
  const me = state.members.find((item) => item.id === userId);
  const spaces = visibleSpaces(state, userId);
  const say = (text) => setNotice(text);
  const openDoc = (id) => {
    update((current) => ({ ...current, recents: [id, ...current.recents.filter((item) => item !== id)].slice(0, 12) }));
    go(`/doc/${id}`);
  };
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

  const createNode = (type, parentId, spaceId, name = type === "folder" ? "新建文件夹" : "未命名文档") => {
    const target = state.spaces.find((item) => item.id === spaceId);
    if (!can(spaceRole(state, target, userId), "edit")) { say("当前身份不能新建。"); return; }
    const id = `${type}-${Date.now()}`;
    update((current) => ({
      ...current,
      nodes: [...current.nodes, { id, spaceId, parentId, type, name, body: type === "doc" ? "在这里写下正文。" : "", ownerId: userId, favorite: false, updatedAt: new Date().toISOString(), deletedAt: "", inherit: true, members: [], faq: false }],
    }));
    if (type === "doc") openDoc(id);
    else say(`已新建文件夹「${name}」。`);
  };

  if (location.path === "doc") {
    return <DocumentPage state={state} update={update} userId={userId} nodeId={location.id} say={say} setConfirm={setConfirm} onOpen={openDoc} notice={notice} setNotice={setNotice} />;
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
        <div className="knowledge-subnav-group">
          <strong>置顶知识库</strong>
          {spaces.slice(0, 4).map((item) => <button key={item.id} onClick={() => go(`/space/${item.id}`)}><FolderOpen size={16} />{item.name}</button>)}
          {!spaces.length && <button type="button" disabled>当前身份还看不到知识库</button>}
        </div>
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
        {location.path === "home" && <HomePage state={state} userId={userId} query={query} setQuery={setQuery} onOpen={openDoc} update={update} createNode={createNode} />}
        {location.path === "ask" && <AskPage state={state} userId={userId} onOpen={openDoc} />}
        {isLibrary && <LibraryPage state={state} userId={userId} section={section} query={query} setQuery={setQuery} createMenu={createMenu} setCreateMenu={setCreateMenu} onCreateLibrary={() => setLibraryDialog(true)} createNode={createNode} />}
        {isDetail && <SpaceDetail state={state} userId={userId} space={space} query={query} folderPath={folderPath} setFolderPath={setFolderPath} menuFor={menuFor} setMenuFor={setMenuFor} detailAiOpen={detailAiOpen} setDetailAiOpen={setDetailAiOpen} setMemberOpen={setMemberOpen} createNode={createNode} openDoc={openDoc} say={say} setConfirm={setConfirm} update={update} />}
        {location.path === "recycle" && <RecyclePage state={state} userId={userId} update={update} setConfirm={setConfirm} />}
        {location.path === "admin" && (me?.admin ? <AdminPage state={state} update={update} /> : <Empty title="没有管理后台入口" body="当前身份不是管理员。换到周宁可以查看演示用的组织、许可和团队默认权限。" />)}
      </div>
      {isDetail && detailAiOpen && space && <SpaceAiDrawer state={state} userId={userId} space={space} onOpen={openDoc} onClose={() => setDetailAiOpen(false)} />}
    </section>
    {libraryDialog && <div className="knowledge-product-dialog-backdrop" onMouseDown={() => setLibraryDialog(false)}><form className="knowledge-product-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => {
      event.preventDefault();
      const name = libraryName.trim();
      if (!name) return;
      const id = `space-${Date.now()}`;
      const personal = section !== "shared";
      update((current) => ({ ...current, spaces: [...current.spaces, { id, name, description: personal ? "仅自己可见" : "团队可见的新知识库", teamId: personal ? "" : (current.teams.find((team) => can(teamRole(current, team, userId), "manage"))?.id || current.teams[0]?.id || ""), personal, ownerId: userId, visibility: personal ? "private" : "team", managerInherit: "manager", memberInherit: current.teamDefaults.spaceMemberInherit || "editor", members: [] }] }));
      setLibraryName("");
      setLibraryDialog(false);
      go(`/space/${id}`);
      say(`已创建知识库「${name}」。内容只保存在这台浏览器里。`);
    }}><h2>新建知识库</h2><label className="kb-field">名称<input value={libraryName} onChange={(event) => setLibraryName(event.target.value)} placeholder="例如：项目复盘" autoFocus /></label><div className="kb-dialog-actions"><button type="button" onClick={() => setLibraryDialog(false)}>取消</button><button type="submit">创建</button></div></form></div>}
    {memberOpen && space && <MemberPanel title={`${space.name} 的成员`} hint="团队管理员和团队成员会继承到知识库。单独指定的人会覆盖继承。权限只影响这个原型里能点开的内容。" rows={spaceMemberRows(state, space)} onClose={() => setMemberOpen(false)} onChange={(target, nextRole) => update((current) => ({ ...current, spaces: current.spaces.map((item) => item.id === space.id ? applySpaceRole(item, target, nextRole) : item) }))} />}
    {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    {notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice("")}>知道了</button></div>}
  </div>;
}

function Empty({ title, body }) {
  return <div className="knowledge-empty"><MagnifyingGlass size={28} /><strong>{title}</strong><span>{body}</span></div>;
}

function HomePage({ state, userId, query, setQuery, onOpen, update, createNode }) {
  const [tab, setTab] = useState("recent");
  const docs = visibleNodes(state, userId).filter((node) => node.type === "doc");
  const list = docs.filter((node) => {
    if (query && !`${node.name}${node.body}`.includes(query.trim())) return false;
    if (tab === "favorite") return node.favorite;
    if (tab === "owned") return node.ownerId === userId;
    if (tab === "shared") return node.ownerId !== userId;
    return state.recents.includes(node.id);
  });
  const editable = visibleSpaces(state, userId).find((space) => can(spaceRole(state, space, userId), "edit"));
  return <>
    <header className="knowledge-home-header"><h1>主页</h1><label><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文档" /></label></header>
    <div className="knowledge-home-actions">
      <button type="button" onClick={() => editable && createNode("doc", "", editable.id)}><Plus size={22} weight="bold" /><span><strong>新建</strong><small>新建文档开始协作</small></span><CaretDown size={15} /></button>
      <button type="button" onClick={() => editable ? createNode("doc", "", editable.id, "上传的文件") : null}><UploadSimple size={22} /><span><strong>上传</strong><small>上传本地文件</small></span><CaretDown size={15} /></button>
      <button type="button" onClick={() => editable ? createNode("doc", "", editable.id, "未命名模板文档") : null}><Sparkle size={22} weight="fill" /><span><strong>模板库</strong><small>选择模板快速新建</small></span><CaretRight size={15} /></button>
    </div>
    <div className="knowledge-home-toolbar"><div role="tablist" aria-label="文档范围">{[["recent", "最近访问"], ["owned", "我拥有的"], ["shared", "与我共享"], ["favorite", "收藏"]].map(([value, label]) => <button className={tab === value ? "active" : ""} role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}</button>)}</div><button type="button"><List size={17} />显示设置</button></div>
    <div className="knowledge-document-table">
      <div className="knowledge-document-row head"><span>标题</span><span>位置</span><span>所有者</span><span>最近访问</span><span /></div>
      {list.map((node) => {
        const library = state.spaces.find((item) => item.id === node.spaceId);
        return <button className="knowledge-document-row" key={node.id} onClick={() => onOpen(node.id)}><span><File size={19} weight="fill" />{node.name}</span><span>{library?.name}</span><span><UserCircle size={18} weight="fill" />{memberName(state, node.ownerId)}</span><span>{formatTime(node.updatedAt)}</span><DotsThree size={19} /></button>;
      })}
    </div>
    {!list.length && <Empty title="没有找到相关文档" body="换一个关键词，或先打开一篇示例文档。" />}
  </>;
}

function LibraryPage({ state, userId, section, query, setQuery, createMenu, setCreateMenu, onCreateLibrary, createNode }) {
  const [scope, setScope] = useState("all");
  const title = section === "shared" ? "共享知识库" : section === "plaza" ? "知识广场" : "个人知识库";
  const hint = section === "shared" ? "统一管理我共享的及与我共享的团队知识库" : section === "plaza" ? "发现组织内可访问的知识库，打开后查看目录与文档" : "管理个人知识，让经验持续产生价值";
  const visible = visibleSpaces(state, userId).filter((space) => {
    if (section === "personal" && !space.personal) return false;
    if (section !== "personal" && space.personal) return false;
    if (section === "shared" && scope === "created" && space.ownerId !== userId) return false;
    if (section === "shared" && scope === "joined" && space.ownerId === userId) return false;
    return `${space.name}${space.description}`.includes(query.trim());
  });
  const editable = visibleSpaces(state, userId).find((space) => space.personal === (section === "personal") && can(spaceRole(state, space, userId), "edit")) || visibleSpaces(state, userId).find((space) => can(spaceRole(state, space, userId), "edit"));
  return <>
    <header className="knowledge-header"><div><h1>{title}</h1><p>{hint}</p></div></header>
    <div className="knowledge-actions">
      <div className="knowledge-action-menu">
        <button type="button" aria-expanded={createMenu} onClick={() => setCreateMenu((value) => !value)}><span><Plus size={22} weight="bold" /></span><div><strong>新建内容</strong><small>新建文档或上传文件</small></div><CaretDown size={17} /></button>
        {createMenu && <div className="knowledge-action-popover" role="menu">
          <button type="button" onClick={() => { setCreateMenu(false); if (editable) createNode("doc", "", editable.id); }}>新建文档</button>
          <button type="button" onClick={() => { setCreateMenu(false); if (editable) createNode("folder", "", editable.id); }}>新建文件夹</button>
          <label>上传文件<input className="knowledge-file-input" type="file" onChange={(event) => { setCreateMenu(false); const file = event.target.files?.[0]; if (editable && file) createNode("doc", "", editable.id, file.name); }} /></label>
        </div>}
      </div>
      <button type="button" onClick={onCreateLibrary}><span><BookBookmark size={22} weight="fill" /></span><div><strong>新建知识库</strong><small>创建并配置知识空间</small></div><CaretRight size={17} /></button>
    </div>
    <div className="knowledge-section-heading">
      {section === "shared" ? <div className="knowledge-heading-main"><div className="knowledge-scope-tabs" role="tablist">{[["all", "全部"], ["created", "我共享的"], ["joined", "与我共享"]].map(([value, label]) => <button className={scope === value ? "active" : ""} type="button" key={value} onClick={() => setScope(value)}>{label}</button>)}</div></div> : <div />}
      <label className="knowledge-inline-search"><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索知识库" /></label>
    </div>
    <div className="knowledge-grid">{visible.map((space) => {
      const index = state.spaces.findIndex((item) => item.id === space.id);
      return <button key={space.id} className={`knowledge-card ${CARD_TONES[index % CARD_TONES.length]}`} onClick={() => go(`/space/${space.id}`)}>
        <PushPin className="knowledge-card-pin" size={15} weight="bold" /><strong>{space.name}</strong><p>{space.description}</p>
        <span className="knowledge-card-settings"><Gear size={17} weight="bold" />{roleLabel(spaceRole(state, space, userId))}</span>
      </button>;
    })}</div>
    {!visible.length && <Empty title="没有找到相关知识库" body="当前身份看不到内容，或换一个关键词。" />}
  </>;
}

function SpaceDetail({ state, userId, space, folderPath, setFolderPath, menuFor, setMenuFor, detailAiOpen, setDetailAiOpen, setMemberOpen, createNode, openDoc, say, setConfirm, update }) {
  const role = spaceRole(state, space, userId);
  useEffect(() => {
    if (!menuFor) return undefined;
    const close = (event) => { if (!event.target.closest(".knowledge-folder-menu-wrap")) setMenuFor(""); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuFor, setMenuFor]);
  if (!space || !can(role, "view")) return <Empty title="看不到这个知识库" body="当前身份没有访问权限。回到主页，或换一个演示身份。" />;
  const folderId = folderPath[folderPath.length - 1] || "";
  const entries = state.nodes.filter((node) => node.spaceId === space.id && !node.deletedAt && node.parentId === folderId && can(nodeRole(state, node, userId), "view"));
  const index = Math.max(0, state.spaces.findIndex((item) => item.id === space.id));
  const Icon = CARD_ICONS[index % CARD_ICONS.length];
  const tone = CARD_TONES[index % CARD_TONES.length] || "ocean";
  return <div className={`knowledge-library-detail ${tone}`}>
    <header className="knowledge-detail-toolbar">
      <button type="button" onClick={() => go(space.personal ? "/personal" : "/shared")}><CaretRight size={17} /><span>知识库</span></button>
      <div>
        <label className="kb-inline-identity">身份<select aria-label="当前身份" value={userId} onChange={(event) => update((current) => ({ ...current, viewAs: event.target.value }))}>{state.members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <button type="button" onClick={() => say("分享链接只在这个原型里演示，没有真正发出去。")}><ShareNetwork size={17} />分享</button>
        <button type="button" onClick={() => can(role, "manage") ? setMemberOpen(true) : say(`当前身份是${roleLabel(role)}，不能改成员。`)}><Gear size={17} />设置</button>
      </div>
    </header>
    <section className="knowledge-detail-hero">
      <span className="knowledge-detail-icon"><Icon size={36} weight="fill" /></span>
      <div><h1>{space.name}</h1><p>{space.description}</p><small><UserCircle size={16} weight="fill" />{memberName(state, space.ownerId)} · {roleLabel(role)} · {entries.length} 项内容</small></div>
      {!detailAiOpen && <button type="button" onClick={() => setDetailAiOpen(true)}><Sparkle size={18} weight="fill" />问AI</button>}
    </section>
    <div className="knowledge-detail-list-toolbar">
      <nav className="knowledge-detail-breadcrumb" aria-label="文件夹路径">
        <button className={!folderPath.length ? "current" : ""} type="button" onClick={() => setFolderPath([])}>全部</button>
        {folderPath.map((id, index) => <span key={id}><CaretRight size={16} /><button className={index === folderPath.length - 1 ? "current" : ""} type="button" onClick={() => setFolderPath(folderPath.slice(0, index + 1))}>{state.nodes.find((node) => node.id === id)?.name}</button></span>)}
      </nav>
      <div>
        <label><MagnifyingGlass size={16} /><input placeholder="搜索当前文件夹" readOnly /></label>
        {can(role, "edit") && <button type="button" onClick={() => createNode("doc", folderId, space.id, "上传的文件")}><UploadSimple size={16} />上传</button>}
        {can(role, "edit") && <button type="button" onClick={() => createNode("doc", folderId, space.id)}><Plus size={16} />新建</button>}
        {can(role, "manage") && <button type="button" onClick={() => setMemberOpen(true)}>成员与权限</button>}
      </div>
    </div>
    <div className="knowledge-detail-table">
      <div className="knowledge-detail-row head"><span>名称</span><span>所有者</span><span>修改时间</span><span>类型</span><span aria-hidden="true" /></div>
      {entries.map((node) => <div className={`knowledge-detail-row ${node.type === "folder" ? "folder" : "file"}`} role="button" tabIndex={0} key={node.id} onClick={() => node.type === "folder" ? setFolderPath([...folderPath, node.id]) : openDoc(node.id)} onKeyDown={(event) => { if (event.key === "Enter") node.type === "folder" ? setFolderPath([...folderPath, node.id]) : openDoc(node.id); }}>
        <span>{node.type === "folder" ? <FolderOpen size={18} weight="fill" /> : <File size={18} weight="fill" />}{node.name}</span>
        <span>{memberName(state, node.ownerId)}</span>
        <span>{formatTime(node.updatedAt)}</span>
        <span>{node.type === "folder" ? "文件夹" : "文档"}</span>
        <div className="knowledge-folder-menu-wrap">
          <button className="knowledge-detail-more" type="button" aria-label={`${node.name}更多操作`} onClick={(event) => { event.stopPropagation(); setMenuFor(menuFor === node.id ? "" : node.id); }}><DotsThree size={20} weight="bold" /></button>
          {menuFor === node.id && <div className="knowledge-folder-menu" role="menu" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => { setMenuFor(""); say("这是演示分享，没有真正发出去。"); }}>分享</button>
            <button type="button" onClick={() => { setMenuFor(""); node.type === "folder" ? setFolderPath([...folderPath, node.id]) : openDoc(node.id); }}>打开</button>
            {can(nodeRole(state, node, userId), "edit") && <button className="danger" type="button" onClick={() => { setMenuFor(""); setConfirm({ title: "删除", body: "删除后进入回收站，可以恢复。", action: () => update((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === node.id ? { ...item, deletedAt: new Date().toISOString() } : item) })) }); }}>删除</button>}
          </div>}
        </div>
      </div>)}
    </div>
    {!entries.length && <Empty title="这个目录是空的" body="可以新建文档或文件夹。上传只会在本地记一条文档。" />}
  </div>;
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
      {messages.map((item, index) => <div key={index}><div className="question-bubble">{item.question}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>知识库助手</strong><small>模拟回答</small></div></div><p>{item.answer.text}</p><div className="kb-citations">{item.answer.citations.map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}>{cite.name}</button>)}</div></div></div>)}
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
  const pool = visibleNodes(state, userId).filter((node) => node.type === "doc" && (!knowledge.length || knowledge.some((name) => state.spaces.find((space) => space.id === node.spaceId)?.name === name)));
  const submit = (given) => {
    const question = (given ?? message).replace(/[\/@]$/, "").trim();
    if (!question) return;
    const answer = mockAnswer(state, userId, pool, question);
    const task = skills.length ? { title: skills[0], status: "已完成", output: skills[0] === "会议纪要" ? "已生成会议结论、待办和负责人。" : `已基于 ${knowledge.length ? knowledge.join("、") : "全部可见知识"} 生成可继续编辑的结果。` } : null;
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
    {!!messages.length && <main className="ai-thread" aria-live="polite">{messages.map((item) => <article key={item.id} className="ai-turn"><div className="knowledge-ai-user">{item.question}</div><div className="ai-answer-card"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>{item.expert || "知识库助手"}</strong><small>{item.knowledge.length ? `已引用 ${item.knowledge.join("、")}` : "已检索全部可见知识"}{item.webSearch ? " · 已开启联网搜索" : ""}</small></div></div><p>{item.answer.text}</p>{item.task && <div className="ai-task-result"><span>任务结果</span><strong>{item.task.title}</strong><em>{item.task.status}</em><p>{item.task.output}</p><button type="button" onClick={() => setNotice("结果已保存到本次对话，可继续编辑或引用。")}>查看结果</button></div>}<div className="kb-citations">{item.answer.citations.map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}><FileText size={14} />{cite.name}</button>)}</div><footer><button type="button" onClick={() => setNotice("回答已复制")}>复制</button><button type="button" onClick={() => setMessage(`请继续展开：${item.question}`)}>继续追问</button><button type="button" onClick={() => setNotice("已收到反馈")}>有帮助</button></footer></div></article>)}</main>}
    <AIComposer {...{ message, onMessageChange, submit, skills, setSkills, knowledge, setKnowledge, expert, setExpert, webSearch, setWebSearch, recording, toggleVoice, attachments, setAttachments, picker, setPicker, capabilityTab, setCapabilityTab, spaces, chooseSkill, chooseKnowledge }} />
    <p className="knowledge-ai-disclaimer">回答基于当前身份可见的知识生成；重要内容请核实来源。</p>{notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice("")}>知道了</button></div>}
  </section>;
}

function AIComposer({ message, onMessageChange, submit, skills, setSkills, knowledge, setKnowledge, expert, setExpert, webSearch, setWebSearch, recording, toggleVoice, attachments, setAttachments, picker, setPicker, capabilityTab, setCapabilityTab, spaces, chooseSkill, chooseKnowledge }) {
  const all = capabilityTab === "skills" ? AI_SKILLS : AI_EXPERTS;
  return <div className={`knowledge-ai-composer ai-composer${skills.length || knowledge.length || attachments.length ? " has-chips" : ""}`}>
    <div className="ai-composer-chips">{skills.map((item) => <span className="composer-skill-chip" key={item}><Sparkle size={13} weight="fill" />{item}<button type="button" aria-label={`移除技能${item}`} onClick={() => setSkills((current) => current.filter((value) => value !== item))}><X size={11} /></button></span>)}{knowledge.map((item) => <span className="composer-skill-chip knowledge-chip" key={item}><Books size={13} weight="fill" />{item}<button type="button" aria-label={`移除知识${item}`} onClick={() => setKnowledge((current) => current.filter((value) => value !== item))}><X size={11} /></button></span>)}{attachments.map((item) => <span className="composer-skill-chip attachment-chip" key={item.name}><FileText size={13} />{item.name}<button type="button" aria-label={`移除附件${item.name}`} onClick={() => setAttachments((current) => current.filter((value) => value.name !== item.name))}><X size={11} /></button></span>)}</div>
    {picker === "slash" && <section className="ai-inline-picker slash-picker"><header><strong>调用技能或专家</strong><button onClick={() => setPicker("")}><X size={15} /></button></header><div className="ai-picker-tabs"><button className={capabilityTab === "skills" ? "active" : ""} onClick={() => setCapabilityTab("skills")}>技能</button><button className={capabilityTab === "experts" ? "active" : ""} onClick={() => setCapabilityTab("experts")}>专家</button></div>{all.map(([name, description]) => <button className="ai-picker-row" key={name} onClick={() => capabilityTab === "skills" ? chooseSkill(name) : (setExpert(name), setPicker(""))}><Sparkle size={16} /><span><strong>{name}</strong><small>{description}</small></span>{capabilityTab === "skills" && <Plus size={16} />}</button>)}<footer><button onClick={() => setPicker("capability")}>浏览全部能力 <CaretRight size={14} /></button></footer></section>}
    {(picker === "knowledge" || picker === "knowledge-center") && <section className="ai-inline-picker knowledge-picker"><header><strong>{picker === "knowledge-center" ? "从知识中心选择" : "指定知识"}</strong><button onClick={() => setPicker("")}><X size={15} /></button></header><p>{picker === "knowledge-center" ? "可多选知识库；选择后会作为本次对话的可追溯上下文。" : "选择后仅在对应知识范围内检索和引用。"}</p>{spaces.map((space) => <button className="ai-picker-row" key={space.id} onClick={() => chooseKnowledge(space.name)}><BookBookmark size={16} /><span><strong>{space.name}</strong><small>{space.description}</small></span>{knowledge.includes(space.name) ? <CheckSquare size={16} /> : <Plus size={16} />}</button>)}<footer>{picker === "knowledge" ? <button onClick={() => setPicker("knowledge-center")}>从知识中心选择更多 <CaretRight size={14} /></button> : <button onClick={() => setPicker("")}>完成选择 <CheckSquare size={14} /></button>}</footer></section>}
    {picker === "capability" && <section className="ai-inline-picker capability-picker"><header><strong>能力中心</strong><button onClick={() => setPicker("")}><X size={15} /></button></header><div className="ai-picker-tabs"><button className={capabilityTab === "skills" ? "active" : ""} onClick={() => setCapabilityTab("skills")}>技能</button><button className={capabilityTab === "experts" ? "active" : ""} onClick={() => setCapabilityTab("experts")}>专家</button></div>{all.map(([name, description]) => <button className="ai-picker-row" key={name} onClick={() => capabilityTab === "skills" ? chooseSkill(name) : (setExpert(name), setPicker(""))}><Sparkle size={16} /><span><strong>{name}</strong><small>{description}</small></span></button>)}</section>}
    <textarea value={message} onChange={(event) => onMessageChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setPicker(""); if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (picker === "slash") chooseSkill(AI_SKILLS[0][0]); else if (picker === "knowledge" && spaces[0]) chooseKnowledge(spaces[0].name); else submit(); } }} placeholder="输入问题；“/”调用技能或专家，“@”指定知识" />
    <div className="ai-composer-bottom"><div className="ai-composer-controls"><button className={expert ? "selected" : ""} type="button" onClick={() => setPicker("capability")}><Sparkle size={16} />{expert || "技能 / 专家"}<CaretDown size={13} /></button><button className={knowledge.length ? "selected" : ""} type="button" onClick={() => setPicker("knowledge")}><Books size={16} />{knowledge.length ? `${knowledge.length} 个知识` : "知识"}<CaretDown size={13} /></button></div><div className="send-tools"><label className="ai-attachment" title="添加附件"><UploadSimple size={19} /><input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) setAttachments((current) => [...current, file]); event.target.value = ""; }} /></label><button className={webSearch ? "web-search active" : "web-search"} type="button" aria-label="联网搜索" aria-pressed={webSearch} onClick={() => setWebSearch((value) => !value)}><Globe size={20} /></button><i /><button className={recording ? "voice-input active" : "voice-input"} type="button" aria-label={recording ? "停止语音输入" : "开始语音输入"} onClick={toggleVoice}><Microphone size={20} /></button><button className="send" aria-label="发送" onClick={() => submit()}><ArrowUp size={21} weight="bold" /></button></div></div>
  </div>;
}

function RecyclePage({ state, userId, update, setConfirm }) {
  const deleted = state.nodes.filter((node) => node.deletedAt && can(spaceRole(state, state.spaces.find((space) => space.id === node.spaceId), userId), "manage"));
  return <>
    <header className="knowledge-header"><div><h1>回收站</h1><p>删除的文档会留在这里。界面按 7 天理解，但不会自动清理。</p></div></header>
    {!deleted.length && <Empty title="回收站是空的" body="删除文档后会出现在这里。" />}
    {!!deleted.length && <div className="knowledge-document-table"><div className="knowledge-document-row head"><span>标题</span><span>删除时间</span><span>所有者</span><span /><span /></div>{deleted.map((node) => <div className="knowledge-document-row" key={node.id}><span><File size={19} weight="fill" />{node.name}</span><span>{formatTime(node.deletedAt)}</span><span>{memberName(state, node.ownerId)}</span><span><button className="kb-text-button" type="button" onClick={() => update((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === node.id ? { ...item, deletedAt: "" } : item) }))}>恢复</button></span><button className="kb-text-button" type="button" onClick={() => setConfirm({ title: "彻底删除", body: "彻底删除后不能从回收站恢复。", action: () => update((current) => ({ ...current, nodes: current.nodes.filter((item) => item.id !== node.id) })) })}>删除</button></div>)}</div>}
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

function DocumentPage({ state, update, userId, nodeId, say, setConfirm, onOpen, notice, setNotice }) {
  const node = state.nodes.find((item) => item.id === nodeId);
  const role = nodeRole(state, node, userId);
  const space = state.spaces.find((item) => item.id === node?.spaceId);
  const [draft, setDraft] = useState(node?.body || "");
  const [editing, setEditing] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState("doc");
  const [messages, setMessages] = useState([]);
  const [formats, setFormats] = useState(["bold"]);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  useEffect(() => { setDraft(node?.body || ""); setEditing(false); setMessages([]); }, [nodeId, node?.body]);
  if (!node || !can(role, "view")) return <div className="knowledge-doc-shell"><a className="knowledge-doc-back" href="#/home">返回知识库</a><Empty title="看不到这篇文档" body="它可能已删除，或当前身份没有权限。" /></div>;
  const editable = can(role, "edit");
  const save = () => {
    update((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === node.id ? { ...item, body: draft, updatedAt: new Date().toISOString() } : item) }));
    setEditing(false);
    say("已保存在本机。");
  };
  const ask = (value) => {
    const text = (value ?? question).trim();
    if (!text) return;
    const pool = scope === "doc" ? [node] : visibleNodes(state, userId).filter((item) => item.type === "doc" && (scope === "company" || item.spaceId === node.spaceId));
    setMessages((current) => [...current, { question: text, answer: mockAnswer(state, userId, pool, text, node) }]);
    setQuestion("");
    setAiOpen(true);
  };
  const paragraphs = (editing ? draft : node.body).split("\n").filter(Boolean);
  return <div className="knowledge-doc-shell">
    <a className="knowledge-doc-back" href={`#/space/${space?.id || ""}`}>返回 {space?.name || "知识库"}</a>
    <main className="standalone-document-page">
      <header className="document-window-bar">
        <div className="document-window-title"><FileText size={20} weight="fill" /><strong>{node.name}</strong><StarFour size={18} /></div>
        <div className="document-window-actions">
          <span>{formatTime(node.updatedAt)}</span>
          {!editable && <em className="kb-readonly">只读 · {roleLabel(role)}</em>}
          <button type="button" onClick={() => say("分享只在原型里演示。")}><ShareNetwork size={18} />分享</button>
          {editable && !editing && <button type="button" onClick={() => setEditing(true)}><PencilSimple size={18} />编辑</button>}
          {editing && <button type="button" onClick={save}>保存</button>}
          {can(role, "manage") && <button type="button" onClick={() => setMemberOpen(true)}>成员与权限</button>}
          {editable && <button type="button" onClick={() => setConfirm({ title: "删除文档", body: "删除后进入回收站，可以恢复。", action: () => { update((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === node.id ? { ...item, deletedAt: new Date().toISOString() } : item) })); go("/recycle"); } })}>删除</button>}
          <button type="button" aria-label="问 AI" onClick={() => setAiOpen(true)}><Sparkle size={18} /></button>
          <img className="avatar avatar-small" src={publicAsset("/user-avatar.png")} alt={memberName(state, node.ownerId)} />
        </div>
      </header>
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
            <div className="document-meta"><UserCircle size={18} />{memberName(state, node.ownerId)} · {node.ownerId === userId ? "所有者" : roleLabel(role)}<span /><Clock size={18} />{formatTime(node.updatedAt)}{node.inherit !== false ? " · 跟随知识库" : " · 单独成员"}</div>
            <section className="document-summary"><h2>文档摘要</h2><p>{paragraphs[0] || "这篇文档还没有正文。"}</p></section>
            {editing ? <textarea className="kb-body" value={draft} onChange={(event) => setDraft(event.target.value)} /> : paragraphs.slice(1).map((line) => <section className="document-report-section" key={line}><p>{line}</p></section>)}
          </article>
        </section>
        {aiOpen && <aside className="document-ai-panel" aria-label="AI 对话">
          <header className="document-ai-header"><strong><Sparkle size={18} weight="fill" />问AI</strong><div><button aria-label="新建对话" onClick={() => setMessages([])}><Plus size={19} /></button><button aria-label="关闭 AI 面板" onClick={() => setAiOpen(false)}><X size={19} /></button></div></header>
          <div className="conversation-scroll document-ai-conversation-scroll"><article className="conversation-body">
            <section className="document-ai-overview"><button className="document-ai-section-title" type="button"><span>知识概览<Sparkle size={13} weight="fill" /></span><CaretDown size={16} /></button><p>可以围绕<strong>{node.name}</strong>提问。范围可以切到当前文档、当前知识库或全部可见知识。</p><div className="document-ai-actions"><button type="button" onClick={() => ask("请总结这篇文档")}><FileText size={16} weight="fill" />知识总结</button><button type="button"><ProjectorScreenChart size={16} weight="fill" />PPT制作</button><button type="button"><ChartBar size={16} weight="fill" />思维导图</button><button type="button"><BookBookmark size={16} weight="fill" />知识图解</button></div><div className="document-ai-related"><span>相关知识</span><button type="button"><FileText size={16} />{node.name}</button></div></section>
            {messages.map((item, index) => <div key={index}><div className="question-bubble">{item.question}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>知识库助手</strong><small>模拟回答</small></div></div><p>{item.answer.text}</p><div className="kb-citations">{item.answer.citations.map((cite) => <button key={cite.id} type="button" onClick={() => onOpen(cite.id)}><Copy size={14} />{cite.name}</button>)}</div></div></div>)}
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
        <div className="document-status-left"><button type="button">页面：1/1</button><button type="button">字数：{(editing ? draft : node.body).length}</button><button type="button">权限：{roleLabel(role)}</button>{!editable && <button className="status-warning" type="button"><Warning size={14} weight="fill" />只读</button>}</div>
        <div className="document-status-right"><button type="button" aria-label="阅读视图"><Eye size={17} /></button><button className="active" type="button" aria-label="页面视图"><Note size={17} /></button><button type="button" aria-label="大纲视图"><List size={17} /></button><button type="button" aria-label="网页视图"><Globe size={17} /></button><button type="button" aria-label="编辑模式"><PencilLine size={17} /></button><button type="button" aria-label="适应窗口"><CornersOut size={17} /></button><button className="zoom-value" type="button">100%<CaretDown size={11} /></button><button type="button" aria-label="缩小">−</button><input aria-label="缩放比例" type="range" min="50" max="200" defaultValue="100" /><button type="button" aria-label="放大">＋</button><button type="button" aria-label="全屏"><ArrowsOutSimple size={17} /></button></div>
      </footer>
    </main>
    {memberOpen && <MemberPanel title="文档成员" hint={node.inherit !== false ? "现在跟随知识库。改成单独指定后，不再自动跟随。" : "已单独指定成员。"} rows={nodeMemberRows(state, node)} onClose={() => setMemberOpen(false)} onChange={(target, nextRole) => update((current) => ({ ...current, nodes: current.nodes.map((item) => item.id === node.id ? { ...item, inherit: false, members: [...item.members.filter((member) => member.id !== target), ...(nextRole === "none" ? [] : [{ type: "staff", id: target, role: nextRole }])] } : item) }))} />}
    {notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice("")}>知道了</button></div>}
  </div>;
}

function nodeMemberRows(state, node) {
  return [{ key: "owner", label: memberName(state, node.ownerId), detail: "所有者", role: "manager", locked: true }, ...state.members.filter((item) => item.id !== node.ownerId).map((item) => ({ key: item.id, label: item.name, detail: node.members.some((member) => member.id === item.id) ? "单独指定" : "未指定", role: node.members.find((member) => member.id === item.id)?.role || (node.inherit !== false ? nodeRole(state, node, item.id) : "none"), locked: false, target: item.id }))];
}

function spaceMemberRows(state, space) {
  const team = state.teams.find((item) => item.id === space.teamId);
  const rows = [];
  if (team) {
    rows.push({ key: "inherit-manager", label: "团队管理员", detail: "继承", role: space.managerInherit, target: { kind: "inherit-manager" } });
    rows.push({ key: "inherit-member", label: "团队成员", detail: "继承", role: space.memberInherit, target: { kind: "inherit-member" } });
    Object.keys(team.members).forEach((id) => rows.push({ key: id, label: memberName(state, id), detail: `团队角色 ${roleLabel(team.members[id])}`, role: spaceRole(state, space, id), target: { kind: "staff", id } }));
  }
  if (space.personal) rows.push({ key: space.ownerId, label: memberName(state, space.ownerId), detail: "所有者", role: "manager", locked: true });
  return rows;
}

function applySpaceRole(space, target, role) {
  if (target.kind === "inherit-manager") return { ...space, managerInherit: role };
  if (target.kind === "inherit-member") return { ...space, memberInherit: role };
  const members = space.members.filter((item) => !(item.type === "staff" && item.id === target.id));
  if (role !== "none") members.push({ type: "staff", id: target.id, role });
  return { ...space, members };
}

function MemberPanel({ title, hint, rows, onClose, onChange }) {
  return <div className="knowledge-product-dialog-backdrop" onMouseDown={onClose}><section className="knowledge-product-dialog kb-perm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
    <h2>{title}</h2><p>{hint}</p>
    {rows.map((row) => <div className="kb-perm-row" key={row.key}><div><b>{row.label}</b><span>{row.detail}</span></div>{row.locked ? <em>{roleLabel(row.role)}</em> : <select aria-label={`${row.label}的角色`} value={row.role} onChange={(event) => onChange(row.target, event.target.value)}>{ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}</div>)}
    <div className="kb-dialog-actions"><button type="button" onClick={onClose}>关闭</button></div>
  </section></div>;
}

function ConfirmDialog({ title, body, action, onClose }) {
  return <div className="knowledge-product-dialog-backdrop" onMouseDown={onClose}><section className="knowledge-product-dialog" role="dialog" onMouseDown={(event) => event.stopPropagation()}><h2>{title}</h2><p>{body}</p><div className="kb-dialog-actions"><button type="button" onClick={onClose}>取消</button><button type="button" onClick={() => { action(); onClose(); }}>确认</button></div></section></div>;
}

