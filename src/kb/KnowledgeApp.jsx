import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import BusinessWorkspace from './BusinessWorkspace.jsx';
import AskWorkspace from './AskWorkspace.jsx';
const ProductOverview=lazy(()=>import('../overview/ProductOverview.jsx'));
import { loadState, saveState } from './store.js';

// One signed-in account; collaborators remain available for authorizations.
const withCurrentUser=s=>({...s,viewAs:s.meId||'zhou-ning'});
function useStore(){
  const [state,setState]=useState(()=>withCurrentUser(loadState()));
  const current=useRef(state);
  useEffect(()=>{const sync=e=>{if(e.key!=='kb-prototype-v1')return;const next=withCurrentUser(loadState());current.current=next;setState(next);};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
  const update=recipe=>{const next=withCurrentUser(recipe(withCurrentUser(loadState())));saveState(next);current.current=next;setState(next);};
  return [state,update];
}
function route(){const parts=(window.location.hash.replace(/^#/,'')||'/overview').split('/').filter(Boolean);return {path:parts[0]||'overview',id:parts[1]||'',mode:parts[2]||''};}
export function KnowledgeApp(){
  const [state,update]=useStore(),[location,setLocation]=useState(route);
  const activeHash=useRef(window.location.hash||'#/overview');
  useEffect(()=>{const sync=()=>{const event=new CustomEvent('knowledge-before-route',{cancelable:true,detail:{hash:window.location.hash}});if(!window.dispatchEvent(event)){window.history.replaceState(null,'',activeHash.current);return;}activeHash.current=window.location.hash;setLocation(route());};window.addEventListener('hashchange',sync);if(!window.location.hash)window.location.hash='/overview';return()=>window.removeEventListener('hashchange',sync);},[]);
  if(location.path==='overview')return <Suspense fallback={<div role="status" style={{height:'100vh',display:'grid',placeItems:'center',background:'#fff',color:'#91a1b8',fontSize:13}}>正在打开产品说明…</div>}><ProductOverview section={location.id}/></Suspense>;
  return <BusinessWorkspace state={state} update={update} location={location}>{location.path==='ask'?<AskWorkspace state={state} update={update} userId={state.viewAs} location={location}/>:null}</BusinessWorkspace>;
}

