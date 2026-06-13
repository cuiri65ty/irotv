import { useState, useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';

interface OLEDActiveSleepProps {
  onDismiss: () => void;
}

export default function OLEDActiveSleep({ onDismiss }: OLEDActiveSleepProps) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [pos, setPos] = useState({ top: '35%', left: '40%' });

  // Update clock time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('fa-IR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Move location of clock to bypass burn-in
  useEffect(() => {
    const moveClock = () => {
      const randomTop = Math.floor(Math.random() * 60 + 15) + '%';
      const randomLeft = Math.floor(Math.random() * 60 + 10) + '%';
      setPos({ top: randomTop, left: randomLeft });
    };

    moveClock();
    const posInterval = setInterval(moveClock, 15000); // Shift position every 15s
    return () => clearInterval(posInterval);
  }, []);

  // Dismiss on any keypress or user interaction
  useEffect(() => {
    const handleDismiss = () => {
      onDismiss();
    };

    window.addEventListener('keydown', handleDismiss);
    window.addEventListener('mousemove', handleDismiss);
    window.addEventListener('mousedown', handleDismiss);
    window.addEventListener('touchstart', handleDismiss);

    return () => {
      window.removeEventListener('keydown', handleDismiss);
      window.removeEventListener('mousemove', handleDismiss);
      window.removeEventListener('mousedown', handleDismiss);
      window.removeEventListener('touchstart', handleDismiss);
    };
  }, [onDismiss]);

  return (
    <div className="absolute inset-0 z-[9999] bg-black/95 text-white flex items-center justify-center select-none overflow-hidden cursor-none">
      {/* Slow Moving Burn-in Safe Slate */}
      <div
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          transition: 'all 2s ease-in-out',
        }}
        className="flex flex-col items-center justify-center text-center p-8 bg-[#0a0f24]/60 backdrop-blur-md rounded-3xl border border-white/5 shadow-[0_0_50px_rgba(37,99,235,0.15)]"
      >
        <span className="text-8xl md:text-9xl font-black font-sans tracking-widest text-slate-100 drop-shadow-[0_0_35px_rgba(59,130,246,0.3)] select-none">
          {time}
        </span>
        <span className="text-sm md:text-base text-slate-400 font-bold mt-4 tracking-wider dir-rtl font-sans">
          {date}
        </span>

        <div className="flex items-center space-x-2 space-x-reverse mt-6 text-slate-400 border border-white/5 rounded-full px-4 py-1.5 bg-white/5">
          <Shield className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-[11px] font-semibold dir-rtl">حالت محافظت صوتی/تصویری تلویزیون فعال است</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 dir-rtl">
          برای خروج، کنترل یا کیبورد را لمس کنید.
        </p>
      </div>
    </div>
  );
}
