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

// Global in-memory cache to guarantee persistence across route invocations in Next.js
const globalForInbox = globalThis as unknown as {
  inMemoryInbox?: InboxMessage[];
  deletedInboxIds?: Set<string>;
};

export const inMemoryInbox: InboxMessage[] =
  globalForInbox.inMemoryInbox ?? [];

export const deletedInboxIds: Set<string> =
  globalForInbox.deletedInboxIds ?? new Set<string>();

if (process.env.NODE_ENV !== "production") {
  globalForInbox.inMemoryInbox = inMemoryInbox;
  globalForInbox.deletedInboxIds = deletedInboxIds;
}

export function isInboxMessageDeleted(id: string): boolean {
  return deletedInboxIds.has(id);
}

export function getInboxMessageById(id: string): InboxMessage | undefined {
  return inMemoryInbox.find((m) => m.id === id);
}

export function addInboxMessage(msg: InboxMessage) {
  if (deletedInboxIds.has(msg.id)) return;
  const existingIdx = inMemoryInbox.findIndex((m) => m.id === msg.id);
  if (existingIdx >= 0) {
    inMemoryInbox[existingIdx] = { ...inMemoryInbox[existingIdx], ...msg };
  } else {
    inMemoryInbox.unshift(msg);
  }
  inMemoryInbox.sort((a, b) => {
    const tA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
    const tB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
    return tB - tA;
  });
}

export function removeInboxMessage(id: string) {
  deletedInboxIds.add(id);
  const idx = inMemoryInbox.findIndex((m) => m.id === id);
  if (idx >= 0) {
    inMemoryInbox.splice(idx, 1);
  }
}

export function getInboxMessages(): InboxMessage[] {
  return [...inMemoryInbox];
}
