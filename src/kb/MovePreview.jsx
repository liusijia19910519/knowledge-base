import { parentAccess, libraryType } from './access.js';
import { isOrganizationContent } from './ownership.js';
import { subjectLabel, PERMISSION_ROLES } from './permissions.js';
import { locationLabel } from './LocationPicker.jsx';
import './movePreview.css';
export default function MovePreview({state,items,position,mode='move'}){
  if(!position.spaceId)return null;
  const library=state.spaces.find(s=>s.id===position.spaceId);if(!library)return null;
  const roots=items.filter(item=>!items.some(parent=>parent.id===item.parentId)),same=roots.length>0&&roots.every(item=>item.spaceId===position.spaceId&&(item.parentId||'')===(position.parentId||''));
  if(mode==='move'&&same)return null;
  const copy=mode==='copy',restore=mode==='restore',label=copy?'复制':restore?'恢复':'移动',kind=libraryType(library),joining=!copy&&kind!=='personal'&&items.some(item=>!isOrganizationContent(state,item)),access=parentAccess(state,position),path=locationLabel(state,position.spaceId,position.parentId);
  return <section className="move-impact" aria-label={`${label}后的权限变化`}><strong title={path}>{label}到：{path}</strong>
    {joining&&<p className="move-organization-warning">{label}后成为组织资料，原件不能再移回个人知识库。</p>}
    {kind==='plaza'&&<p className="move-organization-warning">{label}后公司全员可查看。</p>}
    {kind==='personal'&&<p>{copy?'副本':'内容'}仅自己可见。</p>}
    <p>{copy?'原内容保留，副本继承目标目录权限。':restore&&same?'恢复到原位置，保留本项授权，继承权限按当前上级生效。':`${restore?'原普通授权将重置':'原位置不留副本'}，继承目标目录权限；原协作者可能失去访问。`}</p>
    <details className="destination-permission-details"><summary>{restore&&same?'查看当前目录权限':'查看目标目录权限'}</summary><div className="move-impact-grants">{access.subjects.map(subject=><span key={`${subject.type}:${subject.id}`}>{subjectLabel(state,subject)} · {PERMISSION_ROLES.find(([id])=>id===subject.role)?.[1]||'原有权限'}</span>)}</div>{!copy&&<small>负责人保护按恢复或移动后的实际位置计算。</small>}</details>
  </section>;
}
