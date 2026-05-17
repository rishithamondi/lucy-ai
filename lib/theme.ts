export const UI_TOKENS = {
  // Backgrounds
  background: {
    main: "bg-[#0a0a0a]", // globals.css --background
    panel: "bg-[#1e1e1e]", // globals.css --panel-bg
    card: "bg-[#252526]", // Toolbar, inner panels
    overlay: "bg-black/60 backdrop-blur-sm",
    input: "bg-[#2a2a2a]",
  },

  // Borders
  border: {
    primary: "border-[#2a2a2a]",
    secondary: "border-[#3a3a3a]",
    hover: "hover:border-[#4a4a4a]",
  },

  // Text
  text: {
    primary: "text-white",
    secondary: "text-neutral-300",
    muted: "text-neutral-500",
    accent: "text-emerald-400",
    error: "text-red-400",
  },

  // Buttons
  button: {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 transition-colors",
    secondary: "bg-[#2a2a2a] text-neutral-300 border border-[#3a3a3a] hover:bg-[#333333] hover:text-white transition-all",
    action: "bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 transition-colors",
    ghost: "text-neutral-500 hover:text-neutral-300 transition-colors",
  },

  // Accents (e.g., icons, spinners, indicators)
  accent: {
    emerald: "text-emerald-500",
    emeraldBg: "bg-emerald-500/20",
    emeraldBorder: "border-emerald-500/30",
    emeraldGlow: "shadow-[0_0_8px_rgba(16,185,129,0.8)]",
  }
};
