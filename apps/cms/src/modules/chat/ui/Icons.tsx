export function ChatIcon({name}:{name:'new'|'history'|'close'|'person'|'send'|'copy'|'check'|'spark'|'arrow'|'edit'|'trash'}){
 const paths={edit:'m16 3 5 5M4 20l4-1L21 6l-5-5L3 14l-1 6h2Z',trash:'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',new:'M12 5v14M5 12h14',history:'M9 4H4v16h16V4H9Zm0 0v16',close:'m6 6 12 12M6 18 18 6',person:'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm-4 14v-2a8 8 0 0 1 16 0v2',send:'M12 19V5M6 11l6-6 6 6',copy:'M8 8h12v12H8V8ZM4 16V4h12',check:'m5 12 4 4L19 6',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',arrow:'M6 18 18 6M6 6h12v12'};
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
