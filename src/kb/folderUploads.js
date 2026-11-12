import { createContent, uniqueContentName, validateDestination } from './contentCreation.js';

export const MAX_UPLOAD_FILES=20;
export const MAX_FOLDER_FILES=200;
export const uploadPath=file=>file.webkitRelativePath||file.name;
export const uploadLimit=files=>files.some(file=>file.webkitRelativePath)?MAX_FOLDER_FILES:MAX_UPLOAD_FILES;
export function validateUploadSelection(files){
  if(!files.length)throw Error('请先选择要上传的文件或文件夹');
  if(files.length>uploadLimit(files))throw Error(`每批最多上传 ${uploadLimit(files)} 个文件`);
  for(const file of files){
    const path=uploadPath(file).split('/');
    if(path.some(part=>!part||part==='.'||part==='..'||part.includes('\\'))||path.at(-1)!==file.name)throw Error('文件夹路径无效，请重新选择');
  }
}

// Run inside the same state transaction as the file insertion. A cancelled or
// failed first file leaves no empty directory tree or reserved names behind.
export function prepareUploadLocation(state,fields,userId){
  validateDestination(state,fields,userId);
  const parts=fields.relativePath?.split('/').slice(0,-1)||[];
  if(!parts.length)return {state,fields,assignments:[]};
  if(!fields.folderSession||parts.some(p=>!p||p==='.'||p==='..'||p.includes('\\')))throw Error('文件夹路径无效，请重新上传');
  let current=state,parentId=fields.parentId||'';const assignments=[];
  for(let index=0;index<parts.length;index++){
    const key=parts.slice(0,index+1).join('/'),known=fields.folderSession.folders.get(key);
    if(known){
      const folder=current.nodes.find(n=>n.id===known);
      if(!folder||folder.deletedAt||folder.type!=='folder'||folder.spaceId!==fields.spaceId||(folder.parentId||'')!==parentId)throw Error('上传目录已被移动或删除，请重新选择文件夹上传');
      validateDestination(current,{spaceId:fields.spaceId,parentId:known},userId);parentId=known;
    }else{
      const name=uniqueContentName(current,fields.spaceId,parentId,parts[index]);
      const result=createContent(current,{spaceId:fields.spaceId,parentId,format:'folder',name},userId);
      current=result.state;parentId=result.node.id;assignments.push([key,parentId]);
    }
  }
  return {state:current,fields:{...fields,parentId},assignments};
}
