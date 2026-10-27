export interface InboxMessage {
  id: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  date: string;
  preview: string;
  bodyHtml: string;
  isUnread: boolean;
  isStarred?: boolean;
}

// Global in-memory cache to guarantee persistence across route invocations in Next.js
const globalForInbox = globalThis as unknown as {
  inMemoryInbox?: InboxMessage[];
};

export const inMemoryInbox: InboxMessage[] =
  globalForInbox.inMemoryInbox ?? [];

if (process.env.NODE_ENV !== "production") {
  globalForInbox.inMemoryInbox = inMemoryInbox;
}

export function addInboxMessage(msg: InboxMessage) {
  const existingIdx = inMemoryInbox.findIndex((m) => m.id === msg.id);
  if (existingIdx >= 0) {
    inMemoryInbox[existingIdx] = { ...inMemoryInbox[existingIdx], ...msg };
  } else {
    inMemoryInbox.unshift(msg);
  }
}

export function removeInboxMessage(id: string) {
  const idx = inMemoryInbox.findIndex((m) => m.id === id);
  if (idx >= 0) {
    inMemoryInbox.splice(idx, 1);
  }
}

export function getInboxMessages(): InboxMessage[] {
  return [...inMemoryInbox];
}
