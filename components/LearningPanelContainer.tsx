import React, { useEffect, useRef } from "react";

interface LearningPanelContainerProps {
  children: React.ReactNode;
}

export default function LearningPanelContainer({ children }: LearningPanelContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset scroll position to top whenever content changes (like switching tabs)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [children]);

  return (
    <div className="w-full h-full bg-[#0b1c2c] border border-slate-700 rounded-xl p-5 text-slate-200 font-sans">
      <div 
        ref={containerRef}
        className="flex flex-col gap-6 overflow-y-auto h-full max-h-full break-words"
      >
        {children}
      </div>
    </div>
  );
}
