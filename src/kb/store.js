const KEY = "kb-prototype-v1";

export const ROLE_OPTIONS = [
  ["manager", "可管理"],
  ["editor", "可编辑"],
  ["downloader", "可查看/下载"],
  ["viewer", "仅查看"],
  ["none", "无权限"],
];

const rank = { none: -1, viewer: 0, downloader: 1, editor: 2, manager: 3 };

export function roleLabel(role) {
  return ROLE_OPTIONS.find(([value]) => value === role)?.[1] || "无权限";
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export function seedState() {
  return {
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
      { id: "space-personal", name: "周宁的个人知识库", description: "仅自己可见的草稿和备忘", teamId: "", personal: true, ownerId: "zhou-ning", visibility: "private", managerInherit: "manager", memberInherit: "none", members: [] },
      { id: "space-handbook", name: "产品手册库", description: "对客口径、功能说明和常见问题", teamId: "team-product", personal: false, ownerId: "zhou-ning", visibility: "team", managerInherit: "manager", memberInherit: "default", members: [] },
      { id: "space-retro", name: "交付复盘库", description: "项目过程、复盘和移交清单", teamId: "team-delivery", personal: false, ownerId: "zhao-heng", visibility: "team", managerInherit: "manager", memberInherit: "viewer", members: [{ type: "staff", id: "zhao-heng", role: "editor" }] },
    ],
    nodes: [
      { id: "doc-faq", spaceId: "space-handbook", parentId: "", type: "doc", name: "报销需要哪些材料", body: "差旅报销需要发票、行程单和部门负责人确认。市内交通只保留电子发票。", ownerId: "zhou-ning", favorite: true, updatedAt: daysAgo(1), deletedAt: "", inherit: true, members: [], faq: true },
      { id: "folder-guide", spaceId: "space-handbook", parentId: "", type: "folder", name: "功能说明", body: "", ownerId: "zhou-ning", favorite: false, updatedAt: daysAgo(3), deletedAt: "", inherit: true, members: [] },
      { id: "doc-guide", spaceId: "space-handbook", parentId: "folder-guide", type: "doc", name: "知识库怎么授权", body: "团队管理员默认可以管理本库。团队成员的角色可以设成与团队一致，也可以单独改成仅查看。文档还可以再单独指定成员。", ownerId: "chen-ke", favorite: false, updatedAt: daysAgo(2), deletedAt: "", inherit: true, members: [] },
      { id: "doc-note", spaceId: "space-personal", parentId: "", type: "doc", name: "本周要整理的口径", body: "把对外报价口径从个人备忘挪到产品手册库，并标上团队可见。", ownerId: "zhou-ning", favorite: false, updatedAt: daysAgo(0), deletedAt: "", inherit: true, members: [] },
      { id: "doc-retro", spaceId: "space-retro", parentId: "", type: "doc", name: "华东项目移交清单", body: "移交时要包含账号、接口凭证负责人和未关闭问题。查看者只能阅读，不能下载附件。", ownerId: "zhao-heng", favorite: false, updatedAt: daysAgo(4), deletedAt: "", inherit: false, members: [{ type: "staff", id: "lin-xia", role: "viewer" }] },
    ],
    recents: ["doc-faq", "doc-note"],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (!parsed?.org || !parsed?.nodes) return seedState();
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  const next = seedState();
  saveState(next);
  return next;
}

export function memberName(state, id) {
  return state.members.find((item) => item.id === id)?.name || "未知成员";
}

export function teamRole(state, team, userId) {
  return team?.members?.[userId] || "none";
}

export function spaceRole(state, space, userId) {
  if (!space) return "none";
  if (space.personal) return space.ownerId === userId ? "manager" : "none";
  const direct = space.members.find((item) => item.type === "staff" && item.id === userId);
  if (direct) return direct.role;
  const team = state.teams.find((item) => item.id === space.teamId);
  const inherited = teamRole(state, team, userId);
  if (inherited === "manager") return space.managerInherit || "manager";
  if (inherited !== "none") return space.memberInherit === "default" ? inherited : (space.memberInherit || "none");
  return "none";
}

export function nodeRole(state, node, userId) {
  if (!node || node.deletedAt) return "none";
  const space = state.spaces.find((item) => item.id === node.spaceId);
  const direct = node.members.find((item) => item.type === "staff" && item.id === userId);
  if (direct) return direct.role;
  if (node.inherit !== false) return spaceRole(state, space, userId);
  return "none";
}

export function can(role, action) {
  const value = rank[role] ?? -1;
  if (action === "view") return value >= 0;
  if (action === "download") return value >= 1;
  if (action === "edit") return value >= 2;
  if (action === "manage") return value >= 3;
  return false;
}

export function visibleSpaces(state, userId) {
  return state.spaces.filter((space) => can(spaceRole(state, space, userId), "view"));
}

export function visibleNodes(state, userId) {
  return state.nodes.filter((node) => !node.deletedAt && can(nodeRole(state, node, userId), "view"));
}
