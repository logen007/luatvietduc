"use client";
import {useRouter} from 'next/navigation';
import {currentBrowserContext} from './browser-context';
import {useEffect,useRef,useState} from "react";
import {api,ClientApiError} from "../shared/client-api";
import {isAdmin,canEnterAdmin} from '../identity/permissions';
import {visiblePoll} from "../shared/polling";
import {isPublicSessionCurrent,usePublicSession,loadPublicSession} from '../shared/session-client';
import {createDeliveryGuard,createMessageOutbox,createOperationGate,mergeMessages,rememberCreatedConversation,validateAttachmentBatch,type MessageReceipt} from './client-operations';
import {uploadChatAttachment} from './client-upload';
import type {Conversation,Message,Transcript,Attachment,TransitionReceipt} from './contracts';
import {initialChatQuestion} from './intake';
import {loadPublicSettings} from '../settings/client';
import {applyTransitionReceipt} from './transition-receipt';
import {createDraftBook,draftMatchesDelivery,draftOwnerKey,handoffKey,saveDraftHandoff,takeDraftHandoff} from './drafts';
export function useWorkspace(staff=false,manageList=true){
  const router=useRouter();
  const session=usePublicSession(),me=session.status==='ready'?session.data:null;
  const [ownerRevision,setOwnerRevision]=useState(-1),[intakeAttempt,setIntakeAttempt]=useState(0),[initializationFailed,setInitializationFailed]=useState(false);
  const visible=session.status==='ready'&&ownerRevision===session.revision;
  const current=()=>isPublicSessionCurrent(session.revision);
  const [rows, setRows] = useState<Conversation[]>([]),
    [selected, setSelected] = useState(""),
    [conversation, setConversation] = useState<Conversation|null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [text, setText] = useState(""),
    [country, setCountry] = useState(""),
    [internal, setInternal] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [reauthorizing,setReauthorizing]=useState(false),
    [notice, setNotice] = useState("");
  const [preferHuman,setPreferHuman]=useState(false),[sendingBody,setSendingBody]=useState("");
  const [attachments,setAttachments]=useState<Attachment[]>([]),[uploading,setUploading]=useState(false);
  const [maxLength, setMaxLength] = useState(2000);
  const stickToBottom=useRef(true),revision=useRef(0),listRevision=useRef(0),wakeTranscript=useRef<(reset?:boolean)=>void>(()=>{});
  const mode=useRef(staff);mode.current=staff;
  const homepageSubmit=useRef('');
  const operations=useRef(createOperationGate()),deliveries=useRef(createDeliveryGuard()),selection=useRef(''),uploadRequest=useRef<AbortController|null>(null);
  const drafts=useRef(createDraftBook());
  const ownerKey=JSON.stringify([staff,manageList,draftOwnerKey(me?.user)]),effectKey=JSON.stringify([staff,manageList,session.revision,session.status,intakeAttempt]);
  const lifecycle=useRef({key:effectKey,status:session.status,ownerKey,failureStatus:session.failureStatus});lifecycle.current={key:effectKey,status:session.status,ownerKey,failureStatus:session.failureStatus};
  const retainedOwner=useRef<{key:string;scope:string;id:number|null}|null>(null),recoveringSession=useRef(false),continuity=useRef(0);
  const activeDraft=useRef({selected,text,attachments});activeDraft.current={selected,text,attachments};
  const outbox=useRef(createMessageOutbox((id,draft)=>api<MessageReceipt>(`conversations/${id}/messages`,{...draft,...(!mode.current?{aiConsentVersion:'gemini-rag-v1',browserContext:currentBrowserContext()}:{})}))),
    log = useRef<HTMLDivElement>(null),
    shell = useRef<HTMLElement>(null);
  // visualViewport tracks the remaining visible area when mobile keyboards open.
  // Keep this scoped to this workspace; no document-wide layout state is changed.
  useEffect(() => {
    const viewport = window.visualViewport;
    const measure = () => {
      const height =
        viewport && viewport.scale === 1 ? viewport.height : window.innerHeight;
      const element = shell.current;
      if (!element) return;
      element.style.setProperty("--lvd-chat-vh", `${height}px`);
      element.style.setProperty("--lvd-chat-offset", `${viewport?.offsetTop||0}px`);
      const editing=element.contains(document.activeElement)&&document.activeElement?.matches('textarea,input,[contenteditable="true"]');
      element.dataset.keyboardOpen=String(Boolean(editing&&viewport&&viewport.scale===1&&height<document.documentElement.clientHeight-120));
      element.dataset.compactViewport = String(height <= 620);
      element.dataset.shortViewport = String(height <= 420);
    };
    let frame=0;
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    measure();
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, []);
  const refreshList = async () => {
    if(!current()||(staff&&!manageList))return [];
    const ticket=++listRevision.current;
    const v = await api<Conversation[]>(staff ? "queue" : "conversations");
    if(current()&&ticket===listRevision.current)setRows(v);
    return v;
  };
  function rememberCreated(id:string){listRevision.current++;setRows(previous=>rememberCreatedConversation(previous,id));}
  function changeSelection(id:string){selection.current=id;revision.current++;setSelected(id);}
  function forgetDraft(id:string){deliveries.current.retire(id);drafts.current.remove(id);outbox.current.reset(id);if(staff)try{sessionStorage.removeItem(`lvd-staff-draft:${me?.user?.id}:${id}:reply`);}catch{}}
  function transientFailure(status:number|null|undefined){return status===0||typeof status==='number'&&status>=500&&status<=599;}
  function sameContinuity(epoch:number,owner:string|undefined){const view=lifecycle.current;return Boolean(owner)&&epoch===continuity.current&&owner===retainedOwner.current?.key&&(view.status==='ready'?view.ownerKey===owner:view.status==='error'&&transientFailure(view.failureStatus));}
  function clearRetiredDrafts(id:number|null){try{if(id!=null)for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(`lvd-staff-draft:${id}:`))sessionStorage.removeItem(key);}sessionStorage.removeItem(handoffKey);}catch{}}
  function acknowledgeRetainedDraft(id:string,body:string,files:Attachment[]){
    const snapshot=activeDraft.current,ids=files.map(file=>file.id),selectedMatch=snapshot.selected===id&&draftMatchesDelivery(snapshot,body,ids);
    const matches=snapshot.selected===id?selectedMatch:draftMatchesDelivery(drafts.current.get(id),body,ids);
    if(matches)drafts.current.remove(id);
    if(selectedMatch){activeDraft.current={...snapshot,text:'',attachments:[]};setText('');setAttachments([]);setError('');}
    if(staff&&matches)try{const key=`lvd-staff-draft:${retainedOwner.current?.id}:${id}:reply`;if(sessionStorage.getItem(key)?.trim()===body)sessionStorage.removeItem(key);}catch{}
    if(lifecycle.current.status==='ready'&&snapshot.selected===id)wakeTranscript.current();
  }
  function selectConversation(id:string){
    if(!visible||!current()||!loaded||selected!==selection.current||operations.current.busy()||(!staff&&!rows.some(row=>row.id===id)))return false;
    if(id===selection.current)return true;
    drafts.current.save(selected,{text,attachments});
    const draft=drafts.current.get(id);
    changeSelection(id);setConversation(null);setMessages([]);setAttachments(draft.attachments);
    setError('');setConnectionError('');setText(draft.text);setInternal(false);setPreferHuman(false);
    return true;
  }
  useEffect(() => {
    let active=true;
    const key=effectKey,scope=JSON.stringify([staff,manageList]);
    const cleanup=()=>{
      active=false;operations.current.reset();uploadRequest.current?.abort();uploadRequest.current=null;
      // A real unmount retires this owner. Dependency changes are classified by
      // the next effect before any private result can be applied.
      if(lifecycle.current.key===key){continuity.current++;outbox.current.reset();drafts.current.clear();retainedOwner.current=null;recoveringSession.current=false;}
    };
    revision.current++;operations.current.reset();setUploading(false);setBusy(false);setSendingBody('');setLoaded(false);setInitializationFailed(false);
    if(session.status==='error'&&transientFailure(session.failureStatus)&&retainedOwner.current?.scope===scope){
      drafts.current.save(selection.current,activeDraft.current);recoveringSession.current=true;
      setOwnerRevision(-1);setReauthorizing(true);
      return cleanup;
    }
    const restore=session.status==='ready'&&recoveringSession.current&&retainedOwner.current?.key===ownerKey;
    const restoreSelected=restore?selection.current:'';
    if(!restore){
      if(retainedOwner.current&&(session.status!=='ready'||retainedOwner.current.key!==ownerKey))clearRetiredDrafts(retainedOwner.current.id);
      continuity.current++;outbox.current.reset();drafts.current.clear();selection.current='';recoveringSession.current=false;
      setSelected('');setAttachments([]);setText('');setError('');setInternal(false);setCountry('');setPreferHuman(false);
    }
    setRows([]);setConversation(null);setMessages([]);setConnectionError('');setReauthorizing(restore);setOwnerRevision(session.revision);
    if(session.status!=='ready'){retainedOwner.current=null;return cleanup;}
    retainedOwner.current={key:ownerKey,scope,id:me?.user?.id??null};
    const valid=()=>active&&current();
    let savedDraft:string|null=null;
    if(!staff)try{savedDraft=sessionStorage.getItem('lvd-question');}catch{}
    const draft = restore||staff ? '' : initialChatQuestion(window.location.search,savedDraft);
    if (draft) setText(draft);
    (async () => {
      try {
        const [s,list]=await Promise.all([loadPublicSettings(),staff&&!manageList?Promise.resolve([]):api<Conversation[]>(staff?'queue':'conversations')]);
        if (valid()) {
          setNotice(
            [
              s.supportNotice,
              s.officeHours ? `Giờ trực (${s.timeZone}): ${s.officeHours}` : "",
            ]
              .filter(Boolean)
              .join(" "),
          );
          setMaxLength(s.maxMessageLength || 2000);
          if(draft)setText(draft.slice(0,s.maxMessageLength||2000));
        }
        if (!valid()) return;
        setRows(list);
        // A question from the homepage starts its own intake, even with saved history.
        if(restore){
          if(restoreSelected&&(staff||list.some(item=>item.id===restoreSelected))){
            const saved=drafts.current.get(restoreSelected);changeSelection(restoreSelected);setText(saved.text);setAttachments(saved.attachments);setReauthorizing(true);
          }else{
            if(restoreSelected)forgetDraft(restoreSelected);
            const saved=restoreSelected?{text:'',attachments:[]}:drafts.current.get('');setText(saved.text);setAttachments(saved.attachments);
            if(restoreSelected&&!staff&&list[0])changeSelection(list[0].id);else changeSelection('');setReauthorizing(false);
          }
          recoveringSession.current=false;
        }else if (staff){const requested=new URLSearchParams(window.location.search).get('conversation');if(requested&&/^[a-f0-9-]{36}$/i.test(requested))changeSelection(requested);}
        else if(!draft){
          const requested=new URLSearchParams(window.location.search).get('conversation');
          if(requested&&list.some(item=>item.id===requested)){
            changeSelection(requested);
            let restored;try{restored=takeDraftHandoff(sessionStorage,me?.user?.id||null,list.map(item=>item.id),requested);}catch{}
            if(restored){
              const text=restored.text.slice(0,s.maxMessageLength||2000);setText(text);setAttachments(restored.attachments);
              if(restored.retry&&draftMatchesDelivery({text,attachments:restored.attachments},restored.retry.body,restored.retry.fileIds))outbox.current.restore(requested,{body:restored.retry.body,internal:false,fileIds:restored.retry.fileIds},restored.retry.key);
            }
          }else{try{takeDraftHandoff(sessionStorage,me?.user?.id||null,[],requested);}catch{}if(list[0])changeSelection(list[0].id);}
        }
        if(draft&&!new URLSearchParams(window.location.search).has('question'))try{if(sessionStorage.getItem('lvd-question-submit')===savedDraft)homepageSubmit.current=draft.slice(0,s.maxMessageLength||2000);}catch{}
        if(draft)try{if(sessionStorage.getItem('lvd-question')===draft)sessionStorage.removeItem('lvd-question');}catch{}
      } catch (e) {
        if (valid()){setError((e as Error).message);setInitializationFailed(true);}
      } finally {
        if (valid()) setLoaded(true);
      }
    })();
    return cleanup;
  }, [staff,manageList,session.revision,session.status,intakeAttempt]);
  useEffect(() => {
    stickToBottom.current=true;revision.current++;setConversation(null);
    if (!visible || !selected) {
      setMessages([]);
      setConversation(null);
      setConnectionError("");
      return;
    }
    let active = true,
      cursor = 0;
    let latestUser=0,latestAnswered=0,recovering=false,waiting=false,knownVersion:number|null=null,replaceMessages=true;
    const load = async () => {
      const ticket=revision.current;
      try {
        let v = await api<Transcript>(`conversations/${selected}?after=${cursor}`);
        if (!active||!current()||selection.current!==selected||ticket!==revision.current) return;
        if(knownVersion!==null&&v.conversation.version!==knownVersion&&cursor>0){
          v=await api<Transcript>(`conversations/${selected}?after=0`);
          if(!active||!current()||selection.current!==selected||ticket!==revision.current)return;
          cursor=0;latestUser=0;latestAnswered=0;replaceMessages=true;
        }
        knownVersion=v.conversation.version;
        for(const message of v.messages){
          if(message.role==='user')latestUser=Math.max(latestUser,Number(message.id));
          if(message.role==='assistant'&&String(message.client_key).startsWith('assistant:'))latestAnswered=Math.max(latestAnswered,Number(String(message.client_key).slice(10))||0);
        }
        // Retry only an interrupted server generation; the server enforces ownership and idempotency.
        if(!staff&&v.conversation.aiEnabled&&latestUser>latestAnswered&&!recovering&&(!v.conversation.aiStartedAt||Date.now()-new Date(v.conversation.aiStartedAt).getTime()>35000)){
          recovering=true;void api(`conversations/${selected}/answer`,{messageId:String(latestUser)}).catch(()=>{}).finally(()=>{recovering=false;});
        }
        if(v.conversation.restricted){forgetDraft(selected);setMessages([]);setText('');setAttachments([]);setInternal(false);cursor=0;}
        setReauthorizing(false);
        setConversation(v.conversation);
        setRows((current) =>
          current.map((row) =>
            row.id === v.conversation.id
              ? {
                  ...row,
                  title: v.conversation.title,
                  state: v.conversation.state,
                  version: v.conversation.version,
                  customTitle:v.conversation.customTitle,
                  updatedAt:v.conversation.updatedAt,
                }
              : row,
          ),
        );
        if(!v.conversation.restricted){
          if(v.messages.length)cursor=Number(v.messages[v.messages.length-1].id);
          const replace=replaceMessages;replaceMessages=false;
          setMessages(old=>replace?v.messages:mergeMessages(old,v.messages));
        }
        waiting=Boolean(v.conversation.aiEnabled&&latestUser>latestAnswered);
        setConnectionError("");
      } catch (e) {
        if (active&&current()&&ticket===revision.current) {setConnectionError((e as Error).message);if(e instanceof ClientApiError&&[401,403,404].includes(e.status)){forgetDraft(selected);setConversation(null);setMessages([]);setAttachments([]);setText('');setReauthorizing(false);cursor=0;}}
      }
    };
    setMessages([]);
    setConnectionError("");
    let idle=0;
    const stop=visiblePoll(async()=>{const before=cursor;await load();idle=cursor===before?idle+1:0;},()=>waiting?1500:idle>=4?10000:2500);
    wakeTranscript.current=(reset=false)=>{if(reset){cursor=0;latestUser=0;latestAnswered=0;replaceMessages=true;}idle=0;stop.refresh();};
    return () => {
      active = false;
      wakeTranscript.current=()=>{};
      stop();
    };
  }, [selected,visible,session.revision,staff]);
  useEffect(()=>{const element=log.current;if(!element)return;const track=()=>{stickToBottom.current=element.scrollHeight-element.scrollTop-element.clientHeight<120;};element.addEventListener('scroll',track,{passive:true});return()=>element.removeEventListener('scroll',track);},[selected]);
  useEffect(() => {
    if (!log.current) return;
    // Keep a new conversation at the start of its intake form on small screens.
    const hasMessages = Boolean(selected && messages.length);
    if(hasMessages&&!stickToBottom.current)return;
    log.current.scrollTo({
      top: hasMessages ? log.current.scrollHeight : 0,
      behavior: hasMessages ? "smooth" : "auto",
    });
  }, [messages.length, selected]);
  useEffect(() => {
    if (!visible || !staff || !manageList || !me?.user) return;
    return visiblePoll(()=>refreshList(),5000,{initial:false});
  }, [staff,visible,session.revision,manageList]);
  const act = async (action: string) => {
    if (!visible || !current() || reauthorizing || !conversation || busy || uploading) return;
    const operation=operations.current.begin();if(!operation)return false;
    const valid=()=>current()&&operations.current.isCurrent(operation);
    setBusy(true);revision.current++;
    try {
      const receipt=await api<TransitionReceipt>(`conversations/${selected}/transition`, {
        action,
        version: conversation.version,
      });
      if(!valid())return false;
      revision.current++;
      const acknowledged=applyTransitionReceipt(conversation,receipt,action,staff?me?.user||undefined:undefined);
      setConversation(acknowledged);if(acknowledged.restricted){forgetDraft(selected);setMessages([]);setAttachments([]);setText('');setInternal(false);}
      setError("");wakeTranscript.current(true);
      void refreshList().catch(()=>{});
      return true;
    } catch (e) {
      if(valid())setError((e as Error).message);return false;
    } finally {
      if(operations.current.end(operation)&&current())setBusy(false);
    }
  };
  async function deleteConversation(){
    if(!staff||!isAdmin(me?.user)||!visible||!current()||reauthorizing||!conversation||selected!==selection.current||busy||uploading)return false;
    const operation=operations.current.begin();if(!operation)return false;
    const valid=()=>current()&&operations.current.isCurrent(operation);
    setBusy(true);setError('');revision.current++;
    try{
      const receipt=await api<{id:string;deleted:boolean}>(`conversations/${selected}/delete`,{version:conversation.version,updatedAt:conversation.updatedAt});
      if(!valid())return false;
      if(receipt.id!==selected||!receipt.deleted)throw new Error('Chưa xác nhận được kết quả xóa hội thoại.');
      forgetDraft(selected);changeSelection('');listRevision.current++;
      setRows(old=>old.filter(row=>row.id!==receipt.id));setConversation(null);setMessages([]);
      setText('');setAttachments([]);setInternal(false);setConnectionError('');return true;
    }catch(e){if(valid()){setError((e as Error).message);wakeTranscript.current();}return false;}
    finally{if(operations.current.end(operation)&&current())setBusy(false);}
  }
  async function manageCustomerConversation(id:string,action:'title'|'customer-delete',title?:string,confirmDelete?:()=>boolean){
    if(staff||!visible||!current()||reauthorizing||!loaded||busy||uploading||!rows.some(row=>row.id===id))return false;
    const operation=operations.current.begin();if(!operation)return false;
    const valid=()=>current()&&operations.current.isCurrent(operation);
    setBusy(true);setError('');
    try{
      const snapshot=(await api<Transcript>(`conversations/${id}?after=${Number.MAX_SAFE_INTEGER}`)).conversation;
      if(!valid())return false;
      if(action==='customer-delete'&&confirmDelete&&!confirmDelete())return false;
      const receipt=await api<{id:string;deleted?:boolean;title?:string;version?:number;updatedAt?:string;customTitle?:boolean}>(`conversations/${id}/${action}`,{version:snapshot.version,updatedAt:snapshot.updatedAt,...(action==='title'?{title}:{})});
      if(!valid())return false;
      if(receipt.id!==id||action==='customer-delete'&&!receipt.deleted||action==='title'&&(typeof receipt.title!=='string'||typeof receipt.updatedAt!=='string'||!Number.isSafeInteger(receipt.version)||receipt.customTitle!==true))throw new Error('Chưa xác nhận được cập nhật hội thoại. Tải lại để kiểm tra.');
      listRevision.current++;
      if(action==='title'){
        const update={title:receipt.title!,customTitle:true,version:receipt.version!,updatedAt:receipt.updatedAt};
        setRows(previous=>previous.map(row=>row.id===id?{...row,...update}:row));
        setConversation(previous=>previous?.id===id?{...previous,...update}:previous);
      }else{
        forgetDraft(id);setRows(previous=>previous.filter(row=>row.id!==id));
        if(selection.current===id){
          const next=rows.find(row=>row.id!==id)?.id||'',draft=drafts.current.get(next);changeSelection(next);setConversation(null);setMessages([]);setText(draft.text);setAttachments(draft.attachments);setInternal(false);setPreferHuman(false);setConnectionError('');
        }
      }
      void refreshList().catch(()=>{});return true;
    }catch(error){if(valid()){setError((error as Error).message);void refreshList().catch(()=>{});}return false;}
    finally{if(operations.current.end(operation)&&current())setBusy(false);}
  }
  const send = async (e?: Pick<React.FormEvent,'preventDefault'>) => {
    e?.preventDefault();
    if (!visible || !current() || reauthorizing || (!text.trim()&&!attachments.length) || busy || uploading || !loaded) return;
    const operation=operations.current.begin();if(!operation)return false;
    let delivery:symbol|undefined;
    const liveDelivery=()=>delivery===undefined||deliveries.current.isCurrent(delivery);
    const valid=()=>current()&&operations.current.isCurrent(operation)&&liveDelivery();
    const body=text.trim(),files=[...attachments];
    const epoch=continuity.current,owner=retainedOwner.current?.key;
    setBusy(true);revision.current++;
    setSendingBody(text.trim()||"Tệp đính kèm");
    stickToBottom.current=true;
    setError("");
    try {
      let id = selected;
      if (!id) {
        const c = await api<{id:string}>("conversations", {
          specialty: "general",
          consent:true,
          privacyNoticeVersion:"chat-v2",
          mode:"assistant",
        });
        if(!valid())return false;
        id = c.id;
        rememberCreated(id);
        drafts.current.remove('');changeSelection(id);
      }
      delivery=deliveries.current.begin(id);
      const {receipt,key}=await outbox.current.send(id,{body,internal,fileIds:files.map(file=>file.id)});
      if(!valid()){if(liveDelivery()&&sameContinuity(epoch,owner))acknowledgeRetainedDraft(id,body,files);return false;}
      setText("");setAttachments([]);drafts.current.remove(id);
      setMessages(old=>receipt.duplicate&&old.some(message=>String(message.id)===String(receipt.id))?old:mergeMessages(old,[{id:receipt.id,role:receipt.role,body,internal:receipt.role==='staff'&&internal,created_at:new Date().toISOString(),client_key:key,attachments:files,author_name:me?.user?.name}]));
      // Delivery is already acknowledged. Reuse the single transcript reader;
      // slow or failed reads must not restore a sent draft or block the composer.
      revision.current++;wakeTranscript.current();
      void refreshList().catch(()=>{});
      return true;
    } catch (e) {
      if(valid()||liveDelivery()&&sameContinuity(epoch,owner))setError((e as Error).message);return false;
    } finally {
      if(delivery!==undefined)deliveries.current.end(delivery);
      if(operations.current.end(operation)&&current()){setBusy(false);setSendingBody("");}
    }
  };
  useEffect(()=>{
    if(staff||!visible||!current()||!loaded||initializationFailed||reauthorizing||busy||uploading||operations.current.busy()||selected||!homepageSubmit.current||text!==homepageSubmit.current)return;
    homepageSubmit.current='';
    try{sessionStorage.removeItem('lvd-question-submit');}catch{}
    void send();
  },[staff,visible,loaded,initializationFailed,reauthorizing,busy,uploading,selected,text]);
  async function attachFiles(files:File[]){
    if(!visible||!current()||reauthorizing||uploading||busy||!loaded)return;
    if(!files.length)return;
    try{validateAttachmentBatch(files,attachments.length);}catch(error){setError((error as Error).message);return;}
    const operation=operations.current.begin();if(!operation)return;
    const valid=()=>current()&&operations.current.isCurrent(operation);
    const request=new AbortController();uploadRequest.current=request;
    setUploading(true);setError('');
    try{
      let id=selected;
      if(!id){const c=await api<{id:string}>('conversations',{specialty:'general',consent:true,privacyNoticeVersion:'chat-v2',mode:'assistant'});if(!valid())return;id=c.id;rememberCreated(id);drafts.current.remove('');changeSelection(id);}
      for(const file of files){
        if(!valid())return;
        const value=await uploadChatAttachment(id,file,request.signal);
        if(!valid())return;
        setAttachments(previous=>[...previous,value]);
      }
    }catch(error){if(valid())setError((error as Error).message);}finally{if(uploadRequest.current===request)uploadRequest.current=null;if(operations.current.end(operation)&&current())setUploading(false);}
  }
  const staffAllowed =
    canEnterAdmin(me?.user);
  const startNew=()=>{if(!visible||!current()||reauthorizing||!loaded||selected!==selection.current||operations.current.busy())return false;if(!selected)return true;drafts.current.save(selected,{text,attachments});const draft=drafts.current.get('');changeSelection('');setConversation(null);setMessages([]);setAttachments(draft.attachments);setError('');setConnectionError('');setText(draft.text);setInternal(false);setPreferHuman(false);return true;};
  async function openAccount(destination:'/tai-khoan'|'/auth/google'='/tai-khoan'){
    if(staff||!visible||!current()||reauthorizing||!loaded||selected!==selection.current)return;
    const ticket=operations.current.begin();if(!ticket)return;
    const valid=()=>current()&&operations.current.isCurrent(ticket);
    setBusy(true);setError('');
    try{
      let id=selected;
      if(!id&&(text||attachments.length)){
        const created=await api<{id:string}>('conversations',{specialty:'general',consent:true,privacyNoticeVersion:'chat-v2',mode:'assistant'});
        if(!valid())return;id=created.id;rememberCreated(id);drafts.current.remove('');changeSelection(id);
      }
      if(!valid())return;
      if(id&&(text||attachments.length))saveDraftHandoff(sessionStorage,me?.user?.id||null,id,{text,attachments},Date.now(),outbox.current.pendingKey(id,{body:text.trim(),internal:false,fileIds:attachments.map(file=>file.id)}));
      // Persist first. A blocked storage write keeps the draft on screen.
      const href=destination+(id?'?conversation='+encodeURIComponent(id):'');
      if(destination==='/tai-khoan')router.push(href);else window.location.assign(href);
    }catch(e){if(valid())setError((e as Error).message||'Chưa giữ được bản nháp. Vui lòng thử lại.');}
    finally{if(operations.current.end(ticket)&&current())setBusy(false);}
  }
  const requestHuman=async()=>{if(selected)await act('handoff');else setPreferHuman(true);};
  // Mask private state during the render that observes a new session, before
  // effects have a chance to clear the previous workspace.
  function retry(){if(busy||uploading)return;if(session.status==='error'){void loadPublicSession().catch(()=>{});}else if(initializationFailed){setIntakeAttempt(value=>value+1);}else{wakeTranscript.current();}}
  const draftVisible=visible&&!reauthorizing&&!conversation?.restricted&&(!staff||Boolean(conversation));
  return {renameCustomerConversation:(id:string,title:string)=>manageCustomerConversation(id,'title',title),deleteCustomerConversation:(id:string,confirm:()=>boolean)=>manageCustomerConversation(id,'customer-delete',undefined,confirm),deleteConversation,openAccount,initializationFailed:session.status==='error'||visible&&initializationFailed,retry,attachments:draftVisible?attachments:[],uploading:visible&&uploading,attachFiles,removeAttachment:(id:string)=>{if(!reauthorizing&&!operations.current.busy())setAttachments(previous=>previous.filter(file=>file.id!==id));},me,rows:visible?rows:[],selected:visible?selected:'',setSelected:selectConversation,conversation:visible?conversation:null,messages:visible?messages:[],error:session.status==='error'?'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.':visible?error:'',setError,connectionError:visible?connectionError:'',text:draftVisible?text:'',setText,country:visible?country:'',setCountry,internal:visible&&internal,setInternal,busy:visible&&busy,loaded:visible&&loaded&&!initializationFailed&&!reauthorizing,notice,maxLength,log,shell,act,send,staffAllowed,startNew,requestHuman,preferHuman:visible&&preferHuman,sendingBody:visible?sendingBody:'',homepageSubmitting:visible&&Boolean(homepageSubmit.current||!selected&&busy&&sendingBody),pendingKey:visible?outbox.current.pendingKey(selected):undefined,sessionRevision:session.revision,sessionStatus:session.status};
}
export type WorkspaceState=ReturnType<typeof useWorkspace>;
