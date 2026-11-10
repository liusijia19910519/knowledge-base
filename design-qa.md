# Design QA — @ 知识选择弹窗与历史时间

## 2026-11-10 — 默认产品说明页、库内操作约束与内部分享（当前版本）

本轮包含产品说明页面和随后用户补充的业务规则。说明页中的权限、分享和位置范围已同步为最新规则；下方旧记录为历史验收，不代表当前仍提供链接分享或普通跨库移动。

### 说明页与阅读交互

- 根地址默认进入独立 `#/overview`，说明页不包含原型侧栏。页头、首屏及页尾进入原型；原型账号区的说明入口可返回说明页。
- 提供六个业务模块与横向能力导图、三类空间比较、50 项详细功能表、四项权限说明、四条典型流程、FAQ 与原型范围。
- Ego TaskSpace 18 实际点击导图问 AI 节点，正确筛选出 8 项能力；关键词查找、无结果重置、展开全部（50 行）、收起全部（0 可见详情行）均生效。
- 全部功能清单实际下载为带 UTF-8 BOM 的 CSV，共 51 行（含表头）。目录深链刷新后定位到对应章节；四个流程页签与左右方向键切换生效。
- 390px 窗口无页面横向溢出，移动目录自动关闭，表格置于独立横向滚动区域；FAQ 展开与进入原型可用。

### 新建、复制、移动

- 主页新建显示可选择的目标知识库（实测 10 个选项，含占位项）；个人库、共享库、广场库内部新建均仅显示当前库的只读名称。
- 新建并保存“QA-库内操作验收”，分别创建目录 A、目录 B 和“库内说明文档”。文档在独立标签页编辑，保存正文后原列表同步。
- 空库及目录 A 移出内容后的空态，新建入口均提供文档、表格、幻灯片、文件夹四种类型，与顶部新建一致。
- 将文档复制到目录 A，显示可修改的副本名称；再将副本移动到目录 B，最终在目录 B 查看到了完整正文。
- 移动与复制弹窗均无其他知识库下拉。主页混选不同库的文档后，复制/移动禁用并显示原因，删除仍按已有管理能力判断。
- 转共享、广场发布使用专用流程，仍然可用；生成广场待发布副本后，再次实测新建及复制位置固定为该广场库。共享库上传入口同样固定当前库。

### 内部成员分享

- 去掉链接生成、复制、有效期和撤销界面；旧 `#/share/...` 显示不可用页面。问 AI 产物不再提供复制分享链接动作。
- 将测试个人库转共享后，选择林夏分享单个文件；未确认授权时阻止提交并说明原因。确认只授予查看、改为独立权限后分享成功。
- 重开分享弹窗有林夏的分享记录；成员权限中“林夏查看”选中，编辑/分享/管理均未选中，未生成链接字段。
- 分享知识库给陈可后，库级权限也仅新增查看。普通分享者无法越权为未授权成员授予查看；个人库保持私有，需先转共享。
- 接收人待处理入口依据内部分享记录和当前查看权限计算，查看后标记已读；重复分享更新记录而不堆积。撤销权限后不再展示可访问提醒。

权限与范围回归：`node --test src/kb/businessData.test.mjs src/kb/askData.test.mjs src/kb/contentRules.test.mjs` 共 34 项通过；包含内部成员校验、管理授权确认、继承保留、待发布文件单独授权、跨库拒绝、同目录副本命名和混库批量限制。构建通过。

## 2026-11-10 — 单一用户界面与简化问 AI（当前版本）

用户最新决定：固定一个当前用户，移除身份预览和管理后台；问 AI 使用其他知识模块的统一样式，保留简单功能闭环，删除计划模式。以下为本机 Ego TaskSpace 16 的实际操作记录。

- 六个可见模块共用同一侧栏和周宁账号信息，所有页面没有身份切换、身份预览或“当前浏览器内保存”壳层文案。协作成员仍用于授权。旧 `#/admin` 显示回退页，不能打开后台。
- 问 AI 统一页头、字号、间距、边框、按钮、弹窗和空态；默认输入仅保留技能/专家、知识、附件、语音和发送，不再显示模式或联网搜索入口。技能默认直接执行，不出现计划确认。
- `/` 搜索并 Enter 选择首个匹配项，临时斜杠被移除；Escape 关闭并清理触发符。技能以可删除芯片展示，专家选择显示于入口并可清除，芯片存在时不显示输入提示。
- `@` 搜索并选择知识，不留下 `@`；显式选择或清除全部知识可用。两栏知识选择器的知识库、目录和文档可多选，确认后显示相应芯片。
- 提问“报销需要哪些材料”得到来源可追溯的回答；实际打开引用文档新标签页。点击继续追问并发送后形成两轮对话；刷新两轮仍保留。
- 历史对话可搜索、恢复、重命名和确认删除；空重命名有校验，无搜索结果有独立空态。恢复历史时同步还原该对话的知识范围与可选能力。
- 上传实际 README.md，语音显示 `00:01` 计时，停止后转写文字可修改。生成中停止、重新生成均实际执行。右侧输入区域可下载原始附件，下载文件与上传文件 SHA-1 一致。
- 技能/专家中心搜索可用；从中心使用数据分析直接生成初稿，从专家中心召唤知识专家后入口显示该专家。草稿尚未发送时开始新对话有保留/放弃选择。
- 产物可打开、修改标题/正文、保存修改、下载、保存到个人知识库。实际在新标签页查看保存文档，正文包含人工补充内容，刷新后保留；同名再次保存显示重复名称校验。普通问答结果也能直接保存为文档。
- 右侧查看区域支持宽度调整、全屏/退出与关闭；未保存的产物修改关闭前有确认。数据不足或来源权限变化时不展示虚构或越权正文。
- 375px 和 760px 检查知识弹窗、能力列表与账号区域：弹层位于可见区域内，列表独立滚动，紧凑侧栏只显示账号头像；窄屏展开侧栏后可选择页面并自动收起，无账号文字竖排或页面横向溢出。

最终检查：`node --test src/kb/businessData.test.mjs src/kb/askData.test.mjs`（23 项），`npm run build`。问 AI 为浏览器内可演示的交互闭环，未连接真实模型、联网搜索或组织认证服务。

## 2026-11-10 — 外部问题清单修复、权限边界与独立编辑标签页

依据用户提供的 [验收功能树](https://warm-zenith-kedwsh.pages.grok.bot/) 的 ISSUE-01～07 修复。清单的“模拟边界”和“未测”不当作已经实现的真实服务。

| 问题 | 修正及 Ego 回归结果 |
| --- | --- |
| ISSUE-01 新建/上传禁用无解释 | 两个按钮共用可写位置判断；禁用时显示原因并通过 title/aria-describedby 关联。同一身份有自建库时主页可用；只读广场库中验证按钮禁用、原因可见。 |
| ISSUE-02 无效路由空白 | `#/not-a-real-route-qa` 显示“页面不存在”，点击返回主页可继续工作。 |
| ISSUE-03 问 AI 空输入发送 | 空值、纯空格发送按钮禁用；Enter 提示输入，不生成对话。 |
| ISSUE-04 问 AI 历史丢失 | 问答按身份持久化。实测示例提问→来源文档→回问 AI→历史恢复→刷新；完整问答仍在。新对话后也可点击历史恢复。 |
| ISSUE-05 侧栏壳层不一致 | 所有模块复用 BusinessWorkspace 侧栏。实测置顶验收库在主页、问 AI、管理后台一致，“恢复示例”入口已移除；测试后撤销测试置顶。 |
| ISSUE-06 删除确认跨页残留 | 打开测试库删除确认但不确认，切换回收站，弹窗关闭且库未删除。 |
| ISSUE-07 长名称布局 | 库名称限制 40 字符并显示计数，既有长名称换行/截断。实测 80 字符输入限制到 40，760px 窗口创建弹窗、确认框无横向溢出；仅删除并清理本轮长名称测试空库。 |

本轮额外实际点击验证：

- 新建菜单仅文档、表格、幻灯片、文件夹。文档/表格/幻灯片创建后均打开独立编辑标签页，原页保持原位置。文档正文保存后原列表同步更新。
- 表格编辑 A1/B1/A2/B2，新增行列后写入 G13，保存并刷新仍保留；实际下载 CSV。
- 幻灯片编辑两页标题和正文，切换页面、保存、刷新恢复第二页；实际下载文本内容。
- 两个标签页同时编辑同一文档：新版本保存后旧草稿再保存会提示冲突，保留草稿并不覆盖新正文。
- 在专用“权限边界验收库”中配置陈可查看/编辑/分享、赵衡仅管理。实测陈可可编辑保存和生成分享链接，但无成员授权菜单；赵衡无法读正文、新建禁用，但可维护权限。
- 独立子文件撤销陈可权限后，陈可复制其父目录会明确失败，未生成目录副本。
- 林夏通过分享链接申请单文件查看；创建者批准时先核对打断继承的权限。取消保留待处理状态，再批准保存后林夏可读且不可编辑。重新继承后林夏立即失去查看；撤销旧分享链接后显示链接失效。
- 跨库移动后正文、历史保留，权限改为目标继承：原文件作者周宁仅保留目标库授予的查看/编辑，不能分享/授权，归属为目标库创建者赵衡，原创建人记录保留。继续移交库所有权给陈可后，新创建者拥有全部权限，赵衡保留协作能力但不再有移交入口。
- 文件夹分享链接打开正确的库内目录，陈可无法看到被独立限制的子文件。
- 最终补测：管理者打开文件权限弹窗期间，另一标签页保存新正文，随后保存权限不会覆盖新正文；库创建者和继承的管理能力在权限表中始终可见。仅管理而无查看的赵衡在问 AI 中也无法检索受限子文件正文。

验证方式：本机 Ego TaskSpace 13；最终 `node --test src/kb/businessData.test.mjs` 18 项通过，`npm run build` 通过。上传原文件、权限和会话依然属于本浏览器交互原型；未接入真实后端认证或模型服务。

## 2026-11-10 — 五个知识管理模块完整业务验收

本节为当前知识库独立原型的最新验收记录。后面的旧记录保留为历史参考。

范围：主页、知识广场、共享知识库、个人知识库、回收站及库内目录、文档、附件、权限和分享页面。问 AI、管理后台保持原界面，并验证入口仍可正常加载。

### Ego 实际点击到最终结果

| 功能链路 | 结果证据 |
| --- | --- |
| 创建个人知识库、填写简介、打开详情 | 创建了“全链路验收库”，库内可继续创建目录与文档 |
| 创建目录、二级目录、目录展开/收起、路径导航 | 目录树及内容列表同步，子目录可展开/收起 |
| 新建文档、编辑、保存、刷新 | 第一版正文刷新后仍保留 |
| 连续修改、历史版本恢复 | 恢复后正文回到第一版，旧版本保留 |
| 评论提交、刷新 | 评论持续存在，并显示作者和时间 |
| 个人库切换其他身份访问 | 正文不可读，私人内容不允许外部授权 |
| 个人库转为共享库 | 原内容保留；初始只有创建者有权，另行添加成员 |
| 独立授权查看/编辑/分享/管理 | 编辑者可编辑但不可授权；仅管理者可授权但不可读正文/新建；分享者可生成链接但不可改成员 |
| 文件取消继承、单独取消编辑、重新继承 | 文件变只读；重新继承后恢复库内编辑能力 |
| 目录单独授予编辑 | 林夏在无库级编辑权限时可在获授权目录内新建并保存文档 |
| 文件单独撤销查看 | 直接访问正文被拒绝；显示申请查看入口 |
| 共享链接生成、有效期选择、复制、打开、撤销 | 已授权用户可打开；撤销后显示链接失效 |
| 取消查看后继续使用旧链接 | 不能绕过权限，必须申请访问 |
| 申请、批准、再次打开 | 管理者主页收到申请，批准后可以访问；原分享能力保留 |
| 申请、拒绝、申请人再次查看 | 待处理及拒绝结果均可见，拒绝后仍不能读正文 |
| 移除知识库成员 | 其库内独立授权一并撤销，直接访问库和文件均不能绕过 |
| 共享库生成广场待发布副本 | 原库保留；切换其他身份无法读草稿 |
| 确认发布、切换其他身份读取 | 全员可查看，默认没有编辑能力 |
| 公开文档保存修改、再次发布 | 确认前读者读旧版，确认后读修订版 |
| 已公开库新增文档 | 新增仍为待发布，确认前其他身份不能读，确认后可读 |
| 撤回发布 | 未获单独授权的用户立即失去访问 |
| 多文件上传、刷新后读取 | README 与 PNG 原文件保存；文本和图片可预览 |
| PDF 上传及预览 | 预览 iframe 加载保存的 PDF，文件头和原文件一致 |
| 下载原文件 | 下载的 README 与上传源文件使用 cmp 比对一致 |
| 文件重命名、移到子目录、跨库复制 | 对应名称和位置改变，副本出现在目标库 |
| 批量删除文件、分别恢复 | 回收站出现独立删除项，恢复可继续读取 |
| 删除目录、恢复目录 | 本次一起删除的子文件恢复；此前单独删除的文件仍留在回收站 |
| 彻底删除原件 | 不影响仍被复制副本引用的原文件 |
| 彻底删除未被引用附件 | 实际检查 IndexedDB，原文件已清理 |
| 知识库改名、改简介、刷新 | 新名称和简介保留 |
| 置顶、侧栏显示 | 置顶知识库出现在侧栏 |
| 所有权移交 | 新创建者拥有全部权限，原创建者保留协作权限 |
| 知识库删除、恢复、彻底删除 | 删除后内容不可访问；恢复后内容和目录可用；彻底删除后旧地址不可用 |
| 同名恢复校验、修改恢复名称后重试 | 原提交被阻止，更换名称后恢复成功 |
| 收藏/取消收藏及对应筛选 | 收藏视图增减与操作一致 |
| 主页范围、内容类型、名称排序、全文搜索、无结果 | 文档集合与筛选一致；无结果可清空筛选 |
| 共享库“全部/我创建的/与我共享” | 创建者归属对应正确 |
| 知识库搜索、卡片/列表切换、排序 | 搜索命中、布局切换正常 |
| 广场“已发布/待发布” | 展示对应状态且遵守可见权限 |
| 空名称、未选文件、同名内容 | 明确校验并阻止错误提交 |
| 未保存内容退出、继续编辑、保存并继续 | 未保存正文不丢失，保存后能到目标页 |
| 侧栏收起/展开、首页动态查看 | 操作可用，动态记录对应实际操作 |

### 业务逻辑验证

`node --test src/kb/businessData.test.mjs`：13 项通过，覆盖个人库隔离、四项能力独立、草稿发布边界、文件继承、独立分享文件的发现、删除批次、循环移动防止、批量复制目录层级、复制不带出私有历史与评论、撤权与发布目录的子内容边界。

`npm run build`：通过。

### 视觉检查

使用 Ego 检查标准 1440×960 桌面主页与广场，以及库内目录、文档、权限弹窗和共享库列表。统一使用项目的 Phosphor 图标、浅色表面、蓝色动作、紧凑控件与一致表格。当前视觉截图位于 `/private/tmp/business-1440-home.png`、`/private/tmp/business-1440-plaza.png`、`/private/tmp/business-permissions-final.png`、`/private/tmp/business-space-final.png`。

最后一次总检逐一刷新五个模块，均正常显示；复查个人库卡片/列表和搜索，并检查 1024×900 窄桌面库内表格与权限弹窗，弹窗完整位于视口内。补充截图：`/private/tmp/business-1440-personal-final.png`、`/private/tmp/business-1024-space-final.png`。

### 原型数据边界

本次实现是可交互本地业务原型：元数据/正文保存在当前浏览器 localStorage，原文件保存在 IndexedDB。可切换示例身份验证权限效果；未接入云端认证、跨设备同步或实时多人协同。验收过程只操作新建验收内容，保留“全链路验收库”等资料供复查。

### 业务语义与冗余控件复查

- 个人知识库移除重复的归属筛选和卡片创建者信息；个人文档显示“仅自己可见”，不再用继承授权或分享勾选暗示对外共享。
- 首页“与我共享”只统计其他人拥有的共享库内容，排除广场；最近访问只读取本人记录并按访问时间排序。直接打开文档也记录本人访问。
- 从类别页创建知识库时固定类型；设置页只读展示类型，避免出现不能操作的类型下拉框。
- 空目录提供可执行的新建入口；空收藏、空访问记录、无搜索结果分别提供对应说明和下一步。库搜索无结果提供重置筛选。
- 只读空文档不提示编辑；单文件删除、文件发布与整库恢复文案按实际对象区分。
- Ego 验证：个人库固定类型/设置只读、共享范围、本人访问记录、空目录新建及取消、个人权限信息、单文件删除提示、搜索重置、共享库三项筛选均通过；生产构建通过。

- Source visual truth: `/var/folders/cx/6rc913513png1k6jp58767wc0000gn/T/codex-clipboard-c5963b31-e1c0-4346-9b7e-16fb29952e78.png`
- Implementation screenshot: `/Users/lipengfei/Mac电脑文件/01_AI知识库/企业AI智能体平台原型/implementation-knowledge-mention.png`
- Browser viewport / CSS size: 1280 × 720 at device scale factor 1
- Source pixels: 1990 × 874
- Implementation pixels: 1280 × 720
- Density normalization: compared as responsive component regions rather than pixel-for-pixel full-page frames because the source is a cropped reference from another product shell.
- State: new-conversation composer focused after typing `@`, knowledge dialog open; sidebar history timestamps visible.

## Full-view comparison evidence

The implementation preserves the existing prototype shell while matching the reference dialog's white floating surface, compact vertical list, blue folder/document icons, divider, and final “从知识中心选择更多” row. Per the latest product annotation, the current badge and default preselection are intentionally omitted. The dialog is anchored directly above the composer and does not obscure the composer controls.

## Focused region comparison evidence

Focused inspection was used because the reference targets a small menu. Typography, row height, icon alignment, selected background, badge, border radius, shadow, divider, and trailing chevron were checked at the menu level. The implementation intentionally uses the prototype's existing Phosphor icon family and compact type scale.

## Interaction checks

- Typing `@` opens the knowledge dialog without inserting a raw `@` character.
- Selecting “李鹏飞的个人知识库” closes the dialog and creates a removable knowledge chip.
- The chip can be removed.
- Escape closes the dialog.
- Outside-click uses the same close behavior.
- The shared component is wired into both new and historical conversation composers.
- History rows display relative timestamps and retain the existing hover/focus more-actions affordance.
- Browser-rendered DOM was inspected after each primary interaction; no broken states or application error surfaces were observed.

## Required fidelity surfaces

- Fonts and typography: compact sizes, weights, truncation, and hierarchy match the surrounding prototype and the reference's dense menu treatment.
- Spacing and layout rhythm: menu width, row rhythm, internal padding, divider, radius, and elevation are balanced and responsive.
- Colors and visual tokens: existing neutral surfaces, blue knowledge icons, gray selected row, and subtle border/shadow tokens are consistently reused.
- Image quality and asset fidelity: no raster assets are needed; standard UI icons use the project's existing icon library and remain crisp.
- Copy and content: reference knowledge names, current badge, and more-selection action are represented; requested history timestamps are present.

## Findings

No actionable P0, P1, or P2 differences remain. The source belongs to a different product shell and viewport, so exact absolute position and scale are intentionally adapted to this prototype rather than copied globally.

## Comparison history

- Initial implementation: passed focused visual comparison; no P0/P1/P2 fixes were required.

## Follow-up polish

- P3: keyboard arrow-key navigation and live filtering could be added in a future interaction pass.

final result: passed

## Knowledge library modal follow-up

- Source visual truth: `/var/folders/cx/6rc913513png1k6jp58767wc0000gn/T/codex-clipboard-7dd04bd9-1881-4f9b-868c-bac7bd8f8739.png`
- Implementation screenshot: `/Users/lipengfei/Mac电脑文件/01_AI知识库/企业AI智能体平台原型/implementation-knowledge-library-modal.png`
- Viewport / implementation pixels: 1280 × 720 at device scale factor 1
- State: “从知识中心选择更多” activated, compact mention menu closed, large knowledge picker open.
- Intentional adaptation: the reference's “团队” column is omitted per annotation; the remaining “知识库” and “知识库目录” columns expand to use the available width.
- Interaction evidence: close, backdrop dismiss, cancel, search, tabs, checkbox selection, disabled/enabled confirmation, confirmation, and removable chip output are implemented. Browser verification confirmed the compact menu closes before the large modal opens and that no team heading is rendered.
- Fidelity review: typography, spacing rhythm, neutral/blue tokens, crisp library icons, modal elevation, dimmed backdrop, selected rows, and Chinese copy match the reference at the component level. No raster imagery is required.
- Findings: no actionable P0/P1/P2 issues remain after the intentional two-column adaptation.

final result: passed
# Right-side document AI panel QA (2026-08-12)

- Source: user-provided screenshot with the right-side AI area marked in red.
- Compared state: standalone `公共模板` document at the current desktop viewport.
- Layout: passed — the AI panel is fixed to the right edge at 360px, and the outline/document columns shrink without overlay.
- Hierarchy: passed — header, overview card, quick actions, related knowledge, suggested questions, and bottom composer match the reference structure.
- Interaction: passed — overview collapse, suggestion selection, text entry, Enter-to-send, and simulated assistant response work.
- Runtime: passed — production build succeeds and browser console reports no page errors.
- Remaining P3: at narrower desktop widths, the document canvas becomes denser than the wide reference screenshot; responsive rules reduce panel width to 320px.

final result: passed

## Collaborator permission assignment (2026-11-10)

- Reference: user-supplied collaborator dialog with per-member permission dropdowns. The prototype retains its light styling and four independent capabilities; viewing continues to include preview/download.
- Replaced the permission matrix with avatar/member rows, effective-right summaries and right-aligned dropdowns. Presets are “仅查看” and “可编辑”; custom permissions expose 查看 / 编辑 / 分享 / 管理 individually.
- Ego checks reached persisted results: two collaborators added with different permissions, save/reload/reopen preserved the exact grants, custom file sharing did not add edit/manage rights, and cancelled changes did not persist.
- Removal/undo and removal/save were exercised. Removing a library collaborator cleared both their library grant and their independent file grants after reload.
- Inheritance was disabled, edited, saved and reloaded; restoring inheritance returned to the library's effective rights. Library-manager rights remained locked at the file level. Creator controls were protected.
- Published Plaza content displayed its global-reading notice and disabled the custom view checkbox. Adding a collaborator without any capabilities was blocked with an explanation. Search, empty results, cancel-add reset, Escape and focus return were checked.
- Layout checked at desktop and 390 × 844. The portal dropdown and custom panel remained within the viewport, including upward placement near the bottom. Screenshots: `/private/tmp/permissions-dropdown-before.png` and `/private/tmp/permissions-mobile.png`.
- Validation: all 40 business/AI/content/permission-policy tests passed; production build passed.

final result: passed
