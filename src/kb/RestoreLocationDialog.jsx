import LocationPicker from './LocationPicker.jsx';
import { contentTree, restoreContent } from './access.js';
import { relocationTargetReason } from './contentOperations.js';

export default function RestoreLocationDialog({state,node,userId,update,onClose,onSaved}){
  const ids=contentTree(state,node),items=state.nodes.filter(n=>ids.has(n.id)&&n.deletedAt&&(n.id===node.id||node.deleteBatch&&n.deleteBatch===node.deleteBatch));
  return <LocationPicker state={state} userId={userId} value={{view:'',spaceId:'',parentId:''}} blockedIds={[...ids]} title={`选择「${node.name}」的恢复位置`} description="原位置已不可用。请选择有编辑权限的目录，恢复后重置普通授权并继承目标位置，创建者管理权保留。" emptyLabel="请选择有编辑权限的恢复位置" confirmText="确认恢复" destinationReason={spaceId=>relocationTargetReason(state,items,'move',spaceId,userId)} onClose={onClose} onConfirm={position=>{update(current=>{if(current.viewAs!==userId)throw Error('当前用户已变化，请重新操作');return restoreContent(current,node.id,userId,position);});onSaved();onClose();}}/>;
}
