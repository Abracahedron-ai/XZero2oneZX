import { useState } from 'react';
import { X } from 'lucide-react';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  anchor?: { x: number; y: number };
  context?: any;
}

export default function ChatWindow({ isOpen, onClose, anchor, context }: ChatWindowProps) {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, input]);
      setInput('');
    }
  };

  return (
    <div
      className="fixed z-[90] w-96 h-96 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col"
      style={{
        left: anchor?.x || '50%',
        top: anchor?.y || '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-zinc-700">
        <h3 className="text-sm font-semibold text-zinc-100">Chat</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="text-sm text-zinc-300">
            {msg}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-zinc-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
