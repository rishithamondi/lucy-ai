import React, { useEffect, useRef } from "react";

interface ConsoleTabContainerProps {
  children: React.ReactNode;
}

export default function ConsoleTabContainer({ children }: ConsoleTabContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset scroll position to top whenever content changes (like switching tabs)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [children]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b1c2c]">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words max-w-full"
      >
        {children}
      </div>
    </div>
  );
}
