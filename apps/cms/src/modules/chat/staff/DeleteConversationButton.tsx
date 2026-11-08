'use client';
import {isAdmin} from '../../identity/permissions';
import {useLocale} from '../../shared/locale';
import type {WorkspaceState} from '../useWorkspace';

export function DeleteConversationButton({state,onDeleted}:{state:WorkspaceState;onDeleted:()=>void}){
 const {t}=useLocale();
 if(!state.conversation||!isAdmin(state.me?.user))return null;
 return <button className="operator-delete-conversation" type="button" disabled={state.busy||state.uploading} title={t('Xóa hội thoại')} aria-label={t('Xóa hội thoại')} onClick={async()=>{
  if(!window.confirm(t('Xóa toàn bộ hội thoại và tệp đính kèm? Không thể hoàn tác.')))return;
  if(await state.deleteConversation())onDeleted();
 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>;
}
