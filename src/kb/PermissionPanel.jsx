import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check, Eye, PencilSimple, SlidersHorizontal, Trash, UserPlus, MagnifyingGlass, ArrowLeft, LockSimple } from '@phosphor-icons/react';
import { NONE, RIGHTS, accessible, fileRights } from './businessData.js';
import { permissionLabel, permissionPolicy, permissionPresets } from './permissionEditor.js';
import './permissions.css';

const descriptions={view:'阅读、预览和下载内容',edit:'新建、编辑和重命名内容',share:'分享给系统内部成员，不自动扩大访问范围',manage:'维护设置、成员授权及内容管理'};

function PermissionDropdown({member,rights,policy,onChange,onRemove,disabled=false}) {
  const [open,setOpen]=useState(false),[custom,setCustom]=useState(false),[draft,setDraft]=useState(rights),[position,setPosition]=useState({left:0,top:0,visibility:'hidden'});
  const trigger=useRef(null),panel=useRef(null),id=useId();
  const close=(restore=true)=>{setOpen(false);if(restore)trigger.current?.focus();};
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{const r=trigger.current?.getBoundingClientRect(),p=panel.current;if(!r||!p)return;const width=Math.min(304,window.innerWidth-24),height=Math.min(p.scrollHeight,window.innerHeight-24);setPosition({width,left:Math.max(12,Math.min(r.right-width,window.innerWidth-width-12)),top:Math.max(12,r.bottom+6+height<=window.innerHeight-12?r.bottom+6:r.top-height-6),maxHeight:window.innerHeight-24,visibility:'visible'});};
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,custom]);
  useEffect(()=>{
    if(!open)return;
    panel.current?.querySelector('button:not(:disabled),input:not(:disabled)')?.focus();
    const outside=e=>{if(!panel.current?.contains(e.target)&&!trigger.current?.contains(e.target))close(false);};
    const keys=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
      if(!panel.current?.contains(document.activeElement))return;
      const controls=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')],index=controls.indexOf(document.activeElement);
      if(e.key==='Tab'||(!custom&&['ArrowDown','ArrowUp','Home','End'].includes(e.key))){e.preventDefault();e.stopImmediatePropagation();const next=e.key==='Home'?0:e.key==='End'?controls.length-1:(index+(e.key==='ArrowUp'||e.shiftKey?-1:1)+controls.length)%controls.length;controls[next]?.focus();}
    };
    window.addEventListener('pointerdown',outside,true);window.addEventListener('keydown',keys,true);return()=>{window.removeEventListener('pointerdown',outside,true);window.removeEventListener('keydown',keys,true);};
  },[open,custom]);
  const choose=r=>{onChange(policy.apply(r));close();};
  return <><button ref={trigger} type="button" className="pm-trigger" aria-label={`${member.name}的权限：${policy.owner?'创建者':permissionLabel(rights)}`} aria-expanded={open} aria-controls={open?id:undefined} disabled={disabled||policy.owner||policy.inherited} title={policy.owner?'创建者保留全部权限':policy.inherited?'权限继承自上级，请先取消继承':RIGHTS.filter(([k])=>rights[k]).map(([,v])=>v).join('、')} onClick={()=>{setCustom(false);setDraft({...rights});setOpen(v=>!v);}}>{policy.owner?'全部权限':permissionLabel(rights)}{policy.owner?<LockSimple size={13}/>:!policy.inherited&&<CaretDown size={13}/>}</button>
    {open&&createPortal(<div ref={panel} id={id} className="pm-popover" style={position} role="dialog" aria-label={`${member.name}的权限设置`}>
      <div className="pm-popover-heading">{custom?'自定义权限':member.name+'的权限'}</div>
      {!custom?<>{permissionPresets.map((preset,index)=>{const applied=policy.apply(preset.rights),selected=RIGHTS.every(([k])=>!!applied[k]===!!rights[k]);const Icon=index?PencilSimple:Eye;return <button type="button" className="pm-option" key={preset.name} aria-pressed={selected} onClick={()=>choose(preset.rights)}><Icon size={18}/><span><b>{preset.name}</b><small>{preset.description}</small></span>{selected&&<Check size={16}/>}</button>;})}
        <button type="button" className="pm-option" onClick={()=>{setDraft({...rights});setCustom(true);}}><SlidersHorizontal size={18}/><span><b>自定义权限</b><small>分别设置查看、编辑、分享、管理</small></span>{!permissionPresets.some(p=>RIGHTS.every(([k])=>!!policy.apply(p.rights)[k]===!!rights[k]))&&<Check size={16}/>}</button>
        {onRemove&&<><div className="pm-separator"/><button type="button" className="pm-option pm-danger" disabled={policy.removeDisabled} title={policy.manager?'管理权限来自知识库，请在知识库中调整':policy.removeDisabled?'申请人的查看权限需保留':undefined} onClick={()=>{onRemove();close(false);}}><Trash size={18}/><span><b>移除协作者</b><small>{policy.manager?'知识库管理者不能在文件中移除':policy.publicView?'撤销单独授权，仍可阅读已发布内容':'保存后撤销此处授予的权限'}</small></span></button></>}
        {policy.manager&&<p className="pm-footnote">管理权限来自知识库，快捷选项会保留该权限。</p>}
      </>:<>{RIGHTS.map(([key,label])=><label className="pm-capability" key={key}><span><b>{label}</b><small>{policy.locks[key]?(key==='view'?(policy.publicView?'广场已发布内容，全员可查看':'本次申请批准必须保留查看'):'管理权限来自知识库'):descriptions[key]}</small></span><input type="checkbox" aria-label={`${member.name}${label}权限`} checked={!!draft[key]} disabled={!!policy.locks[key]} onChange={e=>setDraft(d=>({...d,[key]:e.target.checked}))}/></label>)}<p className="pm-footnote">四项能力独立。勾选管理不会自动获得查看或编辑。</p><div className="pm-popover-actions"><button type="button" onClick={()=>setCustom(false)}>返回</button><button type="button" className="pm-primary" onClick={()=>choose(draft)}>应用权限</button></div></>}
    </div>,document.body)}
  </>;
}

export default function PermissionPanel({state,modal,form,setValue,userId}) {
  const [adding,setAdding]=useState(false),[query,setQuery]=useState(''),[pending,setPending]=useState({}),[touched,setTouched]=useState(new Set()),[removed,setRemoved]=useState(null);
  const search=useRef(null),addButton=useRef(null);
  const {item,entity}=modal,inherit=entity==='node'&&form.inherit;
  const requiredViewer=state.requests.find(r=>r.id===modal.requestId)?.userId||'';
  const policyFor=id=>permissionPolicy(state,item,entity,id,inherit,requiredViewer);
  const rows=state.members.filter(m=>{const p=policyFor(m.id);return p.owner||p.manager||(inherit?accessible(p.effective):accessible(form.acl[m.id]||NONE)||touched.has(m.id));});
  const candidates=state.members.filter(m=>!rows.some(r=>r.id===m.id));
  const invalidPending=Object.values(pending).some(r=>!accessible(r));
  useEffect(()=>{if(adding)search.current?.focus();},[adding]);
  const finishAdding=()=>{setAdding(false);setValue('permissionAdding',false);setPending({});setQuery('');requestAnimationFrame(()=>addButton.current?.focus());};
  const update=(id,r)=>{setValue('acl',{...form.acl,[id]:r});setTouched(old=>new Set([...old,id]));setRemoved(null);};
  const remove=(member)=>{setRemoved({member,rights:form.acl[member.id]||NONE});const next={...form.acl};delete next[member.id];setValue('acl',next);setTouched(old=>{const n=new Set(old);n.delete(member.id);return n;});requestAnimationFrame(()=>addButton.current?.focus());};
  const memberRow=(member,r,policy,control,select)=> <div className="pm-member" key={member.id}>
    {select}<span className="pm-avatar" aria-hidden="true">{member.name.slice(-1)}</span><div className="pm-member-info"><b>{member.name}{member.id===userId&&<em>我</em>}</b><small>{policy.owner?(entity==='node'&&item.ownerId!==member.id?'知识库创建者':'创建者'):member.title}</small>{!adding&&!policy.owner&&<span className="pm-rights-summary">{RIGHTS.filter(([k])=>r[k]).map(([,label])=>label).join(' · ')||'未授予权限'}{policy.inherited?' · 继承上级':''}</span>}</div>{control}
  </div>;
  return <section className="pm-editor" aria-label="协作者权限管理">
    {modal.requestId&&<div className="biz-inline-note warning">批准单个文件的申请需要改为独立权限。已保留当前成员权限，保存后才会批准；取消则保持原状。</div>}
    {entity==='node'&&!adding&&<div className="pm-inheritance"><label><input type="checkbox" aria-label="继承上级目录或知识库权限" checked={!!form.inherit} disabled={!!modal.requestId} onChange={e=>{setValue('inherit',e.target.checked);setTouched(new Set());setRemoved(null);if(!e.target.checked)setValue('acl',Object.fromEntries(state.members.map(m=>[m.id,fileRights(state,item,m.id)])));}}/><span><b>继承上级目录 / 知识库权限</b><small>{inherit?'成员与权限由上级统一管理，取消继承后可单独调整。':'当前使用独立权限，恢复继承将以上级的现有权限为准。'}</small></span></label></div>}
    {adding?<><div className="pm-list-heading"><button type="button" className="biz-text" onClick={finishAdding}><ArrowLeft size={15}/>返回协作者</button><span>添加协作者</span></div><label className="pm-search"><MagnifyingGlass size={16}/><input ref={search} aria-label="搜索内部成员" placeholder="搜索姓名或职位" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}} value={query} onChange={e=>setQuery(e.target.value)}/></label><p className="pm-hint">选择系统内部成员，逐人配置权限；添加到列表后，点击“保存权限”统一生效。</p><div className="pm-member-list">{candidates.filter(m=>(m.name+' '+m.title).includes(query.trim())).map(m=>{const selected=Object.hasOwn(pending,m.id),p=policyFor(m.id),r=p.apply(pending[m.id]||{...NONE,view:true});return memberRow(m,r,p,selected&&<PermissionDropdown member={m} rights={r} policy={p} onChange={value=>setPending(old=>({...old,[m.id]:value}))}/>,<input type="checkbox" aria-label={`选择协作者${m.name}`} checked={selected} onChange={e=>{setPending(old=>{const next={...old};if(e.target.checked)next[m.id]=p.apply({...NONE,view:true});else delete next[m.id];return next;});}}/>);})}{!candidates.some(m=>(m.name+' '+m.title).includes(query.trim()))&&<p className="pm-empty">没有匹配的内部成员</p>}</div><div className="pm-add-actions"><span>{invalidPending?'请为每位新协作者至少选择一项权限':`已选择 ${Object.keys(pending).length} 人`}</span><button type="button" onClick={finishAdding}>取消添加</button><button type="button" className="biz-primary" disabled={!Object.keys(pending).length||invalidPending} title={invalidPending?'每位新协作者至少需要一项权限':undefined} onClick={()=>{setValue('acl',{...form.acl,...pending});setTouched(old=>new Set([...old,...Object.keys(pending)]));setRemoved(null);finishAdding();}}>添加 {Object.keys(pending).length} 位协作者</button></div></>:<>
      <div className="pm-list-heading"><b>协作者 <span>{rows.length}</span></b>{!inherit&&<button ref={addButton} type="button" onClick={()=>{setAdding(true);setValue('permissionAdding',true);}} disabled={!candidates.length} title={!candidates.length?'所有内部成员已在协作者列表中':undefined}><UserPlus size={16}/>添加协作者</button>}</div>
      <div className="pm-member-list">{rows.map(m=>{const p=policyFor(m.id),r=p.apply(form.acl[m.id]||NONE);return memberRow(m,r,p,<PermissionDropdown member={m} rights={r} policy={p} onChange={value=>update(m.id,value)} onRemove={()=>remove(m)}/>);})}</div>
      {removed&&<div className="pm-undo" role="status"><span>已从待保存列表移除{removed.member.name}</span><button type="button" className="biz-text" onClick={()=>{update(removed.member.id,removed.rights);setRemoved(null);}}>撤销</button></div>}
      {policyFor(userId).publicView&&<div className="pm-public"><Eye size={16}/><span>已发布内容全员可查看。移除协作者只撤销其单独授权。</span></div>}
      <p className="pm-hint">查看、编辑、分享、管理独立配置。创建者保留全部权限；仅有管理权限的成员可以授权。</p><p className="pm-hint">{entity==='space'?'移除库成员或清空其全部库级权限，会同时撤销库内独立授权；仅调整某项权限，会保留文件的独立配置。':'知识库管理者保留文件授权管理能力，需在知识库中调整其管理权限。'}所有调整点击“保存权限”后生效。</p>
    </>}
  </section>;
}
