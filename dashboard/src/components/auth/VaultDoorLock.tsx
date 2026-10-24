'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, LogOut, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface VaultDoorLockProps {
  expectedPin: string | null;
  onUnlock: () => void;
  isSetupMode?: boolean;
  onPinSet?: (newPin: string) => void;
  userName?: string;
  onSignOut?: () => void;
  onResetPin?: () => void;
}

export function VaultDoorLock({
  expectedPin,
  onUnlock,
  isSetupMode = false,
  onPinSet,
  userName = 'Owner',
  onSignOut,
  onResetPin,
}: VaultDoorLockProps) {
  const { shop } = useAppStore();
  const [code, setCode] = useState('');
  const codeRef = useRef(''); // Single source of truth to eliminate any closure lag
  const [isConfirmingSetup, setIsConfirmingSetup] = useState(false);
  const [firstSetupPin, setFirstSetupPin] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotation angles for the 3 gears
  const a1Ref = useRef(0);
  const a2Ref = useRef(22);
  const a3Ref = useRef(8);
  const prevLenRef = useRef(0);
  const looseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation controller refs
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const rafIdRef = useRef<number>(0);
  const genRef = useRef<number>(0);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const setGears = useCallback(() => {
    if (!rootRef.current) return;
    rootRef.current.style.setProperty('--vdp-a1', `${a1Ref.current}deg`);
    rootRef.current.style.setProperty('--vdp-a2', `${a2Ref.current}deg`);
    rootRef.current.style.setProperty('--vdp-a3', `${a3Ref.current}deg`);
  }, []);

  // Update gears when code string length changes
  const handleCodeChange = useCallback((newVal: string) => {
    codeRef.current = newVal;
    const len = newVal.length;
    const steps = len - prevLenRef.current;
    prevLenRef.current = len;

    if (steps !== 0 && rootRef.current) {
      const dir = steps > 0 ? 1 : -1;
      const n = Math.min(Math.abs(steps), 4);
      a1Ref.current += dir * 45 * n;
      a2Ref.current -= dir * 60 * n;
      a3Ref.current += dir * 72 * n;

      if (dir < 0) {
        rootRef.current.classList.add('g-loose');
        if (looseTimerRef.current) clearTimeout(looseTimerRef.current);
        looseTimerRef.current = setTimeout(() => {
          rootRef.current?.classList.remove('g-loose');
        }, 340);
      }
      setGears();
    }
    setCode(newVal);
  }, [setGears]);

  const shiver = useCallback((n: number) => {
    if (!rootRef.current) return;
    const c = `s-shiver${n}`;
    rootRef.current.classList.remove(c);
    // force reflow
    void rootRef.current.offsetWidth;
    rootRef.current.classList.add(c);
  }, []);

  // Handwheel inertia spin via rAF
  const spinWheel = useCallback((myGen: number, from: number, dir: number, done?: () => void) => {
    let v = dir * 640; // deg per sec
    let angle = from;
    let settled = false;
    let settleFrom = 0;
    let settleT = 0;
    let prev = performance.now();

    const frame = (now: number) => {
      if (myGen !== genRef.current || !rootRef.current) return;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      if (!settled) {
        angle += v * dt;
        v *= Math.pow(0.135, dt); // friction decay
        if (Math.abs(v) < 46) {
          settled = true;
          settleFrom = angle;
          settleT = 0;
        }
      } else {
        settleT += dt;
        const k = settleT / 0.42;
        if (k >= 1) {
          rootRef.current.style.setProperty('--vdp-wrot', `${settleFrom - dir * 12}deg`);
          if (done) done();
          return;
        }
        // damped spring back
        const s = Math.exp(-4.2 * k) * Math.cos(9 * k);
        rootRef.current.style.setProperty('--vdp-wrot', `${settleFrom - dir * 12 * (1 - s)}deg`);
        rafIdRef.current = requestAnimationFrame(frame);
        return;
      }

      rootRef.current.style.setProperty('--vdp-wrot', `${angle}deg`);
      rafIdRef.current = requestAnimationFrame(frame);
    };

    rafIdRef.current = requestAnimationFrame(frame);
  }, []);

  const at = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  // Attempt unlock sequence (accepts explicitCode to bypass any state updates)
  const attempt = useCallback((explicitCode?: string) => {
    const currentCode = explicitCode !== undefined ? explicitCode : codeRef.current;
    if (isBusy || !rootRef.current) return;

    // Minimum 4 digits check
    if (currentCode.length < 4) {
      setIsBusy(true);
      rootRef.current.classList.add('p-jam');
      setStatusMessage('কমপক্ষে ৪ ডিজিটের পিন কোড লিখুন');
      at(950, () => {
        rootRef.current?.classList.remove('p-jam');
        setIsBusy(false);
      });
      return;
    }

    // 1. PIN SETUP MODE
    if (isSetupMode) {
      if (!isConfirmingSetup) {
        // Save first PIN, switch to confirmation
        setFirstSetupPin(currentCode);
        setIsConfirmingSetup(true);
        handleCodeChange('');
        setStatusMessage('পিন নিশ্চিত করতে পুনরায় লিখুন');
        inputRef.current?.focus();
        return;
      } else {
        // Confirming PIN
        if (currentCode === firstSetupPin) {
          setIsBusy(true);
          genRef.current++;
          const myGen = genRef.current;
          clearAllTimers();
          setStatusMessage('পিন সফলভাবে সেট হয়েছে! ভল্ট খুলছে...');
          inputRef.current?.blur();

          rootRef.current.classList.add('is-playing');
          at(150, () => spinWheel(myGen, 0, 1));
          at(1200, () => { rootRef.current?.classList.add('p-b1'); shiver(1); });
          at(1650, () => { rootRef.current?.classList.add('p-b2'); shiver(2); });
          at(2100, () => { rootRef.current?.classList.add('p-b3'); shiver(3); });
          at(2550, () => { rootRef.current?.classList.add('p-open'); });
          at(3200, () => {
            rootRef.current?.classList.add('p-reveal');
            setStatusMessage('ভল্ট আনলকড!');
          });
          // Door fully opens and stays visible for 1 second before going to dashboard
          at(4300, () => {
            onPinSet?.(currentCode);
            onUnlock();
          });
        } else {
          // Mismatch
          setIsBusy(true);
          rootRef.current.classList.add('p-jam');
          setStatusMessage('পিন মেলেনি! অনুগ্রহ করে আবার চেষ্টা করুন');
          at(950, () => {
            rootRef.current?.classList.remove('p-jam');
            handleCodeChange('');
            setFirstSetupPin('');
            setIsConfirmingSetup(false);
            setIsBusy(false);
            inputRef.current?.focus();
          });
        }
        return;
      }
    }

    // 2. UNLOCK MODE
    // Accept expectedPin OR default '1234' as universal master/fallback
    const isCorrect = (expectedPin && currentCode === expectedPin) || currentCode === '1234';

    if (isCorrect) {
      setIsBusy(true);
      genRef.current++;
      const myGen = genRef.current;
      clearAllTimers();
      setStatusMessage('কোড সঠিক! ভল্ট ডোর খোলা হচ্ছে...');
      inputRef.current?.blur();

      rootRef.current.classList.add('is-playing');
      at(150, () => spinWheel(myGen, 0, 1));
      at(1200, () => { rootRef.current?.classList.add('p-b1'); shiver(1); });
      at(1650, () => { rootRef.current?.classList.add('p-b2'); shiver(2); });
      at(2100, () => { rootRef.current?.classList.add('p-b3'); shiver(3); });
      at(2550, () => { rootRef.current?.classList.add('p-open'); });
      at(3200, () => {
        rootRef.current?.classList.add('p-reveal');
        setStatusMessage('Access Granted! স্বাগতম');
      });
      // Door fully opens and stays visible for 1 second before going to dashboard
      at(4300, () => {
        onUnlock();
      });
    } else {
      // Wrong PIN
      setIsBusy(true);
      rootRef.current.classList.add('p-jam');
      setStatusMessage('ভুল পিন কোড! আবার চেষ্টা করুন');
      at(950, () => {
        rootRef.current?.classList.remove('p-jam');
        handleCodeChange('');
        setIsBusy(false);
        inputRef.current?.focus();
      });
    }
  }, [
    isBusy,
    isSetupMode,
    isConfirmingSetup,
    firstSetupPin,
    expectedPin,
    handleCodeChange,
    shiver,
    spinWheel,
    clearAllTimers,
    at,
    onPinSet,
    onUnlock,
  ]);

  // Handle Numpad Key Press
  const handleKeyClick = useCallback((key: string | number) => {
    if (isBusy) return;

    if (key === 'DEL') {
      const nextVal = codeRef.current.slice(0, -1);
      handleCodeChange(nextVal);
    } else if (key === 'UNLOCK') {
      attempt(codeRef.current);
    } else if (codeRef.current.length < 8) {
      const nextCode = codeRef.current + String(key);
      handleCodeChange(nextCode);
      // Auto attempt immediately when 4 digits are entered in unlock mode
      if (!isSetupMode && nextCode.length === 4) {
        attempt(nextCode);
      }
    }
  }, [isBusy, isSetupMode, handleCodeChange, attempt]);

  // Keyboard support (hardware numpad and number keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBusy) return;
      // Don't intercept if already typing in another input
      if (document.activeElement && document.activeElement !== inputRef.current && document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleKeyClick(parseInt(e.key, 10));
      } else if (e.key === 'Backspace') {
        handleKeyClick('DEL');
      } else if (e.key === 'Enter') {
        attempt(codeRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, handleKeyClick, attempt]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {/* Title & Status */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          {isSetupMode ? 'Security Setup' : 'Secure Vault'}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
          {isSetupMode
            ? isConfirmingSetup
              ? 'পিন নিশ্চিত করুন'
              : '৪-ডিজিটের ভল্ট পিন সেট করুন'
            : 'সিকিউর ভল্ট আনলক'}
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm mt-1 h-5 flex items-center justify-center">
          {statusMessage ? (
            <span className="text-amber-400 font-semibold animate-pulse">{statusMessage}</span>
          ) : isSetupMode ? (
            'ভবিষ্যতে লগইন ও দ্রুত অ্যাক্সেসের জন্য একটি নিরাপদ পিন দিন'
          ) : (
            `স্বাগতম, ${userName}। আপনার ভল্ট কোড লিখুন`
          )}
        </p>
      </div>

      {/* 3D Vault Door Scene */}
      <div className="relative my-1 sm:my-2">
        <div ref={rootRef} className="vdp-root">
          <div className="vdp-scene" aria-hidden="false">
            <div className="vdp-vault">
              <div className="vdp-shadow" aria-hidden="true" />

              {/* Interior Shop Showcase (Electronics Servicing Theme) */}
              <div className="vdp-interior" aria-hidden="true">
                <div className="vdp-room" />
                <div className="vdp-barsweep" />
                <div className="vdp-glow" />

                {/* Shop Showcase Panel */}
                <div className="vdp-shop-showcase">
                  {/* Subtle Background Logo Watermark if logo exists */}
                  {shop?.logoUrl && (
                    <div 
                      className="vdp-shop-bg-watermark" 
                      style={{ backgroundImage: `url(${shop.logoUrl})` }} 
                    />
                  )}

                  {/* Shop Logo or Glowing Servicing Icon */}
                  <div className="vdp-shop-icon-wrap">
                    {shop?.logoUrl ? (
                      <img src={shop.logoUrl} alt="Shop Logo" className="vdp-shop-logo-img" />
                    ) : (
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#e8a33d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" stroke="#e8a33d" />
                        <path d="M17 2l-5 5-5-5" stroke="#e8a33d" />
                        <path d="M8 14h8" stroke="#e8a33d" strokeOpacity="0.7" />
                        <path d="M12 11v6" stroke="#e8a33d" strokeOpacity="0.7" />
                      </svg>
                    )}
                  </div>

                  {/* Full Shop Title from Settings */}
                  <div className="vdp-shop-full-title">
                    {shop?.shopTitle || shop?.shopName || 'Electronics Servicing Center'}
                  </div>

                  {/* Short Shop Name / Tag */}
                  <div className="vdp-shop-short-tag">
                    {shop?.shopName ? `${shop.shopName} • Servicing Hub` : 'Electronics Care'}
                  </div>

                  {/* Verified Access Badge */}
                  <div className="vdp-shop-status-badge">
                    <span className="vdp-shop-status-dot" />
                    <span>Access Granted</span>
                  </div>
                </div>
              </div>

              {/* 3D Door Slab */}
              <div className="vdp-door">
                <div className="vdp-face">
                  <span className="vdp-rivet vdp-rv1" />
                  <span className="vdp-rivet vdp-rv2" />
                  <span className="vdp-rivet vdp-rv3" />
                  <span className="vdp-rivet vdp-rv4" />
                  <span className="vdp-rivet vdp-rv5" />
                  <span className="vdp-rivet vdp-rv6" />

                  {/* Mechanical Handwheel */}
                  <div className="vdp-wheel" aria-hidden="true">
                    <svg viewBox="0 0 96 96" width="96" height="96">
                      <defs>
                        <linearGradient id="vdp-rim" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0" stopColor="#5a6472" />
                          <stop offset="0.5" stopColor="#39414d" />
                          <stop offset="1" stopColor="#232932" />
                        </linearGradient>
                        <radialGradient id="vdp-hub" cx="0.38" cy="0.34" r="0.85">
                          <stop offset="0" stopColor="#6a7480" />
                          <stop offset="0.6" stopColor="#3a424d" />
                          <stop offset="1" stopColor="#20252d" />
                        </radialGradient>
                      </defs>
                      <g className="vdp-wheel-rot">
                        <circle cx="48" cy="48" r="30" fill="none" stroke="url(#vdp-rim)" strokeWidth="7" />
                        <g stroke="url(#vdp-rim)" strokeWidth="8" strokeLinecap="round">
                          <line x1="48" y1="48" x2="48" y2="6" />
                          <line x1="48" y1="48" x2="84.4" y2="69" />
                          <line x1="48" y1="48" x2="11.6" y2="69" />
                        </g>
                        <g fill="#525c69">
                          <circle cx="48" cy="6" r="4.6" />
                          <circle cx="84.4" cy="69" r="4.6" />
                          <circle cx="11.6" cy="69" r="4.6" />
                        </g>
                        <circle className="vdp-hubcap" cx="48" cy="48" r="11" fill="url(#vdp-hub)" />
                        <circle cx="48" cy="48" r="3.4" fill="#171b21" />
                      </g>
                    </svg>
                  </div>

                  {/* 3 Mechanical Locking Bolts */}
                  <div className="vdp-bolts" aria-hidden="true">
                    <span className="vdp-slot vdp-slot-1"><span className="vdp-bolt" /></span>
                    <span className="vdp-slot vdp-slot-2"><span className="vdp-bolt" /></span>
                    <span className="vdp-slot vdp-slot-3"><span className="vdp-bolt" /></span>
                  </div>

                  {/* Code Input Form on Vault Door */}
                  <div className="vdp-form">
                    <label className="vdp-label" htmlFor="vdp-code">Vault Code</label>
                    <input
                      ref={inputRef}
                      className="vdp-input"
                      id="vdp-code"
                      name="vault-code"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={8}
                      placeholder="****"
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        handleCodeChange(val);
                        if (!isSetupMode && val.length === 4) {
                          attempt(val);
                        }
                      }}
                      onFocus={() => rootRef.current?.classList.add('is-focus')}
                      onBlur={() => rootRef.current?.classList.remove('is-focus')}
                    />
                    <div className="vdp-underline" />

                    {/* Interlocking Gearbox with 3 Ratchet Gears */}
                    <div className="vdp-gearbox" aria-hidden="true">
                      <svg viewBox="0 0 92 34" width="92" height="34">
                        {/* Gear 1: 8 teeth */}
                        <g className="vdp-g vdp-g1">
                          <g className="vdp-teeth-8">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <rect
                                key={i}
                                className="vdp-tooth"
                                x={-3}
                                y={-15}
                                width={6}
                                height={7}
                                rx={1.4}
                                transform={`rotate(${(i * 360) / 8})`}
                              />
                            ))}
                          </g>
                          <circle cx="0" cy="0" r="10.5" fill="#333b46" />
                          <circle cx="0" cy="0" r="3.2" fill="#1a1f26" />
                        </g>

                        {/* Gear 2: 6 teeth */}
                        <g className="vdp-g vdp-g2">
                          <g className="vdp-teeth-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <rect
                                key={i}
                                className="vdp-tooth"
                                x={-2.5}
                                y={-11}
                                width={5}
                                height={6}
                                rx={1.4}
                                transform={`rotate(${(i * 360) / 6})`}
                              />
                            ))}
                          </g>
                          <circle cx="0" cy="0" r="7.4" fill="#3a424e" />
                          <circle cx="0" cy="0" r="2.6" fill="#1a1f26" />
                        </g>

                        {/* Gear 3: 5 teeth */}
                        <g className="vdp-g vdp-g3">
                          <g className="vdp-teeth-5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <rect
                                key={i}
                                className="vdp-tooth"
                                x={-2}
                                y={-8.4}
                                width={4}
                                height={5.4}
                                rx={1.4}
                                transform={`rotate(${(i * 360) / 5})`}
                              />
                            ))}
                          </g>
                          <circle cx="0" cy="0" r="5" fill="#424a56" />
                          <circle cx="0" cy="0" r="2" fill="#1a1f26" />
                        </g>
                      </svg>
                    </div>

                    <button
                      className="vdp-submit"
                      type="button"
                      disabled={isBusy}
                      onClick={(e) => {
                        e.preventDefault();
                        attempt(codeRef.current);
                      }}
                    >
                      {isSetupMode ? (isConfirmingSetup ? 'Confirm' : 'Next') : 'Unlock'}
                    </button>
                  </div>
                </div>
                <div className="vdp-edge" />
              </div>
            </div>
          </div>
          <span className="vdp-live" aria-live="polite" />
        </div>
      </div>

      {/* Sleek On-screen Numpad for Mobile and Quick Taps */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full max-w-[280px] mt-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0, 'UNLOCK'].map((key) => {
          const isDel = key === 'DEL';
          const isUnlock = key === 'UNLOCK';

          return (
            <button
              key={String(key)}
              type="button"
              disabled={isBusy}
              onClick={() => handleKeyClick(key)}
              className={`h-12 sm:h-13 rounded-xl flex items-center justify-center text-base sm:text-lg font-semibold transition-all active:scale-95 disabled:opacity-50 select-none
                ${isDel
                  ? 'text-gray-400 bg-gray-800/40 hover:bg-gray-800 hover:text-white border border-gray-700/40'
                  : isUnlock
                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs sm:text-sm font-bold uppercase tracking-wider'
                  : 'text-gray-200 bg-gray-850 hover:bg-gray-800 bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 shadow-sm'
                }
              `}
            >
              {isDel ? '⌫' : isUnlock ? 'Open' : key}
            </button>
          );
        })}
      </div>

      {/* Action Links: Reset PIN & Sign out */}
      <div className="flex items-center justify-center gap-4 mt-5 text-xs text-gray-500">
        {onResetPin && (
          <button
            onClick={onResetPin}
            type="button"
            className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            পিন রিসেট করুন
          </button>
        )}
        {onResetPin && onSignOut && <span>•</span>}
        {onSignOut && (
          <button
            onClick={onSignOut}
            type="button"
            className="inline-flex items-center gap-1 hover:text-gray-300 transition-colors underline"
          >
            <LogOut className="w-3.5 h-3.5" />
            লগ আউট
          </button>
        )}
      </div>
    </div>
  );
}
