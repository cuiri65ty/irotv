import React, { useState } from 'react';
import { Link2, Upload, FileText, Play, Plus, BookOpen, Trash2, ShieldAlert } from 'lucide-react';
import { parseM3U } from '../utils/m3uParser';
import { Channel } from '../types';

interface PlaylistManagerProps {
  onImportPlaylist: (name: string, channels: Channel[]) => void;
  onClearPlaylists: () => void;
  hasCustomPlaylists: boolean;
  onSelectDirectStream: (channel: Channel) => void;
  onFocusChange?: (id: string) => void;
}

export default function PlaylistManager({
  onImportPlaylist,
  onClearPlaylists,
  hasCustomPlaylists,
  onSelectDirectStream,
  onFocusChange,
}: PlaylistManagerProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'direct' | 'paste'>('url');
  
  // URL Tab
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistName, setPlaylistName] = useState('');
  
  // Direct Stream Tab
  const [directUrl, setDirectUrl] = useState('');
  const [directName, setDirectName] = useState('');
  const [directCategory, setDirectCategory] = useState('');

  // Paste Text Tab
  const [pastedText, setPastedText] = useState('');
  const [pasteName, setPasteName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const displayError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setIsLoading(false);
  };

  const displaySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setIsLoading(false);
  };

  // 1. Fetch & parse remote M3U URL
  const handleLoadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // In web app, we try to load the URL. Keep in mind CORS could block.
      // We warn the user about CORS so they can upload the file as fallback.
      const response = await fetch(playlistUrl);
      if (!response.ok) {
        throw new Error('خطا در بارگذاری فایل. کد پاسخ: ' + response.status);
      }
      const text = await response.text();
      const parsedChannels = parseM3U(text);

      if (parsedChannels.length === 0) {
        throw new Error('فرمت فایل معتبر نیست یا هیچ شبکه فعالی پیدا نشد.');
      }

      onImportPlaylist(playlistName.trim() || 'پلی‌لیست بارگذاری شده', parsedChannels);
      displaySuccess(`با موفقیت ${parsedChannels.length} شبکه اضافه شد!`);
      setPlaylistUrl('');
      setPlaylistName('');
    } catch (err: any) {
      displayError(
        'خطای دسترسی CORS یا شبکه. برخی سرورهای IPTV اجازه لود مستقیم در مرورگر را نمی‌دهند. لطفاً فایل M3U را دانلود کرده و از زبانه "آپلود فایل" استفاده کنید.'
      );
    }
  };

  // 2. Handle File upload selector (CORS totally bypassed!)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('فایل خالی است.');

        const parsedChannels = parseM3U(text);
        if (parsedChannels.length === 0) {
          throw new Error('شبکه معتبری در پلی‌لیست یافت نشد.');
        }

        onImportPlaylist(file.name.replace('.m3u', '').replace('.m3u8', ''), parsedChannels);
        displaySuccess(`با موفقیت ${parsedChannels.length} شبکه از فایل آپلود شد!`);
      } catch (err: any) {
        displayError(err.message || 'خطا در خواندن فایل.');
      }
    };

    reader.onerror = () => {
      displayError('خطا در لود فایل محلی.');
    };

    reader.readAsText(file);
  };

  // 3. Paste Raw M3U Source
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const parsedChannels = parseM3U(pastedText);
      if (parsedChannels.length === 0) {
        throw new Error('شبکه معتبری در پلی‌لیست یافت نشد.');
      }

      onImportPlaylist(pasteName.trim() || 'متن پیست شده', parsedChannels);
      displaySuccess(`با موفقیت ${parsedChannels.length} شبکه اضافه شد!`);
      setPastedText('');
      setPasteName('');
    } catch (err: any) {
      displayError(err.message || 'خطا در خواندن متن.');
    }
  };

  // 4. Quick Direct play Stream URL
  const handleDirectPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrl.trim()) return;

    const streamName = directName.trim() || 'استریم سفارشی';
    const streamCat = directCategory.trim() || 'استریم مستقیم';

    const customChan: Channel = {
      id: `direct-${Date.now()}`,
      name: streamName,
      url: directUrl.trim(),
      category: streamCat,
    };

    onSelectDirectStream(customChan);
    displaySuccess(`شبکه دستی "${streamName}" برای پخش ارسال شد!`);
    setDirectUrl('');
    setDirectName('');
    setDirectCategory('');
  };

  return (
    <div 
      className="glass-panel shadow-2xl rounded-2xl p-4 md:p-6 relative overflow-hidden"
      onFocus={() => onFocusChange?.('playlist_importer')}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5 dir-rtl">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-sans">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>بارگذاری و افزودن استریم</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            لینک پلی‌لیست IPTV، فایل M3u یا استریم مستقیم خود را برای شروع پخش وارد کنید.
          </p>
        </div>

        {hasCustomPlaylists && (
          <button
            onMouseEnter={(e) => e.currentTarget.focus()}
            onClick={onClearPlaylists}
            className="flex items-center space-x-1.5 space-x-reverse px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/20 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاکسازی پلی‌لیست‌ها</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-5 dir-rtl font-sans">
        <button
          onMouseEnter={(e) => e.currentTarget.focus()}
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer ${activeTab === 'url' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-white'}`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>آدرس پلی‌لیست (M3U URL)</span>
        </button>

        <button
          onMouseEnter={(e) => e.currentTarget.focus()}
          onClick={() => setActiveTab('file')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer ${activeTab === 'file' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-white'}`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>آپلود فایل M3U</span>
        </button>

        <button
          onMouseEnter={(e) => e.currentTarget.focus()}
          onClick={() => setActiveTab('paste')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer ${activeTab === 'paste' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-white'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>کد منبع M3U</span>
        </button>

        <button
          onMouseEnter={(e) => e.currentTarget.focus()}
          onClick={() => setActiveTab('direct')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer ${activeTab === 'direct' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-white'}`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>پخش استریم تک کاناله</span>
        </button>
      </div>

      {/* Alert Boxes */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2.5 dir-rtl text-right">
          <ShieldAlert className="w-4.5 h-4.5 min-w-[18px] text-rose-500" />
          <span className="font-medium leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 dir-rtl text-right font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Panels */}
      <div className="dir-rtl">
        {/* PANEL: URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleLoadUrl} className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400">نام پلی‌لیست (اختیاری)</label>
                <input
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  type="text"
                  placeholder="مثال: شبکه های خبری"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full h-10 px-4 bg-black/40 border border-white/10 text-sm text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div className="flex flex-col space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400">آدرس اینترنتی M3u URL</label>
                <input
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  type="url"
                  required
                  placeholder="https://example.com/playlist.m3u"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="w-full h-10 px-4 bg-black/40 border border-white/10 text-sm text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/10 font-medium ltr"
                />
              </div>
            </div>

            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'در حال بارگذاری...' : 'بارگذاری و افزودن شبکه‌ها'}</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              توضیح: برخی آدرس‌های مستقیم به دلیل محدودیت امنیت مرورگر (CORS) ممکن است بارگذاری نشوند. در این صورت ابتدا فایل را دانلود کرده و از زبانه آپلود فایل استفاده کنید.
            </p>
          </form>
        )}

        {/* PANEL: FILE UPLOAD */}
        {activeTab === 'file' && (
          <div className="text-center font-sans">
            <label className="border-2 border-dashed border-white/10 hover:border-blue-500/50 bg-white/5 p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition focus-within:border-blue-500 group">
              <input
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={handleFileUpload}
                className="sr-only"
              />
              <Upload className="w-10 h-10 text-blue-500 animate-bounce animate-duration-1000 group-hover:text-blue-400" />
              <span className="text-sm font-bold text-slate-200 mt-2">انتخاب یا درگ فایل `.m3u`</span>
              <span className="text-xs text-slate-500">فایل پلی‌لیست IPTV خود را از حافظه تلویزیون یا موبایل انتخاب نمایید.</span>
            </label>
            <p className="text-[10px] text-slate-500 text-center mt-3 leading-relaxed">
              نکته: آپلود فایل محلی ۱۰۰ درصد مشکلات خطای CORS را برطرف می‌کند و با سرعت بالا اجرا می‌شود.
            </p>
          </div>
        )}

        {/* PANEL: PASTE TEXT */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-3.5">
            <div className="flex flex-col space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-400">نام دسته پلی‌لیست</label>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="text"
                placeholder="مثال: منبع اختصاصی"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
                className="w-full h-10 px-4 bg-black/40 border border-white/10 text-sm text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="flex flex-col space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-400 text-right">کد منبع متنی (M3U Plain Text)</label>
              <textarea
                onFocus={() => onFocusChange?.('playlist_importer')}
                onMouseEnter={(e) => e.currentTarget.focus()}
                required
                rows={4}
                placeholder={`#EXTM3U\n#EXTINF:-1,نام شبکه\nhttp://example.com/stream.m3u8`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full p-4 bg-black/40 border border-white/10 text-sm text-slate-200 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/10 font-mono tracking-wide ltr"
              />
            </div>

            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>پردازش متنی و ساخت شبکه</span>
            </button>
          </form>
        )}

        {/* PANEL: DIRECT SINGLE STREAM */}
        {activeTab === 'direct' && (
          <form onSubmit={handleDirectPlay} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400">دسته‌بندی (مثال: مستند / ورزشی)</label>
                <input
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  type="text"
                  placeholder="فیلم و سریال"
                  value={directCategory}
                  onChange={(e) => setDirectCategory(e.target.value)}
                  className="w-full h-10 px-4 bg-black/40 border border-white/10 text-sm text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="flex flex-col space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400">نام شبکه</label>
                <input
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  type="text"
                  required
                  placeholder="شبکه ۳ اچ‌دی"
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  className="w-full h-10 px-4 bg-black/40 border border-white/10 text-sm text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="flex flex-col space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400">آدرس مستقیم استریم (.m3u8 / .mp4)</label>
                <input
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  type="url"
                  required
                  placeholder="http://iptv.server:8080/live/..."
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  className="w-full h-10 px-4 bg-black/40 border border-white/10 text-sm text-slate-100 placeholder-slate-650 rounded-xl outline-none focus:border-blue-500 transition-all focus:ring-2 focus:ring-blue-500/10 font-mono ltr"
                />
              </div>
            </div>

            <button
              onMouseEnter={(e) => e.currentTarget.focus()}
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>پخش مستقیم فوری</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
