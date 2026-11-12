import { File, FileText, FilePdf, FileDoc, FileXls, FilePpt, FileImage, FileZip, FileAudio, FileVideo, FileCode, FolderOpen, Table, ProjectorScreenChart } from '@phosphor-icons/react';
import { fileType } from './fileTypes.js';
import './contentIcons.css';

const icons={folder:FolderOpen,doc:FileText,sheet:Table,slides:ProjectorScreenChart,pdf:FilePdf,word:FileDoc,excel:FileXls,powerpoint:FilePpt,image:FileImage,archive:FileZip,audio:FileAudio,video:FileVideo,code:FileCode,text:FileText,other:File};
export default function ContentIcon({node,size=19,className='',...props}){
  const type=fileType(node),Icon=icons[type.icon],box=size+8;
  return <svg {...props} className={`content-type-icon ${className}`} width={box} height={box} viewBox={`0 0 ${box} ${box}`} role="img" aria-label={type.label} data-file-type={type.key}>
    <title>{type.label}</title>
    {type.key==='folder'?<Icon x={1} y={1} size={box-2} weight="fill" style={{color:type.color}}/>:<><rect x="1" y="1" width={box-2} height={box-2} rx="5" fill={type.color}/><Icon x="4" y="4" size={size} weight="bold" style={{color:'#fff'}}/></>}
  </svg>;
}
