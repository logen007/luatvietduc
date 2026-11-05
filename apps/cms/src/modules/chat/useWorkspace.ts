"use client";
import {useEffect,useRef,useState} from "react";
import {api,ClientApiError} from "../shared/client-api";
import {canEnterAdmin} from '../identity/permissions';
import {visiblePoll} from "../shared/polling";
import {isPublicSessionCurrent,usePublicSession,loadPublicSession} from '../shared/session-client';
import {createMessageOutbox,createOperationGate,mergeMessages,rememberCreatedConversation,validateAttachmentBatch,type MessageReceipt} from './client-operations';
import type {Conversation,Message,Transcript,Attachment,TransitionReceipt} from './contracts';
import {initialChatQuestion} from './intake';
import {applyTransitionReceipt} from './transition-receipt';
import {createDraftBook,saveDraftHandoff,takeDraftHandoff} from './drafts';
export function useWorkspace(staff=false,manageList=true){
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
    [notice, setNotice] = useState("");
  const [preferHuman,setPreferHuman]=useState(false),[sendingBody,setSendingBody]=useState("");
  const [attachments,setAttachments]=useState<Attachment[]>([]),[uploading,setUploading]=useState(false);
  const [maxLength, setMaxLength] = useState(2000);
  const stickToBottom=useRef(true),revision=useRef(0),listRevision=useRef(0),wakeTranscript=useRef<(reset?:boolean)=>void>(()=>{});
  const mode=useRef(staff);mode.current=staff;
  const operations=useRef(createOperationGate()),selection=useRef('');
  const drafts=useRef(createDraftBook());
  const outbox=useRef(createMessageOutbox((id,draft)=>api<MessageReceipt>(`conversations/${id}/messages`,{...draft,...(!mode.current?{aiConsentVersion:'gemini-rag-v1'}:{})}))),
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
      element.dataset.compactViewport = String(height <= 620);
      element.dataset.shortViewport = String(height <= 420);
    };
    measure();
    window.addEventListener("resize", measure);
    viewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      viewport?.removeEventListener("resize", measure);
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
  function forgetDraft(id:string){drafts.current.remove(id);outbox.current.reset(id);if(staff)try{sessionStorage.removeItem(`lvd-staff-draft:${me?.user?.id}:${id}:reply`);}catch{}}
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
    revision.current++;
    operations.current.reset();outbox.current.reset();selection.current='';
    drafts.current.clear();
    setRows([]);setSelected('');setConversation(null);setMessages([]);
    setAttachments([]);setUploading(false);setBusy(false);setSendingBody('');
    setError('');setConnectionError('');setText('');setInternal(false);setCountry('');setPreferHuman(false);setLoaded(false);setInitializationFailed(false);
    setOwnerRevision(session.revision);
    if(session.status!=='ready')return;
    let active = true;
    const valid=()=>active&&current();
    let savedDraft:string|null=null;
    if(!staff)try{savedDraft=sessionStorage.getItem('lvd-question');}catch{}
    const draft = staff ? '' : initialChatQuestion(window.location.search,savedDraft);
    if (draft) setText(draft);
    (async () => {
      try {
        const [s,list]=await Promise.all([api<import('../settings/view').PublicSettings>('settings'),staff&&!manageList?Promise.resolve([]):api<Conversation[]>(staff?'queue':'conversations')]);
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
        if (staff){const requested=new URLSearchParams(window.location.search).get('conversation');if(requested&&/^[a-f0-9-]{36}$/i.test(requested))changeSelection(requested);}
        else if(!draft){
          const requested=new URLSearchParams(window.location.search).get('conversation');
          if(requested&&list.some(item=>item.id===requested)){
            changeSelection(requested);
            let restored;try{restored=takeDraftHandoff(sessionStorage,me?.user?.id||null,list.map(item=>item.id),requested);}catch{}
            if(restored){setText(restored.text.slice(0,s.maxMessageLength||2000));setAttachments(restored.attachments);}
          }else{try{takeDraftHandoff(sessionStorage,me?.user?.id||null,[],requested);}catch{}if(list[0])changeSelection(list[0].id);}
        }
        if(draft)try{if(sessionStorage.getItem('lvd-question')===draft)sessionStorage.removeItem('lvd-question');}catch{}
      } catch (e) {
        if (valid()){setError((e as Error).message);setInitializationFailed(true);}
      } finally {
        if (valid()) setLoaded(true);
      }
    })();
    return () => {
      active = false;
      operations.current.reset();outbox.current.reset();
      drafts.current.clear();
    };
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
    let latestUser=0,latestAnswered=0,recovering=false,waiting=false;
    const load = async () => {
      const ticket=revision.current;
      try {
        const v = await api<Transcript>(`conversations/${selected}?after=${cursor}`);
        if (!active||!current()||selection.current!==selected||ticket!==revision.current) return;
        for(const message of v.messages){
          if(message.role==='user')latestUser=Math.max(latestUser,Number(message.id));
          if(message.role==='assistant'&&String(message.client_key).startsWith('assistant:'))latestAnswered=Math.max(latestAnswered,Number(String(message.client_key).slice(10))||0);
        }
        // Retry only an interrupted server generation; the server enforces ownership and idempotency.
        if(!staff&&v.conversation.aiEnabled&&latestUser>latestAnswered&&!recovering&&(!v.conversation.aiStartedAt||Date.now()-new Date(v.conversation.aiStartedAt).getTime()>35000)){
          recovering=true;void api(`conversations/${selected}/answer`,{messageId:String(latestUser)}).catch(()=>{}).finally(()=>{recovering=false;});
        }
        if(v.conversation.restricted){forgetDraft(selected);setMessages([]);setText('');setAttachments([]);setInternal(false);cursor=0;}
        setConversation(v.conversation);
        setRows((current) =>
          current.map((row) =>
            row.id === v.conversation.id
              ? {
                  ...row,
                  title: v.conversation.title,
                  state: v.conversation.state,
                  version: v.conversation.version,
                }
              : row,
          ),
        );
        if (v.messages.length&&!v.conversation.restricted) {
          cursor = Number(v.messages[v.messages.length-1].id);
          setMessages(old=>mergeMessages(old,v.messages));
        }
        waiting=Boolean(v.conversation.aiEnabled&&latestUser>latestAnswered);
        setConnectionError("");
      } catch (e) {
        if (active&&current()&&ticket===revision.current) {setConnectionError((e as Error).message);if(e instanceof ClientApiError&&[401,403,404].includes(e.status)){forgetDraft(selected);setConversation(null);setMessages([]);setAttachments([]);setText('');cursor=0;}}
      }
    };
    setMessages([]);
    setConnectionError("");
    let idle=0;
    const stop=visiblePoll(async()=>{const before=cursor;await load();idle=cursor===before?idle+1:0;},()=>waiting?1500:idle>=4?10000:2500);
    wakeTranscript.current=(reset=false)=>{if(reset){cursor=0;latestUser=0;latestAnswered=0;}idle=0;stop.refresh();};
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
    if (!visible || !current() || !conversation || busy || uploading) return;
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
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visible || !current() || (!text.trim()&&!attachments.length) || busy || uploading || !loaded) return;
    const operation=operations.current.begin();if(!operation)return false;
    const valid=()=>current()&&operations.current.isCurrent(operation);
    const body=text.trim(),files=[...attachments];
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
      const {receipt,key}=await outbox.current.send(id,{body,internal,fileIds:files.map(file=>file.id)});
      if(!valid())return false;
      setText("");setAttachments([]);drafts.current.remove(id);
      setMessages(old=>receipt.duplicate&&old.some(message=>String(message.id)===String(receipt.id))?old:mergeMessages(old,[{id:receipt.id,role:receipt.role,body,internal:receipt.role==='staff'&&internal,created_at:new Date().toISOString(),client_key:key,attachments:files,author_name:me?.user?.name}]));
      // Delivery is already acknowledged. Reuse the single transcript reader;
      // slow or failed reads must not restore a sent draft or block the composer.
      revision.current++;wakeTranscript.current();
      void refreshList().catch(()=>{});
      return true;
    } catch (e) {
      if(valid())setError((e as Error).message);return false;
    } finally {
      if(operations.current.end(operation)&&current()){setBusy(false);setSendingBody("");}
    }
  };
  async function attachFiles(files:File[]){
    if(!visible||!current()||uploading||busy||!loaded)return;
    if(!files.length)return;
    try{validateAttachmentBatch(files,attachments.length);}catch(error){setError((error as Error).message);return;}
    const operation=operations.current.begin();if(!operation)return;
    const valid=()=>current()&&operations.current.isCurrent(operation);
    setUploading(true);setError('');
    try{
      let id=selected;
      if(!id){const c=await api<{id:string}>('conversations',{specialty:'general',consent:true,privacyNoticeVersion:'chat-v2',mode:'assistant'});if(!valid())return;id=c.id;rememberCreated(id);drafts.current.remove('');changeSelection(id);}
      for(const file of files){
        if(!valid())return;
        const response=await fetch(`/service/conversations/${id}/files`,{method:'POST',headers:{'content-type':'application/octet-stream','x-file-name':encodeURIComponent(file.name)},body:file});
        const value=await response.json();if(!response.ok)throw new Error(value.error||'Chưa tải được tệp.');
        if(!valid())return;
        setAttachments(previous=>[...previous,value]);
      }
    }catch(error){if(valid())setError((error as Error).message);}finally{if(operations.current.end(operation)&&current())setUploading(false);}
  }
  const staffAllowed =
    canEnterAdmin(me?.user);
  const startNew=()=>{if(!visible||!current()||!loaded||selected!==selection.current||operations.current.busy())return false;if(!selected)return true;drafts.current.save(selected,{text,attachments});const draft=drafts.current.get('');changeSelection('');setConversation(null);setMessages([]);setAttachments(draft.attachments);setError('');setConnectionError('');setText(draft.text);setInternal(false);setPreferHuman(false);return true;};
  async function openAccount(destination:'/tai-khoan'|'/auth/google'='/tai-khoan'){
    if(staff||!visible||!current()||!loaded||selected!==selection.current)return;
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
      if(id&&(text||attachments.length))saveDraftHandoff(sessionStorage,me?.user?.id||null,id,{text,attachments});
      // Persist first. A blocked storage write keeps the draft on screen.
      window.location.assign(destination+(id?'?conversation='+encodeURIComponent(id):''));
    }catch(e){if(valid())setError((e as Error).message||'Chưa giữ được bản nháp. Vui lòng thử lại.');}
    finally{if(operations.current.end(ticket)&&current())setBusy(false);}
  }
  const requestHuman=async()=>{if(selected)await act('handoff');else setPreferHuman(true);};
  // Mask private state during the render that observes a new session, before
  // effects have a chance to clear the previous workspace.
  function retry(){if(busy||uploading)return;if(session.status==='error'){void loadPublicSession().catch(()=>{});}else if(initializationFailed){setIntakeAttempt(value=>value+1);}else{wakeTranscript.current();}}
  const draftVisible=visible&&!conversation?.restricted&&(!staff||Boolean(conversation));
  return {openAccount,initializationFailed:session.status==='error'||visible&&initializationFailed,retry,attachments:draftVisible?attachments:[],uploading:visible&&uploading,attachFiles,removeAttachment:(id:string)=>{if(!operations.current.busy())setAttachments(previous=>previous.filter(file=>file.id!==id));},me,rows:visible?rows:[],selected:visible?selected:'',setSelected:selectConversation,conversation:visible?conversation:null,messages:visible?messages:[],error:session.status==='error'?'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.':visible?error:'',setError,connectionError:visible?connectionError:'',text:draftVisible?text:'',setText,country:visible?country:'',setCountry,internal:visible&&internal,setInternal,busy:visible&&busy,loaded:visible&&loaded&&!initializationFailed,notice,maxLength,log,shell,act,send,staffAllowed,startNew,requestHuman,preferHuman:visible&&preferHuman,sendingBody:visible?sendingBody:'',pendingKey:visible?outbox.current.pendingKey(selected):undefined,sessionRevision:session.revision,sessionStatus:session.status};
}
export type WorkspaceState=ReturnType<typeof useWorkspace>;
