'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Smile,
  Sparkles,
  Hash,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Share2,
  Check,
  Settings,
} from 'lucide-react';
import { ChatMessage, UserProfile, VoiceParticipant, ConnectionQuality } from '@/lib/types';
import { playSound } from '@/lib/sounds';
import { ConnectionQualityIndicator } from '@/components/ConnectionQualityIndicator';

interface TextChatPanelProps {
  roomId: string;
  roomName: string;
  roomDescription?: string;
  currentUser: UserProfile;
  isConnectedToVoice: boolean;
  isConnectingVoice: boolean;
  voiceParticipants: VoiceParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
  localAudioLevel: number;
  connectionQuality?: ConnectionQuality;
  onConnectVoice: () => void;
  onDisconnectVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onOpenSettings?: () => void;
}

export function TextChatPanel({
  roomId,
  roomName,
  roomDescription,
  currentUser,
  isConnectedToVoice,
  isConnectingVoice,
  voiceParticipants,
  isMuted,
  isDeafened,
  localAudioLevel,
  connectionQuality,
  onConnectVoice,
  onDisconnectVoice,
  onToggleMute,
  onToggleDeafen,
  onOpenSettings,
}: TextChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);

  // Quick reaction emojis
  const quickEmojis = ['👍', '❤️', '🔥', '😂', '👏', '🎙️', '🎉', '🚀'];

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Fetch messages from Next.js server
  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const url = initial
        ? `/api/chat?roomId=${encodeURIComponent(roomId)}`
        : `/api/chat?roomId=${encodeURIComponent(roomId)}&since=${lastTimestampRef.current}`;

      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();

      if (initial) {
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
          if (data.messages.length > 0) {
            lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
          }
          setTimeout(() => scrollToBottom(false), 100);
        }
      } else {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
            if (newOnes.length > 0) {
              const hasExternal = newOnes.some((m: ChatMessage) => m.userId !== currentUser.id);
              if (hasExternal) {
                playSound('message');
              }
              return [...prev, ...newOnes];
            }
            return prev;
          });
          lastTimestampRef.current = data.messages[data.messages.length - 1].timestamp;
          setTimeout(() => scrollToBottom(true), 60);
        }
      }
    } catch {
      // Ignored
    }
  }, [roomId, currentUser.id, scrollToBottom]);

  // Initial room load
  useEffect(() => {
    isInitialLoadRef.current = true;
    lastTimestampRef.current = 0;
    fetchMessages(true);
  }, [roomId, fetchMessages]);

  // Polling for new messages every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 1500);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);

    // Optimistic local update
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      roomId,
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      avatarSeed: currentUser.avatarSeed,
      content: text,
      timestamp: Date.now(),
      type: 'text',
      reactions: {},
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setTimeout(() => scrollToBottom(true), 30);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color,
          avatarSeed: currentUser.avatarSeed,
          content: text,
          type: 'text',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMessage.id ? data.message : m))
          );
          lastTimestampRef.current = data.message.timestamp;
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsSending(false);
    }
  };

  // Handle emoji reaction to a message
  const handleReaction = async (messageId: string, emoji: string) => {
    // Local optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const users = currentReactions[emoji] || [];
        if (users.includes(currentUser.id)) {
          currentReactions[emoji] = users.filter((u) => u !== currentUser.id);
          if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = [...users, currentUser.id];
        }
        return { ...m, reactions: currentReactions };
      })
    );

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reaction',
          roomId,
          messageId,
          emoji,
          userId: currentUser.id,
        }),
      });
    } catch {
      // Ignored
    }
  };

  const copyInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatTime = (ts: number) => {
    return new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  };

  return (
    <main
      id="main-chat-view"
      className="flex-1 flex flex-col h-full bg-slate-950/40 backdrop-blur-2xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative"
    >
      {/* Top Header with Channel Info and Voice Status Bar */}
      <div className="p-3 sm:p-4 border-b border-white/5 bg-slate-950/30 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>{roomName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                  آنلاین
                </span>
              </h2>
              {roomDescription && (
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  {roomDescription}
                </p>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Quick Voice Join/Status Button */}
            {isConnectedToVoice ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium hidden sm:inline">متصل به ویس</span>
                {connectionQuality && (
                  <ConnectionQualityIndicator
                    quality={connectionQuality}
                    isConnected={isConnectedToVoice}
                    showPingText={true}
                  />
                )}
                <button
                  onClick={onToggleMute}
                  title={isMuted ? 'باز کردن میکروفون' : 'بستن میکروفون'}
                  className={`p-1 rounded-lg ml-1 transition-colors ${
                    isMuted ? 'bg-rose-500 text-white' : 'hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onToggleDeafen}
                  title={isDeafened ? 'فعال کردن صدا' : 'قطع صدا'}
                  className={`p-1 rounded-lg transition-colors ${
                    isDeafened ? 'bg-rose-500 text-white' : 'hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={onDisconnectVoice}
                  title="قطع اتصال از ویس"
                  className="p-1 rounded-lg hover:bg-rose-500 hover:text-white text-slate-400 transition-colors"
                >
                  <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            ) : (
              <button
                id="btn-join-voice-header"
                onClick={onConnectVoice}
                disabled={isConnectingVoice}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{isConnectingVoice ? 'در حال اتصال...' : 'ورود به ویس'}</span>
                {voiceParticipants.length > 0 && (
                  <span className="bg-black/30 px-1.5 py-0.2 rounded-full text-[10px]">
                    {voiceParticipants.length}
                  </span>
                )}
              </button>
            )}

            {/* Invite Button */}
            <button
              onClick={copyInvite}
              title="کپی لینک دعوت"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 hidden md:inline">کپی شد</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">دعوت</span>
                </>
              )}
            </button>

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="تنظیمات"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* If connected: show active voice speakers bar */}
        {isConnectedToVoice && voiceParticipants.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 overflow-x-auto text-xs py-1">
            <span className="text-[11px] text-slate-400 flex-shrink-0">
              اعضای حاضر در ویس:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {voiceParticipants.map((p) => {
                const isSpeaking =
                  p.isSpeaking || (p.id === currentUser.id && localAudioLevel > 12 && !isMuted && !isDeafened);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                      isSpeaking
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-sm shadow-emerald-500/20'
                        : 'bg-white/5 border-white/10 text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSpeaking ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                      }`}
                    />
                    <span className="truncate max-w-[100px]">{p.name}</span>
                    {p.isMuted && <MicOff className="w-2.5 h-2.5 text-red-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Messages Stream Scroll Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-3 py-12">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm text-slate-300">هنوز پیامی در این کانال ارسال نشده است</p>
            <p className="text-slate-500">اولین پیام را شما بنویسید یا ویس چنل را باز کنید!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            const isSystem = msg.type === 'system' || msg.type === 'voice-event';

            if (isSystem) {
              return (
                <div key={msg.id} className="w-full my-2">
                  <div className="max-w-md mx-auto bg-emerald-500/5 border border-emerald-500/15 p-2.5 rounded-2xl text-xs text-emerald-300 text-center">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
              >
                {/* Sender name & time */}
                <div className={`flex items-center gap-2 mb-1 px-1 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span
                    className="font-bold text-xs"
                    style={{ color: msg.userColor || '#818cf8' }}
                  >
                    {msg.userName}
                  </span>
                  <span className="text-[10px] text-slate-500">{formatTime(msg.timestamp)}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-indigo-600/30 border border-indigo-500/30 text-slate-100 rounded-tr-none text-right'
                      : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none text-right'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words font-sans text-sm">
                    {msg.content}
                  </p>

                  {/* Reaction chips */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-white/10">
                      {Object.entries(msg.reactions).map(([emoji, users]) => {
                        const hasMyReaction = users.includes(currentUser.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                              hasMyReaction
                                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="font-mono text-[10px]">{users.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Hover Floating Reaction Picker */}
                  <div
                    className={`absolute -bottom-3 ${
                      isMe ? 'right-2' : 'left-2'
                    } opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 border border-white/15 rounded-full px-2 py-0.5 shadow-xl z-10`}
                  >
                    {['👍', '❤️', '🔥', '😂'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="text-xs hover:scale-125 transition-transform p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Bar */}
      {showEmojiPicker && (
        <div className="px-4 py-2 bg-slate-950/90 border-t border-white/5 flex items-center gap-3 overflow-x-auto">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Box Form */}
      <div className="p-3 sm:p-4 border-t border-white/5 bg-slate-950/60">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-colors"
            title="ایموجی"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            id="input-chat-message"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`ارسال پیام در #${roomName}...`}
            maxLength={1000}
            className="flex-1 bg-slate-900/90 border border-white/10 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            title="ارسال پیام"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </main>
  );
}
