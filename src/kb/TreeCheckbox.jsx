import { useEffect, useRef } from 'react';
export default function TreeCheckbox({partial=false,...props}){const root=useRef(null);useEffect(()=>{if(root.current)root.current.indeterminate=partial;},[partial]);return <input ref={root} type="checkbox" {...props}/>;}
