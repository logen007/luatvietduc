'use client';
import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {useField, useListDrawer} from '@payloadcms/ui';
import {EditorContent, useEditor, type Editor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import {Table, TableKit} from '@tiptap/extension-table';
import {Color, TextStyle} from '@tiptap/extension-text-style';
import type {TextareaFieldClientProps,Validate,FilterOptionsResult} from 'payload';

const MARKER = '<div data-lvd-richtext="1">';
const PUBLIC_MEDIA_FILTER:FilterOptionsResult = {media:{visibility: {equals: 'public'}}};
const ArticleTable = Table.extend({renderHTML: ({HTMLAttributes}) => ['table', HTMLAttributes, ['tbody', 0]]});
const escapeHTML = (text: string) => text.replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]!));
function editorHTML(value: string) {
  const rich = /^\s*<div\s+data-lvd-richtext=["']1["']\s*>([\s\S]*)<\/div>\s*$/.exec(value);
  if (rich) return rich[1];
  return value ? value.replace(/\r\n?/g, '\n').split(/\n{2,}/).map(part => '<p>' + escapeHTML(part).replace(/\n/g, '<br>') + '</p>').join('') : '<p></p>';
}
function storedHTML(editor: Editor) {
  // Tiptap checks descendant text for emptiness, so a newly inserted table
  // with blank cells is "empty" even though it is meaningful article content.
  let structural = false;
  if (editor.isEmpty) editor.state.doc.descendants(node => {
    if (['table', 'image', 'horizontalRule'].includes(node.type.name)) structural = true;
    return !structural;
  });
  return editor.isEmpty && !structural ? '' : MARKER + editor.getHTML() + '</div>';
}
function safeURL(input: string, media = false) {
  const value = input.trim();
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return '';
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const parsed = new URL(value);
    return !parsed.username && !parsed.password && (media ? parsed.protocol === 'https:' : ['https:', 'http:'].includes(parsed.protocol)) ? value : '';
  } catch { return ''; }
}
type IconName = 'link' | 'image' | 'table' | 'bullet' | 'number' | 'quote' | 'left' | 'center' | 'right' | 'undo' | 'redo' | 'close' | 'rule' | 'clear';
const icons: Record<IconName, React.ReactNode> = {
  link: <><path d="m10 13 4-4M8 15l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M12 5l1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m21 16-5-5L5 21"/></>,
  table: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
  bullet: <><path d="M9 5h12M9 12h12M9 19h12"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/></>,
  number: <><path d="M10 5h11M10 12h11M10 19h11M3 3h1v5M2 13c0-2 4-2 4 0 0 1-4 3-4 4h4M2 20h4"/></>,
  quote: <><path d="M10 6H4v6h6v6H5M21 6h-6v6h6v6h-5"/></>,
  left: <path d="M3 5h18M3 10h12M3 15h18M3 20h12"/>,
  center: <path d="M3 5h18M6 10h12M3 15h18M6 20h12"/>,
  right: <path d="M3 5h18M9 10h12M3 15h18M9 20h12"/>,
  undo: <path d="m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14"/>,
  redo: <path d="m16 4 5 5-5 5m5-5H10a7 7 0 0 0 0 14"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  rule: <path d="M4 12h16"/>,
  clear: <><path d="M4 5h13M10.5 5v14M18 15l5 5m0-5-5 5"/></>,
};
function Icon({name}: {name: IconName}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}
function Tool({label, active, disabled, children, onClick}: {label: string; active?: boolean; disabled?: boolean; children: React.ReactNode; onClick: () => void}) {
  return <button type="button" className="lvd-editor-tool" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={event => event.preventDefault()} onClick={onClick}>{children}</button>;
}

export function ArticleEditor({path, field, readOnly, validate}: TextareaFieldClientProps) {
  const limit = field.maxLength || 16000, required = Boolean(field.required), uid = useId();
  const fieldValidate = useCallback<Validate>((input, options) => {
    if (typeof input === 'string' && input.length > limit) return `Nội dung vượt giới hạn ${limit.toLocaleString('vi-VN')} ký tự.`;
    if (required && (!input || (/^\s*<div\s+data-lvd-richtext=["']1["']\s*>/.test(String(input)) && !String(input).replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160);/g, ' ').trim() && !/<(?:img|hr|table)\b/i.test(String(input))))) return 'Nhập nội dung bài viết.';
    return validate ? validate(input, {...options, ...field, type: 'textarea', required, maxLength: limit}) : true;
  }, [validate, field, required, limit]);
  const {value, setValue, disabled, errorMessage, showError} = useField<string>({path, validate: fieldValidate});
  const raw = typeof value === 'string' ? value : '', editable = !readOnly && !disabled;
  const latest = useRef({setValue, editable, raw}); latest.current = {setValue, editable, raw};
  const emitted = useRef<string | null>(null), sourceDirty = useRef(false), currentMode = useRef<'visual' | 'html'>('visual'), root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'visual' | 'html'>('visual'), [html, setHTML] = useState(''), [panel, setPanel] = useState<'link' | 'image' | 'table' | null>(null);
  const [url, setURL] = useState(''), [text, setText] = useState(''), [localError, setLocalError] = useState(''), [mediaBusy, setMediaBusy] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable,
    content: editorHTML(raw),
    extensions: [
      StarterKit.configure({heading: {levels: [2, 3, 4]}, link: {openOnClick: false, autolink: false, defaultProtocol: 'https', HTMLAttributes: {rel: 'noopener noreferrer', target: null}, isAllowedUri: href => Boolean(safeURL(href))}}),
      Image.configure({allowBase64: false}),
      TextAlign.configure({types: ['heading', 'paragraph']}),
      TableKit.configure({table: false}), ArticleTable.configure({resizable: false}), TextStyle, Color,
    ],
    editorProps: {attributes: {role: 'textbox', 'aria-label': 'Nội dung bài viết', 'aria-multiline': 'true', 'aria-required': String(required), 'data-placeholder': 'Viết nội dung bài viết…'}},
    onUpdate: ({editor: current}) => {
      if (!latest.current.editable) return;
      const next = storedHTML(current); emitted.current = next; latest.current.raw = next; latest.current.setValue(next);
    },
  });
  const [MediaDrawer, , {openDrawer, closeDrawer}] = useListDrawer({collectionSlugs: ['media'], selectedCollection: 'media', filterOptions: PUBLIC_MEDIA_FILTER});
  useEffect(() => {if (editor && editor.isEditable !== editable) editor.setEditable(editable, false);}, [editor, editable]);
  useEffect(() => {
    if (!editor || raw === emitted.current) return;
    const next = editorHTML(raw); editor.commands.setContent(next, {emitUpdate: false}); emitted.current = raw;
    setHTML(next); sourceDirty.current = false;
  }, [editor, raw]);
  useEffect(() => {
    if (!panel) return;
    const close = (event: KeyboardEvent) => {if (event.key === 'Escape') {setPanel(null); editor?.commands.focus();}};
    const outside = (event: PointerEvent) => {if (root.current && !root.current.contains(event.target as Node)) setPanel(null);};
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside);
    return () => {document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside);};
  }, [panel, editor]);
  const overLimit = raw.length > limit, error = overLimit ? `Nội dung vượt giới hạn ${limit.toLocaleString('vi-VN')} ký tự.` : showError ? errorMessage : '';
  useEffect(() => {if (editor) editor.setOptions({editorProps: {attributes: {...editor.options.editorProps.attributes, 'aria-invalid': String(Boolean(error)), 'aria-describedby': error ? uid + '-error' : ''}}});}, [editor, error, uid]);
  const unavailable = !editor || !editable || mode === 'html' || mediaBusy;
  function switchMode(next: 'visual' | 'html') {
    if (!editor || mode === next) return;
    setPanel(null); setLocalError('');
    if (next === 'html') {setHTML(editor.getHTML()); sourceDirty.current = false;}
    else if (sourceDirty.current && editable) {editor.commands.setContent(html, {emitUpdate: false}); const nextValue = storedHTML(editor); emitted.current = nextValue; setValue(nextValue); sourceDirty.current = false;}
    currentMode.current = next; setMode(next);
  }
  function openPanel(next: 'link' | 'image' | 'table') {
    if (unavailable || !editor) return;
    setLocalError(''); setPanel(panel === next ? null : next);
    setURL(next === 'link' ? String(editor.getAttributes('link').href || '') : '');
    setText(next === 'link' ? editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ') : '');
  }
  function insertLink() {
    if (!editor || !editable) return;
    const href = safeURL(url); if (!href) {setLocalError('Nhập đường dẫn hợp lệ.'); return;}
    if (editor.state.selection.empty && !editor.isActive('link')) editor.chain().focus().insertContent({type: 'text', text: text.trim() || href, marks: [{type: 'link', attrs: {href, rel: 'noopener noreferrer'}}]}).run();
    else editor.chain().focus().extendMarkRange('link').setLink({href}).run();
    setPanel(null);
  }
  function insertImage() {
    if (!editor || !editable) return;
    const src = safeURL(url, true);
    if (!src) {setLocalError('Nhập URL ảnh HTTPS hoặc chọn ảnh công khai từ thư viện.'); return;}
    const parsed = new URL(src, window.location.origin);
    if (parsed.origin === window.location.origin && !/^\/(assets|media)\//.test(parsed.pathname)) {setLocalError('Chọn tệp trên website từ Thư viện để kiểm tra quyền công khai.'); return;}
    editor.chain().focus().setImage({src, alt: text.trim()}).run(); setPanel(null);
  }
  async function selectMedia(doc: {id?: unknown}) {
    if (!editor || !latest.current.editable || currentMode.current !== 'visual' || mediaBusy || doc.id == null) return;
    const selectedDraft = latest.current.raw;
    setMediaBusy(true); setLocalError('');
    try {
      const response = await fetch('/api/media/' + encodeURIComponent(String(doc.id)) + '?depth=0', {cache: 'no-store', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('Chưa đọc được tệp. Thử lại.');
      const media = await response.json();
      if (media.visibility !== 'public') throw new Error('Tệp này chưa được công khai. Đổi phạm vi trong Thư viện trước khi chèn.');
      const href = safeURL(String(media.url || ''), true);
      if (!href) throw new Error('Tệp chưa có đường dẫn công khai hợp lệ.');
      if (editor.isDestroyed || !latest.current.editable) return;
      // A specialist can dismiss the drawer and keep typing while metadata is
      // loading. Never replace that newer draft with the older visual document.
      if (latest.current.raw !== selectedDraft) throw new Error('Nội dung đã thay đổi. Chọn lại tệp để chèn vào bản đang sửa.');
      if (currentMode.current !== 'visual') throw new Error('Chuyển về Trực quan rồi chọn lại tệp để chèn.');
      if (String(media.mimeType || '').startsWith('image/')) editor.chain().focus().setImage({src: href, alt: media.alt || '', title: media.title || undefined}).run();
      else editor.chain().focus().insertContent({type: 'text', text: media.title || media.filename || 'Tệp', marks: [{type: 'link', attrs: {href, rel: 'noopener noreferrer'}}]}).run();
      closeDrawer(); setPanel(null);
    } catch (failure) {setLocalError(failure instanceof Error ? failure.message : 'Chưa chèn được tệp.'); closeDrawer();}
    finally {setMediaBusy(false);}
  }
  const block = editor?.isActive('heading', {level: 2}) ? 'h2' : editor?.isActive('heading', {level: 3}) ? 'h3' : editor?.isActive('heading', {level: 4}) ? 'h4' : 'p';
  return <div ref={root} data-editor-loading={!editor||undefined} className={'field-type textarea lvd-article-editor' + (error ? ' has-error' : '')}>
    <input type="hidden" id="field-body" value={raw} readOnly aria-hidden="true" tabIndex={-1}/>
    <div className="lvd-editor-top"><div className="lvd-editor-modes" role="group" aria-label="Chế độ soạn thảo"><button type="button" aria-pressed={mode === 'visual'} onClick={() => switchMode('visual')}>Trực quan</button><button type="button" aria-pressed={mode === 'html'} onClick={() => switchMode('html')}>HTML</button></div><button type="button" className="lvd-editor-media" disabled={unavailable} onClick={() => {setLocalError(''); openDrawer();}}><Icon name="image"/>{mediaBusy ? 'Đang chèn…' : 'Thêm tệp'}</button></div>
    {mode === 'visual' && <>
      <div className="lvd-editor-toolbar" role="toolbar" aria-label="Định dạng nội dung">
        <div className="lvd-editor-group"><select aria-label="Kiểu văn bản" value={block} disabled={unavailable} onChange={event => {if (!editor) return; if (event.target.value === 'p') editor.chain().focus().setParagraph().run(); else editor.chain().focus().toggleHeading({level: Number(event.target.value.slice(1)) as 2 | 3 | 4}).run();}}><option value="p">Đoạn văn</option><option value="h2">Tiêu đề 2</option><option value="h3">Tiêu đề 3</option><option value="h4">Tiêu đề 4</option></select></div>
        <div className="lvd-editor-group"><Tool label="Đậm" active={editor?.isActive('bold')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleBold().run()}><b>B</b></Tool><Tool label="Nghiêng" active={editor?.isActive('italic')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleItalic().run()}><i>I</i></Tool><Tool label="Gạch chân" active={editor?.isActive('underline')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></Tool><Tool label="Gạch ngang" active={editor?.isActive('strike')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleStrike().run()}><s>S</s></Tool><select aria-label="Màu chữ" className="lvd-editor-color" value={editor?.getAttributes('textStyle').color || ''} disabled={unavailable} onChange={event => event.target.value ? editor?.chain().focus().setColor(event.target.value).run() : editor?.chain().focus().unsetColor().run()}><option value="">Màu chữ</option><option value="#888888">Xám</option><option value="#b7645b">Đỏ</option><option value="#587ca5">Xanh</option><option value="#9b8048">Vàng sẫm</option></select></div>
        <div className="lvd-editor-group"><Tool label="Danh sách" active={editor?.isActive('bulletList')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleBulletList().run()}><Icon name="bullet"/></Tool><Tool label="Danh sách đánh số" active={editor?.isActive('orderedList')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><Icon name="number"/></Tool><Tool label="Trích dẫn" active={editor?.isActive('blockquote')} disabled={unavailable} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Icon name="quote"/></Tool><Tool label="Đường phân cách" disabled={unavailable} onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Icon name="rule"/></Tool></div>
        <div className="lvd-editor-group">{(['left', 'center', 'right'] as const).map(alignment => <Tool key={alignment} label={alignment === 'left' ? 'Căn trái' : alignment === 'center' ? 'Căn giữa' : 'Căn phải'} active={editor?.isActive({textAlign: alignment})} disabled={unavailable} onClick={() => editor?.chain().focus().setTextAlign(alignment).run()}><Icon name={alignment}/></Tool>)}</div>
        <div className="lvd-editor-group"><Tool label="Liên kết" active={editor?.isActive('link')} disabled={unavailable} onClick={() => openPanel('link')}><Icon name="link"/></Tool><Tool label="Chèn ảnh từ URL" disabled={unavailable} onClick={() => openPanel('image')}><Icon name="image"/></Tool><Tool label="Bảng" active={editor?.isActive('table')} disabled={unavailable} onClick={() => openPanel('table')}><Icon name="table"/></Tool></div>
        <div className="lvd-editor-group"><Tool label="Hoàn tác" disabled={unavailable || !editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Icon name="undo"/></Tool><Tool label="Làm lại" disabled={unavailable || !editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Icon name="redo"/></Tool><Tool label="Xóa định dạng" disabled={unavailable} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}><Icon name="clear"/></Tool></div>
      </div>
      {panel && <div className="lvd-editor-panel" role="region" aria-label={panel === 'link' ? 'Liên kết' : panel === 'image' ? 'Chèn ảnh' : 'Chỉnh sửa bảng'}><div className="lvd-editor-panel-heading"><strong>{panel === 'link' ? 'Liên kết' : panel === 'image' ? 'Chèn ảnh' : 'Bảng'}</strong><Tool label="Đóng" onClick={() => setPanel(null)}><Icon name="close"/></Tool></div>
        {panel !== 'table' ? <div className="lvd-editor-url"><input autoFocus aria-label={panel === 'link' ? 'Đường dẫn liên kết' : 'URL ảnh'} placeholder={panel === 'link' ? 'https://…' : 'URL ảnh công khai (https://…)'} value={url} onChange={event => {setURL(event.target.value); setLocalError('');}} onKeyDown={event => {if (event.key === 'Enter') {event.preventDefault(); panel === 'link' ? insertLink() : insertImage();}}}/>{(panel === 'image' || editor?.state.selection.empty && !editor?.isActive('link')) && <input aria-label={panel === 'link' ? 'Nội dung liên kết' : 'Mô tả ảnh'} placeholder={panel === 'link' ? 'Nội dung liên kết' : 'Mô tả ảnh'} value={text} onChange={event => setText(event.target.value)}/>}<div className="lvd-editor-panel-actions"><button type="button" disabled={!editable || !url.trim()} onClick={panel === 'link' ? insertLink : insertImage}>Chèn</button>{panel === 'link' && editor?.isActive('link') && <button type="button" onClick={() => {editor.chain().focus().extendMarkRange('link').unsetLink().run(); setPanel(null);}}>Gỡ liên kết</button>}{panel === 'image' && <button type="button" onClick={openDrawer}>Thư viện</button>}</div></div> : <div className="lvd-editor-table-actions"><button type="button" disabled={!editable || editor?.isActive('table')} onClick={() => {editor?.chain().focus().insertTable({rows: 3, cols: 3, withHeaderRow: true}).run(); setPanel(null);}}>Chèn bảng 3 × 3</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().addRowBefore().run()}>Thêm hàng trên</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().addRowAfter().run()}>Thêm hàng dưới</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().deleteRow().run()}>Xóa hàng</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().addColumnBefore().run()}>Thêm cột trái</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().addColumnAfter().run()}>Thêm cột phải</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().deleteColumn().run()}>Xóa cột</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().toggleHeaderRow().run()}>Hàng tiêu đề</button><button type="button" disabled={!editable || !editor?.isActive('table')} onClick={() => editor?.chain().focus().toggleHeaderColumn().run()}>Cột tiêu đề</button><button type="button" disabled={!editable || !editor?.can().mergeCells()} onClick={() => editor?.chain().focus().mergeCells().run()}>Gộp ô</button><button type="button" disabled={!editable || !editor?.can().splitCell()} onClick={() => editor?.chain().focus().splitCell().run()}>Tách ô</button><button type="button" className="lvd-editor-danger" disabled={!editable || !editor?.isActive('table')} onClick={() => {editor?.chain().focus().deleteTable().run(); setPanel(null);}}>Xóa bảng</button></div>}
      </div>}
      <EditorContent editor={editor}/>
    </>}
    {mode === 'html' && <textarea className="lvd-editor-html" aria-label="Mã HTML nội dung bài viết" aria-required={required} aria-invalid={Boolean(error)} aria-describedby={error ? uid + '-error' : undefined} spellCheck={false} readOnly={!editable} value={html} placeholder="<p>Nội dung bài viết…</p>" onChange={event => {const next = event.target.value; setHTML(next); sourceDirty.current = true; const stored = next.trim() ? MARKER + next + '</div>' : ''; emitted.current = stored; latest.current.raw = stored; setValue(stored);}}/>}
    {localError && <div className="lvd-editor-notice" role="alert">{localError}</div>}
    {error && <div id={uid + '-error'} className="lvd-editor-error" role="alert">{error}</div>}
    <MediaDrawer allowCreate={true} filterOptions={PUBLIC_MEDIA_FILTER} onSelect={({doc}) => void selectMedia(doc)}/>
  </div>;
}
