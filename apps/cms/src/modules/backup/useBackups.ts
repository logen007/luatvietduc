'use client';
import {useEffect,useRef,useState} from 'react';
import {api,ClientApiError} from '../shared/client-api';
import {isPublicSessionCurrent,usePublicSession,loadPublicSession,invalidatePublicSession} from '../shared/session-client';
import {visiblePoll} from '../shared/polling';
import {createLatestRequest} from '../shared/latest-request';
import {createOperationGate} from '../chat/client-operations';
import {readBackupStatus,readBackupReceipt,type BackupStatus as Status} from './client-contract';
export function useBackups(){
 const session=usePublicSession(),owner=session.status==='ready'&&session.user?.role==='owner';
 const [value,setValue]=useState<Status|null>(null),[revision,setRevision]=useState(-1),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [loadError,setLoadError]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[selected,setSelected]=useState(''),[identity,setIdentity]=useState(''),[acknowledged,setAcknowledged]=useState(false);
 const reader=useRef(createLatestRequest<Status>()),gate=useRef(createOperationGate()),key=String(session.revision);
 const valid=()=>owner&&isPublicSessionCurrent(session.revision),visible=owner&&revision===session.revision;
 async function reload(force=false){
  if(!valid())return;
  const result=await reader.current.load(key,async()=>readBackupStatus(await api<unknown>('backups')),force);
  if(!valid()||!result.current())return;
  setLoading(false);
  if(result.ok){setValue(result.value);setLoadError('');setAcknowledged(false);setSelected(id=>result.value.snapshots.some(snapshot=>snapshot.id===id)?id:'');}
  else{setLoadError(result.error instanceof Error?result.error.message:'Chưa tải được trạng thái sao lưu.');if(result.error instanceof ClientApiError&&[401,403].includes(result.error.status)){setValue(null);setIdentity('');if(result.error.status===403)invalidatePublicSession();}}
 }
 useEffect(()=>{
  setValue(null);setRevision(session.revision);setLoading(true);setLoadError('');setError('');setMessage('');setSelected('');setIdentity('');setBusy(false);setAcknowledged(false);gate.current.reset();
  if(!owner)return;
  reader.current.select(key);const stop=visiblePoll(()=>reload(),15000);
  return()=>{stop();reader.current.clear(key);gate.current.reset();};
 },[key,owner]);
 const active=acknowledged||Boolean(value?.jobs.some(job=>['queued','running'].includes(job.state)));
 async function run(action:'backup'|'restore-test'){
  if(!visible||!valid()||loading||loadError||active||!value?.runtime?.ready||!value.drive.enabled||(action==='restore-test'&&(!selected||!identity)))return;
  const ticket=gate.current.begin();if(!ticket)return;
  setBusy(true);setError('');setMessage('');
  const data={action,...(action==='restore-test'?{snapshotId:selected,identity}:{})};
  // Recovery keys never enter browser storage or a reusable draft.
  setIdentity('');
  try{
   const receipt=readBackupReceipt(await api<unknown>('backups',data));
   if(!valid()||!gate.current.isCurrent(ticket))return;
   setAcknowledged(true);setMessage(receipt.message);
   // A failed status refresh does not turn an accepted job into a failed write.
   void reload(true);
  }catch(e){if(valid()&&gate.current.isCurrent(ticket)){setError((e as Error).message);await reload(true);}}
  finally{if(gate.current.end(ticket)&&valid())setBusy(false);}
 }
 return {status:visible?value:null,loading:!visible||loading,busy:visible&&busy,active:visible&&active,loadError:visible?loadError:'',error:visible?error:'',message:visible?message:'',selected:visible?selected:'',setSelected,identity:visible?identity:'',setIdentity,run,reload:()=>session.status==='error'?loadPublicSession().catch(()=>{}):reload(true),session,owner};
}
