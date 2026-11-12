import { useEffect, useState } from 'react';
import { File } from '@phosphor-icons/react';
import { authorizedBlob } from './uploads.js';
export default function UploadedFilePreview({node,canDownload}){
  const [url,setUrl]=useState(''),[text,setText]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let live=true,created;setError('');setUrl('');setText('');authorizedBlob(node.id).then(async blob=>{if(!live)return;created=URL.createObjectURL(blob);setUrl(created);if(/\.(txt|md|csv|json|log)$/i.test(node.fileName)||node.mime?.startsWith('text/')){if(blob.size<=2*1024*1024){const body=await blob.text();if(live)setText(body);}else if(live)setError('文本文件较大，请下载后查看完整内容');}}).catch(e=>live&&setError(e.message));return()=>{live=false;if(created)URL.revokeObjectURL(created);};},[node.id,attempt]);
  const image=node.mime?.startsWith('image/')||/\.(png|jpe?g|gif|webp|avif)$/i.test(node.fileName),pdf=node.mime==='application/pdf'||/\.pdf$/i.test(node.fileName),textFile=/\.(txt|md|csv|json|log)$/i.test(node.fileName)||node.mime?.startsWith('text/');
  return <section className="uploaded-preview" aria-label="上传文件预览"><header><span>{node.fileName} · {(node.size/1024).toFixed(1)} KB</span></header>
    {error?<div className="file-unavailable">{error}<br/><button type="button" onClick={()=>setAttempt(n=>n+1)}>重新读取</button></div>:!url?<div className="file-unavailable">正在读取原始文件…</div>:image?<img src={url} alt={node.name} onError={()=>setError('图片暂时无法预览，可重新读取或下载原文件')}/>:pdf?<iframe title={node.name} src={`${url}#toolbar=0`}/>:textFile?<pre>{text}</pre>:<div className="file-unavailable"><File size={36}/><p>此格式暂不支持在线预览</p>{canDownload?'可下载原始文件后使用对应应用打开。':'你当前拥有仅查看权限，可联系管理者获取下载权限。'}</div>}
  </section>;
}
