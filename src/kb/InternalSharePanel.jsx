import { useState } from 'react';
import { MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { fileRights, libraryRights } from './businessData.js';

export default function InternalSharePanel({state,userId,item,entity,form,setValue}){
  const [query,setQuery]=useState('');
  const current=(entity==='space'?state.spaces:state.nodes).find(n=>n.id===item.id);
  const rights=id=>entity==='space'?libraryRights(state,current,id):fileRights(state,current,id);
  const actor=rights(userId),selected=form.recipients||[],missing=selected.filter(id=>!rights(id).view),history=(state.internalShares||[]).filter(r=>r.entity===entity&&r.targetId===item.id).sort((a,b)=>new Date(b.time)-new Date(a.time));
  const recipients=state.members.filter(m=>m.id!==userId&&(m.name+m.title).includes(query));
  return <>
    <div className="biz-inline-note">选择系统内部成员分享，不生成分享链接。接收人已有查看权限时直接分享；尚无权限时，只有创建者或管理者可以在确认后授予查看权限。</div>
    <label className="biz-search biz-share-search"><MagnifyingGlass size={16}/><input aria-label="搜索内部成员" placeholder="搜索姓名或岗位" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="biz-internal-recipients">{recipients.map(m=>{const readable=rights(m.id).view,disabled=!readable&&!actor.manage;return <label className={`biz-internal-member${disabled?' disabled':''}`} key={m.id} title={disabled?'该成员没有查看权限，请联系创建者或管理者先授权':undefined}><input type="checkbox" aria-label={`分享给${m.name}`} checked={selected.includes(m.id)} disabled={disabled} onChange={e=>setValue('recipients',e.target.checked?[...selected,m.id]:selected.filter(id=>id!==m.id))}/><span className="biz-member-avatar">{m.name.slice(-1)}</span><span><b>{m.name}</b><small>{m.title}</small></span><em>{readable?'已有查看权限':actor.manage?'需授予查看权限':'需管理者先授权'}</em></label>;})}{!recipients.length&&<p className="biz-muted">没有找到相关内部成员</p>}</div>
    <p className="biz-share-selection">已选择 {selected.length} 位成员{missing.length?`，其中 ${missing.length} 位尚无查看权限`:''}</p>
    {missing.length>0&&actor.manage&&<div className="biz-share-consent"><label className="biz-checkbox-label"><input type="checkbox" aria-label="同时授予查看权限" checked={!!form.grantView} onChange={e=>setValue('grantView',e.target.checked)}/>同时授予所选未授权成员“查看”权限</label><p className="biz-muted">只新增查看能力，不自动授予编辑、分享或管理。后续可在“成员与权限”中调整。</p>{entity==='node'&&current?.inherit!==false&&<><label className="biz-checkbox-label"><input type="checkbox" aria-label="将此内容改为独立权限" checked={!!form.allowIndependent} onChange={e=>setValue('allowIndependent',e.target.checked)}/>将此内容改为独立权限，保留现有成员权限</label><p className="biz-muted">只分享当前{item.type==='folder'?'目录':'文件'}，不开放整个知识库。{item.type==='folder'?'继承此目录权限的内容同步生效，独立权限的子文件保留自己的授权。':''}</p></>}</div>}
    {history.length>0&&<section className="biz-internal-history"><h3><UsersThree size={15}/>分享记录</h3>{history.map(r=><div key={r.id}><span><b>{state.members.find(m=>m.id===r.toId)?.name||'成员已移除'}</b><small>{state.members.find(m=>m.id===r.fromId)?.name} 分享 · {new Date(r.time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span><small>{rights(r.toId).view?'当前可查看':'当前无查看权限'}</small></div>)}</section>}
  </>;
}
