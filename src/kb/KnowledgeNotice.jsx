export default function KnowledgeNotice({text,onClose,onView,onPause}){
  return <div className="knowledge-product-toast" role="status" onPointerEnter={()=>onPause?.(true)} onPointerLeave={event=>{if(!event.currentTarget.contains(document.activeElement))onPause?.(false);}} onFocus={()=>onPause?.(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))onPause?.(false);}}><span>{text}</span>{onView&&<button type="button" className="notice-location" onClick={onView}>查看位置</button>}<button type="button" onClick={onClose}>知道了</button></div>;
}
