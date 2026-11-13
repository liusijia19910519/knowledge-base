import { contentRights, librariesForView, originalPosition, libraryType } from './access.js';
import { contentText } from './contentCreation.js';
export function searchKnowledge(state,userId,query,type='all'){
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);if(!words.length)return [];
  const matches=text=>words.every(word=>text.toLocaleLowerCase().includes(word));
  const libraries=librariesForView(state,userId).filter(l=>matches(`${l.name} ${l.description||''}`)).map(l=>({id:l.id,kind:'library',name:l.name,description:l.description||'',view:libraryType(l),path:'知识库'}));
  const nodes=state.nodes.filter(n=>contentRights(state,n,userId).view).filter(n=>matches(`${n.name} ${contentText(n)}`)).map(n=>({id:n.id,kind:n.type==='folder'?'folder':'file',name:n.name,node:n,view:libraryType(state.spaces.find(l=>l.id===n.spaceId)),path:originalPosition(state,n),description:contentText(n).replace(/\s+/g,' ').slice(0,100)}));
  return [...libraries,...nodes].filter(row=>type==='all'||row.kind===type).sort((a,b)=>(b.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())?1:0)-(a.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())?1:0));
}
