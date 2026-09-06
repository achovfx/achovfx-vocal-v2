'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'subtle' | 'default' | 'glow' | 'interactive';
  className?: string;
  glowColor?: string;
}

export function GlassCard({
  children,
  variant = 'default',
  className,
  glowColor,
  id,
  ...props
}: GlassCardProps) {
  const baseClasses =
    'relative backdrop-blur-2xl transition-all duration-300';

  const variants = {
    subtle:
      'bg-slate-950/40 backdrop-blur-3xl border border-white/5 shadow-lg shadow-black/20',
    default:
      'bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40',
    glow:
      'bg-white/5 backdrop-blur-2xl border border-indigo-500/40 shadow-[0_0_35px_rgba(99,102,241,0.25)]',
    interactive:
      'bg-white/5 hover:bg-white/10 backdrop-blur-2xl border border-white/10 hover:border-indigo-400/40 shadow-xl shadow-black/30 hover:shadow-indigo-500/10 cursor-pointer',
  };

  return (
    <div
      id={id}
      className={cn(baseClasses, variants[variant], className)}
      style={glowColor ? ({ '--custom-glow': glowColor } as React.CSSProperties) : undefined}
      {...props}
    >
      {/* Specular highlight on top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-2xl" />
      {children}
    </div>
  );
}
