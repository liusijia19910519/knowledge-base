import { migrateAccess, libraryRights, contentRights, librariesForView, CAPABILITIES } from './access.js';
import { DATA_VERSION, initializePrototypeResources } from './prototypeData.js';
export const STORAGE_KEY = "kb-prototype-v3";
const KEY=STORAGE_KEY;

export const ROLE_OPTIONS = [
  ["manager", "可管理"],
  ["editor", "可编辑"],
  ["downloader", "可查看/下载"],
  ["viewer", "仅查看"],
  ["none", "无权限"],
];

const rank = { none: -1, viewer: 0, downloader: 1, editor: 2, manager: 3 };

export function roleLabel(role) {
  if (role && typeof role === "object") return CAPABILITIES.filter(([k]) => role[k]).map(([,label]) => label).join("、") || "无权限";
  return ROLE_OPTIONS.find(([value]) => value === role)?.[1] || "无权限";
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function seedState() {
  return {
    businessVersion: DATA_VERSION,
    org: { name: "北辰制造", code: "beichen-demo" },
    meId: "zhou-ning",
    viewAs: "zhou-ning",
    teamDefaults: {
      whoCanCreate: "all",
      teamAccess: "members",
      teamVisible: true,
      spaceMemberInherit: "editor",
      spaceVisible: "follow",
    },
    licenseLimit: 10,
    departments: [
      { id: "root", name: "北辰制造", parentId: "" },
      { id: "product", name: "产品部", parentId: "root" },
      { id: "delivery", name: "交付部", parentId: "root" },
    ],
    tags: [
      { id: "sales", name: "一线同事" },
      { id: "newbie", name: "新人" },
    ],
    members: [
      { id: "zhou-ning", name: "周宁", staffId: "zhou.ning", deptId: "product", title: "知识管理员", admin: true, licensed: true, tags: ["sales"] },
      { id: "chen-ke", name: "陈可", staffId: "chen.ke", deptId: "product", title: "产品经理", admin: false, licensed: true, tags: ["newbie"] },
      { id: "zhao-heng", name: "赵衡", staffId: "zhao.heng", deptId: "delivery", title: "交付顾问", admin: false, licensed: true, tags: ["sales"] },
      { id: "lin-xia", name: "林夏", staffId: "lin.xia", deptId: "delivery", title: "实施专员", admin: false, licensed: false, tags: [] },
    ],
    teams: [
      { id: "team-product", name: "产品团队", secret: false, intro: "产品资料与对外口径", members: { "zhou-ning": "manager", "chen-ke": "viewer", "lin-xia": "downloader" } },
      { id: "team-delivery", name: "交付项目", secret: false, intro: "项目复盘只在项目组内可见", members: { "zhou-ning": "manager", "zhao-heng": "editor" } },
    ],
    spaces: [
      {id:'space-personal',kind:'personal',name:'周宁的个人知识库',description:'仅自己可见的草稿和备忘',ownerId:'zhou-ning',icon:{kind:'preset',key:'book'},cover:{kind:'preset',key:'mist'},access:{subjects:[]},members:[]},
      {id:'space-handbook',kind:'shared',name:'产品手册库',description:'产品部协作，授权范围不改变知识库类型',ownerId:'zhou-ning',icon:{kind:'preset',key:'manual'},cover:{kind:'preset',key:'glass'},access:{subjects:[{type:'department',id:'product',role:'editor'},{type:'person',id:'lin-xia',role:'downloader'}]},members:[]},
      {id:'space-retro',kind:'shared',name:'交付复盘库',description:'文件创建者与上级文件夹创建者共同管理内容',ownerId:'zhao-heng',icon:{kind:'preset',key:'notes'},cover:{kind:'preset',key:'sand'},access:{subjects:[{type:'person',id:'zhou-ning',role:'manager'},{type:'department',id:'delivery',role:'editor'}]},members:[]},
      {id:'space-company-share',kind:'shared',name:'公司协作资料',description:'授权全公司查看，仍然属于共享知识库',ownerId:'chen-ke',icon:{kind:'preset',key:'chat'},cover:{kind:'preset',key:'mint'},access:{subjects:[{type:'company',id:'beichen-demo',role:'viewer'},{type:'person',id:'zhou-ning',role:'editor'}]},members:[]},
      {id:'space-plaza',kind:'plaza',name:'组织知识广场',description:'公司全员始终可查看，其他操作单独授权',ownerId:'zhao-heng',icon:{kind:'preset',key:'plane'},cover:{kind:'preset',key:'lavender'},access:{subjects:[{type:'person',id:'zhou-ning',role:'editor'}]},members:[]},
      {id:'space-chen-personal',kind:'personal',name:'陈可的个人知识库',description:'个人资料仅本人可见',ownerId:'chen-ke',icon:{kind:'preset',key:'book'},access:{subjects:[]},members:[]},
    ],
    nodes: [
      {id:'doc-faq',spaceId:'space-handbook',parentId:'',type:'doc',format:'doc',name:'报销需要哪些材料',body:'差旅报销需要发票、行程单和部门负责人确认。市内交通只保留电子发票。',ownerId:'zhou-ning',favorite:true,updatedAt:daysAgo(1),deletedAt:'',faq:true},
      {id:'folder-guide',spaceId:'space-handbook',parentId:'',type:'folder',name:'功能说明',body:'',ownerId:'zhou-ning',updatedAt:daysAgo(3),deletedAt:''},
      {id:'doc-guide',spaceId:'space-handbook',parentId:'folder-guide',type:'doc',format:'doc',name:'知识库怎么授权',body:'共享知识库可授权公司、部门和人员。文件创建者和当前上级文件夹创建者拥有受保护的管理权限。移动后重置普通授权，重新继承目标位置。',ownerId:'chen-ke',updatedAt:daysAgo(2),deletedAt:''},
      {id:'doc-note',spaceId:'space-personal',parentId:'',type:'doc',format:'doc',name:'本周要整理的口径',body:'个人资料协作前请移动到共享知识库或知识广场。移动保留文件，复制产生独立副本。',ownerId:'zhou-ning',updatedAt:daysAgo(0),deletedAt:''},
      {id:'folder-retro',spaceId:'space-retro',parentId:'',type:'folder',name:'项目复盘资料',body:'',ownerId:'zhou-ning',updatedAt:daysAgo(3),deletedAt:''},
      {id:'doc-retro',spaceId:'space-retro',parentId:'folder-retro',type:'doc',format:'doc',name:'华东项目移交清单',body:'此文件由赵衡创建，周宁作为上级文件夹创建者同样可管理。周宁不能把此文件直接移入个人库，但可复制。',ownerId:'zhao-heng',updatedAt:daysAgo(4),deletedAt:''},
      {id:'doc-company',spaceId:'space-company-share',parentId:'',type:'doc',format:'doc',name:'公司协作说明',body:'所有公司成员可在线查看，但这个知识库仍属于共享类型。仅查看不包含下载和复制。',ownerId:'chen-ke',updatedAt:daysAgo(1),deletedAt:''},
      {id:'doc-plaza',spaceId:'space-plaza',parentId:'',type:'doc',format:'doc',name:'组织知识使用说明',body:'广场内容始终保证公司全员查看。可额外授权更高权限；撤销额外公司授权后恢复为全员查看。',ownerId:'zhao-heng',updatedAt:daysAgo(1),deletedAt:''},
    ],
    recents: ["doc-faq", "doc-note"],
  };
}

// Restored builds can encounter newer cached records without legacy member arrays.
// Complete their collection fields without discarding content, ACLs or metadata.
export function normalizeState(state) {
  const defaults = seedState();
  const list = (value, fallback = []) => Array.isArray(value) ? value : fallback;
  const normalized=migrateAccess({
    ...defaults,
    ...state,
    teamDefaults: { ...defaults.teamDefaults, ...state.teamDefaults },
    members: list(state.members, defaults.members).filter(Boolean).map(member => ({ ...member, tags: list(member.tags) })),
    teams: list(state.teams).filter(Boolean).map(team => ({ ...team, members: team.members && typeof team.members === "object" && !Array.isArray(team.members) ? team.members : {} })),
    departments: list(state.departments),
    tags: list(state.tags),
    spaces: list(state.spaces).filter(Boolean).map(space => ({ ...space, kind:space.kind||'shared', members: list(space.members) })),
    nodes: list(state.nodes).filter(Boolean).map(node => ({ ...node, createdAt:node.createdAt||node.updatedAt||new Date().toISOString(), members: list(node.members) })),
    recents: list(state.recents),
  });
  if(!Object.prototype.hasOwnProperty.call(normalized.pinsByUser||{},normalized.meId)){
    normalized.pinsByUser={...normalized.pinsByUser,[normalized.meId]:librariesForView(normalized,normalized.meId).slice(0,4).map(s=>({spaceId:s.id,view:['personal','shared','plaza'].find(view=>librariesForView(normalized,normalized.meId,view).some(x=>x.id===s.id))}))};
  }
  return normalized;
}

export function loadState() {
  initializePrototypeResources();
  try {
    const parsed=JSON.parse(localStorage.getItem(KEY)||'null');
    if(parsed?.businessVersion===DATA_VERSION&&parsed.org&&Array.isArray(parsed.nodes))return normalizeState(parsed);
  }catch{}
  const fresh=normalizeState(seedState());saveState(fresh);localStorage.removeItem('kb-prototype-v1');return fresh;
}
export function saveState(state){if(state.businessVersion!==DATA_VERSION)throw Error('原型数据版本已更新，请刷新页面');localStorage.setItem(KEY,JSON.stringify(state));}
export function resetState(){const next=normalizeState(seedState());saveState(next);return next;}

export function memberName(state, id) {
  return state.members.find((item) => item.id === id)?.name || "未知成员";
}

export function teamRole(state, team, userId) {
  return team?.members?.[userId] || "none";
}

export function spaceRole(state, space, userId) { return libraryRights(state, space, userId); }
export function nodeRole(state, node, userId) { return contentRights(state, node, userId); }

export function can(role, action) {
  if (role && typeof role === "object") return !!(action === "download" ? role.download ?? role.view : role[action]);
  const value = rank[role] ?? -1;
  if (action === "view") return value >= 0;
  if (action === "download") return value >= 1;
  if (action === "edit") return value >= 2;
  if (action === "manage") return value >= 3;
  return false;
}

export function visibleSpaces(state, userId) {
  return librariesForView(state, userId);
}

export function visibleNodes(state, userId) {
  return state.nodes.filter((node) => !node.deletedAt && can(nodeRole(state, node, userId), "view"));
}
