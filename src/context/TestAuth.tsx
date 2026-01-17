import React, { createContext, useContext, useState, ReactNode } from 'react';
import { db } from '../services/supabaseService'; // TEST IMPORT

console.log('TestAuth: DB Imported', db);
interface TestAuthContextType {
  user: string | null;
  login: () => void;
}

const TestAuthContext = createContext<TestAuthContextType | undefined>(undefined);

export function TestAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);

  const login = () => setUser('Test User');

  return <TestAuthContext.Provider value={{ user, login }}>{children}</TestAuthContext.Provider>;
}

export function useTestAuth() {
  return useContext(TestAuthContext);
}
