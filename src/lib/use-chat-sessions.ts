import { useCallback, useSyncExternalStore } from 'react';
import type { ChatMessage } from '../types';

const STORAGE_KEY = 'edo-chat-sessions';
const CHANGE_EVENT = 'edo-chat-sessions-change';
const VERSION = 1;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 30;
const TITLE_MAX = 40;

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatSessionsStore {
  v: number;
  activeId: string | null;
  sessions: ChatSession[];
}

const emptyStore = (): ChatSessionsStore => ({
  v: VERSION,
  activeId: null,
  sessions: [],
});

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return '';
  const text = firstUser.content.trim().replace(/\s+/g, ' ');
  return text.length > TITLE_MAX
    ? `${text.slice(0, TITLE_MAX).trimEnd()}…`
    : text;
}

// Empty sessions are never persisted — a "new conversation" is represented by
// `activeId === null` (the prompt screen), and the real session is only created
// on the first message. Drop any empties, cap by age and count, sort recent-first.
function pruneStore(store: ChatSessionsStore): ChatSessionsStore {
  const now = Date.now();
  const sessions = store.sessions
    .filter((s) => s.messages.length > 0 && now - s.updatedAt <= MAX_AGE_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS);
  const activeId = sessions.some((s) => s.id === store.activeId)
    ? store.activeId
    : null;
  return { v: VERSION, activeId, sessions };
}

function readStore(): ChatSessionsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== VERSION || !Array.isArray(parsed.sessions)) {
      return emptyStore();
    }
    return pruneStore(parsed as ChatSessionsStore);
  } catch {
    return emptyStore();
  }
}

function writeStore(store: ChatSessionsStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

export interface UseChatSessions {
  sessions: ChatSession[];
  activeId: string | null;
  activeMessages: ChatMessage[];
  setActiveMessages: (messages: ChatMessage[]) => void;
  newSession: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

// Re-read on any write: same tab via CustomEvent, other tabs via `storage`,
// so the inline desktop card and the mobile FAB stay in sync.
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

// useSyncExternalStore calls getSnapshot on every render and only bails out when
// the reference is identical — readStore() allocates a new object every call, so
// returning it directly would loop forever. The raw string is the cache key:
// unchanged storage ⇒ same reference, changed storage ⇒ parse once.
let snapshotRaw: string | null | undefined;
let snapshotStore: ChatSessionsStore = emptyStore();

function getSnapshot(): ChatSessionsStore {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return snapshotStore;
  }
  if (raw === snapshotRaw) return snapshotStore;
  snapshotRaw = raw;
  snapshotStore = readStore();
  return snapshotStore;
}

// Les conversations vivent dans localStorage : côté serveur il n'y en a aucune.
// La référence doit être stable, useSyncExternalStore bouclant sur un nouvel
// objet à chaque rendu.
const SERVER_SNAPSHOT: ChatSessionsStore = emptyStore();
const getServerSnapshot = (): ChatSessionsStore => SERVER_SNAPSHOT;

export function useChatSessions(): UseChatSessions {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Persist then let the event listener pull the pruned store back into state —
  // single source of truth, no divergence between instances.
  const commit = useCallback((next: ChatSessionsStore) => writeStore(next), []);

  const setActiveMessages = useCallback(
    (messages: ChatMessage[]) => {
      if (messages.length === 0) return;
      const cur = readStore();
      const now = Date.now();
      let activeId = cur.activeId;
      let sessions = cur.sessions;
      if (sessions.some((s) => s.id === activeId)) {
        sessions = sessions.map((s) =>
          s.id === activeId
            ? {
                ...s,
                messages,
                updatedAt: now,
                title: s.title || deriveTitle(messages),
              }
            : s,
        );
      } else {
        activeId = uid();
        sessions = [
          {
            id: activeId,
            title: deriveTitle(messages),
            messages,
            createdAt: now,
            updatedAt: now,
          },
          ...sessions,
        ];
      }
      commit({ v: VERSION, activeId, sessions });
    },
    [commit],
  );

  // "New conversation" = drop back to the prompt (no active session); the real
  // session is materialised by setActiveMessages once the first message is sent.
  const newSession = useCallback(() => {
    commit({ ...readStore(), activeId: null });
  }, [commit]);

  const selectSession = useCallback(
    (id: string) => {
      const cur = readStore();
      if (!cur.sessions.some((s) => s.id === id)) return;
      commit({ ...cur, activeId: id });
    },
    [commit],
  );

  const deleteSession = useCallback(
    (id: string) => {
      const cur = readStore();
      const sessions = cur.sessions.filter((s) => s.id !== id);
      const activeId = cur.activeId === id ? null : cur.activeId;
      commit({ v: VERSION, activeId, sessions });
    },
    [commit],
  );

  const active = store.sessions.find((s) => s.id === store.activeId) ?? null;

  return {
    sessions: store.sessions,
    activeId: store.activeId,
    activeMessages: active?.messages ?? [],
    setActiveMessages,
    newSession,
    selectSession,
    deleteSession,
  };
}
