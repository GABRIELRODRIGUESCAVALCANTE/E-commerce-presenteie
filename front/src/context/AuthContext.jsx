import { useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from './contexts';
import { authClient } from '../auth';
import { getMe } from '../api';

export function AuthProvider({ children }) {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  // Permissão de admin decidida pelo back-end (ADMIN_EMAIL), consultada uma vez por usuário logado
  const [adminState, setAdminState] = useState({ userId: null, isAdmin: false });

  useEffect(() => {
    if (!userId) return;
    let ativo = true;
    getMe()
      .then((me) => ativo && setAdminState({ userId, isAdmin: Boolean(me.isAdmin) }))
      .catch(() => ativo && setAdminState({ userId, isAdmin: false }));
    return () => {
      ativo = false;
    };
  }, [userId]);

  const logout = useCallback(() => authClient.signOut(), []);

  const value = useMemo(() => {
    const adminChecked = Boolean(userId) && adminState.userId === userId;
    return {
      session,
      user: session?.user || null,
      isPending,
      isAdmin: adminChecked && adminState.isAdmin,
      adminLoading: Boolean(userId) && !adminChecked,
      logout,
    };
  }, [session, userId, isPending, adminState, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
