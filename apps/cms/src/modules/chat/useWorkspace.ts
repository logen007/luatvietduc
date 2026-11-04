"use client";
import {useEffect,useRef,useState} from "react";
import {api} from "../shared/client-api";
import {visiblePoll} from "../shared/polling";
import type {Me,Conversation,Message,Transcript,Attachment} from './contracts';
export function useWorkspace(staff=false,manageList=true){
  const [me, setMe] = useState<Me|null>(null),
    [rows, setRows] = useState<Conversation[]>([]),
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
    if(staff&&!manageList)return [];
    const v = await api<Conversation[]>(staff ? "queue" : "conversations");
    setRows(v);
    return v;
  };
  useEffect(() => {
    let active = true;
    const draft = staff ? null : sessionStorage.getItem("lvd-question");
    if (draft) setText(draft);
    (async () => {
      try {
        const user = await api<Me>("me");
        if (!active) return;
        setMe(user);
        const [s,list]=await Promise.all([api<import('../settings/view').PublicSettings>('settings'),staff&&!manageList?Promise.resolve([]):api<Conversation[]>(staff?'queue':'conversations')]);
        if (active) {
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
        if (!active) return;
        setRows(list);
        // A question from the homepage starts its own intake, even with saved history.
        if (staff){const requested=new URLSearchParams(window.location.search).get('conversation');if(requested&&/^[a-f0-9-]{36}$/i.test(requested))setSelected(requested);}
        else if(active&&!draft){const requested=new URLSearchParams(window.location.search).get('conversation');if(requested&&list.some(item=>item.id===requested))setSelected(requested);else if(list[0])setSelected(list[0].id);}
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) {
          setLoaded(true);
          if (draft && sessionStorage.getItem("lvd-question") === draft)
            sessionStorage.removeItem("lvd-question");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [staff]);
  useEffect(() => {
    stickToBottom.current=true;revision.current++;setConversation(null);
    if (!selected) {
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
        if (!active||ticket!==revision.current) return;
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
        if (active&&ticket===revision.current) {setConnectionError((e as Error).message);if(staff){setConversation(null);setMessages([]);cursor=0;}}
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
  }, [selected]);
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
    if (!staff || !manageList || !me?.user) return;
    return visiblePoll(()=>refreshList(),5000,{initial:false});
  }, [staff, me,manageList]);
  const act = async (action: string) => {
    if (!conversation) return;
    setBusy(true);revision.current++;
    try {
      await api(`conversations/${selected}/transition`, {
        action,
        version: conversation.version,
      });
      revision.current++;const latest=await api<Transcript>(`conversations/${selected}`);setConversation(latest.conversation);setMessages(old=>latest.conversation.restricted?[]:[...old,...latest.messages.filter(m=>!old.some(previous=>previous.id===m.id))].sort((a,b)=>Number(a.id)-Number(b.id)));
      await refreshList();
      setError("");return true;
    } catch (e) {
      setError((e as Error).message);return false;
    } finally {
      setBusy(false);
    }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim()&&!attachments.length) || busy || uploading || !loaded) return;
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
      setText("");setAttachments([]);
      revision.current++;const latest=await api<Transcript>(`conversations/${id}`);
      setMessages(old=>[...old,...latest.messages.filter(m=>!old.some(previous=>previous.id===m.id))].sort((a,b)=>Number(a.id)-Number(b.id)));setConversation(latest.conversation);
      pending.current = null;
      await refreshList();return true;
    } catch (e) {
      setError((e as Error).message);return false;
    } finally {
      setBusy(false);setSendingBody("");
    }
  };
  async function attachFiles(files:File[]){
    if(uploading||busy||!loaded)return;
    if(files.length+attachments.length>4){setError('Mỗi tin nhắn tối đa 4 tệp.');return;}
    setUploading(true);setError('');
    try{
      let id=selected;
      if(!id){const c=await api<{id:string}>('conversations',{specialty:'general',consent:true,privacyNoticeVersion:'chat-v2',mode:'assistant'});id=c.id;setSelected(id);}
      for(const file of files){
        if(file.size>10*1024*1024)throw new Error('Mỗi tệp tối đa 10 MB.');
        const response=await fetch(`/service/conversations/${id}/files`,{method:'POST',headers:{'content-type':'application/octet-stream','x-file-name':encodeURIComponent(file.name)},body:file});
        const value=await response.json();if(!response.ok)throw new Error(value.error||'Chưa tải được tệp.');
        setAttachments(previous=>[...previous,value]);
      }
    }catch(error){setError((error as Error).message);}finally{setUploading(false);}
  }
  useEffect(()=>{setAttachments([]);},[selected]);
  const staffAllowed =
    me?.user && ["owner", "support", "operations"].includes(me.user.role);
  const startNew=()=>{setSelected("");setConversation(null);setMessages([]);setError("");setText("");setPreferHuman(false);};
  const requestHuman=async()=>{if(selected)await act('handoff');else setPreferHuman(true);};
  return {attachments,uploading,attachFiles,removeAttachment:(id:string)=>setAttachments(previous=>previous.filter(file=>file.id!==id)),me,rows,selected,setSelected,conversation,messages,error,setError,connectionError,text,setText,country,setCountry,internal,setInternal,busy,loaded,notice,maxLength,log,shell,act,send,staffAllowed,startNew,requestHuman,preferHuman,sendingBody,pendingKey:pending.current?.key};
}
export type WorkspaceState=ReturnType<typeof useWorkspace>;
