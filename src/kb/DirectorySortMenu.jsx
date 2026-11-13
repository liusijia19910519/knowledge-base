import { ArrowsDownUp, Check } from '@phosphor-icons/react';
import useHoverMenu from './useHoverMenu.js';
export default function DirectorySortMenu({value,onChange}){
  const {open,root,trigger,rootProps,triggerProps}=useHoverMenu();
  const choose=next=>onChange({...value,...next});
  return <div className="directory-sort-menu" ref={root} {...rootProps}>
    <button type="button" className="directory-sort-trigger" ref={trigger} aria-label="排序" title="排序" aria-haspopup="menu" aria-expanded={open} {...triggerProps}><ArrowsDownUp size={17}/></button>
    {open&&<div className="directory-sort-options" role="menu" aria-label="文件排序">
      <div className="sort-section-label">规则排序</div>
      {[['updatedAt','更新时间'],['createdAt','创建时间'],['name','文件名']].map(([field,label])=><button type="button" role="menuitemradio" aria-checked={value.field===field} key={field} onClick={()=>choose({field})}><span>{label}</span>{value.field===field&&<Check size={15}/>}</button>)}
      <div className="sort-section-label separated">排序</div>
      {[['desc',value.field==='name'?'文件名从Z到A':'时间从近到远'],['asc',value.field==='name'?'文件名从A到Z':'时间从远到近']].map(([direction,label])=><button type="button" role="menuitemradio" aria-checked={value.direction===direction} key={direction} onClick={()=>choose({direction})}><span>{label}</span>{value.direction===direction&&<Check size={15}/>}</button>)}
    </div>}
  </div>;
}
