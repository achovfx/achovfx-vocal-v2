'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Mic, Volume2, ShieldCheck, Check, Sparkles, Sliders } from 'lucide-react';
import { UserProfile } from '@/lib/types';
import { GlassCard } from './glass/GlassCard';

interface SettingsModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSaveProfile: (updated: Partial<UserProfile>) => void;
}

export function SettingsModal({
  isOpen,
  currentUser,
  onClose,
  onSaveProfile,
}: SettingsModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [color, setColor] = useState(currentUser.color);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(currentUser.micDeviceId || '');
  const [noiseSuppression, setNoiseSuppression] = useState(currentUser.noiseSuppression);
  const [echoCancellation, setEchoCancellation] = useState(currentUser.echoCancellation);

  // Mic test state
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testAudioLevel, setTestAudioLevel] = useState(0);
  const testStreamRef = useRef<MediaStream | null>(null);
  const testAudioCtxRef = useRef<AudioContext | null>(null);
  const testAnimFrameRef = useRef<number | null>(null);

  // Available vibrant colors for user avatars
  const avatarColors = [
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#14b8a6', // Teal
  ];

  const stopMicTest = () => {
    if (testAnimFrameRef.current) {
      cancelAnimationFrame(testAnimFrameRef.current);
      testAnimFrameRef.current = null;
    }
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach((t) => t.stop());
      testStreamRef.current = null;
    }
    if (testAudioCtxRef.current) {
      testAudioCtxRef.current.close().catch(() => {});
      testAudioCtxRef.current = null;
    }
    setTestAudioLevel(0);
    setIsTestingMic(false);
  };

  // Enumerate audio input devices
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const audioInputs = devices.filter((d) => d.kind === 'audioinput');
          setAudioDevices(audioInputs);
          if (audioInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(audioInputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, selectedDeviceId]);

  // Clean up mic test on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const startMicTest = async () => {
    try {
      stopMicTest();
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          echoCancellation,
          noiseSuppression,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      testStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      testAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setTestAudioLevel(normalized);

        testAnimFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      setIsTestingMic(true);
    } catch {
      alert('خطا در دسترسی به میکروفون. لطفاً دسترسی را در مرورگر تأیید کنید.');
    }
  };

  const handleSave = () => {
    stopMicTest();
    onSaveProfile({
      name: name.trim() || 'کاربر',
      color,
      micDeviceId: selectedDeviceId,
      noiseSuppression,
      echoCancellation,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <GlassCard
        id="settings-modal"
        variant="default"
        className="w-full max-w-lg p-6 border-cyan-500/20 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">تنظیمات صدا و پروفایل</h2>
          </div>
          <button
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 text-right">
          {/* Section 1: User Profile */}
          <div>
            <h3 className="text-xs font-semibold text-cyan-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              پروفایل کاربری
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">نام شما:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  className="w-full bg-white/5 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5">رنگ آواتار:</label>
                <div className="flex items-center gap-2">
                  {avatarColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        color === c ? 'scale-110 border-white ring-2 ring-cyan-400/50' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Audio Device & Input */}
          <div className="pt-3 border-t border-white/10">
            <h3 className="text-xs font-semibold text-cyan-300 mb-2 flex items-center gap-1.5">
              <Mic className="w-4 h-4" />
              میکروفون و ورودی صدا
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  انتخاب دستگاه میکروفون:
                </label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                >
                  {audioDevices.length > 0 ? (
                    audioDevices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `میکروفون شماره ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="">میکروفون پیش‌فرض سیستم</option>
                  )}
                </select>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noiseSuppression}
                    onChange={(e) => setNoiseSuppression(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span className="text-xs text-slate-200">حذف نویز محیطی</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={echoCancellation}
                    onChange={(e) => setEchoCancellation(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span className="text-xs text-slate-200">حذف پژواک (Echo)</span>
                </label>
              </div>

              {/* Test Microphone Box */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                    تست زنده میکروفون
                  </span>
                  <button
                    type="button"
                    onClick={isTestingMic ? stopMicTest : startMicTest}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isTestingMic
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                    }`}
                  >
                    {isTestingMic ? 'توقف تست' : 'شروع تست صدا'}
                  </button>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 transition-all duration-75"
                    style={{ width: `${testAudioLevel}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isTestingMic
                    ? 'صحبت کنید تا نوار سبز رنگ بالا برود.'
                    : 'روی «شروع تست صدا» کلیک کنید تا عملکرد میکروفون بررسی شود.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Architecture Info */}
          <div className="pt-3 border-t border-white/10">
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-slate-300 space-y-1">
              <p className="font-semibold text-cyan-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                معماری سرور و ویس‌چت رایگان (Vercel Ready)
              </p>
              <p className="text-slate-400 leading-relaxed">
                • چت متنی، رویدادها و اتاق‌ها مستقیماً بر روی سرور <b>Next.js</b> پردازش می‌شوند.
                <br />
                • ویس‌چت صوتی به صورت گروهی از طریق پروتکل <b>WebRTC PeerJS Mesh</b> با سرورهای رایگان STUN گوگل و به صورت جایگزین از طریق <b>Jitsi Cloud SFU</b> هدایت می‌شود تا مصرف دیتای سرور روی Vercel کاملاً صفر باشد.
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-5 mt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              stopMicTest();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 transition-colors"
          >
            بستن
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20"
          >
            ذخیره تنظیمات
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
