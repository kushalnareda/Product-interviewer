import React, { useRef, useEffect } from 'react';
import { PenTool, Bold, Underline, List, ListOrdered } from 'lucide-react';

interface WhiteboardProps {
  value: string;
  onChange: (val: string) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ value, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content once
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      editorRef.current.innerHTML = value;
    }
  }, []); // Run only on mount to avoid cursor jumping

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isCmd = e.metaKey || e.ctrlKey; // Cmd on Mac, Ctrl on Windows

    // Bold: Cmd + B
    if (isCmd && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
    }

    // Underline: Cmd + U
    if (isCmd && e.key.toLowerCase() === 'u') {
      e.preventDefault();
      document.execCommand('underline', false);
    }

    // Bullet List: Cmd + Shift + 8
    if (isCmd && e.shiftKey && e.key === '8') {
      e.preventDefault();
      document.execCommand('insertUnorderedList', false);
    }

    // Numbered List: Cmd + Shift + 7
    if (isCmd && e.shiftKey && e.key === '7') {
      e.preventDefault();
      document.execCommand('insertOrderedList', false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header / Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
           <PenTool size={16} className="text-indigo-600" />
           <span>Whiteboard</span>
        </div>
        
        {/* Visual Toolbar */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-sm">
          <button 
            onClick={() => executeCommand('bold')} 
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            title="Bold (Cmd+B)"
          >
            <Bold size={14} />
          </button>
          <button 
            onClick={() => executeCommand('underline')} 
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            title="Underline (Cmd+U)"
          >
            <Underline size={14} />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => executeCommand('insertUnorderedList')} 
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            title="Bullet List (Cmd+Shift+8)"
          >
            <List size={14} />
          </button>
          <button 
            onClick={() => executeCommand('insertOrderedList')} 
            className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
            title="Numbered List (Cmd+Shift+7)"
          >
            <ListOrdered size={14} />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative cursor-text bg-white" onClick={() => editorRef.current?.focus()}>
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={`
            w-full h-full p-6 outline-none overflow-y-auto 
            text-black text-sm leading-relaxed font-sans
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
            [&_b]:font-bold
            [&_u]:underline
            empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300
          `}
          data-placeholder="# Type your framework here..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};
