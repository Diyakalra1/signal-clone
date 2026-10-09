"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, websocketUrl } from "@/lib/api";

type Conversation = {
  id: number;
  type: string;
  name: string;
  avatar_url?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread?: number;
  peer_id?: number | null;
  last_message_sender_id?: number | null;
  last_message_status?: string | null;
};

type ChatMessage = {
  id: number;
  conversation_id?: number;
  sender_id: number;
  sender_name?: string;
  content: string;
  status?: string;
  receipts?: { user_id: number; status: string }[];
  created_at: string;
};

type Contact = { id: number; username: string; display_name: string; avatar_url?: string | null; last_seen?: string; role?: string; is_contact?: boolean };
type ChatUser = { id: number; username: string; display_name: string; avatar_url?: string | null };

function Icon({
  name,
  size = 21,
  filled = false,
}: {
  name: string;
  size?: number;
  filled?: boolean;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "chat":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 5 5" />
        </svg>
      );
    case "filter":
      return (
        <svg {...common}>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
      );
    case "tabs":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "more":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      );
    case "reply":
      return (
        <svg {...common}>
          <path d="m9 14-5-5 5-5" />
          <path d="M4 9h8a7 7 0 0 1 7 7v2" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 8.8c0 5-8.8 11-8.8 11S3.2 13.8 3.2 8.8a4.3 4.3 0 0 1 8.8-1 4.3 4.3 0 0 1 8.8 1Z" />
          <path d="M17 2v6M14 5h6" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.8 2.1Z" />
        </svg>
      );
    case "story":
      return (
        <svg {...common} fill={filled ? "currentColor" : "none"}>
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M3.5 6v12M20.5 6v12" />
        </svg>
      );
    case "chevron-right":
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case "users":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6" /></svg>;
    case "smile":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></svg>;
    case "video":
      return (
        <svg {...common}>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="m16 10 5-3v10l-5-3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="m19.4 15 .1.1 1.2 1-1.5 2.6-1.5-.6a8 8 0 0 1-1.8 1l-.3 1.6h-3l-.3-1.6a8 8 0 0 1-1.8-1l-1.5.6-1.5-2.6 1.2-1a7 7 0 0 1 0-2l-1.2-1 1.5-2.6 1.5.6a8 8 0 0 1 1.8-1l.3-1.6h3l.3 1.6a8 8 0 0 1 1.8 1l1.5-.6 1.5 2.6-1.2 1a7 7 0 0 1 0 2Z" />
          <circle cx="12" cy="12" r="3" fill="#1d1f22" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m4 12 5 5L20 6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

// SQLite stores timestamps as naive UTC values. Mark values without an offset
// as UTC so the browser can display the correct local time.
function parseApiDate(value?: string | null) {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(value?: string | null) {
  const date = parseApiDate(value);
  if (!date) return "";

  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (!sameDay) {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(value: string) {
  const date = parseApiDate(value);
  if (!date) return "Today";

  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year:
      date.getFullYear() === today.getFullYear()
        ? undefined
        : "numeric",
  });
}

function formatLastSeen(value?: string) {
  if (!value) return "last seen recently";
  const date = parseApiDate(value);
  if (!date) return "last seen recently";
  return `last seen ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tabsVisible, setTabsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<"chats" | "calls" | "stories">("chats");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState<number | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<number | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<number, string>>({});
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modal, setModal] = useState<"contact" | "group" | "members" | "settings" | "profile" | null>(null);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleResults, setPeopleResults] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [groupMembers, setGroupMembers] = useState<Contact[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [typingName, setTypingName] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversations from the authenticated backend.
  const loadConversations = useCallback(async () => {
    try {
      setLoadingChats(true);
      setError("");

      const data: Conversation[] = await apiFetch("/conversations/");
      setConversations(data);

      setSelectedId((current) => {
        if (current !== null && data.some((chat) => chat.id === current)) {
          return current;
        }

        return data.length ? data[0].id : null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load conversations"
      );
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((user: ChatUser) => {
        setCurrentUserId(user.id);
        setCurrentUser(user);
        setProfileName(user.display_name);
        setProfileAvatar(user.avatar_url || "");
      })
      .catch(() => { window.location.assign("/"); });
    apiFetch("/contacts/")
      .then((data: Contact[]) => setContacts(data))
      .catch(() => undefined);
  }, []);

  const selectedConversation = conversations.find(
    (chat) => chat.id === selectedId
  );
  const selectedPeer = selectedConversation?.peer_id
    ? contacts.find(contact => contact.id === selectedConversation.peer_id)
    : null;

  // Load history and open one WebSocket for the selected conversation.
  useEffect(() => {
    if (selectedId === null) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    let socket: WebSocket | null = null;

    async function loadMessages() {
      setLoadingMessages(true);
      setError("");

      try {
        const history: ChatMessage[] = await apiFetch(
          `/conversations/${selectedId}/messages`
        );

        if (!cancelled) {
          setMessages(history);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load messages"
          );
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    void loadMessages();

    socket = new WebSocket(websocketUrl(`/ws/${selectedId}`));
    socketRef.current = socket;

    socket.onopen = () => {
      if (!cancelled) {
        setSocketConnected(true);
        socket?.send(JSON.stringify({ type: "read" }));
        setConversations(current => current.map(chat => chat.id === selectedId ? { ...chat, unread: 0 } : chat));
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message") {
          const incoming: ChatMessage | undefined = payload.data;
          if (!incoming || typeof incoming.id !== "number" || incoming.conversation_id !== selectedId) return;
          if (!cancelled) {
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }

            return [...current, incoming];
          });

          setConversations((current) =>
            current
              .map((chat) =>
                chat.id === selectedId
                  ? {
                      ...chat,
                      last_message: incoming.content,
                      last_message_at: incoming.created_at,
                    }
                  : chat
              )
              .sort((a, b) => {
                const timeA = parseApiDate(a.last_message_at)?.getTime() ?? 0;
                const timeB = parseApiDate(b.last_message_at)?.getTime() ?? 0;
                return timeB - timeA;
              })
          );
          if (incoming.sender_id !== currentUserId) {
            socket?.send(JSON.stringify({ type: "read" }));
            setConversations(current => current.map(chat => chat.id === selectedId ? { ...chat, unread: 0 } : chat));
          }
          }
        } else if (payload.type === "typing" && payload.data?.conversation_id === selectedId) {
          const person = contacts.find(contact => contact.id === payload.data.user_id);
          setTypingName(payload.data.typing ? person?.display_name || "Someone" : "");
        } else if (payload.type === "presence") {
          const presence = payload.data as { user_id: number; online: boolean };
          setOnlineUsers(users => presence.online ? [...new Set([...users, presence.user_id])] : users.filter(id => id !== presence.user_id));
        } else if (payload.type === "receipt" && payload.data?.conversation_id === selectedId) {
          const receipt = payload.data as { message_id: number; user_id: number; status: string };
          setMessages(current => current.map(message => message.id === receipt.message_id ? {
            ...message,
            status: receipt.status === "read" ? "read" : "delivered",
            receipts: [...(message.receipts || []).filter(item => item.user_id !== receipt.user_id), { user_id: receipt.user_id, status: receipt.status }],
          } : message));
        } else if (payload.type === "read" && payload.data?.conversation_id === selectedId) {
          const read = payload.data as { message_ids: number[]; user_id: number };
          setMessages(current => current.map(message => read.message_ids.includes(message.id) ? {
            ...message,
            status: "read",
            receipts: [...(message.receipts || []).filter(item => item.user_id !== read.user_id), { user_id: read.user_id, status: "read" }],
          } : message));
        } else if (payload.type === "error") {
          setError(payload.message || "Message could not be sent.");
        } else if (payload.type === "removed_from_conversation" && payload.data?.conversation_id === selectedId) {
          setConversations(current => current.filter(chat => chat.id !== selectedId));
          setMessages([]);
          setSelectedId(null);
          setError("You were removed from this group.");
        }
      } catch {
        // Ignore malformed WebSocket events.
      }
    };

    socket.onclose = () => {
      if (!cancelled) setSocketConnected(false);
    };

    socket.onerror = () => {
      if (!cancelled) setSocketConnected(false);
    };

    return () => {
      cancelled = true;
      socket?.close();
      if (socketRef.current === socket) socketRef.current = null;
      setSocketConnected(false);
    };
  }, [selectedId, currentUserId, contacts]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages]);

  async function sendMessage() {
    const content = messageInput.trim();
    const socket = socketRef.current;

    if (!content || selectedId === null || sending) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError("Chat connection is unavailable. Reopen the conversation and try again.");
      return;
    }

    setSending(true);
    setError("");

    try {
      // The WebSocket backend saves the message and broadcasts it to members.
      // Do not also call the REST send endpoint: that would save it twice.
      socket.send(JSON.stringify({ type: "message", content }));
      setMessageInput("");
      inputRef.current?.focus();
    } catch {
      setError("Could not send the message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function updateTyping(value: string) {
    setMessageInput(value);
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "typing", typing: Boolean(value.trim()) }));
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (value.trim()) typingTimer.current = setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "typing", typing: false }));
      }, 1500);
    }
  }

  async function searchPeople(value: string) {
    setPeopleSearch(value);
    if (!value.trim()) { setPeopleResults([]); return; }
    try {
      const result: Contact[] = await apiFetch(`/contacts/search?q=${encodeURIComponent(value.trim())}`);
      setPeopleResults(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not search users"); }
  }

  async function startDirectChat(person: Contact) {
    try {
      await apiFetch("/contacts/", { method: "POST", body: JSON.stringify({ username: person.username }) });
      const chat: Conversation = await apiFetch("/conversations/direct", {
        method: "POST", body: JSON.stringify({ contact_id: person.id }),
      });
      await loadConversations();
      setSelectedId(chat.id);
      setContacts(await apiFetch("/contacts/"));
      setModal(null); setPeopleSearch(""); setPeopleResults([]); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open this conversation"); }
  }

  async function createGroup() {
    if (!groupName.trim()) { setError("Add a name for your group."); return; }
    if (groupMemberIds.length === 0) { setError("Choose at least one contact for your group."); return; }
    if (groupMemberIds.length === 0) { setError("Choose at least one contact for your group."); return; }
    try {
      const chat: Conversation = await apiFetch("/conversations/groups", {
        method: "POST", body: JSON.stringify({ name: groupName.trim(), member_ids: groupMemberIds }),
      });
      await loadConversations(); setSelectedId(chat.id); setModal(null); setGroupName(""); setGroupMemberIds([]); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create group"); }
  }

  async function openMembers() {
    if (!selectedId) return;
    try {
      setGroupMembers(await apiFetch(`/conversations/${selectedId}/members`));
      setModal("members");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load members"); }
  }

  async function changeMember(person: Contact, action: "add" | "remove") {
    if (!selectedId) return;
    try {
      if (action === "add") {
        await apiFetch(`/conversations/${selectedId}/members`, { method: "POST", body: JSON.stringify({ user_id: person.id }) });
      } else {
        await apiFetch(`/conversations/${selectedId}/members/${person.id}`, { method: "DELETE" });
      }
      setGroupMembers(await apiFetch(`/conversations/${selectedId}/members`));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update members"); }
  }

  async function saveProfile() {
    try {
      const user: ChatUser = await apiFetch("/auth/me", {
        method: "PATCH", body: JSON.stringify({ display_name: profileName, avatar_url: profileAvatar }),
      });
      setCurrentUser(user); setModal(null); setError("Profile saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save profile"); }
  }

  async function logout() {
    try { await apiFetch("/auth/logout", { method: "POST" }); } finally { window.location.assign("/"); }
  }

  function showComingSoon(feature: string) { setError(`${feature} is coming soon.`); }

  const filteredConversations = conversations.filter((chat) => {
    const term = search.toLowerCase();
    const matchesSearch = chat.name.toLowerCase().includes(term) || (chat.last_message || "").toLowerCase().includes(term);
    const matchesUnread = !unreadOnly || (chat.unread ?? 0) > 0;
    return matchesSearch && matchesUnread;
  });

  const groupedMessages = messages.reduce<
    { day: string; items: ChatMessage[] }[]
  >((groups, message) => {
    const day = formatDay(message.created_at);
    const last = groups[groups.length - 1];

    if (last && last.day === day) {
      last.items.push(message);
    } else {
      groups.push({ day, items: [message] });
    }

    return groups;
  }, []);

  return (
    <main className={`signal-shell ${selectedId !== null ? "show-conversation" : ""} flex h-dvh min-h-[500px] overflow-hidden bg-[#17232e] text-[#e2e8ed]`}>
      {/* Navigation rail */}
      <aside className={`signal-rail ${tabsVisible ? "" : "tabs-hidden"} flex w-[60px] shrink-0 flex-col items-center justify-between border-r border-[#34434e] bg-[#1b2833] py-4`}>
        <div className="signal-rail-top flex w-full flex-col items-center gap-4">
          <button
            className="signal-tabs-toggle"
            data-tooltip={tabsVisible ? "Hide Tabs" : "Show Tabs"}
            aria-label={tabsVisible ? "Hide tabs" : "Show tabs"}
            aria-expanded={tabsVisible}
            onClick={() => setTabsVisible((visible) => !visible)}
          >
            <Icon name="tabs" />
          </button>

          {tabsVisible && <div className="signal-tab-items flex flex-col items-center gap-4">
          <button onClick={() => setActiveTab("chats")} className={`signal-nav-tab ${activeTab === "chats" ? "active" : ""}`} data-tooltip="Chats" aria-label="Chats" aria-current={activeTab === "chats" ? "page" : undefined}>
            <Icon name="chat" filled={activeTab === "chats"} />
          </button>

          <button onClick={() => { setActiveTab("calls"); showComingSoon("Voice and video calls"); }} className={`signal-nav-tab ${activeTab === "calls" ? "active" : ""}`} data-tooltip="Calls" aria-label="Calls" aria-current={activeTab === "calls" ? "page" : undefined}>
            <Icon name="phone" filled={activeTab === "calls"} />
          </button>

          <button onClick={() => { setActiveTab("stories"); showComingSoon("Stories"); }} className={`signal-nav-tab ${activeTab === "stories" ? "active" : ""}`} data-tooltip="Stories" aria-label="Stories" aria-current={activeTab === "stories" ? "page" : undefined}>
            <Icon name="story" filled={activeTab === "stories"} />
          </button>
          </div>}
        </div>

        {tabsVisible && <button
          onClick={() => setModal("settings")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#aab7c0] hover:bg-white/5"
          title="Settings"
        >
          <Icon name="settings" />
        </button>}
      </aside>

      {/* Conversation list */}
      <section className="signal-sidebar flex w-[320px] max-w-[42vw] shrink-0 flex-col border-r border-[#34434e] bg-[#202c37]">
        <header className="signal-sidebar-header flex h-[68px] shrink-0 items-center justify-between px-5">
          <h1 className="text-[22px] font-semibold tracking-tight">Chats</h1>

          <div className="flex items-center gap-1">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
              title="New conversation"
              onClick={() => { setModal("contact"); setPeopleSearch(""); setPeopleResults([]); }}
            >
              <Icon name="plus" />
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
              title="More options"
              onClick={() => setModal("settings")}
            >
              <Icon name="more" />
            </button>
          </div>
        </header>

        <div className="signal-search-block px-3 pb-3">
          <div className="flex h-10 items-center gap-2 rounded-lg bg-[#354652] px-3">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={unreadOnly ? "Search unread chats" : "Search"}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#bdc7ce]"
              aria-label="Search conversations"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-sm text-[#bdc7ce]"
                title="Clear search"
              >
                Ã—
              </button>
            )}
          </div>

          <div className="signal-filter-row">
            <span>{unreadOnly ? "Filtered by unread" : ""}</span>
            <button
            onClick={() => setUnreadOnly((value) => !value)}
            aria-label={unreadOnly ? "Clear unread filter" : "Filter unread chats"}
            title={unreadOnly ? "Clear unread filter" : "Filter unread chats"}
            className={`mt-3 rounded-full border px-3 py-1.5 text-xs transition ${
              unreadOnly
                ? "border-[#0866d6] bg-[#0866d6]/20 text-white"
                : "border-[#52616b] text-[#bdc7ce] hover:bg-white/5"
            }`}
          >
              <Icon name="filter" size={17} />
            </button>
          </div>
        </div>

        <div className="signal-conversation-list min-h-0 flex-1 overflow-y-auto">
          {loadingChats ? (
            <p className="px-5 py-8 text-sm text-[#aab7c0]">Loading chatsâ€¦</p>
          ) : filteredConversations.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-[#bdc7ce]">
                {unreadOnly ? "No unread chats" : "No conversations found"}
              </p>
              {unreadOnly && (
                <button
                  onClick={() => setUnreadOnly(false)}
                  className="mt-3 text-sm text-[#6eafff]"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setSelectedId(chat.id);
                  setError("");
                }}
                className={`signal-conversation flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                  selectedId === chat.id ? "selected bg-[#354652]" : "hover:bg-white/[0.04]"
                }`}
              >
                <div className="relative h-[46px] w-[46px] shrink-0">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#40515e] text-lg font-medium text-white">
                    {chat.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={chat.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      chat.name?.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                  {chat.peer_id && onlineUsers.includes(chat.peer_id) && <span className="signal-online-dot" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[14px] font-medium">{chat.name}</span>
                    <span className="shrink-0 text-[11px] text-[#aab7c0]">
                      {formatTime(chat.last_message_at)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] text-[#aab7c0]">
                      {chat.last_message || "Start a conversation"}
                    </span>
                    {(chat.unread ?? 0) > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0866d6] px-1.5 text-[11px] text-white">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {/* Active chat */}
      <section className="signal-chat flex min-w-0 flex-1 flex-col bg-[#17232e]">
        {!selectedConversation ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#263541] text-[#bdc7ce]">
              <Icon name="chat" size={34} />
            </div>
            <h2 className="text-lg font-medium">Signal Desktop</h2>
            <p className="mt-2 max-w-sm text-sm text-[#aab7c0]">
              Select a conversation to start messaging.
            </p>
          </div>
        ) : (
          <>
            <header className="signal-chat-header flex h-[68px] shrink-0 items-center justify-between border-b border-[#34434e] bg-[#202c37] px-4 sm:px-6">
              <button type="button" className="mobile-back-button" onClick={() => setSelectedId(null)} aria-label="Back to chats"><span>‹</span></button>
              <button type="button" onClick={() => void openMembers()} className="flex min-w-0 items-center gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#40515e] font-medium">
                  {selectedConversation.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedConversation.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    selectedConversation.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {selectedConversation.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#aab7c0]">
                    {typingName ? `${typingName} is typing…` : selectedConversation.type === "group" ? "Group · view members" : selectedPeer && selectedConversation.peer_id && onlineUsers.includes(selectedConversation.peer_id) ? "Online" : selectedPeer ? formatLastSeen(selectedPeer.last_seen) : "Signal conversation"}
                  </p>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
                  title="Video call · Coming soon"
                  onClick={() => showComingSoon("Video calling")}
                >
                  <Icon name="video" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
                  title="Voice call · Coming soon"
                  onClick={() => showComingSoon("Voice calling")}
                >
                  <Icon name="phone" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
                  title="Search in conversation"
                  onClick={() => inputRef.current?.focus()}
                >
                  <Icon name="search" />
                </button>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
                  title="More options"
                  onClick={() => selectedConversation.type === "group" ? void openMembers() : setModal("settings")}
                >
                  <Icon name="more" />
                </button>
              </div>
            </header>

            <div className="signal-messages min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-12 lg:px-16">
              <div className="mx-auto flex max-w-[1080px] flex-col gap-4">
                <div className="signal-profile-card mb-2 flex flex-col items-center py-5 text-center">
                  <div className="mb-3 flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full bg-[#40515e] text-2xl">
                    {selectedConversation.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedConversation.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      selectedConversation.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="signal-profile-name-row"><h3>{selectedConversation.name}</h3><Icon name="chevron-right" size={20} /></div>
                  {selectedConversation.name.toLowerCase() === "note to self" ? (
                    <span className="signal-official-badge">✓ Official chat</span>
                  ) : (
                    <p className="signal-common-groups">
                      {selectedConversation.type === "group" ? "Group conversation" : <><Icon name="users" size={14} /> No groups in common</>}
                    </p>
                  )}
                </div>

                {loadingMessages ? (
                  <p className="py-6 text-center text-sm text-[#aab7c0]">
                    Loading messagesâ€¦
                  </p>
                ) : messages.length === 0 ? (
                  <div className="my-4 self-center rounded-full bg-[#263541] px-4 py-2 text-xs text-[#bdc7ce]">
                    This is the beginning of your conversation.
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.day} className="flex flex-col gap-3">
                      <div className="my-2 flex justify-center">
                        <span className="rounded-full bg-[#263541] px-3 py-1.5 text-[11px] text-[#bdc7ce]">
                          {group.day}
                        </span>
                      </div>

                      {group.items.map((message) => {
                        const isMine = currentUserId !== null && message.sender_id === currentUserId;
                        const readReceipt = message.receipts?.some(receipt => receipt.status === "read");
                        const deliveredReceipt = message.receipts?.some(receipt => receipt.status === "delivered" || receipt.status === "read");

                        return (
                          <div key={message.id} className={`signal-message-row ${isMine ? "mine" : "theirs"}`}>
                            <div className="signal-message-actions" aria-label="Message actions">
                              <div className="signal-message-action-wrap">
                                <button type="button" className="signal-message-action" title="More options" aria-label="More options" onClick={() => { setMessageMenuId(messageMenuId === message.id ? null : message.id); setReactionPickerId(null); }}><Icon name="more" size={18} /></button>
                                {messageMenuId === message.id && <div className="signal-message-menu"><button type="button" onClick={() => { void navigator.clipboard?.writeText(message.content); setMessageMenuId(null); }}>Copy message</button></div>}
                              </div>
                              <button type="button" className="signal-message-action" title="Reply" aria-label="Reply" onClick={() => { setMessageInput(`> ${message.content.split("\n").join("\n> ")}\n`); setMessageMenuId(null); setReactionPickerId(null); inputRef.current?.focus(); }}><Icon name="reply" size={19} /></button>
                              <div className="signal-message-action-wrap">
                                <button type="button" className="signal-message-action" title="Add reaction" aria-label="Add reaction" onClick={() => { setReactionPickerId(reactionPickerId === message.id ? null : message.id); setMessageMenuId(null); }}><Icon name="heart" size={19} /></button>
                                {reactionPickerId === message.id && <div className="signal-reaction-picker">{["❤️", "👍", "😂", "😮"].map(emoji => <button type="button" key={emoji} onClick={() => { setMessageReactions(current => ({ ...current, [message.id]: emoji })); setReactionPickerId(null); }}>{emoji}</button>)}</div>}
                              </div>
                            </div>
                            <div
                              className={`signal-bubble ${isMine ? "outgoing" : "incoming"} max-w-[85%] break-words px-3.5 py-2 ${
                                isMine
                                  ? "rounded-[16px] rounded-br-[4px] bg-[#0866d6] text-white"
                                  : "rounded-[16px] rounded-bl-[4px] bg-[#354652] text-[#e2e8ed]"
                              }`}
                            >
                              {selectedConversation.type === "group" && !isMine && (
                                <p className="mb-1 text-xs font-medium text-[#8ebeff]">
                                  {message.sender_name || "Member"}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap text-[13px] leading-[1.55]">
                                {message.content}
                              </p>
                              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-75">
                                <span>{formatTime(message.created_at)}</span>
                                {isMine && <span className={`signal-receipt ${readReceipt ? "read" : ""}`} title={readReceipt ? "Read" : deliveredReceipt ? "Delivered" : "Sent"}>{readReceipt || deliveredReceipt ? "✓✓" : "✓"}</span>}
                              </div>
                              {messageReactions[message.id] && <span className="signal-message-reaction">{messageReactions[message.id]}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
              className="signal-composer flex shrink-0 items-center gap-2 border-t border-[#34434e] bg-[#17232e] px-3 py-3 sm:px-5"
            >
              <div className="signal-emoji-wrap">
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
                  title="Choose emoji"
                  aria-label="Choose emoji"
                  aria-expanded={emojiPickerOpen}
                  onClick={() => setEmojiPickerOpen(open => !open)}
                >
                  <Icon name="smile" />
                </button>
                {emojiPickerOpen && <div className="signal-emoji-picker" role="group" aria-label="Choose an emoji">
                  {["😀", "😂", "🥰", "😊", "👍", "👎", "❤️", "🎉", "😮", "🙏", "🔥", "🤔"].map(emoji => <button type="button" key={emoji} aria-label={`Insert ${emoji}`} onClick={() => { updateTyping(`${messageInput}${emoji}`); setEmojiPickerOpen(false); inputRef.current?.focus(); }}>{emoji}</button>)}
                </div>}
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#bdc7ce] hover:bg-white/5"
                title="Add attachment"
                onClick={() => setError("Attachments are not connected yet.")}
              >
                <Icon name="plus" />
              </button>

              <input
                ref={inputRef}
                value={messageInput}
                onChange={(event) => updateTyping(event.target.value)}
                placeholder="Message"
                aria-label="Message"
                className="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-[#354652] px-4 text-sm outline-none placeholder:text-[#bdc7ce] focus:border-[#52616b]"
              />

              <button
                type="submit"
                disabled={!messageInput.trim() || sending || !socketConnected}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0866d6] text-white transition hover:bg-[#0759b8] disabled:cursor-not-allowed disabled:opacity-40"
                title="Send message"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3 20.5 21 12 3 3.5v6.7l11 1.8-11 1.8v6.7Z" />
                </svg>
              </button>
            </form>
          </>
        )}

        {error && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#52616b] bg-[#263541] px-4 py-2 text-xs text-[#e2e8ed]">
            <span>{error}</span>
            <button onClick={() => setError("")} className="shrink-0 text-[#bdc7ce]">
              Dismiss
            </button>
          </div>
        )}
      </section>

      {modal && (
        <div className="signal-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className="signal-modal" role="dialog" aria-modal="true" aria-label={modal === "contact" ? "New conversation" : modal === "group" ? "Create group" : modal === "members" ? "Group members" : modal === "profile" ? "Edit profile" : "Settings"}>
            <header className="signal-modal-header">
              <div><h2>{modal === "contact" ? "New message" : modal === "group" ? "New group" : modal === "members" ? selectedConversation?.name || "Members" : modal === "profile" ? "Your profile" : "Settings"}</h2><p>{modal === "contact" ? "Find people by username or phone number." : modal === "group" ? "Start a group conversation." : modal === "members" ? `${groupMembers.length} members` : modal === "profile" ? "Manage how others see you." : "Make Signal feel right for you."}</p></div>
              <button className="signal-modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>
            </header>

            {modal === "contact" && <div className="signal-modal-body">
              <div className="signal-modal-actions"><button onClick={() => setModal("group")}>＋ Create a group</button></div>
              <input className="signal-modal-input" value={peopleSearch} onChange={event => void searchPeople(event.target.value)} placeholder="Search username or phone" autoFocus />
              <div className="signal-result-list">{peopleResults.map(person => <div className="signal-person-row" key={person.id}><span className="signal-person-avatar">{person.display_name.charAt(0).toUpperCase()}</span><span className="signal-person-copy"><strong>{person.display_name}</strong><small>@{person.username}</small></span><button onClick={() => void startDirectChat(person)}>{person.is_contact ? "Open chat" : "Message"}</button></div>)}{peopleSearch && peopleResults.length === 0 && <p className="signal-empty-hint">No matching accounts yet.</p>}</div>
            </div>}

            {modal === "group" && <div className="signal-modal-body">
              <label className="signal-field-label">Group name<input className="signal-modal-input" value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="Weekend plans" autoFocus /></label>
              <p className="signal-section-label">Add people</p>
              <div className="signal-result-list">{contacts.map(person => <label className="signal-person-row" key={person.id}><span className="signal-person-avatar">{person.display_name.charAt(0).toUpperCase()}</span><span className="signal-person-copy"><strong>{person.display_name}</strong><small>@{person.username}</small></span><input type="checkbox" checked={groupMemberIds.includes(person.id)} onChange={event => setGroupMemberIds(ids => event.target.checked ? [...ids, person.id] : ids.filter(id => id !== person.id))} /></label>)}{contacts.length === 0 && <p className="signal-empty-hint">Add a contact first, then invite them here.</p>}</div>
              <button className="signal-primary-action" onClick={() => void createGroup()}>Create group</button>
            </div>}

            {modal === "members" && <div className="signal-modal-body">
              <p className="signal-section-label">Members</p>
              <div className="signal-result-list">{groupMembers.map(person => <div className="signal-person-row" key={person.id}><span className="signal-person-avatar">{person.display_name.charAt(0).toUpperCase()}</span><span className="signal-person-copy"><strong>{person.display_name}{person.id === currentUserId ? " (you)" : ""}</strong><small>@{person.username} · {person.role}</small></span>{groupMembers.find(member => member.id === currentUserId)?.role === "admin" && person.id !== currentUserId && selectedConversation?.type === "group" && <button className="signal-danger-action" onClick={() => void changeMember(person, "remove")}>Remove</button>}</div>)}</div>
              {selectedConversation?.type === "group" && groupMembers.find(member => member.id === currentUserId)?.role === "admin" && <><p className="signal-section-label">Add from contacts</p><div className="signal-result-list">{contacts.filter(person => !groupMembers.some(member => member.id === person.id)).map(person => <div className="signal-person-row" key={person.id}><span className="signal-person-avatar">{person.display_name.charAt(0).toUpperCase()}</span><span className="signal-person-copy"><strong>{person.display_name}</strong><small>@{person.username}</small></span><button onClick={() => void changeMember(person, "add")}>Add</button></div>)}</div></>}
            </div>}

            {modal === "profile" && <div className="signal-modal-body">
              <div className="signal-profile-edit"><span className="signal-person-avatar large">{profileAvatar ? <img src={profileAvatar} alt="Profile" /> : profileName.charAt(0).toUpperCase()}</span><label className="signal-secondary-action">Change photo<input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000) { setError("Choose an image under 1 MB."); return; } const reader = new FileReader(); reader.onload = () => setProfileAvatar(String(reader.result)); reader.readAsDataURL(file); }} /></label></div>
              <label className="signal-field-label">Display name<input className="signal-modal-input" value={profileName} onChange={event => setProfileName(event.target.value)} /></label>
              <button className="signal-primary-action" onClick={() => void saveProfile()}>Save profile</button>
            </div>}

            {modal === "settings" && <div className="signal-modal-body signal-settings-list">
              <button className="signal-profile-settings-link" onClick={() => setModal("profile")}>Edit profile <span>{profileName}</span></button>
              <div><strong>Privacy</strong><small>Read receipts and typing indicators are enabled for this demo.</small><span>Mocked end-to-end encryption · Coming soon</span></div>
              <div><strong>Notifications</strong><small>Message alerts are shown while the app is open.</small><span>Desktop notifications · Coming soon</span></div>
              <div><strong>Appearance</strong><small>Dark appearance</small><span>Light theme · Coming soon</span></div>
              <div><strong>Linked devices</strong><small>Connect another desktop or phone.</small><span>Coming soon</span></div>
              <div><strong>Stories</strong><small>Share a moment with your contacts.</small><span>Coming soon</span></div>
              <button className="signal-danger-action logout-action" onClick={() => void logout()}>Log out</button>
            </div>}
          </section>
        </div>
      )}
    </main>
  );
}
