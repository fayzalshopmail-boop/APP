'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, LogIn, Lock, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { userService } from '@/lib/services/user';
import { requestNotificationPermission } from '@/lib/services/fcm';

import { useRouter } from 'next/navigation';

export function AuthScreen() {
  const router = useRouter();
  const { user, setUser, pin, setPin, setUnlocked, setSidebarOpen } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PIN states
  const [inputPin, setInputPin] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = () => {
    if (inputPin === pin) {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setInputPin('');
      setTimeout(() => setPinError(false), 800);
    }
  };

  // Auto-focus logic for PIN
  useEffect(() => {
    if (user && inputPin.length === 4) {
      handlePinSubmit();
    }
  }, [inputPin]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth || !googleProvider) {
        setUser({ name: 'Admin', role: 'Owner', avatar: 'AD' });
        return;
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      if (!firebaseUser.email) throw new Error('No email found in Google account');

      // Check if user email is pre-authorized in our Firestore DB
      const existingUser = await userService.getUserByEmail(firebaseUser.email);
      
      if (existingUser) {
        if (!existingUser.isActive) {
          await auth.signOut();
          throw new Error('Your account has been disabled by the Admin.');
        }
        
        // If they just logged in, we might want to update their avatar if it was empty
        if (!existingUser.avatar && firebaseUser.photoURL) {
          await userService.updateUser(firebaseUser.email, { avatar: firebaseUser.photoURL });
        }

        setUser({
          name: existingUser.name,
          role: existingUser.role,
          avatar: existingUser.avatar || firebaseUser.photoURL || 'AD',
          email: existingUser.email
        });
        setSidebarOpen(false);
      } else {
        // If user doesn't exist, check if they are the VERY FIRST user
        const isFirst = await userService.isFirstUser();
        
        if (isFirst) {
          // Make them the Owner
          const newUser = await userService.createOwner(
            firebaseUser.email,
            firebaseUser.displayName || 'Owner',
            firebaseUser.photoURL || ''
          );
          setUser({
            name: newUser.name,
            role: newUser.role,
            avatar: newUser.avatar || 'AD',
            email: newUser.email
          });
          setSidebarOpen(false);
        } else {
          // Not the first user, and not authorized
          await auth.signOut();
          throw new Error('You are not authorized to access this dashboard. Contact the Admin to add your email.');
        }
      }
      
      // Request FCM Push Notification Permission
      requestNotificationPermission(firebaseUser.email);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error('Firebase Auth not initialized');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const firebaseUser = result.user;

      if (!firebaseUser.email) throw new Error('No email found in account');

      const existingUser = await userService.getUserByEmail(firebaseUser.email);
      
      if (existingUser) {
        if (!existingUser.isActive) {
          await auth.signOut();
          throw new Error('Your account has been disabled by the Admin.');
        }
        
        setUser({
          name: existingUser.name,
          role: existingUser.role,
          avatar: existingUser.avatar || firebaseUser.email.charAt(0).toUpperCase(),
          email: existingUser.email
        });
        setSidebarOpen(false);
      } else {
        await auth.signOut();
        throw new Error('You are not authorized to access this dashboard. Contact the Admin to add your email.');
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err.message || 'Invalid Email or Password');
    } finally {
      setLoading(false);
    }
  };
  const handleDevBypass = () => {
    setUser({ name: 'Dev User', role: 'Dev', avatar: 'DV' });
  };


  const handlePinSetup = (val: string) => {
    if (!isConfirmingPin) {
      setSetupPin(val);
      if (val.length === 4) {
        setIsConfirmingPin(true);
      }
    } else {
      setInputPin(val);
      if (val.length === 4) {
        if (val === setupPin) {
          setPin(val);
          setUnlocked(true);
        } else {
          setPinError(true);
          setSetupPin('');
          setInputPin('');
          setIsConfirmingPin(false);
          setTimeout(() => setPinError(false), 800);
        }
      }
    }
  };

  const handleKeyClick = (key: string | number) => {
    const currentVal = !pin ? (isConfirmingPin ? inputPin : setupPin) : inputPin;
    
    if (key === 'DEL' || key === 'Backspace') {
      if (!pin) {
        isConfirmingPin 
          ? setInputPin(prev => prev.slice(0, -1))
          : setSetupPin(prev => prev.slice(0, -1));
      } else {
        setInputPin(prev => prev.slice(0, -1));
      }
    } else if (key === 'F') {
      // Fingerprint trigger placeholder
    } else if (currentVal.length < 4) {
      if (!pin) {
        handlePinSetup(currentVal + String(key));
      } else {
        setInputPin(prev => prev + String(key));
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (email, password)
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key >= '0' && e.key <= '9') {
        handleKeyClick(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleKeyClick('DEL');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, pin, isConfirmingPin, inputPin, setupPin]);

  // Render logic
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-secondary border border-gray-800 rounded-3xl shadow-2xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            {user ? <Lock className="w-8 h-8 text-blue-500" /> : <ShieldAlert className="w-8 h-8 text-blue-500" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {!user ? 'Secure Login' : !pin ? 'Setup PIN Code' : 'Enter PIN'}
          </h2>
          <p className="text-gray-400 text-sm">
            {!user 
              ? 'Authenticate to access Dashboard' 
              : !pin 
                ? (isConfirmingPin ? 'Confirm your 4-digit PIN' : 'Create a 4-digit PIN for quick access')
                : `Welcome back, ${user.name}`
            }
          </p>
        </div>

        {/* 1. Google Login State */}
        {!user && (
          <div className="space-y-4">
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Sign In
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="h-px bg-gray-800 flex-1"></div>
              <span className="text-xs text-gray-500 font-medium">OR</span>
              <div className="h-px bg-gray-800 flex-1"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={loading}
              className="w-full bg-[#1b1f30] hover:bg-gray-800 text-gray-300 border border-gray-800 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-70"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {(!auth || !googleProvider) && (
              <button onClick={handleDevBypass} className="w-full text-xs text-gray-500 hover:text-gray-400 underline mt-4">
                Dev Bypass (No Firebase Config)
              </button>
            )}
          </div>
        )}

        {/* 2 & 3. PIN Setup / Unlock State */}
        {user && (
          <div className="space-y-6">
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => {
                const val = !pin ? (isConfirmingPin ? inputPin[i] : setupPin[i]) : inputPin[i];
                return (
                  <motion.div 
                    key={i}
                    animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all
                      ${val 
                        ? (pinError ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-blue-500 text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]') 
                        : 'border-gray-800 text-gray-600 bg-popover'
                      }
                    `}
                  >
                    {val ? '\u2022' : ''}
                  </motion.div>
                );
              })}
            </div>

            {/* Custom Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto mt-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'F', 0, 'DEL'].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyClick(key)}
                  className={`h-16 rounded-xl flex items-center justify-center text-xl font-medium transition-all active:scale-95
                    ${key === 'F' ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' : 
                      key === 'DEL' ? 'text-gray-500 bg-gray-800/30 hover:bg-gray-800' : 
                      'text-gray-300 bg-gray-800/50 hover:bg-gray-700'
                    }
                  `}
                >
                  {key === 'F' ? <Fingerprint className="w-6 h-6" /> : key}
                </button>
              ))}
            </div>

            {pin && (
              <button 
                onClick={async () => { 
                  if (auth) await auth.signOut();
                  setUser(null); 
                  setPin(null); 
                  router.push('/');
                }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 mt-4 underline"
              >
                Sign out and reset PIN
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
