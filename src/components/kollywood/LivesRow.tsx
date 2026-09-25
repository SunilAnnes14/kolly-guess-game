import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** K · O · L · L · Y · W · O · O · D — nine lives, one per letter. */
const LETTERS = ["K", "O", "L", "L", "Y", "W", "O", "O", "D"];

const SPARKS = [
  { x: -24, y: -30 },
  { x: 22, y: -34 },
  { x: -30, y: 12 },
  { x: 28, y: 22 },
  { x: -6, y: -42 },
  { x: 8, y: 36 },
];

const letterVariants = {
  alive: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
  dead: {
    opacity: 0,
    scale: 1.5,
    rotate: -9,
    filter: "blur(7px)",
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

const sparkVariants = {
  alive: { opacity: 0, x: 0, y: 0, scale: 0.3 },
  dead: (dir: { x: number; y: number }) => ({
    opacity: [0, 1, 0],
    x: [0, dir.x],
    y: [0, dir.y],
    scale: [0.3, 1, 0.15],
    transition: { duration: 0.65, ease: "easeOut" as const },
  }),
};

/**
 * The KOLLYWOOD life bar.
 *
 * `lives` starts at 9. When it drops, the letter that just died burns away —
 * scale, blur and a small ember burst — leaving a hollow film-strip ghost so
 * the wordmark keeps its shape. The row also shakes once per wrong guess.
 */
export function LivesRow({
  lives,
  className,
}: {
  lives: number;
  className?: string;
}) {
  const [shake, setShake] = useState(false);
  const previous = useRef(lives);

  useEffect(() => {
    if (lives < previous.current) {
      previous.current = lives;
      setShake(true);
      const timer = setTimeout(() => setShake(false), 520);
      return () => clearTimeout(timer);
    }
    previous.current = lives;
  }, [lives]);

  return (
    <div
      role="img"
      aria-label={`${lives} of 9 chances remaining`}
      className={cn(
        "mx-auto grid w-full max-w-[520px] grid-cols-9 gap-1.5 sm:gap-2.5",
        shake && "animate-shake",
        className,
      )}
    >
      {LETTERS.map((letter, index) => {
        const alive = index < lives;
        return (
          <div
            key={`${index}-${letter}`}
            className="relative grid h-12 place-items-center sm:h-16"
          >
            {/* Burnt-out ghost slot */}
            <span
              aria-hidden
              className="font-display text-3xl leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.16)] sm:text-4xl"
            >
              {letter}
            </span>

            {/* Ember sparks */}
            {SPARKS.map((dir, sparkIndex) => (
              <motion.span
                key={sparkIndex}
                custom={dir}
                variants={sparkVariants}
                initial={false}
                animate={alive ? "alive" : "dead"}
                className="pointer-events-none absolute h-1.5 w-1.5 rounded-[2px]"
                style={{
                  backgroundColor: sparkIndex % 2 === 0 ? "#f5c542" : "#ff5a2c",
                  boxShadow:
                    sparkIndex % 2 === 0
                      ? "0 0 8px rgba(245,197,66,0.8)"
                      : "0 0 8px rgba(255,90,44,0.8)",
                }}
              />
            ))}

            {/* The letter itself */}
            <motion.span
              variants={letterVariants}
              initial={false}
              animate={alive ? "alive" : "dead"}
              className="font-display gold-text absolute text-3xl leading-none sm:text-4xl"
            >
              {letter}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}
