import React, { useEffect, useRef } from 'react';
import { Tv, ArrowUp, ArrowDown } from 'lucide-react';
import { Channel } from '../types';

interface ChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  favorites: string[];
  onToggleFavorite: (id: string, event: React.MouseEvent) => void;
  onFocusChange?: (id: string) => void;
}

export default function ChannelList({
  channels,
  selectedChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite,
  onFocusChange,
}: ChannelListProps) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto scroll to playing channel row on load
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedChannel]);

  const handleMoveUp = () => {
    if (channels.length === 0) return;
    const currentIdx = channels.findIndex(c => c.id === selectedChannel?.id);
    const prevIdx = currentIdx <= 0 ? channels.length - 1 : currentIdx - 1;
    onSelectChannel(channels[prevIdx]);
  };

  const handleMoveDown = () => {
    if (channels.length === 0) return;
    const currentIdx = channels.findIndex(c => c.id === selectedChannel?.id);
    const nextIdx = currentIdx === -1 || currentIdx >= channels.length - 1 ? 0 : currentIdx + 1;
    onSelectChannel(channels[nextIdx]);
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900/10 border border-white/5 rounded-xl p-3 select-none relative overflow-hidden"
      onFocus={() => onFocusChange?.('channel_list')}
    >
      {/* Dynamic Arrow Navigation Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3 dir-rtl">
        <button
          onClick={handleMoveUp}
          onMouseEnter={(e) => e.currentTarget.focus()}
          className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          title="شبکه قبلی"
        >
          <ArrowUp className="w-4 h-4 text-white" />
          <span>شبکه قبلی</span>
        </button>

        <button
          onClick={handleMoveDown}
          onMouseEnter={(e) => e.currentTarget.focus()}
          className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          title="شبکه بعدی"
        >
          <ArrowDown className="w-4 h-4 text-white" />
          <span>شبکه بعدی</span>
        </button>
      </div>

      {/* Simplified Header */}
      <div className="flex items-center justify-between mb-3 dir-rtl text-right">
        <span className="text-xs font-bold text-slate-300 font-sans">فهرست برنامه‌های زنده</span>
        <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
          {channels.length} شبکه
        </span>
      </div>

      {/* Lightweight scrollable channels list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-0">
        {channels.length > 0 ? (
          channels.map((chan) => {
            const isSelected = selectedChannel?.id === chan.id;

            return (
              <button
                ref={isSelected ? activeItemRef : null}
                onMouseEnter={(e) => e.currentTarget.focus()}
                key={chan.id}
                onClick={() => onSelectChannel(chan)}
                className={`w-full text-right flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${isSelected ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-slate-900/40 border-white/5 hover:border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <div className="text-[10px] text-slate-400 pr-1 select-none">
                  #{chan.id.substring(0, 3)}
                </div>

                {/* Right Side Details */}
                <div className="flex items-center space-x-2 space-x-reverse truncate">
                  <div className="text-right truncate max-w-[170px]">
                    <span className="block text-xs truncate dir-ltr text-right">
                      {chan.name}
                    </span>
                  </div>
                  {chan.logoUrl ? (
                    <img
                      src={chan.logoUrl}
                      alt={chan.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-7 h-7 object-contain rounded bg-black/20 p-0.5 border border-white/5"
                    />
                  ) : (
                    <div className="w-7 h-7 min-w-[28px] flex items-center justify-center rounded bg-white/5 text-blue-400">
                      <Tv className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Tv className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
            <span className="text-[11px] font-semibold dir-rtl">هیچ شبکه‌ای بارگذاری نشده است</span>
          </div>
        )}
      </div>
    </div>
  );
}
