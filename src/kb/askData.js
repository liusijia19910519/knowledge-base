import { fileRights, descendants } from './businessData.js';

export const SKILLS=[
  ['流程审批','整理申请事项、依据与审批材料','CheckSquare'],['待办任务','从资料中提炼待办、负责人和时间','ListChecks'],['预约会议','拟定会议议程与邀请草稿','CalendarBlank'],['数据分析','解读数据与指标，整理风险和建议','ChartBar'],['帮我写作','基于资料起草、改写与润色内容','PencilLine'],['会议纪要','提炼会议结论、待办和责任人','Briefcase'],['工作总结','梳理工作进展、成果与下一步','Note'],['周报/月报','按周期整理进展、问题和计划','FileText'],['起草合同','生成待审阅的合同框架与条款','FileText'],['合同审查','梳理条款风险与待确认事项','ShieldCheck'],['制度解读','解释制度要点、适用范围和流程','Books'],
].map(([name,description,icon])=>({name,description,icon}));
export const EXPERTS=[
  ['资深秘书','统筹日程、沟通与事务跟进'],['会议秘书','整理会议准备、纪要与行动项'],['知识专家','检索知识、引用来源与解释问题'],['数据分析师','梳理指标、异常与业务建议'],['行政助理','协助制度查询与行政事务'],['法务专家','梳理合同条款和法律待核事项'],['汇报助手','组织结论、依据与汇报结构'],['政策顾问','解释制度与政策适用条件'],['招聘助理','起草职位要求与面试提纲'],
].map(([name,description])=>({name,description,icon:'UserCircle'}));
export function readableNodes(state,userId){return state.nodes.filter(n=>n.type==='doc'&&fileRights(state,n,userId).view);}
export function scopeLabel(scope,state){if(scope.type==='space')return state.spaces.find(s=>s.id===scope.id)?.name||'知识库已删除';return state.nodes.find(n=>n.id===scope.id)?.name||'内容已删除';}
export function knowledgePool(state,userId,scopes=[]){const pool=readableNodes(state,userId);if(!scopes.length)return pool;return pool.filter(n=>scopes.some(scope=>scope.type==='space'?n.spaceId===scope.id:scope.type==='folder'?descendants(state,{id:scope.id}).has(n.id):n.id===scope.id));}
export function nodeText(n){try{if(n.format==='sheet')return JSON.parse(n.body).cells.map(row=>row.join(' | ')).join('\n');if(n.format==='slides')return JSON.parse(n.body).slides.map(s=>s.title+'\n'+s.body).join('\n\n');}catch{}return n.body||'';}
export function buildAnswer(state,userId,question,context={}){
  const pool=knowledgePool(state,userId,context.scopes||[]),words=question.replace(/[，。！？、：:；;\s]/g,'');
  const exact=pool.find(n=>n.faq&&(question.includes(n.name)||n.name.includes(question)));
  const ranked=pool.map(n=>{const text=n.name+nodeText(n);let score=text.includes(words)?30:0;for(let i=0;i<words.length-1;i++)if(text.includes(words.slice(i,i+2)))score++;return {n,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.n);
  const sources=exact?[exact]:ranked.length?ranked:context.skills?.length?pool.slice(0,3):[];
  const citations=sources.map(n=>({id:n.id,name:n.name,spaceId:n.spaceId}));
  const attachments=(context.attachments||[]).filter(a=>a.text),material=[...sources.map(n=>`《${n.name}》\n${nodeText(n).slice(0,2500)}`),...attachments.map(a=>`附件《${a.name}》\n${a.text.slice(0,2500)}`)].join('\n\n');
  const skill=context.skills?.[0];
  let text=exact?`根据《${exact.name}》：\n\n${nodeText(exact)}`:sources.length?`结合当前可见的知识，整理如下：\n\n${sources.map((n,i)=>`${i+1}. ${n.name}\n${nodeText(n).slice(0,850)}`).join('\n\n')}\n\n建议核对来源文档中的适用范围和更新时间，再据此处理。`:attachments.length?`根据你提供的附件，整理如下：\n\n${attachments.map(a=>`《${a.name}》\n${a.text.slice(0,1400)}`).join('\n\n')}`:'当前知识范围内没有找到足以回答这个问题的资料。可以调整知识范围、上传相关材料，或补充更具体的问题。';
  let output=null;
  if(skill){
    const outline=skill==='会议纪要'?['会议主题与背景','讨论要点','已明确的结论','行动项、负责人和时间']:skill==='数据分析'?['数据来源与口径','关键数据与观察','风险与待验证假设','下一步行动']:skill==='待办任务'?['待办事项','建议负责人','计划时间','完成标准']:skill==='预约会议'?['会议目标','建议参与人（待确认）','时间与地点（待确认）','议程与会前材料']:skill==='流程审批'?['申请事项','申请依据','所需材料','审批人和提交信息（待确认）']:['背景与目标','核心内容','依据与待确认事项','下一步安排'];
    text=material?`已根据当前资料整理「${skill}」初稿。你可以在右侧查看、修改，并保存到知识库。`:`当前资料不足，已整理「${skill}」的待补充框架。请核对待确认项后再使用。`;
    output={title:`${skill} · ${question.slice(0,24)}`,body:`${question}\n\n${outline.map((title,i)=>`${i+1}. ${title}\n${i===0&&material?material.slice(0,3500):'待确认：请结合实际情况补充。'}`).join('\n\n')}\n\n参考资料\n${citations.length?citations.map(c=>`· ${c.name}`).join('\n'):'暂无知识库来源；请补充资料并核实内容。'}`,savedNodeId:''};
  }
  return {text,citations,output};
}
export function safeEntry(entry,state,userId){const citations=entry.answer?.citations||[];if(citations.some(c=>!fileRights(state,state.nodes.find(n=>n.id===c.id),userId).view))return {...entry,restricted:true,output:null,answer:{text:'引用资料的访问权限已变化，当前无法继续展示这条回答。请调整知识范围后重新生成。',citations:citations.filter(c=>fileRights(state,state.nodes.find(n=>n.id===c.id),userId).view)}};return entry;}
