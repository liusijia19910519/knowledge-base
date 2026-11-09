import { useEffect, useRef, useState } from 'react'
import { publicAsset } from './publicAsset.js'
import { createPortal } from 'react-dom'
import {
  ArrowUp, BookBookmark, ChatCircleDots, File,
  Globe, ImageSquare, MagicWand, MagnifyingGlass,
  Robot, SidebarSimple, Sparkle, SquaresFour, StarFour, Textbox, DotsThree,
  PushPin, PencilSimple, Copy, Trash, ThumbsUp, ThumbsDown,
  ArrowCounterClockwise, ArrowClockwise, CheckCircle, CaretRight, Warning, X, AppWindow,
  Clock, Plus, CalendarBlank, Lightning, Play, CaretDown, Bell, Brain, Check,
  UploadSimple, Gear, ArrowUpRight, UserCircle, FolderOpen, List,
  Microphone, CircleNotch, ArrowsOutSimple, ArrowsInSimple,
  DownloadSimple, ShareNetwork,
  TextT, TextAlignLeft, LinkSimple, Code, PaintRoller, Eraser, ListNumbers,
  ArrowsDownUp, TextIndent, TextOutdent, Eye, Note, PencilLine, CornersOut,
  House, Books, Toolbox, ClipboardText, ChartBar, CheckSquare,
  Megaphone, Heart, GraduationCap, FileText, UsersThree,
  Archive, Briefcase, Lightbulb, FilePdf, FileDoc, FileXls,
  ProjectorScreenChart, UserPlus, Student, Gavel, Headset, Newspaper,
  Compass, Database, Buildings, ChalkboardTeacher, Notepad,
  BellRinging, ChartLineUp, Exam,
} from '@phosphor-icons/react'
import './styles.css'
import './detail-overrides.css'
import AdminConsole from './AdminConsole'

const menu = [
  [Plus, '新建对话'],
  [Buildings, '工作空间'],
  [Clock, '定时任务'],
  [Toolbox, '专家中心'],
  [SquaresFour, '技能中心'],
  [LinkSimple, '连接器'],
  [AppWindow, '应用中心'],
  [Books, '知识中心'],
]

const initialHistory = [
  { id: '中国籍持卡人订阅实操指南', title: '中国籍持卡人订阅实操指南', time: '5周前', dataKey: '中国籍持卡人订阅实操指南' },
  { id: 'OpenAI 账号注册信息一致', title: 'OpenAI 账号注册信息一致', time: '3天前', dataKey: 'OpenAI 账号注册信息一致' },
  { id: '环境与身份协同优化', title: '环境与身份协同优化', time: '1小时前', dataKey: '环境与身份协同优化' },
  { id: '中国籍持卡人风险防范与合', title: '中国籍持卡人风险防范与合', time: '1周前', dataKey: '中国籍持卡人风险防范与合' },
]

const workspaceConversationGroups = [
  {
    id: 'enterprise-ai-workspace',
    name: '企业AI智能体',
    conversations: [
      { id: '中国籍持卡人订阅实操指南', title: '打开原型文件', time: '3天前' },
    ],
  },
  {
    id: 'project-starter-workspace',
    name: '项目新手指引',
    conversations: [
      { id: 'OpenAI 账号注册信息一致', title: '介绍AI功能', time: '5天前' },
      { id: '环境与身份协同优化', title: '生成项目功能介绍', time: '10天前' },
    ],
  },
]

const historySummaries = {
  '中国籍持卡人订阅实操指南': '整理跨境支付、账户一致性与风险控制的完整检查清单，覆盖订阅准备、支付验证和后续管理，并补充异常扣款与订阅取消的处理建议。',
  'OpenAI 账号注册信息一致': '梳理账号注册、身份资料、设备环境和支付信息需要保持一致的关键事项，帮助减少验证失败、支付异常和账户恢复风险。',
  '环境与身份协同优化': '分析设备、网络、账户和支付信息之间的协同关系，并给出稳定使用环境、减少频繁变化和持续监测异常的建议。',
  '中国籍持卡人风险防范与合': '总结中国籍持卡人在跨境订阅中的资金安全、服务合规及争议处理要点，说明关键凭证留存和异常情况的应对方式。',
}

const chips = [
  [ClipboardText, '创建审批'],
  [CheckSquare, '待办任务'],
  [CalendarBlank, '预约会议'],
  [ChartBar, '数据分析'],
  [MagicWand, '帮我写作'],
  [Notepad, '会议纪要'],
]

const prompts = [
  [FileText, '公文写作', '通知、请示、函件等规范起草与润色'],
  [Notepad, '会议纪要', '提炼会议要点、决策结论与待办事项'],
  [Newspaper, '周报/月报', '汇总工作进展、成果问题与后续计划'],
  [ChartBar, '数据分析', '指标洞察、趋势研判与可视化总结'],
]

const practicePromptTemplates = {
  '公文写作': {
    description: '快速生成结构规范、语言严谨的企业公文',
    variables: [['文种','正式通知'],['主题','推进年度重点工作'],['发布对象','公司各部门'],['核心要求','说明工作目标、重点任务、责任分工、时间节点和报送要求']],
    template: '帮我起草一份关于「{{主题}}」的{{文种}}，面向{{发布对象}}发布。正文需要{{核心要求}}。语言规范严谨、结构清晰，符合企业公文格式，并提供可直接发布的完整正文。',
  },
  '会议纪要': {
    description: '从会议内容中提炼决策结论和行动事项',
    variables: [['会议主题','项目推进会'],['会议时间','今天 14:00'],['参会人员','项目组及相关部门负责人'],['会议内容','项目进展、当前问题、关键决策和后续安排']],
    template: '请根据{{会议时间}}召开的「{{会议主题}}」整理会议纪要，参会人员包括{{参会人员}}，会议主要讨论{{会议内容}}。请清晰呈现关键决策、存在问题和后续行动项，行动项需注明负责人和完成时限。',
  },
  '周报/月报': {
    description: '汇总阶段成果、问题风险与下一步计划',
    variables: [['汇报周期','本月'],['项目名称','企业 AI 智能体平台'],['主要进展','完成核心功能上线和首批用户试点'],['下阶段计划','优化使用体验并扩大推广范围']],
    template: '请为「{{项目名称}}」生成{{汇报周期}}工作报告。本周期主要进展为：{{主要进展}}；下阶段计划为：{{下阶段计划}}。请按工作概览、完成事项、成果数据、问题风险和后续计划的结构输出。',
  },
  '数据分析': {
    description: '围绕核心指标识别趋势、异常与改进机会',
    variables: [['数据范围','本季度核心经营数据'],['分析目标','识别趋势、异常和目标差距'],['核心指标','收入、成本、客户增长、转化率和目标达成率'],['输出形式','管理层易读的分析报告']],
    template: '请分析{{数据范围}}，围绕{{核心指标}}完成{{分析目标}}。请说明关键变化原因并给出改进建议，以{{输出形式}}输出，包含核心结论、关键指标、趋势对比、风险提示和下一步行动。',
  },
}

const conversationCopy = {
  '中国籍持卡人订阅实操指南': {
    question: '请整理一份中国籍持卡人订阅海外软件服务的实操指南。',
    title: '中国籍持卡人订阅实操指南',
    intro: '下面是一套兼顾支付成功率、账户一致性和风险控制的操作流程，可作为个人订阅前的检查清单。',
    sections: [
      ['一、订阅前准备', ['确认卡片已开通境外线上支付能力，并核对单笔与月度限额。', '账户姓名、账单地址和支付资料应保持真实且一致。', '提前确认服务商支持的地区、结算币种、税费与退款规则。', '核对免费试用期限和自动续费日期，避免产生非预期扣款。']],
      ['二、支付与验证', ['优先使用稳定的常用设备和可信网络完成登录与支付验证。', '填写卡片信息时逐项核对卡号、有效期、安全码及账单地址。', '出现验证失败时不要连续重复提交，应先检查银行拦截信息。', '保留订单号、付款凭证与服务商邮件，便于后续查询或申诉。']],
      ['三、订阅后的管理', ['支付完成后确认账户权益、套餐周期和下次续费时间是否正确。', '开启银行交易提醒，并定期检查正在生效的自动续费项目。', '需要取消时应在扣款日前完成操作，并保存取消成功的页面或邮件。', '发现重复扣款或权益未到账时，先联系服务商并附上完整订单信息。']],
    ],
  },
  'OpenAI 账号注册信息一致': {
    question: 'OpenAI 账号注册时，哪些信息需要保持一致？',
    title: '账号注册信息一致性检查清单',
    intro: '注册信息的一致性会直接影响验证、支付和后续账户恢复。建议重点检查以下项目。',
    sections: [
      ['一、身份与账户信息', ['姓名、所在地区与实际使用人信息保持一致。', '使用长期可访问的邮箱和手机号，避免临时接码服务。', '注册地区、设备语言、系统时区应与日常使用场景合理匹配。', '不要在短时间内频繁切换注册地区、设备或网络环境。']],
      ['二、支付信息', ['持卡人姓名、账单地址和银行卡预留信息保持一致。', '确认卡片支持相应币种和境外线上交易。', '支付失败后先确认原因，再进行下一次尝试。', '妥善保存订阅订单、账单和验证邮件。']],
      ['三、异常与账户恢复', ['提前完成邮箱和手机号验证，确保恢复渠道长期有效。', '遇到异常登录提醒时立即修改密码并检查活跃会话。', '提交申诉时使用真实信息，并提供订单号、账单和验证记录。', '重要资料定期备份，避免账号异常导致工作成果无法访问。']],
    ],
  },
  '环境与身份协同优化': {
    question: '请分析环境与身份信息如何协同优化，并给出可执行建议。',
    title: '环境与身份协同优化建议',
    intro: '优化的核心是减少异常变化，让设备、网络、账户和支付信息形成稳定、可解释的使用链路。',
    sections: [
      ['一、保持环境稳定', ['使用固定的常用设备和可信网络。', '浏览器语言、时区和账户地区保持合理一致。', '减少代理节点、设备指纹和登录地点的频繁变化。', '避免短时间内进行高频登录与重复验证。']],
      ['二、建立信息闭环', ['账户资料使用真实、长期有效的信息。', '重要操作前完成邮箱和手机号验证。', '支付资料与账户主体保持一致，并保留交易凭证。', '记录关键变更，便于异常时快速定位原因。']],
      ['三、持续监测与优化', ['建立登录、验证和支付失败的简单记录。', '按设备、网络和操作时间分析异常发生条件。', '每次只调整一个变量，验证有效后再固化使用方案。', '对于高风险或不确定操作，优先通过官方渠道确认。']],
    ],
  },
  '中国籍持卡人风险防范与合': {
    question: '请总结中国籍持卡人在跨境订阅中的风险防范与合规要点。',
    title: '跨境订阅风险防范与合规要点',
    intro: '应同时关注支付安全、服务条款、个人信息保护和费用管理，避免不必要的账户与资金风险。',
    sections: [
      ['一、资金与账户安全', ['使用本人账户和本人持有的合规支付工具。', '开启交易提醒并定期核对自动续费项目。', '为不同服务设置独立密码并启用多因素验证。', '不向第三方泄露验证码、密码或完整卡片信息。']],
      ['二、服务使用合规', ['阅读服务地区限制、内容政策和退款规则。', '不使用虚假身份或未经授权的支付信息。', '按照个人或企业的真实使用目的选择合适套餐。', '发现异常扣款时及时联系银行和服务商。']],
      ['三、争议处理与留痕', ['保留注册、验证、付款和取消订阅的关键页面记录。', '发生争议时先通过服务商官方支持渠道提交工单。', '工单未解决时携带完整证据联系发卡银行咨询。', '涉及企业费用时同步遵循内部采购、报销和数据安全制度。']],
    ],
  },
}

function Avatar({ small = false }) {
  return <img className={small ? 'avatar avatar-small' : 'avatar'} src={publicAsset("/ai-agent-avatar-v2.png")} alt="企业 AI 智能体" />
}

export function StandaloneDocumentPage({ name }) {
  const [activeFormats, setActiveFormats] = useState(['bold'])
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const [aiMessages, setAiMessages] = useState([])
  const [aiOverviewOpen, setAiOverviewOpen] = useState(true)
  const [aiPanelWidth, setAiPanelWidth] = useState(470)
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const [aiSelectedSkills, setAiSelectedSkills] = useState([])
  const [aiSelectedExpert, setAiSelectedExpert] = useState('')
  const [aiSelectedKnowledge, setAiSelectedKnowledge] = useState(name || '当前知识')
  const [aiKnowledgeLibraryOpen, setAiKnowledgeLibraryOpen] = useState(false)
  const [aiSelectedDocumentText, setAiSelectedDocumentText] = useState('')
  const [documentSelectionToolbar, setDocumentSelectionToolbar] = useState(null)
  const outline = ['今日摘要', '一、政策法规', '二、行业趋势', '三、企业创新', '四、技术应用', '五、投资动向', '数据来源说明']
  const sections = [
    ['一、政策法规', [
      ['2026年政府工作报告释放七大银发政策信号', '聚看 JUCAP · 2026-08-05', '实施中度以上失能老年人养老服务消费补贴，推动长期护理保险参保扩围，并加快完善居家、社区与机构相协调的养老服务体系。'],
      ['《养老服务消费补贴实施意见》发布', '民政部 · 2026-08-05', '面向重点人群发放电子消费券，支持助餐、助洁、康复护理等服务，进一步释放银发经济消费潜力。'],
    ]],
    ['二、行业趋势', [
      ['智慧康养设备进入规模化落地阶段', '行业观察 · 2026-08-06', '智能监测、辅助行动和健康管理设备的应用场景持续扩展，养老机构数字化改造需求明显增长。'],
      ['旅居康养成为区域文旅新增量', '产业研究 · 2026-08-06', '多地结合医疗、文旅和长期居住服务，探索跨区域康养服务网络和标准化产品。'],
    ]],
  ]
  const scrollToOutline = label => document.getElementById(`doc-${label}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const toggleFormat = format => setActiveFormats(current => current.includes(format) ? current.filter(item => item !== format) : [...current, format])
  const askDocumentAI = value => {
    const question = (value ?? aiMessage).trim()
    if (!question) return
    setAiMessages(current => [...current, { role: 'user', text: question }, { role: 'assistant', text: '已结合当前文档内容进行分析。这份文档聚焦政策法规、行业趋势、企业创新与技术应用，可以继续为你提炼要点、生成摘要或整理执行清单。' }])
    setAiMessage('')
  }
  const startAiPanelResize = event => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = aiPanelWidth
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const move = moveEvent => {
      const maxWidth = Math.max(360, Math.min(window.innerWidth * .55, window.innerWidth - 668))
      setAiPanelWidth(Math.round(Math.min(maxWidth, Math.max(280, startWidth + startX - moveEvent.clientX))))
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  const useSelectedDocumentText = event => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    if (!selectedText || !event.currentTarget.contains(selection.anchorNode) || !event.currentTarget.contains(selection.focusNode)) return
    const rect = selection.getRangeAt(0).getBoundingClientRect()
    setAiSelectedDocumentText(selectedText)
    setAiSelectedSkills(current => current.includes('帮我写作') ? current : [...current, '帮我写作'])
    setAiPanelOpen(true)
    setDocumentSelectionToolbar({ left: Math.max(340, Math.min(window.innerWidth - 340, rect.left + rect.width / 2)), top: Math.min(window.innerHeight - 66, rect.bottom + 10) })
  }
  useEffect(() => {
    if (!documentSelectionToolbar) return undefined
    const close = event => { if (!event.target.closest('.selection-writing-toolbar')) setDocumentSelectionToolbar(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [documentSelectionToolbar])
  const FormatButton = ({ format, label, children }) => <button className={activeFormats.includes(format) ? 'active' : ''} aria-label={label} title={label} aria-pressed={activeFormats.includes(format)} onClick={() => toggleFormat(format)}>{children}</button>
  return <main className="standalone-document-page">
    <header className="document-window-bar">
      <div className="document-window-title"><FileText size={20} weight="fill" /><strong>{name}</strong><StarFour size={18} /></div>
      <div className="document-window-actions"><span>上次编辑：08-06</span><button><ShareNetwork size={18} />分享</button><button><PencilSimple size={18} />编辑<CaretDown size={14} /></button><button aria-label="更多操作"><DotsThree size={21} weight="bold" /></button><button aria-label="搜索"><MagnifyingGlass size={20} /></button><img className="avatar avatar-small" src={publicAsset("/user-avatar.png")} alt="李鹏飞" /></div>
    </header>
    <div className={`document-format-toolbar ${toolbarCollapsed ? 'collapsed' : ''}`} role="toolbar" aria-label="文档编辑工具栏">
      <div className="document-toolbar-controls">
        <button title="菜单"><List size={19} />菜单</button><button title="插入内容"><Plus size={18} weight="bold" />插入</button><button title="AI 创作"><Sparkle size={18} />AI 创作</button><span className="document-toolbar-divider" />
        <button aria-label="撤销" title="撤销"><ArrowCounterClockwise size={18} /></button><button aria-label="重做" title="重做"><ArrowClockwise size={18} /></button><button aria-label="格式刷" title="格式刷"><PaintRoller size={18} /></button><button aria-label="清除格式" title="清除格式"><Eraser size={18} /></button><span className="document-toolbar-divider" />
        <button title="字体">默认<CaretDown size={13} /></button><button title="段落样式">标题2<CaretDown size={13} /></button><button title="字号">18<CaretDown size={13} /></button><span className="document-toolbar-divider" />
        <FormatButton format="bold" label="加粗"><strong>B</strong></FormatButton><FormatButton format="italic" label="斜体"><em>I</em></FormatButton><FormatButton format="underline" label="下划线"><u>U</u></FormatButton><FormatButton format="strike" label="删除线"><s>S</s></FormatButton>
        <button title="文字颜色"><span className="toolbar-color-letter">A</span><CaretDown size={12} /></button><button title="高亮颜色"><span className="toolbar-highlight-mark">▱</span><CaretDown size={12} /></button><span className="document-toolbar-divider" />
        <button aria-label="项目列表" title="项目列表"><List size={18} /><CaretDown size={12} /></button><button aria-label="编号列表" title="编号列表"><ListNumbers size={18} /><CaretDown size={12} /></button><button aria-label="任务列表" title="任务列表"><CheckSquare size={18} /></button><button aria-label="插入链接" title="插入链接"><LinkSimple size={18} /></button>
        <button aria-label="行距" title="行距"><ArrowsDownUp size={18} /><CaretDown size={12} /></button><button aria-label="对齐" title="对齐方式"><TextAlignLeft size={18} /><CaretDown size={12} /></button><button aria-label="减少缩进" title="减少缩进"><TextOutdent size={18} /></button><button aria-label="增加缩进" title="增加缩进"><TextIndent size={18} /></button><span className="document-toolbar-divider" />
        <button aria-label="查找" title="查找"><MagnifyingGlass size={18} /></button><button className="toolbar-at" aria-label="提及" title="@ 提及">@</button><button aria-label="评论" title="添加评论"><ChatCircleDots size={18} /></button>
      </div>
      <button className="document-toolbar-collapse" aria-label={toolbarCollapsed ? '展开工具栏' : '收起工具栏'} title={toolbarCollapsed ? '展开工具栏' : '收起工具栏'} onClick={() => setToolbarCollapsed(value => !value)}><CaretDown size={20} /></button>
    </div>
    <div className={`document-workspace${aiPanelOpen ? '' : ' ai-panel-closed'}`} style={{ gridTemplateColumns: aiPanelOpen ? `248px minmax(420px, 1fr) ${aiPanelWidth}px` : '248px minmax(420px, 1fr)' }}>
      <aside className="document-outline" aria-label="文档大纲">
        <div><strong>大纲</strong><button aria-label="收起大纲"><X size={17} /></button></div>
        <p>{name}</p>
        <nav>{outline.map((item, index) => <button key={item} className={index === 1 ? 'active' : ''} onClick={() => scrollToOutline(item)}>{item}</button>)}</nav>
      </aside>
      <section className="document-scroll-area">
        {!aiPanelOpen && <button className="document-ai-open-button" type="button" aria-label="打开 AI 面板" title="打开问AI" onClick={() => setAiPanelOpen(true)}><Sparkle size={22} weight="fill" /></button>}
        <article className="document-sheet" onMouseUp={useSelectedDocumentText}>
          <h1>{name}</h1>
          <div className="document-meta"><UserCircle size={18} />李鹏飞&nbsp; 编辑 <span /> <Clock size={18} />08-06 10:58 创建</div>
          <section className="document-summary" id="doc-今日摘要"><h2>📊 今日摘要</h2><p>2026年政府工作报告释放七大银发政策信号，长期护理保险参保人数持续增长，多地布局旅居康养与智慧养老新场景。银发经济规模稳步扩大，智慧康养装备创新加速落地。</p></section>
          {sections.map(([heading, rows]) => <section className="document-report-section" id={`doc-${heading}`} key={heading}><h2>{heading}</h2><table><thead><tr><th>标题</th><th>来源/时间</th><th>摘要</th></tr></thead><tbody>{rows.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></section>)}
          {outline.slice(3).map(heading => <section className="document-report-section document-placeholder-section" id={`doc-${heading}`} key={heading}><h2>{heading}</h2><p>本章节汇总相关动态、代表性案例与关键数据，供后续分析和决策参考。</p></section>)}
        </article>
      </section>
      {aiPanelOpen && <aside className="document-ai-panel" aria-label="AI 对话">
        <div className="document-ai-resize-handle" role="separator" aria-label="调整 AI 面板宽度" aria-orientation="vertical" aria-valuemin="280" aria-valuemax={Math.round(Math.max(360, Math.min(window.innerWidth * .55, window.innerWidth - 668)))} aria-valuenow={aiPanelWidth} onPointerDown={startAiPanelResize} />
        <header className="document-ai-header">
          <strong><Sparkle size={18} weight="fill" />问AI</strong>
          <div><button aria-label="新建对话"><Plus size={19} /></button><button aria-label="对话历史"><Clock size={19} /></button><button aria-label="关闭 AI 面板" title="关闭" onClick={() => setAiPanelOpen(false)}><X size={19} /></button></div>
        </header>
        <div className="conversation-scroll document-ai-conversation-scroll">
          <article className="conversation-body">
            <section className="document-ai-overview">
              <button className="document-ai-section-title" onClick={() => setAiOverviewOpen(value => !value)}><span>知识概览<Sparkle size={13} weight="fill" /></span><CaretDown size={16} className={aiOverviewOpen ? '' : 'closed'} /></button>
              {aiOverviewOpen && <>
                <p>这份文档汇总了银发经济的最新动态，重点覆盖<strong>政策法规、行业趋势、企业创新、技术应用与投资动向</strong>。内容围绕长期护理保险、养老服务消费补贴和智慧康养场景，为行业研判和业务决策提供参考。</p>
                <div className="document-ai-actions"><button><FileText size={16} weight="fill" />知识总结</button><button><ProjectorScreenChart size={16} weight="fill" />PPT制作</button><button><ChartBar size={16} weight="fill" />思维导图</button><button><BookBookmark size={16} weight="fill" />知识图解</button></div>
                <div className="document-ai-related"><span>相关知识</span><button><FileText size={16} />2026 银发经济政策与行业趋势报告</button></div>
              </>}
            </section>
            {aiMessages.length ? aiMessages.map((item, index) => item.role === 'user'
              ? <div className="question-bubble" key={`${item.role}-${index}`}>{item.text}</div>
              : <div className="answer-block" key={`${item.role}-${index}`}><div className="answer-brand"><span><Robot size={18} /></span><div><strong>企业 AI 智能体</strong><small>已结合当前文档</small></div></div><p>{item.text}</p><div className="answer-footer"><div><button aria-label="复制回答"><Copy size={17} /></button><button aria-label="重新生成"><ArrowCounterClockwise size={17} /></button><button aria-label="有帮助"><ThumbsUp size={17} /></button><button aria-label="无帮助"><ThumbsDown size={17} /></button></div><time>刚刚</time></div></div>)
              : <div className="document-ai-empty"><Robot size={28} /><strong>针对当前文档提问</strong><p>我可以帮你总结、分析或改写文档内容</p></div>}
          </article>
        </div>
        <div className={`composer conversation-composer document-ai-system-composer${aiSelectedDocumentText ? ' has-preview-selection' : ''}`}>
          {aiSelectedDocumentText && <div className="preview-selection-chip" aria-label="引用的文档内容"><span>{aiSelectedDocumentText}</span><button type="button" aria-label="移除引用内容" onClick={() => { setAiSelectedDocumentText(''); setDocumentSelectionToolbar(null) }}><X size={13} /></button></div>}
          {!!aiSelectedSkills.length && <div className="composer-skill-chips" aria-label="已选择技能">
            {aiSelectedSkills.map(skill => <span className="composer-skill-chip" key={skill}><Sparkle size={13} weight="fill" /><span>{skill}</span><button type="button" aria-label={`移除技能${skill}`} onClick={() => setAiSelectedSkills(current => current.filter(item => item !== skill))}><X size={11} weight="bold" /></button></span>)}
          </div>}
          <textarea className={`${aiSelectedSkills.length ? 'has-skill-chips ' : ''}${aiSelectedDocumentText ? 'has-preview-selection' : ''}`} value={aiMessage} onChange={event => setAiMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); askDocumentAI() } }} placeholder={aiSelectedSkills.length || aiSelectedKnowledge || aiSelectedDocumentText ? '' : '继续追问，或输入“/”调用技能或专家、“@”指定知识'} />
          <div className="composer-bottom">
            <div className="composer-tools"><ModePicker /><CapabilityPicker onSkillSelect={skill => setAiSelectedSkills(current => current.includes(skill) ? current : [...current, skill])} selected={aiSelectedExpert} onExpertSelect={setAiSelectedExpert} /><KnowledgePicker value={aiSelectedKnowledge} onChange={setAiSelectedKnowledge} onChooseMore={() => setAiKnowledgeLibraryOpen(true)} /></div>
            <div className="send-tools"><button className="web-search" aria-label="开启联网搜索"><Globe size={20} /></button><i /><button className="voice-input" aria-label="开始语音输入"><Microphone size={20} /></button><button className="send" aria-label="发送" onClick={() => askDocumentAI()}><ArrowUp size={22} weight="bold" /></button></div>
          </div>
          {aiKnowledgeLibraryOpen && <KnowledgeLibraryModal onClose={() => setAiKnowledgeLibraryOpen(false)} onConfirm={names => { setAiSelectedKnowledge(names.join('、')); setAiKnowledgeLibraryOpen(false) }} />}
        </div>
        <p className="ai-content-disclaimer">内容由 AI 生成，请核实重要信息。</p>
      </aside>}
    </div>
    {documentSelectionToolbar && <div className="selection-writing-toolbar" style={{left: documentSelectionToolbar.left, top: documentSelectionToolbar.top}} role="toolbar" aria-label="选中文本操作" onMouseDown={event => event.preventDefault()}>
      <button className="ai-rewrite" type="button" onClick={() => setDocumentSelectionToolbar(null)}><span className="rewrite-avatar">👩🏻</span><span>AI 改写</span></button><i />
      <button className="with-caret" type="button" aria-label="文本样式"><TextT size={23} /><CaretDown size={14} /></button><i /><button className="with-caret" type="button" aria-label="对齐"><TextAlignLeft size={22} /><CaretDown size={14} /></button><i />
      <button type="button" aria-label="加粗"><b>B</b></button><button type="button" aria-label="删除线"><s>S</s></button><button type="button" aria-label="斜体"><em>I</em></button><button type="button" aria-label="下划线"><u>U</u></button><button type="button" aria-label="链接"><LinkSimple size={21} /></button><button type="button" aria-label="代码"><Code size={22} /></button><button className="highlight-tool with-caret" type="button" aria-label="高亮"><span>A</span><CaretDown size={14} /></button><i />
      <button className="copy-tool" type="button" aria-label="复制选中文字" onClick={() => navigator.clipboard?.writeText(aiSelectedDocumentText)}><Copy size={20} /><span>复制</span></button><i /><button type="button" aria-label="添加评论"><ChatCircleDots size={22} /></button>
    </div>}
    <footer className="document-status-bar" aria-label="文档状态栏">
      <div className="document-status-left">
        <button>页面：1/1</button><button>字数：500</button><button>拼写检查：打开<CaretDown size={11} /></button><button>AI 校对</button><button className="status-warning"><Warning size={14} weight="fill" />缺失字体</button>
      </div>
      <div className="document-status-right">
        <button aria-label="阅读视图" title="阅读视图"><Eye size={17} /></button><button className="active" aria-label="页面视图" title="页面视图"><Note size={17} /></button><button aria-label="大纲视图" title="大纲视图"><List size={17} /></button><button aria-label="网页视图" title="网页视图"><Globe size={17} /></button><button aria-label="编辑模式" title="编辑模式"><PencilLine size={17} /></button><button aria-label="适应窗口" title="适应窗口"><CornersOut size={17} /></button>
        <button className="zoom-value">100%<CaretDown size={11} /></button><button aria-label="缩小">−</button><input aria-label="缩放比例" type="range" min="50" max="200" defaultValue="100" /><button aria-label="放大">＋</button><button aria-label="全屏" title="全屏"><ArrowsOutSimple size={17} /></button>
      </div>
    </footer>
  </main>
}

const conversationModes = [
  { label: '快速问答', description: '直接回答，适合日常咨询', icon: ChatCircleDots },
  { label: '深度思考', description: '深入分析复杂问题', icon: Brain },
  { label: '计划模式', description: '先制定计划，确认后再执行', icon: CalendarBlank },
  { label: 'Agent模式', description: '规划步骤并调用工具执行', icon: Robot },
]

function ModePicker() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('Agent模式')
  const rootRef = useRef(null)
  const CurrentIcon = conversationModes.find(item => item.label === mode)?.icon || Robot

  useEffect(() => {
    if (!open) return undefined
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return <div className="mode-picker" ref={rootRef}>
    <button className="mode-trigger active" type="button" aria-haspopup="menu" aria-expanded={open} aria-pressed="true" onClick={() => setOpen(!open)}>
      <CurrentIcon size={19} />{mode}<CaretDown size={13} />
    </button>
    {open && <div className="mode-menu" role="menu" aria-label="选择对话模式">
      <div className="mode-menu-title">对话模式</div>
      {conversationModes.map(({ label, description, icon: Icon }) => <button key={label} type="button" role="menuitemradio" aria-checked={mode === label} className={mode === label ? 'selected' : ''} onClick={() => { setMode(label); setOpen(false) }}>
        <span className="mode-icon"><Icon size={18} /></span>
        <span className="mode-copy"><strong>{label}</strong><small>{description}</small></span>
        {mode === label && <Check className="mode-check" size={16} weight="bold" />}
      </button>)}
    </div>}
  </div>
}

const knowledgeOptions = [
  { label: '添加本地文件', description: '使用当前设备添加的文件与内容', icon: File },
  { label: '全部知识', description: '在可访问的全部企业知识中检索', icon: Database },
  { label: '从知识中心选择', description: '指定一个或多个知识库作为来源', icon: Books },
]

const formatLocalFileSize = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function KnowledgePicker({ value, onChange, onChooseMore, selectionCount = 0, onClear }) {
  const [open, setOpen] = useState(false)
  const [localSelected, setLocalSelected] = useState('')
  const [localFiles, setLocalFiles] = useState([])
  const [composerRoot, setComposerRoot] = useState(null)
  const rootRef = useRef(null)
  const fileInputRef = useRef(null)
  const selected = value === undefined ? localSelected : value
  const setSelection = next => {
    setLocalSelected(next)
    onChange?.(next)
  }

  useEffect(() => {
    if (!open) return undefined
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  useEffect(() => {
    setComposerRoot(rootRef.current?.closest('.composer') || null)
  }, [])

  useEffect(() => {
    if (!composerRoot) return undefined
    composerRoot.classList.toggle('has-file-attachments', localFiles.length > 0)
    return () => composerRoot.classList.remove('has-file-attachments')
  }, [composerRoot, localFiles.length])

  const hasSelection = Boolean(selected || selectionCount)
  const displayLabel = selectionCount > 1 ? String(selectionCount) : selected || '知识'
  const matchedKnowledgeOption = knowledgeOptions.find(item => item.label === selected)
  const CurrentIcon = selectionCount ? Books : selected ? matchedKnowledgeOption?.icon || File : Books
  return <div className={`knowledge-picker${hasSelection ? ' has-selection' : ''}`} ref={rootRef}>
    <input
      ref={fileInputRef}
      className="knowledge-file-input"
      type="file"
      multiple
      aria-label="选择本地文件"
      onChange={event => {
        const files = Array.from(event.target.files || [])
        if (!files.length) return
        setLocalFiles(current => {
          const known = new Set(current.map(file => `${file.name}-${file.size}-${file.lastModified}`))
          return [...current, ...files.filter(file => !known.has(`${file.name}-${file.size}-${file.lastModified}`))]
        })
        setOpen(false)
        event.target.value = ''
      }}
    />
    <button className={open || hasSelection ? 'knowledge-trigger active' : 'knowledge-trigger'} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><CurrentIcon size={18} />{displayLabel}{!hasSelection && <CaretDown size={13} />}</button>
    {hasSelection && <button className="knowledge-clear" type="button" aria-label="移除知识范围" title="移除知识范围" onClick={() => { setSelection(''); onClear?.(); setOpen(false) }}><X size={11} weight="bold" /></button>}
    {open && <div className="knowledge-menu" role="menu" aria-label="指定知识范围">
      <div className="knowledge-menu-title">知识范围</div>
      {knowledgeOptions.map(({ label, description, icon: Icon }) => <button key={label} type="button" role="menuitemradio" aria-checked={selected === label} className={selected === label ? 'selected' : ''} onClick={() => { if (label === '添加本地文件') { setOpen(false); fileInputRef.current?.click(); return } if (label === '从知识中心选择' && onChooseMore) { setOpen(false); onChooseMore(); return } setSelection(label); setOpen(false) }}>
        <span className="knowledge-option-icon"><Icon size={17} /></span>
        <span><strong>{label}</strong><small>{description}</small></span>
        {selected === label && <Check size={15} weight="bold" />}
      </button>)}
    </div>}
    {composerRoot && localFiles.length > 0 && createPortal(<div className="composer-file-attachments" aria-label="已添加本地文件">
      {localFiles.map(file => <article className="composer-file-attachment" key={`${file.name}-${file.size}-${file.lastModified}`}>
        <span className="composer-file-icon"><FileText size={18} /></span>
        <span className="composer-file-copy"><strong title={file.name}>{file.name}</strong><small>{formatLocalFileSize(file.size)}</small></span>
        <button type="button" aria-label={`移除文件 ${file.name}`} title="移除文件" onClick={() => setLocalFiles(current => current.filter(item => item !== file))}><X size={12} weight="bold" /></button>
      </article>)}
    </div>, composerRoot)}
  </div>
}

function ContextUsageButton() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return <div className="context-usage-picker" ref={rootRef}>
    {open && <div className="context-usage-popover" role="status">38.2% · 64.2K / 168.0K 上下文已使用</div>}
    <button className={open ? 'context-usage active' : 'context-usage'} type="button" aria-label="上下文已使用 38.2%，64.2K / 168.0K" aria-expanded={open} onClick={() => setOpen(current => !current)}><span className="context-ring-base"><CircleNotch size={23} weight="bold" /></span></button>
  </div>
}

const capabilityOptions = {
  技能: [
    ['创建审批', '填写并提交审批表单，快速发起审批流程', ClipboardText, 'skill-blue'],
    ['待办任务', '创建、拆解和跟进待办任务', CheckSquare, 'skill-amber'],
    ['预约会议', '协调会议时间、参会人与议程', CalendarBlank, 'skill-cobalt'],
    ['数据分析', '分析业务数据，识别趋势与异常', ChartBar, 'skill-indigo'],
    ['帮我写作', '起草、改写和润色各类内容', MagicWand, 'skill-pink'],
    ['会议纪要', '整理会议内容、决议与待办', Notepad, 'skill-blue'],
    ['工作总结', '归纳工作成果、问题与后续计划', Newspaper, 'skill-amber'],
    ['周报/月报', '汇总阶段进展并生成结构化报告', CalendarBlank, 'skill-cobalt'],
    ['起草合同', '根据业务条件起草合同初稿', FileDoc, 'skill-indigo'],
    ['合同审查', '识别合同风险、缺失条款与修改点', Gavel, 'skill-pink'],
    ['制度解读', '提炼制度要点并解答执行问题', Books, 'skill-blue'],
    ['PPT智能生成', '根据主题与素材生成结构完整的演示文稿', ProjectorScreenChart, 'skill-amber'],
    ['Excel表格处理', '整理、计算和分析 Excel 表格数据', FileXls, 'skill-green'],
    ['PDF 转 Word', '将 PDF 内容转换为可编辑的 Word 文档', FilePdf, 'skill-cobalt'],
  ],
  专家: [
    ['资深秘书', '综合事务统筹与高管支持', Briefcase, 'expert-wine'],
    ['会议秘书', '会议筹备、记录与行动跟进', Notepad, 'expert-blue'],
    ['知识专家', '企业知识检索、解读与沉淀', Books, 'expert-mint'],
    ['数据分析师', '数据洞察、指标分析与可视化', ChartLineUp, 'expert-yellow'],
    ['行政助理', '行政事务、通知与资源协调', Buildings, 'expert-green'],
    ['法务专家', '合同、制度与合规风险审查', Gavel, 'expert-wine'],
    ['汇报助手', '工作汇报、总结与演示内容整理', ProjectorScreenChart, 'expert-blue'],
    ['政策顾问', '政策追踪、影响分析与执行建议', Newspaper, 'expert-mint'],
    ['招聘助理', '候选人筛选、面试筹备与人才评估', UserPlus, 'expert-yellow'],
    ['人力资源专家', '覆盖招聘、绩效、薪酬、人才发展等10大模块', UsersThree, 'expert-blue'],
  ],
}

function CapabilityPicker({ onSkillSelect, selected = '', onExpertSelect }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('技能')
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => searchRef.current?.focus())
  }, [open, type])

  useEffect(() => {
    if (!open) return undefined
    const close = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const options = capabilityOptions[type].filter(([name, description]) => `${name}${description}`.toLowerCase().includes(query.trim().toLowerCase()))
  const selectedOption = Object.values(capabilityOptions).flat().find(([name]) => name === selected)
  const SelectedIcon = selectedOption?.[2] || SquaresFour
  const selectedTone = selectedOption?.[3] || ''
  const capabilityCategories = [
    ['专家', UserCircle],
    ['技能', Lightning],
  ]
  const chooseOption = name => {
    if (type === '技能') {
      onSkillSelect?.(name)
    } else {
      onExpertSelect?.(selected === name ? '' : name)
    }
    setOpen(false)
  }

  return <div className="capability-picker" ref={rootRef}>
    <div className={`capability-trigger-shell ${selected ? 'has-selection' : ''}`}>
      <button className={open || selected ? 'capability-trigger active' : 'capability-trigger'} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        {selected ? <span className={`capability-icon capability-selected-icon ${selectedTone}`}><SelectedIcon size={13} /></span> : <SquaresFour size={18} />}
        <span>{selected || '技能/专家'}</span>{!selected && <CaretDown className="capability-caret" size={13} />}
      </button>
      {selected && <button className="capability-clear" type="button" aria-label={`移除${selected}`} title="移除选择" onClick={event => {
        event.stopPropagation()
        onExpertSelect?.('')
        setQuery('')
        setOpen(false)
      }}><X size={11} /></button>}
    </div>
    {open && <div className="capability-flyout" role="dialog" aria-label="调用技能或专家">
      <div className="capability-primary-menu" role="menu" aria-label="能力分类">
        {capabilityCategories.map(([label, Icon]) => <button key={label} type="button" role="menuitem" className={type === label ? 'active' : ''} onPointerEnter={() => { if (label === '技能' || label === '专家') { setType(label); setQuery('') } }} onClick={() => { if (label === '技能' || label === '专家') { setType(label); setQuery('') } }}>
          <Icon size={17} /><span>{label}</span><CaretRight size={14} />
        </button>)}
      </div>
      <div className="capability-menu">
        <label className="capability-search"><MagnifyingGlass size={16} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && options.length) {
            event.preventDefault()
            chooseOption(options[0][0])
          }
        }} placeholder={`搜索${type}`} /></label>
        <div className="capability-list">
          {options.map(([name, description, Icon, tone]) => <button key={name} type="button" className={type === '专家' && selected === name ? 'selected' : ''} onClick={() => chooseOption(name)}>
            <span className={`capability-icon ${tone}`}><Icon size={17} /></span>
            <span><strong>{name}</strong><small>{description}</small></span>
            {type === '专家' && selected === name && <Check size={15} weight="bold" />}
          </button>)}
          {!options.length && <div className="capability-empty">未找到相关{type}</div>}
        </div>
        <div className="capability-footer">
          {type === '技能' ? <>
            <button type="button"><UploadSimple size={17} /><span>从本地添加技能</span></button>
            <button type="button"><Gear size={17} /><span>管理技能</span></button>
          </> : <button type="button"><ArrowUpRight size={17} /><span>召唤更多专家</span></button>}
        </div>
      </div>
    </div>}
  </div>
}

function SlashCapabilityMenu({ onSkillSelect, onExpertSelect }) {
  const [type, setType] = useState('技能')
  const options = capabilityOptions[type]
  const choose = name => type === '技能' ? onSkillSelect(name) : onExpertSelect(name)

  return <div className="capability-slash-menu" role="dialog" aria-label="通过斜杠调用技能或专家">
    <div className="capability-slash-tabs" role="tablist">
      {['技能', '专家'].map(label => <button key={label} type="button" role="tab" aria-selected={type === label} className={type === label ? 'active' : ''} onClick={() => setType(label)}>{label} ({capabilityOptions[label].length})</button>)}
    </div>
    <div className="capability-slash-list">
      {options.map(([name, description, Icon, tone], index) => <button key={name} type="button" className={index === 0 ? 'highlighted' : ''} onClick={() => choose(name)}>
        <span className={`capability-icon ${tone}`}><Icon size={17} /></span>
        <strong>{name}</strong><span>{description}</span><PushPin className="slash-pin" size={16} />
      </button>)}
    </div>
  </div>
}

const mentionKnowledgeOptions = [
  ['李鹏飞的个人知识库', '', FolderOpen],
  ['无标题', '', File],
  ['文档', '', File],
  ['示例知识库', '', FolderOpen],
  ['【示例】在线文档：如何创作一篇文档', '', File],
]

function KnowledgeMentionMenu({ onSelect, onMore }) {
  return <div className="knowledge-mention-menu" role="dialog" aria-label="选择知识">
    <div className="knowledge-mention-list" role="listbox" aria-label="可用知识">
      {mentionKnowledgeOptions.map(([name, badge, Icon]) => <button key={name} type="button" role="option" aria-selected="false" onClick={() => onSelect(name)}>
        <Icon size={18} /><span>{name}</span>{badge && <small>{badge}</small>}
      </button>)}
    </div>
    <button className="knowledge-mention-more" type="button" onClick={onMore}><Books size={18} /><span>从知识中心选择更多</span><CaretRight size={16} /></button>
  </div>
}

function KnowledgeLibraryModal({ onClose, onConfirm }) {
  const [tab, setTab] = useState('知识库目录')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState([])
  const directories = [
    ['知识库', FolderOpen],
    ['个人知识库', FolderOpen],
    ['无标题', File],
    ['产品资料', FolderOpen],
  ].filter(([name]) => name.includes(query.trim()))
  const toggle = name => setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name])

  return createPortal(<div className="knowledge-library-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="knowledge-library-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-library-title">
      <header><h2 id="knowledge-library-title">选择更多</h2><button type="button" aria-label="关闭知识库选择" onClick={onClose}><X size={20} /></button></header>
      <div className="knowledge-library-toolbar">
        <div className="knowledge-library-tabs" role="tablist">{['最近使用', '知识库目录'].map(name => <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}</div>
        <label><MagnifyingGlass size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索知识库、知识" /></label>
      </div>
      <div className="knowledge-library-browser">
        <div className="knowledge-library-column library-column">
          <h3>知识库</h3>
          {['李鹏飞的个人知识库', '示例知识库'].map((name, index) => <label className={index === 0 ? 'active' : ''} key={name}><input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} /><FolderOpen size={20} /><span>{name}</span><CaretRight size={16} /></label>)}
        </div>
        <div className="knowledge-library-column directory-column">
          <h3>知识库目录</h3>
          {directories.map(([name, Icon]) => <label key={name}>{Icon === FolderOpen ? <CaretRight className="directory-expand" size={15} /> : <span className="directory-expand-placeholder" />}<input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} /><Icon size={20} /><span>{name}</span></label>)}
          {!directories.length && <div className="knowledge-library-empty">未找到相关知识</div>}
        </div>
      </div>
      <footer><button type="button" onClick={onClose}>取消</button><button className="primary" type="button" disabled={!selected.length} onClick={() => onConfirm(selected)}>确认</button></footer>
    </section>
  </div>, document.body)
}

function PracticePromptModal({ title, onClose, onUse }) {
  const config = practicePromptTemplates[title]
  const [values,setValues] = useState(()=>Object.fromEntries(config.variables))
  const prompt = config.template.replace(/\{\{(.*?)\}\}/g,(_,key)=>values[key]||`[${key}]`)
  const templateParts = config.template.split(/(\{\{.*?\}\})/g)
  return createPortal(<div className="practice-prompt-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="practice-prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-prompt-title"><header><span><Lightbulb size={21} weight="fill"/></span><div><h2 id="practice-prompt-title">{title}</h2><p>{config.description}</p></div><button aria-label="关闭" onClick={onClose}><X size={19}/></button></header><div className="practice-prompt-body"><section><h3>填写变量</h3><p>修改下方内容，完整提示词会自动更新。</p><div className="practice-variable-fields">{config.variables.map(([name])=><label key={name}><span>{name}</span><input value={values[name]} onChange={event=>setValues(current=>({...current,[name]:event.target.value}))}/></label>)}</div></section><section><h3>提示词预览</h3><p>蓝色内容为你可以修改的变量。</p><div className="practice-template-preview">{templateParts.map((part,index)=>{const match=part.match(/^\{\{(.*?)\}\}$/);return match?<mark key={`${part}-${index}`}>{values[match[1]]||`[${match[1]}]`}</mark>:<span key={`${part}-${index}`}>{part}</span>})}</div></section></div><footer><button onClick={onClose}>取消</button><button className="primary" onClick={()=>onUse(prompt)}><ChatCircleDots size={16}/>使用此提示词</button></footer></section></div>,document.body)
}

const getInitialKnowledgeContext = () => {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('askKnowledge') || ''
}

export function App() {
  const initialKnowledgeContext = getInitialKnowledgeContext()
  const [message, setMessage] = useState('')
  const [active, setActive] = useState('')
  const [sent, setSent] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [quickMessage, setQuickMessage] = useState(false)
  const [slashCapabilityOpen, setSlashCapabilityOpen] = useState(false)
  const [knowledgeMentionOpen, setKnowledgeMentionOpen] = useState(false)
  const [knowledgeLibraryOpen, setKnowledgeLibraryOpen] = useState(false)
  const [selectedPractice, setSelectedPractice] = useState('')
  const [selectedQuickActions, setSelectedQuickActions] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [selectedKnowledge, setSelectedKnowledge] = useState(() => initialKnowledgeContext ? [initialKnowledgeContext] : [])
  const [knowledgeScope, setKnowledgeScope] = useState(initialKnowledgeContext)
  const [selectedExpert, setSelectedExpert] = useState('')
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [voiceSeconds, setVoiceSeconds] = useState(0)
  const [voiceTranscribed, setVoiceTranscribed] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [historyItems, setHistoryItems] = useState(initialHistory)
  const [historyMenuId, setHistoryMenuId] = useState('')
  const [workspaceConversationMenuId, setWorkspaceConversationMenuId] = useState('')
  const [historyOpen, setHistoryOpen] = useState(true)
  const [workspaceChatsOpen, setWorkspaceChatsOpen] = useState(true)
  const [expandedWorkspaceChats, setExpandedWorkspaceChats] = useState(() => new Set(workspaceConversationGroups.map(group => group.id)))
  const [workspaceOpenRequest, setWorkspaceOpenRequest] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [colorMode, setColorMode] = useState('light')
  const [renameRequest, setRenameRequest] = useState(null)
  const [deleteRequestId, setDeleteRequestId] = useState('')
  const activeHistory = historyItems.find(item => item.id === active)
  const isHistoryConversation = Boolean(activeHistory)
  const isHistoryOverview = active === 'history-overview'
  const isWorkspace = active === '工作空间'
  const isScheduledTasks = active === '定时任务'
  const isAgentsCenter = active === '专家中心'
  const isSkillsCenter = active === '技能中心'
  const isConnectorsCenter = active === '连接器'
  const isApplicationsCenter = active === '应用中心'
  const isKnowledgeCenter = active === '知识中心'

  useEffect(() => {
    if (!historyMenuId) return undefined
    const closeMenu = event => {
      if (!event.target.closest('.history-context-menu') && !event.target.closest('.history-more')) setHistoryMenuId('')
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [historyMenuId])

  useEffect(() => {
    if (!workspaceConversationMenuId) return undefined
    const closeMenu = event => {
      if (!event.target.closest('.workspace-conversation-context-menu') && !event.target.closest('.workspace-conversation-more')) setWorkspaceConversationMenuId('')
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [workspaceConversationMenuId])

  useEffect(() => {
    if (!profileMenuOpen) return undefined
    const closeProfileMenu = event => {
      if (!event.target.closest('.sidebar-profile')) setProfileMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeProfileMenu)
    return () => document.removeEventListener('pointerdown', closeProfileMenu)
  }, [profileMenuOpen])

  useEffect(() => {
    if (!slashCapabilityOpen) return undefined
    const closeSlashMenu = event => {
      if (event.target.closest('.capability-slash-menu')) return
      setSlashCapabilityOpen(false)
      setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
    }
    document.addEventListener('pointerdown', closeSlashMenu)
    return () => document.removeEventListener('pointerdown', closeSlashMenu)
  }, [slashCapabilityOpen])

  useEffect(() => {
    if (!knowledgeMentionOpen) return undefined
    const closeKnowledgeMenu = event => {
      if (event.target.closest('.knowledge-mention-menu')) return
      setKnowledgeMentionOpen(false)
    }
    document.addEventListener('pointerdown', closeKnowledgeMenu)
    return () => document.removeEventListener('pointerdown', closeKnowledgeMenu)
  }, [knowledgeMentionOpen])

  useEffect(() => {
    if (!voiceRecording) return undefined
    const timer = window.setInterval(() => setVoiceSeconds(seconds => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [voiceRecording])

  const pinConversation = id => setHistoryItems(items => {
    const selected = items.find(item => item.id === id)
    return selected ? [selected, ...items.filter(item => item.id !== id)] : items
  })

  const renameConversation = (id, title) => setHistoryItems(items => items.map(item => item.id === id ? { ...item, title: title.trim() || item.title } : item))

  const copyConversation = id => {
    const source = historyItems.find(item => item.id === id)
    if (!source) return
    const copy = { ...source, id: `${source.dataKey}-${Date.now()}`, title: `${source.title} 副本`, time: '刚刚' }
    setHistoryItems(items => [copy, ...items])
    setActive(copy.id)
  }

  const deleteConversation = id => {
    setHistoryItems(items => items.filter(item => item.id !== id))
    setActive('')
    setMessage('')
  }

  const submit = () => {
    if (!message.trim() && !selectedQuickActions.length) return
    setSent(true)
    window.setTimeout(() => setSent(false), 1800)
  }

  const insertSkill = name => {
    setSelectedSkills(current => current.includes(name) ? current : [...current, name])
    setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
    setSlashCapabilityOpen(false)
    setQuickMessage(false)
  }

  const insertKnowledge = name => {
    setSelectedKnowledge(current => current.includes(name) ? current : [...current, name])
    setKnowledgeMentionOpen(false)
  }

  const chooseSlashExpert = name => {
    setSelectedExpert(name)
    setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
    setSlashCapabilityOpen(false)
  }

  const toggleVoiceRecording = () => {
    if (!voiceRecording) {
      setVoiceSeconds(0)
      setVoiceTranscribed(false)
      setVoiceRecording(true)
      return
    }
    setVoiceRecording(false)
    setMessage(current => `${current}${current && !current.endsWith(' ') ? ' ' : ''}请帮我整理今天的会议纪要，并提炼待办事项。`)
    setQuickMessage(false)
    setVoiceTranscribed(true)
    window.setTimeout(() => setVoiceTranscribed(false), 1800)
  }

  const voiceDuration = `${String(Math.floor(voiceSeconds / 60)).padStart(2, '0')}:${String(voiceSeconds % 60).padStart(2, '0')}`

  const startSidebarResize = event => {
    if (sidebarCollapsed) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const move = moveEvent => setSidebarWidth(Math.min(420, Math.max(240, startWidth + moveEvent.clientX - startX)))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }

  const askKnowledge = knowledgeName => {
    const url = new URL(window.location.origin)
    url.searchParams.set('askKnowledge', knowledgeName || '全部知识')
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }

  const standaloneDocumentName = new URLSearchParams(window.location.search).get('document')
  const adminMode = new URLSearchParams(window.location.search).get('admin') === '1'
  if (adminMode) return <AdminConsole />
  if (standaloneDocumentName) return <StandaloneDocumentPage name={standaloneDocumentName} />

  return <div className="page-canvas">
    <div className={`${sidebarCollapsed ? 'prototype sidebar-collapsed' : 'prototype'}${colorMode === 'dark' ? ' theme-dark' : ''}`} style={{ gridTemplateColumns: `${sidebarCollapsed ? 58 : sidebarWidth}px minmax(0,1fr)` }}>
      <aside className="sidebar">
        <header className="identity">
          <Avatar small />
          <strong>企业AI数字员工</strong>
          <button className="sidebar-toggle" aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}><SidebarSimple size={19} weight="regular" /></button>
        </header>

        <nav className="main-nav">
          {menu.map(([Icon, label]) => <button key={label} onClick={() => { setActive(label === '新建对话' ? '' : label); if (label === '新建对话') { setMessage(''); setSelectedQuickActions([]); setSelectedSkills([]); setSelectedKnowledge([]); setSelectedExpert(''); setKnowledgeScope('') } }} className={active === label ? 'active' : ''}>
            <Icon size={20} weight="regular" />
            <span>{label}</span>
          </button>)}
        </nav>

        <section className="history">
          <button className="history-title" type="button" aria-expanded={historyOpen} onClick={() => { setHistoryOpen(value => !value); setHistoryMenuId('') }}>
            <span>历史对话</span>
            <small>（{historyItems.length}）</small>
            <CaretDown className={historyOpen ? 'expanded' : ''} size={14} />
          </button>
          {historyOpen && historyItems.map(({ id, title, time }) => <div className="history-item-wrap" key={id}>
            <button onClick={() => { setActive(id); setHistoryMenuId(''); setRenameRequest(null) }} className={`history-item-button ${active === id ? 'active' : ''}`}>
              <ChatCircleDots size={16} />
              <span>{title}</span>
              <time className="history-time">{time}</time>
              <span className="history-more" role="button" tabIndex={0} aria-label="更多操作" onClick={e => { e.stopPropagation(); setHistoryMenuId(historyMenuId === id ? '' : id) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setHistoryMenuId(historyMenuId === id ? '' : id) } }}><DotsThree size={20} weight="bold" /></span>
            </button>
            {historyMenuId === id && <div className="history-context-menu" role="menu">
              <button role="menuitem" onClick={() => { pinConversation(id); setHistoryMenuId('') }}><PushPin size={18} />{historyItems[0]?.id === id ? '已置顶' : '置顶'}</button>
              <button role="menuitem" onClick={() => { setActive(id); setRenameRequest({ id, nonce: Date.now() }); setHistoryMenuId('') }}><PencilSimple size={18} />重命名</button>
              <button role="menuitem" onClick={() => { copyConversation(id); setHistoryMenuId('') }}><Copy size={18} />复制</button>
              <button className="danger" role="menuitem" onClick={() => { setActive(id); setDeleteRequestId(id); setHistoryMenuId('') }}><Trash size={18} />删除</button>
            </div>}
          </div>)}
        </section>

        <section className="workspace-conversations" aria-label="工作空间对话">
          <button className="workspace-conversations-title" type="button" aria-expanded={workspaceChatsOpen} onClick={() => setWorkspaceChatsOpen(value => !value)}>
            <span>工作空间</span>
            <small>（{workspaceConversationGroups.length}）</small>
            <CaretDown className={workspaceChatsOpen ? 'expanded' : ''} size={14} />
          </button>
          {workspaceChatsOpen && workspaceConversationGroups.map(group => {
            const expanded = expandedWorkspaceChats.has(group.id)
            return <div className="workspace-conversation-group" key={group.id}>
              <button className="workspace-conversation-group-title" type="button" aria-expanded={expanded} onClick={event => {
                if (event.target.closest('.workspace-conversation-group-name')) {
                  setWorkspaceOpenRequest({ name: group.name, nonce: Date.now() })
                  setActive('工作空间')
                  return
                }
                setExpandedWorkspaceChats(current => {
                const next = new Set(current)
                if (next.has(group.id)) next.delete(group.id)
                else next.add(group.id)
                return next
                })
              }}>
                <ShareNetwork size={16} />
                <span className="workspace-conversation-group-name" title={`进入${group.name}`}>{group.name}</span>
                <CaretDown className={expanded ? 'expanded' : ''} size={14} />
              </button>
              {expanded && <div className="workspace-conversation-list">
                {group.conversations.map(item => {
                  const menuId = `${group.id}-${item.id}`
                  return <div className="workspace-conversation-item-wrap" key={`${group.id}-${item.title}`}>
                    <button className={`workspace-conversation-item ${active === item.id ? 'active' : ''}`} type="button" onClick={() => { setActive(item.id); setHistoryMenuId(''); setWorkspaceConversationMenuId(''); setRenameRequest(null) }}>
                      <span className="workspace-conversation-name">{item.title}</span>
                      <time>{item.time}</time>
                      <span className="workspace-conversation-more" role="button" tabIndex={0} aria-label={`${item.title}更多操作`} aria-expanded={workspaceConversationMenuId === menuId} onClick={event => { event.preventDefault(); event.stopPropagation(); setWorkspaceConversationMenuId(current => current === menuId ? '' : menuId) }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setWorkspaceConversationMenuId(current => current === menuId ? '' : menuId) } }}><DotsThree size={18} weight="bold" /></span>
                    </button>
                    {workspaceConversationMenuId === menuId && <div className="history-context-menu workspace-conversation-context-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { pinConversation(item.id); setWorkspaceConversationMenuId('') }}><PushPin size={17} />置顶</button>
                      <button type="button" role="menuitem" onClick={() => { setActive(item.id); setRenameRequest({ id: item.id, nonce: Date.now() }); setWorkspaceConversationMenuId('') }}><PencilSimple size={17} />重命名</button>
                      <button type="button" role="menuitem" onClick={() => { copyConversation(item.id); setWorkspaceConversationMenuId('') }}><Copy size={17} />复制</button>
                      <button className="danger" type="button" role="menuitem" onClick={() => { setActive(item.id); setDeleteRequestId(item.id); setWorkspaceConversationMenuId('') }}><Trash size={17} />删除</button>
                    </div>}
                  </div>
                })}
              </div>}
            </div>
          })}
        </section>

        <footer className="sidebar-profile">
          <img src={publicAsset("/user-avatar.png")} alt="李鹏飞" role="button" tabIndex={0} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(value => !value)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setProfileMenuOpen(value => !value) } }} />
          <span className="sidebar-profile-copy"><strong>李鹏飞</strong><small>人力资源总监</small></span>
          <button className="sidebar-notification" aria-label="消息，3 条未读">
            <Bell size={18} />
            <span className="notification-badge" aria-hidden="true">3</span>
          </button>
          {profileMenuOpen && <div className="sidebar-profile-menu" role="menu">
            <div className="sidebar-profile-menu-user"><img src={publicAsset("/user-avatar.png")} alt="" /><span><strong>李鹏飞</strong><small>187298389</small></span></div>
            <button type="button" role="menuitem" onClick={() => setProfileMenuOpen(false)}><Gear size={18} />个人设置</button>
            <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); const url = new URL(window.location.href); url.search = ''; url.hash = ''; url.searchParams.set('admin', '1'); window.location.assign(url.toString()) }}><Buildings size={18} />管理后台</button>
            <div className="sidebar-profile-appearance"><span><PaintRoller size={18} />外观</span><div role="group" aria-label="外观模式"><button className={colorMode === 'light' ? 'active' : ''} type="button" aria-pressed={colorMode === 'light'} onClick={() => setColorMode('light')}>浅色</button><button className={colorMode === 'dark' ? 'active' : ''} type="button" aria-pressed={colorMode === 'dark'} onClick={() => setColorMode('dark')}>深色</button></div></div>
            <button type="button" role="menuitem" onClick={() => setProfileMenuOpen(false)}><ArrowUpRight size={18} />退出系统</button>
          </div>}
        </footer>
        {!sidebarCollapsed && <div className="sidebar-resize-handle" role="separator" aria-label="调整主侧栏宽度" aria-orientation="vertical" aria-valuemin="240" aria-valuemax="420" aria-valuenow={sidebarWidth} onPointerDown={startSidebarResize} />}
      </aside>

      <main className={isHistoryConversation ? 'main-content conversation-mode' : isHistoryOverview ? 'main-content history-overview-mode' : isWorkspace ? 'main-content workspace-mode' : isScheduledTasks ? 'main-content scheduled-tasks-mode' : isAgentsCenter ? 'main-content agents-center-mode' : isSkillsCenter ? 'main-content skills-center-mode' : isConnectorsCenter ? 'main-content connectors-center-mode' : isApplicationsCenter ? 'main-content applications-center-mode' : isKnowledgeCenter ? 'main-content knowledge-center-mode' : 'main-content'}>
        {isHistoryConversation ? <ConversationPage key={`${activeHistory.id}-${renameRequest?.id === activeHistory.id ? renameRequest.nonce : ''}-${deleteRequestId === activeHistory.id ? 'delete' : ''}`} data={conversationCopy[activeHistory.dataKey]} displayTitle={activeHistory.title} isPinned={historyItems[0]?.id === activeHistory.id} initialEditing={renameRequest?.id === activeHistory.id} initialDeleteConfirm={deleteRequestId === activeHistory.id} onPin={() => pinConversation(activeHistory.id)} onRename={title => { renameConversation(activeHistory.id, title); setRenameRequest(null) }} onCancelRename={() => setRenameRequest(null)} onCopy={() => copyConversation(activeHistory.id)} onDelete={() => { deleteConversation(activeHistory.id); setDeleteRequestId('') }} onCancelDelete={() => setDeleteRequestId('')} message={message} setMessage={setMessage} submit={submit} sent={sent} webSearch={webSearch} setWebSearch={setWebSearch} /> : isHistoryOverview ? <HistoryOverview items={historyItems} onOpen={id => setActive(id)} /> : isWorkspace ? <WorkspacePage initialProjectRequest={workspaceOpenRequest} /> : isScheduledTasks ? <ScheduledTasksPage /> : isAgentsCenter ? <AgentsCenterPage onSummon={name => { setActive(''); setMessage(''); setSelectedQuickActions([]); setSelectedSkills([]); setSelectedKnowledge([]); setSelectedExpert(name); setQuickMessage(false) }} /> : isSkillsCenter ? <SkillsCenterPage onUse={name => { setActive(''); setMessage(''); setSelectedQuickActions([]); setSelectedSkills([name]); setSelectedKnowledge([]); setSelectedExpert(''); setQuickMessage(false) }} /> : isConnectorsCenter ? <ConnectorsCenterPage /> : isApplicationsCenter ? <ApplicationsCenterPage /> : isKnowledgeCenter ? <KnowledgeCenterPage onAskAI={askKnowledge} /> : <>
        <section className="welcome">
          <div className="greeting"><h1>HI～我是你的工作伙伴</h1></div>

          <div className="chips">
            {chips.map(([Icon, label]) => <button key={label} onClick={() => {
              setSelectedSkills(current => current.includes(label) ? current : [...current, label])
              setMessage('')
              setQuickMessage(false)
            }}><Icon size={18} weight="fill" />{label}</button>)}
            <button className="more-skills" aria-label="查看更多技能" title="更多技能" onClick={() => setActive('技能中心')}><CaretRight size={19} weight="bold" /></button>
          </div>

          <div className="composer-mascot" aria-hidden="true"><img src={publicAsset("/workbuddy-cat-mascot.png")} alt="" /></div>
          <div className={`composer ${sent ? 'sent' : ''}`}>
            {slashCapabilityOpen && <SlashCapabilityMenu onSkillSelect={insertSkill} onExpertSelect={chooseSlashExpert} />}
            {knowledgeMentionOpen && <KnowledgeMentionMenu onSelect={insertKnowledge} onMore={() => { setKnowledgeMentionOpen(false); setKnowledgeLibraryOpen(true) }} />}
            {!!(selectedQuickActions.length || selectedSkills.length || selectedKnowledge.length) && <div className="composer-skill-chips" aria-label="已选择快捷操作、技能和知识">
              {selectedQuickActions.map(name => {
                const QuickActionIcon = chips.find(([, label]) => label === name)?.[0] || Sparkle
                return <span className="composer-skill-chip" key={name}>
                  <QuickActionIcon size={13} weight="fill" /><span>{name}</span>
                  <button type="button" aria-label={`移除快捷操作${name}`} onClick={() => setSelectedQuickActions(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button>
                </span>
              })}
              {selectedSkills.map(name => <span className="composer-skill-chip" key={name}>
                <Sparkle size={13} weight="fill" /><span>{name}</span>
                <button type="button" aria-label={`移除技能${name}`} onClick={() => setSelectedSkills(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button>
              </span>)}
              {selectedKnowledge.map(name => <span className="composer-skill-chip knowledge-chip" key={name}>
                <Books size={13} weight="fill" /><span>{name}</span>
                <button type="button" aria-label={`移除知识${name}`} onClick={() => setSelectedKnowledge(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button>
              </span>)}
            </div>}
            <textarea className={`${quickMessage ? 'quick-message ' : ''}${selectedQuickActions.length || selectedSkills.length || selectedKnowledge.length ? 'has-skill-chips' : ''}`} value={message} onChange={e => { setMessage(e.target.value); setQuickMessage(false) }} onKeyDown={e => {
              if (e.key === 'Escape' && knowledgeMentionOpen) { e.preventDefault(); setKnowledgeMentionOpen(false); return }
              if (e.key === '@' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setSlashCapabilityOpen(false); setKnowledgeMentionOpen(true); return }
              if (e.key === 'Escape' && slashCapabilityOpen) {
                e.preventDefault()
                setSlashCapabilityOpen(false)
                setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
                return
              }
              if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                setMessage(current => `${current}/`)
                setSlashCapabilityOpen(true)
                return
              }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
            }} placeholder={selectedSkills.length ? '' : '发消息或输入“/”调用技能或专家，“@”指定知识'} />
            <div className="composer-bottom">
              <div className="composer-tools">
                <ModePicker />
                <CapabilityPicker onSkillSelect={insertSkill} selected={selectedExpert} onExpertSelect={setSelectedExpert} />
                <KnowledgePicker value={selectedKnowledge.length === 1 ? selectedKnowledge[0] : knowledgeScope} selectionCount={selectedKnowledge.length} onChange={next => { setKnowledgeScope(next); if (next) setSelectedKnowledge([]) }} onClear={() => { setSelectedKnowledge([]); setKnowledgeScope('') }} onChooseMore={() => setKnowledgeLibraryOpen(true)} />
              </div>
              <div className="send-tools">
                <button className={webSearch ? 'web-search active' : 'web-search'} aria-label={webSearch ? '关闭联网搜索' : '开启联网搜索'} aria-pressed={webSearch} onClick={() => setWebSearch(!webSearch)}><Globe size={22} /></button>
                <i />
                <button className={voiceRecording ? 'voice-input active' : 'voice-input'} aria-label={voiceRecording ? `停止语音输入，已录制${voiceDuration}` : '开始语音输入'} aria-pressed={voiceRecording} title={voiceRecording ? '停止语音输入' : '语音输入'} onClick={toggleVoiceRecording}><Microphone size={22} weight={voiceRecording ? 'fill' : 'regular'} /></button>
                <button className="send" aria-label="发送" onClick={submit}><ArrowUp size={25} weight="bold" /></button>
              </div>
            </div>
            {sent && <div className="toast">消息已发送</div>}
            {voiceRecording && <div className="voice-status recording" role="status"><Microphone size={13} weight="fill" />正在录音 <strong>{voiceDuration}</strong></div>}
            {voiceTranscribed && <div className="voice-status transcribed" role="status"><CheckCircle size={14} weight="fill" />语音转写完成</div>}
          </div>
        </section>

        <section className="prompt-section">
          <div className="prompt-heading"><strong>试试最佳实践</strong><button>全部 <span>›</span></button></div>
          <div className="prompt-grid">
            {prompts.map(([Icon, title, desc]) => <button key={title} className="prompt-card" onClick={() => setSelectedPractice(title)}>
              <span className="prompt-icon"><Icon size={21} weight="fill" /></span>
              <div><strong>{title}</strong><span>{desc}</span></div>
            </button>)}
          </div>
        </section>
        </>}
      </main>
      {knowledgeLibraryOpen && <KnowledgeLibraryModal onClose={() => setKnowledgeLibraryOpen(false)} onConfirm={names => { names.forEach(insertKnowledge); setKnowledgeLibraryOpen(false) }} />}
      {selectedPractice && <PracticePromptModal key={selectedPractice} title={selectedPractice} onClose={()=>setSelectedPractice('')} onUse={prompt=>{setMessage(prompt);setQuickMessage(false);setSelectedPractice('')}}/>}
    </div>
  </div>
}

const workspaceKnowledgeBases = ['资源中心', '项目知识库', '技术文档库']

function CreateWorkspaceModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const nameInputRef = useRef(null)

  useEffect(() => {
    nameInputRef.current?.focus()
    const closeOnEscape = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const toggleKnowledgeBase = item => setKnowledgeBases(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])
  const submit = () => {
    const projectName = name.trim()
    if (!projectName) return
    onCreate(projectName)
  }

  return createPortal(<div className="workspace-create-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="workspace-create-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-create-title">
      <header><h2 id="workspace-create-title">新建空间</h2><button type="button" aria-label="关闭新建空间" onClick={onClose}><X size={25} /></button></header>
      <div className="workspace-create-body">
        <label className="workspace-create-field"><strong>空间名称</strong><input ref={nameInputRef} maxLength={15} value={name} onChange={event => setName(event.target.value)} placeholder="请输入空间名称" /><small>{name.length}/15</small></label>
        <div className={`workspace-addon-row workspace-knowledge-row ${knowledgeOpen ? 'expanded' : ''}`}>
          <button type="button" className="workspace-addon-trigger" aria-expanded={knowledgeOpen} onClick={() => setKnowledgeOpen(value => !value)}><span><strong>知识库</strong>{knowledgeBases.length > 0 && <em>{knowledgeBases.length}</em>}</span><span><Plus size={15} />添加</span></button>
          {knowledgeOpen && <div className="workspace-addon-options">{workspaceKnowledgeBases.map(item => <button type="button" className={knowledgeBases.includes(item) ? 'selected' : ''} key={item} onClick={() => toggleKnowledgeBase(item)}>{knowledgeBases.includes(item) && <Check size={14} weight="bold" />}{item}</button>)}</div>}
        </div>
      </div>
      <footer><div><button type="button" onClick={onClose}>取消</button><button type="button" className="primary" disabled={!name.trim()} onClick={submit}>确定</button></div></footer>
    </section>
  </div>, document.body)
}

function WorkspaceUnifiedComposer({ projectName, selectedAssets = [], onClearAssets }) {
  const [message, setMessage] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [selectedKnowledge, setSelectedKnowledge] = useState([])
  const [selectedExpert, setSelectedExpert] = useState('')
  const [knowledgeLibraryOpen, setKnowledgeLibraryOpen] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [sent, setSent] = useState(false)
  const submit = () => {
    if (!message.trim()) return
    setSent(true)
    setMessage('')
    window.setTimeout(() => setSent(false), 1600)
  }
  return <>
    <div className={`composer conversation-composer workspace-detail-composer${sent ? ' sent' : ''}`}>
      {!!(selectedSkills.length || selectedKnowledge.length) && <div className="composer-skill-chips" aria-label="已选择技能和知识">
        {selectedSkills.map(name => <span className="composer-skill-chip" key={name}><Sparkle size={13} weight="fill" /><span>{name}</span><button type="button" aria-label={`移除技能${name}`} onClick={() => setSelectedSkills(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button></span>)}
        {selectedKnowledge.map(name => <span className="composer-skill-chip knowledge-chip" key={name}><Books size={13} weight="fill" /><span>{name}</span><button type="button" aria-label={`移除知识${name}`} onClick={() => setSelectedKnowledge(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button></span>)}
      </div>}
      <textarea className={selectedSkills.length || selectedKnowledge.length ? 'has-skill-chips' : ''} value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder={`在「${projectName}」中发消息，或调用技能、专家和知识`} />
      <div className="composer-bottom"><div className="composer-tools"><ModePicker /><CapabilityPicker onSkillSelect={name => setSelectedSkills(current => current.includes(name) ? current : [...current, name])} selected={selectedExpert} onExpertSelect={setSelectedExpert} /><KnowledgePicker value={selectedAssets.length === 1 ? selectedAssets[0] : selectedKnowledge.length === 1 ? selectedKnowledge[0] : ''} selectionCount={selectedAssets.length || selectedKnowledge.length} onClear={() => { if (selectedAssets.length) onClearAssets?.(); else setSelectedKnowledge([]) }} onChooseMore={() => setKnowledgeLibraryOpen(true)} /></div><div className="send-tools"><ContextUsageButton /><button className={webSearch ? 'web-search active' : 'web-search'} aria-label={webSearch ? '关闭联网搜索' : '开启联网搜索'} aria-pressed={webSearch} onClick={() => setWebSearch(value => !value)}><Globe size={22} /></button><i /><button className="voice-input" aria-label="开始语音输入"><Microphone size={22} /></button><button className="send" aria-label="发送" onClick={submit}><ArrowUp size={25} weight="bold" /></button></div></div>
      {sent && <div className="toast">消息已发送</div>}
      {knowledgeLibraryOpen && <KnowledgeLibraryModal onClose={() => setKnowledgeLibraryOpen(false)} onConfirm={names => { setSelectedKnowledge(names); setKnowledgeLibraryOpen(false) }} />}
    </div>
    <p className="ai-content-disclaimer workspace-detail-disclaimer">内容由 AI 生成，请核实重要信息。</p>
  </>
}

function WorkspaceDetailPage({ project, onBack }) {
  const [activeTab, setActiveTab] = useState('对话')
  const [selectedAssets, setSelectedAssets] = useState([])
  const [conversations, setConversations] = useState([
    { id: 1, title: '打开原型文件', time: '3 天前' },
    { id: 2, title: '优化工作伙伴输入体验', time: '1 小时前' },
    { id: 3, title: '设计工作空间详情页', time: '刚刚' },
  ])
  const [conversationMenuId, setConversationMenuId] = useState(null)
  const [pinnedConversationIds, setPinnedConversationIds] = useState(() => new Set([1]))
  useEffect(() => {
    if (conversationMenuId === null) return undefined
    const closeMenu = event => {
      if (!event.target.closest('.workspace-detail-conversation-menu') && !event.target.closest('.workspace-detail-conversation-more')) setConversationMenuId(null)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [conversationMenuId])
  const togglePinnedConversation = id => {
    setPinnedConversationIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setConversations(current => {
      const selected = current.find(item => item.id === id)
      return selected ? [selected, ...current.filter(item => item.id !== id)] : current
    })
    setConversationMenuId(null)
  }
  const renameWorkspaceConversation = conversation => {
    const nextTitle = window.prompt('重命名对话', conversation.title)?.trim()
    if (nextTitle) setConversations(current => current.map(item => item.id === conversation.id ? { ...item, title: nextTitle } : item))
    setConversationMenuId(null)
  }
  const copyWorkspaceConversation = conversation => {
    setConversations(current => [...current, { ...conversation, id: Date.now(), title: `${conversation.title} 副本`, time: '刚刚' }])
    setConversationMenuId(null)
  }
  const deleteWorkspaceConversation = id => {
    setConversations(current => current.filter(item => item.id !== id))
    setConversationMenuId(null)
  }
  const assets = [
    ['企业 AI 智能体需求说明.docx', '文档 · 更新于今天', FileDoc, 'blue'],
    ['工作空间交互原型.fig', '设计稿 · 更新于昨天', ImageSquare, 'purple'],
    ['项目排期与里程碑.xlsx', '表格 · 更新于 3 天前', FileXls, 'green'],
    ['原型评审纪要.pdf', 'PDF · 更新于 5 天前', FilePdf, 'red'],
  ]
  return <section className="workspace-detail-page">
    <header className="workspace-detail-header"><button type="button" aria-label="返回工作空间" onClick={onBack}><CaretRight size={19} weight="bold" /></button><span className="workspace-detail-icon"><ShareNetwork size={21} weight="bold" /></span><div><h1>{project.name}</h1><p>{project.time}</p></div><button className="workspace-detail-settings" type="button" aria-label="空间设置"><Gear size={19} /></button></header>
    <div className="workspace-detail-tabs" role="tablist" aria-label="空间内容"><button type="button" role="tab" aria-selected={activeTab === '对话'} className={activeTab === '对话' ? 'active' : ''} onClick={() => setActiveTab('对话')}>对话<span>{conversations.length}</span></button><button type="button" role="tab" aria-selected={activeTab === '资产'} className={activeTab === '资产' ? 'active' : ''} onClick={() => setActiveTab('资产')}>资产<span>{assets.length}</span></button></div>
    <div className="workspace-detail-content">
      {activeTab === '对话' ? <section className="workspace-conversation-panel"><div className="workspace-detail-conversation-list">{conversations.map(conversation => <div className="workspace-detail-conversation-item" key={conversation.id}>
        <button type="button" className="workspace-detail-conversation-row"><span className="workspace-conversation-chat-icon"><ChatCircleDots size={21} /></span><strong>{conversation.title}</strong><i aria-label="活跃" /><span className="workspace-conversation-row-spacer" /><time>{conversation.time}</time></button>
        <button type="button" className="workspace-detail-conversation-more" aria-label={`${conversation.title}更多操作`} aria-expanded={conversationMenuId === conversation.id} onClick={() => setConversationMenuId(current => current === conversation.id ? null : conversation.id)}><DotsThree size={20} weight="bold" /></button>
        {conversationMenuId === conversation.id && <div className="history-context-menu workspace-detail-conversation-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => togglePinnedConversation(conversation.id)}><PushPin size={18} />{pinnedConversationIds.has(conversation.id) ? '已置顶' : '置顶'}</button>
          <button type="button" role="menuitem" onClick={() => renameWorkspaceConversation(conversation)}><PencilSimple size={18} />重命名</button>
          <button type="button" role="menuitem" onClick={() => copyWorkspaceConversation(conversation)}><Copy size={18} />复制</button>
          <button className="danger" type="button" role="menuitem" onClick={() => deleteWorkspaceConversation(conversation.id)}><Trash size={18} />删除</button>
        </div>}
      </div>)}</div></section> : <section className="workspace-asset-knowledge-inline"><KnowledgeLibraryDetail name="资源中心" onBack={() => setActiveTab('对话')} showAskAI={false} onSelectionChange={setSelectedAssets} /></section>}
    </div>
    <WorkspaceUnifiedComposer projectName={project.name} selectedAssets={selectedAssets} onClearAssets={() => setSelectedAssets([])} />
  </section>
}

function WorkspacePage({ initialProjectRequest }) {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState([
    { name: '企业AI智能体', time: '添加于 6 天前' },
    { name: '项目新手指引', time: '添加于 9 天前', external: true },
  ])
  const [notice, setNotice] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  useEffect(() => {
    if (!initialProjectRequest?.name) return
    const requestedProject = projects.find(project => project.name === initialProjectRequest.name)
    if (requestedProject) setActiveProject(requestedProject)
  }, [initialProjectRequest?.nonce])
  const filteredProjects = projects.filter(project => project.name.toLowerCase().includes(query.trim().toLowerCase()))
  const createProject = name => {
    const nextName = name || `新建项目 ${projects.length + 1}`
    if (!projects.some(project => project.name === nextName)) setProjects(current => [{ name: nextName, time: '刚刚创建' }, ...current])
    setCreateOpen(false)
    setNotice(`已创建「${nextName}」`)
    window.setTimeout(() => setNotice(''), 1600)
  }
  if (activeProject) return <WorkspaceDetailPage project={activeProject} onBack={() => setActiveProject(null)} />
  return <section className="workspace-page">
    <header className="workspace-hero">
      <div className="workspace-hero-copy">
        <h1>工作空间</h1>
        <p>让工作高效有序</p>
        <button type="button" onClick={() => setCreateOpen(true)}><Plus size={17} weight="bold" />创建空间</button>
      </div>
      <img src={publicAsset("/workspace-team-illustration.png")} alt="团队与 AI 数字员工协同办公" />
    </header>

    <div className="workspace-section-heading">
      <h2>我的工作空间</h2>
      <label className="workspace-search"><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索" /></label>
    </div>
    <div className="workspace-project-grid">
      {filteredProjects.map(project => <button className="workspace-project-card" key={project.name} type="button" onClick={() => setActiveProject(project)}>
        <span className="workspace-project-icon"><ShareNetwork size={22} weight="bold" /></span>
        <span><strong>{project.name}</strong><small>{project.time}</small></span>
        <DotsThree size={21} weight="bold" />
      </button>)}
      {!filteredProjects.length && <div className="workspace-empty">没有找到相关项目</div>}
    </div>

    {createOpen && <CreateWorkspaceModal onClose={() => setCreateOpen(false)} onCreate={createProject} />}
    {notice && <div className="workspace-notice" role="status">{notice}</div>}
  </section>
}

const applicationSeed = [
  ['管理后台', '统一管理组织、权限与企业策略', Gear, 'mint'],
  ['公文系统', '公文拟稿、流转、签批与归档', FileText, 'sky'],
  ['会议系统', '会议预约、纪要与行动项跟进', CalendarBlank, 'blue'],
  ['审批系统', '集中处理审批申请与流程进度', CheckCircle, 'indigo'],
  ['数据看板', '经营指标、趋势与异常实时洞察', ChartBar, 'purple'],
  ['公告系统', '企业通知、制度与公告统一发布', BellRinging, 'green'],
  ['人力资源系统', '员工档案、招聘与组织协同', UsersThree, 'cyan'],
]

function ApplicationsCenterPage() {
  const [selected, setSelected] = useState('')
  return <section className="applications-page">
    <header className="applications-hero">
      <img src={publicAsset("/app-center-banner.png")} alt="企业数字化协作场景" />
      <div className="applications-hero-copy"><h1>打造高效组织，从这里开始</h1><p>Build an efficient organization, start here.</p></div>
    </header>
    <div className="applications-grid">
      {applicationSeed.map(([title, description, Icon, tone]) => <button className={`application-card ${selected === title ? 'active' : ''}`} key={title} onClick={() => {
        setSelected(title)
        if (title === '管理后台') { const url = new URL(window.location.origin); url.searchParams.set('admin', '1'); window.open(url.toString(), '_blank', 'noopener,noreferrer') }
        if (title === '审批系统') window.location.assign('http://demo.docmis.cn:45001/sq-saas-ui-oa/center?defaultSystem=sq-saas-ui-oa')
      }}>
        <span className={`application-icon ${tone}`}><Icon size={25} weight="fill" /></span>
        <span className="application-copy"><strong>{title}</strong><small>{description}</small></span>
        <CaretRight className="application-arrow" size={17} weight="bold" />
      </button>)}
    </div>
    {selected && <div className="application-feedback" role="status">正在打开「{selected}」</div>}
  </section>
}

const knowledgeSeed = [
  ['资源中心', '制度、模板与公共业务资料', FolderOpen, 'ocean', 286, 'created'],
  ['项目知识库', '项目方案、过程材料与复盘沉淀', Briefcase, 'ice', 128, 'created'],
  ['领域知识库', '行业规范、专业方法与专家经验', Lightbulb, 'night', 96, 'joined'],
  ['档案中心', '已归档文件与历史成果统一查询', Archive, 'amber', 364, 'joined'],
]

const knowledgeDocumentSeed = [
  ['中国籍持卡人订阅实操指南', '我的知识库', '李鹏飞', '今天 13:30', 'owned'],
  ['企业级 Agent 工作平台完整设计文档', '项目知识库', '李鹏飞', '昨天 10:11', 'owned'],
  ['企业数字员工平台产品设计方案', '与我共享', '产品团队', '昨天 10:03', 'shared'],
  ['知识库内容治理规范', '资源中心', '李鹏飞', '8月9日 15:19', 'owned'],
  ['各系统优化问题清单', '与我共享', '张尧', '8月7日 10:30', 'shared'],
  ['用户意图识别研究', '项目知识库', '李鹏飞', '8月3日 18:44', 'owned'],
  ['AI 协同知识库可行性报告', '领域知识库', '研究组', '8月1日 14:26', 'shared'],
  ['产品架构图', '我的知识库', '李鹏飞', '7月31日 09:27', 'favorite'],
]

function KnowledgeHomeContent({ query, setQuery, onOpenDocument }) {
  const [tab, setTab] = useState('recent')
  const visible = knowledgeDocumentSeed.filter(([title, location, owner, , group]) => (tab === 'recent' || tab === group) && `${title}${location}${owner}`.includes(query.trim()))
  return <>
    <header className="knowledge-home-header"><h1>主页</h1><label><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索文档" /></label></header>
    <div className="knowledge-home-actions"><button><Plus size={22} weight="bold" /><span><strong>新建</strong><small>新建文档开始协作</small></span><CaretDown size={15} /></button><button><UploadSimple size={22} /><span><strong>上传</strong><small>上传本地文件</small></span><CaretDown size={15} /></button><button><MagicWand size={22} weight="fill" /><span><strong>模板库</strong><small>选择模板快速新建</small></span><CaretRight size={15} /></button></div>
    <div className="knowledge-home-toolbar"><div role="tablist" aria-label="文档范围">{[['recent', '最近访问'], ['owned', '我共享的'], ['shared', '与我共享'], ['favorite', '收藏']].map(([value, label]) => <button className={tab === value ? 'active' : ''} role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)}>{label}</button>)}</div><button><List size={17} />显示设置</button></div>
    <div className="knowledge-document-table"><div className="knowledge-document-row head"><span>标题</span><span>位置</span><span>所有者</span><span>最近访问</span><span /></div>{visible.map(([title, location, owner, time]) => <button className="knowledge-document-row" key={title} onClick={() => onOpenDocument?.(title)}><span><File size={19} weight="fill" />{title}</span><span>{location}</span><span><UserCircle size={18} weight="fill" />{owner}</span><span>{time}</span><DotsThree size={19} /></button>)}</div>
    {!visible.length && <div className="knowledge-empty"><MagnifyingGlass size={28} /><strong>没有找到相关文档</strong><span>请尝试其他关键词</span></div>}
  </>
}

const knowledgeLibraryEntries = {
  '资源中心': ['制度规范', '公共模板', '业务流程', '品牌素材', '培训资料'],
  '项目知识库': ['项目方案', '过程材料', '会议纪要', '交付成果', '项目复盘'],
  '领域知识库': ['行业规范', '专业方法', '研究报告', '专家经验', '典型案例'],
  '档案中心': ['合同档案', '历史成果', '归档项目', '审计材料', '重要记录'],
}

const knowledgeFolderChildren = {
  '制度规范': ['安全管理', '信息安全管理制度.docx', '员工行为规范.pdf', '数据分级管理办法.docx'],
  '安全管理': ['账号权限规范.docx', '终端安全要求.pdf'],
  '业务流程': ['审批流程说明.pdf', '采购业务流程.docx'],
  '培训资料': ['入职培训', '新员工培训手册.pdf', '系统操作指南.docx'],
  '入职培训': ['公司介绍.pdf', '入职流程.docx'],
  '项目方案': ['项目立项方案.docx', '范围说明书.pdf'],
  '会议纪要': ['项目启动会纪要.docx', '周例会纪要.docx'],
  '行业规范': ['行业标准汇编.pdf', '合规检查清单.docx'],
  '研究报告': ['行业趋势研究.pdf', '竞品分析报告.docx'],
  '合同档案': ['年度采购合同.pdf', '服务协议.docx'],
  '归档项目': ['2025年度项目总结.docx', '项目交付清单.xlsx'],
}

function KnowledgeLibraryDetail({ name, onBack, onAskAI, showAskAI = true, onSelectionChange, onOpenDocument }) {
  const current = knowledgeSeed.find(([title]) => title === name) || knowledgeSeed[0]
  const [title, description, Icon, tone, count] = current
  const [folderPath, setFolderPath] = useState([])
  const [openMoreMenu, setOpenMoreMenu] = useState('')
  const [selectedEntries, setSelectedEntries] = useState([])
  const currentFolder = folderPath[folderPath.length - 1]
  const entries = currentFolder ? knowledgeFolderChildren[currentFolder] || [] : knowledgeLibraryEntries[title] || []
  const openFolder = folder => setFolderPath(currentPath => [...currentPath, folder])
  const toggleSelectedEntry = entry => setSelectedEntries(current => {
    const next = current.includes(entry) ? current.filter(item => item !== entry) : [...current, entry]
    onSelectionChange?.(next)
    return next
  })
  const openDocument = documentName => {
    if (onOpenDocument) {
      onOpenDocument(documentName)
      return
    }
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('document', documentName)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
  }
  const navigateBreadcrumb = index => setFolderPath(currentPath => currentPath.slice(0, index))
  useEffect(() => {
    if (!openMoreMenu) return
    const closeMenu = event => {
      if (!event.target.closest('.knowledge-folder-menu-wrap')) setOpenMoreMenu('')
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [openMoreMenu])
  return <div className={`knowledge-library-detail ${tone}`}>
    <header className="knowledge-detail-toolbar">
      <button type="button" onClick={onBack}><CaretRight size={17} /><span>知识库</span></button>
      <div><button type="button"><ShareNetwork size={17} />分享</button><button type="button"><Gear size={17} />设置</button></div>
    </header>
    <section className="knowledge-detail-hero">
      <span className="knowledge-detail-icon"><Icon size={36} weight="fill" /></span>
      <div><h1>{title}</h1><p>{description}</p><small><UserCircle size={16} weight="fill" />李鹏飞 · {count} 项内容</small></div>
      {showAskAI && <button type="button" onClick={() => onAskAI(title)}><Sparkle size={18} weight="fill" />问AI</button>}
    </section>
    <div className="knowledge-detail-list-toolbar"><nav className="knowledge-detail-breadcrumb" aria-label="文件夹路径"><button className={folderPath.length === 0 ? 'current' : ''} type="button" onClick={() => navigateBreadcrumb(0)}>全部</button>{folderPath.map((folder, index) => <span key={`${folder}-${index}`}><CaretRight size={16} /><button className={index === folderPath.length - 1 ? 'current' : ''} type="button" onClick={() => navigateBreadcrumb(index + 1)}>{folder}</button></span>)}</nav><div><label><MagnifyingGlass size={16} /><input placeholder="搜索当前文件夹" /></label><button><UploadSimple size={16} />上传</button><button><Plus size={16} />新建</button></div></div>
    <div className="knowledge-detail-table">
      <div className="knowledge-detail-row head"><span className="knowledge-detail-select-head" aria-hidden="true" /><span>名称</span><span>所有者</span><span>修改时间</span><span>类型</span><span aria-hidden="true" /></div>
      {entries.map((entry, index) => {
        const children = knowledgeFolderChildren[entry] || []
        const isFolder = children.length > 0
        return <div className="knowledge-detail-tree-item" key={entry}>
          <div className={`knowledge-detail-row${isFolder ? ' folder' : ' file'}`} role="button" tabIndex={0} onClick={() => isFolder ? openFolder(entry) : openDocument(entry)} onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && (isFolder ? openFolder(entry) : openDocument(entry))}>
            <button className={`knowledge-detail-select${selectedEntries.includes(entry) ? ' selected' : ''}`} type="button" aria-label={selectedEntries.includes(entry) ? `取消选择${entry}` : `选择${entry}`} aria-pressed={selectedEntries.includes(entry)} onClick={event => { event.stopPropagation(); toggleSelectedEntry(entry) }}>{selectedEntries.includes(entry) && <Check size={12} weight="bold" />}</button>
            <span>{isFolder ? <FolderOpen size={18} weight="fill" /> : <File size={18} weight="fill" />}{entry}</span>
            <span>李鹏飞</span>
            <span>{index < 2 ? '今天' : `${index + 3}天前`}</span>
            <span>{isFolder ? '文件夹' : '文档'}</span>
            <div className="knowledge-folder-menu-wrap">
              <button className="knowledge-detail-more" type="button" aria-label={`${entry}更多操作`} aria-expanded={openMoreMenu === entry} onClick={event => { event.stopPropagation(); setOpenMoreMenu(current => current === entry ? '' : entry) }}><DotsThree size={20} weight="bold" /></button>
              {isFolder && openMoreMenu === entry && <div className="knowledge-folder-menu" role="menu" onClick={event => event.stopPropagation()}>
                <button type="button">分享</button>
                <span className="knowledge-folder-menu-divider" />
                <button type="button" onClick={() => { setOpenMoreMenu(''); openFolder(entry) }}>打开</button>
                <button type="button">重命名</button>
                <button type="button">复制</button>
                <button type="button">复制到</button>
                <button type="button">移动</button>
                <span className="knowledge-folder-menu-divider" />
                <button type="button">批量导出</button>
                <button type="button">添加到</button>
                <span className="knowledge-folder-menu-divider" />
                <button className="danger" type="button">删除文件</button>
              </div>}
              {!isFolder && openMoreMenu === entry && <div className="knowledge-folder-menu knowledge-file-menu" role="menu" onClick={event => event.stopPropagation()}>
                <button type="button">分享</button>
                <button type="button">复制链接</button>
                <span className="knowledge-folder-menu-divider" />
                <button type="button" onClick={() => { setOpenMoreMenu(''); openDocument(entry) }}>打开</button>
                <button type="button" onClick={() => { setOpenMoreMenu(''); openDocument(entry) }}>预览</button>
                <button type="button">重命名</button>
                <button type="button">复制</button>
                <button type="button">复制到</button>
                <button type="button">移动</button>
                <span className="knowledge-folder-menu-divider" />
                <button type="button">历史版本</button>
                <span className="knowledge-folder-menu-divider" />
                <button type="button">下载</button>
                <span className="knowledge-folder-menu-divider" />
                <button className="danger" type="button">删除文件</button>
              </div>}
            </div>
          </div>
        </div>
      })}
    </div>
  </div>
}

export function KnowledgeCenterPage({ onAskAI, productTitle = '知识中心', onOpenDocument, enablePlaza = false, enableCreate = false }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const [scope, setScope] = useState('all')
  const [view, setView] = useState('libraries')
  const [librarySection, setLibrarySection] = useState('personal')
  const [customLibraries, setCustomLibraries] = useState([])
  const [createMenu, setCreateMenu] = useState(false)
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false)
  const [libraryName, setLibraryName] = useState('')
  const [settingsFor, setSettingsFor] = useState('')
  const [visibility, setVisibility] = useState('仅自己可见')
  const [notice, setNotice] = useState('')
  const libraryCatalog = enableCreate ? [...customLibraries, ...knowledgeSeed] : knowledgeSeed
  const [subnavCollapsed, setSubnavCollapsed] = useState(false)
  const [subnavWidth, setSubnavWidth] = useState(228)
  const [aiKnowledge, setAiKnowledge] = useState('全部知识')
  const [aiMessage, setAiMessage] = useState('')
  const [detailAiOpen, setDetailAiOpen] = useState(false)
  const [detailAiWidth, setDetailAiWidth] = useState(470)
  const visible = libraryCatalog.filter(([title, description, , , , ownership]) => (librarySection === 'plaza' || scope === 'all' || ownership === scope) && `${title}${description}`.includes(query.trim()))
  useEffect(() => {
    if (librarySection === 'shared') setScope('all')
  }, [librarySection])
  const startSubnavResize = event => {
    if (subnavCollapsed) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = subnavWidth
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const move = moveEvent => setSubnavWidth(Math.min(360, Math.max(190, startWidth + moveEvent.clientX - startX)))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  const openAI = knowledgeName => {
    setAiKnowledge('全部知识')
    setAiMessage('')
    setView('ask')
  }
  const startDetailAiResize = event => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = detailAiWidth
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const move = moveEvent => setDetailAiWidth(Math.min(620, Math.max(340, startWidth + startX - moveEvent.clientX)))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }
  return <section className={`knowledge-shell${subnavCollapsed ? ' subnav-collapsed' : ''}${view === 'detail' ? ' detail-view' : ''}${view === 'detail' && detailAiOpen ? ' detail-drawer-open' : ''}`} style={{ gridTemplateColumns: view === 'detail' ? (detailAiOpen ? `minmax(0,1fr) ${detailAiWidth}px` : 'minmax(0,1fr)') : `${subnavCollapsed ? 58 : subnavWidth}px minmax(0,1fr)` }}>
    {view !== 'detail' && <aside className="knowledge-subnav">
      <div className="knowledge-subnav-title"><Books size={21} weight="fill" /><strong>{productTitle}</strong><button type="button" className="knowledge-subnav-toggle" aria-label={subnavCollapsed ? `展开${productTitle}侧栏` : `收起${productTitle}侧栏`} title={subnavCollapsed ? '展开' : '收起'} onClick={() => setSubnavCollapsed(value => !value)}><SidebarSimple size={19} /></button></div>
      <label className="knowledge-subnav-search"><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索" /></label>
      <nav>
        <button className={view === 'ask' ? 'active' : ''} onClick={() => openAI(selected || '全部知识')}><ChatCircleDots size={19} />问AI</button>
        <button className={view === 'home' ? 'active' : ''} onClick={() => { setView('home'); setQuery('') }}><House size={19} />主页</button>
        <button className={view === 'libraries' && librarySection === 'plaza' ? 'active' : ''} type="button" onClick={enablePlaza ? () => { setView('libraries'); setLibrarySection('plaza'); setScope('all'); setSelected(''); setQuery('') } : undefined}><Compass size={19} />知识广场</button>
        <button className={view === 'libraries' && librarySection === 'shared' ? 'active' : ''} onClick={() => { setView('libraries'); setLibrarySection('shared'); setScope('all'); setSelected(''); setQuery('') }}><UsersThree size={19} />共享知识库</button>
        <button className={(view === 'libraries' || view === 'detail') && librarySection === 'personal' ? 'active' : ''} onClick={() => { setView('libraries'); setLibrarySection('personal'); setScope('all'); setSelected(''); setQuery('') }}><BookBookmark size={19} weight="fill" />个人知识库</button>
      </nav>
      <div className="knowledge-subnav-group"><strong>置顶知识库</strong><button><Plus size={16} />新建或置顶知识库</button></div>
      <div className="knowledge-subnav-group libraries"><div><strong>我的文档库</strong></div><button><File size={16} />账号备忘录</button><button><CaretRight size={13} />综合提升</button><button><CaretRight size={13} />学习笔记</button></div>
      {!subnavCollapsed && <div className="knowledge-subnav-resize-handle" role="separator" aria-label="调整知识中心侧栏宽度" aria-orientation="vertical" aria-valuemin="190" aria-valuemax="360" aria-valuenow={subnavWidth} onPointerDown={startSubnavResize} />}
    </aside>}
    <div className={`knowledge-page${detailAiOpen && view === 'detail' ? ' detail-ai-open' : ''}`}>
      {view === 'detail' ? <KnowledgeLibraryDetail name={selected} onBack={() => { setDetailAiOpen(false); setView('libraries') }} onAskAI={() => setDetailAiOpen(true)} showAskAI={!detailAiOpen} onOpenDocument={onOpenDocument} /> : view === 'ask' ? <KnowledgeAIWorkspace knowledge={aiKnowledge} message={aiMessage} setMessage={setAiMessage} /> : view === 'home' ? <KnowledgeHomeContent query={query} setQuery={setQuery} onOpenDocument={onOpenDocument} /> : <>
      <header className="knowledge-header"><div><h1>{librarySection === 'shared' ? '共享知识库' : librarySection === 'plaza' ? '知识广场' : '个人知识库'}</h1><p>{librarySection === 'shared' ? '统一管理我共享的及与我共享的团队知识库' : librarySection === 'plaza' ? '发现组织内可访问的知识库，打开后查看目录与文档' : '管理个人知识，让经验持续产生价值'}</p></div></header>
      <div className="knowledge-actions">
        <div className="knowledge-action-menu">
          <button type="button" aria-expanded={createMenu} onClick={() => enableCreate && setCreateMenu(value => !value)}><span><Plus size={22} weight="bold" /></span><div><strong>新建内容</strong><small>新建文档或上传文件</small></div><CaretDown size={17} /></button>
          {enableCreate && createMenu && <div className="knowledge-action-popover" role="menu">
            <button type="button" onClick={() => { setCreateMenu(false); onOpenDocument?.('未命名文档') }}>新建文档</button>
            <label>上传文件<input className="knowledge-file-input" type="file" onChange={() => { setCreateMenu(false); setNotice('已记录上传选择。这是原型，文件不会保存到服务器。') }} /></label>
          </div>}
        </div>
        <button type="button" onClick={() => enableCreate && setLibraryDialogOpen(true)}><span><BookBookmark size={22} weight="fill" /></span><div><strong>新建知识库</strong><small>创建并配置知识空间</small></div><CaretRight size={17} /></button>
      </div>
      <div className="knowledge-section-heading">{librarySection === 'shared' ? <div className="knowledge-heading-main"><div className="knowledge-scope-tabs" role="tablist" aria-label="共享知识库范围">{[['all', '全部'], ['created', '我共享的'], ['joined', '与我共享']].map(([value, label]) => <button className={scope === value ? 'active' : ''} type="button" role="tab" aria-selected={scope === value} key={value} onClick={() => { setScope(value); setSelected('') }}>{label}</button>)}</div></div> : <div />}<label className="knowledge-inline-search"><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索知识库" /></label></div>
      <div className="knowledge-grid">{visible.map(([title, description, , tone]) => <button key={title} className={`knowledge-card ${tone} ${selected === title ? 'active' : ''}`} onClick={() => { setSelected(title); setView('detail') }}>
        <PushPin className="knowledge-card-pin" size={15} weight="bold" /><strong>{title}</strong><p>{description}</p><span className="knowledge-card-settings" role="button" tabIndex={0} onClick={event => { event.stopPropagation(); if (!enableCreate) return; setSettingsFor(title); setVisibility(librarySection === 'personal' ? '仅自己可见' : '团队可见') }} onKeyDown={event => { if (event.key === 'Enter') { event.stopPropagation(); event.preventDefault(); if (enableCreate) setSettingsFor(title) } }}><Gear size={17} weight="bold" />知识库设置</span>
      </button>)}</div>
      {!visible.length && <div className="knowledge-empty"><MagnifyingGlass size={28} /><strong>没有找到相关知识库</strong><span>请尝试其他关键词</span></div>}
      </>}
    </div>
    {view === 'detail' && detailAiOpen && <KnowledgeDetailAIDrawer knowledge={selected || '当前知识库'} width={detailAiWidth} onResize={startDetailAiResize} onClose={() => setDetailAiOpen(false)} />}
    {enableCreate && libraryDialogOpen && <div className="knowledge-product-dialog-backdrop" onMouseDown={() => setLibraryDialogOpen(false)}><form className="knowledge-product-dialog" onMouseDown={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); const name = libraryName.trim(); if (!name) return; setCustomLibraries(current => [[name, '刚刚创建的知识空间', FolderOpen, 'ocean', 0, 'created'], ...current]); setLibraryName(''); setLibraryDialogOpen(false); setLibrarySection('personal'); setSelected(name); setView('detail'); setNotice(`已创建知识库「${name}」。内容只保存在这次浏览中。`) }}><h2>新建知识库</h2><label>名称<input value={libraryName} onChange={event => setLibraryName(event.target.value)} placeholder="例如：项目复盘" autoFocus /></label><div><button type="button" onClick={() => setLibraryDialogOpen(false)}>取消</button><button type="submit">创建</button></div></form></div>}
    {enableCreate && settingsFor && <div className="knowledge-product-dialog-backdrop" onMouseDown={() => setSettingsFor('')}><section className="knowledge-product-dialog" onMouseDown={event => event.stopPropagation()}><h2>知识库设置</h2><p>{settingsFor}</p><label><input type="radio" name="visibility" checked={visibility === '仅自己可见'} onChange={() => setVisibility('仅自己可见')} />仅自己可见</label><label><input type="radio" name="visibility" checked={visibility === '团队可见'} onChange={() => setVisibility('团队可见')} />团队可见</label><div><button type="button" onClick={() => setSettingsFor('')}>关闭</button><button type="button" onClick={() => { setNotice(`已将「${settingsFor}」设为${visibility}。这是原型中的本地设置。`); setSettingsFor('') }}>保存</button></div></section></div>}
    {notice && <div className="knowledge-product-toast" role="status">{notice}<button type="button" onClick={() => setNotice('')}>知道了</button></div>}
  </section>
}

function KnowledgeDetailAIDrawer({ knowledge, width, onResize, onClose }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [overviewOpen, setOverviewOpen] = useState(true)
  const [selectedExpert, setSelectedExpert] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [selectedKnowledge, setSelectedKnowledge] = useState(knowledge ? [knowledge] : [])
  const [knowledgeScope, setKnowledgeScope] = useState('')
  const [knowledgeLibraryOpen, setKnowledgeLibraryOpen] = useState(false)
  const submit = () => {
    if (!message.trim()) return
    setMessages(current => [...current, message.trim()])
    setMessage('')
  }
  return <aside className="knowledge-detail-ai-drawer document-ai-panel" style={{ width }} aria-label="AI 对话">
    <div className="document-ai-resize-handle" role="separator" aria-label="调整 AI 抽屉宽度" aria-orientation="vertical" aria-valuemin="340" aria-valuemax="620" aria-valuenow={Math.round(width)} onPointerDown={onResize} />
    <header className="document-ai-header"><strong><Sparkle size={18} weight="fill" />问AI</strong><div><button aria-label="新建对话" onClick={() => setMessages([])}><Plus size={19} /></button><button aria-label="对话历史"><Clock size={19} /></button><button aria-label="关闭 AI 面板" title="关闭" onClick={onClose}><X size={19} /></button></div></header>
    <div className="conversation-scroll document-ai-conversation-scroll"><article className="conversation-body"><section className="document-ai-overview"><button className="document-ai-section-title" onClick={() => setOverviewOpen(value => !value)}><span>知识概览<Sparkle size={13} weight="fill" /></span><CaretDown size={16} className={overviewOpen ? '' : 'closed'} /></button>{overviewOpen && <><p>当前已关联<strong>{knowledge}</strong>，可以围绕其中的制度、模板与业务资料进行检索、总结和分析。</p><div className="document-ai-actions"><button><FileText size={16} weight="fill" />知识总结</button><button><ProjectorScreenChart size={16} weight="fill" />PPT制作</button><button><ChartBar size={16} weight="fill" />思维导图</button><button><BookBookmark size={16} weight="fill" />知识图解</button></div><div className="document-ai-related"><span>相关知识</span><button><FolderOpen size={16} />{knowledge}</button></div></>}</section>{messages.length ? messages.map((text, index) => <div key={`${text}-${index}`}><div className="question-bubble">{text}</div><div className="answer-block"><div className="answer-brand"><span><Robot size={18} /></span><div><strong>企业 AI 智能体</strong><small>已结合当前知识库</small></div></div><p>已结合“{knowledge}”中的内容进行分析，你可以继续要求我提炼要点、生成摘要或整理行动清单。</p></div></div>) : <div className="document-ai-empty"><Robot size={28} /><strong>针对当前知识库提问</strong><p>我可以帮你总结、分析或查找知识内容</p></div>}</article></div>
    <div className="composer conversation-composer document-ai-system-composer">{!!selectedSkills.length && <div className="composer-skill-chips">{selectedSkills.map(skill => <span className="composer-skill-chip" key={skill}><Sparkle size={13} weight="fill" />{skill}</span>)}</div>}<textarea className={selectedSkills.length ? 'has-skill-chips' : ''} value={message} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="继续追问，或输入“/”调用技能或专家、“@”指定知识" /><div className="composer-bottom"><div className="composer-tools"><ModePicker /><CapabilityPicker onSkillSelect={skill => setSelectedSkills(current => current.includes(skill) ? current : [...current, skill])} selected={selectedExpert} onExpertSelect={setSelectedExpert} /><KnowledgePicker value={selectedKnowledge.length === 1 ? selectedKnowledge[0] : knowledgeScope} selectionCount={selectedKnowledge.length} onChange={next => { setKnowledgeScope(next); if (next) setSelectedKnowledge([]) }} onClear={() => { setSelectedKnowledge([]); setKnowledgeScope('') }} onChooseMore={() => setKnowledgeLibraryOpen(true)} /></div><div className="send-tools"><button className="web-search" aria-label="开启联网搜索"><Globe size={20} /></button><i /><button className="voice-input" aria-label="开始语音输入"><Microphone size={20} /></button><button className="send" aria-label="发送" onClick={submit}><ArrowUp size={22} weight="bold" /></button></div></div>{knowledgeLibraryOpen && <KnowledgeLibraryModal onClose={() => setKnowledgeLibraryOpen(false)} onConfirm={names => { setSelectedKnowledge(names); setKnowledgeScope(''); setKnowledgeLibraryOpen(false) }} />}</div>
    <p className="ai-content-disclaimer">内容由 AI 生成，请核实重要信息。</p>
  </aside>
}

function KnowledgeAIWorkspace({ knowledge, message, setMessage }) {
  const [sent, setSent] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const [selectedExpert, setSelectedExpert] = useState('')
  const [selectedSkills, setSelectedSkills] = useState([])
  const [knowledgeScope, setKnowledgeScope] = useState(knowledge || '全部知识')
  const [selectedKnowledge, setSelectedKnowledge] = useState([])
  const [knowledgeLibraryOpen, setKnowledgeLibraryOpen] = useState(false)
  const submit = () => {
    if (!message.trim()) return
    setSent(true)
  }
  return <section className="knowledge-ai-workspace knowledge-embedded-welcome">
    <div className="greeting"><h1>HI～我是你的工作伙伴</h1></div>
    <div className="chips">{chips.slice(0, 6).map(([Icon, label]) => <button key={label} onClick={() => setSelectedSkills(current => current.includes(label) ? current : [...current, label])}><Icon size={18} weight="fill" />{label}</button>)}<button className="more-skills" aria-label="查看更多技能"><CaretRight size={19} weight="bold" /></button></div>
    <div className="composer-mascot" aria-hidden="true"><img src={publicAsset("/workbuddy-cat-mascot.png")} alt="" /></div>
    <div className={`composer${sent ? ' sent' : ''}`}>
      {!!selectedSkills.length && <div className="composer-skill-chips">{selectedSkills.map(name => <span className="composer-skill-chip" key={name}><Sparkle size={13} weight="fill" /><span>{name}</span><button type="button" aria-label={`移除技能${name}`} onClick={() => setSelectedSkills(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button></span>)}</div>}
      <textarea autoFocus className={selectedSkills.length ? 'has-skill-chips' : ''} value={message} onChange={event => { setMessage(event.target.value); setSent(false) }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder="发消息或输入“/”调用技能或专家，“@”指定知识" />
      <div className="composer-bottom"><div className="composer-tools"><ModePicker /><CapabilityPicker onSkillSelect={name => setSelectedSkills(current => current.includes(name) ? current : [...current, name])} selected={selectedExpert} onExpertSelect={setSelectedExpert} /><KnowledgePicker value={selectedKnowledge.length === 1 ? selectedKnowledge[0] : knowledgeScope} selectionCount={selectedKnowledge.length} onChange={next => { setKnowledgeScope(next); if (next) setSelectedKnowledge([]) }} onClear={() => { setSelectedKnowledge([]); setKnowledgeScope('') }} onChooseMore={() => setKnowledgeLibraryOpen(true)} /></div><div className="send-tools"><button className={webSearch ? 'web-search active' : 'web-search'} aria-label="联网搜索" onClick={() => setWebSearch(value => !value)}><Globe size={22} /></button><i /><button aria-label="语音输入"><Microphone size={22} /></button><button className="send" aria-label="发送" onClick={submit}><ArrowUp size={25} weight="bold" /></button></div></div>
      {sent && <div className="toast">消息已发送</div>}
      {knowledgeLibraryOpen && <KnowledgeLibraryModal onClose={() => setKnowledgeLibraryOpen(false)} onConfirm={names => { setSelectedKnowledge(names); setKnowledgeScope(''); setKnowledgeLibraryOpen(false) }} />}
    </div>
  </section>
}

const scheduledTaskSeed = [
  { id: 1, title: '每日行业资讯简报', description: '工作日上午汇总行业动态、政策变化与重点企业新闻，生成结构化简报。', time: '工作日 08:30', enabled: true, status: '18小时后运行' },
  { id: 2, title: '待办任务逾期提醒', description: '每天检查未完成待办，按紧急程度整理并提醒任务负责人及时处理。', time: '每天 09:15', enabled: true, status: '19小时后运行' },
  { id: 3, title: '知识库内容更新巡检', description: '定期检查知识过期、解析失败和权限异常，输出知识治理行动清单。', time: '每周一 10:00', enabled: true, status: '4天后运行' },
  { id: 4, title: '周度经营数据摘要', description: '每周汇总核心经营指标，识别异常波动并生成管理层阅读摘要。', time: '每周五 17:30', enabled: false, status: '已暂停' },
]

const skillSeed = [
  ...capabilityOptions.技能.map(([title, description, Icon], index) => [
    title,
    description,
    ['创建审批', '任务管理', '会议协作', '数据分析', '内容创作', '会议协作', '内容创作', '内容创作', '法务合规', '法务合规', '制度管理', '演示文稿', '表格处理', '文档转换'][index],
    Icon,
    ['blue','orange','cyan','purple','pink','green','navy','indigo','blue','orange','cyan'][index],
    ['Workflow Approval', 'Task Management', 'Meeting Scheduling', 'Data Analysis', 'AI Writing', 'Meeting Minutes', 'Work Summary', 'Weekly / Monthly Report', 'Contract Drafting', 'Contract Review', 'Policy Interpretation', 'AI Presentation', 'Excel Processing', 'PDF to Word'][index],
  ]),
]

const agentSeed = [
  ...capabilityOptions.专家.map(([title, description, Icon], index) => [title, description, '企业专家', Icon, ['blue','purple','cyan','navy','orange','green','indigo','multi'][index]]),
]

function CreateCenterItemDialog({ type, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const isExpert = type === '专家'
  return <div className="center-create-backdrop" onClick={onClose}>
    <section className="center-create-dialog" role="dialog" aria-modal="true" aria-labelledby="center-create-title" onClick={event => event.stopPropagation()}>
      <header><div><h2 id="center-create-title">创建{type}</h2><p>填写基本信息，创建后将显示在{type}中心。</p></div><button aria-label="关闭" onClick={onClose}><X size={20} /></button></header>
      <label><span>{type}名称</span><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder={`请输入${type}名称`} /></label>
      <label><span>功能说明</span><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder={`简要描述${type}可以完成的工作`} /></label>
      <footer><button onClick={onClose}>取消</button><button className="primary" disabled={!name.trim()} onClick={() => onCreate([name.trim(), description.trim() || (isExpert ? '协助处理专业工作任务' : '高效完成相关工作任务'), isExpert ? '我创建的专家' : '我创建的技能', isExpert ? UserCircle : Sparkle, isExpert ? 'blue' : 'indigo'])}>创建</button></footer>
    </section>
  </div>
}

function AgentsCenterPage({ onSummon }) {
  const [query, setQuery] = useState('')
  const visible = agentSeed.filter(([title, description, source]) => `${title}${description}${source}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <section className="agents-page">
    <header className="agents-header"><div className="agents-heading"><h1>专家中心</h1><p>让数字员工协同处理各类工作</p></div><div className="agents-actions"><label><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索专家" /></label></div></header>
    <div className="agents-grid">{visible.map(([title, description, source, Icon, tone]) => <article className="agent-card" key={title}><header><span className={`agent-icon ${tone}`}><Icon size={23} weight="fill" /></span><div><h3>{title}</h3><small>{source}</small></div><button className="agent-use" onClick={() => onSummon?.(title)}>召唤</button></header><p>{description}</p><footer><span>{source}</span><button aria-label="更多操作"><DotsThree size={19} weight="bold" /></button></footer></article>)}</div>
    {!visible.length && <div className="agents-empty"><MagnifyingGlass size={28} /><strong>没有找到相关专家</strong><span>请尝试其他关键词或筛选条件</span></div>}
  </section>
}

function SkillsCenterPage({ onUse }) {
  const [query, setQuery] = useState('')
  const visible = skillSeed.filter(([title, description, category, , , englishName]) => `${title}${englishName}${description}${category}`.toLowerCase().includes(query.trim().toLowerCase()))
  return <section className="skills-page">
    <header className="skills-header"><div className="skills-heading"><h1>技能中心</h1><p>调用专业技能，高效完成各类工作任务</p></div><div className="skills-actions"><label><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索技能" /></label></div></header>
    <div className="skills-grid">{visible.map(([title, description, category, Icon, tone, englishName]) => <article className="skill-card" key={title}><header><span className={`skill-icon ${tone}`}><Icon size={23} weight="fill" /></span><div><h3>{title}</h3><small>{englishName}</small></div><button className="skill-use" onClick={() => onUse?.(title)}>使用</button></header><p>{description}</p><footer><span>{category}</span><button aria-label="更多操作"><DotsThree size={19} weight="bold" /></button></footer></article>)}</div>
    {!visible.length && <div className="skills-empty"><MagnifyingGlass size={28} /><strong>没有找到相关技能</strong><span>请尝试其他关键词或筛选条件</span></div>}
  </section>
}

const internalConnectorSeed = [
  ['内部门户', '企业内部信息、服务与应用统一入口', Buildings, 'blue'],
  ['公告系统', '发布并管理企业通知与公告信息', BellRinging, 'green'],
  ['审批系统', '发起、处理并跟踪企业审批流程', CheckCircle, 'blue'],
  ['会议系统', '预约会议、管理议程与会议资源', ChatCircleDots, 'blue'],
  ['公文系统', '公文拟稿、流转、签批与归档', FileText, 'cyan'],
  ['数据看板', '集中展示经营指标与业务分析数据', ChartBar, 'purple'],
  ['督办系统', '跟踪重点事项与督办任务落实情况', ClipboardText, 'purple'],
  ['工作联系单', '创建并流转跨部门工作联系事项', UserPlus, 'cyan'],
  ['制度系统', '统一维护、发布与查询企业制度', Books, 'orange'],
  ['人力管理系统', '管理组织、人员与人力资源业务', UsersThree, 'blue'],
  ['采购管理系统', '管理采购申请、订单与供应商协作', Briefcase, 'orange'],
  ['合同管理系统', '管理合同拟定、审批、履约与归档', FileDoc, 'green'],
  ['资产管理系统', '管理企业资产台账、领用与盘点', Database, 'cyan'],
  ['财务管理系统', '管理费用、预算、报销与财务数据', Archive, 'orange'],
]

const externalConnectorSeed = [
  ['钉钉', '连接组织通讯录、审批、待办、文档和群消息', Buildings, 'blue'],
  ['企业微信', '连接企业成员、客户联系与群聊消息', ChatCircleDots, 'green'],
  ['飞书', '连接日历、文档、知识库与多维表格', CalendarBlank, 'cyan'],
  ['Microsoft 365', '连接 Outlook、Teams、OneDrive 与 SharePoint', AppWindow, 'indigo'],
  ['Google Workspace', '连接 Gmail、日历、云端硬盘与在线文档', Globe, 'orange'],
  ['Salesforce', '连接客户、商机、合同与销售活动数据', Database, 'purple'],
  ['Jira', '连接项目、需求、问题和研发工作流', CheckSquare, 'navy'],
  ['GitHub', '连接代码仓库、Issue、Pull Request 与 Actions', Code, 'pink'],
]

function ConnectorsCenterPage() {
  const [tab, setTab] = useState('internal')
  const [query, setQuery] = useState('')
  const [connected, setConnected] = useState(() => new Set(['钉钉']))
  const connectorItems = tab === 'internal' ? internalConnectorSeed : externalConnectorSeed
  const visible = connectorItems.filter(([title, description]) => `${title}${description}`.toLowerCase().includes(query.trim().toLowerCase()))
  const toggleConnector = title => setConnected(current => {
    const next = new Set(current)
    next.has(title) ? next.delete(title) : next.add(title)
    return next
  })
  return <section className="connectors-page">
    <header className="connectors-header"><div><h1>连接器</h1><p>连接企业服务与业务数据，让数字员工跨系统协同工作</p></div><label><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索连接器" /></label></header>
    <div className="connectors-tabs" role="tablist" aria-label="连接器类型"><button type="button" role="tab" aria-selected={tab === 'internal'} className={tab === 'internal' ? 'active' : ''} onClick={() => setTab('internal')}>内部系统</button><button type="button" role="tab" aria-selected={tab === 'external'} className={tab === 'external' ? 'active' : ''} onClick={() => setTab('external')}>外部系统</button></div>
    <div className={`connectors-grid ${tab}`}>{visible.map(([title, description, Icon, tone]) => {
      const isConnected = connected.has(title)
      return <article className="connector-card" key={title}>
        <span className={`connector-icon ${tone}`}><Icon size={24} weight="fill" /></span>
        <div><h3>{title}</h3><p>{description}</p></div>
        {tab === 'external' && <button className={isConnected ? 'connected' : ''} type="button" aria-label={isConnected ? `${title}已连接` : `连接${title}`} title={isConnected ? '已连接' : '连接'} onClick={() => toggleConnector(title)}>{isConnected ? <Check size={22} weight="bold" /> : <Plus size={22} />}</button>}
      </article>
    })}</div>
    {!visible.length && <div className="connectors-empty"><MagnifyingGlass size={28} /><strong>没有找到相关连接器</strong><span>请尝试其他关键词</span></div>}
  </section>
}

function ScheduledTasksPage() {
  const [tab, setTab] = useState('scheduled')
  const [query, setQuery] = useState('')
  const [tasks, setTasks] = useState(scheduledTaskSeed)
  const [showCreate, setShowCreate] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [taskInstruction, setTaskInstruction] = useState('请为我搜索并分析【你关注的内容】\n并生成 3～5 条摘要\n语言简洁，重点突出，适合 3 分钟快速阅读')
  const [runLocation, setRunLocation] = useState('新建聊天')
  const [showRunLocation, setShowRunLocation] = useState(false)
  const [selectedRunChat, setSelectedRunChat] = useState('中国籍持卡人订阅实操指南')
  const [showRunChatPicker, setShowRunChatPicker] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState('每日行业资讯简报')
  const [scheduleFrequency, setScheduleFrequency] = useState('每天')
  const [showScheduleFrequency, setShowScheduleFrequency] = useState(false)
  const [activeTaskMenu, setActiveTaskMenu] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)
  const recommendations = [
    ['行业日报', '每天自动追踪行业资讯并生成简报', Sparkle],
    ['待办提醒', '按时检查逾期任务并提醒负责人', Clock],
    ['知识巡检', '定期发现过期与解析异常内容', Books],
    ['经营周报', '汇总经营指标并提炼风险机会', Textbox],
  ]
  const history = [
    ['每日行业资讯简报', '2026/08/06 08:31:12', '成功'],
    ['待办任务逾期提醒', '2026/08/06 09:16:05', '成功'],
    ['知识库内容更新巡检', '2026/08/05 10:03:42', '成功'],
    ['周度经营数据摘要', '2026/08/01 17:31:18', '失败'],
  ]
  const normalizedQuery = query.trim().toLowerCase()
  const visibleTasks = tasks.filter(task => `${task.title}${task.description}`.toLowerCase().includes(normalizedQuery))
  const visibleHistory = history.filter(([title, time, result]) => `${title}${time}${result}`.toLowerCase().includes(normalizedQuery))
  const toggleTask = id => setTasks(current => current.map(task => task.id === id ? { ...task, enabled: !task.enabled, status: task.enabled ? '已暂停' : '24小时后运行' } : task))
  const createTask = () => {
    if (!taskName.trim()) return
    setTasks(current => editingTaskId
      ? current.map(task => task.id === editingTaskId ? { ...task, title: taskName.trim(), description: taskInstruction.trim() || task.description } : task)
      : [{ id: Date.now(), title: taskName.trim(), description: taskInstruction.trim() || '按照设定时间自动执行任务，并在完成后通知你查看结果。', time: '每天 11:35', enabled: true, status: '24小时后运行' }, ...current])
    setTaskName('')
    setEditingTaskId(null)
    setShowCreate(false)
  }
  const openEditTask = task => { setActiveTaskMenu(null); setEditingTaskId(task.id); setTaskName(task.title); setTaskInstruction(task.description); setShowCreate(true) }
  const runTaskOnce = id => { setTasks(current => current.map(task => task.id === id ? { ...task, status: '正在执行' } : task)); setActiveTaskMenu(null) }
  useEffect(() => {
    if (activeTaskMenu === null) return
    const closeMenu = () => setActiveTaskMenu(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [activeTaskMenu])

  return <section className="scheduled-page">
    <header className="scheduled-header">
      <div><h1>定时任务</h1><p>让企业数字员工按计划自动执行任务，持续为你处理重复工作</p></div>
      <div className="scheduled-header-actions"><button className="prompt-create" onClick={() => setShowCreate(true)}><MagicWand size={17} />一句话创建</button><button className="primary-create" onClick={() => setShowCreate(true)}><Plus size={18} />创建任务</button></div>
    </header>

    <div className="scheduled-tabs-row">
      <div className="scheduled-tabs" role="tablist"><button className={tab === 'scheduled' ? 'active' : ''} onClick={() => setTab('scheduled')}>已定时</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>执行历史</button></div>
      <label className="scheduled-search"><MagnifyingGlass size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索任务" /></label>
    </div>

    {tab === 'scheduled' ? <div className="task-card-grid">{visibleTasks.map(task => <article className="scheduled-card" key={task.id} role="button" tabIndex={0} aria-label={`查看任务详情：${task.title}`} onClick={() => openEditTask(task)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openEditTask(task) } }}>
      <div className="scheduled-card-top"><h3>{task.title}</h3><button className="task-more" aria-label="更多操作" aria-expanded={activeTaskMenu === task.id} onClick={event => { event.stopPropagation(); setActiveTaskMenu(current => current === task.id ? null : task.id) }}><DotsThree size={20} weight="bold" /></button></div>
      {activeTaskMenu === task.id && <div className="task-action-menu" role="menu" onClick={event => event.stopPropagation()}>
        <button role="menuitem" onClick={() => runTaskOnce(task.id)}><Play size={19} weight="fill" />运行一次</button>
        <button role="menuitem" onClick={() => openEditTask(task)}><PencilSimple size={20} />编辑</button>
        <button role="menuitem" className="danger" onClick={() => { setActiveTaskMenu(null); setDeletingTaskId(task.id) }}><Trash size={20} />删除</button>
      </div>}
      <p>{task.description}</p>
      <footer><span><Clock size={16} />{task.time}</span><span className={task.enabled ? 'task-status' : 'task-status paused'}>{task.status}</span><button className={task.enabled ? 'task-switch active' : 'task-switch'} aria-label={task.enabled ? '暂停任务' : '启用任务'} aria-pressed={task.enabled} onClick={event => { event.stopPropagation(); toggleTask(task.id) }}><span /></button></footer>
    </article>)}{!visibleTasks.length && <div className="scheduled-search-empty">没有找到相关任务</div>}</div> : <div className="execution-history"><div className="execution-table-head"><span>任务名称</span><span>运行于</span><span>执行状态</span></div>{visibleHistory.map(([title, time, result]) => <button className="execution-row" key={`${title}-${time}`}><span>{title}</span><time>{time}</time><em className={result === '成功' ? 'success' : 'failed'}>{result}</em></button>)}<p className="execution-end">{visibleHistory.length ? '没有更多了' : '没有找到相关记录'}</p></div>}

    {showCreate && <div className="task-dialog-backdrop" onClick={() => { setShowCreate(false); setEditingTaskId(null) }}><div className="task-dialog task-dialog-expanded" role="dialog" aria-modal="true" aria-labelledby="task-create-title" onClick={event => event.stopPropagation()}>
      <header><div><h2 id="task-create-title">{editingTaskId ? '编辑定时任务' : '创建定时任务'}</h2></div><button aria-label="关闭" onClick={() => { setShowCreate(false); setEditingTaskId(null) }}><X size={21} /></button></header>
      <div className="task-form-scroll">
        <label>任务名称<input autoFocus value={taskName} onChange={event => setTaskName(event.target.value)} placeholder="描述你的任务" /></label>
        <label className="task-dropdown-label">运行于<button className="task-select-field" type="button" aria-expanded={showRunLocation} onClick={() => setShowRunLocation(open => !open)}><span><ChatCircleDots size={19} />{runLocation}</span><CaretDown size={17} /></button>{showRunLocation && <div className="task-field-dropdown" role="listbox">{['新建聊天', '现有聊天'].map(option => <button type="button" role="option" aria-selected={runLocation === option} className={runLocation === option ? 'selected' : ''} key={option} onClick={() => { setRunLocation(option); setShowRunLocation(false); setShowRunChatPicker(option === '现有聊天') }}><ChatCircleDots size={18} /><span><strong>{option}</strong><small>{option === '新建聊天' ? '每次运行创建一个新对话' : '将运行结果发送到指定对话'}</small></span>{runLocation === option && <CheckCircle size={18} weight="fill" />}</button>)}</div>}</label>
        {runLocation === '新建聊天' && <label>聊天标题<input value={newChatTitle} onChange={event => setNewChatTitle(event.target.value)} placeholder="请输入新建聊天标题" /></label>}
        {runLocation === '现有聊天' && <label className="task-dropdown-label existing-chat-field">选择现有聊天<button className="task-select-field" type="button" aria-expanded={showRunChatPicker} onClick={() => setShowRunChatPicker(open => !open)}><span><ChatCircleDots size={19} />{selectedRunChat}</span><CaretDown size={17} /></button>{showRunChatPicker && <div className="task-field-dropdown existing-chat-dropdown" role="listbox">{initialHistory.map(chat => <button type="button" role="option" aria-selected={selectedRunChat === chat.title} className={selectedRunChat === chat.title ? 'selected' : ''} key={chat.id} onClick={() => { setSelectedRunChat(chat.title); setShowRunChatPicker(false) }}><ChatCircleDots size={18} /><span><strong>{chat.title}</strong><small>最近对话</small></span>{selectedRunChat === chat.title && <CheckCircle size={18} weight="fill" />}</button>)}</div>}</label>}
        <label>需要数字员工帮你做什么<div className="task-instruction-box"><textarea value={taskInstruction} onChange={event => setTaskInstruction(event.target.value)} /></div></label>
        <label>计划时间<div className="task-schedule-row"><div className="schedule-frequency-wrap"><button className="task-select-field" type="button" aria-expanded={showScheduleFrequency} onClick={() => setShowScheduleFrequency(open => !open)}><span>{scheduleFrequency}</span><CaretDown size={17} /></button>{showScheduleFrequency && <div className="schedule-frequency-menu" role="listbox">{['每天', '每周', '工作日', '每月'].map(option => <button type="button" role="option" aria-selected={scheduleFrequency === option} className={scheduleFrequency === option ? 'selected' : ''} key={option} onClick={() => { setScheduleFrequency(option); setShowScheduleFrequency(false) }}><span>{option}</span>{scheduleFrequency === option && <CheckCircle size={17} weight="fill" />}</button>)}</div>}</div><button className="task-select-field" type="button"><span>11:35:00</span><Clock size={18} /></button></div></label>
        <label>模型选择<button className="task-select-field model-field" type="button"><span>自动</span><CaretDown size={17} /></button></label>
      </div>
      <div className="task-dialog-actions expanded-actions"><button onClick={() => { setShowCreate(false); setEditingTaskId(null) }}>取消</button><button disabled={!taskName.trim()} onClick={createTask}>仅保存</button><button className="primary" disabled={!taskName.trim()} onClick={() => { createTask() }}><Play size={16} weight="fill" />保存并运行一次</button></div>
    </div></div>}
    {deletingTaskId !== null && <div className="task-dialog-backdrop" onClick={() => setDeletingTaskId(null)}><div className="task-delete-dialog" role="alertdialog" aria-modal="true" onClick={event => event.stopPropagation()}><header><Warning size={23} weight="fill" /><strong>确定删除任务？</strong><button aria-label="关闭" onClick={() => setDeletingTaskId(null)}><X size={20} /></button></header><p>删除后，定时任务及其配置将不可恢复。</p><footer><button onClick={() => setDeletingTaskId(null)}>取消</button><button className="danger" onClick={() => { setTasks(current => current.filter(task => task.id !== deletingTaskId)); setDeletingTaskId(null) }}>删除</button></footer></div></div>}
  </section>
}

function HistoryOverview({ items, onOpen }) {
  const [query, setQuery] = useState('')
  const expandedItems = [
    ...items.map((item, index) => ({ ...item, group: index === 0 ? '今天' : '近30天', kind: index % 3 === 2 ? 'agent' : 'assistant', summary: historySummaries[item.dataKey] || '打开对话' })),
    { id: 'OA审批任务列表', title: 'OA审批任务列表', group: '近30天', kind: 'agent', summary: '整理待处理审批、发起人、当前节点与截止时间，并结合任务紧急程度和业务影响给出清晰的优先级建议。' },
    { id: '企业知识库内容治理', title: '企业知识库内容治理', group: '近30天', kind: 'agent', summary: '汇总知识更新、解析失败、权限异常和待审核内容，形成包含负责人、处理建议和完成时限的治理行动清单。' },
  ]
  const normalizedQuery = query.trim().toLowerCase()
  const visible = normalizedQuery ? expandedItems.filter(item => `${item.title} ${item.summary}`.toLowerCase().includes(normalizedQuery)) : expandedItems
  const groups = ['今天', '近30天']

  return <section className="history-overview-page">
    <header className="history-overview-header">
      <h1>历史对话</h1>
      <div className="history-filter-row">
        <label className="history-search"><MagnifyingGlass size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索历史对话" aria-label="搜索历史对话" />{query && <button aria-label="清空搜索" onClick={() => setQuery('')}><X size={16} /></button>}</label>
        <button className="overview-more" aria-label="更多历史对话操作"><DotsThree size={21} weight="bold" /></button>
      </div>
    </header>
    <div className="history-overview-list">
      {groups.map(group => {
        const groupItems = visible.filter(item => item.group === group)
        if (!groupItems.length) return null
        return <section className="history-date-group" key={group}>
          <h2>{group}</h2>
          {groupItems.map(item => <button className="history-overview-item" key={item.id} onClick={() => items.some(source => source.id === item.id) && onOpen(item.id)}>
            <span className="overview-chat-icon"><ChatCircleDots size={15} /></span>
            <span className="overview-item-copy"><strong>{item.title}</strong><span>{item.summary}</span></span>
            <span className="overview-item-more" aria-label="更多操作" onClick={event => event.stopPropagation()}><DotsThree size={20} weight="bold" /></span>
          </button>)}
        </section>
      })}
    </div>
  </section>
}

function ConversationPage({ data, displayTitle, isPinned, initialEditing = false, initialDeleteConfirm = false, onPin, onRename, onCancelRename, onCopy, onDelete, onCancelDelete, message, setMessage, submit, sent, webSearch, setWebSearch }) {
  const turnRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(initialEditing)
  const [draftTitle, setDraftTitle] = useState(displayTitle)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(initialDeleteConfirm)
  const [conversationCopied, setConversationCopied] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState([])
  const [selectedKnowledge, setSelectedKnowledge] = useState([])
  const [selectedExpert, setSelectedExpert] = useState('')
  const [slashCapabilityOpen, setSlashCapabilityOpen] = useState(false)
  const [knowledgeMentionOpen, setKnowledgeMentionOpen] = useState(false)
  const [knowledgeLibraryOpen, setKnowledgeLibraryOpen] = useState(false)
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [voiceSeconds, setVoiceSeconds] = useState(0)
  const [voiceTranscribed, setVoiceTranscribed] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(360)
  const [rightSidebarFullscreen, setRightSidebarFullscreen] = useState(false)
  const [previewProduct, setPreviewProduct] = useState('')
  const [openPreviewProducts, setOpenPreviewProducts] = useState([])
  const [rightPanelMenuOpen, setRightPanelMenuOpen] = useState(false)
  const [savedPreviewProducts, setSavedPreviewProducts] = useState([])
  const [previewActionNotice, setPreviewActionNotice] = useState('')
  const [selectedPreviewText, setSelectedPreviewText] = useState('')
  const [selectionToolbar, setSelectionToolbar] = useState(null)

  useEffect(() => {
    if (!slashCapabilityOpen) return undefined
    const closeSlashMenu = event => {
      if (event.target.closest('.capability-slash-menu')) return
      setSlashCapabilityOpen(false)
      setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
    }
    document.addEventListener('pointerdown', closeSlashMenu)
    return () => document.removeEventListener('pointerdown', closeSlashMenu)
  }, [slashCapabilityOpen, setMessage])

  useEffect(() => {
    if (!knowledgeMentionOpen) return undefined
    const closeKnowledgeMenu = event => {
      if (event.target.closest('.knowledge-mention-menu')) return
      setKnowledgeMentionOpen(false)
    }
    document.addEventListener('pointerdown', closeKnowledgeMenu)
    return () => document.removeEventListener('pointerdown', closeKnowledgeMenu)
  }, [knowledgeMentionOpen])

  useEffect(() => {
    if (!rightPanelMenuOpen) return undefined
    const closeRightPanelMenu = event => {
      if (event.target.closest('.right-panel-menu-popover') || event.target.closest('.right-panel-menu-trigger')) return
      setRightPanelMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeRightPanelMenu)
    return () => document.removeEventListener('pointerdown', closeRightPanelMenu)
  }, [rightPanelMenuOpen])

  useEffect(() => {
    if (!selectionToolbar) return undefined
    const closeSelectionToolbar = event => {
      if (event.target.closest('.selection-writing-toolbar')) return
      setSelectionToolbar(null)
    }
    document.addEventListener('pointerdown', closeSelectionToolbar)
    return () => document.removeEventListener('pointerdown', closeSelectionToolbar)
  }, [selectionToolbar])

  useEffect(() => {
    if (!voiceRecording) return undefined
    const timer = window.setInterval(() => setVoiceSeconds(seconds => seconds + 1), 1000)
    return () => window.clearInterval(timer)
  }, [voiceRecording])

  const insertConversationSkill = name => {
    setSelectedSkills(current => current.includes(name) ? current : [...current, name])
    setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
    setSlashCapabilityOpen(false)
  }

  const chooseConversationExpert = name => {
    setSelectedExpert(name)
    setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current)
    setSlashCapabilityOpen(false)
  }

  const insertConversationKnowledge = name => {
    setSelectedKnowledge(current => current.includes(name) ? current : [...current, name])
    setKnowledgeMentionOpen(false)
  }

  const toggleConversationVoice = () => {
    if (!voiceRecording) {
      setVoiceSeconds(0)
      setVoiceTranscribed(false)
      setVoiceRecording(true)
      return
    }
    setVoiceRecording(false)
    setMessage(current => `${current}${current && !current.endsWith(' ') ? ' ' : ''}请继续补充关键风险与后续行动建议。`)
    setVoiceTranscribed(true)
    window.setTimeout(() => setVoiceTranscribed(false), 1800)
  }

  const voiceDuration = `${String(Math.floor(voiceSeconds / 60)).padStart(2, '0')}:${String(voiceSeconds % 60).padStart(2, '0')}`

  const copyAnswer = async () => {
    const text = [data.title, data.intro, ...data.sections.flatMap(([heading, items]) => [heading, ...items])].join('\n')
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard may be unavailable in preview */ }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const regenerate = () => {
    if (regenerating) return
    setRegenerating(true)
    window.setTimeout(() => setRegenerating(false), 1200)
  }

  const commitTitle = () => {
    if (!draftTitle.trim()) return
    onRename(draftTitle.trim())
    setShowRenameDialog(false)
  }

  const cancelRename = () => {
    setDraftTitle(displayTitle)
    setShowRenameDialog(false)
    onCancelRename?.()
  }

  const copyWholeConversation = () => {
    setConversationCopied(true)
    onCopy()
  }

  const startRightSidebarResize = event => {
    event.preventDefault()
    const resize = moveEvent => {
      const maximum = Math.min(Math.max(600, window.innerWidth * .5), window.innerWidth - 420)
      setRightSidebarWidth(Math.max(280, Math.min(maximum, window.innerWidth - moveEvent.clientX)))
    }
    const stop = () => {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stop)
      document.body.classList.remove('resizing-right-sidebar')
    }
    document.body.classList.add('resizing-right-sidebar')
    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stop)
  }

  const openProductPreview = name => {
    setOpenPreviewProducts(current => current.includes(name) ? current : [...current, name])
    setPreviewProduct(name)
    setRightSidebarWidth(Math.max(280, Math.round(window.innerWidth / 3)))
  }

  const closeProductPreview = name => {
    setOpenPreviewProducts(current => {
      const index = current.indexOf(name)
      const next = current.filter(item => item !== name)
      if (previewProduct === name) setPreviewProduct(next[Math.min(index, next.length - 1)] || '')
      return next
    })
  }

  const showPreviewNotice = notice => {
    setPreviewActionNotice(notice)
    window.setTimeout(() => setPreviewActionNotice(''), 1800)
  }

  const downloadPreview = () => {
    const text = [previewProduct.replace(/\.[^.]+$/, ''), data.intro, ...data.sections.flatMap(([heading, items]) => [heading, ...items])].join('\n\n')
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}))
    const link = document.createElement('a')
    link.href = url
    link.download = previewProduct
    link.click()
    URL.revokeObjectURL(url)
    showPreviewNotice('已开始下载')
  }

  const sharePreview = async () => {
    try { await navigator.clipboard.writeText(`${window.location.href}#preview=${encodeURIComponent(previewProduct)}`) } catch {}
    showPreviewNotice('分享链接已复制')
  }

  const savePreviewToKnowledge = () => {
    setSavedPreviewProducts(current => current.includes(previewProduct) ? current : [...current, previewProduct])
    showPreviewNotice('已保存到知识库')
  }

  const useSelectedPreviewText = event => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    if (!selectedText || !event.currentTarget.contains(selection.anchorNode) || !event.currentTarget.contains(selection.focusNode)) return
    const rangeRect = selection.getRangeAt(0).getBoundingClientRect()
    setSelectedPreviewText(selectedText)
    setSelectionToolbar({left: Math.max(340, Math.min(window.innerWidth - 340, rangeRect.left + rangeRect.width / 2)), top: Math.min(window.innerHeight - 66, rangeRect.bottom + 10)})
    setSelectedSkills(current => current.includes('帮我写作') ? current : [...current, '帮我写作'])
  }

  const conversationPageClass = rightSidebarOpen
    ? `conversation-page right-sidebar-open${rightSidebarFullscreen ? ' right-sidebar-fullscreen' : ''}`
    : 'conversation-page'

  return <section className={conversationPageClass} style={rightSidebarOpen ? {'--right-sidebar-width': `${rightSidebarWidth}px`} : undefined}>
    <header className="conversation-header">
      <strong>{displayTitle}</strong>
      <div className="conversation-actions">
        <button className={isPinned ? 'active' : ''} data-tooltip={isPinned ? '已置顶' : '置顶会话'} aria-label="置顶会话" aria-pressed={isPinned} onClick={onPin}><PushPin size={18} weight={isPinned ? 'fill' : 'regular'} /></button>
        <button data-tooltip="重命名" aria-label="重命名会话" onClick={() => setShowRenameDialog(true)}><PencilSimple size={18} /></button>
        <button className={conversationCopied ? 'active success' : ''} data-tooltip={conversationCopied ? '已创建副本' : '复制会话'} aria-label="复制会话" onClick={copyWholeConversation}><Copy size={18} /></button>
        <button className="danger-action" data-tooltip="删除会话" aria-label="删除会话" onClick={() => setShowDeleteConfirm(true)}><Trash size={18} /></button>
      </div>
      {!rightSidebarOpen && <button className="conversation-sidebar-toggle" type="button" aria-label="打开右侧栏" aria-expanded="false" onClick={() => setRightSidebarOpen(true)}><SidebarSimple size={20} /></button>}
    </header>

    {rightSidebarOpen && <aside className="conversation-right-panel" aria-label="对话右侧栏">
      {!rightSidebarFullscreen && <div className="right-panel-resizer" role="separator" aria-label="调整右侧栏宽度" aria-orientation="vertical" onPointerDown={startRightSidebarResize} />}
      <header className="right-panel-toolbar">
        <button className="right-panel-menu-trigger" type="button" aria-label="侧栏菜单" aria-expanded={rightPanelMenuOpen} onMouseEnter={() => setRightPanelMenuOpen(true)} onMouseLeave={event => { if (!event.relatedTarget?.closest?.('.right-panel-menu-popover')) setRightPanelMenuOpen(false) }} onFocus={() => setRightPanelMenuOpen(true)}><List size={18} /></button>
        {previewProduct ? <div className="right-panel-preview-tabs" role="tablist" aria-label="已打开文档">
          {openPreviewProducts.map(name => <div className={name === previewProduct ? 'preview-tab active' : 'preview-tab'} key={name}>
            <button type="button" role="tab" aria-selected={name === previewProduct} title={name} onClick={() => setPreviewProduct(name)}><File size={14} weight="fill" /><span>{name}</span></button>
            <button type="button" aria-label={`关闭 ${name}`} onClick={() => closeProductPreview(name)}><X size={13} /></button>
          </div>)}
        </div> : <span className="right-panel-toolbar-spacer" />}
        <button className="right-panel-fullscreen" type="button" aria-label={rightSidebarFullscreen ? '退出全屏' : '打开全屏'} aria-pressed={rightSidebarFullscreen} onClick={() => setRightSidebarFullscreen(value => !value)}>{rightSidebarFullscreen ? <ArrowsInSimple size={18} weight="bold" /> : <ArrowsOutSimple size={18} weight="bold" />}</button>
        <button type="button" aria-label="收起右侧栏" onClick={() => { setRightSidebarOpen(false); setRightSidebarFullscreen(false) }}><SidebarSimple size={18} /></button>
      </header>
      {rightPanelMenuOpen && <div className="right-panel-menu-popover" role="dialog" aria-label="产物和输入列表" onMouseEnter={() => setRightPanelMenuOpen(true)} onMouseLeave={event => { if (!event.relatedTarget?.closest?.('.right-panel-menu-trigger')) setRightPanelMenuOpen(false) }}>
        <section>
          <strong>产物</strong>
          {[
            ['中国籍持卡人订阅实操指南.md', File, 'blue'],
            ['订阅准备检查清单.docx', File, 'blue'],
            ['支付验证流程.pdf', File, 'red'],
            ['风险防范与合规建议.docx', File, 'blue'],
            ['订阅管理操作说明.html', AppWindow, 'blue'],
          ].map(([name, Icon, tone]) => <button type="button" key={name} onClick={() => { openProductPreview(name); setRightPanelMenuOpen(false) }}><Icon className={tone} size={16} weight="fill" /><span>{name}</span></button>)}
        </section>
        <section>
          <strong>输入</strong>
          <button type="button" onClick={() => setRightPanelMenuOpen(false)}><ChatCircleDots size={16} /><span>{data.question}</span></button>
        </section>
      </div>}
      {previewProduct ? <div className="right-panel-preview">
        <header className="right-panel-preview-header">
          <button type="button" aria-label="返回产物列表" onClick={() => setPreviewProduct('')}><CaretRight size={17} /></button>
          <strong title={previewProduct}>{previewProduct}</strong>
          {previewActionNotice && <span className="preview-action-notice" role="status">{previewActionNotice}</span>}
          <div className="preview-header-actions">
            <button type="button" aria-label="下载文档" title="下载" onClick={downloadPreview}><DownloadSimple size={16} /><span>下载</span></button>
            <button type="button" aria-label="分享文档" title="分享" onClick={sharePreview}><ShareNetwork size={16} /><span>分享</span></button>
            <button className={savedPreviewProducts.includes(previewProduct) ? 'active' : ''} type="button" aria-label="保存到知识库" aria-pressed={savedPreviewProducts.includes(previewProduct)} title={savedPreviewProducts.includes(previewProduct) ? '已保存到知识库' : '保存到知识库'} onClick={savePreviewToKnowledge}><Books size={16} weight={savedPreviewProducts.includes(previewProduct) ? 'fill' : 'regular'} /><span>{savedPreviewProducts.includes(previewProduct) ? '已保存' : '保存到知识库'}</span></button>
          </div>
        </header>
        <article className="document-preview-canvas" onMouseUp={useSelectedPreviewText}>
          <div className="document-preview-sheet">
            <span className="document-preview-type">{previewProduct.split('.').pop()?.toUpperCase()} 文档预览</span>
            <h1>{previewProduct.replace(/\.[^.]+$/, '')}</h1>
            <p>{data.intro}</p>
            {data.sections.map(([heading, items]) => <section key={heading}>
              <h2>{heading}</h2>
              <ol>{items.map(item => <li key={item}>{item}</li>)}</ol>
            </section>)}
          </div>
        </article>
      </div> : <div className="right-panel-content">
        <button className="right-panel-section-title" type="button">产物<CaretDown size={14} /></button>
        <div className="right-panel-products">
          {[
            ['中国籍持卡人订阅实操指南.md', File, 'blue'],
            ['订阅准备检查清单.docx', File, 'blue'],
            ['支付验证流程.pdf', File, 'red'],
            ['风险防范与合规建议.docx', File, 'blue'],
            ['订阅管理操作说明.html', AppWindow, 'blue'],
          ].map(([name, Icon, tone]) => <button type="button" key={name} onClick={() => openProductPreview(name)}><Icon className={tone} size={17} weight="fill" /><span>{name}</span></button>)}
        </div>
        <button className="right-panel-section-title" type="button">输入<CaretDown size={14} /></button>
      </div>}
    </aside>}

    <div className="conversation-scroll">
      <div className="conversation-thread-shell">
      <nav className="conversation-anchor-rail" aria-label="对话回合锚点">
        <button className="active" type="button" aria-label="定位到第 1 轮对话" onClick={()=>turnRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}><span className="conversation-anchor-mark"/><span className="conversation-anchor-preview" role="tooltip"><strong>{data.question}</strong><p>{data.title}</p><ul>{data.sections.slice(0,2).map(([heading])=><li key={heading}>{heading}</li>)}</ul></span></button>
      </nav>
      <article className="conversation-body" ref={turnRef}>
        <div className="question-bubble">{data.question}</div>
        <div className="completion-row"><span><CheckCircle size={16} weight="fill" />已完成 · 2m25s</span><CaretRight size={16} /></div>
        <div className="answer-block">
          <h1>{data.title}</h1>
          <p>{data.intro}</p>
          {data.sections.map(([heading, items]) => <section key={heading}>
            <h2>{heading}</h2>
            <ol>{items.map((item, index) => <li key={item}><span>{index + 1}.</span><p>{item}</p></li>)}</ol>
          </section>)}
          <div className="answer-note"><Warning size={18} /><span>以上内容仅供参考，正式操作前请核对最新服务条款与企业规范。</span></div>
          <div className="answer-footer">
            <div>
              <button className={copied ? 'active success' : ''} data-tooltip={copied ? '已复制' : '复制回答'} aria-label="复制回答" onClick={copyAnswer}><Copy size={18} weight={copied ? 'fill' : 'regular'} /></button>
              <button className={regenerating ? 'active regenerating' : ''} data-tooltip={regenerating ? '正在重新生成' : '重新生成'} aria-label="重新生成" onClick={regenerate}><ArrowCounterClockwise size={18} /></button>
              <button className={feedback === 'up' ? 'active' : ''} data-tooltip={feedback === 'up' ? '已标记为有帮助' : '有帮助'} aria-label="有帮助" aria-pressed={feedback === 'up'} onClick={() => setFeedback(feedback === 'up' ? '' : 'up')}><ThumbsUp size={18} weight={feedback === 'up' ? 'fill' : 'regular'} /></button>
              <button className={feedback === 'down' ? 'active' : ''} data-tooltip={feedback === 'down' ? '已提交反馈' : '无帮助'} aria-label="无帮助" aria-pressed={feedback === 'down'} onClick={() => setFeedback(feedback === 'down' ? '' : 'down')}><ThumbsDown size={18} weight={feedback === 'down' ? 'fill' : 'regular'} /></button>
            </div>
            <time>今天 14:56</time>
          </div>
        </div>
      </article>
      </div>
    </div>

    <div className={`composer conversation-composer ${sent ? 'sent' : ''}${selectedPreviewText ? ' has-preview-selection' : ''}`}>
      {slashCapabilityOpen && <SlashCapabilityMenu onSkillSelect={insertConversationSkill} onExpertSelect={chooseConversationExpert} />}
      {knowledgeMentionOpen && <KnowledgeMentionMenu onSelect={insertConversationKnowledge} onMore={() => { setKnowledgeMentionOpen(false); setKnowledgeLibraryOpen(true) }} />}
      {selectedPreviewText && <div className="preview-selection-chip" aria-label="引用的文档内容"><span>{selectedPreviewText}</span><button type="button" aria-label="移除引用内容" onClick={() => { setSelectedPreviewText(''); setSelectionToolbar(null) }}><X size={13} /></button></div>}
      {!!(selectedSkills.length || selectedKnowledge.length) && <div className="composer-skill-chips" aria-label="已选择技能和知识">
        {selectedSkills.map(name => <span className="composer-skill-chip" key={name}><Sparkle size={13} weight="fill" /><span>{name}</span><button type="button" aria-label={`移除技能${name}`} onClick={() => setSelectedSkills(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button></span>)}
        {selectedKnowledge.map(name => <span className="composer-skill-chip knowledge-chip" key={name}><Books size={13} weight="fill" /><span>{name}</span><button type="button" aria-label={`移除知识${name}`} onClick={() => setSelectedKnowledge(current => current.filter(item => item !== name))}><X size={11} weight="bold" /></button></span>)}
      </div>}
      <textarea className={`${selectedSkills.length || selectedKnowledge.length ? 'has-skill-chips ' : ''}${selectedPreviewText ? 'has-preview-selection' : ''}`} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => {
        if (e.key === 'Escape' && knowledgeMentionOpen) { e.preventDefault(); setKnowledgeMentionOpen(false); return }
        if (e.key === '@' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setSlashCapabilityOpen(false); setKnowledgeMentionOpen(true); return }
        if (e.key === 'Escape' && slashCapabilityOpen) { e.preventDefault(); setSlashCapabilityOpen(false); setMessage(current => current.endsWith('/') ? current.slice(0, -1) : current); return }
        if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setMessage(current => `${current}/`); setSlashCapabilityOpen(true); return }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
      }} placeholder={selectedSkills.length ? '' : '继续追问，或输入“/”调用技能或专家、“@”指定知识'} />
      <div className="composer-bottom">
        <div className="composer-tools"><ModePicker /><CapabilityPicker onSkillSelect={insertConversationSkill} selected={selectedExpert} onExpertSelect={setSelectedExpert} /><KnowledgePicker /></div>
        <div className="send-tools"><ContextUsageButton /><button className={webSearch ? 'web-search active' : 'web-search'} aria-label={webSearch ? '关闭联网搜索' : '开启联网搜索'} aria-pressed={webSearch} onClick={() => setWebSearch(!webSearch)}><Globe size={22} /></button><i /><button className={voiceRecording ? 'voice-input active' : 'voice-input'} aria-label={voiceRecording ? `停止语音输入，已录制${voiceDuration}` : '开始语音输入'} aria-pressed={voiceRecording} onClick={toggleConversationVoice}><Microphone size={22} weight={voiceRecording ? 'fill' : 'regular'} /></button><button className="send" aria-label="发送" onClick={submit}><ArrowUp size={25} weight="bold" /></button></div>
      </div>
      {sent && <div className="toast">消息已发送</div>}
      {voiceRecording && <div className="voice-status recording" role="status"><Microphone size={13} weight="fill" />正在录音 <strong>{voiceDuration}</strong></div>}
      {voiceTranscribed && <div className="voice-status transcribed" role="status"><CheckCircle size={14} weight="fill" />语音转写完成</div>}
      {knowledgeLibraryOpen && <KnowledgeLibraryModal onClose={() => setKnowledgeLibraryOpen(false)} onConfirm={names => { names.forEach(insertConversationKnowledge); setKnowledgeLibraryOpen(false) }} />}
    </div>
    <p className="ai-content-disclaimer conversation-disclaimer">内容由 AI 生成，请核实重要信息。</p>
    {selectionToolbar && <div className="selection-writing-toolbar" style={{left: selectionToolbar.left, top: selectionToolbar.top}} role="toolbar" aria-label="选中文本操作" onMouseDown={event => event.preventDefault()}>
      <button className="ai-rewrite" type="button" onClick={() => { setSelectedSkills(current => current.includes('帮我写作') ? current : [...current, '帮我写作']); setSelectionToolbar(null) }}><span className="rewrite-avatar">👩🏻</span><span>AI 改写</span></button>
      <i />
      <button className="with-caret" type="button" aria-label="文本样式"><TextT size={23} /><CaretDown size={14} /></button>
      <i />
      <button className="with-caret" type="button" aria-label="对齐"><TextAlignLeft size={22} /><CaretDown size={14} /></button>
      <i />
      <button type="button" aria-label="加粗"><b>B</b></button><button type="button" aria-label="删除线"><s>S</s></button><button type="button" aria-label="斜体"><em>I</em></button><button type="button" aria-label="下划线"><u>U</u></button><button type="button" aria-label="链接"><LinkSimple size={21} /></button><button type="button" aria-label="代码"><Code size={22} /></button><button className="highlight-tool with-caret" type="button" aria-label="高亮"><span>A</span><CaretDown size={14} /></button>
      <i />
      <button className="copy-tool" type="button" aria-label="复制选中文字" onClick={() => navigator.clipboard?.writeText(selectedPreviewText)}><Copy size={20} /><span>复制</span></button><i /><button type="button" aria-label="添加评论"><ChatCircleDots size={22} /></button>
    </div>}
    {showRenameDialog && <div className="rename-backdrop" role="presentation" onClick={cancelRename}>
      <div className="rename-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-title" onClick={e => e.stopPropagation()}>
        <div className="rename-head"><h2 id="rename-title">编辑对话名称</h2><button aria-label="关闭" onClick={cancelRename}><X size={20} /></button></div>
        <input autoFocus value={draftTitle} maxLength={50} onChange={e => setDraftTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') cancelRename() }} aria-label="新的对话名称" />
        <div className="rename-count">{draftTitle.length}/50</div>
        <div className="rename-actions"><button onClick={cancelRename}>取消</button><button className="primary" disabled={!draftTitle.trim()} onClick={commitTitle}>确定</button></div>
      </div>
    </div>}
    {showDeleteConfirm && <div className="confirm-backdrop" role="presentation" onClick={() => { setShowDeleteConfirm(false); onCancelDelete?.() }}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onClick={e => e.stopPropagation()}>
        <div className="confirm-head"><span className="confirm-icon"><Warning size={22} weight="fill" /></span><h2 id="delete-title">确定删除对话？</h2><button aria-label="关闭" onClick={() => { setShowDeleteConfirm(false); onCancelDelete?.() }}><X size={22} /></button></div>
        <p>删除后，聊天记录将不可恢复。</p>
        <div><button onClick={() => { setShowDeleteConfirm(false); onCancelDelete?.() }}>取消</button><button className="danger" onClick={onDelete}>确认删除</button></div>
      </div>
    </div>}
  </section>
}

export default App
