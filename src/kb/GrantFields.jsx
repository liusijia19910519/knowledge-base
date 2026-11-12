import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Buildings, UsersThree, UserCircle, LockSimple, Plus, X, CaretRight, MagnifyingGlass } from '@phosphor-icons/react';
import { accessFromSubjects, companyId, departmentContains, PERMISSION_ROLES, subjectKey, subjectLabel, toSubjectAccess, mergeSubjects } from './permissions.js';
import { useLocationDialog } from './LocationPicker.jsx';
import './grants.css';
import PermissionRolePicker, { permissionRoleOptions } from './PermissionRolePicker.jsx';

const icons={company:Buildings,department:UsersThree,person:UserCircle};
function ProtectedRows({state,rows}){return rows.map(row=><div className="grant-row" key={row.id}><UserCircle size={23}/><span><b>{state.members.find(m=>m.id===row.id)?.name||'创建者'}</b><small>{row.sources.join('、')} · 受保护</small></span><span className="grant-owner">可管理 <LockSimple size={13}/></span></div>);}
export function GrantFields({state,value,onChange,ownerIds=[],protectedRows,floor=[],allowAdd=true,defaultRole='viewer',blocked=[],showOwners=true,heading='权限配置'}){
  const [picker,setPicker]=useState(false),draft=toSubjectAccess(state,value,ownerIds),rows=mergeSubjects(draft.subjects,floor),floorKey=floor.length?subjectKey(floor[0]):'';
  const change=subjects=>onChange(accessFromSubjects(state,subjects.filter(s=>subjectKey(s)!==floorKey||s.role!=='viewer')));
  const protections=protectedRows||[...new Set(ownerIds.filter(Boolean))].map(id=>({id,sources:['创建者']}));
  return <div className="grant-fields">
    <div className="grant-heading"><span>{heading}</span>{allowAdd&&<button type="button" className="grant-add" onClick={()=>setPicker(true)}><Plus size={14}/>添加授权对象</button>}</div>
    <div className="grant-list">
      {showOwners&&<ProtectedRows state={state} rows={protections}/>}
      {rows.map(s=>{const Icon=icons[s.type],label=subjectLabel(state,s),fixed=subjectKey(s)===floorKey,actions=fixed?(s.role==='viewer'?[]:[{value:'remove',label:'撤销额外公司授权',description:'撤销后，公司全员仍可查看'}]):undefined;return <div className="grant-row" key={subjectKey(s)}><Icon size={22}/><span><b>{label}</b><small>{fixed?'公司全员查看 · 固定，不可移除':s.type==='company'?'公司 · 包含全体成员':s.type==='department'?'部门 · 包含下级部门成员':'人员'}</small></span><PermissionRolePicker label={`${label}的权限`} value={s.role} options={permissionRoleOptions(s.role,actions)} onChange={role=>change(role==='remove'?rows.filter(row=>subjectKey(row)!==subjectKey(s)):rows.map(row=>subjectKey(row)===subjectKey(s)?{type:s.type,id:s.id,role}:row))}/></div>;})}
      {allowAdd&&!rows.length&&<p className="grant-empty">尚未添加其他授权对象</p>}
    </div>
    {picker&&<SubjectPicker state={state} ownerIds={ownerIds} blocked={[...blocked,...floor]} selected={draft.subjects} onClose={()=>setPicker(false)} onConfirm={selected=>{change(selected.map(s=>draft.subjects.find(row=>subjectKey(row)===subjectKey(s))||{...s,role:defaultRole}));setPicker(false);}}/>}
  </div>;
}

export function LayeredGrantFields({state,local,inherited,excluded,onChange,ownerIds,sourceLabel,protectedRows,floor=[],personal=false}){
  const [picker,setPicker]=useState(false),hidden=new Set(excluded.map(subjectKey));
  const base=inherited.subjects.filter(s=>!hidden.has(subjectKey(s))),rows=mergeSubjects(base,local.subjects,floor);
  const change=(subject,action)=>{
    const key=subjectKey(subject),hasParent=inherited.subjects.some(s=>subjectKey(s)===key);
    let custom=local.subjects,removed=excluded;
    if(action==='remove-inherited'||action==='remove')if(hasParent&&!hidden.has(key))removed=[...removed,{type:subject.type,id:subject.id}];
    if(action==='remove-local'||action==='remove')custom=custom.filter(s=>subjectKey(s)!==key);
    if(PERMISSION_ROLES.some(([role])=>role===action))custom=[...custom.filter(s=>subjectKey(s)!==key),...((floor.some(s=>subjectKey(s)===key)&&action==='viewer')?[]:[{type:subject.type,id:subject.id,role:action}])];
    onChange(accessFromSubjects(state,custom),removed);
  };
  return <div className="grant-fields layered-grants"><div className="grant-heading"><span>所有协作者</span>{!personal&&<button type="button" className="grant-add" onClick={()=>setPicker(true)}><Plus size={14}/>添加协作者</button>}</div><div className="grant-list">
    <ProtectedRows state={state} rows={protectedRows||[...new Set(ownerIds)].map(id=>({id,sources:['创建者']}))}/>
    {rows.map(subject=>{const key=subjectKey(subject),Icon=icons[subject.type],label=subjectLabel(state,subject),parent=base.find(s=>subjectKey(s)===key),custom=local.subjects.find(s=>subjectKey(s)===key);return <div className="grant-row" key={key}><Icon size={22}/><span><b>{label}</b>{floor.some(s=>subjectKey(s)===key)&&<small>公司全员查看 · 固定，不可移除</small>}{parent&&<small className="grant-source">继承自{sourceLabel}</small>}{custom&&<small>本项授权：{PERMISSION_ROLES.find(([r])=>r===custom.role)?.[1]||'原有权限'}</small>}</span><PermissionRolePicker label={`${label}的权限`} value={subject.role} groupLabel="设置本项权限" options={permissionRoleOptions(subject.role,[...(parent?[{value:'remove-inherited',label:'移除继承权限',description:'只移除此项的继承来源，不改变上级'}]:[]),...(custom?[{value:'remove-local',label:'移除本项授权',description:'其他来源的有效授权继续保留'}]:[]),...(parent&&custom?[{value:'remove',label:'移除该协作者',description:'移除本项授权及该对象的继承来源'}]:[])])} onChange={role=>change(subject,role)}/></div>;})}
    </div>{rows.some(s=>{const custom=local.subjects.find(x=>subjectKey(x)===subjectKey(s));return custom&&custom.role!==s.role;})&&<p className="grant-effective-hint">列表右侧显示实际生效权限，本项较低授权不会覆盖其他来源的较高权限。</p>}
    {!!excluded.length&&<details className="excluded-grants"><summary>已移除的继承授权（{excluded.length}）</summary>{excluded.map(subject=><div key={subjectKey(subject)}><span>{subjectLabel(state,subject)}{!inherited.subjects.some(s=>subjectKey(s)===subjectKey(subject))&&<small>父级当前未授权</small>}</span><button type="button" aria-label={`恢复继承 ${subjectLabel(state,subject)}`} onClick={()=>onChange(local,excluded.filter(s=>subjectKey(s)!==subjectKey(subject)))}>恢复</button></div>)}</details>}
    {picker&&<SubjectPicker state={state} ownerIds={ownerIds} blocked={floor} selected={local.subjects} onClose={()=>setPicker(false)} onConfirm={selected=>{onChange(accessFromSubjects(state,selected.map(s=>local.subjects.find(x=>subjectKey(x)===subjectKey(s))||{...s,role:'viewer'})),excluded);setPicker(false);}}/>}
  </div>;
}

export function SubjectPicker({state,selected,ownerIds,blocked=[],onClose,onConfirm}){
  const [chosen,setChosen]=useState(selected.map(({type,id})=>({type,id}))),[search,setSearch]=useState(''),[expanded,setExpanded]=useState(()=>new Set(['company',...state.departments.map(d=>d.id)]));
  const root=useRef(null);useLocationDialog(root,onClose);
  const selectedKeys=new Set(chosen.map(subjectKey)),blockedKeys=new Set(blocked.map(subjectKey)),keyword=search.trim().toLocaleLowerCase();
  const toggle=s=>setChosen(current=>selectedKeys.has(subjectKey(s))?current.filter(x=>subjectKey(x)!==subjectKey(s)):[...current,s]);
  const expand=id=>setExpanded(current=>{const next=new Set(current);next.has(id)?next.delete(id):next.add(id);return next;});
  const personMatch=m=>!keyword||`${m.name} ${m.staffId||''}`.toLocaleLowerCase().includes(keyword);
  const departmentMatch=d=>!keyword||d.name.toLocaleLowerCase().includes(keyword)||state.members.some(m=>departmentContains(state,d.id,m.deptId)&&personMatch(m))||state.departments.some(child=>departmentContains(state,d.id,child.id)&&child.name.toLocaleLowerCase().includes(keyword));
  const subjectRow=(s,depth,{name,expandable=false,expanded:open=false,onExpand,protectedPerson=false}={})=>{const Icon=icons[s.type],already=blockedKeys.has(subjectKey(s));return <div className="subject-tree-row" style={{paddingLeft:depth*16}} key={subjectKey(s)}>{expandable?<button type="button" disabled={!!keyword} title={keyword?'搜索结果已展开':''} aria-label={`${open?'收起':'展开'} ${name}`} onClick={onExpand}><CaretRight size={12} className={open?'open':''}/></button>:<i/>}<label><input type="checkbox" aria-label={`选择${{company:'公司',department:'部门',person:'人员'}[s.type]} ${name}`} checked={selectedKeys.has(subjectKey(s))} disabled={protectedPerson||already} onChange={()=>toggle(s)}/><Icon size={17}/><span>{name}</span>{protectedPerson?<small>创建者</small>:already&&<small>已添加</small>}</label></div>;};
  const renderDepartment=(d,depth)=>{
    if(!departmentMatch(d))return null;
    const children=state.departments.filter(x=>x.parentId===d.id),people=state.members.filter(m=>m.deptId===d.id),open=!!keyword||expanded.has(d.id);
    return <div key={d.id}>{subjectRow({type:'department',id:d.id},depth,{name:d.name,expandable:children.length+people.length>0,expanded:open,onExpand:()=>expand(d.id)})}{open&&<>{children.map(child=>renderDepartment(child,depth+1))}{people.filter(m=>personMatch(m)||d.name.toLocaleLowerCase().includes(keyword)).map(m=>subjectRow({type:'person',id:m.id},depth+1,{name:m.name,protectedPerson:ownerIds.includes(m.id)}))}</>}</div>;
  };
  // Capture Escape/Tab so the parent dialog does not also consume a key from
  // this body portal. Submitting the picker must not submit the parent form.
  const capture=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}if(e.key==='Tab'){e.stopPropagation();const list=[...root.current.querySelectorAll('button:not(:disabled),input:not(:disabled)')],first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  const company={type:'company',id:companyId(state)},companyOpen=!!keyword||expanded.has('company');
  const hasResults=!keyword||`${state.org.name} ${companyId(state)}`.toLocaleLowerCase().includes(keyword)||state.departments.some(d=>d.id!=='root'&&departmentMatch(d))||state.members.some(personMatch);
  return createPortal(<div className="subject-picker-backdrop" onMouseDown={e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}}><form ref={root} className="subject-picker location-picker" role="dialog" aria-modal="true" aria-label="选择授权对象" onKeyDownCapture={capture} onSubmit={e=>{e.preventDefault();e.stopPropagation();onConfirm(chosen);}}>
    <header><h2>选择授权对象</h2><button type="button" className="location-close" aria-label="关闭授权对象选择" onClick={onClose}><X size={19}/></button></header>
    <label className="subject-search"><MagnifyingGlass size={16}/><input data-name-field aria-label="搜索组织或人员" placeholder="搜索公司、部门、姓名或账号" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/></label>
    <div className="subject-columns"><section className="subject-organization" aria-label="组织架构">{hasResults?<>{subjectRow(company,0,{name:state.org.name,expandable:true,expanded:companyOpen,onExpand:()=>expand('company')})}{companyOpen&&<>{state.departments.filter(d=>d.parentId==='root'||!d.parentId&&d.id!=='root').map(d=>renderDepartment(d,1))}{state.members.filter(m=>m.deptId==='root'||!state.departments.some(d=>d.id===m.deptId)).filter(personMatch).map(m=>subjectRow({type:'person',id:m.id},1,{name:m.name,protectedPerson:ownerIds.includes(m.id)}))}</>}</>:<p className="subject-no-results">没有匹配的组织或人员</p>}</section>
      <section className="subject-selected" aria-label="已选授权对象"><h3>已选 {chosen.length} 项</h3>{chosen.map(s=>{const Icon=icons[s.type],name=subjectLabel(state,s);return <div className="subject-selected-row" key={subjectKey(s)}><Icon size={17}/><span>{name}<small>{{company:'公司',department:'部门',person:'人员'}[s.type]}</small></span><button type="button" aria-label={`移除已选 ${name}`} onClick={()=>toggle(s)}><X size={14}/></button></div>;})}{!chosen.length&&<p>从左侧选择公司、部门或人员</p>}</section></div>
    <footer><span>组织授权随成员加入、离开自动变化</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="location-confirm">确认选择</button></footer>
  </form></div>,document.body);
}
