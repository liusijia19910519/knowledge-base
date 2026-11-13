const encoder=new TextEncoder(),crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const n of bytes)crc=crcTable[(crc^n)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function header(size,fields){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);for(const [offset,value,width=4] of fields)width===2?view.setUint16(offset,value,true):view.setUint32(offset,value,true);return bytes;}
export async function makeZip(entries,{cancelled=()=>false,onProgress=()=>{}}={}){
  if(entries.length>65535)throw Error('文件数量过多，无法打包');
  const parts=[],central=[];let offset=0,centralSize=0;
  for(let i=0;i<entries.length;i++){
    if(cancelled())throw Error('已取消下载');const entry=entries[i],name=encoder.encode(entry.name),blob=entry.blob||new Blob([]),bytes=new Uint8Array(await blob.arrayBuffer()),crc=crc32(bytes);
    if(name.length>65535||offset+blob.size+30+name.length+centralSize+46+name.length>0xffffffff)throw Error('名称或打包大小超出 ZIP 支持范围');
    const local=header(30,[[0,0x04034b50],[4,20,2],[6,0x800,2],[12,0x21,2],[14,crc],[18,blob.size],[22,blob.size],[26,name.length,2]]);
    const directory=header(46,[[0,0x02014b50],[4,20,2],[6,20,2],[8,0x800,2],[14,0x21,2],[16,crc],[20,blob.size],[24,blob.size],[28,name.length,2],[38,entry.name.endsWith('/')?16:0],[42,offset]]);
    parts.push(local,name,blob);central.push(directory,name);offset+=30+name.length+blob.size;centralSize+=46+name.length;onProgress(i+1,entries.length);await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(cancelled())throw Error('已取消下载');
  const end=header(22,[[0,0x06054b50],[8,entries.length,2],[10,entries.length,2],[12,centralSize],[16,offset]]);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
