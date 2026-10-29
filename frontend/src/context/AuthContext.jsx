import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, getActiveToken } from '../api/client';

export const AUTH_STATES = {
  INITIALIZING: 'INITIALIZING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
};

const AuthContext = createContext(null);

const getInitialUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem('fpo_user') ||
      localStorage.getItem('fpo_user') ||
      sessionStorage.getItem('fpo_active_user') ||
      localStorage.getItem('fpo_farmer_user') ||
      localStorage.getItem('fpo_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('fpo_token') ||
    localStorage.getItem('fpo_token') ||
    sessionStorage.getItem('fpo_active_token') ||
    localStorage.getItem('fpo_farmer_token') ||
    localStorage.getItem('fpo_admin_token') ||
    null
  );
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState(getInitialUser);
  const [authState, setAuthState] = useState(() => (getInitialToken() ? AUTH_STATES.AUTHENTICATED : AUTH_STATES.UNAUTHENTICATED));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearAllStoredSessions = () => {
    // Clear active tab session
    sessionStorage.removeItem('fpo_token');
    sessionStorage.removeItem('fpo_user');
    sessionStorage.removeItem('fpo_active_token');
    sessionStorage.removeItem('fpo_active_user');

    // Clear persistent storage across roles
    localStorage.removeItem('fpo_token');
    localStorage.removeItem('fpo_user');
    localStorage.removeItem('fpo_admin_token');
    localStorage.removeItem('fpo_admin_user');
    localStorage.removeItem('fpo_farmer_token');
    localStorage.removeItem('fpo_farmer_user');
  };

  const persistSession = useCallback((jwtToken, loggedUser) => {
    // Clean out previous session across all roles first to prevent cross-contamination
    clearAllStoredSessions();

    setToken(jwtToken);
    setUser(loggedUser);
    setAuthState(AUTH_STATES.AUTHENTICATED);

    // Save canonical session tokens (active tab and persistent)
    sessionStorage.setItem('fpo_token', jwtToken);
    sessionStorage.setItem('fpo_user', JSON.stringify(loggedUser));
    localStorage.setItem('fpo_token', jwtToken);
    localStorage.setItem('fpo_user', JSON.stringify(loggedUser));

    // Also populate legacy role keys for backward compatibility
    if (loggedUser.role === 'FARMER') {
      localStorage.setItem('fpo_farmer_token', jwtToken);
      localStorage.setItem('fpo_farmer_user', JSON.stringify(loggedUser));
    } else {
      localStorage.setItem('fpo_admin_token', jwtToken);
      localStorage.setItem('fpo_admin_user', JSON.stringify(loggedUser));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    setAuthState(AUTH_STATES.UNAUTHENTICATED);
    clearAllStoredSessions();
  }, []);

  // Session verification on initial load and refresh
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const activeToken = getActiveToken();

      if (!activeToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
        }
        return;
      }

      try {
        const response = await authAPI.getMe();
        const currentUser = response.data?.data?.user;

        if (
          isMounted &&
          currentUser &&
          (currentUser.role === 'FPO_ADMIN' || currentUser.role === 'FARMER') &&
          currentUser.status === 'ACTIVE'
        ) {
          persistSession(activeToken, currentUser);
        } else {
          // Invalid status or role
          if (isMounted) logout();
        }
      } catch (err) {
        console.warn('Session verification failed on startup/refresh:', err.response?.data?.message || err.message);
        if (isMounted) {
          logout();
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [logout, persistSession]);

  // Listen for global auto-logout events emitted by Axios 401 interceptor
  useEffect(() => {
    const handleAutoLogout = () => {
      logout();
    };

    window.addEventListener('fpo_auth_logout', handleAutoLogout);
    return () => window.removeEventListener('fpo_auth_logout', handleAutoLogout);
  }, [logout]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login({ email, password });
      const { token: jwtToken, data } = response.data;
      const loggedUser = data?.user;

      if (!loggedUser) {
        const errMsg = 'Login failed. User profile data missing.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      // Check account status
      if (loggedUser.status !== 'ACTIVE') {
        const errMsg = 'Access Denied: Account is inactive or suspended.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      persistSession(jwtToken, loggedUser);
      setLoading(false);
      return { success: true, user: loggedUser };
    } catch (err) {
      let message = err.response?.data?.message;
      if (!message) {
        if (!err.response) {
          message = 'Unable to connect to the server. Please verify your internet connection or check that the backend is running.';
        } else if (err.response.status === 401) {
          message = 'Invalid email or password. Please try again.';
        } else if (err.response.status >= 500) {
          message = 'A server error occurred. Please try again later.';
        } else {
          message = 'Login failed. Please check your credentials and try again.';
        }
      }
      setError(message);
      setLoading(false);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      return { success: false, message };
    }
  };

  const loginWithGoogle = async (googleIdToken) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.googleLogin(googleIdToken);
      const { token: jwtToken, data } = response.data;
      const loggedUser = data?.user;

      if (!loggedUser) {
        const errMsg = 'Google authentication failed. User profile data missing.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      // Check account status
      if (loggedUser.status !== 'ACTIVE') {
        const errMsg = 'Access Denied: Account is inactive or suspended.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      persistSession(jwtToken, loggedUser);
      setLoading(false);
      return { success: true, user: loggedUser };
    } catch (err) {
      let message = err.response?.data?.message;
      if (!message) {
        if (!err.response) {
          message = 'Unable to connect to the server. Please check your network connection.';
        } else if (err.response.status === 401) {
          message = 'Google sign-in was rejected or the account is invalid.';
        } else {
          message = 'Google authentication failed. Please try again.';
        }
      }
      setError(message);
      setLoading(false);
      setAuthState(AUTH_STATES.UNAUTHENTICATED);
      return { success: false, message };
    }
  };

  const loginWithMobile = async (phone, otp, name) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.verifyMobileOtp({ phone, otp, name });
      const { token: jwtToken, data } = response.data;
      const loggedUser = data?.user;

      if (!loggedUser) {
        const errMsg = 'Mobile authentication failed. User profile data missing.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      if (loggedUser.status !== 'ACTIVE') {
        const errMsg = 'Access Denied: Account is inactive or suspended.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      persistSession(jwtToken, loggedUser);
      setLoading(false);
      return { success: true, user: loggedUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Mobile OTP verification failed. Please check the code.';
      setError(message);
      setLoading(false);
      return { success: false, message };
    }
  };

  const register = async (farmerData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.register(farmerData);
      const { token: jwtToken, data } = response.data;
      const registeredUser = data?.user;

      if (!registeredUser) {
        const errMsg = 'Registration failed. User profile data missing.';
        setError(errMsg);
        setLoading(false);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
        return { success: false, message: errMsg };
      }

      persistSession(jwtToken, registeredUser);
      setLoading(false);
      return { success: true, user: registeredUser };
    } catch (err) {
      let message = err.response?.data?.message;
      if (!message) {
        if (!err.response) {
          message = 'Unable to connect to the server. Please check your network connection.';
        } else if (err.response.data?.errors) {
          message = Object.values(err.response.data.errors).join(', ');
        } else {
          message = 'Registration failed. Please check your details and try again.';
        }
      }
      setError(message);
      setLoading(false);
      return { success: false, message };
    }
  };

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    if (updatedUser) {
      sessionStorage.setItem('fpo_active_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('fpo_user', JSON.stringify(updatedUser));
      if (updatedUser.role === 'FARMER') {
        localStorage.setItem('fpo_farmer_user', JSON.stringify(updatedUser));
      } else {
        localStorage.setItem('fpo_admin_user', JSON.stringify(updatedUser));
      }
      localStorage.setItem('fpo_user', JSON.stringify(updatedUser));
    }
  }, []);

  const initializing = authState === AUTH_STATES.INITIALIZING;
  const isAuthenticated = authState === AUTH_STATES.AUTHENTICATED;
  const isAdmin = isAuthenticated && user?.role === 'FPO_ADMIN';
  const isFarmer = isAuthenticated && user?.role === 'FARMER';

  return (
    <AuthContext.Provider
      value={{
        authState,
        AUTH_STATES,
        user,
        token,
        loading,
        initializing,
        error,
        setError,
        login,
        register,
        loginWithGoogle,
        loginWithMobile,
        updateUser,
        logout,
        isAuthenticated,
        isAdmin,
        isFarmer,
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
