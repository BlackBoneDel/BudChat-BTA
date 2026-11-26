import { useState } from "react";

// Selector de emoji lightweight (sin dependencias externas).
const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "😌", "😛"],
  },
  {
    name: "Gestos",
    emojis: ["👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤝", "🙏", "👏", "🙌", "👐", "🤲", "🤜", "🤛", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🦷", "👁️", "👅", "👄", "💋"],
  },
  {
    name: "Objetos",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💽", "💾", "💿", "📷", "📸", "📹", "🎥", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️"],
  },
  {
    name: "Naturaleza",
    emojis: ["🌸", "🌷", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🍀", "☘️", "🌱", "🌲", "🌳", "🌴", "🌵", "🌿", "🌾", "🍀", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🐺", "🐗"],
  },
  {
    name: "Varios",
    emojis: ["🔥", "✨", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⭐", "🌟", "💫", "✨", "⚡", "💥", "💢", "🚫", "✅", "❌", "✔️", "❌", "➕", "➖", "➗", "✖️", "💲", "💱", "💸", "💰", "💵", "💴", "💶", "💷", "🪙", "💳"],
  },
];

// Selector de emoji. onPick se llama con el emoji seleccionado.
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [cat, setCat] = useState(0);
  return (
    <div className="emoji-picker">
      <div className="emoji-cats">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={c.name} className={cat === i ? "active" : ""} onClick={() => setCat(i)} title={c.name}>
            {c.emojis[0]}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {EMOJI_CATEGORIES[cat].emojis.map((e, i) => (
          <button key={i} className="emoji-cell" onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
