import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { hasValidClerkKey } from './config';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'github' | 'google';
}

interface AuthContextValue {
  /** A Clerk key is set: sign-in is Clerk's own UI (see ClerkNavAuth), not this context. */
  isClerkConfigured: boolean;
  /** Some sign-in exists. False in a production build without a Clerk key. */
  isAuthAvailable: boolean;
  /** The fields below describe the development fallback only; in Clerk mode they stay empty. */
  isSignedIn: boolean;
  user: AuthUser | null;
  isOpen: boolean;
  view: 'sign-in' | 'sign-up';
  lastUsedProvider: 'github' | 'google' | null;
  openSignIn: () => void;
  openSignUp: () => void;
  closeModal: () => void;
  setView: (v: 'sign-in' | 'sign-up') => void;
  signInWithProvider: (provider: 'github' | 'google') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'codeadda:auth:user';
const LAST_USED_KEY = 'codeadda:auth:last_provider';

function getLocalUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function getLastUsed(): 'github' | 'google' | null {
  try {
    const v = localStorage.getItem(LAST_USED_KEY);
    return v === 'github' || v === 'google' ? v : null;
  } catch {
    return null;
  }
}

const DEFAULT_AUTH: AuthContextValue = {
  isClerkConfigured: false,
  isAuthAvailable: false,
  isSignedIn: false,
  user: null,
  isOpen: false,
  view: 'sign-in',
  lastUsedProvider: null,
  openSignIn: () => {},
  openSignUp: () => {},
  closeModal: () => {},
  setView: () => {},
  signInWithProvider: async () => {},
  signOut: async () => {},
};

const CLERK_AUTH: AuthContextValue = { ...DEFAULT_AUTH, isClerkConfigured: true, isAuthAvailable: true };

/**
 * Development and tests only (no Clerk key): a fake sign-in kept in memory and localStorage, so the
 * interface can be built without an account. It authenticates nobody and never runs in production.
 */
function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getLocalUser);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [lastUsedProvider, setLastUsedProvider] = useState<'github' | 'google' | null>(() => getLastUsed() ?? 'github');

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const signInWithProvider = async (provider: 'github' | 'google') => {
    localStorage.setItem(LAST_USED_KEY, provider);
    setLastUsedProvider(provider);
    const mockUser: AuthUser = {
      id: `usr_${Date.now()}`,
      name: provider === 'github' ? 'Alex Rivera' : 'Alex R.',
      email: provider === 'github' ? 'alex.rivera@github.com' : 'alex.rivera@gmail.com',
      avatarUrl: undefined,
      provider,
    };
    setUser(mockUser);
    setIsOpen(false);
  };

  const signOut = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isClerkConfigured: false,
        isAuthAvailable: true,
        isSignedIn: user !== null,
        user,
        isOpen,
        view,
        lastUsedProvider,
        openSignIn: () => {
          setView('sign-in');
          setIsOpen(true);
        },
        openSignUp: () => {
          setView('sign-up');
          setIsOpen(true);
        },
        closeModal: () => setIsOpen(false),
        setView,
        signInWithProvider,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Real sign-in: Clerk's components are mounted by the navbar and loaded on demand.
  if (hasValidClerkKey) return <AuthContext.Provider value={CLERK_AUTH}>{children}</AuthContext.Provider>;
  // Vite turns import.meta.env.DEV into false in a production build, which removes LocalAuthProvider, and
  // its made-up user, from the shipped site altogether.
  if (import.meta.env.DEV) return <LocalAuthProvider>{children}</LocalAuthProvider>;
  // A production build without a key: no sign-in is offered.
  return <AuthContext.Provider value={DEFAULT_AUTH}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? DEFAULT_AUTH;
}
