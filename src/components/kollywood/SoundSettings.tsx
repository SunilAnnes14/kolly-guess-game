import {
  getSoundPreferences,
  previewSound,
  setSoundPreferences,
  subscribeSoundPreferences,
  type SoundPreferences,
} from "@/lib/sounds";
import { AnimatePresence, motion } from "framer-motion";
import {
  Film,
  Music2,
  Settings2,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useSyncExternalStore, useState, type ReactNode } from "react";

/** Live, SSR-safe read of the persisted sound preferences. */
function useSoundPreferences(): SoundPreferences {
  const snapshot = useSyncExternalStore(
    subscribeSoundPreferences,
    getSoundPreferences,
    getSoundPreferences,
  );
  return snapshot;
}

function BusToggle({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[11px] font-semibold tracking-[0.12em] uppercase transition-all " +
        (active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-white/12 bg-white/[0.03] text-white/40 hover:border-white/25 hover:text-white/70")
      }
    >
      {icon}
      {label}
      <span className={active ? "text-primary" : "text-white/25"}>
        {active ? "ON" : "OFF"}
      </span>
    </button>
  );
}

/**
 * 🎞 KOLLYWOOD sound desk.
 *
 * A single projector-style lever for SOUND ON/OFF, a volume slider, and
 * independent 🎵 Music / 🔊 Effects switches. Everything is written straight
 * to localStorage, so the choice holds between rounds and between visits.
 */
export function SoundSettings() {
  const prefs = useSoundPreferences();
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  const masterLabel = prefs.enabled
    ? "🔊 SOUND ON"
    : "🔇 SOUND OFF";

  return (
    <div className="pointer-events-none fixed right-3 bottom-3 z-50 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-deep pointer-events-auto w-[268px] rounded-2xl border border-white/12 px-4 py-4 shadow-[0_22px_60px_rgba(0,0,0,0.6)]"
          >
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.3em] text-white/45 uppercase">
              <Film className="h-3 w-3" /> Sound desk
            </p>

            {/* ---------- master ---------- */}
            <button
              type="button"
              onClick={() =>
                setSoundPreferences({ enabled: !prefs.enabled })
              }
              className={
                "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[12px] font-semibold tracking-[0.16em] uppercase transition-all " +
                (prefs.enabled
                  ? "border-primary/60 bg-primary/15 text-primary hover:bg-primary/25"
                  : "border-white/15 bg-white/[0.03] text-white/45 hover:border-white/30 hover:text-white/70")
              }
            >
              {prefs.enabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              {masterLabel}
            </button>

            {/* ---------- volume ---------- */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/50 uppercase">
                  <Volume1 className="h-3 w-3" /> Volume
                </span>
                <span className="font-display text-xs text-primary tabular-nums">
                  {Math.round(prefs.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(prefs.volume * 100)}
                disabled={!prefs.enabled}
                aria-label="Sound volume"
                onChange={(event) =>
                  setSoundPreferences({
                    volume: Number(event.target.value) / 100,
                  })
                }
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#747c5b] disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>

            {/* ---------- buses ---------- */}
            <div className="mt-4 flex gap-2">
              <BusToggle
                icon={<Music2 className="h-3.5 w-3.5" />}
                label="Music"
                active={prefs.music && prefs.enabled}
                onClick={() => setSoundPreferences({ music: !prefs.music })}
              />
              <BusToggle
                icon={<Volume2 className="h-3.5 w-3.5" />}
                label="Effects"
                active={prefs.effects && prefs.enabled}
                onClick={() => setSoundPreferences({ effects: !prefs.effects })}
              />
            </div>

            {/* ---------- preview ---------- */}
            <button
              type="button"
              disabled={!prefs.enabled}
              onClick={previewSound}
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#c0bba1]/40 bg-[#c0bba1]/10 text-[11px] font-semibold tracking-[0.18em] text-[#c0bba1] uppercase transition-all hover:bg-[#c0bba1]/20 disabled:opacity-40"
            >
              <Film className="h-3.5 w-3.5" /> Preview
            </button>

            <p className="mt-3 text-center text-[10px] leading-relaxed text-white/30">
              Projector clicks and camera clicks stay quiet so the game never
              startles you.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Sound settings"
        title="Sound settings"
        className="glass pointer-events-auto flex h-11 items-center gap-2 rounded-xl border border-white/12 px-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all hover:border-primary/45"
      >
        {open ? (
          <Settings2 className="h-4 w-4 text-primary" />
        ) : prefs.enabled ? (
          <Volume2 className="h-4 w-4 text-primary" />
        ) : (
          <VolumeX className="h-4 w-4 text-white/35" />
        )}
        <span className="text-[10px] font-semibold tracking-[0.2em] text-white/70 uppercase">
          {prefs.enabled ? "Sound" : "Muted"}
        </span>
        {prefs.enabled && (
          <span className="hidden text-[10px] text-white/40 tabular-nums sm:inline">
            {Math.round(prefs.volume * 100)}%
          </span>
        )}
      </button>
    </div>
  );
}
