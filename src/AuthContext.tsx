import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, Company } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, role: 'recruiter' | 'candidate', companyName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utility to remove undefined values from objects for Firestore
const cleanData = (data: any) => {
  const clean: any = {};
  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      clean[key] = data[key];
    }
  });
  return clean;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            // If user exists in Auth but not in Firestore, we might want to sign them out
            // to prevent a broken state, or handle it as a partial registration.
            // For now, we set user to null to force them to the Auth screen.
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, pass: string, name: string, role: 'recruiter' | 'candidate', companyName?: string) => {
    // Call the professional server-side registration endpoint
    const response = await fetch('/api/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, name, role, companyName }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Falha no registo');
    }

    // After successful server-side registration, sign in on the client
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signIn = async (email: string, pass: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { collection } from 'firebase/firestore';
