const key=(userId,nodeId)=>`kb-document-draft-v3:${userId}:${nodeId}`;
export function readDocumentDraft(userId,nodeId){try{const value=JSON.parse(sessionStorage.getItem(key(userId,nodeId))||'null');return value&&typeof value.body==='string'&&typeof value.baseBody==='string'?value:null;}catch{return null;}}
export function storeDocumentDraft(userId,nodeId,body,baseBody){sessionStorage.setItem(key(userId,nodeId),JSON.stringify({body,baseBody,savedAt:new Date().toISOString()}));}
export function removeDocumentDraft(userId,nodeId){try{sessionStorage.removeItem(key(userId,nodeId));}catch{}}
