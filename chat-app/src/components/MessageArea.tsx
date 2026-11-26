import { useEffect, useRef, useState } from "react";
import { supabase, getCurrentUid } from "../lib/supabase";
import { renderMarkdown, highlightMentions } from "../lib/markdown";
import { useCurrentUid } from "../hooks/useCurrentUid";
import { uploadFile, formatSize, isImage } from "../lib/storage";
import { EmojiPicker } from "./EmojiPicker";
import type { Message, Profile, Attachment } from "../lib/types";

interface Props {
  channelId: string | null;
  kind: "channel" | "conversation";
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

// Área principal de mensajes: lista + markdown + reacciones + adjuntos + typing.
export function MessageArea({ channelId, kind }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [reactions, setReactions] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const myId = useCurrentUid();

  useEffect(() => {
    if (!channelId) {
      setMessages([]); setProfiles({}); setReactions({}); setTypingUsers([]);
      return;
    }
    let mounted = true;
    const table = kind === "channel" ? "messages" : "conversation_messages";
    const filterCol = kind === "channel" ? "channel_id" : "conversation_id";

    const load = async () => {
      const { data } = await supabase.from(table).select("*").eq(filterCol, channelId).order("created_at", { ascending: true }).limit(100);
      if (!mounted) return;
      setMessages((data ?? []) as Message[]);
      const ids = Array.from(new Set((data ?? []).map((m: Message) => m.author_id)));
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      const prof: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => (prof[p.id] = p as Profile));
      setProfiles(prof);
    };
    load();

    const ch = supabase.channel(`msgs:${channelId}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `${filterCol}=eq.${channelId}` }, (payload) => {
      if (payload.eventType === "INSERT") {
        const m = payload.new as Message;
        setMessages((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]));
        if (!profiles[m.author_id]) {
          supabase.from("profiles").select("*").eq("id", m.author_id).then(({ data }) => {
            if (data) setProfiles((p) => ({ ...p, [m.author_id]: data[0] as Profile }));
          });
        }
      } else if (payload.eventType === "UPDATE") {
        const m = payload.new as Message;
        setMessages((s) => s.map((x) => (x.id === m.id ? m : x)));
      } else if (payload.eventType === "DELETE") {
        const id = (payload.old as { id: string }).id;
        setMessages((s) => s.filter((x) => x.id !== id));
      }
    }).subscribe();

    const rch = supabase.channel(`reacts:${channelId}`);
    rch.on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, (payload) => {
      const r = payload.new as { message_id: string; emoji: string; user_id: string };
      if (payload.eventType === "INSERT") {
        setReactions((s) => ({ ...s, [r.message_id]: [...(s[r.message_id] ?? []), r] }));
      } else if (payload.eventType === "DELETE") {
        setReactions((s) => ({ ...s, [r.message_id]: (s[r.message_id] ?? []).filter((x) => !(x.emoji === r.emoji && x.user_id === r.user_id)) }));
      }
    }).subscribe();

    // Typing indicator
    const tcol = kind === "channel" ? "channel_id" : "conversation_id";
    const ttable = kind === "channel" ? "typing" : "typing";
    const tfilter = kind === "channel" ? `channel_id=eq.${channelId}` : `conversation_id=eq.${channelId}`;
    const tch = supabase.channel(`typing:${channelId}`);
    tch.on("postgres_changes", { event: "INSERT", schema: "public", table: ttable, filter: tfilter }, (payload) => {
      const t = payload.new as { user_id: string; last_active: string };
      setTypingUsers((s) => Array.from(new Set([...s, t.user_id])).filter((id) => id !== myId));
      setTimeout(() => {
        setTypingUsers((s) => s.filter((id) => id !== t.user_id));
      }, 6000);
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: ttable, filter: tfilter }, (payload) => {
      const t = payload.old as { user_id: string };
      setTypingUsers((s) => s.filter((id) => id !== t.user_id));
    }).subscribe();

    return () => {
      mounted = false;
      ch.unsubscribe(); rch.unsubscribe(); tch.unsubscribe();
    };
  }, [channelId, kind, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendTyping = () => {
    if (!channelId) return;
    getCurrentUid().then((uid) => {
      if (!uid) return;
      const row: Record<string, string> = kind === "channel" ? { channel_id: channelId, user_id: uid } : { conversation_id: channelId, user_id: uid };
      supabase.from("typing").upsert(row, { onConflict: kind === "channel" ? "channel_id,user_id" : "conversation_id,user_id" });
    });
  };

  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !channelId) return;
    setUploading(true);
    const att = await uploadFile(file);
    setUploading(false);
    if (att) {
      const html = highlightMentions(renderMarkdown(""));
      if (kind === "channel") {
        await supabase.from("messages").insert({ channel_id: channelId, author_id: myId || "", content: "", content_html: html, attachments: [att] });
      } else {
        await supabase.from("conversation_messages").insert({ conversation_id: channelId, author_id: myId || "", content: "", content_html: html, attachments: [att] });
      }
    }
    e.target.value = "";
  };

  const send = async (text: string) => {
    if (!text.trim() || !channelId) return;
    const uid = await getCurrentUid();
    if (!uid) return;
    const html = highlightMentions(renderMarkdown(text));
    if (kind === "channel") {
      await supabase.from("messages").insert({ channel_id: channelId, author_id: uid, content: text, content_html: html, reply_to: replyTo?.id ?? null, attachments: [] });
    } else {
      await supabase.from("conversation_messages").insert({ conversation_id: channelId, author_id: uid, content: text, content_html: html, reply_to: replyTo?.id ?? null, attachments: [] });
    }
    setDraft(""); setReplyTo(null);
  };

  const edit = async (m: Message, text: string) => {
    if (!channelId) return;
    const html = highlightMentions(renderMarkdown(text));
    if (kind === "channel") await supabase.from("messages").update({ content: text, content_html: html, edited_at: new Date().toISOString() }).eq("id", m.id);
    else await supabase.from("conversation_messages").update({ content: text, content_html: html, edited_at: new Date().toISOString() }).eq("id", m.id);
    setEditing(null); setDraft("");
  };

  const del = async (m: Message) => {
    if (!channelId) return;
    if (kind === "channel") supabase.from("messages").delete().eq("id", m.id);
    else supabase.from("conversation_messages").delete().eq("id", m.id);
  };

  const toggleReact = async (m: Message, emoji: string) => {
    const uid = await getCurrentUid();
    if (!uid) return;
    const { data } = await supabase.from("reactions").select("*").eq("message_id", m.id).eq("emoji", emoji).eq("user_id", uid).maybeSingle();
    if (data) await supabase.from("reactions").delete().eq("message_id", m.id).eq("emoji", emoji).eq("user_id", uid);
    else await supabase.from("reactions").insert({ message_id: m.id, user_id: uid, emoji });
  };

  return (
    <div className="message-area">
      <div className="message-list">
        {messages.length === 0 && <div className="empty-state">No hay mensajes todavía. ¡Escribe el primero!</div>}
        {messages.map((m, i) => {
          const author = profiles[m.author_id];
          const isMe = m.author_id === myId;
          const prevSame = i > 0 && messages[i - 1].author_id === m.author_id && new Date(messages[i - 1].created_at).getTime() > Date.now() - 5 * 60000;
          return (
            <div key={m.id} className={`message ${prevSame ? "grouped" : ""}`}>
              {!prevSame && (
                <div className="message-avatar">
                  <img src={author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${author?.username || "?"}`} alt="" />
                </div>
              )}
              <div className="message-body">
                {!prevSame && (
                  <div className="message-head">
                    <span className="message-author">{author?.display_name || author?.username || "Usuario"}</span>
                    <span className="message-time">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                )}
                <div className="message-content" dangerouslySetInnerHTML={{ __html: m.content_html || highlightMentions(renderMarkdown(m.content)) }} />
                {m.attachments?.length > 0 && (
                  <div className="message-attachments">
                    {m.attachments.map((a: Attachment, j) => (
                      isImage(a.type) ? (
                        <a key={j} href={a.url} target="_blank" rel="noopener noreferrer"><img className="attachment-img" src={a.url} alt={a.name} /></a>
                      ) : (
                        <a key={j} className="attachment-file" href={a.url} target="_blank" rel="noopener noreferrer">📎 {a.name} <span className="attachment-size">({formatSize(a.size)})</span></a>
                      )
                    ))}
                  </div>
                )}
                {m.edited_at && <span className="message-edited">(editado)</span>}

                <div className="message-reactions">
                  {(reactions[m.id] ?? []).map((r, j) => (
                    <button key={j} className={`reaction ${r.user_id === myId ? "mine" : ""}`} onClick={() => toggleReact(m, r.emoji)}>{r.emoji}</button>
                  ))}
                  <div className="reaction-add">
                    {QUICK_REACTIONS.map((e) => <button key={e} className="reaction-quick" onClick={() => toggleReact(m, e)}>{e}</button>)}
                  </div>
                </div>
                <div className="message-actions">
                  <button onClick={() => setReplyTo(m)}>Responder</button>
                  <button onClick={() => { setEditing(m); setDraft(m.content); }} disabled={!isMe}>Editar</button>
                  <button onClick={() => del(m)} disabled={!isMe}>Borrar</button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="typing-bar">
          {typingUsers.length === 1 ? `${profiles[typingUsers[0]]?.display_name || profiles[typingUsers[0]]?.username || "Alguien"} está escribiendo…` :
            typingUsers.length === 2 ? "2 personas están escribiendo…" : "Varias personas están escribiendo…"}
        </div>
      )}

      {replyTo && (
        <div className="reply-bar">Respondiendo a <b>{replyTo.content.slice(0, 40)}</b><button onClick={() => setReplyTo(null)}>×</button></div>
      )}

      {editing && (
        <div className="edit-bar">
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button onClick={() => edit(editing, draft)}>Guardar</button>
          <button onClick={() => { setEditing(null); setDraft(""); }}>Cancelar</button>
        </div>
      )}

      <MessageInput
        onSend={send}
        onTyping={sendTyping}
        onPickFile={() => fileRef.current?.click()}
        uploading={uploading}
        emojiOpen={emojiOpen}
        setEmojiOpen={setEmojiOpen}
        onEmoji={(e) => { setDraft((d) => d + e); setEmojiOpen(false); }}
        value={draft}
        onChange={setDraft}
        placeholder={replyTo ? "Responder…" : "Escribe un mensaje… (markdown soportado)"}
      />
      <input ref={fileRef} type="file" hidden onChange={onFilePick} />
    </div>
  );
}

function MessageInput({ onSend, onTyping, onPickFile, uploading, emojiOpen, setEmojiOpen, onEmoji, value, onChange, placeholder }: {
  onSend: (t: string) => void;
  onTyping: () => void;
  onPickFile: () => void;
  uploading: boolean;
  emojiOpen: boolean;
  setEmojiOpen: (v: boolean) => void;
  onEmoji: (e: string) => void;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
}) {
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSend(value); };
  return (
    <div className="message-input-wrap">
      {emojiOpen && <EmojiPicker onPick={onEmoji} />}
      <form className="message-input" onSubmit={submit}>
        <button type="button" className="input-attach" title="Adjuntar archivo" onClick={onPickFile} disabled={uploading}>
          {uploading ? "🔄" : "📎"}
        </button>
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); onTyping(); }}
          placeholder={placeholder}
        />
        <button type="button" className="input-emoji" title="Emoji" onClick={() => setEmojiOpen(!emojiOpen)}>😊</button>
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
