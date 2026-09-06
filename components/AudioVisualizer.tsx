'use client';

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyserNode?: AnalyserNode | null;
  isActive: boolean;
  barCount?: number;
  height?: number;
  colorScheme?: 'cyan' | 'emerald' | 'violet' | 'multicolor' | 'indigo';
}

export function AudioVisualizer({
  analyserNode,
  isActive,
  barCount = 28,
  height = 48,
  colorScheme = 'indigo',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 64;
    let dataArray: Uint8Array = new Uint8Array(bufferLength);

    if (analyserNode) {
      bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      if (isActive && analyserNode) {
        analyserNode.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
      }

      const barWidth = (width / barCount) * 0.7;
      const gap = (width - barWidth * barCount) / (barCount + 1);

      phase += 0.05;

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (isActive && analyserNode) {
          const sampleIndex = Math.floor((i / barCount) * (dataArray.length * 0.5));
          value = dataArray[sampleIndex] / 255;
        } else if (isActive) {
          // Gentle idle pulse if active without analyzer
          value = 0.15 + Math.sin(phase + i * 0.3) * 0.1;
        } else {
          // Inactive flatline
          value = 0.04;
        }

        const barHeight = Math.max(4, value * h * 0.9);
        const x = gap + i * (barWidth + gap);
        const y = (h - barHeight) / 2;

        // Gradient based on colorScheme
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (colorScheme === 'emerald') {
          gradient.addColorStop(0, 'rgba(52, 211, 153, 0.9)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
        } else if (colorScheme === 'violet') {
          gradient.addColorStop(0, 'rgba(192, 132, 252, 0.9)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');
        } else if (colorScheme === 'indigo') {
          gradient.addColorStop(0, 'rgba(129, 140, 248, 0.95)');
          gradient.addColorStop(1, 'rgba(79, 70, 229, 0.35)');
        } else if (colorScheme === 'multicolor') {
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.9)');
          gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.8)');
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.4)');
        } else {
          gradient.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
          gradient.addColorStop(1, 'rgba(14, 165, 233, 0.35)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const radius = barWidth / 2;
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isActive, barCount, colorScheme]);

  return (
    <div className="w-full overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={320}
        height={height}
        className="w-full max-w-sm h-12"
      />
    </div>
  );
}
