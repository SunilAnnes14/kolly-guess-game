/**
 * Per-room player identity.
 *
 * A player's secret token lives in localStorage under the room code, so a
 * refresh (very common on phones) drops them back into the same seat, while
 * opening an invite link on a friend's device always shows the join form.
 */

export type RoomIdentity = {
  token: string;
  name: string;
};

const keyFor = (code: string) => `kollywood:player:${code.trim().toUpperCase()}`;

export function loadIdentity(code: string): RoomIdentity | null {
  try {
    const raw = localStorage.getItem(keyFor(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RoomIdentity>;
    if (!parsed?.token || !parsed?.name) return null;
    return { token: parsed.token, name: parsed.name };
  } catch {
    return null;
  }
}

export function saveIdentity(code: string, identity: RoomIdentity) {
  try {
    localStorage.setItem(keyFor(code), JSON.stringify(identity));
  } catch {
    // Storage can be unavailable in private webviews — gameplay still works
    // for the current session, the user just has to re-enter their name.
  }
}

export function clearIdentity(code: string) {
  try {
    localStorage.removeItem(keyFor(code));
  } catch {
    // ignore
  }
}

/** The shareable invite link for a room, e.g. https://site/room/ABX729 */
export function inviteLink(code: string): string {
  const base =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/room/${code.trim().toUpperCase()}`;
  return base;
}
