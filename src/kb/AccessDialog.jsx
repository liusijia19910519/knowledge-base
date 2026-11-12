import { useRef, useState } from 'react';
import { X, CaretRight } from '@phosphor-icons/react';
import { SCOPE_LABELS, accessFingerprint, effectiveAccess, parentAccess, spaceAccess, saveEntityAccess, contentRights, libraryRights, scopeSummary, permissionLayers } from './access.js';
import { initialAccess, toSubjectAccess, accessFromSubjects } from './permissions.js';
import { GrantFields, LayeredGrantFields } from './GrantFields.jsx';
import { createLibrary } from './libraryCreation.js';
import { useLocationDialog } from './LocationPicker.jsx';
import { persistLibraryIcon } from './libraryIcons.jsx';
import LibraryMetadata, { persistLibraryCover } from './LibraryMetadata.jsx';
import { loadState } from './store.js';
import { addCollaborators, permissionTarget, savePermissionDetails } from './permissionOperations.js';
import './access.css';

const clone=value=>JSON.parse(JSON.stringify(value));
export const AccessFields=GrantFields;
export function ScopeBadge({access,onClick}){return onClick?<button type="button" className={`scope-badge ${access.visibility}`} onClick={onClick}>{SCOPE_LABELS[access.visibility]}</button>:<span className={`scope-badge ${access.visibility}`}>{SCOPE_LABELS[access.visibility]}</span>;}
export default function AccessDialog(props){if(!props.item)return <Unavailable onClose={props.onClose}/>;const rights=props.entity==='space'?libraryRights(props.state,props.item,props.userId):contentRights(props.state,props.item,props.userId);return rights.manage?<EditAccessDialog {...props}/>:<Unavailable onClose={props.onClose} message="当前没有管理权限"/>;}
function Unavailable({onClose,message='内容已不可用'}){return <div className="action-backdrop"><section className="action-dialog" role="dialog" aria-label="操作不可用"><p>{message}</p><button type="button" onClick={onClose}>关闭</button></section></div>;}
function EditAccessDialog({state,userId,item,entity='node',update,onClose,onSaved,settings=false,initialDraft,initialLocal,initialExcluded,expectedOverride,fromShare=false}){
  const library=entity==='space'?item:state.spaces.find(s=>s.id===item.spaceId),ownerIds=[...new Set([item.ownerId,library?.ownerId].filter(Boolean))],layers=entity==='node'?permissionLayers(state,item):null;
  const [draft,setDraft]=useState(()=>initialDraft||toSubjectAccess(state,spaceAccess(state,library),ownerIds)),[local,setLocal]=useState(()=>initialLocal||layers?.local),[excluded,setExcluded]=useState(()=>initialExcluded||layers?.excluded||[]),[error,setError]=useState('');
  const [name,setName]=useState(item.name),[description,setDescription]=useState(item.description||''),[icon,setIcon]=useState(item.icon||{kind:'preset',key:'book'}),[cover,setCover]=useState(item.cover||{kind:'preset',key:'original'}),[assetReading,setAssetReading]=useState(false),[busy,setBusy]=useState(false);
  const fingerprint=useRef(expectedOverride||accessFingerprint(state,item,entity)),metadata=useRef(JSON.stringify([item.name,item.description||''])),appearance=useRef(JSON.stringify([item.icon||null,item.cover||null])),root=useRef(null),lock=useRef(false);useLocationDialog(root,()=>{if(!lock.current)onClose();});
  const save=async e=>{
    e.preventDefault();if(lock.current)return;if(assetReading){setError('请等待封面读取完成');return;}lock.current=true;setBusy(true);let persisted,persistedCover;
    try{
      const fields={id:item.id,entity,access:draft,...(entity==='node'?{localAccess:local,inheritedExclusions:excluded}:{}),expected:fingerprint.current,...(settings?{name,description,expectedMetadata:metadata.current,expectedAppearance:appearance.current}:{})};
      savePermissionDetails(loadState(),fields,userId);
      if(settings){persisted=await persistLibraryIcon(icon);persistedCover=await persistLibraryCover(cover);}
      let visibility;update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化，请重新操作');const next=savePermissionDetails(current,{...fields,...(persisted?{icon:persisted.icon,cover:persistedCover.cover}:{})},userId),target=next[entity==='space'?'spaces':'nodes'].find(n=>n.id===item.id);visibility=(entity==='space'?spaceAccess(next,target):effectiveAccess(next,target)).visibility;return next;});
      onSaved(visibility);onClose();
    }catch(err){await persisted?.rollback().catch(()=>{});await persistedCover?.rollback().catch(()=>{});setError(err.message);}finally{lock.current=false;setBusy(false);}
  };
  const title=settings?'知识库设置':'权限管理';
  return <div className="knowledge-product-dialog-backdrop access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><form ref={root} className={`knowledge-product-dialog access-dialog ${settings?'library-metadata-dialog':''}`} role="dialog" aria-modal="true" aria-label={title} onSubmit={save}>
    <header><div><h2>{title}</h2><p>{item.name}</p></div><button type="button" className="access-close" aria-label={`关闭${title}`} disabled={busy} onClick={onClose}><X size={19}/></button></header>
    {settings&&<LibraryMetadata name={name} setName={setName} description={description} setDescription={setDescription} icon={icon} setIcon={setIcon} cover={cover} setCover={setCover} disabled={busy} onLoadingChange={setAssetReading} onEdit={()=>setError('')} legacyTone={['','ice','night','amber'][Math.max(0,state.spaces.findIndex(s=>s.id===item.id))%4]}/>}
    <fieldset className="permission-edit-fields" disabled={busy}>{entity==='space'?<GrantFields state={state} value={draft} onChange={value=>{setDraft(value);setError('');}} ownerIds={ownerIds}/>:<LayeredGrantFields state={state} local={local} inherited={layers.inherited} excluded={excluded} onChange={(value,removed)=>{setLocal(value);setExcluded(removed);setError('');}} ownerIds={ownerIds} sourceLabel={item.parentId?'父级目录':'知识库'}/>}</fieldset>
    {!settings&&(entity==='space'||item.type==='folder')&&<p className="access-note">下级内容的继承授权同步更新，其自行配置的授权和移除记录保留。</p>}
    {error&&<p role="alert" className="access-error">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>{fromShare?'返回分享':'取消'}</button><button type="submit" disabled={busy||assetReading}>{busy?'保存中…':settings?'保存设置':'保存权限'}</button></footer>
  </form></div>;
}
export function ShareDialog(props){return props.item?<ShareController {...props}/>:<Unavailable onClose={props.onClose}/>;}
function ShareController({state,userId,item,entity='node',update,onClose,onSaved}){
  const [pending,setPending]=useState([]),[mode,setMode]=useState('share'),fingerprint=useRef(accessFingerprint(state,item,entity));
  let target;try{target=permissionTarget(state,item.id,entity,userId);}catch{return <Unavailable onClose={onClose} message="只有管理者可以添加协作者"/>;}
  const merged=accessFromSubjects(state,[...(entity==='node'?target.layers.local:target.access).subjects,...pending]);
  if(mode==='permissions')return <AccessDialog state={state} userId={userId} item={item} entity={entity} update={update} initialDraft={merged} initialLocal={entity==='node'?merged:undefined} initialExcluded={target.layers?.excluded} expectedOverride={fingerprint.current} fromShare onClose={()=>setMode('share')} onSaved={visibility=>{onSaved(visibility);onClose();}}/>;
  return <ShareForm state={state} userId={userId} item={item} entity={entity} target={target} pending={pending} setPending={setPending} expected={fingerprint.current} update={update} onClose={onClose} onManage={()=>setMode('permissions')} onSaved={onSaved}/>;
}
function ShareForm({state,userId,item,entity,target,pending,setPending,expected,update,onClose,onManage,onSaved}){
  const root=useRef(null),[error,setError]=useState('');useLocationDialog(root,onClose);
  const commit=()=>{try{let visibility;update(s=>{const next=addCollaborators(s,{id:item.id,entity,subjects:pending,expected,confirmedIndependent:true},userId);visibility=entity==='space'?spaceAccess(next,next.spaces.find(n=>n.id===item.id)).visibility:effectiveAccess(next,next.nodes.find(n=>n.id===item.id)).visibility;return next;});onSaved(visibility);onClose();}catch(err){setError(err.message);}};
  const submit=e=>{e.preventDefault();if(!pending.length){setError('请选择要添加的协作者');return;}commit();};
  return <div className="knowledge-product-dialog-backdrop access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><form ref={root} className="knowledge-product-dialog access-dialog share-dialog" role="dialog" aria-modal="true" aria-label="分享" onSubmit={submit}><header><div><h2>分享</h2><p>{item.name}</p></div><button type="button" className="access-close" aria-label="关闭分享" onClick={onClose}><X size={19}/></button></header><div className="share-intro"><span>邀请协作者</span><button type="button" onClick={onManage}>权限管理 <CaretRight size={13}/></button></div><GrantFields state={state} value={accessFromSubjects(state,pending)} onChange={value=>{setPending(value.subjects);setError('');}} ownerIds={target.owners} showOwners={false} heading="待新增协作者" blocked={(entity==='node'?target.layers.local:target.access).subjects}/><p className="access-note">仅新增授权，已有授权保持不变。修改或移除已有对象请进入权限管理。</p>{error&&<p className="access-error" role="alert">{error}</p>}<footer><button type="button" onClick={onClose}>取消</button><button type="submit" disabled={!pending.length}>添加协作者</button></footer></form></div>;
}
export function LibraryCreateDialog({state,userId,view='personal',chooseInitializer=false,update,onClose,onCreated}){
  const [name,setName]=useState(''),[description,setDescription]=useState(''),[initializer,setInitializer]=useState(view),[drafts,setDrafts]=useState(()=>Object.fromEntries(['personal','shared','plaza'].map(v=>[v,initialAccess(state,v)]))),[error,setError]=useState(''),[icon,setIcon]=useState({kind:'preset',key:'book'}),[cover,setCover]=useState({kind:'preset',key:'mist'}),[assetReading,setAssetReading]=useState(false),[busy,setBusy]=useState(false);
  const root=useRef(null),lock=useRef(false);useLocationDialog(root,()=>{if(!lock.current)onClose();});
  const submit=async e=>{e.preventDefault();if(lock.current)return;if(assetReading){setError('请等待封面读取完成');return;}lock.current=true;setBusy(true);let persisted,persistedCover;try{const fields={name,description,access:drafts[initializer],initializer};createLibrary(loadState(),fields,userId);persisted=await persistLibraryIcon(icon);persistedCover=await persistLibraryCover(cover);let result;update(s=>{if(s.viewAs!==userId)throw Error('当前用户已变化，请重新操作');result=createLibrary(s,{...fields,icon:persisted.icon,cover:persistedCover.cover},userId);return result.state;});onCreated(result.library);onClose();}catch(err){await persisted?.rollback().catch(()=>{});await persistedCover?.rollback().catch(()=>{});setError(err.message);}finally{lock.current=false;setBusy(false);}};
  return <div className="knowledge-product-dialog-backdrop access-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><form ref={root} className="knowledge-product-dialog access-dialog library-metadata-dialog" role="dialog" aria-modal="true" aria-label="新建知识库" onSubmit={submit}>
    <header><h2>新建知识库</h2><button type="button" className="access-close" aria-label="关闭新建知识库" disabled={busy} onClick={onClose}><X size={19}/></button></header>
    <LibraryMetadata name={name} setName={setName} description={description} setDescription={setDescription} icon={icon} setIcon={setIcon} cover={cover} setCover={setCover} disabled={busy} onLoadingChange={setAssetReading} onEdit={()=>setError('')}/>
    <fieldset className="permission-edit-fields" disabled={busy}>{chooseInitializer&&<fieldset className="library-initial-types library-initial-cards"><legend>初始权限</legend>{[['personal','个人','仅本人可见，由自己管理'],['shared','共享','指定公司、部门或人员协作'],['plaza','知识广场','公司全员仅查看，可追加授权']].map(([id,label,description])=><label className={initializer===id?'selected':''} key={id}><input type="radio" name="library-initializer" value={id} checked={initializer===id} onChange={()=>{setInitializer(id);setError('');}}/><span><b>{label}</b><small>{description}</small></span></label>)}</fieldset>}
    <GrantFields state={state} value={drafts[initializer]} onChange={value=>{setDrafts(current=>({...current,[initializer]:value}));setError('');}} ownerIds={[userId]} allowAdd={initializer!=='personal'} defaultRole={initializer==='plaza'?'editor':'viewer'}/>
    </fieldset>
    {error&&<p className="access-error" role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={onClose}>取消</button><button type="submit" disabled={busy||assetReading}>{busy?'创建中…':'创建知识库'}</button></footer>
  </form></div>;
}
