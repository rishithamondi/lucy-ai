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
    <div className="w-full h-full bg-[#161b22] border border-white/5 rounded-xl p-5 text-slate-200 font-sans relative overflow-hidden">
      <div 
        ref={containerRef}
        className="flex flex-col gap-6 overflow-y-auto h-full max-h-full break-words"
      >
        {children}
      </div>
    </div>
  );
}
