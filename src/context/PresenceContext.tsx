import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../services/supabaseService';
import { useAuth } from './AuthContext';

interface PresenceContextType {
  onlineUsers: Set<string>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: new Set() });

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setOnlineUsers(new Set());
      return;
    }

    // 1. Join the 'online-users' channel
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        // 2. When presence state changes, update local state
        const newState = channel.presenceState();
        const userIds = new Set<string>();

        // newState is a map where key is presence key, and value is array of presence objects
        for (const key in newState) {
          const presences = newState[key];
          presences.forEach((p: any) => {
            if (p.user_id) userIds.add(p.user_id);
          });
        }

        // console.log('Users online sync:', userIds);
        setOnlineUsers(userIds);
      })
      // 3. Track current user
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Update Last Access in DB
          db.updateLastLogin(user.id);

          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return <PresenceContext.Provider value={{ onlineUsers }}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  return useContext(PresenceContext);
}
