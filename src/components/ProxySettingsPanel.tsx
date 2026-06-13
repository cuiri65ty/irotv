import React, { useState } from 'react';
import { Shield, RefreshCw, Key, HelpCircle, Save, Info, Check } from 'lucide-react';
import { ProxySettings } from '../types';

interface ProxySettingsPanelProps {
  settings: ProxySettings;
  onSave: (settings: ProxySettings) => void;
  onFocusChange?: (id: string) => void;
}

export default function ProxySettingsPanel({
  settings,
  onSave,
  onFocusChange,
}: ProxySettingsPanelProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [cookie, setCookie] = useState(settings.cookie);
  const [referer, setReferer] = useState(settings.referer);
  const [userAgent, setUserAgent] = useState(settings.userAgent);
  const [token, setToken] = useState(settings.token);
  const [tokenParam, setTokenParam] = useState(settings.tokenParam || 'token');
  const [tokenRenewEnabled, setTokenRenewEnabled] = useState(settings.tokenRenewEnabled);
  const [tokenRenewUrl, setTokenRenewUrl] = useState(settings.tokenRenewUrl);
  const [tokenRenewInterval, setTokenRenewInterval] = useState(settings.tokenRenewInterval || 45);
  const [tokenRenewKey, setTokenRenewKey] = useState(settings.tokenRenewKey || '');
  
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      enabled,
      sessionId: settings.sessionId,
      cookie: cookie.trim(),
      referer: referer.trim(),
      userAgent: userAgent.trim(),
      token: token.trim(),
      tokenParam: tokenParam.trim() || 'token',
      tokenRenewEnabled,
      tokenRenewUrl: tokenRenewUrl.trim(),
      tokenRenewInterval: Number(tokenRenewInterval) || 45,
      tokenRenewKey: tokenRenewKey.trim(),
    });

    setShowSavedMsg(true);
    setTimeout(() => {
      setShowSavedMsg(false);
    }, 3000);
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900/50 p-4 rounded-xl text-slate-200 select-none text-right dir-rtl"
      onFocus={() => onFocusChange?.('proxy_settings')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Shield className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-slate-100 font-sans">تنظیمات پیشرفته استریم و هدرها</h3>
        </div>
        <button
          onClick={() => {
            // Fill normal defaults
            setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            setTokenParam('token');
            setTokenRenewInterval(45);
          }}
          className="text-[10px] text-blue-400 font-bold hover:underline cursor-pointer"
        >
          مقادیر پیش‌فرض
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
        برخی شبکه‌ها برای پخش نیاز به نشست معتبر، کوکی اختصاصی یا توکن متغیر زمانی دارند. با فعال‌سازی پروکسی، این متغیرها توسط سرور میانی شبیه‌سازی و تزریق می‌شوند.
      </p>

      {showSavedMsg && (
        <div className="mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all">
          <Check className="w-4 h-4" />
          <span>تنظیمات و توکن با موفقیت ذخیره شدند</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
        {/* Toggle proxy check */}
        <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-lg border border-white/5">
          <div>
            <span className="text-xs font-bold text-slate-200 block">فعال‌سازی پروکسی سرور میانی</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">انتقال ترافیک کانال از سرور برای رفع خطای وب</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
          </label>
        </div>

        {/* Header fields (CORS Bypasses) */}
        {enabled && (
          <div className="space-y-3 p-3 bg-slate-950/30 rounded-lg border border-white/5">
            <span className="text-[11px] font-bold text-blue-400 block border-b border-white/5 pb-1 select-none">تنظیم هدرهای درخواستی (Headers)</span>
            
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">کوکی هدر (Cookie Raw String)</label>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="text"
                placeholder="cookie1=val; cookie2=val"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-650 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">ارجاع‌دهنده (Referrer / Referer Header)</label>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="text"
                placeholder="https://client-portal.xyz/live"
                value={referer}
                onChange={(e) => setReferer(e.target.value)}
                className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-650 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">مرورگر کاربر (User-Agent string)</label>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="text"
                placeholder="Mozilla/5.0 (SmartTV;...)"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-650 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
              />
            </div>
          </div>
        )}

        {/* Dynamic Token rotation setup */}
        <div className="space-y-3 p-3 bg-slate-950/30 rounded-lg border border-white/5">
          <span className="text-[11px] font-bold text-blue-400 block border-b border-white/5 pb-1 select-none">توکن نشست و تمدید خودکار (Session Token)</span>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">نام پارامتر در آدرس</label>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="text"
                value={tokenParam}
                onChange={(e) => setTokenParam(e.target.value)}
                className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">مقدار توکن زنده (Token/Key)</label>
              <input
                onMouseEnter={(e) => e.currentTarget.focus()}
                type="text"
                placeholder="JWT or Auth value"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-650 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
              />
            </div>
          </div>

          {/* Toggle token auto-renew checkbox */}
          <div className="flex items-center justify-between py-1 border-t border-white/5 mt-2">
            <div>
              <span className="text-[10px] font-bold text-slate-300">دریافت و تمدید خودکار توکن هر ۳۰–۶۰ ثانیه</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tokenRenewEnabled}
                onChange={(e) => setTokenRenewEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
            </label>
          </div>

          {tokenRenewEnabled && (
            <div className="space-y-2 mt-2 pt-2 border-t border-white/5">
              <div className="flex flex-col space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">لینک API دریافت توکن جدید</label>
                <input
                  onMouseEnter={(e) => e.currentTarget.focus()}
                  type="url"
                  placeholder="https://api.iptv.app/renew/token"
                  value={tokenRenewUrl}
                  onChange={(e) => setTokenRenewUrl(e.target.value)}
                  className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-650 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">بازه زمانی تکرار تمدید (ثانیه)</label>
                  <input
                    onMouseEnter={(e) => e.currentTarget.focus()}
                    type="number"
                    min="15"
                    max="600"
                    value={tokenRenewInterval}
                    onChange={(e) => setTokenRenewInterval(Number(e.target.value) || 45)}
                    className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">مسیر کلید JSON (اختیاری)</label>
                  <input
                    onMouseEnter={(e) => e.currentTarget.focus()}
                    type="text"
                    placeholder="مثال: data.auth_token"
                    value={tokenRenewKey}
                    onChange={(e) => setTokenRenewKey(e.target.value)}
                    className="w-full h-8 px-2 bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-650 rounded-lg outline-none focus:border-blue-500 transition-all ltr"
                  />
                </div>
              </div>

              <p className="text-[9px] text-slate-500 select-none">
                نکته: در صورتی که فیلد کلید JSON خالی باشد، پاسخ API مستقیماً به عنوان توکن متنی در نظر گرفته می‌شود.
              </p>
            </div>
          )}
        </div>

        <button
          onMouseEnter={(e) => e.currentTarget.focus()}
          type="submit"
          className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center space-x-1.5 space-x-reverse cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>ذخیره و اعمال تنظیمات پیشرفته</span>
        </button>
      </form>
    </div>
  );
}
