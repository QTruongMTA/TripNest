const ACTIVE_SESSION_TTL_MS = 30 * 60 * 1000;

const activeSessions = new Map<string, number>();

function now() {
  return Date.now();
}

export const sessionService = {
  markActive(userId: string) {
    activeSessions.set(userId, now());
  },

  markInactive(userId: string) {
    activeSessions.delete(userId);
  },

  isActive(userId: string) {
    const lastSeenAt = activeSessions.get(userId);
    if (!lastSeenAt) return false;

    if (now() - lastSeenAt > ACTIVE_SESSION_TTL_MS) {
      activeSessions.delete(userId);
      return false;
    }

    return true;
  },

  getLastSeenAt(userId: string) {
    const lastSeenAt = activeSessions.get(userId);
    return lastSeenAt ? new Date(lastSeenAt) : null;
  },
};
