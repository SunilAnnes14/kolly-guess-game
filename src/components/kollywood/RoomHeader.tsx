import { CopyButton } from "@/components/kollywood/CopyButton";
import { inviteLink } from "@/lib/roomIdentity";
import { Clapperboard, LogOut } from "lucide-react";
import { useNavigate } from "react-router";

/** Sticky cinema header: brand on the left, room code + exit on the right. */
export function RoomHeader({ code }: { code: string }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 transition-transform hover:scale-[1.03] active:scale-95"
          title="Back to home"
        >
          <Clapperboard className="h-5 w-5 text-primary" />
          <span className="font-display hidden text-lg tracking-[0.2em] gold-text sm:inline">
            KOLLYWOOD
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 sm:gap-2 sm:px-3">
            <span className="hidden text-[10px] tracking-[0.2em] text-primary/70 uppercase sm:inline">
              Room
            </span>
            <span className="font-display text-sm tracking-[0.24em] text-primary sm:text-base sm:tracking-[0.3em]">
              {code}
            </span>
          </span>
          <CopyButton
            value={inviteLink(code)}
            label="INVITE"
            copiedLabel="COPIED"
            successMessage="Invite link copied 🎬"
            variant="ghost"
            size="sm"
            className="rounded-full border border-white/10 text-white/70"
          />
          <button
            type="button"
            onClick={() => navigate("/")}
            title="Leave room"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/55 transition-colors hover:border-destructive/50 hover:text-[#c08a6e]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
