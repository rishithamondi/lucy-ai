"use client";

import { motion, Variants } from "framer-motion";

export type LucyState = "idle" | "greeting" | "thinking" | "excited" | "confused";

interface LucyAvatarProps {
  state: LucyState;
  className?: string;
}

const variants: Variants = {
  idle: {
    y: [0, -4, 0],
    rotate: [0, 2, -2, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  thinking: {
    rotate: [0, 8, -8, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  greeting: {
    scale: [0, 1.15, 1],
    rotate: [-15, 10, 0],
    transition: {
      duration: 0.6,
      type: "spring",
      bounce: 0.5,
    },
  },
  excited: {
    y: [0, -10, 0],
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.5,
      repeat: 3,
      ease: "easeInOut",
    },
  },
  confused: {
    x: [0, -8, 8, -8, 8, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

export default function LucyAvatar({ state, className = "" }: LucyAvatarProps) {
  return (
    <motion.div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      variants={variants}
      animate={state}
      initial="idle" // Provide a default initial state
    >
      <img
        src="/lucy.png"
        alt="Lucy AI Mentor"
        className="w-full h-full object-cover rounded-full"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.parentElement!.innerHTML = '<span style="font-size:inherit; line-height:1;">🌻</span>';
        }}
      />
    </motion.div>
  );
}
