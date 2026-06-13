import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Heart, Info, HelpCircle, RefreshCw, Moon, Fullscreen,
  Sliders, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Channel, PlayerSettings, FocusArea } from './types';
import { PRESET_CHANNELS } from './components/PresetChannels';
import IPTVPlayer from './components/IPTVPlayer';
import ChannelList from './components/ChannelList';
import PlaylistManager from './components/PlaylistManager';
import OLEDActiveSleep from './components/OLEDActiveSleep';

export default function App() {
  // Local storage lists
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('iptv_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [customPlaylists, setCustomPlaylists] = useState<{ name: string; channels: Channel[] }[]>(() => {
    const saved = localStorage.getItem('iptv_custom_playlists');
    return saved ? JSON.parse(saved) : [];
  });

  // Flat list of all available channels (Presets + Custom Playlists)
  const allChannels = useMemo(() => {
    const customChans = customPlaylists.flatMap(p => p.channels);
    return [...PRESET_CHANNELS, ...customChans];
  }, [customPlaylists]);

  // Selected channel playing
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(() => {
    const saved = localStorage.getItem('iptv_last_channel');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch {
        return PRESET_CHANNELS[0];
      }
    }
    return PRESET_CHANNELS[0]; // Start with the first NASA stream as demo
  });

  // Player settings & preferences
  const [settings, setSettings] = useState<PlayerSettings>({
    aspectRatio: 'auto',
    volume: 0.8,
    isMuted: false,
    sleepTimerMinutes: null,
    showOledScreensaver: false,
  });

  const [activeFocusArea, setActiveFocusArea] = useState<FocusArea>('channel_list');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Save favorites to storage
  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save custom playlists to storage
  useEffect(() => {
    localStorage.setItem('iptv_custom_snapshots', JSON.stringify(customPlaylists));
  }, [customPlaylists]);

  // Save last selected channel
  useEffect(() => {
    if (selectedChannel) {
      localStorage.setItem('iptv_last_channel', JSON.stringify(selectedChannel));
    }
  }, [selectedChannel]);

  // Monitor idle time for OLED screensaver safety (10 minutes)
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('mousedown', updateActivity);

    // Dynamic 10-min interval check
    const interval = setInterval(() => {
      const now = Date.now();
      // If inactive for 10 minutes (600,000ms), and player is paused or not fullscreen, launch screensaver
      if (now - lastActivityRef.current > 600000 && !settings.showOledScreensaver) {
        setSettings((prev) => ({ ...prev, showOledScreensaver: true }));
      }
    }, 15000);

    return () => {
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      clearInterval(interval);
    };
  }, [settings.showOledScreensaver]);

  // Add loaded playlist
  const handleImportPlaylist = (name: string, channels: Channel[]) => {
    const newPlaylist = { name, channels };
    setCustomPlaylists((prev) => {
      const updated = [...prev, newPlaylist];
      localStorage.setItem('iptv_custom_playlists', JSON.stringify(updated));
      return updated;
    });

    // Auto-play the first channel of newly uploaded M3U list
    if (channels.length > 0) {
      setSelectedChannel(channels[0]);
    }
  };

  // Clear all custom lists
  const handleClearPlaylists = () => {
    if (window.confirm('آیا مایلید تمام پلی‌لیست‌های دلخواه و کانال‌های ذخیره شده شما حذف شوند؟')) {
      setCustomPlaylists([]);
      localStorage.removeItem('iptv_custom_playlists');
      setSelectedChannel(PRESET_CHANNELS[0]);
    }
  };

  const handleToggleFavorite = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  };

  // Channel switching sequence (Previous / Next)
  const handlePrevChannel = () => {
    if (allChannels.length === 0) return;
    const currentIdx = allChannels.findIndex((c) => c.id === selectedChannel?.id);
    if (currentIdx === -1) {
      setSelectedChannel(allChannels[0]);
    } else {
      const prevIdx = (currentIdx - 1 + allChannels.length) % allChannels.length;
      setSelectedChannel(allChannels[prevIdx]);
    }
  };

  const handleNextChannel = () => {
    if (allChannels.length === 0) return;
    const currentIdx = allChannels.findIndex((c) => c.id === selectedChannel?.id);
    if (currentIdx === -1) {
      setSelectedChannel(allChannels[0]);
    } else {
      const nextIdx = (currentIdx + 1) % allChannels.length;
      setSelectedChannel(allChannels[nextIdx]);
    }
  };

  const currentLocalTime = () => {
    return new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  };

  const currentLocalDate = () => {
    return new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col font-sans transition-all duration-500 overflow-x-hidden p-3 md:p-6 select-none relative pb-16">
      
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px]"></div>
      </div>

      {/* OLED screensaver module */}
      {settings.showOledScreensaver && (
        <OLEDActiveSleep
          onDismiss={() => {
            setSettings((prev) => ({ ...prev, showOledScreensaver: false }));
            lastActivityRef.current = Date.now();
          }}
        />
      )}

      {/* Header Grid */}
      <header className="relative z-10 w-full flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6 dir-rtl">
        <div className="flex items-center space-x-3 space-x-reverse text-right">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition duration-300">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-sans leading-none text-white tracking-wide">
              تلویزیون هوشمند <span className="text-blue-400 font-black">من</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider mt-1">
              IPTV STREAM PLAYER • PREMIUM GLASS PWA
            </p>
          </div>
        </div>

        {/* TV specific details: Clock, status, etc. */}
        <div className="flex items-center gap-4 text-xs font-semibold select-none text-slate-400">
          <div className="hidden sm:flex flex-col items-end text-right border-l border-white/10 pl-4">
            <span className="text-white text-sm font-mono tracking-wider">{currentLocalTime()}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{currentLocalDate()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              onClick={() => setShowHelpModal(true)}
              className="p-2 bg-white/5 hover:bg-white/10 hover:border-blue-400/50 focus:border-blue-500 focus:text-blue-400 text-slate-300 border border-white/10 rounded-xl transition duration-150 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20"
              title="آموزش راهنمای کنترل تلویزیون"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              onClick={() => setSettings(prev => ({ ...prev, showOledScreensaver: true }))}
              className="p-2 bg-white/5 hover:bg-white/10 hover:border-blue-400/50 focus:border-blue-500 focus:text-blue-400 text-slate-300 border border-white/10 rounded-xl transition duration-150 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 flex items-center gap-1.5"
              title="فعال‌سازی محافظ صفحه"
            >
              <Moon className="w-4 h-4" />
              <span className="text-[10px] hidden md:inline font-bold">محافظ صفحه</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content - TV layout structure */}
      <main className="relative z-10 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-0">
        
        {/* Right side: Channels list sidebar (Larger on desktop TV browsers) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col h-full order-last lg:order-none">
          <ChannelList
            channels={allChannels}
            selectedChannel={selectedChannel}
            onSelectChannel={(chan) => {
              setSelectedChannel(chan);
              // Programmatically click player focus to allow immediate remote play state
              document.getElementById('main-video-player-container')?.focus();
            }}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
          />
        </div>

        {/* Left side: Premium HTML5 / HLS streamer screen */}
        <div className="col-span-1 lg:col-span-8 flex flex-col space-y-6 h-full">
          <div className="relative aspect-video">
            <IPTVPlayer
              channel={selectedChannel}
              settings={settings}
              setSettings={setSettings}
              onPrevChannel={handlePrevChannel}
              onNextChannel={handleNextChannel}
              onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
            />
          </div>

          {/* Inline instruction widget */}
          <div className="bg-white/5 backdrop-blur-md p-4 border border-white/10 rounded-2xl flex items-center justify-between gap-4 text-xs dir-rtl text-right">
            <div className="flex gap-2.5 items-start">
              <CornerDownLeft className="text-blue-400 w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">راهنمای هوشمند تعویض کانال</h4>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                  میتوانید با تکان دادن نشانگر کنترل روی صفحه، روی گزینه‌ها بروید یا با کلیدهای جهتی به شبکه‌ها رانده شوید. دکمه‌های جهت چپ و راست مستقیماً شبکه‌ها را تغییر می‌دهند.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Full panel at the bottom: Add & Import custom streams */}
      <section className="relative z-10 w-full mt-6 flex-shrink-0">
        <PlaylistManager
          onImportPlaylist={handleImportPlaylist}
          onClearPlaylists={handleClearPlaylists}
          hasCustomPlaylists={customPlaylists.length > 0}
          onSelectDirectStream={(customChan) => {
            setSelectedChannel(customChan);
            document.getElementById('main-video-player-container')?.focus();
          }}
          onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
        />
      </section>

      {/* Floating help navigation layout instruction (Modal) */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right select-none"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-5">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">راهنمای میانبر و ناوبری تلویزیون سامسونگ</h3>
                  <p className="text-[10px] text-slate-400 tracking-wider font-semibold">TIZEN TV CONTROL & REMOTE SHORTCUTS</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <ArrowUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">جهت‌های بالا و پایین دکمه‌های کنترل</h4>
                    <p className="text-slate-400 mt-1">تغییر کانال در لیست و گشت‌وگذار سریع در گزینه‌ها. در حالت پخش زنده باعث تغییر داینامیک درصد صدا می‌شود.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <ArrowLeft className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">جهت‌های چپ و راست</h4>
                    <p className="text-slate-400 mt-1">پرش مستقیم به شبکه قبلی یا شبکه بعدی در گرید لیست فعال شما.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-lg bg-white/5 text-blue-400 px-2 font-mono font-bold shrink-0 text-[10px]">
                    Enter
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">کلید تایید / کلیک وسط کلید کنترل</h4>
                    <p className="text-slate-400 mt-1">پخش استریم کانال انتخاب شده و همچنین نمایش منوی کنترل پنل پایینی.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-lg bg-white/5 text-blue-400 px-1 font-mono font-bold shrink-0 text-[10px]">
                    Space
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">کلید فاصله / Spacebar</h4>
                    <p className="text-slate-400 mt-1">توقف موقت (Pause) یا ادامه مجدد (Play) کانال تلویزیونی.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-lg bg-white/5 text-blue-400 px-1 font-mono font-bold shrink-0 text-[10px]">
                    Back
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">دکمه بازگشت / Backspace تلویزیون</h4>
                    <p className="text-slate-400 mt-1">خروج از حالت تمام صفحه یا بستن منوهای تاشوی کیفیت تصویر.</p>
                  </div>
                </div>
              </div>

              <button
                onMouseEnter={(e) => e.currentTarget.focus()}
                onClick={() => setShowHelpModal(false)}
                className="mt-6 w-full h-11 bg-white/5 hover:bg-white/10 hover:text-white text-center rounded-xl border border-white/10 font-extrabold text-sm text-slate-300 transition duration-150 cursor-pointer focus:border-blue-500 outline-none"
              >
                متوجه شدم (بستن)
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global CSS fixes included in page */}
      <style>{`
        /* Custom nice scrollbar styling across sidebar and grids */
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 99px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #fbbf24;
        }
        
        .dir-rtl {
          direction: rtl;
        }
        .ltr {
          direction: ltr;
        }
        .dir-ltr {
          direction: ltr;
        }
      `}</style>
    </div>
  );
}
