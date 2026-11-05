# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable prototype decisions

- Render the application as a direct full-browser page without an outer black canvas, inset frame, page label, or rounded page shell.
- Use restrained Codex-like UI typography and density for the sidebar and lightweight action controls.
- Shortcut actions above the composer use flat icon-and-text styling, without pill borders or elevated button treatments.
- The composer send control uses a flat neutral icon style, without a filled circular background; hover may use a subtle gray surface.
- Typing `/` in the composer opens the skill/expert picker, focuses its search field, and lets Enter choose the first filtered result.
- A selected expert is displayed in the composer capability control. A selected skill appears inside the message area as a tinted chip without a leading slash; hovering the chip reveals an × control for removal.
- Hide the composer placeholder whenever the message area contains typed text or one or more selected skill chips; restore it only when the area is empty.
- The composer capability control opens a compact two-level flyout: a left category menu and a right search/list panel. Hovering or clicking “专家” or “技能” switches the right panel while preserving the existing selection behavior.
- The capability flyout category menu contains only “专家” and “技能”; do not include “添加文件”, “模式”, or “连接器”.
- Typing `/` opens a separate full-width command palette above the composer, with skill/expert tabs and dense single-line rows (icon, name, truncated description, pin affordance). Choosing an item removes the temporary slash and applies the existing skill-chip or expert-selection behavior.
- The composer `@` entry is labeled “知识”, and its placeholder hint says `“@”指定知识`; slash hints say “调用技能或专家”.
- The slash command palette is anchored to the composer itself: its left and right edges match the input box exactly, its bottom edge touches the composer's top edge, and its typography is one step smaller than the compact button-triggered picker.
- Clicking anywhere outside the slash command palette, or pressing Escape, closes it and removes the temporary trailing `/` trigger.
- The composer action row places the microphone button to the right of the divider, between the divider and send. It toggles a restrained recording state and uses the existing Phosphor microphone icon.
- Voice recording shows an `mm:ss` timer. Stopping it simulates transcription by appending realistic transcript text to the composer and briefly showing a completion status; the prototype does not request real microphone permission.
- The history-conversation composer mirrors every current new-conversation composer capability and control order, including skill chips, expert selection, slash palette, “知识”, web search, voice timer/transcription, attachment, and send.
- The composer “知识” entry uses the product's knowledge/book icon rather than an `@` glyph, in both new and historical conversations.
- The shared conversation mode picker includes “计划模式” with the description “先制定计划，确认后再执行”.
- Clicking the composer knowledge control opens a shared menu with “添加本地文件”, “全部知识”, and “从知识中心选择”; “全部知识” is selected by default in both new and historical conversations, choosing another scope replaces it, and the selected scope hides the dropdown caret and can be cleared with a hover-revealed × control.
- Selecting any top quick action (“审批申请”, “帮我写作”, “处理待办”, “待办任务”, or “数据可视化”) adds a removable chip inside the new-conversation composer using the same visual treatment and hover-revealed × behavior as selected skills, instead of writing the action name into the textarea; each chip preserves its source action icon.
- Expert-center card primary actions use the label “召唤”; skill-center card actions retain “使用”.
- Clicking an expert-center “召唤” action opens a clean new conversation and sets that card's expert as the selected capability in the composer.
- Clicking a skill-center “使用” action opens a clean new conversation and adds that card's skill as the selected removable skill chip in the composer.
- Clicking the application-center “审批系统” card navigates the current window to `http://demo.docmis.cn:45001/sq-saas-ui-oa/center?defaultSystem=sq-saas-ui-oa`; other application cards retain the local selected-card feedback behavior.
- The former pair of utility icons in the upper-right corner of the main content area is removed globally, with no reserved placeholder space.
- Historical-conversation headers include a right-sidebar toggle matching the supplied icon reference, positioned against the far-right edge with a 24px safety inset; it is visible only while the sidebar is closed. Opening it pushes out a full-height workspace sidebar from the right and shrinks the conversation/header/composer rather than obscuring them; the sidebar's own far-right collapse control closes it.
- The right workspace sidebar toolbar is intentionally minimal: a menu control on the left and the collapse control on the far right; the blue application mark, history, title, close, and expand controls are omitted.
- The right-sidebar section order is “产物” first (including its generated-file list), followed by “输入”.
- The open right workspace sidebar has a draggable resize handle along its left edge; horizontal dragging adjusts the panel from 280px up to at least 50% of the viewport (while retaining 420px for the conversation), and the header, content, fade, and composer all track the chosen width.
- A fullscreen toggle sits immediately left of the right-sidebar collapse control. It expands the sidebar across the full main-content area, switches to an exit-fullscreen icon, hides the underlying conversation and resize handle while active, and restores the prior width when toggled off.
- Clicking any item in the right-sidebar “产物” list opens an in-panel document preview with the file name, a rendered document canvas, and explicit back/close controls; the existing fullscreen toggle can enlarge the preview.
- Opening a product document resets the preview sidebar to one third of the current viewport width (with a 280px floor); the user can then continue resizing it from the left edge.
- Document previews maintain a scrollable tab strip of every opened product in the sidebar's topmost toolbar, between the menu and fullscreen controls. Tabs switch previews directly and can be closed independently; closing the active tab selects an adjacent document, and files opened after returning to the product list join the existing tab set.
- Preview tabs use the supplied reference's compact toolbar treatment: borderless rounded tabs, a light-gray active fill, left-aligned file icon and truncated title, and a dedicated close control on the right.
- The sidebar fullscreen toggle uses the reference's simple two-corner diagonal expand/collapse glyph, with compact neutral styling and a subtle active fill while fullscreen.
- Hovering or keyboard-focusing the sidebar menu icon opens a compact overlay grouped into “产物” and “输入”. The overlay remains open while hovered, closes after the pointer leaves both trigger and overlay (or on outside interaction), and product rows open/switch document previews.
- The document preview title bar exposes download, share, and “保存到知识库” actions as compact icon-plus-text buttons. Download produces the current preview file, share copies a deep-link, and save adopts an active “已保存” state with brief inline confirmation.
- Selecting non-empty text inside a document preview displays a compact floating formatting/“AI 改写” toolbar near the selection, preserves the visible selection, adds the exact text as a removable quote card at the top of the historical-conversation composer, and automatically enables the “帮我写作” skill chip.
- The selection toolbar follows the supplied reference: avatar-led “AI 改写”, separated typography/alignment dropdowns, bold/strike/italic/underline/link/code tools, yellow highlight control, icon-plus-text copy, and a final comment action in a single non-wrapping row.
- The selection toolbar uses a compact 44px treatment and dismisses on any outside pointer interaction without removing the composer quote card or the enabled “帮我写作” skill.
- Typing `@` in either composer opens a compact knowledge-selection dialog above the input; selecting an item adds a removable knowledge chip without leaving the raw `@` character in the message, while Escape or outside-click closes the dialog.
- The `@` knowledge dialog opens with no preselected row or “当前” badge; rows highlight only through interaction.
- Knowledge scope pickers start unselected and display the neutral “知识” label; “全部知识” is applied only after an explicit user selection.
- The Knowledge Center card section omits a duplicate heading/count and retains only the functional “全部 / 我创建的 / 与我共享” scope tabs; the tabs filter the cards.
- The Knowledge Center removes the “最近更新” control and moves the library search field from the page header to the right side of the scope-filter row.
- Clicking the Knowledge Center subnav “主页” opens a reference-aligned document list with new/upload/template actions, recent/owned/shared/favorite tabs, search, and document metadata columns; clicking “知识库” returns to the library cards.
- Clicking “问AI” in Knowledge Center opens a fresh conversation with “全部知识” selected by default, or with the currently selected knowledge library automatically selected.
- The Knowledge Center page's primary heading is “知识库”; the secondary navigation identity remains “知识中心”.
- “从知识中心选择更多” closes the compact `@` dialog and opens a larger two-column knowledge picker containing only “知识库” and “知识库目录” (the reference's team column is intentionally omitted); cancel, backdrop, close, checkbox selection, and confirm states are interactive.
- Both knowledge-library rows and knowledge-directory rows expose checkboxes and contribute to the same multi-select confirmation result.
- Folder rows in the knowledge-directory column show a leading expand caret; document rows reserve the same slot without displaying a caret so columns remain aligned.
- The large knowledge picker is rendered through a document-body portal so it remains viewport-centered and uncropped in both the home composer and the sticky historical-conversation composer.
- A compact context-usage progress ring styled as a light-gray base with a dark-gray partial arc appears immediately left of web search only in historical-conversation composers; clicking it toggles a compact “38.2% · 64.2K / 168.0K 上下文已使用” popover, and outside-click closes it. The new-conversation composer intentionally omits it.
- Sidebar history rows show compact relative timestamps; hovering or focusing a row temporarily replaces its timestamp with the existing more-actions control.
- The example-card section heading is “试试最佳实践案例”.
- Standalone document pages include a fixed right-side “问AI” conversation panel, following the supplied reference: document overview and quick actions at the top, suggested questions above a bottom-pinned composer, and the document workspace shrinks rather than being overlaid.
- The standalone document AI panel has a draggable resize handle on its left edge; horizontal dragging resizes the panel between 280px and the available viewport-constrained maximum while preserving at least 420px for the document column.
- The standalone document AI panel retains the document-specific knowledge overview card above the message history, while the message stream and composer reuse the system's existing conversation components and controls rather than introducing a separate chat design.
- The standalone document AI panel header retains its original “问AI” identity and compact new/history/collapse controls; only the message stream and composer reuse the system conversation design.
- In the standalone document AI composer, the knowledge control responds to the resized panel width: compact widths show only its icon, while wider widths restore the icon, label, and caret.
- The skill/expert control follows the same compact-width behavior in the standalone document AI composer: narrow panels show only its current capability icon, while wider panels restore the label and caret.
- All three standalone document AI composer pickers (mode, skill/expert, and knowledge) use their existing system menus and collapse to icon-only triggers at compact widths; their flyouts must remain unclipped and fully interactive.
- Compact picker triggers expose selection clearly: the current conversation mode is always selected, while skill/expert and knowledge become selected after an explicit choice; selected triggers use the existing light-blue surface and blue icon treatment.
- The standalone document “问AI” panel opens at 470px by default and remains horizontally resizable within its existing viewport-aware limits.
- Selections in the standalone document AI composer mirror the new-conversation composer: skills and knowledge appear as removable chips inside the input area, while a selected expert is shown by the capability control and remains removable through its existing behavior.
- Clearing a selected expert closes the capability flyout instead of reopening it; outside interaction also closes the flyout, which opens leftward and remains constrained to the visible viewport in the standalone document AI panel.
- In the standalone document AI composer, choosing “从知识中心选择” closes the compact menu and opens the existing large knowledge-library picker; confirmed selections are shown in the composer knowledge chip.
- In the standalone document AI composer capability flyout, preserve the system order with the “专家 / 技能” category menu on the left and the concrete option list on the right; anchor the combined flyout by its right edge so it remains inside the viewport.
- The standalone document AI capability flyout responds to available composer width: at 540px or below, categories stack above the concrete option list; above 540px, categories and options return to the system's left-right layout.
- The capability category menu must stay directly above and right-aligned with its composer trigger without horizontal drift; in stacked mode it sits below the concrete list, and in side-by-side mode it sits to the list's right.
- The capability category menu aligns its left edge with the skill/expert trigger; in side-by-side mode the concrete list extends to the left of that aligned category menu.
- The document AI capability flyout disables its inherited transform-based entrance animation because it conflicts with trigger alignment; the category menu remains the stable anchor and only the concrete list extends leftward.
- When the document AI capability flyout has enough horizontal space, its category card stays aligned above the trigger and the concrete expert or skill card opens to the category card's right.
- The standalone document AI header collapse control hides the full panel and expands the document workspace; a compact sticky “问AI” reopen control remains at the document area's upper-right and restores the prior panel state and width.
- The collapsed document AI reopen control is a 46px circular icon-only floating button using the existing Sparkle mark, a restrained pale-blue surface, and subtle hover elevation; it retains an accessible “打开 AI 面板” label.
- The open document AI panel uses an X icon for its top-right close control; closing the panel reveals the floating reopen button.
- Selecting non-empty text in a standalone document preserves the selection, opens the existing floating formatting/AI rewrite toolbar, adds the exact text as a removable quote in the document AI composer, automatically enables the “帮我写作” skill, and reopens the AI panel if needed.
- The system skill catalog is unified across capability pickers, slash menus, and the Skill Center: 流程审批、待办任务、预约会议、数据分析、帮我写作、会议纪要、工作总结、周报/月报、起草合同、合同审查、制度解读.
- The system expert catalog is unified across capability pickers, slash menus, and the Expert Center: 资深秘书、会议秘书、知识专家、数据分析师、行政助理、法务专家、汇报助手、政策顾问、招聘助理.
- Capability option panels use a fixed 404px height: search and footer actions remain fixed while the concrete expert/skill list scrolls independently when content exceeds the available area.
- The home shortcut row is a common-skills row showing at most six system skills; selecting one adds the normal removable skill chip, and the trailing “更多” action navigates directly to the Skill Center.
- The home common-skills “更多” action is an icon-only 32px circular outlined button with a right chevron, matching the supplied compact reference.
- The home common-skills row reduces the number of visible skill shortcuts as viewport space narrows, hiding items from the end while always retaining the circular more-skills button.
- The new-conversation composer mascot follows the supplied WorkBuddy reference: a premium white-and-graphite mechanical cat head with pointed ears, a glossy black visor, and cyan/teal lights, peeking cleanly from behind the upper-right edge with only restrained shadow and idle motion.
