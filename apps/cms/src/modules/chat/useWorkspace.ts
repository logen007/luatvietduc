"use client";
import {useEffect,useRef,useState} from "react";
import {api} from "../shared/client-api";
import {visiblePoll} from "../shared/polling";
import {isPublicSessionCurrent,usePublicSession} from '../shared/session-client';
import type {Conversation,Message,Transcript,Attachment} from './contracts';
export function useWorkspace(staff=false,manageList=true){
  const session=usePublicSession(),me=session.status==='ready'?session.data:null;
  const [ownerRevision,setOwnerRevision]=useState(-1);
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
  const stickToBottom=useRef(true),revision=useRef(0);
  const pending = useRef<{
      key: string;
      body: string;
      internal: boolean;
      fileIds: string[];
    } | null>(null),
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
    const v = await api<Conversation[]>(staff ? "queue" : "conversations");
    if(current())setRows(v);
    return v;
  };
  useEffect(() => {
    revision.current++;
    pending.current=null;
    setRows([]);setSelected('');setConversation(null);setMessages([]);
    setAttachments([]);setUploading(false);setBusy(false);setSendingBody('');
    setError('');setConnectionError('');setText('');setInternal(false);setCountry('');setPreferHuman(false);setLoaded(false);
    setOwnerRevision(session.revision);
    if(session.status!=='ready')return;
    let active = true;
    const valid=()=>active&&current();
    const draft = staff ? null : sessionStorage.getItem("lvd-question");
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
        }
        if (!valid()) return;
        setRows(list);
        // A question from the homepage starts its own intake, even with saved history.
        if (staff){const requested=new URLSearchParams(window.location.search).get('conversation');if(requested&&/^[a-f0-9-]{36}$/i.test(requested))setSelected(requested);}
        else if(!draft){const requested=new URLSearchParams(window.location.search).get('conversation');if(requested&&list.some(item=>item.id===requested))setSelected(requested);else if(list[0])setSelected(list[0].id);}
        if(draft&&sessionStorage.getItem('lvd-question')===draft)sessionStorage.removeItem('lvd-question');
      } catch (e) {
        if (valid()) setError((e as Error).message);
      } finally {
        if (valid()) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [staff,manageList,session.revision,session.status]);
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
        if (!active||!current()||ticket!==revision.current) return;
        for(const message of v.messages){
          if(message.role==='user')latestUser=Math.max(latestUser,Number(message.id));
          if(message.role==='assistant'&&String(message.client_key).startsWith('assistant:'))latestAnswered=Math.max(latestAnswered,Number(String(message.client_key).slice(10))||0);
        }
        // Retry only an interrupted server generation; the server enforces ownership and idempotency.
        if(!staff&&v.conversation.aiEnabled&&latestUser>latestAnswered&&!recovering&&(!v.conversation.aiStartedAt||Date.now()-new Date(v.conversation.aiStartedAt).getTime()>35000)){
          recovering=true;void api(`conversations/${selected}/answer`,{messageId:String(latestUser)}).catch(()=>{}).finally(()=>{recovering=false;});
        }
        if(v.conversation.restricted){setMessages([]);cursor=0;}
        setConversation(v.conversation);
        setRows((current) =>
          current.map((row) =>
            row.id === v.conversation.id
              ? {
                  ...row,
                  state: v.conversation.state,
                  version: v.conversation.version,
                }
              : row,
          ),
        );
        if (v.messages.length) {
          cursor = Number(v.messages[v.messages.length-1].id);
          setMessages((old) => {
            const ids = new Set(old.map((m) => m.id));
            return [...old, ...v.messages.filter(m => !ids.has(m.id))];
          });
        }
        waiting=Boolean(v.conversation.aiEnabled&&latestUser>latestAnswered);
        setConnectionError("");
      } catch (e) {
        if (active&&current()&&ticket===revision.current) {setConnectionError((e as Error).message);if(staff){setConversation(null);setMessages([]);cursor=0;}}
      }
    };
    setMessages([]);
    setConnectionError("");
    let idle=0;
    const stop=visiblePoll(async()=>{const before=cursor;await load();idle=cursor===before?idle+1:0;},()=>waiting?1500:idle>=4?10000:2500);
    return () => {
      active = false;
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
    setBusy(true);revision.current++;
    try {
      await api(`conversations/${selected}/transition`, {
        action,
        version: conversation.version,
      });
      if(!current())return false;
      revision.current++;const latest=await api<Transcript>(`conversations/${selected}`);
      if(!current())return false;
      setConversation(latest.conversation);setMessages(old=>latest.conversation.restricted?[]:[...old,...latest.messages.filter(m=>!old.some(previous=>previous.id===m.id))].sort((a,b)=>Number(a.id)-Number(b.id)));
      await refreshList();
      if(!current())return false;
      setError("");return true;
    } catch (e) {
      if(current())setError((e as Error).message);return false;
    } finally {
      if(current())setBusy(false);
    }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visible || !current() || (!text.trim()&&!attachments.length) || busy || uploading || !loaded) return;
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
        if(!current())return false;
        id = c.id;
        setSelected(id);
      }
      if (
        !pending.current ||
        pending.current.body !== text.trim() ||
        pending.current.internal !== internal ||
        JSON.stringify(pending.current.fileIds)!==JSON.stringify(attachments.map(file=>file.id))
      )
        pending.current = {
          key: crypto.randomUUID(),
          body: text.trim(),
          internal,
          fileIds:attachments.map(file=>file.id),
        };
      await api(`conversations/${id}/messages`, {...pending.current,...(!staff?{aiConsentVersion:"gemini-rag-v1"}:{})});
      if(!current())return false;
      setText("");setAttachments([]);
      revision.current++;const latest=await api<Transcript>(`conversations/${id}`);
      if(!current())return false;
      setMessages(old=>[...old,...latest.messages.filter(m=>!old.some(previous=>previous.id===m.id))].sort((a,b)=>Number(a.id)-Number(b.id)));setConversation(latest.conversation);
      pending.current = null;
      await refreshList();return current();
    } catch (e) {
      if(current())setError((e as Error).message);return false;
    } finally {
      if(current()){setBusy(false);setSendingBody("");}
    }
  };
  async function attachFiles(files:File[]){
    if(!visible||!current()||uploading||busy||!loaded)return;
    if(files.length+attachments.length>4){setError('Mỗi tin nhắn tối đa 4 tệp.');return;}
    setUploading(true);setError('');
    try{
      let id=selected;
      if(!id){const c=await api<{id:string}>('conversations',{specialty:'general',consent:true,privacyNoticeVersion:'chat-v2',mode:'assistant'});if(!current())return;id=c.id;setSelected(id);}
      for(const file of files){
        if(!current())return;
        if(file.size>10*1024*1024)throw new Error('Mỗi tệp tối đa 10 MB.');
        const response=await fetch(`/service/conversations/${id}/files`,{method:'POST',headers:{'content-type':'application/octet-stream','x-file-name':encodeURIComponent(file.name)},body:file});
        const value=await response.json();if(!response.ok)throw new Error(value.error||'Chưa tải được tệp.');
        if(!current())return;
        setAttachments(previous=>[...previous,value]);
      }
    }catch(error){if(current())setError((error as Error).message);}finally{if(current())setUploading(false);}
  }
  useEffect(()=>{setAttachments([]);},[selected]);
  const staffAllowed =
    me?.user && ["owner", "support", "operations"].includes(me.user.role);
  const startNew=()=>{if(!visible||!current()||busy||uploading)return;pending.current=null;setSelected("");setConversation(null);setMessages([]);setError("");setText("");setPreferHuman(false);};
  const requestHuman=async()=>{if(selected)await act('handoff');else setPreferHuman(true);};
  // Mask private state during the render that observes a new session, before
  // effects have a chance to clear the previous workspace.
  return {attachments:visible?attachments:[],uploading:visible&&uploading,attachFiles,removeAttachment:(id:string)=>setAttachments(previous=>previous.filter(file=>file.id!==id)),me,rows:visible?rows:[],selected:visible?selected:'',setSelected,conversation:visible?conversation:null,messages:visible?messages:[],error:session.status==='error'?'Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.':visible?error:'',setError,connectionError:visible?connectionError:'',text:visible?text:'',setText,country:visible?country:'',setCountry,internal:visible&&internal,setInternal,busy:visible&&busy,loaded:visible&&loaded,notice,maxLength,log,shell,act,send,staffAllowed,startNew,requestHuman,preferHuman:visible&&preferHuman,sendingBody:visible?sendingBody:'',pendingKey:visible?pending.current?.key:undefined,sessionRevision:session.revision,sessionStatus:session.status};
}
export type WorkspaceState=ReturnType<typeof useWorkspace>;
