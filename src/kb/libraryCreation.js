import { recordSharingChange } from './sharing.js';
import { responsibleId } from './ownership.js';
import { initialAccess } from './permissions.js';
import { validateAccess, LIBRARY_TYPES } from './access.js';
export function createLibrary(state,{name,description='',access,initializer='personal',icon,cover},userId){
  if(!LIBRARY_TYPES[initializer])throw Error('请选择知识库类型');
  const title=name.trim();if(!title||title.length>40)throw Error('请输入 1–40 个字符的知识库名称');
  if(description.length>300)throw Error('简介不能超过 300 个字符');
  if(state.spaces.some(s=>!s.deletedAt&&responsibleId(s)===userId&&s.name.trim().toLocaleLowerCase()===title.toLocaleLowerCase()))throw Error('你已有同名知识库，请换一个名称');
  const checked=validateAccess(state,access||initialAccess(state,initializer),[userId]);
  if(initializer==='personal'&&checked.subjects.length)throw Error('个人知识库不能添加其他授权对象');
  if(initializer==='shared'&&!checked.subjects?.length)throw Error('请至少添加一个公司、部门或人员并配置权限');
  const time=new Date().toISOString(),library={id:crypto.randomUUID(),name:title,kind:initializer,description:description.trim(),ownerId:userId,creatorId:userId,responsibleId:userId,ownership:initializer==='personal'?'personal':'organization',access:checked,...(icon?{icon}:{}),...(cover?{cover}:{}),members:[],createdAt:time,updatedAt:time};
  return {library,state:recordSharingChange(state,{...state,spaces:[...state.spaces,library]},library.id,'space',userId)};
}
