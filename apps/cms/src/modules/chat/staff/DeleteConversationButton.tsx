'use client';
import {confirmAction} from '../../shared/confirm-dialog';
import {isAdmin} from '../../identity/permissions';
import {useLocale} from '../../shared/locale';
import type {WorkspaceState} from '../useWorkspace';

export function DeleteConversationButton({state,onDeleted}:{state:WorkspaceState;onDeleted:()=>void}){
 const {t}=useLocale();
 if(!state.conversation||!isAdmin(state.me?.user))return null;
 return <button className="operator-delete-conversation" type="button" disabled={state.busy||state.uploading} title={t('Xóa hội thoại')} aria-label={t('Xóa hội thoại')} onClick={async()=>{
  if(!await confirmAction({title:t('Xóa hội thoại'),message:t('Xóa toàn bộ hội thoại và tệp đính kèm? Không thể hoàn tác.'),confirmLabel:t('Xóa hội thoại'),cancelLabel:t('Hủy'),danger:true}))return;
  if(await state.deleteConversation())onDeleted();
 }}>{t('Xóa hội thoại')}</button>;
}
