'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, ShieldAlert, Loader2, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { userService } from '@/lib/services/user';
import { requestNotificationPermission } from '@/lib/services/fcm';
import { useRouter } from 'next/navigation';
import { VaultDoorLock } from './VaultDoorLock';

export function AuthScreen() {
  const router = useRouter();
  const { user, setUser, pin, setPin, setUnlocked, setSidebarOpen } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth is not properly initialized. Please verify configuration.');
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      if (!firebaseUser.email) throw new Error('No email found in Google account');
      const normalizedEmail = firebaseUser.email.toLowerCase().trim();

      // Check if user email is pre-authorized in our Firestore DB
      const existingUser = await userService.getUserByEmail(normalizedEmail);
      
      if (existingUser) {
        if (!existingUser.isActive) {
          await auth.signOut();
          throw new Error('Your account has been disabled by the Admin.');
        }
        
        if (!existingUser.avatar && firebaseUser.photoURL) {
          await userService.updateUser(normalizedEmail, { avatar: firebaseUser.photoURL });
        }

        setUser({
          name: existingUser.name,
          role: existingUser.role,
          avatar: existingUser.avatar || firebaseUser.photoURL || 'AD',
          email: normalizedEmail
        });
        setSidebarOpen(false);
      } else {
        const isFirst = await userService.isFirstUser();
        
        if (isFirst) {
          const newUser = await userService.createOwner(
            normalizedEmail,
            firebaseUser.displayName || 'Owner',
            firebaseUser.photoURL || ''
          );
          setUser({
            name: newUser.name,
            role: newUser.role,
            avatar: newUser.avatar || 'AD',
            email: normalizedEmail
          });
          setSidebarOpen(false);
        } else {
          await auth.signOut();
          throw new Error('You are not authorized to access this dashboard. Contact the Admin to add your email.');
        }
      }
      
      requestNotificationPermission(normalizedEmail);
      
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('auth/unauthorized-domain')) {
        setError('এই লোকাল আইপি (192.168.10.248) Firebase-এ অনুমোদিত নয়। নিচের ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন অথবা Firebase Console-এ আইপিটি যোগ করুন।');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!auth) throw new Error('Firebase Auth not initialized');
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const cleanLoginEmail = loginEmail.toLowerCase().trim();
      const result = await signInWithEmailAndPassword(auth, cleanLoginEmail, loginPassword);
      const firebaseUser = result.user;

      if (!firebaseUser.email) throw new Error('No email found in account');
      const normalizedEmail = firebaseUser.email.toLowerCase().trim();

      const existingUser = await userService.getUserByEmail(normalizedEmail);
      
      if (existingUser) {
        if (!existingUser.isActive) {
          await auth.signOut();
          throw new Error('Your account has been disabled by the Admin.');
        }
        
        setUser({
          name: existingUser.name,
          role: existingUser.role,
          avatar: existingUser.avatar || normalizedEmail.charAt(0).toUpperCase(),
          email: normalizedEmail
        });
        setSidebarOpen(false);
      } else {
        await auth.signOut();
        throw new Error('You are not authorized to access this dashboard. Contact the Admin to add your email.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid Email or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[130px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-secondary/95 backdrop-blur-md border border-gray-800 rounded-3xl shadow-2xl p-5 sm:p-7 relative z-10 my-auto"
      >
        {/* If user is logged in (PIN Setup or Vault Door Unlock) */}
        {user ? (
          <VaultDoorLock
            expectedPin={pin}
            onUnlock={() => setUnlocked(true)}
            isSetupMode={!pin}
            onPinSet={(newPin) => {
              setPin(newPin);
              setUnlocked(true);
            }}
            userName={user.name}
            onResetPin={() => setPin(null)}
            onSignOut={async () => { 
              if (auth) await auth.signOut();
              setUser(null); 
              setPin(null); 
              router.push('/');
            }}
          />
        ) : (
          /* Sign In Screen (Google / Email) */
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-inner">
                <ShieldAlert className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1.5">Secure Login</h2>
              <p className="text-gray-400 text-sm">ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন</p>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#1b1f30] border border-gray-800 text-gray-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-blue-600/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  Sign In
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-gray-800 flex-1" />
                <span className="text-xs text-gray-500 font-medium">OR</span>
                <div className="h-px bg-gray-800 flex-1" />
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
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
