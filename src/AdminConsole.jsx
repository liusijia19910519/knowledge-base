import { useEffect, useMemo, useRef, useState } from 'react'
import { publicAsset } from './publicAsset.js'
import {
  AppWindow, Archive, ArrowUp, ArrowUpRight, BellRinging, Books, Briefcase, Buildings, CalendarBlank, CaretDown,
  ChartBar, ChartLineUp, ChatCircleDots, Check, CheckCircle, CheckSquare, ClipboardText, Clock, Database,
  DownloadSimple, Eye, FilePdf, FileText, FolderOpen, Gear, Globe, GraduationCap, Gavel, House, Lightbulb, LinkSimple,
  LockKey, MagicWand, MagnifyingGlass, Microphone, Notepad, Paperclip, PencilSimple, Plus, ProjectorScreenChart, ShieldCheck, Sparkle, ThumbsUp, Toolbox, Trash, TrendUp,
  SidebarSimple, UploadSimple, UserCircle, UsersThree, Warning, X,
} from '@phosphor-icons/react'
import './admin-console.css'

const adminNavGroups = [
  ['总览', [['dashboard', '运营驾驶舱', House]]],
  ['业务治理', [
    ['conversationSettings', 'AI 对话设置', ChatCircleDots],
    ['automations', '定时任务管理', CalendarBlank],
    ['experts', '专家管理', Toolbox],
    ['skills', '技能管理', Sparkle],
    ['connectors', '连接器管理', LinkSimple],
    ['applications', '应用管理', AppWindow],
    ['knowledge', '知识库管理', Books],
    ['bestPractices', '最佳实践管理', Lightbulb],
  ]],
  ['AI 治理', [
    ['audit', '对话审计', ChatCircleDots],
    ['models', '模型管理', Database],
    ['modelUsage', '模型用量', TrendUp],
    ['sensitiveWords', '敏感词管理', LockKey],
  ]],
  ['系统', [
    ['members', '组织与成员', UsersThree],
    ['permissions', '权限管理', ShieldCheck],
    ['modelDefaults', '模型配置', Database],
  ]],
]
const adminNav = adminNavGroups.flatMap(([, items]) => items)

const members = [
  ['李鹏飞', '男', 'A10001', '138****3890', 'lipengfei@corp.cn', '产品中心', '超级管理员', '正常'],
  ['张尧', '男', 'A10018', '186****1726', 'zhangyao@corp.cn', '研发中心', '部门管理员', '正常'],
  ['王欣', '女', 'A10026', '185****0334', 'wangxin@corp.cn', '人力资源部', '普通成员', '正常'],
  ['陈晨', '女', 'A10033', '183****4378', 'chenchen@corp.cn', '财务中心', '审计员', '正常'],
  ['刘洋', '男', 'A10042', '182****7140', 'liuyang@corp.cn', '市场中心', '普通成员', '已停用'],
  ['赵敏', '女', 'A10051', '137****9009', 'zhaomin@corp.cn', '法务合规部', '知识管理员', '正常'],
  ['周扬', '男', 'A10063', '186****1182', 'zhouyang@corp.cn', '研发中心', '普通成员', '正常'],
  ['谢倩', '女', 'A10078', '156****1826', 'xieqian@corp.cn', '行政中心', '普通成员', '正常'],
  ['孙宁', '男', 'A10085', '188****1391', 'sunning@corp.cn', '数据中心', '数据管理员', '正常'],
  ['林琳', '女', 'A10096', '139****6082', 'linlin@corp.cn', '产品中心', '普通成员', '正常'],
  ['许哲', '男', 'A10102', '136****5520', 'xuzhe@corp.cn', '市场中心', '普通成员', '正常'],
  ['高洁', '女', 'A10116', '181****3028', 'gaojie@corp.cn', '财务中心', '普通成员', '正常'],
]

const skillPermissions = [
  ['创建审批', '流程审批', '全员', 286, '已启用', 1980],
  ['待办任务', '任务管理', '全员', 286, '已启用', 2860],
  ['数据分析', '数据分析', '管理层、数据中心', 42, '已启用', 3240],
  ['帮我写作', '内容创作', '市场中心、产品中心', 76, '已启用', 2410],
  ['合同审查', '法务合规', '法务合规部、采购中心', 31, '已启用', 1260],
  ['PDF 转 Word', '文档转换', '全员', 286, '已启用', 936],
  ['PPT智能生成', '演示文稿', '管理层、产品中心、市场中心', 64, '已停用', 684],
]

const knowledgeLibraries = [
  ['产品工作资料', '工作资料', 128, '李鹏飞', '仅本人', '今天 10:31', '正常', '个人知识'],
  ['研发技术笔记', '技术沉淀', 96, '张尧', '仅本人', '今天 09:42', '正常', '个人知识'],
  ['资源中心', '企业公共知识', 286, '李鹏飞', '全员可见', '今天 10:31', '正常', '共享知识'],
  ['项目知识库', '项目协作', 128, '产品中心', '成员可见', '今天 09:42', '正常', '共享知识'],
  ['领域知识库', '专业知识', 96, '研究组', '授权可见', '昨天 17:20', '正常', '共享知识'],
  ['档案中心', '归档资料', 364, '行政中心', '授权可见', '昨天 15:08', '正常', '共享知识'],
  ['法务知识库', '制度与合同', 175, '法务合规部', '部门可见', '8月29日', '已删除', '共享知识'],
  ['政策法规专区', '行业政策', 342, '企业知识运营', '全员可见', '今天 08:50', '正常', '知识广场'],
  ['优秀案例库', '实践案例', 218, '产品中心', '全员可见', '昨天 16:20', '正常', '知识广场'],
  ['新员工学习专区', '培训学习', 156, '人力资源部', '全员可见', '8月30日', '正常', '知识广场'],
  ['历史制度汇编', '规章制度', 204, '行政中心', '全员可见', '8月26日', '已删除', '知识广场'],
  ['旧版产品资料', '产品资料', 87, '产品中心', '全员可见', '8月22日', '已删除', '知识广场'],
  ['往期培训资料', '培训学习', 132, '人力资源部', '全员可见', '8月18日', '已删除', '知识广场'],
]

const auditRows = [
  ['李鹏飞', '产品中心', '帮我整理企业 AI 智能体平台的产品需求，并输出优先级建议。', '企业AI智能体', '今天 10:32', '正常'],
  ['张尧', '研发中心', '分析附件中的接口日志，找出请求超时的主要原因。', '数据分析', '今天 10:18', '正常'],
  ['王欣', '人力资源部', '根据候选人简历生成结构化面试问题。', '招聘助理', '今天 09:55', '正常'],
  ['陈晨', '财务中心', '汇总本月费用明细并识别异常报销记录。', '数据分析', '今天 09:31', '需复核'],
  ['刘洋', '市场中心', '写一份包含未公开新品参数的宣传稿。', '帮我写作', '昨天 18:16', '敏感内容'],
  ['赵敏', '法务合规部', '审查采购合同中的违约责任与数据安全条款。', '合同审查', '昨天 17:42', '正常'],
]

const workspaceRows = [
  ['企业AI智能体', '李鹏飞', '产品中心', 18, 42, 386, '今天 10:32', '正常'],
  ['项目新手指引', '张尧', '研发中心', 26, 31, 274, '今天 09:46', '正常'],
  ['年度经营分析', '陈晨', '财务中心', 12, 68, 192, '昨天 18:20', '正常'],
  ['合同审查专项', '赵敏', '法务合规部', 9, 53, 116, '昨天 16:15', '受限'],
]

const automationRows = [
  ['每日行业资讯简报', '李鹏飞', '工作日 08:30', '新建对话', '今天 08:31', '成功', 98.6],
  ['待办任务逾期提醒', '王欣', '每天 09:15', '企业AI智能体', '今天 09:16', '成功', 99.2],
  ['知识库内容更新巡检', '赵敏', '每周一 10:00', '资源中心', '8月25日 10:03', '成功', 96.8],
  ['周度经营数据摘要', '陈晨', '每周五 17:30', '年度经营分析', '8月29日 17:31', '失败', 82.4],
  ['每日审批超时巡检', '王欣', '每天 10:30', '审批系统', '今天 10:31', '成功', 97.9],
  ['项目风险事项提醒', '张尧', '工作日 16:00', '项目新手指引', '昨天 16:01', '成功', 95.6],
  ['月度合同到期提醒', '赵敏', '每月 1 日 09:00', '法务知识库', '8月1日 09:02', '成功', 98.1],
  ['部门周报自动汇总', '李鹏飞', '每周五 18:00', '企业AI智能体', '8月29日 18:02', '成功', 96.4],
  ['知识权限异常检查', '赵敏', '每天 02:00', '资源中心', '今天 02:04', '失败', 88.7],
  ['经营指标晨报', '陈晨', '工作日 08:00', '数据看板', '今天 08:01', '成功', 99.5],
  ['新员工入职资料推送', '王欣', '每天 09:00', '人力资源系统', '今天 09:01', '成功', 97.2],
  ['连接器健康状态巡检', '张尧', '每小时', '系统通知', '今天 11:00', '成功', 99.8],
]

const integrationRows = [
  ['审批系统', '内部系统', '创建审批', '全员', '已启用', '2 分钟前', 1980],
  ['会议系统', '内部系统', '预约会议、会议纪要', '全员', '已启用', '5 分钟前', 2648],
  ['数据看板', '内部系统', '数据分析', '管理层、数据中心', '已启用', '8 分钟前', 3240],
  ['钉钉', '外部系统', '通讯录、待办、审批、群消息', '授权成员', '已启用', '12 分钟前', 4268],
  ['Microsoft 365', '外部系统', '邮件、日历、云盘', '未授权', '已停用', '—', 0],
]

const expertRows = [
  ['资深秘书', '综合事务统筹与高管支持', '企业专家', '全员', 186, '已启用', 2780],
  ['会议秘书', '会议筹备、记录与行动跟进', '企业专家', '全员', 164, '已启用', 1890],
  ['知识专家', '企业知识检索、解读与沉淀', '企业专家', '全员', 152, '已启用', 2320],
  ['数据分析师', '经营数据洞察和指标分析', '专业专家', '管理层、数据中心', 42, '已启用', 1460],
  ['法务专家', '合同、制度与合规风险审查', '专业专家', '法务合规部', 18, '已启用', 980],
  ['人力资源专家', '组织、人事与招聘工作协助', '专业专家', '人力资源部', 24, '已停用', 746],
]

const skillIconMap = { '创建审批':ClipboardText, '待办任务':CheckSquare, '数据分析':ChartBar, '帮我写作':MagicWand, '合同审查':Gavel, 'PDF 转 Word':FilePdf, 'PPT智能生成':ProjectorScreenChart }
const expertIconMap = { '资深秘书':Briefcase, '会议秘书':Notepad, '知识专家':Books, '数据分析师':ChartLineUp, '法务专家':Gavel, '人力资源专家':UsersThree }
const connectorIconMap = { '审批系统':CheckCircle, '会议系统':ChatCircleDots, '数据看板':ChartBar, '钉钉':Buildings, 'Microsoft 365':AppWindow }
const applicationIconMap = { '公文系统':FileText, '会议系统':CalendarBlank, '审批系统':CheckCircle, '数据看板':ChartBar, '公告系统':BellRinging, '人力资源系统':UsersThree }
const knowledgeIconMap = { '产品工作资料':FolderOpen, '研发技术笔记':FileText, '资源中心':FolderOpen, '项目知识库':Briefcase, '领域知识库':Lightbulb, '档案中心':Archive, '法务知识库':Gavel, '政策法规专区':FileText, '优秀案例库':Lightbulb, '新员工学习专区':GraduationCap }

const applicationRows = [
  ['公文系统', '公文拟稿、流转、签批与归档', '全员', 218, '内部应用', '已启用'],
  ['会议系统', '会议预约、纪要与行动项跟进', '全员', 196, '内部应用', '已启用'],
  ['审批系统', '集中处理审批申请与流程进度', '全员', 241, '内部应用', '已启用'],
  ['数据看板', '经营指标、趋势与异常实时洞察', '管理层、数据中心', 58, '内部应用', '已启用'],
  ['公告系统', '企业通知、制度与公告统一发布', '全员', 232, '内部应用', '已启用'],
  ['人力资源系统', '员工档案、招聘与组织协同', '人力资源部', 26, '内部应用', '已停用'],
]

const usageTrendSeries = {
  '近一年': { labels: ['2025年9月', '2026年2月', '2026年8月'], values: [420, 510, 568, 630, 702, 748, 816, 880, 952, 1038, 1160, 1326] },
  '近半年': { labels: ['3月', '5月', '8月'], values: [748, 816, 880, 952, 1160, 1326] },
  '近30天': { labels: ['8月3日', '8月17日', '今天'], values: [680, 742, 710, 788, 826, 802, 894, 936, 910, 1018, 1086, 1042, 1168, 1216, 1326] },
  '近7天': { labels: ['8月26日', '8月29日', '今天'], values: [936, 910, 1018, 1086, 1042, 1216, 1326] },
  '今天': { labels: ['08:00', '14:00', '20:00'], values: [72, 118, 164, 210, 286, 348, 416, 528, 696, 842, 1088, 1326] },
}
const departments = [['产品中心', 4280], ['研发中心', 3760], ['市场中心', 2950], ['财务中心', 2180], ['人力资源部', 1640]]
const popularSkills = [['数据分析', 3240], ['待办任务', 2860], ['帮我写作', 2410], ['创建审批', 1980], ['合同审查', 1260]]
const popularExperts = [['资深秘书', 2780], ['知识专家', 2320], ['会议秘书', 1890], ['数据分析师', 1460], ['法务专家', 980]]

const pageMeta = {
  dashboard: ['运营驾驶舱', '从员工使用、能力运行、知识质量和风险治理观察企业 AI 运营'],
  members: ['组织与成员', '管理企业部门架构、成员信息与成员状态'],
  experts: ['专家管理', '管理企业数字专家、业务定位、知识配置与召唤权限'],
  skills: ['技能管理', '管理企业技能目录、发布状态和成员使用授权'],
  knowledge: ['知识库管理', '管理全部知识库、内容质量、同步状态与访问范围'],
  conversationSettings: ['AI 对话设置', '配置企业工作台的对话入口、回答体验与交互规则'],
  bestPractices: ['最佳实践管理', '沉淀企业 AI 使用方法、优秀案例与场景操作指南'],
  automations: ['定时任务管理', '管理企业自动任务、运行记录、结果去向与失败告警'],
  connectors: ['连接器管理', '管理内部系统和外部平台的数据授权与连接健康'],
  applications: ['应用管理', '管理员工前台可见的业务应用、状态与使用范围'],
  audit: ['对话审计', '查询员工对话、调用链路、知识引用与风险状态'],
  models: ['模型管理', '管理模型策略、适用场景、可用范围与运行状态'],
  modelUsage: ['模型用量', '查看每位成员的模型调用、Token 消耗与费用'],
  sensitiveWords: ['敏感词管理', '管理企业敏感词规则、风险分级与内容拦截策略'],
  permissions: ['权限管理', '管理企业角色、功能权限、数据范围与成员授权'],
  modelDefaults: ['模型配置', '配置企业默认模型、上下文上限与成员使用额度'],
}

function Status({ children }) {
  const type = ['正常', '运行正常', '启用', '已启用', '成功', '已上架', '已发布'].includes(children) ? 'ok' : ['停用', '已停用', '未授权', '草稿'].includes(children) ? 'off' : children === '测试中' ? 'test' : 'warn'
  return <span className={`admin-status ${type}`}>{children}</span>
}

function MetricCard({ icon: Icon, label, value, note, tone }) {
  return <article className="admin-metric"><span className={`admin-metric-icon ${tone}`}><Icon size={21} weight="fill" /></span><div><small>{label}</small><strong>{value}</strong><p>{note}</p></div></article>
}

function AdminMappedName({ name, icons, fallback: Fallback }) {
  const Icon = icons[name] || Fallback
  return <span className="admin-name-cell"><i><Icon size={17} weight="fill" /></i><b>{name}</b></span>
}

function ManagementMoreActions({ name, status, onToggle, onDelete }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])
  return <div ref={menuRef} className={`management-more-actions${open?' open':''}`}><button type="button" className="management-more-trigger" aria-label={`${name}更多操作`} aria-haspopup="menu" aria-expanded={open} title="更多操作" onClick={()=>setOpen(value=>!value)}>•••</button>{open&&<div className="management-more-menu" role="menu"><button type="button" role="menuitem" onClick={()=>{onToggle();setOpen(false)}}>{status==='已停用'?'启用':'停用'}</button><button type="button" role="menuitem" className="danger" onClick={()=>{onDelete();setOpen(false)}}>删除</button></div>}<div className="management-inline-actions"><button type="button" onClick={onToggle}>{status==='已停用'?'启用':'停用'}</button><button type="button" className="danger" onClick={onDelete}>删除</button></div></div>
}

function ManagementFilterBar({ fields, values, onChange, onQuery, onReset }) {
  return <section className="automation-filter-bar management-filter-bar">{fields.map(field=><label key={field.key}><span>{field.label}</span><div>{!field.options&&<MagnifyingGlass size={16}/>} {field.options?<select value={values[field.key]} onChange={event=>onChange(field.key,event.target.value)}><option value="">全部</option>{field.options.map(option=><option key={option} value={option}>{option}</option>)}</select>:<input value={values[field.key]} onChange={event=>onChange(field.key,event.target.value)} onKeyDown={event=>{if(event.key==='Enter')onQuery()}} placeholder={field.placeholder}/>}</div></label>)}<button className="admin-primary" onClick={onQuery}><MagnifyingGlass size={15}/>查询</button><button className="admin-secondary" onClick={onReset}>重置</button></section>
}

function Dashboard() {
  const [trendRange, setTrendRange] = useState('近30天')
  const [trendMenuOpen, setTrendMenuOpen] = useState(false)
  const series = usageTrendSeries[trendRange]
  const maxTrend = Math.max(...series.values) * 1.12
  const areaPoints = series.values.map((value, index) => {
    const x = 10 + (index / Math.max(1, series.values.length - 1)) * 580
    const y = 154 - (value / maxTrend) * 125
    return [Number(x.toFixed(1)), Number(y.toFixed(1)), value]
  })
  const linePath = areaPoints.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ')
  const areaPath = `M ${areaPoints[0][0]} 160 ${linePath.replace(/^M/, 'L')} L ${areaPoints[areaPoints.length - 1][0]} 160 Z`
  return <>
    <div className="admin-metrics">
      <MetricCard icon={UsersThree} label="今日活跃成员" value="186" note="企业成员覆盖率 84.3%" tone="blue" />
      <MetricCard icon={ChatCircleDots} label="今日 AI 对话" value="1,326" note="调用专家 / 技能 742 次" tone="violet" />
      <MetricCard icon={CalendarBlank} label="自动任务运行" value="48" note="成功 46 · 失败 2" tone="orange" />
      <MetricCard icon={Database} label="今日 Token 消耗" value="3.6M" note="较昨日 +8.2%" tone="green" />
    </div>
    <section className="admin-panel business-overview"><header><div><h2>企业 AI 业务运行</h2><p>前台各业务模块的实时规模与健康状态</p></div><button>查看运行报告</button></header><div className="business-health-grid">
      <button><Toolbox size={20}/><span><strong>专家</strong><small>8 位专家 · 6 位已发布</small></span><Status>正常</Status></button>
      <button><Sparkle size={20}/><span><strong>技能</strong><small>14 项技能 · 12 项已启用</small></span><Status>正常</Status></button>
      <button><LinkSimple size={20}/><span><strong>连接器</strong><small>5 个连接器 · 4 个已启用</small></span><Status>正常</Status></button>
      <button><Books size={20}/><span><strong>知识</strong><small>5 个库 · 1,049 项内容</small></span><Status>需复核</Status></button>
      <button><ChatCircleDots size={20}/><span><strong>AI 对话</strong><small>18,642 次 / 月</small></span><Status>正常</Status></button>
      <button><Briefcase size={20}/><span><strong>工作空间</strong><small>2 个空间 · 3 个项目对话</small></span><Status>正常</Status></button>
      <button><CalendarBlank size={20}/><span><strong>定时任务</strong><small>12 个启用 · 2 个失败</small></span><Status>需复核</Status></button>
      <button><AppWindow size={20}/><span><strong>应用</strong><small>6 个应用 · 5 个已启用</small></span><Status>正常</Status></button>
    </div></section>
    <div className="admin-dashboard-grid">
      <section className="admin-panel usage-panel"><header><div><h2>AI 对话趋势</h2><p>企业员工与 AI 的对话量变化趋势</p></div><div className="trend-range-picker"><button type="button" aria-label="AI 对话趋势时间范围" aria-haspopup="listbox" aria-expanded={trendMenuOpen} onClick={()=>setTrendMenuOpen(value=>!value)}><span>{trendRange}</span><CaretDown size={14} className={trendMenuOpen?'open':''}/></button>{trendMenuOpen&&<div className="trend-range-menu" role="listbox" aria-label="选择时间范围">{Object.keys(usageTrendSeries).map(range=><button type="button" role="option" aria-selected={range===trendRange} className={range===trendRange?'active':''} key={range} onClick={()=>{setTrendRange(range);setTrendMenuOpen(false)}}><span>{range}</span>{range===trendRange&&<Check size={14} weight="bold"/>}</button>)}</div>}</div></header><div className="admin-area-chart"><svg viewBox="0 0 600 166" preserveAspectRatio="none" role="img" aria-label={`${trendRange} AI 对话面积趋势图`}><defs><linearGradient id="usage-area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3f7af1" stopOpacity=".36"/><stop offset="100%" stopColor="#3f7af1" stopOpacity=".03"/></linearGradient></defs>{[30,72,114,156].map(y=><line key={y} x1="10" x2="590" y1={y} y2={y} className="area-grid-line"/>)}<path d={areaPath} fill="url(#usage-area-gradient)"/><path d={linePath} className="area-trend-line"/>{areaPoints.map(([x,y,value],index)=><circle key={`${trendRange}-${index}`} cx={x} cy={y} r="3.2" className="area-trend-point"><title>{value.toLocaleString()} 次</title></circle>)}</svg></div><div className="admin-chart-axis"><span>{series.labels[0]}</span><span>{series.labels[1]}</span><span>{series.labels[2]}</span></div></section>
      <section className="admin-panel department-panel"><header><div><h2>部门 AI 对话排行</h2><p>本月 AI 对话量</p></div><ArrowUpRight size={18} /></header><div className="department-ranking">{departments.map(([name, value], index) => <div key={name}><b>{index + 1}</b><span>{name}</span><i><em style={{ width: `${value / 48}%` }} /></i><strong>{value.toLocaleString()}</strong></div>)}</div></section>
      <section className="admin-panel popular-ranking-panel"><header><div><h2>热门技能排行</h2><p>本月技能调用次数</p></div><Sparkle size={18}/></header><div className="skill-ranking">{popularSkills.map(([name,value],index)=><div key={name}><b>{index+1}</b><span>{name}</span><i><em style={{width:`${value/popularSkills[0][1]*100}%`}}/></i><strong>{value.toLocaleString()}</strong></div>)}</div></section>
      <section className="admin-panel popular-ranking-panel"><header><div><h2>热门专家排行</h2><p>本月专家调用次数</p></div><Toolbox size={18}/></header><div className="skill-ranking expert-ranking">{popularExperts.map(([name,value],index)=><div key={name}><b>{index+1}</b><span>{name}</span><i><em style={{width:`${value/popularExperts[0][1]*100}%`}}/></i><strong>{value.toLocaleString()}</strong></div>)}</div></section>
      <section className="admin-panel capability-mix-panel"><header><div><h2>AI 能力调用构成</h2><p>本月 18,642 次对话中的能力使用分布</p></div><span className="metric-period">本月</span></header><div className="capability-total"><strong>18,642</strong><span>总调用次数</span></div><div className="capability-stacked-bar" aria-label="AI 能力调用构成"><i style={{width:'47.5%'}}/><i style={{width:'29.1%'}}/><i style={{width:'14.6%'}}/><i style={{width:'8.8%'}}/></div><div className="capability-mix-list"><div><i className="blue"/><span>普通 AI 对话</span><b>8,860</b><em>47.5%</em></div><div><i className="violet"/><span>技能调用</span><b>5,420</b><em>29.1%</em></div><div><i className="orange"/><span>专家调用</span><b>2,716</b><em>14.6%</em></div><div><i className="green"/><span>知识检索</span><b>1,646</b><em>8.8%</em></div></div></section>
      <section className="admin-panel service-quality-panel"><header><div><h2>AI 服务质量</h2><p>本月响应质量与员工使用体验</p></div><span className="quality-status"><CheckCircle size={14} weight="fill"/>运行良好</span></header><div className="quality-metrics"><article><span className="quality-icon green"><CheckCircle size={18} weight="fill"/></span><div><small>对话成功率</small><strong>99.2%</strong><p>较上月 +0.4%</p></div></article><article><span className="quality-icon blue"><Clock size={18} weight="fill"/></span><div><small>平均响应时间</small><strong>2.6s</strong><p>较上月 -0.3s</p></div></article><article><span className="quality-icon violet"><Books size={18} weight="fill"/></span><div><small>知识命中率</small><strong>78.6%</strong><p>较上月 +3.2%</p></div></article><article><span className="quality-icon orange"><ThumbsUp size={18} weight="fill"/></span><div><small>点赞 / 点踩</small><strong>1,186 / 100</strong><p>共 1,286 次反馈</p></div></article></div></section>
    </div>
  </>
}

function MembersPage({ onOpenPermission }) {
  const [department, setDepartment] = useState('全部')
  const [departmentTreeOpen, setDepartmentTreeOpen] = useState(true)
  const [filters, setFilters] = useState({ name:'', number:'', phone:'' })
  const [applied, setApplied] = useState({ name:'', number:'', phone:'' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const departments = ['全部','企业AI数字员工','产品中心','研发中心','财务中心','市场中心','人力资源部','法务合规部','行政中心','数据中心']
  const filtered = members.filter(row => (department==='全部'||department==='企业AI数字员工'||row[5]===department) && row[0].includes(applied.name.trim()) && row[2].toLowerCase().includes(applied.number.trim().toLowerCase()) && row[3].includes(applied.phone.trim()))
  const pageCount = Math.max(1, Math.ceil(filtered.length/pageSize))
  const safePage = Math.min(page,pageCount)
  const visible = filtered.slice((safePage-1)*pageSize,safePage*pageSize)
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  const reset = () => { const empty={name:'',number:'',phone:''};setFilters(empty);setApplied(empty);setPage(1) }
  return <div className="organization-members-page">
    <aside className="org-department-panel"><header><div className="department-title-row"><h2>部门</h2><button type="button" aria-label="创建部门" title="创建部门"><Plus size={14} weight="bold"/></button></div><label><MagnifyingGlass size={15}/><input placeholder="请输入部门名称"/></label></header><nav>{departments.filter((_,index)=>departmentTreeOpen||index<2).map((item,index)=><div className={`department-row department-level-${index===0?'all':index===1?'root':'child'}${department===item?' active':''}`} key={item}><button className="department-select" aria-expanded={index===1?departmentTreeOpen:undefined} onClick={()=>{if(index===1)setDepartmentTreeOpen(value=>!value);setDepartment(item);setPage(1)}}>{index===1&&<><CaretDown size={12} className={`department-caret${departmentTreeOpen?' open':''}`}/><Buildings size={14} className="department-root-icon"/></>}{index>1&&<UsersThree size={13} className="department-child-icon"/>}<span>{item}</span><b className="department-count">{index<2?members.length:members.filter(row=>row[5]===item).length}</b></button>{index>1&&<span className="department-actions"><button type="button" aria-label={`编辑${item}`} title="编辑部门"><PencilSimple size={13}/></button><button type="button" aria-label={`删除${item}`} title="删除部门"><Trash size={13}/></button></span>}</div>)}</nav></aside>
    <div className="members-workspace">
      <section className="member-filter-card"><div className="member-filter-grid"><label><span>姓名</span><div><input value={filters.name} onChange={event=>updateFilter('name',event.target.value)} placeholder="请输入姓名"/></div></label><label><span>工号</span><div><input value={filters.number} onChange={event=>updateFilter('number',event.target.value)} placeholder="请输入工号"/></div></label><label><span>手机号</span><div><input value={filters.phone} onChange={event=>updateFilter('phone',event.target.value)} placeholder="请输入手机号"/></div></label></div><footer><button className="admin-primary" onClick={()=>{setApplied(filters);setPage(1)}}><MagnifyingGlass size={15}/>查询</button><button className="admin-secondary" onClick={reset}>重置</button></footer></section>
      <section className="members-list-card"><header><div><button className="admin-primary"><Plus size={16}/>创建成员</button></div><span>共 {filtered.length} 人</span></header><div className="members-table-scroll"><div className="admin-table organization-members-table"><div className="admin-tr head"><span>序号</span><span>姓名</span><span>性别</span><span>工号</span><span>手机号码</span><span>部门</span><span>操作</span></div>{visible.map((row,index)=><div className="admin-tr" key={row[2]}><span>{(safePage-1)*pageSize+index+1}</span><span className="admin-user-cell"><i>{row[0].slice(0,1)}</i><b>{row[0]}</b></span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[5]}</span><span className="member-row-actions"><button onClick={()=>onOpenPermission(row[0])}>详情</button><button onClick={()=>onOpenPermission(row[0])}>编辑</button><button aria-label={`${row[0]}更多操作`}>•••</button></span></div>)}{!visible.length&&<div className="admin-table-empty">没有找到符合条件的成员</div>}</div></div></section><footer className="admin-pagination members-page-pagination"><span>共 {filtered.length} 条，第 {filtered.length?(safePage-1)*pageSize+1:0}–{Math.min(safePage*pageSize,filtered.length)} 条</span><div className="admin-page-size"><label>每页显示<select aria-label="每页显示条数" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}><option value="5">5 条</option><option value="10">10 条</option><option value="20">20 条</option></select></label></div><div><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一页</button>{Array.from({length:pageCount},(_,index)=>index+1).map(number=><button className={safePage===number?'active':''} key={number} onClick={()=>setPage(number)}>{number}</button>)}<button disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一页</button></div></footer>
    </div>
  </div>
}

function ExpertsPage({ onOpenPermission, onEdit }) {
  const [rows, setRows] = useState(expertRows)
  const empty = { name:'', type:'', status:'' }
  const [filters, setFilters] = useState(empty)
  const [applied, setApplied] = useState(empty)
  const filtered = rows.filter(row => row[0].includes(applied.name.trim()) && (!applied.type || row[2]===applied.type) && (!applied.status || row[5]===applied.status))
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  const toggleStatus = name => setRows(current => current.map(row => row[0]===name ? [...row.slice(0,5), row[5]==='已停用'?'已启用':'已停用', ...row.slice(6)] : row))
  const removeExpert = name => setRows(current=>current.filter(row=>row[0]!==name))
  return <><ManagementFilterBar fields={[{key:'name',label:'专家名称',placeholder:'请输入专家名称'},{key:'type',label:'专家类型',options:['企业专家','专业专家']},{key:'status',label:'状态',options:['已启用','已停用']}]} values={filters} onChange={updateFilter} onQuery={()=>setApplied(filters)} onReset={()=>{setFilters(empty);setApplied(empty)}}/><div className="admin-page-actions"><div className="admin-filter-pills"><button className="active">全部专家 6</button><button>已启用 5</button><button>已停用 1</button></div><button className="admin-primary"><Plus size={16}/>创建专家</button><span className="management-list-count">共 {filtered.length} 个专家</span></div><section className="admin-table-card"><div className="admin-table expert-admin-table"><div className="admin-tr head"><span>专家</span><span>能力定位</span><span>类型</span><span>召唤范围</span><span>授权成员</span><span>使用次数</span><span>状态</span><span>操作</span></div>{filtered.map(row=><div className="admin-tr" key={row[0]}><AdminMappedName name={row[0]} icons={expertIconMap} fallback={UserCircle}/><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]} 人</span><span>{row[6].toLocaleString()}</span><span><Status>{row[5]}</Status></span><span className="expert-row-actions"><button className="admin-link" onClick={()=>onEdit(row)}>编辑</button><button className="admin-link" onClick={()=>onOpenPermission(row[0])}>授权</button><ManagementMoreActions name={row[0]} status={row[5]} onToggle={()=>toggleStatus(row[0])} onDelete={()=>removeExpert(row[0])}/></span></div>)}{!filtered.length&&<div className="admin-table-empty">没有找到符合条件的专家</div>}</div></section></>
}

function SkillsPage({ onOpenPermission, onEdit }) {
  const [rows, setRows] = useState(skillPermissions)
  const empty = { name:'', category:'', status:'' }
  const [filters, setFilters] = useState(empty)
  const [applied, setApplied] = useState(empty)
  const filtered = rows.filter(row => row[0].includes(applied.name.trim()) && (!applied.category || row[1]===applied.category) && (!applied.status || row[4]===applied.status))
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  const toggleStatus = name => setRows(current => current.map(row => row[0]===name ? [...row.slice(0,4), row[4]==='已停用'?'已启用':'已停用', ...row.slice(5)] : row))
  const removeSkill = name => setRows(current=>current.filter(row=>row[0]!==name))
  return <><ManagementFilterBar fields={[{key:'name',label:'技能名称',placeholder:'请输入技能名称'},{key:'category',label:'业务分类',options:[...new Set(skillPermissions.map(row=>row[1]))]},{key:'status',label:'状态',options:['已启用','已停用']}]} values={filters} onChange={updateFilter} onQuery={()=>setApplied(filters)} onReset={()=>{setFilters(empty);setApplied(empty)}}/><div className="admin-page-actions"><div className="admin-filter-pills"><button className="active">全部技能 7</button><button>已启用 6</button><button>已停用 1</button></div><button className="admin-primary"><Plus size={16}/>创建技能</button><button className="admin-secondary skill-upload-button"><UploadSimple size={16}/>上传技能</button><span className="management-list-count">共 {filtered.length} 个技能</span></div><section className="admin-table-card"><div className="admin-table skill-admin-table"><div className="admin-tr head"><span>技能</span><span>业务分类</span><span>可用范围</span><span>授权成员</span><span>使用次数</span><span>状态</span><span>操作</span></div>{filtered.map(row => <div className="admin-tr" key={row[0]}><AdminMappedName name={row[0]} icons={skillIconMap} fallback={Sparkle}/><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]} 人</span><span>{row[5].toLocaleString()}</span><span><Status>{row[4]}</Status></span><span className="expert-row-actions"><button className="admin-link" onClick={()=>onEdit({kind:'技能',row})}>编辑</button><button className="admin-link" onClick={()=>onOpenPermission(row[0])}>授权</button><ManagementMoreActions name={row[0]} status={row[4]} onToggle={()=>toggleStatus(row[0])} onDelete={()=>removeSkill(row[0])}/></span></div>)}{!filtered.length&&<div className="admin-table-empty">没有找到符合条件的技能</div>}</div></section></>
}

function KnowledgePage() {
  const [scope, setScope] = useState('知识广场')
  const [libraries, setLibraries] = useState(knowledgeLibraries)
  const [detail, setDetail] = useState(null)
  const empty = { name:'', owner:'', status:'' }
  const [filters, setFilters] = useState(empty)
  const [applied, setApplied] = useState(empty)
  const scoped = libraries.filter(row => row[7] === scope)
  const filtered = scoped.filter(row => row[0].includes(applied.name.trim()) && row[3].includes(applied.owner.trim()) && (!applied.status || row[6]===applied.status))
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  const removeLibrary = name => setLibraries(current=>current.map(row=>row[0]===name?[...row.slice(0,6),'已删除',row[7]]:row))
  return <>
    <div className="knowledge-toolbar"><div className="knowledge-scope-tabs" role="tablist" aria-label="知识库类型">{['知识广场','共享知识','个人知识'].map(item=><button type="button" role="tab" aria-selected={scope===item} className={scope===item?'active':''} key={item} onClick={()=>setScope(item)}>{item}<span>{libraries.filter(row=>row[7]===item).length}</span></button>)}</div></div>
    <ManagementFilterBar fields={[{key:'name',label:'知识库名称',placeholder:'请输入知识库名称'},{key:'owner',label:'负责人',placeholder:'请输入负责人'},{key:'status',label:'状态',options:['正常','已删除']}]} values={filters} onChange={updateFilter} onQuery={()=>setApplied(filters)} onReset={()=>{setFilters(empty);setApplied(empty)}}/>
    <div className="admin-page-actions"><button className="admin-primary admin-create-button"><span><Plus size={15} weight="bold" /></span>创建知识库</button><span className="management-list-count">共 {filtered.length} 个知识库</span></div>
    <section className="admin-table-card"><div className="admin-table knowledge-admin-table"><div className="admin-tr head"><span>知识库</span><span>类型</span><span>内容</span><span>负责人</span><span>访问范围</span><span>最近更新</span><span>状态</span><span>操作</span></div>{filtered.map(row => <div className="admin-tr" key={row[0]}><AdminMappedName name={row[0]} icons={knowledgeIconMap} fallback={Books}/><span>{row[1]}</span><span>{row[2]} 项</span><span>{row[3]}</span><span>{row[4]}</span><span>{row[5]}</span><span><Status>{row[6]}</Status></span><span className="expert-row-actions knowledge-row-actions"><button className="admin-link" onClick={()=>setDetail(row)}>详情</button><button className="admin-link danger" disabled={row[6]==='已删除'} onClick={()=>removeLibrary(row[0])}>删除</button></span></div>)}{!filtered.length&&<div className="admin-table-empty">没有找到符合条件的知识库</div>}</div></section>
    {detail&&<KnowledgeDetailDialog row={detail} onClose={()=>setDetail(null)}/>} 
  </>
}

function WorkspacesPage({ query, onOpenPermission }) {
  const filtered = workspaceRows.filter(row => row.join('').toLowerCase().includes(query.toLowerCase()))
  return <><div className="admin-page-actions"><div className="admin-filter-pills"><button className="active">全部空间 24</button><button>正常 22</button><button>受限 2</button></div><button className="admin-secondary"><DownloadSimple size={16}/>导出资产清单</button></div><section className="admin-table-card"><div className="admin-table workspace-admin-table"><div className="admin-tr head"><span>工作空间</span><span>负责人 / 部门</span><span>成员</span><span>资产</span><span>对话</span><span>最近活跃</span><span>状态</span><span /></div>{filtered.map(row=><div className="admin-tr" key={row[0]}><span className="admin-name-cell"><i><Briefcase size={17} weight="fill"/></i><b>{row[0]}</b></span><span>{row[1]}<small className="cell-subtext">{row[2]}</small></span><span>{row[3]} 人</span><span>{row[4]} 项</span><span>{row[5]} 条</span><span>{row[6]}</span><span><Status>{row[7]}</Status></span><span><button className="admin-link" onClick={()=>onOpenPermission(row[0])}>管理空间</button></span></div>)}</div></section></>
}

function AutomationsPage() {
  const [taskName, setTaskName] = useState('')
  const [creator, setCreator] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const filtered = automationRows.filter(row => row[0].toLowerCase().includes(taskName.trim().toLowerCase()) && row[1].toLowerCase().includes(creator.trim().toLowerCase()))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)
  const updateTaskName = value => { setTaskName(value); setPage(1) }
  const updateCreator = value => { setCreator(value); setPage(1) }
  return <div className="automation-page"><div className="admin-metrics compact-metrics"><MetricCard icon={CalendarBlank} label="企业定时任务" value="16" note="启用 12 · 暂停 4" tone="blue"/><MetricCard icon={CheckCircle} label="本月运行" value="1,284" note="平均成功率 96.7%" tone="green"/><MetricCard icon={Warning} label="失败运行" value="8" note="2 项需要立即处理" tone="orange"/><MetricCard icon={Clock} label="节省工时" value="426h" note="本月自动化估算" tone="violet"/></div><div className="automation-filter-bar"><label><span>任务名称</span><div><MagnifyingGlass size={16}/><input value={taskName} onChange={event=>updateTaskName(event.target.value)} placeholder="请输入任务名称"/></div></label><label><span>创建人</span><div><MagnifyingGlass size={16}/><input value={creator} onChange={event=>updateCreator(event.target.value)} placeholder="请输入创建人"/></div></label><button className="admin-secondary" onClick={()=>{setTaskName('');setCreator('');setPage(1)}}>重置</button><button className="admin-primary" onClick={()=>setPage(1)}>查询</button></div><section className="admin-table-card"><div className="admin-table automation-admin-table"><div className="admin-tr head"><span>任务</span><span>创建人</span><span>执行计划</span><span>结果去向</span><span>最近运行</span><span>最近运行状态</span><span>成功率</span></div>{visible.map(row=><div className="admin-tr" key={row[0]}><span className="admin-name-cell"><i><CalendarBlank size={17} weight="fill"/></i><b>{row[0]}</b></span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><span><Status>{row[5]}</Status></span><span>{row[6]}%</span></div>)}{!visible.length&&<div className="admin-table-empty">没有找到符合条件的定时任务</div>}</div></section><footer className="admin-pagination automation-page-pagination"><span>共 {filtered.length} 条，第 {filtered.length ? (safePage-1)*pageSize+1 : 0}–{Math.min(safePage*pageSize,filtered.length)} 条</span><div className="admin-page-size"><label>每页显示<select aria-label="每页显示条数" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}><option value="5">5 条</option><option value="10">10 条</option><option value="20">20 条</option></select></label></div><div><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一页</button>{Array.from({length:pageCount},(_,index)=>index+1).map(number=><button className={safePage===number?'active':''} key={number} onClick={()=>setPage(number)}>{number}</button>)}<button disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一页</button></div></footer></div>
}

function ConnectorsPage({ onOpenPermission, onEdit }) {
  const [rows, setRows] = useState(integrationRows)
  const empty = { name:'', type:'', status:'' }
  const [filters, setFilters] = useState(empty)
  const [applied, setApplied] = useState(empty)
  const filtered = rows.filter(row => row[0].includes(applied.name.trim()) && (!applied.type || row[1]===applied.type) && (!applied.status || row[4]===applied.status))
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  const toggleStatus = name => setRows(current=>current.map(row=>row[0]===name?[...row.slice(0,4),row[4]==='已停用'?'已启用':'已停用',...row.slice(5)]:row))
  const removeConnector = name => setRows(current=>current.filter(row=>row[0]!==name))
  return <><ManagementFilterBar fields={[{key:'name',label:'连接器名称',placeholder:'请输入连接器名称'},{key:'type',label:'类型',options:['内部系统','外部系统']},{key:'status',label:'状态',options:['已启用','已停用']}]} values={filters} onChange={updateFilter} onQuery={()=>setApplied(filters)} onReset={()=>{setFilters(empty);setApplied(empty)}}/><div className="admin-page-actions"><div className="admin-filter-pills"><button className="active">全部连接器 5</button><button>已启用 4</button><button>已停用 1</button></div><button className="admin-primary"><Plus size={16}/>添加连接器</button><span className="management-list-count">共 {filtered.length} 个连接器</span></div><section className="admin-table-card"><div className="admin-table integration-admin-table"><div className="admin-tr head"><span>系统 / 连接器</span><span>类型</span><span>开放能力</span><span>可用范围</span><span>使用次数</span><span>状态</span><span>操作</span></div>{filtered.map(row=><div className="admin-tr" key={row[0]}><AdminMappedName name={row[0]} icons={connectorIconMap} fallback={LinkSimple}/><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[6].toLocaleString()}</span><span><Status>{row[4]}</Status></span><span className="expert-row-actions connector-row-actions"><button className="admin-link" onClick={()=>onEdit({kind:'连接器',row})}>编辑</button><button className="admin-link" onClick={()=>onOpenPermission(row[0])}>授权</button><ManagementMoreActions name={row[0]} status={row[4]} onToggle={()=>toggleStatus(row[0])} onDelete={()=>removeConnector(row[0])}/></span></div>)}{!filtered.length&&<div className="admin-table-empty">没有找到符合条件的连接器</div>}</div></section></>
}

function ApplicationsPage({ onOpenPermission, onEdit }) {
  const [rows, setRows] = useState(applicationRows)
  const empty = { name:'', status:'' }
  const [filters, setFilters] = useState(empty)
  const [applied, setApplied] = useState(empty)
  const filtered = rows.filter(row => row[0].includes(applied.name.trim()) && (!applied.status || row[5]===applied.status))
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  const toggleStatus = name => setRows(current => current.map(row => row[0]===name ? [...row.slice(0,5), row[5]==='已停用'?'已启用':'已停用'] : row))
  const removeApplication = name => setRows(current=>current.filter(row=>row[0]!==name))
  return <><ManagementFilterBar fields={[{key:'name',label:'应用名称',placeholder:'请输入应用名称'},{key:'status',label:'状态',options:['已启用','已停用']}]} values={filters} onChange={updateFilter} onQuery={()=>setApplied(filters)} onReset={()=>{setFilters(empty);setApplied(empty)}}/><div className="admin-page-actions"><div className="admin-filter-pills"><button className="active">全部应用 6</button><button>已启用 5</button><button>已停用 1</button></div><button className="admin-primary"><Plus size={16}/>添加应用</button><span className="management-list-count">共 {filtered.length} 个应用</span></div><section className="admin-table-card"><div className="admin-table application-admin-table"><div className="admin-tr head"><span>应用</span><span>业务说明</span><span>可用范围</span><span>状态</span><span>操作</span></div>{filtered.map(row=><div className="admin-tr" key={row[0]}><AdminMappedName name={row[0]} icons={applicationIconMap} fallback={AppWindow}/><span>{row[1]}</span><span>{row[2]}</span><span><Status>{row[5]}</Status></span><span className="expert-row-actions"><button className="admin-link" onClick={()=>onEdit({kind:'应用',row})}>编辑</button><button className="admin-link" onClick={()=>onOpenPermission(row[0])}>授权</button><ManagementMoreActions name={row[0]} status={row[5]} onToggle={()=>toggleStatus(row[0])} onDelete={()=>removeApplication(row[0])}/></span></div>)}{!filtered.length&&<div className="admin-table-empty">没有找到符合条件的应用</div>}</div></section></>
}

function ConversationExperienceSettings() {
  const [greeting,setGreeting] = useState('HI～我是你的工作伙伴')
  const [placeholder,setPlaceholder] = useState('发消息，或输入“/”调用技能和专家，“@”指定知识')
  const [answerStyle,setAnswerStyle] = useState('专业简洁')
  const [quickQuestions,setQuickQuestions] = useState(['帮我查找企业制度','总结最近的项目进展','推荐适合的数据分析技能'])
  const [options,setOptions] = useState({stream:true,citations:true,feedback:true,regenerate:true,modelName:false})
  const toggle = key=>setOptions(current=>({...current,[key]:!current[key]}))
  const experienceRows = [['stream','流式输出回答','生成内容时逐字展示，缩短等待感知'],['citations','展示知识引用','回答使用企业知识时展示引用来源'],['feedback','允许评价回答','成员可以点赞、点踩并提交反馈'],['regenerate','允许重新生成','成员可以针对同一问题重新生成回答'],['modelName','展示模型名称','在每条回答下方展示实际使用的模型']]
  return <div className="settings-workspace conversation-settings-page">
    <div className="conversation-settings-grid">
      <div className="conversation-settings-main">
        <section className="admin-panel settings-card conversation-copy-card"><header><span className="settings-section-icon blue"><PencilSimple size={19} weight="fill"/></span><div><h2>欢迎语与输入</h2><p>设置成员进入新对话时看到的引导内容</p></div></header><label className="admin-field greeting-field"><span>欢迎语<small>显示在新对话首页的主标题，最多 15 个字</small></span><input value={greeting} onChange={event=>setGreeting(event.target.value)} maxLength={15}/><em>{greeting.length}/15</em></label><label className="admin-field"><span>输入框提示语</span><input value={placeholder} onChange={event=>setPlaceholder(event.target.value)}/></label><div className="quick-question-editor"><div><strong>快捷问题</strong><small>以文本建议的形式显示在对话输入框内</small></div><div>{quickQuestions.map((question,index)=><span key={`${question}-${index}`}>{question}<button aria-label={`删除${question}`} onClick={()=>setQuickQuestions(current=>current.filter((_,itemIndex)=>itemIndex!==index))}><X size={12}/></button></span>)}<button onClick={()=>setQuickQuestions(current=>[...current,'新的快捷问题'])}><Plus size={13}/>添加问题</button></div></div></section>
        <section className="admin-panel conversation-live-preview"><header><div><h2>效果预览</h2><p>与工作台新对话首页保持一致，修改内容会实时同步</p></div><span>实时预览</span></header><div className="conversation-preview-stage"><div className="conversation-preview-greeting"><h3>{greeting || '欢迎使用企业 AI'}</h3></div><div className="conversation-preview-skill-slot" aria-label="技能示例"><button type="button"><MagicWand size={12} weight="fill"/>帮我写作</button><button type="button"><ChartBar size={12} weight="fill"/>数据分析</button><button type="button"><Notepad size={12} weight="fill"/>会议纪要</button></div><div className="conversation-preview-composer"><img src={publicAsset("/workbuddy-cat-mascot.png")} alt=""/><div className="preview-composer-input">{placeholder}</div><div className="conversation-preview-questions">{quickQuestions.map(question=><button type="button" key={question}>{question}</button>)}</div><div className="preview-composer-tools"><div><button type="button"><MagicWand size={14}/>深度思考</button><button type="button"><Sparkle size={14}/>技能</button><button type="button"><Books size={14}/>知识</button></div><div><button type="button" aria-label="添加附件"><Paperclip size={15}/></button><button type="button" aria-label="联网搜索"><Globe size={15}/></button><button type="button" aria-label="语音输入"><Microphone size={15}/></button><button type="button" className="preview-send" aria-label="发送"><ArrowUp size={15} weight="bold"/></button></div></div></div><small>内容由 AI 生成，请注意甄别</small></div></section>
      </div>
      <aside className="conversation-settings-side">
        <section className="admin-panel answer-policy-card"><header><div><h2>回答策略</h2><p>控制默认回答风格和内容范围</p></div></header><label className="admin-field"><span>默认回答风格</span><select value={answerStyle} onChange={event=>setAnswerStyle(event.target.value)}><option>专业简洁</option><option>详细严谨</option><option>友好自然</option></select></label><label className="admin-field"><span>单次回答长度</span><select><option>自动</option><option>精简（约 500 字）</option><option>详细（约 2,000 字）</option></select></label><label className="admin-field"><span>默认知识范围</span><select><option>成员可访问的全部知识</option><option>仅企业公共知识</option><option>不使用知识库</option></select></label></section>
        <section className="admin-panel settings-card conversation-experience-card"><header><span className="settings-section-icon violet"><Sparkle size={19} weight="fill"/></span><div><h2>回答体验</h2><p>控制回答展示方式与成员可用操作</p></div></header>{experienceRows.map(([key,title,desc])=><div className="setting-row" key={key}><span><strong>{title}</strong><small>{desc}</small></span><button className={options[key]?'on':''} aria-label={title} aria-pressed={options[key]} onClick={()=>toggle(key)}><i/></button></div>)}</section>
      </aside>
    </div>
    <footer className="settings-action-bar"><span><CheckCircle size={16} weight="fill"/>配置保存后将应用于所有成员的新对话</span><button className="admin-secondary">恢复默认</button><button className="admin-primary">保存设置</button></footer>
  </div>
}

function ConversationSettingsPage() {
  const [section,setSection] = useState('experience')
  return <div className="unified-ai-settings"><section className="ai-settings-navigation"><div><strong>AI 对话配置中心</strong><p>统一管理成员对话体验以及企业安全与数据边界</p></div><nav role="tablist" aria-label="AI 对话设置分类"><button type="button" role="tab" aria-selected={section==='experience'} className={section==='experience'?'active':''} onClick={()=>setSection('experience')}><ChatCircleDots size={18}/><span>对话体验<small>入口、回答与交互</small></span></button><button type="button" role="tab" aria-selected={section==='security'} className={section==='security'?'active':''} onClick={()=>setSection('security')}><ShieldCheck size={18}/><span>安全与数据<small>审计、内容与访问边界</small></span></button></nav></section>{section==='experience'?<ConversationExperienceSettings/>:<SecuritySettingsPage/>}</div>
}

function BestPracticesPage({ onOpenPermission, onEdit }) {
  const initialRows = [['公文写作','内容创作','全体成员','企业 AI 运营',3286,'86%','今天 10:20','已启用'],['会议纪要','会议协作','全体成员','产品中心',2648,'82%','今天 09:45','已启用'],['周报/月报','工作汇报','全体成员','企业 AI 运营',1864,'78%','昨天 17:30','已启用'],['数据分析','数据分析','管理层、数据中心','数据中心',1420,'74%','昨天 15:18','已启用'],['合同审查','法务合规','法务合规部','法务合规部',1256,'71%','8月30日','已启用'],['项目复盘','项目管理','项目成员','产品中心',986,'69%','8月29日','已启用'],['招聘面试提纲','招聘管理','人力资源部','人力资源部',0,'—','8月28日','已停用'],['营销文案创作','内容创作','市场中心','市场中心',0,'—','8月27日','已停用']]
  const [rows,setRows] = useState(initialRows)
  const empty = {title:'',scene:'',status:''}
  const [filters,setFilters] = useState(empty)
  const [applied,setApplied] = useState(empty)
  const filtered = rows.filter(row=>row[0].includes(applied.title.trim())&&(!applied.scene||row[1]===applied.scene)&&(!applied.status||row[7]===applied.status))
  const updateFilter = (key,value)=>setFilters(current=>({...current,[key]:value}))
  const toggleStatus = title=>setRows(current=>current.map(row=>row[0]===title?[...row.slice(0,7),row[7]==='已停用'?'已启用':'已停用']:row))
  const removePractice = title=>setRows(current=>current.filter(row=>row[0]!==title))
  return <><ManagementFilterBar fields={[{key:'title',label:'实践名称',placeholder:'请输入实践名称'},{key:'scene',label:'业务场景',options:[...new Set(rows.map(row=>row[1]))]},{key:'status',label:'状态',options:['已启用','已停用']}]} values={filters} onChange={updateFilter} onQuery={()=>setApplied(filters)} onReset={()=>{setFilters(empty);setApplied(empty)}}/><div className="admin-page-actions"><button className="admin-primary"><Plus size={16}/>创建最佳实践</button><span className="management-list-count">共 {filtered.length} 个模板</span></div><section className="admin-table-card"><div className="admin-table practice-admin-table"><div className="admin-tr head"><span>最佳实践</span><span>业务场景</span><span>适用对象</span><span>负责人</span><span>使用次数</span><span>最近更新</span><span>状态</span><span>操作</span></div>{filtered.map(row=><div className="admin-tr" key={row[0]}><span className="admin-name-cell"><i><Lightbulb size={17} weight="fill"/></i><b>{row[0]}</b></span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4].toLocaleString()}</span><span>{row[6]}</span><span><Status>{row[7]}</Status></span><span className="expert-row-actions practice-row-actions"><button className="admin-link" onClick={()=>onEdit({kind:'最佳实践',row})}>编辑</button><button className="admin-link" onClick={()=>onOpenPermission(row[0])}>授权</button><ManagementMoreActions name={row[0]} status={row[7]} onToggle={()=>toggleStatus(row[0])} onDelete={()=>removePractice(row[0])}/></span></div>)}{!filtered.length&&<div className="admin-table-empty">没有找到符合条件的最佳实践</div>}</div></section></>
}

function ModelsPage() {
  const models = [['企业通用模型','默认对话、知识问答','全员','12.6M','99.96%','已启用'],['高性能推理模型','数据分析、合同审查','管理层、专业部门','4.2M','99.92%','已启用'],['轻量快速模型','分类、摘要、定时任务','系统任务','18.7M','99.99%','已启用']]
  return <><div className="admin-metrics compact-metrics"><MetricCard icon={Database} label="本月 Token" value="35.5M" note="环比 +18.2%" tone="blue"/><MetricCard icon={TrendUp} label="本月模型费用" value="¥12,680" note="预算使用 63.4%" tone="orange"/><MetricCard icon={CheckCircle} label="平均可用率" value="99.96%" note="无重大服务异常" tone="green"/><MetricCard icon={Clock} label="平均响应" value="2.4s" note="较上月降低 0.3s" tone="violet"/></div><div className="admin-page-actions model-management-actions"><button className="admin-primary"><Plus size={16}/>添加模型</button><span className="management-list-count">共 {models.length} 个模型</span></div><section className="admin-table-card"><div className="admin-table model-management-table"><div className="admin-tr head"><span>模型策略</span><span>主要场景</span><span>可用范围</span><span>本月用量</span><span>SLA</span><span>状态</span><span>操作</span></div>{models.map(row=><div className="admin-tr" key={row[0]}><span className="admin-name-cell"><i><Database size={17} weight="fill"/></i><b>{row[0]}</b></span><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><span><Status>{row[5]}</Status></span><span className="expert-row-actions"><button className="admin-link">编辑</button><button className="admin-link">配置</button></span></div>)}</div></section></>
}

function ModelUsagePage() {
  const usageRows = [['李鹏飞','产品中心','企业通用模型',386,'1.86M','¥632','今天 10:32'],['张尧','研发中心','高性能推理模型',274,'1.52M','¥718','今天 10:18'],['王欣','人力资源部','企业通用模型',248,'1.18M','¥396','今天 09:55'],['陈晨','财务中心','高性能推理模型',226,'1.36M','¥645','今天 09:31'],['刘洋','市场中心','企业通用模型',214,'986K','¥328','昨天 18:16'],['赵敏','法务合规部','高性能推理模型',192,'1.08M','¥512','昨天 17:42'],['周扬','研发中心','轻量快速模型',186,'842K','¥126','昨天 16:30'],['谢倩','行政中心','企业通用模型',168,'766K','¥258','昨天 15:46'],['孙宁','数据中心','高性能推理模型',156,'924K','¥438','昨天 14:22'],['林琳','产品中心','轻量快速模型',142,'638K','¥96','昨天 11:08'],['许哲','市场中心','企业通用模型',128,'584K','¥196','8月30日'],['高洁','财务中心','轻量快速模型',116,'492K','¥74','8月29日']]
  const empty = { member:'', department:'', model:'' }
  const [filters,setFilters] = useState(empty)
  const [applied,setApplied] = useState(empty)
  const [pageSize,setPageSize] = useState(10)
  const [page,setPage] = useState(1)
  const filtered = usageRows.filter(row=>row[0].includes(applied.member.trim())&&(!applied.department||row[1]===applied.department)&&(!applied.model||row[2]===applied.model))
  const pageCount = Math.max(1,Math.ceil(filtered.length/pageSize))
  const safePage = Math.min(page,pageCount)
  const visible = filtered.slice((safePage-1)*pageSize,safePage*pageSize)
  const updateFilter = (key,value)=>setFilters(current=>({...current,[key]:value}))
  return <div className="automation-page">
    <ManagementFilterBar fields={[{key:'member',label:'成员',placeholder:'请输入成员姓名'},{key:'department',label:'部门',options:[...new Set(usageRows.map(row=>row[1]))]},{key:'model',label:'模型',options:[...new Set(usageRows.map(row=>row[2]))]}]} values={filters} onChange={updateFilter} onQuery={()=>{setApplied(filters);setPage(1)}} onReset={()=>{setFilters(empty);setApplied(empty);setPage(1)}}/>
    <section className="admin-table-card"><div className="admin-table member-model-usage-table">
      <div className="admin-tr head"><span>成员</span><span>部门</span><span>主要模型</span><span>对话次数</span><span>Token 用量</span><span>最近使用</span></div>
      {visible.map(row=><div className="admin-tr" key={row[0]}><span className="admin-user-cell"><i>{row[0].slice(0,1)}</i><b>{row[0]}</b></span>{[row[1],row[2],row[3],row[4],row[6]].map(value=><span key={value}>{typeof value==='number'?value.toLocaleString():value}</span>)}</div>)}
      {!visible.length&&<div className="admin-table-empty">没有找到符合条件的成员用量</div>}
    </div></section>
    <footer className="admin-pagination automation-page-pagination"><span>共 {filtered.length} 条，第 {filtered.length?(safePage-1)*pageSize+1:0}–{Math.min(safePage*pageSize,filtered.length)} 条</span><div className="admin-page-size"><label>每页显示<select aria-label="每页显示条数" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}><option value="5">5 条</option><option value="10">10 条</option><option value="20">20 条</option></select></label></div><div><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一页</button>{Array.from({length:pageCount},(_,index)=>index+1).map(number=><button className={safePage===number?'active':''} key={number} onClick={()=>setPage(number)}>{number}</button>)}<button disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一页</button></div></footer>
  </div>
}

function SensitiveWordsPage() {
  const initialWords = [['客户密码','数据安全','高风险','精确匹配',18,'今天 10:26','已启用'],['内部报价','商业机密','高风险','模糊匹配',12,'今天 09:48','已启用'],['身份证号','个人信息','高风险','规则匹配',9,'昨天 18:12','已启用'],['未公开新品','商业机密','中风险','模糊匹配',7,'昨天 16:35','已启用'],['银行卡号','个人信息','高风险','规则匹配',6,'昨天 14:20','已启用'],['薪酬明细','内部信息','中风险','模糊匹配',5,'8月30日','已启用'],['合同底价','商业机密','高风险','精确匹配',4,'8月30日','已启用'],['离职名单','内部信息','中风险','精确匹配',3,'8月29日','已启用'],['私人邮箱','个人信息','低风险','模糊匹配',2,'8月28日','已启用'],['测试关键词','其他','低风险','精确匹配',0,'8月27日','已停用'],['旧项目代号','内部信息','低风险','精确匹配',0,'8月26日','已停用'],['过期产品名称','其他','低风险','模糊匹配',0,'8月25日','已停用']]
  const [words,setWords] = useState(initialWords)
  const empty = { keyword:'', category:'', status:'' }
  const [filters,setFilters] = useState(empty)
  const [applied,setApplied] = useState(empty)
  const [pageSize,setPageSize] = useState(10)
  const [page,setPage] = useState(1)
  const filtered = words.filter(row=>row[0].includes(applied.keyword.trim())&&(!applied.category||row[1]===applied.category)&&(!applied.status||row[6]===applied.status))
  const pageCount = Math.max(1,Math.ceil(filtered.length/pageSize))
  const safePage = Math.min(page,pageCount)
  const visible = filtered.slice((safePage-1)*pageSize,safePage*pageSize)
  const updateFilter = (key,value)=>setFilters(current=>({...current,[key]:value}))
  const toggleStatus = name=>setWords(current=>current.map(row=>row[0]===name?[...row.slice(0,6),row[6]==='已启用'?'已停用':'已启用']:row))
  const removeWord = name=>setWords(current=>current.filter(row=>row[0]!==name))
  return <div className="automation-page sensitive-words-page">
    <div className="admin-metrics compact-metrics"><MetricCard icon={LockKey} label="敏感词总数" value="128" note="覆盖 5 个风险分类" tone="blue"/><MetricCard icon={ShieldCheck} label="已启用规则" value="116" note="规则启用率 90.6%" tone="green"/><MetricCard icon={Warning} label="今日命中" value="23" note="较昨日增加 4 次" tone="orange"/><MetricCard icon={CheckCircle} label="已拦截内容" value="7" note="高风险内容实时阻断" tone="violet"/></div>
    <ManagementFilterBar fields={[{key:'keyword',label:'敏感词',placeholder:'请输入敏感词'},{key:'category',label:'风险分类',options:['数据安全','商业机密','个人信息','内部信息','其他']},{key:'status',label:'状态',options:['已启用','已停用']}]} values={filters} onChange={updateFilter} onQuery={()=>{setApplied(filters);setPage(1)}} onReset={()=>{setFilters(empty);setApplied(empty);setPage(1)}}/>
    <div className="admin-page-actions"><button className="admin-primary"><Plus size={16}/>添加敏感词</button><span className="management-list-count">共 {filtered.length} 个敏感词</span></div>
    <section className="admin-table-card"><div className="admin-table sensitive-words-table"><div className="admin-tr head"><span>敏感词</span><span>风险分类</span><span>风险级别</span><span>匹配方式</span><span>命中次数</span><span>最近命中</span><span>状态</span><span>操作</span></div>{visible.map(row=><div className="admin-tr" key={row[0]}><span className="admin-name-cell"><i><LockKey size={17} weight="fill"/></i><b>{row[0]}</b></span><span>{row[1]}</span><span><em className={`sensitive-risk-level ${row[2]==='高风险'?'high':row[2]==='中风险'?'medium':'low'}`}>{row[2]}</em></span><span>{row[3]}</span><span>{row[4]} 次</span><span>{row[5]}</span><span><Status>{row[6]}</Status></span><span className="expert-row-actions"><button className="admin-link">编辑</button><ManagementMoreActions name={row[0]} status={row[6]} onToggle={()=>toggleStatus(row[0])} onDelete={()=>removeWord(row[0])}/></span></div>)}{!visible.length&&<div className="admin-table-empty">没有找到符合条件的敏感词</div>}</div></section>
    <footer className="admin-pagination automation-page-pagination"><span>共 {filtered.length} 条，第 {filtered.length?(safePage-1)*pageSize+1:0}–{Math.min(safePage*pageSize,filtered.length)} 条</span><div className="admin-page-size"><label>每页显示<select aria-label="每页显示条数" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}><option value="5">5 条</option><option value="10">10 条</option><option value="20">20 条</option></select></label></div><div><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一页</button>{Array.from({length:pageCount},(_,index)=>index+1).map(number=><button className={safePage===number?'active':''} key={number} onClick={()=>setPage(number)}>{number}</button>)}<button disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一页</button></div></footer>
  </div>
}

function PermissionsPage() {
  const [roles,setRoles] = useState([['超级管理员','系统内置'],['普通成员','系统内置'],['部门管理员','系统内置'],['知识管理员','系统内置'],['安全审计员','自定义'],['应用运营员','自定义'],['外部协作员','自定义']])
  const [activeRole,setActiveRole] = useState('普通成员')
  const [activeTab,setActiveTab] = useState('members')
  const [menuScope,setMenuScope] = useState('workbench')
  const [selected,setSelected] = useState([])
  const [roleMembers,setRoleMembers] = useState({超级管理员:[0],普通成员:[1,2,3,4,5,6,7,8,9,10,11],部门管理员:[0,1,3],知识管理员:[0,5],安全审计员:[5],应用运营员:[0,4],外部协作员:[]})
  const workbenchMenuGroups = [['工作台主菜单',['新建对话','工作空间','定时任务','专家中心','技能中心','连接器','应用中心','知识中心']]]
  const adminMenuGroups = [['总览',['运营驾驶舱']],['业务治理',['定时任务管理','专家管理','技能管理','连接器管理','应用管理','知识库管理']],['AI 治理',['对话审计','模型管理','模型用量','敏感词管理']],['系统',['组织与成员','权限管理','安全与系统设置']]]
  const menuScopes = {workbench:workbenchMenuGroups,admin:adminMenuGroups}
  const allMenuItems = [...workbenchMenuGroups,...adminMenuGroups].flatMap(([,items])=>items)
  const [rolePermissions,setRolePermissions] = useState({普通成员:['新建对话','工作空间','定时任务','专家中心','技能中心','连接器','应用中心','知识中心'],知识管理员:['新建对话','工作空间','定时任务','专家中心','技能中心','连接器','应用中心','知识中心','知识库管理'],超级管理员:allMenuItems})
  const currentIndexes = roleMembers[activeRole] || []
  const currentMembers = currentIndexes.map(index=>({index,row:members[index]})).filter(item=>item.row)
  const currentPermissions = rolePermissions[activeRole] || []
  const visibleMenuGroups = menuScopes[menuScope]
  const visibleMenuItems = visibleMenuGroups.flatMap(([,items])=>items)
  const visiblePermissionCount = visibleMenuItems.filter(item=>currentPermissions.includes(item)).length
  const allSelected = currentMembers.length>0&&currentMembers.every(({index})=>selected.includes(index))
  const switchRole = role=>{setActiveRole(role);setSelected([])}
  const toggleMember = index=>setSelected(current=>current.includes(index)?current.filter(value=>value!==index):[...current,index])
  const removeMembers = indexes=>{setRoleMembers(current=>({...current,[activeRole]:(current[activeRole]||[]).filter(index=>!indexes.includes(index))}));setSelected([])}
  const addMember = ()=>{const missing=members.findIndex((_,index)=>!currentIndexes.includes(index));if(missing>=0)setRoleMembers(current=>({...current,[activeRole]:[...(current[activeRole]||[]),missing]}))}
  const createRole = ()=>{const name=`自定义角色 ${roles.filter(([,type])=>type==='自定义').length+1}`;setRoles(current=>[...current,[name,'自定义']]);setRoleMembers(current=>({...current,[name]:[]}));setActiveRole(name);setActiveTab('members')}
  const editRole = role=>{const name=window.prompt('编辑角色名称',role)?.trim();if(!name||name===role||roles.some(([item])=>item===name))return;setRoles(current=>current.map(item=>item[0]===role?[name,item[1]]:item));setRoleMembers(current=>{const next={...current,[name]:current[role]||[]};delete next[role];return next});setRolePermissions(current=>{const next={...current,[name]:current[role]||[]};delete next[role];return next});if(activeRole===role)setActiveRole(name)}
  const deleteRole = role=>{const remaining=roles.filter(([item])=>item!==role);setRoles(remaining);setRoleMembers(current=>{const next={...current};delete next[role];return next});setRolePermissions(current=>{const next={...current};delete next[role];return next});if(activeRole===role){setActiveRole(remaining[0]?.[0]||'');setSelected([])}}
  const togglePermission = permission=>setRolePermissions(current=>({...current,[activeRole]:currentPermissions.includes(permission)?currentPermissions.filter(item=>item!==permission):[...currentPermissions,permission]}))
  return <div className="permission-management-layout">
    <aside className="permission-role-panel"><header><strong>角色</strong><button onClick={createRole}><Plus size={15}/>创建角色</button></header><div>{roles.map(([role,type])=><div key={role} className={`permission-role-item${activeRole===role?' active':''}`}><button className="permission-role-select" onClick={()=>switchRole(role)}><span>{role}<small>{type}</small></span><b>{(roleMembers[role]||[]).length}</b></button><span className="permission-role-actions"><button title="编辑角色" aria-label={`编辑${role}`} onClick={()=>editRole(role)}><PencilSimple size={14}/></button><button className="danger" title="删除角色" aria-label={`删除${role}`} onClick={()=>deleteRole(role)}><Trash size={14}/></button></span></div>)}</div></aside>
    <section className="permission-detail-panel"><nav><button className={activeTab==='members'?'active':''} onClick={()=>setActiveTab('members')}>成员管理</button><button className={activeTab==='menus'?'active':''} onClick={()=>setActiveTab('menus')}>菜单权限</button></nav>
      {activeTab==='members'?<><div className="permission-member-actions"><button className="admin-primary" onClick={addMember}><Plus size={16}/>添加成员</button><button className="admin-secondary" disabled={!selected.length} onClick={()=>removeMembers(selected)}>批量移除</button><span>{activeRole} · 共 {currentMembers.length} 人</span></div><div className="permission-member-table"><div className="permission-member-row head"><span><input type="checkbox" checked={allSelected} onChange={()=>setSelected(allSelected?[]:currentMembers.map(({index})=>index))}/></span><span>姓名</span><span>工号</span><span>手机号</span><span>部门</span><span>操作</span></div>{currentMembers.map(({index,row})=><div className="permission-member-row" key={row[2]}><span><input type="checkbox" checked={selected.includes(index)} onChange={()=>toggleMember(index)}/></span><span className="admin-user-cell"><i>{row[0].slice(0,1)}</i><b>{row[0]}</b></span><span>{row[2]}</span><span>{row[3]}</span><span>{row[5]}</span><span><button className="permission-remove" onClick={()=>removeMembers([index])}>移除</button></span></div>)}{!currentMembers.length&&<div className="permission-empty">该角色暂未添加成员</div>}</div></>:<div className="permission-menu-config"><header><div><strong>{activeRole}的菜单权限</strong><p>分别配置成员在工作台和管理后台可以访问的菜单。</p></div><span>当前分组已选择 {visiblePermissionCount} 项</span></header><div className="permission-scope-tabs"><button className={menuScope==='workbench'?'active':''} onClick={()=>setMenuScope('workbench')}>工作台菜单 <b>{workbenchMenuGroups.flatMap(([,items])=>items).filter(item=>currentPermissions.includes(item)).length}</b></button><button className={menuScope==='admin'?'active':''} onClick={()=>setMenuScope('admin')}>管理后台菜单 <b>{adminMenuGroups.flatMap(([,items])=>items).filter(item=>currentPermissions.includes(item)).length}</b></button></div>{visibleMenuGroups.map(([group,items])=><section key={group}><h3>{group}</h3><div>{items.map(item=><label key={item}><input type="checkbox" checked={currentPermissions.includes(item)} onChange={()=>togglePermission(item)}/><span>{item}</span></label>)}</div></section>)}</div>}
    </section>
  </div>
}

function AuditPage({ onOpen }) {
  const empty = { member:'', content:'', risk:'' }
  const [filters, setFilters] = useState(empty)
  const [applied, setApplied] = useState(empty)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const filtered = auditRows.map((row,index)=>({row,index})).filter(({row})=>row[0].includes(applied.member.trim())&&row[2].includes(applied.content.trim())&&(!applied.risk||row[5]===applied.risk))
  const pageCount = Math.max(1, Math.ceil(filtered.length/pageSize))
  const safePage = Math.min(page,pageCount)
  const visible = filtered.slice((safePage-1)*pageSize,safePage*pageSize)
  const updateFilter = (key,value) => setFilters(current=>({...current,[key]:value}))
  return <div className="automation-page audit-page">
    <div className="admin-metrics compact-metrics"><MetricCard icon={ChatCircleDots} label="审计记录" value="1,326" note="覆盖全部企业 AI 对话" tone="blue"/><MetricCard icon={ShieldCheck} label="正常记录" value="1,324" note="风险识别通过率 99.8%" tone="green"/><MetricCard icon={Warning} label="需复核" value="1" note="等待管理员确认" tone="orange"/><MetricCard icon={LockKey} label="敏感内容" value="1" note="已触发内容保护策略" tone="violet"/></div>
    <section className="automation-filter-bar audit-filter-bar"><label><span>成员</span><div><MagnifyingGlass size={16}/><input value={filters.member} onChange={event=>updateFilter('member',event.target.value)} placeholder="请输入成员姓名"/></div></label><label><span>对话内容</span><div><MagnifyingGlass size={16}/><input value={filters.content} onChange={event=>updateFilter('content',event.target.value)} placeholder="请输入对话关键词"/></div></label><label><span>风险状态</span><div><select value={filters.risk} onChange={event=>updateFilter('risk',event.target.value)}><option value="">全部</option><option>正常</option><option>需复核</option><option>敏感内容</option></select></div></label><button className="admin-secondary" onClick={()=>{setFilters(empty);setApplied(empty);setPage(1)}}>重置</button><button className="admin-primary" onClick={()=>{setApplied(filters);setPage(1)}}><MagnifyingGlass size={15}/>查询</button><button className="admin-secondary audit-export"><DownloadSimple size={16}/>导出记录</button></section>
    <section className="admin-table-card"><div className="admin-table audit-table"><div className="admin-tr head"><span>成员</span><span>对话内容</span><span>使用能力</span><span>时间</span><span>风险状态</span><span>操作</span></div>{visible.map(({row,index})=><div className="admin-tr" key={`${row[0]}-${row[4]}`}><span className="admin-user-cell"><i>{row[0].slice(0,1)}</i><b>{row[0]}<small>{row[1]}</small></b></span><span className="audit-prompt">{row[2]}</span><span>{row[3]}</span><span>{row[4]}</span><span><Status>{row[5]}</Status></span><span><button className="admin-link" onClick={()=>onOpen(index)}>查看详情</button></span></div>)}{!visible.length&&<div className="admin-table-empty">没有找到符合条件的审计记录</div>}</div></section>
    <footer className="admin-pagination automation-page-pagination"><span>共 {filtered.length} 条，第 {filtered.length?(safePage-1)*pageSize+1:0}–{Math.min(safePage*pageSize,filtered.length)} 条</span><div className="admin-page-size"><label>每页显示<select aria-label="每页显示条数" value={pageSize} onChange={event=>{setPageSize(Number(event.target.value));setPage(1)}}><option value="5">5 条</option><option value="10">10 条</option><option value="20">20 条</option></select></label></div><div><button disabled={safePage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一页</button>{Array.from({length:pageCount},(_,index)=>index+1).map(number=><button className={safePage===number?'active':''} key={number} onClick={()=>setPage(number)}>{number}</button>)}<button disabled={safePage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>下一页</button></div></footer>
  </div>
}

function AnalyticsPage() {
  const skillData = [['数据分析', 88], ['待办任务', 72], ['帮我写作', 64], ['会议纪要', 53], ['合同审查', 38]]
  return <><div className="admin-metrics analytics-metrics"><MetricCard icon={TrendUp} label="月活跃成员" value="241" note="活跃率 84.3%" tone="blue" /><MetricCard icon={ChatCircleDots} label="人均对话次数" value="65.2" note="环比 +12.4%" tone="violet" /><MetricCard icon={Clock} label="节省工时估算" value="3,286h" note="本月累计" tone="green" /><MetricCard icon={Database} label="模型费用估算" value="¥12,680" note="预算使用 63.4%" tone="orange" /></div><div className="analytics-grid"><section className="admin-panel analytics-trend"><header><div><h2>月度使用趋势</h2><p>对话量与活跃成员变化</p></div><button>过去 6 个月</button></header><div className="analytics-columns">{[38,52,61,69,82,96].map((v,i)=><div key={i}><span style={{height:`${v*1.55}px`}} /><b>{['3月','4月','5月','6月','7月','8月'][i]}</b></div>)}</div></section><section className="admin-panel"><header><div><h2>热门技能排行</h2><p>按本月调用次数统计</p></div></header><div className="skill-ranking">{skillData.map(([name,value],index)=><div key={name}><b>{index+1}</b><span>{name}</span><i><em style={{width:`${value}%`}} /></i><strong>{(value*43).toLocaleString()}</strong></div>)}</div></section><section className="admin-panel value-panel"><header><div><h2>业务价值分布</h2><p>按使用场景估算</p></div></header><div className="donut"><div><strong>3,286h</strong><small>节省工时</small></div></div><ul><li><i className="blue" />内容创作 <b>34%</b></li><li><i className="purple" />数据分析 <b>27%</b></li><li><i className="green" />流程协作 <b>23%</b></li><li><i className="orange" />知识检索 <b>16%</b></li></ul></section></div></>
}

function SecuritySettingsPage() {
  const [options, setOptions] = useState({ audit: true, sensitive: true, sharing: false, retention: true, external: false })
  const toggle = key => setOptions(current => ({ ...current, [key]: !current[key] }))
  const rows = [['audit','记录全部 AI 对话','用于安全审计、问题追溯和使用分析'],['sensitive','敏感内容实时检测','自动识别个人信息、商业机密和高风险内容'],['sharing','允许公开分享 AI 对话','成员可将对话生成公开访问链接'],['retention','保留对话记录 180 天','到期后按企业数据策略自动清理'],['external','允许使用外部知识来源','允许模型访问已授权的公网信息']]
  const SettingRows = ({items})=>items.map(([key,title,desc])=><div className="setting-row" key={key}><span><strong>{title}</strong><small>{desc}</small></span><button className={options[key]?'on':''} aria-label={title} aria-pressed={options[key]} onClick={()=>toggle(key)}><i /></button></div>)
  return <div className="settings-workspace"><div className="security-settings-grid"><section className="admin-panel settings-card"><header><span className="settings-section-icon blue"><LockKey size={19} weight="fill"/></span><div><h2>审计与内容防护</h2><p>记录 AI 使用行为并识别高风险内容</p></div></header><SettingRows items={rows.slice(0,2)}/></section><section className="admin-panel settings-card"><header><span className="settings-section-icon violet"><ShieldCheck size={19} weight="fill"/></span><div><h2>数据访问边界</h2><p>控制分享、留存与外部信息访问范围</p></div></header><SettingRows items={rows.slice(2)}/></section></div><footer className="settings-action-bar"><span><CheckCircle size={16} weight="fill"/>策略修改将在保存后对全企业生效</span><button className="admin-secondary">恢复默认</button><button className="admin-primary">保存策略</button></footer></div>
}

function DefaultModelSettingsPage() {
  const [model,setModel] = useState('企业通用模型')
  const [context,setContext] = useState('128K')
  const [quota,setQuota] = useState('500,000 Tokens')
  return <div className="settings-workspace"><section className="settings-overview model"><span className="settings-overview-icon"><Database size={24} weight="fill"/></span><div><strong>企业默认 AI 模型</strong><p>新成员与未单独配置的业务场景将自动使用此处策略。</p></div><span className="settings-current-model">{model}</span></section><div className="model-settings-grid"><section className="admin-panel settings-card model-config-card"><header><span className="settings-section-icon blue"><Database size={19} weight="fill"/></span><div><h2>基础配置</h2><p>设置默认模型能力与成员使用额度</p></div></header><label className="admin-field"><span>默认对话模型<small>用于日常问答和未指定模型的任务</small></span><select value={model} onChange={event=>setModel(event.target.value)}><option>企业通用模型</option><option>高性能推理模型</option><option>轻量快速模型</option></select></label><label className="admin-field"><span>单次对话上下文上限<small>上下文越大，可处理的历史消息和文件内容越多</small></span><select value={context} onChange={event=>setContext(event.target.value)}><option>128K</option><option>64K</option><option>32K</option></select></label><label className="admin-field"><span>成员每月额度<small>额度用尽后将暂停个人模型调用</small></span><input value={quota} onChange={event=>setQuota(event.target.value)}/></label></section><aside className="admin-panel model-policy-summary"><header><div><h2>当前策略摘要</h2><p>配置影响范围与运行情况</p></div></header><div><span>适用成员<strong>12 人</strong></span><span>默认上下文<strong>{context}</strong></span><span>本月额度<strong>{quota}</strong></span></div><ul><li><CheckCircle size={16} weight="fill"/>成员自定义模型优先</li><li><CheckCircle size={16} weight="fill"/>额度按自然月自动重置</li><li><CheckCircle size={16} weight="fill"/>模型异常时自动降级</li></ul></aside></div><footer className="settings-action-bar"><span><CheckCircle size={16} weight="fill"/>配置保存后立即应用于新对话</span><button className="admin-secondary">取消修改</button><button className="admin-primary">保存配置</button></footer></div>
}

function PermissionDialog({ target, onClose }) {
  const [scope, setScope] = useState('指定部门与成员')
  const [selected, setSelected] = useState(() => new Set(['产品中心', '研发中心']))
  const choices = ['全体成员', '管理层', '产品中心', '研发中心', '市场中心', '财务中心', '人力资源部', '法务合规部']
  const toggle = item => setSelected(current => { const next = new Set(current); next.has(item) ? next.delete(item) : next.add(item); return next })
  return <div className="admin-modal-backdrop" onClick={onClose}><section className="admin-modal" onClick={event=>event.stopPropagation()}><header><div><h2>配置使用权限</h2><p>{target}</p></div><button onClick={onClose}><X size={19}/></button></header><div className="permission-scopes">{['全员可用','指定部门与成员','仅管理员'].map(item=><button className={scope===item?'active':''} key={item} onClick={()=>setScope(item)}><span>{scope===item&&<Check size={13}/>}</span>{item}</button>)}</div>{scope==='指定部门与成员'&&<div className="permission-choices">{choices.slice(1).map(item=><button className={selected.has(item)?'selected':''} key={item} onClick={()=>toggle(item)}><span>{selected.has(item)&&<Check size={12}/>}</span>{item}</button>)}</div>}<footer><button onClick={onClose}>取消</button><button className="admin-primary" onClick={onClose}>保存权限</button></footer></section></div>
}

function KnowledgeDetailDialog({ row, onClose }) {
  if (!row) return null
  return <div className="admin-modal-backdrop" onClick={onClose}><section className="admin-modal knowledge-detail-modal" onClick={event=>event.stopPropagation()}><header><div><h2>知识库详情</h2><p>{row[0]}</p></div><button onClick={onClose}><X size={19}/></button></header><div className="knowledge-detail-grid"><span>知识库类型<b>{row[1]}</b></span><span>内容数量<b>{row[2]} 项</b></span><span>负责人<b>{row[3]}</b></span><span>访问范围<b>{row[4]}</b></span><span>最近更新<b>{row[5]}</b></span><span>当前状态<b><Status>{row[6]}</Status></b></span></div><footer><button onClick={onClose}>关闭</button></footer></section></div>
}

function AuditDialog({ row, onClose }) {
  if (!row) return null
  return <div className="admin-modal-backdrop" onClick={onClose}><section className="admin-modal audit-detail-modal" onClick={event=>event.stopPropagation()}><header><div><h2>AI 对话与调用详情</h2><p>{row[0]} · {row[1]} · {row[4]}</p></div><button onClick={onClose}><X size={19}/></button></header><div className="audit-detail-meta"><span>使用能力：<b>{row[3]}</b></span><span>模型：<b>企业通用模型</b></span><span>知识引用：<b>资源中心 3 项</b></span><span>风险判断：<Status>{row[5]}</Status></span></div><div className="audit-bubble user"><small>成员提问</small><p>{row[2]}</p></div><div className="audit-bubble ai"><small>AI 回复</small><p>已根据企业授权范围内的资料完成分析，并生成结构化建议。系统已记录本次对话的模型、技能、知识引用、联网状态和风险检测结果。</p></div><div className="audit-output"><FileText size={18}/><span><strong>生成产物</strong><small>分析结果报告.docx · 已保存到工作空间</small></span><button>查看产物</button></div><footer><button onClick={onClose}>关闭</button><button className="admin-primary">标记已复核</button></footer></section></div>
}

function ExpertEditDialog({ row, onClose }) {
  if (!row) return null
  return <ManagedItemEditDialog item={{kind:'专家',row}} onClose={onClose}/>
}

function MemberDepartmentPicker({ initialSelected, onClose, onConfirm }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set(initialSelected))
  const [companyExpanded, setCompanyExpanded] = useState(true)
  const [expandedDepartments, setExpandedDepartments] = useState(() => new Set(members.map(member => member[5])))
  const groupedMembers = useMemo(() => {
    const groups = new Map()
    members.forEach(member => {
      const department = member[5]
      if (!groups.has(department)) groups.set(department, [])
      groups.get(department).push(member)
    })
    return [...groups.entries()]
  }, [])
  const toggle = key => setSelected(current => {
    const next = new Set(current)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })
  const toggleDepartment = department => setExpandedDepartments(current => {
    const next = new Set(current)
    next.has(department) ? next.delete(department) : next.add(department)
    return next
  })
  const keyword = search.trim().toLowerCase()
  const visibleGroups = groupedMembers.map(([department, departmentMembers]) => [department, departmentMembers.filter(member => !keyword || `${member[0]}${member[2]}${department}`.toLowerCase().includes(keyword))]).filter(([department, departmentMembers]) => !keyword || department.toLowerCase().includes(keyword) || departmentMembers.length)
  const labelFor = key => key.replace(/^department:/, '').replace(/^member:/, '')
  const selectedDetails = [...selected].map(key => {
    const label = labelFor(key)
    if (key.startsWith('department:')) return { key, label, note: '部门', department: true }
    const member = members.find(item => item[0] === label)
    return { key, label, note: member ? `${member[5]} · ${member[6]}` : '成员', department: false }
  })
  return <div className="member-picker-backdrop" onClick={onClose}><section className="member-picker-dialog" onClick={event=>event.stopPropagation()}>
    <header><h2>选择成员与部门</h2><button type="button" aria-label="关闭选人组件" onClick={onClose}><X size={20}/></button></header>
    <div className="member-picker-body">
      <div className="member-picker-browser">
        <label className="member-picker-search"><MagnifyingGlass size={18}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="搜索成员或部门"/></label>
        <div className="member-picker-tree">
          <div className="member-picker-company"><button type="button" className={`member-picker-tree-toggle${companyExpanded?' expanded':''}`} aria-label={companyExpanded?'收起企业组织':'展开企业组织'} aria-expanded={companyExpanded} onClick={()=>setCompanyExpanded(value=>!value)}><CaretDown size={14}/></button><span><Buildings size={19} weight="fill"/></span><button type="button" className="member-picker-tree-name" onClick={()=>setCompanyExpanded(value=>!value)}>企业AI数字员工</button></div>
          {(companyExpanded||keyword)&&visibleGroups.map(([department, departmentMembers]) => {
            const expanded = keyword || expandedDepartments.has(department)
            return <section key={department} className="member-picker-department">
              <div className="member-picker-department-row"><button type="button" className={`member-picker-tree-toggle${expanded?' expanded':''}`} aria-label={expanded?`收起${department}`:`展开${department}`} aria-expanded={expanded} onClick={()=>toggleDepartment(department)}><CaretDown size={13}/></button><label><input type="checkbox" aria-label={`选择${department}`} checked={selected.has(`department:${department}`)} onChange={()=>toggle(`department:${department}`)}/><span><UsersThree size={17}/></span></label><button type="button" className="member-picker-tree-name" onClick={()=>toggleDepartment(department)}>{department}</button></div>
              {expanded&&departmentMembers.map(member => <label className="member-picker-person" key={member[0]}><input type="checkbox" checked={selected.has(`member:${member[0]}`)} onChange={()=>toggle(`member:${member[0]}`)}/><span>{member[0].slice(-2)}</span><div><strong>{member[0]}</strong><small>{member[6]}</small></div></label>)}
            </section>
          })}
          {!visibleGroups.length&&<div className="member-picker-empty">未找到相关成员或部门</div>}
        </div>
      </div>
      <aside className="member-picker-selected"><h3>已选择 <span>({selected.size})</span></h3>{selected.size?<div>{selectedDetails.map(item=><span className="member-picker-selected-item" key={item.key}><i className={item.department?'department':''}>{item.department?<UsersThree size={16}/>:item.label.slice(-2)}</i><span className="member-picker-selected-copy"><b>{item.label}</b><small>{item.note}</small></span><button type="button" aria-label={`移除${item.label}`} onClick={()=>toggle(item.key)}><X size={14}/></button></span>)}</div>:<p>暂未选择成员或部门</p>}</aside>
    </div>
    <footer><button type="button" onClick={onClose}>取消</button><button type="button" className="admin-primary" onClick={()=>onConfirm([...selected])}>确定</button></footer>
  </section></div>
}

function ManagedItemEditDialog({ item, onClose }) {
  const [visibleScope, setVisibleScope] = useState(() => {
    const scopeIndex = item?.kind === '专家' || item?.kind === '连接器' ? 3 : 2
    const scope = item?.row?.[scopeIndex]
    return scope === '全员' || scope === '全体成员' ? '全员' : '指定成员'
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState([])
  if (!item) return null
  const { kind, row } = item
  const isSkill = kind === '技能'
  const isExpert = kind === '专家'
  const isConnector = kind === '连接器'
  const isPractice = kind === '最佳实践'
  const secondaryLabel = isExpert ? '专家类型' : isSkill || isPractice ? '业务场景' : isConnector ? '类型' : '应用类型'
  const secondaryValue = isExpert ? row[2] : isSkill || isConnector || isPractice ? row[1] : row[4]
  return <div className="admin-modal-backdrop" onClick={onClose}>
    <section className="admin-modal expert-edit-modal" onClick={event=>event.stopPropagation()}>
      <header><div><h2>编辑{kind}</h2><p>{row[0]}</p></div><button onClick={onClose}><X size={19}/></button></header>
      <div className="expert-edit-grid">
        <label>{kind}名称<input defaultValue={row[0]}/></label>
        <label>{secondaryLabel}<input defaultValue={secondaryValue}/></label>
        {isExpert&&<label className="wide">能力定位<input defaultValue={row[1]}/></label>}
        {isConnector&&<label className="wide">开放能力<input defaultValue={row[2]}/></label>}
        {!isSkill&&!isExpert&&!isConnector&&!isPractice&&<label className="wide">业务说明<input defaultValue={row[1]}/></label>}
        {isPractice&&<label className="wide">负责人<input defaultValue={row[3]}/></label>}
        <fieldset className="expert-edit-radio-field wide"><legend>可见范围</legend><div className="expert-edit-radio-group">{['全员','指定成员'].map(option=><label key={option}><input type="radio" name={`${kind}-visible-scope`} value={option} checked={option===visibleScope} onChange={()=>setVisibleScope(option)}/><span>{option}</span></label>)}</div></fieldset>
        {visibleScope==='指定成员'&&<section className="expert-edit-member-scope wide"><strong>添加成员 / 部门</strong><div><button type="button" aria-label="添加成员或部门" onClick={()=>setPickerOpen(true)}><Plus size={16}/></button>{selectedTargets.length>0&&<span>已选择 {selectedTargets.length} 项</span>}</div></section>}
      </div>
      <footer><button onClick={onClose}>取消</button><button className="admin-primary" onClick={onClose}>保存修改</button></footer>
    </section>
    {pickerOpen&&<MemberDepartmentPicker initialSelected={selectedTargets} onClose={()=>setPickerOpen(false)} onConfirm={items=>{setSelectedTargets(items);setPickerOpen(false)}}/>}
  </div>
}

export default function AdminConsole() {
  const [active, setActive] = useState('dashboard')
  const [query, setQuery] = useState('')
  const [permissionTarget, setPermissionTarget] = useState('')
  const [expertEditor, setExpertEditor] = useState(null)
  const [managedItemEditor, setManagedItemEditor] = useState(null)
  const [auditIndex, setAuditIndex] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [title, subtitle] = pageMeta[active]
  const activeNav = useMemo(() => adminNav.find(([key]) => key === active), [active])
  const showTopSearch = false
  const openWorkbench = () => { const url = new URL(window.location.origin); window.open(url.toString(), '_blank', 'noopener,noreferrer') }
  return <div className={`admin-console${sidebarCollapsed?' collapsed':''}`}>
    <aside className="admin-sidebar"><header><img src={publicAsset("/digital-employee-avatar.png")} alt="" /><span><strong>企业AI数字员工</strong><small>管理后台</small></span><button className="admin-sidebar-collapse" type="button" aria-label={sidebarCollapsed?'展开侧边栏':'收起侧边栏'} aria-expanded={!sidebarCollapsed} title={sidebarCollapsed?'展开侧边栏':'收起侧边栏'} onClick={()=>setSidebarCollapsed(v=>!v)}><SidebarSimple size={19} weight="regular"/></button></header><nav>{adminNavGroups.map(([group,items])=><section className="admin-nav-group" key={group}><small>{group}</small>{items.map(([key,label,Icon])=><button key={key} className={active===key?'active':''} onClick={()=>{setActive(key);setQuery('')}}><Icon size={18}/><span>{label}</span></button>)}</section>)}</nav><div className="admin-sidebar-foot"><button onClick={openWorkbench}><ArrowUpRight size={18}/><span>返回工作台</span></button><div><img src={publicAsset("/user-avatar.png")} alt="李鹏飞"/><span><strong>李鹏飞</strong><small>超级管理员</small></span></div></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="admin-top-actions">{showTopSearch&&<label><MagnifyingGlass size={17}/><input aria-label={`搜索${activeNav?.[1]||''}`} value={query} onChange={e=>setQuery(e.target.value)} placeholder={`搜索${activeNav?.[1]||''}`}/></label>}</div></header><div className={`admin-content${['automations','audit','modelUsage','sensitiveWords'].includes(active)?' automation-content':active==='members'?' members-content':''}`}>{active==='dashboard'&&<Dashboard/>}{active==='members'&&<MembersPage onOpenPermission={setPermissionTarget}/>} {active==='experts'&&<ExpertsPage onOpenPermission={setPermissionTarget} onEdit={setExpertEditor}/>} {active==='skills'&&<SkillsPage onOpenPermission={setPermissionTarget} onEdit={setManagedItemEditor}/>} {active==='knowledge'&&<KnowledgePage/>} {active==='conversationSettings'&&<ConversationSettingsPage/>} {active==='bestPractices'&&<BestPracticesPage onOpenPermission={setPermissionTarget} onEdit={setManagedItemEditor}/>} {active==='automations'&&<AutomationsPage/>} {active==='connectors'&&<ConnectorsPage onOpenPermission={setPermissionTarget} onEdit={setManagedItemEditor}/>} {active==='applications'&&<ApplicationsPage onOpenPermission={setPermissionTarget} onEdit={setManagedItemEditor}/>} {active==='audit'&&<AuditPage onOpen={setAuditIndex}/>} {active==='models'&&<ModelsPage/>} {active==='modelUsage'&&<ModelUsagePage/>} {active==='sensitiveWords'&&<SensitiveWordsPage/>} {active==='permissions'&&<PermissionsPage/>} {active==='analytics'&&<AnalyticsPage/>} {active==='modelDefaults'&&<DefaultModelSettingsPage/>}</div></main>
    {permissionTarget&&<PermissionDialog target={permissionTarget} onClose={()=>setPermissionTarget('')}/>} {expertEditor&&<ExpertEditDialog row={expertEditor} onClose={()=>setExpertEditor(null)}/>} {managedItemEditor&&<ManagedItemEditDialog item={managedItemEditor} onClose={()=>setManagedItemEditor(null)}/>} {auditIndex!==null&&<AuditDialog row={auditRows[auditIndex]} onClose={()=>setAuditIndex(null)}/>} 
  </div>
}
