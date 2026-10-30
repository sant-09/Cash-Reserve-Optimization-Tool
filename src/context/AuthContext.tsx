import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types/finance';

export interface User {
  uid?: string;
  email: string;
  name: string;
  businessName: string;
  role: UserRole;
  photoURL?: string;
  isFirebaseUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => { success: boolean; error?: string };
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  fillDemoCredentials: () => { email: string; pass: string };
  switchRole: (role: UserRole) => void;
  isAuthLoading: boolean;
}

const STORAGE_KEY_AUTH = 'cashwise_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Authenticated with Firebase
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          let businessName = 'My Enterprise';
          let role: UserRole = 'owner';
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data?.businessName) businessName = data.businessName;
            if (data?.role === 'finance' || data?.role === 'owner') role = data.role;
          }

          const authenticatedUser: User = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            businessName,
            role,
            photoURL: fbUser.photoURL || undefined,
            isFirebaseUser: true,
          };
          setUser(authenticatedUser);
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authenticatedUser));
        } catch (error) {
          console.warn('Could not read user profile from Firestore:', error);
          const fallbackUser: User = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'User',
            businessName: 'My Enterprise',
            role: 'owner',
            isFirebaseUser: true,
          };
          setUser(fallbackUser);
        }
      } else {
        // Check local storage for demo credentials
        const saved = localStorage.getItem(STORAGE_KEY_AUTH);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (!parsed.isFirebaseUser) {
              setUser({
                ...parsed,
                role: parsed.role === 'finance' ? 'finance' : 'owner',
              });
            } else {
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Sign-In with Firebase Auth
  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      // Persist profile in Firestore
      const userRef = doc(db, 'users', fbUser.uid);
      const profileData = {
        email: fbUser.email || '',
        name: fbUser.displayName || 'User',
        businessName: 'My Enterprise',
        role: 'owner',
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, profileData, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
      }

      const authenticatedUser: User = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || 'User',
        businessName: 'My Enterprise',
        role: 'owner',
        photoURL: fbUser.photoURL || undefined,
        isFirebaseUser: true,
      };

      setUser(authenticatedUser);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authenticatedUser));
      return { success: true };
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign in with Google.',
      };
    }
  };

  // Standard demo login
  const login = (email: string, pass: string): { success: boolean; error?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = pass.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!trimmedPass) {
      return { success: false, error: 'Password cannot be empty.' };
    }

    if (trimmedEmail === 'demo@cashwise.com' && trimmedPass === 'demo123') {
      const authenticatedUser: User = {
        email: 'demo@cashwise.com',
        name: 'Rajesh Sharma',
        businessName: 'Apex Craft Digital & Retail',
        role: 'owner',
        isFirebaseUser: false,
      };
      setUser(authenticatedUser);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authenticatedUser));
      return { success: true };
    }

    if (trimmedPass.length >= 6) {
      const authenticatedUser: User = {
        email: trimmedEmail,
        name: trimmedEmail.split('@')[0].replace('.', ' '),
        businessName: 'My Enterprise',
        role: 'owner',
        isFirebaseUser: false,
      };
      setUser(authenticatedUser);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authenticatedUser));
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Use demo@cashwise.com / demo123, or Google Sign-In above.',
    };
  };

  const switchRole = (newRole: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = { ...prev, role: newRole };
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
      if (prev.isFirebaseUser && prev.uid) {
        setDoc(doc(db, 'users', prev.uid), { role: newRole }, { merge: true }).catch(console.warn);
      }
      return updated;
    });
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.warn('Sign-out error:', e);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const fillDemoCredentials = () => {
    return {
      email: 'demo@cashwise.com',
      pass: 'demo123',
    };
  };

  if (isAuthLoading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signInWithGoogle,
        logout,
        fillDemoCredentials,
        switchRole,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
