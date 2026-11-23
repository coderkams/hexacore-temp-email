import fs from "fs";
import path from "path";
import os from "os";

export interface InboxMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  date: string;
  rawDate?: string;
  preview: string;
  bodyHtml: string;
  isUnread: boolean;
  isStarred?: boolean;
}

interface PersistedInboxState {
  deletedIds: string[];
  readIds: string[];
  starredIds: string[];
}

const STATE_FILE_PATH = path.join(os.tmpdir(), "hexacore_inbox_state.json");

function loadPersistedState(): PersistedInboxState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
        readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
        starredIds: Array.isArray(parsed.starredIds) ? parsed.starredIds : [],
      };
    }
  } catch {
    // ignore file read errors
  }
  return { deletedIds: [], readIds: [], starredIds: [] };
}

function savePersistedState(
  deletedIds: Set<string>,
  readIds: Set<string>,
  starredIds: Set<string>
) {
  try {
    const data: PersistedInboxState = {
      deletedIds: Array.from(deletedIds),
      readIds: Array.from(readIds),
      starredIds: Array.from(starredIds),
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data), "utf-8");
  } catch {
    // ignore file write errors
  }
}

// Global in-memory cache to guarantee persistence across route invocations in Next.js
const globalForInbox = globalThis as unknown as {
  inMemoryInbox?: InboxMessage[];
  deletedInboxIds?: Set<string>;
  readInboxIds?: Set<string>;
  starredInboxIds?: Set<string>;
};

const initialPersisted = loadPersistedState();

export const inMemoryInbox: InboxMessage[] =
  globalForInbox.inMemoryInbox ?? [];

export const deletedInboxIds: Set<string> =
  globalForInbox.deletedInboxIds ?? new Set<string>(initialPersisted.deletedIds);

export const readInboxIds: Set<string> =
  globalForInbox.readInboxIds ?? new Set<string>(initialPersisted.readIds);

export const starredInboxIds: Set<string> =
  globalForInbox.starredInboxIds ?? new Set<string>(initialPersisted.starredIds);

globalForInbox.inMemoryInbox = inMemoryInbox;
globalForInbox.deletedInboxIds = deletedInboxIds;
globalForInbox.readInboxIds = readInboxIds;
globalForInbox.starredInboxIds = starredInboxIds;

export function isInboxMessageDeleted(id: string): boolean {
  return deletedInboxIds.has(id);
}

export function getInboxMessageById(id: string): InboxMessage | undefined {
  return inMemoryInbox.find((m) => m.id === id);
}

export function addInboxMessage(msg: InboxMessage) {
  if (deletedInboxIds.has(msg.id)) return;

  // Apply persisted read/starred state
  const isUnread = readInboxIds.has(msg.id) ? false : msg.isUnread;
  const isStarred = starredInboxIds.has(msg.id) ? true : (msg.isStarred ?? false);

  const normalizedMsg: InboxMessage = {
    ...msg,
    isUnread,
    isStarred,
  };

  const existingIdx = inMemoryInbox.findIndex((m) => m.id === normalizedMsg.id);
  if (existingIdx >= 0) {
    inMemoryInbox[existingIdx] = {
      ...inMemoryInbox[existingIdx],
      ...normalizedMsg,
      isUnread: readInboxIds.has(normalizedMsg.id) ? false : normalizedMsg.isUnread,
      isStarred: starredInboxIds.has(normalizedMsg.id) ? true : normalizedMsg.isStarred,
    };
  } else {
    // Prevent duplicate entries for the same email arriving via both webhook and Brevo SMTP poll
    const duplicateIdx = inMemoryInbox.findIndex((m) => {
      if (m.subject !== normalizedMsg.subject) return false;
      const tA = m.rawDate ? new Date(m.rawDate).getTime() : 0;
      const tB = normalizedMsg.rawDate ? new Date(normalizedMsg.rawDate).getTime() : 0;
      if (tA && tB && Math.abs(tA - tB) < 90000) {
        return true;
      }
      return false;
    });

    if (duplicateIdx >= 0) {
      // Keep the richer entry (prefer the one with extracted lead name instead of generic "Hexacore")
      const existing = inMemoryInbox[duplicateIdx];
      if (existing.fromName === "Hexacore" && normalizedMsg.fromName !== "Hexacore") {
        inMemoryInbox[duplicateIdx] = {
          ...normalizedMsg,
          isUnread: existing.isUnread && normalizedMsg.isUnread,
          isStarred: existing.isStarred || normalizedMsg.isStarred,
        };
      }
    } else {
      inMemoryInbox.unshift(normalizedMsg);
    }
  }

  inMemoryInbox.sort((a, b) => {
    const tA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
    const tB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
    return tB - tA;
  });
}

export function updateInboxMessageState(
  id: string,
  updates: { isUnread?: boolean; isStarred?: boolean }
) {
  if (typeof updates.isUnread === "boolean") {
    if (updates.isUnread) {
      readInboxIds.delete(id);
    } else {
      readInboxIds.add(id);
    }
  }

  if (typeof updates.isStarred === "boolean") {
    if (updates.isStarred) {
      starredInboxIds.add(id);
    } else {
      starredInboxIds.delete(id);
    }
  }

  const existing = getInboxMessageById(id);
  if (existing) {
    if (typeof updates.isUnread === "boolean") existing.isUnread = updates.isUnread;
    if (typeof updates.isStarred === "boolean") existing.isStarred = updates.isStarred;
  }

  savePersistedState(deletedInboxIds, readInboxIds, starredInboxIds);
}

export function removeInboxMessage(id: string) {
  if (id === "all") {
    for (const msg of inMemoryInbox) {
      deletedInboxIds.add(msg.id);
    }
    inMemoryInbox.length = 0;
  } else {
    deletedInboxIds.add(id);
    const idx = inMemoryInbox.findIndex((m) => m.id === id);
    if (idx >= 0) {
      inMemoryInbox.splice(idx, 1);
    }
  }
  savePersistedState(deletedInboxIds, readInboxIds, starredInboxIds);
}

export function getInboxMessages(): InboxMessage[] {
  return inMemoryInbox.filter((m) => !deletedInboxIds.has(m.id));
}
