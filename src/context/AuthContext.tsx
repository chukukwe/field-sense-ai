import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { browserLocalPersistence, onAuthStateChanged, setPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseConfigured, firestore } from '../lib/firebase';
import { AuthContext } from './AuthContextStore';

export interface AuthContextValue {
  user: User | null;
  fullName: string;
  loading: boolean;
  configured: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseAuth || !firestore) {
      return;
    }

    const auth = firebaseAuth;
    const database = firestore;
    let active = true;
    let unsubscribe: () => void = () => {};
    void setPersistence(auth, browserLocalPersistence)
      .then(() => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          if (!active) return;
          setUser(nextUser);
          if (!nextUser) {
            setFullName('');
            setLoading(false);
            return;
          }
          try {
            const profile = await getDoc(doc(database, 'users', nextUser.uid));
            if (active) setFullName(String(profile.data()?.fullName ?? nextUser.displayName ?? ''));
          } catch {
            if (active) setFullName(nextUser.displayName ?? '');
          } finally {
            if (active) setLoading(false);
          }
        });
      })
      .catch(() => setLoading(false));

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, fullName, loading, configured: firebaseConfigured }), [user, fullName, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
