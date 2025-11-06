import { useState, useEffect, useRef } from 'react';
import { X, Minus } from 'lucide-react';

interface FloatingWindowProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  initialSize?: { width: number; height: number };
  initialPosition?: { x: number; y: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
}

export default function FloatingWindow({
  title,
  children,
  isOpen,
  onClose,
  initialSize = { width: 400, height: 300 },
  initialPosition = { x: 100, y: 100 },
  minSize = { width: 200, height: 150 },
  maxSize = { width: 2000, height: 1500 },
}: FloatingWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (isResizing) {
        const newWidth = Math.min(maxSize.width, Math.max(minSize.width, resizeStart.width + (e.clientX - resizeStart.x)));
        const newHeight = Math.min(maxSize.height, Math.max(minSize.height, resizeStart.height + (e.clientY - resizeStart.y)));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, minSize, maxSize]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={windowRef}
      className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: 40,
      }}
    >
      <div
        className="flex items-center justify-between p-2 border-b border-zinc-700 cursor-move select-none"
        onMouseDown={handleDragStart}
      >
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-auto p-3">{children}</div>
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-zinc-800"
            onMouseDown={handleResizeStart}
          />
        </>
      )}
    </div>
  );
}

