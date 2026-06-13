import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Heart, Tv, Star, Flame, Radio } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Auto scroll to playing channel row on load
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedChannel]);

  // Extract categories dynamically
  const categories = useMemo(() => {
    const list = new Set<string>();
    channels.forEach((c) => {
      if (c.category) list.add(c.category);
    });
    return ['all', ...Array.from(list)];
  }, [channels]);

  // Filter channels based on search and parameters
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
      const matchesFavorite = !showOnlyFavorites || favorites.includes(channel.id);
      return matchesSearch && matchesCategory && matchesFavorite;
    });
  }, [channels, searchQuery, selectedCategory, showOnlyFavorites, favorites]);

  return (
    <div 
      className="flex flex-col h-full bg-slate-900/30 border border-white/5 rounded-2xl p-4 md:p-5 select-none relative overflow-hidden"
      onFocus={() => onFocusChange?.('channel_list')}
    >
      {/* List Header */}
      <div className="flex items-center justify-between mb-4 dir-rtl">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
          <h2 className="text-lg font-bold text-slate-100 font-sans tracking-tight">لیست شبکه‌ها</h2>
        </div>
        <span className="text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20">
          {filteredChannels.length} کانال
        </span>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-3 dir-rtl">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        <input
          onFocus={() => onFocusChange?.('search_bar')}
          onMouseEnter={(e) => e.currentTarget.focus()}
          type="text"
          placeholder="جستجو در شبکه‌ها..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pr-11 pl-4 text-sm bg-black/40 border border-white/10 hover:border-white/20 focus:border-blue-500 text-slate-100 placeholder-slate-500 rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500/20 font-medium"
        />
      </div>

      {/* Controls: Category Selector & Favorites Toggle */}
      <div className="flex flex-col space-y-2 mb-4 dir-rtl">
        {/* Categories Scroller */}
        <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-neutral-850">
          {categories.map((cat) => (
            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${selectedCategory === cat ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
            >
              {cat === 'all' ? 'همه دسته‌بندی‌ها' : cat}
            </button>
          ))}
        </div>

        {/* Quick Filter buttons */}
        <div className="flex space-x-2 space-x-reverse">
          <button
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={() => {
              setShowOnlyFavorites(false);
              setSelectedCategory('all');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center space-x-1.5 space-x-reverse transition-all ${!showOnlyFavorites && selectedCategory === 'all' ? 'bg-white/10 border border-white/20 text-white' : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'}`}
          >
            <Flame className="w-3.5 h-3.5 text-blue-400" />
            <span>همه کانال‌ها</span>
          </button>
          <button
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center space-x-1.5 space-x-reverse transition-all ${showOnlyFavorites ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'bg-white/5 border border-white/5 text-slate-400 hover:text-slate-200'}`}
          >
            <Star className="w-3.5 h-3.5 fill-current text-rose-500" />
            <span>علاقه‌مندی‌ها</span>
          </button>
        </div>
      </div>

      {/* Scrollable Channels List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 h-[200px] min-h-0">
        {filteredChannels.length > 0 ? (
          filteredChannels.map((chan) => {
            const isFav = favorites.includes(chan.id);
            const isSelected = selectedChannel?.id === chan.id;

            return (
              <button
                ref={isSelected ? activeItemRef : null}
                onMouseEnter={(e) => e.currentTarget.focus()}
                key={chan.id}
                onClick={() => onSelectChannel(chan)}
                className={`w-full group/item text-right flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:scale-[1.02] ${isSelected ? 'glass-active text-white' : 'bg-white/5 border border-white/5 hover:border-white/12 text-slate-300 hover:bg-white/10 hover:text-white'}`}
              >
                {/* Left Side: Category Label & Favorite icon */}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onMouseEnter={(e) => e.currentTarget.focus()}
                    onClick={(e) => onToggleFavorite(chan.id, e)}
                    className="p-1 px-1.5 rounded-md hover:bg-white/10 border border-transparent hover:border-white/10 transition"
                  >
                    <Heart className={`w-4 h-4 transition ${isFav ? 'text-rose-500 fill-current' : 'text-zinc-600 group-hover/item:text-zinc-400'}`} />
                  </button>
                </div>

                {/* Right Side: Channel details */}
                <div className="flex items-center space-x-3 space-x-reverse truncate">
                  <div className="text-right truncate max-w-[150px] sm:max-w-[180px]">
                    <h4 className="font-bold text-sm tracking-wide truncate group-hover/item:text-white dir-ltr text-right">
                      {chan.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[120px] sm:max-w-[140px] dir-ltr text-right">
                      {chan.category || 'پخش زنده'}
                    </p>
                  </div>
                  {chan.logoUrl ? (
                    <img
                      src={chan.logoUrl}
                      alt={chan.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-9 h-9 object-contain rounded-lg bg-black/40 p-0.5 border border-white/10"
                    />
                  ) : (
                    <div className="w-9 h-9 min-w-[36px] flex items-center justify-center rounded-lg bg-white/5 text-blue-400 font-bold font-sans text-sm group-hover/item:bg-blue-600 group-hover/item:text-white transition">
                      <Tv className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <Tv className="w-10 h-10 mb-2 text-neutral-600 animate-pulse" />
            <span className="text-xs font-semibold dir-rtl">هیچ شبکه‌ای یافت نشد</span>
          </div>
        )}
      </div>
    </div>
  );
}
