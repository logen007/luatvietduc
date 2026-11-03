"use client";
import {useEffect,useRef,useState} from "react";
import {api} from "../shared/client-api";
import {visiblePoll} from "../shared/polling";
export function useWorkspace(staff=false){
  const [me, setMe] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [conversation, setConversation] = useState<any>(null),
    [messages, setMessages] = useState<any[]>([]),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [text, setText] = useState(""),
    [country, setCountry] = useState(""),
    [internal, setInternal] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [notice, setNotice] = useState("");
  const [preferHuman,setPreferHuman]=useState(false),[sendingBody,setSendingBody]=useState("");
  const [maxLength, setMaxLength] = useState(2000);
  const stickToBottom=useRef(true);
  const pending = useRef<{
      key: string;
      body: string;
      internal: boolean;
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
    const v = await api(staff ? "queue" : "conversations");
    setRows(v);
    return v;
  };
  useEffect(() => {
    let active = true;
    const draft = staff ? null : sessionStorage.getItem("lvd-question");
    if (draft) setText(draft);
    (async () => {
      try {
        const user = await api("me");
        if (!active) return;
        setMe(user);
        const [s,list]=await Promise.all([api('settings'),api(staff?'queue':'conversations')]);
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
        if (active && !staff && !draft && list[0]) setSelected(list[0].id);
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
    stickToBottom.current=true;
    if (!selected) {
      setMessages([]);
      setConversation(null);
      setConnectionError("");
      return;
    }
    let active = true,
      cursor = 0;
    let latestUser=0,latestAnswered=0,recovering=false;
    const load = async () => {
      try {
        const v = await api(`conversations/${selected}?after=${cursor}`);
        if (!active) return;
        for(const message of v.messages){
          if(message.role==='user')latestUser=Math.max(latestUser,Number(message.id));
          if(message.role==='assistant'&&String(message.client_key).startsWith('assistant:'))latestAnswered=Math.max(latestAnswered,Number(String(message.client_key).slice(10))||0);
        }
        // Retry only an interrupted server generation; the server enforces ownership and idempotency.
        if(!staff&&v.conversation.aiEnabled&&latestUser>latestAnswered&&!recovering&&(!v.conversation.aiStartedAt||Date.now()-new Date(v.conversation.aiStartedAt).getTime()>35000)){
          recovering=true;void api(`conversations/${selected}/answer`,{messageId:String(latestUser)}).catch(()=>{}).finally(()=>{recovering=false;});
        }
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
          cursor = Number(v.messages.at(-1).id);
          setMessages((old) => {
            const ids = new Set(old.map((m) => m.id));
            return [...old, ...v.messages.filter((m: any) => !ids.has(m.id))];
          });
        }
        setConnectionError("");
      } catch (e) {
        if (active) setConnectionError((e as Error).message);
      }
    };
    setMessages([]);
    setConnectionError("");
    const stop=visiblePoll(load,2500);
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
    if (!staff || !me?.user) return;
    return visiblePoll(()=>refreshList(),5000,{initial:false});
  }, [staff, me]);
  const act = async (action: string) => {
    if (!conversation) return;
    setBusy(true);
    try {
      await api(`conversations/${selected}/transition`, {
        action,
        version: conversation.version,
      });
      setConversation((await api(`conversations/${selected}`)).conversation);
      await refreshList();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy || !loaded) return;
    setBusy(true);
    setSendingBody(text.trim());
    stickToBottom.current=true;
    setError("");
    try {
      let id = selected;
      if (!id) {
        if (!country) throw new Error("Chọn pháp luật Việt Nam hoặc Đức để chuyển đúng chuyên viên.");
        const c = await api("conversations", {
          jurisdiction: country,
          specialty: "general",
          consent:true,
          privacyNoticeVersion:"chat-v2",
          mode:preferHuman?"human":"assistant",
        });
        id = c.id;
        setSelected(id);
      }
      if (
        !pending.current ||
        pending.current.body !== text.trim() ||
        pending.current.internal !== internal
      )
        pending.current = {
          key: crypto.randomUUID(),
          body: text.trim(),
          internal,
        };
      await api(`conversations/${id}/messages`, pending.current);
      setText("");
      const latest=await api(`conversations/${id}`);
      setMessages(latest.messages);setConversation(latest.conversation);
      pending.current = null;
      await refreshList();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);setSendingBody("");
    }
  };
  const staffAllowed =
    me?.user && ["owner", "support", "operations"].includes(me.user.role);
  const startNew=()=>{setSelected("");setConversation(null);setMessages([]);setError("");setText("");setPreferHuman(false);};
  const requestHuman=async()=>{if(selected)await act('handoff');else setPreferHuman(true);};
  return {me,rows,selected,setSelected,conversation,messages,error,setError,connectionError,text,setText,country,setCountry,internal,setInternal,busy,loaded,notice,maxLength,log,shell,act,send,staffAllowed,startNew,requestHuman,preferHuman,sendingBody,pendingKey:pending.current?.key};
}
export type WorkspaceState=ReturnType<typeof useWorkspace>;
