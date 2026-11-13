const types={
  folder:{icon:'folder',label:'文件夹',color:'#d99b24'},
  doc:{icon:'doc',label:'文档',color:'#397bea'},
  sheet:{icon:'sheet',label:'表格',color:'#20a26b'},
  slides:{icon:'slides',label:'幻灯片',color:'#ec8739'},
  pdf:{icon:'pdf',label:'PDF 文档',color:'#e65358'},
  word:{icon:'word',label:'Word 文档',color:'#3278d6'},
  excel:{icon:'excel',label:'Excel 表格',color:'#218f60'},
  powerpoint:{icon:'powerpoint',label:'PPT 幻灯片',color:'#dc7441'},
  image:{icon:'image',label:'图片',color:'#8c65d3'},
  archive:{icon:'archive',label:'压缩包',color:'#bd8a3b'},
  audio:{icon:'audio',label:'音频',color:'#cb639c'},
  video:{icon:'video',label:'视频',color:'#7361d2'},
  code:{icon:'code',label:'代码文件',color:'#548ca0'},
  text:{icon:'text',label:'文本文件',color:'#71849b'},
  other:{icon:'other',label:'其他文件',color:'#929eae'},
};
const groups={
  word:['doc','docx','dot','dotx','odt','rtf'],
  excel:['xls','xlsx','xlsm','xlsb','ods'],
  powerpoint:['ppt','pptx','pptm','pps','ppsx','odp'],
  image:['png','jpg','jpeg','gif','webp','avif','bmp','svg','ico','heic','heif','tif','tiff'],
  archive:['zip','rar','7z','tar','gz','bz2','xz','tgz'],
  audio:['mp3','wav','m4a','aac','ogg','flac','wma','opus'],
  video:['mp4','mov','avi','mkv','webm','wmv','m4v','mpeg','mpg'],
  code:['json','xml','html','htm','css','js','jsx','ts','tsx','py','java','sql','sh','yaml','yml','vue','c','cpp','go','rs'],
  text:['txt','log','md','markdown'],
};

// Display classification only: never changes stored format, file name or bytes.
export function fileType(node={}){
  if(node.type==='folder')return {...types.folder,key:'folder'};
  if(node.format!=='file'){
    const key=['sheet','slides'].includes(node.format)?node.format:'doc';
    return {...types[key],key};
  }
  const name=String(node.fileName||node.name||'').trim(),extension=name.match(/\.([a-z0-9]{1,12})$/i)?.[1].toLowerCase()||'',mime=String(node.mime||'').toLowerCase().split(';')[0].trim();
  let key=extension==='pdf'?'pdf':extension==='csv'?'excel':Object.keys(groups).find(group=>groups[group].includes(extension));
  if(!key){
    if(mime==='application/pdf')key='pdf';
    else if(/word|opendocument\.text|rtf/.test(mime))key='word';
    else if(/spreadsheet|excel|opendocument\.spreadsheet|csv/.test(mime))key='excel';
    else if(/presentation|powerpoint/.test(mime))key='powerpoint';
    else if(mime.startsWith('image/'))key='image';
    else if(mime.startsWith('audio/'))key='audio';
    else if(mime.startsWith('video/'))key='video';
    else if(/zip|compressed|tar|gzip/.test(mime))key='archive';
    else if(/json|xml|javascript/.test(mime))key='code';
    else if(mime.startsWith('text/'))key='text';
  }
  key||='other';
  let label=types[key].label;
  if(extension==='csv')label='CSV 表格';
  else if(['md','markdown'].includes(extension))label='Markdown 文档';
  else if(extension&&['image','archive','audio','video','code','text','other'].includes(key)){
    const family={image:'图片',archive:'压缩包',audio:'音频',video:'视频',code:'文件',text:'文本',other:'文件'}[key];
    label=`${extension.toUpperCase()} ${family}`;
  }
  return {...types[key],key,label,extension};
}
