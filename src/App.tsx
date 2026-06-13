import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Heart, Info, HelpCircle, RefreshCw, Moon, Fullscreen,
  Sliders, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Plus,
  Menu, X, Shield, BookOpen, Settings, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Channel, PlayerSettings, ProxySettings, FocusArea } from './types';
import { PRESET_CHANNELS } from './components/PresetChannels';
import IPTVPlayer from './components/IPTVPlayer';
import ChannelList from './components/ChannelList';
import PlaylistManager from './components/PlaylistManager';
import ProxySettingsPanel from './components/ProxySettingsPanel';
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
    return PRESET_CHANNELS[0];
  });

  // Player settings & preferences
  const [settings, setSettings] = useState<PlayerSettings>({
    aspectRatio: 'auto',
    volume: 0.8,
    isMuted: false,
    sleepTimerMinutes: null,
    showOledScreensaver: false,
  });

  // Advanced headers proxy and token rotation settings
  const [proxySettings, setProxySettings] = useState<ProxySettings>(() => {
    const saved = localStorage.getItem('iptv_proxy_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // use default
      }
    }
    return {
      enabled: false,
      sessionId: 'session_' + Math.random().toString(36).substring(2, 11),
      cookie: '',
      referer: '',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      token: '',
      tokenParam: 'token',
      tokenRenewUrl: '',
      tokenRenewInterval: 45,
      tokenRenewEnabled: false,
      tokenRenewKey: '',
    };
  });

  const [activeFocusArea, setActiveFocusArea] = useState<FocusArea>('channel_list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'channels' | 'import' | 'proxy' | 'shortcuts'>('channels');
  const lastActivityRef = useRef<number>(Date.now());

  // Save favorites to storage
  useEffect(() => {
    localStorage.setItem('iptv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Save custom playlists to storage
  useEffect(() => {
    localStorage.setItem('iptv_custom_playlists', JSON.stringify(customPlaylists));
  }, [customPlaylists]);

  // Save last selected channel
  useEffect(() => {
    if (selectedChannel) {
      localStorage.setItem('iptv_last_channel', JSON.stringify(selectedChannel));
    }
  }, [selectedChannel]);

  // Save proxy settings & post live token updates to our Express proxy server session store
  useEffect(() => {
    localStorage.setItem('iptv_proxy_settings', JSON.stringify(proxySettings));
    
    if (proxySettings.sessionId) {
      fetch('/api/session/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: proxySettings.sessionId,
          token: proxySettings.token
        })
      }).catch(err => console.warn('Failed background token synchronisation:', err));
    }
  }, [proxySettings]);

  // Background Token Renewal Loop (every 30-60s)
  useEffect(() => {
    if (!proxySettings.tokenRenewEnabled || !proxySettings.tokenRenewUrl) {
      return;
    }

    const renewToken = async () => {
      try {
        // Fetch via our local Express CORS bypass token proxy
        let tokenApiUrl = `/api/fetch-token?url=${encodeURIComponent(proxySettings.tokenRenewUrl)}`;
        if (proxySettings.cookie) tokenApiUrl += `&cookie=${encodeURIComponent(proxySettings.cookie)}`;
        if (proxySettings.referer) tokenApiUrl += `&referer=${encodeURIComponent(proxySettings.referer)}`;
        if (proxySettings.userAgent) tokenApiUrl += `&userAgent=${encodeURIComponent(proxySettings.userAgent)}`;

        const response = await fetch(tokenApiUrl);
        if (!response.ok) {
          throw new Error('Token API HTTP ' + response.status);
        }
        
        const text = await response.text();
        let freshToken = text.trim();

        // Extract using custom JSON key path if configured
        if (proxySettings.tokenRenewKey) {
          try {
            const parsed = JSON.parse(text);
            const pathParts = proxySettings.tokenRenewKey.split('.');
            let value: any = parsed;
            for (const part of pathParts) {
              if (value && value[part] !== undefined) {
                value = value[part];
              } else {
                value = null;
                break;
              }
            }
            if (value) {
              freshToken = String(value).trim();
            }
          } catch (e) {
            console.warn('JSON parsing of stream token failed, adopting raw string:', e);
          }
        }

        if (freshToken && freshToken !== proxySettings.token) {
          setProxySettings(prev => ({
            ...prev,
            token: freshToken
          }));

          // Trigger screen Toast notification
          const toast = document.getElementById('token-toast-alert');
          if (toast) {
            toast.classList.remove('opacity-0', 'translate-y-2');
            toast.classList.add('opacity-100', 'translate-y-0');
            setTimeout(() => {
              toast.classList.remove('opacity-100', 'translate-y-0');
              toast.classList.add('opacity-0', 'translate-y-2');
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Error renewing token automatic tick:', err);
      }
    };

    // Execute first run
    renewToken();

    // Loop interval
    const secs = Math.max(15, proxySettings.tokenRenewInterval);
    const id = setInterval(renewToken, secs * 1000);

    return () => clearInterval(id);
  }, [
    proxySettings.tokenRenewEnabled,
    proxySettings.tokenRenewUrl,
    proxySettings.tokenRenewInterval,
    proxySettings.tokenRenewKey,
    proxySettings.cookie,
    proxySettings.referer,
    proxySettings.userAgent
  ]);

  // Monitor idle time for OLED screensaver safety (10 minutes)
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('mousedown', updateActivity);

    const interval = setInterval(() => {
      const now = Date.now();
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

    if (channels.length > 0) {
      setSelectedChannel(channels[0]);
    }
    setSidebarTab('channels'); // Switch to channel viewer tab instantly!
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
    <div className="h-screen w-screen overflow-hidden bg-black text-slate-100 font-sans select-none relative flex flex-row">
      
      {/* Dynamic Token Refreshed Toast Notification */}
      <div 
        id="token-toast-alert" 
        className="absolute bottom-6 right-6 z-[9999] bg-slate-900 border border-emerald-510 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-emerald-450 pointer-events-none opacity-0 translate-y-2 transition-all duration-300 font-sans"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-xs font-bold leading-none dir-rtl">توکن زنده استریم بروزرسانی شد!</span>
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

      {/* Floating Left Sidebar Toggle Button - Renders if Sidebar is closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-30 p-3 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-slate-350 cursor-pointer focus:border-blue-500 hover:text-white transition shadow-lg outline-none flex items-center justify-center"
          title="باز کردن منوی تلویزیون"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* LEFT SIDEBAR: Solid, lightweight to bypass Smart TV latency */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="w-96 min-w-[384px] h-full bg-slate-950 border-r border-white/10 flex flex-col z-40 relative relative grid grid-rows-[auto_1fr_auto]"
          >
            {/* Sidebar Title Header banner */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 dir-rtl text-right">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow shadow-blue-500/20">
                  <Tv className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-none text-white font-sans">
                    تلویزیون هوشمند <span className="text-blue-400 font-extrabold">من</span>
                  </h1>
                  <span className="text-[9px] text-slate-400 font-semibold tracking-wider block mt-1">IPTV STREAM PLAYER</span>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer focus:border-blue-500 transition outline-none"
                title="بستن منو"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Tabs selections */}
            <div className="flex border-b border-white/5 bg-slate-900/20 py-1.5 px-2 gap-1 dir-rtl">
              <button
                onClick={() => setSidebarTab('channels')}
                className={`flex-1 py-1 px-2.5 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 cursor-pointer ${sidebarTab === 'channels' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Tv className="w-4 h-4" />
                <span>برنامه‌ها</span>
              </button>
              <button
                onClick={() => setSidebarTab('import')}
                className={`flex-1 py-1 px-2.5 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 cursor-pointer ${sidebarTab === 'import' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <BookOpen className="w-4 h-4" />
                <span>بارگذاری</span>
              </button>
              <button
                onClick={() => setSidebarTab('proxy')}
                className={`flex-1 py-1 px-2.5 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 cursor-pointer ${sidebarTab === 'proxy' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Settings className="w-4 h-4" />
                <span>پروکسی</span>
              </button>
              <button
                onClick={() => setSidebarTab('shortcuts')}
                className={`flex-1 py-1 px-2.5 text-xs font-bold rounded-md transition-all flex flex-col items-center gap-1 cursor-pointer ${sidebarTab === 'shortcuts' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>راهنما</span>
              </button>
            </div>

            {/* TAB PANELS CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col scrollbar-thin">
              {sidebarTab === 'channels' && (
                <div className="flex-1 min-h-0">
                  <ChannelList
                    channels={allChannels}
                    selectedChannel={selectedChannel}
                    onSelectChannel={(chan) => {
                      setSelectedChannel(chan);
                      // Close sidebar automatically on mobile/TV to display full-width video
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                      document.getElementById('main-video-player-container')?.focus();
                    }}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
                  />
                </div>
              )}

              {sidebarTab === 'import' && (
                <div className="flex flex-col min-h-0 space-y-4">
                  <PlaylistManager
                    onImportPlaylist={handleImportPlaylist}
                    onClearPlaylists={handleClearPlaylists}
                    hasCustomPlaylists={customPlaylists.length > 0}
                    onSelectDirectStream={(customChan) => {
                      setSelectedChannel(customChan);
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                      document.getElementById('main-video-player-container')?.focus();
                    }}
                    onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
                  />
                </div>
              )}

              {sidebarTab === 'proxy' && (
                <div className="flex-1 min-h-0">
                  <ProxySettingsPanel
                    settings={proxySettings}
                    onSave={(newSettings) => setProxySettings(newSettings)}
                    onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
                  />
                </div>
              )}

              {sidebarTab === 'shortcuts' && (
                <div className="space-y-4 text-xs text-slate-350 select-none text-right dir-rtl">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white text-sm">راهنمای میانبرهای کنترل هوشمند</span>
                  </div>
                  
                  <div className="space-y-3 mt-2 pr-1">
                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                      <div className="font-bold text-white flex items-center justify-between mb-1">
                        <span>تعویض کانال زنده</span>
                        <span className="px-1.5 py-0.5 bg-black text-[9px] border border-white/5 text-blue-400 font-mono rounded">← / →</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">با فشار کلیدهای جهت چپ و راست مستقیماً به کانال قبلی یا بعدی بروید.</p>
                    </div>

                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                      <div className="font-bold text-white flex items-center justify-between mb-1">
                        <span>تغییر بلندی صدا</span>
                        <span className="px-1.5 py-0.5 bg-black text-[9px] border border-white/5 text-blue-400 font-mono rounded">↑ / ↓</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">زمانی که کنترل فاقد منوی فعال است، جهت بالا و پایین درصد صدای خروجی را تغییر می‌دهند.</p>
                    </div>

                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                      <div className="font-bold text-white flex items-center justify-between mb-1">
                        <span>توقف / پخش</span>
                        <span className="px-1.5 py-0.5 bg-black text-[9px] border border-white/5 text-blue-400 font-mono rounded">Space</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">فشردن دکمه فاصله استریم در حال پخش را متوقف یا به جریان می‌اندازد.</p>
                    </div>

                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                      <div className="font-bold text-white flex items-center justify-between mb-1">
                        <span>تمام صفحه</span>
                        <span className="px-1.5 py-0.5 bg-black text-[9px] border border-white/5 text-blue-400 font-mono rounded">F</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">تغییر فوری وضعیت پخش تصویر به تمام صفحه تلویزیون.</p>
                    </div>

                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-white/5">
                      <div className="font-bold text-white flex items-center justify-between mb-1">
                        <span>دکمه بازگشت تلویزیون</span>
                        <span className="px-1.5 py-0.5 bg-black text-[9px] border border-white/5 text-blue-400 font-mono rounded">Backspace</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">خروج از حالت تمام صفحه یا بستن سایر کادرهای متحرک.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar bottom persistent stats / clock block */}
            <div className="p-3 border-t border-white/5 bg-slate-950 flex items-center justify-between text-slate-500 text-[10px] dir-rtl font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-slate-400">{currentLocalTime()}</span>
              </div>
              <span className="text-slate-500">{currentLocalDate()}</span>
              <button
                onClick={() => setSettings(prev => ({ ...prev, showOledScreensaver: true }))}
                className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer bg-white/5 px-2 py-1 rounded"
              >
                <Moon className="w-3 h-3 text-blue-400" />
                <span>محافظ صفحه</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT MAIN GAME STAGE: IPTVPlayer takes 100% of the remaining viewport space */}
      <div 
        className="flex-1 h-full relative bg-black flex flex-col"
        onClick={() => {
          // If sidebar is open and on mobile resolutions, clicking the player can dismiss the sidebar
          if (isSidebarOpen && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }}
      >
        <IPTVPlayer
          channel={selectedChannel}
          settings={settings}
          setSettings={setSettings}
          proxySettings={proxySettings}
          onPrevChannel={handlePrevChannel}
          onNextChannel={handleNextChannel}
          onFocusChange={(area) => setActiveFocusArea(area as FocusArea)}
        />
      </div>

      {/* Global CSS adjustments */}
      <style>{`
        /* Fine tune scrollbar layouts for better remote navigation */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 99px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #475569;
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
