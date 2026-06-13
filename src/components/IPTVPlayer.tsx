import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Tv, Timer, ChevronRight, Settings, RotateCcw, MonitorPlay,
  SkipBack, SkipForward
} from 'lucide-react';
import { Channel, PlayerSettings, ProxySettings } from '../types';

interface IPTVPlayerProps {
  channel: Channel | null;
  settings: PlayerSettings;
  setSettings: (updater: (prev: PlayerSettings) => PlayerSettings) => void;
  proxySettings: ProxySettings;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  onFocusChange?: (id: string) => void;
}

export default function IPTVPlayer({
  channel,
  settings,
  setSettings,
  proxySettings,
  onPrevChannel,
  onNextChannel,
  onFocusChange,
}: IPTVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [levels, setLevels] = useState<{ index: number; name: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepCountdown, setSleepCountdown] = useState<number | null>(null);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger controls display on activity
  const triggerActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu && !showSleepMenu) {
        setShowControls(false);
      }
    }, 4000);
  };

  // Keyboard controls when playing in full-screen or focused player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      // Allow standard input interactions without blocking arrows
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          triggerActivity();
          break;
        case 'KeyF':
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowLeft':
          // If controls are visible, let default focus handle things or trigger previous channel
          if (!showControls) {
            e.preventDefault();
            onPrevChannel();
            triggerActivity();
          }
          break;
        case 'ArrowRight':
          if (!showControls) {
            e.preventDefault();
            onNextChannel();
            triggerActivity();
          }
          break;
        case 'ArrowUp':
          if (!showControls) {
            e.preventDefault();
            adjustVolume(0.1);
            triggerActivity();
          }
          break;
        case 'ArrowDown':
          if (!showControls) {
            e.preventDefault();
            adjustVolume(-0.1);
            triggerActivity();
          }
          break;
        case 'Escape':
        case 'Backspace':
          if (isFullscreen) {
            e.preventDefault();
            exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, isFullscreen, showControls, onPrevChannel, onNextChannel, settings.volume]);

  // Sync volume with settings
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = settings.isMuted ? 0 : settings.volume;
    }
  }, [settings.volume, settings.isMuted]);

  // Parse HLS load
  useEffect(() => {
    if (!videoRef.current || !channel) return;

    setErrorMsg(null);
    setLevels([]);
    setCurrentLevel(-1);

    // Clean previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    
    let streamUrl = channel.url;
    const isTelewebionOrDomestic = 
      channel.url.toLowerCase().includes("telewebion") ||
      channel.url.toLowerCase().includes("shasans") ||
      channel.url.toLowerCase().includes("irib") ||
      channel.url.toLowerCase().includes("sepehr") ||
      channel.url.toLowerCase().includes("live.ir") ||
      channel.url.toLowerCase().includes("hls.ir") ||
      channel.url.toLowerCase().includes("arvan") ||
      channel.url.toLowerCase().includes("sedaoseema");

    if ((proxySettings && proxySettings.enabled) || isTelewebionOrDomestic) {
      const qParams = new URLSearchParams();
      qParams.set("url", channel.url);
      if (proxySettings.sessionId) qParams.set("sessionId", proxySettings.sessionId);
      if (proxySettings.cookie) qParams.set("cookie", proxySettings.cookie);
      if (proxySettings.referer) {
        qParams.set("referer", proxySettings.referer);
      } else if (isTelewebionOrDomestic) {
        qParams.set("referer", "https://www.telewebion.com/");
      }
      if (proxySettings.userAgent) qParams.set("userAgent", proxySettings.userAgent);
      if (proxySettings.token) qParams.set("token", proxySettings.token);
      if (proxySettings.tokenParam) qParams.set("tokenParam", proxySettings.tokenParam);
      streamUrl = `/api/proxy?${qParams.toString()}`;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 15,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsPlaying(true);
        video.play().catch(() => {
          setIsPlaying(false);
        });
        triggerActivity();

        // Load available bitrates
        const availableLevels = hls.levels.map((lvl, index) => ({
          index,
          name: lvl.height ? `${lvl.height}p` : `Level ${index + 1}`
        }));
        setLevels(availableLevels);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg('خطای شبکه در دریافت استریم. اتصال را بررسی کنید.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setErrorMsg('خطای فرمت تصویر. در حال تلاش مجدد...');
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg('امکان پخش این شبکه وجود ندارد. آدرس استریم را بررسی کنید.');
              setIsPlaying(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('vnd.apple.mpegURL')) {
      // Native Safari/iOS/Tizen support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsPlaying(true);
        video.play().catch(() => {
          setIsPlaying(false);
        });
        triggerActivity();
      });
      video.addEventListener('error', () => {
        setErrorMsg('خطای مدیا. اتصال اینترنت یا آدرس شبکه را بررسی نمایید.');
        setIsPlaying(false);
      });
    } else {
      setErrorMsg('مرورگر شما از پخش Live HLS استریم پشتیبانی نمی‌کند.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, proxySettings.enabled, proxySettings.cookie, proxySettings.referer, proxySettings.userAgent, proxySettings.token, proxySettings.tokenParam]);

  // Sleep timer interval tracking
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (settings.sleepTimerMinutes !== null) {
      setSleepCountdown(settings.sleepTimerMinutes * 60);

      interval = setInterval(() => {
        setSleepCountdown((prev) => {
          if (prev === null || prev <= 1) {
            // Trigger sleep state
            if (videoRef.current) videoRef.current.pause();
            setIsPlaying(false);
            setSettings(s => ({
              ...s,
              sleepTimerMinutes: null,
              showOledScreensaver: true
            }));
            clearInterval(interval!);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSleepCountdown(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.sleepTimerMinutes]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setErrorMsg(null);
      }).catch(() => {
        setErrorMsg('خطا در پخش. لطفاً مجدداً کلیک کنید.');
      });
    }
  };

  const adjustVolume = (amount: number) => {
    setSettings((prev) => {
      const nextVolume = Math.min(1, Math.max(0, prev.volume + amount));
      return {
        ...prev,
        volume: nextVolume,
        isMuted: nextVolume === 0,
      };
    });
  };

  const toggleMute = () => {
    setSettings((prev) => ({
      ...prev,
      isMuted: !prev.isMuted,
    }));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const changeQuality = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
      setShowQualityMenu(false);
      triggerActivity();
    }
  };

  const selectSleepTimer = (minutes: number | null) => {
    setSettings((prev) => ({
      ...prev,
      sleepTimerMinutes: minutes,
    }));
    setShowSleepMenu(false);
    triggerActivity();
  };

  // Switch Aspect ratio classes
  const getAspectRatioClass = () => {
    switch (settings.aspectRatio) {
      case '16-9':
        return 'aspect-video object-stretch w-full h-full';
      case '4-3':
        return 'aspect-[4/3] object-contain max-w-full max-h-full mx-auto';
      case 'cover':
        return 'object-cover w-full h-full';
      default:
        return 'object-contain w-full h-full';
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      ref={containerRef}
      id="main-video-player-container"
      tabIndex={0}
      onFocus={() => onFocusChange?.('player_controls')}
      onMouseMove={triggerActivity}
      onClick={triggerActivity}
      className="relative flex items-center justify-center w-full h-full bg-[#020617] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 border-2 border-white/10 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 group"
    >
      {/* Target Video Body */}
      {channel ? (
        <video
          ref={videoRef}
          id="tv-primary-video-element"
          className={`transition-all duration-300 ${getAspectRatioClass()}`}
          playsInline
          autoPlay
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 text-slate-300">
          <Tv className="w-16 h-16 mb-4 text-blue-400 animate-pulse animate-duration-1000" />
          <h3 className="font-bold text-xl text-slate-100 font-sans">شبکه‌ای انتخاب نشده است</h3>
          <p className="text-slate-400 mt-2 text-sm max-w-md">
            یک شبکه از لیست سمت راست انتخاب کنید، آدرس وب استریم وارد کنید، یا فایل M3U آپلود کنید.
          </p>
        </div>
      )}

      {/* Loading & Error States */}
      {channel && errorMsg && (
        <div className="absolute inset-0 bg-[#020617] flex flex-col items-center justify-center text-center p-6 z-10">
          <RotateCcw className="w-12 h-12 text-rose-500 mb-4 animate-spin-slow" />
          <p className="text-rose-400 font-bold text-lg dir-rtl">{errorMsg}</p>
          <button
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={() => {
              setErrorMsg(null);
              // Force reload
              setSettings((s) => ({ ...s }));
            }}
            className="mt-4 px-6 py-2.5 bg-white/5 border border-white/10 hover:border-blue-500 text-blue-400 hover:text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            تلاش مجدد پخش استریم
          </button>
        </div>
      )}

      {/* TV Screen Dim Indicator / Screensaver Warning */}
      {sleepCountdown !== null && (
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2 space-x-reverse bg-[#0a1e3f] px-3 py-1.5 rounded-full text-xs text-blue-400 font-mono border border-blue-500/20">
          <Timer className="w-3.5 h-3.5 animate-pulse" />
          <span>Sleep in: {formatCountdown(sleepCountdown)}</span>
        </div>
      )}

      {/* Channel metadata HUD overlay - upper-left side */}
      {channel && showControls && (
        <div className="absolute top-6 left-6 z-20 pointer-events-none transition-all duration-300 animate-fade-in flex items-center space-x-4 space-x-reverse bg-[#111827] border border-white/10 p-4 rounded-xl">
          {channel.logoUrl ? (
            <img
              src={channel.logoUrl}
              alt={channel.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-14 h-14 object-contain rounded-lg bg-black/40 p-1 border border-white/10"
            />
          ) : (
            <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xl font-sans shadow-lg">
              {channel.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              {channel.category || 'پخش زنده'}
            </span>
            <h2 className="text-xl font-bold text-white mt-1 drop-shadow-md text-left truncate max-w-lg dir-ltr">
              {channel.name}
            </h2>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
              <span className="text-[11px] text-emerald-400 font-bold ml-3 mr-1 uppercase tracking-widest font-mono">LIVE HLS</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Center Large Remote Play/Pause Icon Indicator */}
      {channel && !isPlaying && !errorMsg && (
        <button
          onMouseEnter={(e) => e.currentTarget.focus()}
          onClick={togglePlay}
          className="absolute inset-auto w-20 h-20 bg-blue-600/90 text-white hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center rounded-full shadow-[0_0_30px_rgba(37,99,235,0.4)] z-10 focus:outline-none focus:ring-4 focus:ring-blue-500/30"
        >
          <Play className="w-10 h-10 ml-1.5 fill-current" />
        </button>
      )}

      {/* Floating Aspect and Navigation Channels Hotbars */}
      {channel && showControls && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col space-y-3 bg-[#111827] border border-white/10 p-2 rounded-xl">
          <button
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={onPrevChannel}
            title="شبکه قبلی"
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-black/35 border border-white/5 text-slate-300 hover:text-blue-400 focus:text-blue-400 focus:bg-blue-500/10 hover:border-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:scale-105 active:scale-95"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={onNextChannel}
            title="شبکه بعدی"
            className="w-12 h-12 flex items-center justify-center rounded-lg bg-black/35 border border-white/5 text-slate-300 hover:text-blue-400 focus:text-blue-400 focus:bg-blue-500/10 hover:border-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:scale-105 active:scale-95"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Primary Video Custom Control HUD Panel */}
      {channel && showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-[#090d16] border-t border-white/15 z-20 px-6 flex items-center justify-between transition-all duration-300 select-none">
          {/* Play/Pause & Skipping Buttons */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              onClick={togglePlay}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 focus:bg-blue-500 text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:scale-110 active:scale-95"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            {/* Muted and volume slider */}
            <div className="flex items-center space-x-2 space-x-reverse h-10 bg-white/5 hover:bg-white/10 focus-within:bg-white/10 px-3 rounded-xl border border-white/10 transition-all">
              <button
                onMouseEnter={(e) => e.currentTarget.focus()}
                onClick={toggleMute}
                className="text-slate-300 hover:text-blue-400 hover:scale-105 transition-all outline-none"
              >
                {settings.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.isMuted ? 0 : settings.volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSettings(prev => ({
                    ...prev,
                    volume: val,
                    isMuted: val === 0
                  }));
                }}
                className="w-18 accent-blue-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700"
              />
            </div>
          </div>

          {/* Quick Informative TV HUD status */}
          <div className="hidden lg:flex items-center space-x-2 space-x-reverse bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs text-slate-300">
            <Tv className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-[11px]">پخش تلویزیونی زنده</span>
          </div>

          {/* Player Display Settings Buttons */}
          <div className="flex items-center space-x-3 space-x-reverse font-sans">
            {/* Aspect Ratio Cycler */}
            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              onClick={() => {
                const ratios: ('auto' | '16-9' | '4-3' | 'cover')[] = ['auto', '16-9', '4-3', 'cover'];
                const nextIdx = (ratios.indexOf(settings.aspectRatio) + 1) % ratios.length;
                setSettings(prev => ({
                  ...prev,
                  aspectRatio: ratios[nextIdx]
                }));
              }}
              className="h-10 px-3 flex items-center space-x-1.5 space-x-reverse bg-white/5 hover:bg-white/10 focus:bg-blue-500/10 text-xs text-slate-300 hover:text-blue-400 hover:border-blue-400/50 focus:border-blue-500 focus:text-blue-400 border border-white/10 rounded-xl transition-all focus:outline-none"
            >
              <MonitorPlay className="w-4 h-4" />
              <span className="capitalize font-medium">تصویر: {settings.aspectRatio === '16-9' ? '۱۶:۹' : settings.aspectRatio === '4-3' ? '۴:۳' : settings.aspectRatio === 'cover' ? 'کشیده' : 'خودکار'}</span>
            </button>

            {/* Quality switch */}
            {levels.length > 0 && (
              <div className="relative">
                <button
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSleepMenu(false);
                  }}
                  className="h-10 px-3 flex items-center space-x-1.5 space-x-reverse bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-blue-400 border border-white/10 rounded-xl transition-all focus:outline-none focus:border-blue-500 focus:text-blue-400"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-semibold">کیفیت: {currentLevel === -1 ? 'Auto' : levels[currentLevel]?.name}</span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-12 right-0 bg-slate-900 border border-white/10 rounded-xl overflow-hidden w-36 py-1 z-30">
                    <button
                      onMouseEnter={(e) => e.currentTarget.focus()}
                      onClick={() => changeQuality(-1)}
                      className={`w-full text-right px-4 py-2 text-xs hover:bg-blue-600 hover:text-white transition-all ${currentLevel === -1 ? 'text-blue-400 bg-white/10 font-bold' : 'text-slate-300'}`}
                    >
                      انتخاب خودکار (Auto)
                    </button>
                    {levels.map((lvl) => (
                      <button
                        onMouseEnter={(e) => e.currentTarget.focus()}
                        key={lvl.index}
                        onClick={() => changeQuality(lvl.index)}
                        className={`w-full text-right px-4 py-2 text-xs hover:bg-blue-600 hover:text-white transition-all ${currentLevel === lvl.index ? 'text-blue-400 bg-white/10 font-bold' : 'text-slate-300'}`}
                      >
                        {lvl.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sleep timer Selector */}
            <div className="relative">
              <button
                onMouseEnter={(e) => e.currentTarget.focus()}
                onClick={() => {
                  setShowSleepMenu(!showSleepMenu);
                  setShowQualityMenu(false);
                }}
                className={`h-10 px-3 flex items-center space-x-1.5 space-x-reverse rounded-xl border transition-all text-xs focus:outline-none ${settings.sleepTimerMinutes ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-white/5 border border-white/10 text-slate-300 hover:text-blue-400 focus:text-blue-400 focus:border-blue-500'}`}
              >
                <Timer className="w-4 h-4" />
                <span className="font-semibold">تایمر خواب</span>
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-12 right-0 bg-slate-900 border border-white/10 rounded-xl overflow-hidden w-36 py-1 z-30 dir-rtl">
                  <button
                    onMouseEnter={(e) => e.currentTarget.focus()}
                    onClick={() => selectSleepTimer(null)}
                    className="w-full text-right px-4 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    غیرفعال
                  </button>
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      onMouseEnter={(e) => e.currentTarget.focus()}
                      key={mins}
                      onClick={() => selectSleepTimer(mins)}
                      className="w-full text-right px-4 py-2 text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition-all"
                    >
                      {mins} دقیقه
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              onClick={toggleFullscreen}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-blue-400 focus:text-blue-400 focus:border-blue-500 transition-all outline-none"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
