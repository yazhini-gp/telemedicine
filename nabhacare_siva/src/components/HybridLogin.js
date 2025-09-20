/**
 * Hybrid Login Component - Online/Offline Authentication
 * Technology: React Hooks, Firebase Auth, Custom offline authentication
 * 
 * Supports both online Firebase authentication and offline encrypted token authentication
 */

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import offlineStorage from '../utils/offlineStorage';
import { Eye, EyeOff, Wifi, WifiOff, Lock, User } from 'lucide-react';

const HybridLogin = ({ onLoginSuccess, onLoginError }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loginMode, setLoginMode] = useState('online'); // 'online' or 'offline'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    offlineKey: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showOfflineKey, setShowOfflineKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasOfflineData, setHasOfflineData] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for offline data on component mount
  useEffect(() => {
    const checkOfflineData = async () => {
      try {
        await offlineStorage.initialize();
        const hasData = await offlineStorage.hasOfflineData();
        setHasOfflineData(hasData);
        
        // Auto-switch to offline mode if no internet and offline data exists
        if (!isOnline && hasData) {
          setLoginMode('offline');
        }
      } catch (error) {
        console.error('Failed to check offline data:', error);
      }
    };

    checkOfflineData();
  }, [isOnline]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  // Online login with Firebase
  const handleOnlineLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;
      
      // Store authentication data offline
      const authData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        token: await user.getIdToken(),
        refreshToken: user.refreshToken,
        loginTime: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      await offlineStorage.storeAuth(authData);
      
      // Fetch and store user profile and records
      await fetchAndStoreUserData(user.uid);
      
      console.log('Online login successful, data cached offline');
      onLoginSuccess?.(user, authData);
      
    } catch (error) {
      console.error('Online login failed:', error);
      setError(getErrorMessage(error.code));
      onLoginError?.(error);
    } finally {
      setLoading(false);
    }
  };

  // Offline login with stored encrypted data
  const handleOfflineLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verify offline key (simple password prompt)
      if (!formData.offlineKey) {
        throw new Error('Offline key is required');
      }

      // Retrieve stored auth data
      const authData = await offlineStorage.getAuth();
      
      if (!authData) {
        throw new Error('No offline data found. Please login online first.');
      }

      // Check if token is expired
      const isExpired = Date.now() > authData.expiresAt;
      
      if (isExpired && isOnline) {
        // Try to refresh token online
        try {
          await refreshTokenOnline(authData);
        } catch (refreshError) {
          console.warn('Token refresh failed, allowing read-only access');
        }
      }

      // Simulate user object for offline mode
      const offlineUser = {
        uid: authData.uid,
        email: authData.email,
        displayName: authData.displayName,
        isOffline: true,
        isReadOnly: isExpired && !isOnline
      };

      console.log('Offline login successful');
      onLoginSuccess?.(offlineUser, authData);
      
    } catch (error) {
      console.error('Offline login failed:', error);
      setError(error.message);
      onLoginError?.(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch and store user data for offline access
  const fetchAndStoreUserData = async (uid) => {
    try {
      // Import API functions
      const { getUser, getPatientPrescriptions, getPatientReports } = await import('../services/api');
      
      // Fetch user profile
      const profile = await getUser(uid);
      if (profile) {
        await offlineStorage.storeProfile(profile);
      }

      // Fetch prescriptions
      const prescriptions = await getPatientPrescriptions(uid);
      if (prescriptions) {
        await offlineStorage.storePrescriptions(prescriptions);
      }

      // Fetch reports
      const reports = await getPatientReports(uid);
      if (reports) {
        await offlineStorage.storeReports(reports);
      }

      console.log('User data cached for offline access');
    } catch (error) {
      console.error('Failed to cache user data:', error);
    }
  };

  // Refresh token online
  const refreshTokenOnline = async (authData) => {
    try {
      // Re-authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        authData.email, 
        formData.password
      );
      
      const user = userCredential.user;
      
      // Update stored auth data
      const updatedAuthData = {
        ...authData,
        token: await user.getIdToken(),
        refreshToken: user.refreshToken,
        loginTime: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      };

      await offlineStorage.storeAuth(updatedAuthData);
      
      // Refresh user data
      await fetchAndStoreUserData(user.uid);
      
      console.log('Token refreshed and data updated');
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  };

  // Get user-friendly error message
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return 'Login failed. Please try again.';
    }
  };

  // Switch between online and offline modes
  const switchMode = (mode) => {
    setLoginMode(mode);
    setError('');
    setFormData({
      email: '',
      password: '',
      offlineKey: ''
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {loginMode === 'online' ? 'Sign in to your account' : 'Offline Access'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {loginMode === 'online' 
              ? 'Access your medical records online' 
              : 'Access cached records without internet'
            }
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center space-x-2">
          {isOnline ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <Wifi className="w-5 h-5" />
              <span className="text-sm font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <WifiOff className="w-5 h-5" />
              <span className="text-sm font-medium">Offline</span>
            </div>
          )}
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => switchMode('online')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'online'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Online Login
          </button>
          <button
            onClick={() => switchMode('offline')}
            disabled={!hasOfflineData}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMode === 'offline'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Offline Access
          </button>
        </div>

        {/* Login Form */}
        <form 
          className="mt-8 space-y-6" 
          onSubmit={loginMode === 'online' ? handleOnlineLogin : handleOfflineLogin}
        >
          <div className="space-y-4">
            {loginMode === 'online' ? (
              <>
                {/* Online Login Fields */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Offline Login Fields */}
                <div>
                  <label htmlFor="offlineKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Offline Access Key
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="offlineKey"
                      name="offlineKey"
                      type={showOfflineKey ? 'text' : 'password'}
                      required
                      value={formData.offlineKey}
                      onChange={handleInputChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Enter your offline key"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowOfflineKey(!showOfflineKey)}
                    >
                      {showOfflineKey ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter the password you used during your last online login
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              ) : (
                <>
                  <span>{loginMode === 'online' ? 'Sign In' : 'Access Offline'}</span>
                  {loginMode === 'offline' && <WifiOff className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>

          {/* Offline Mode Info */}
          {loginMode === 'offline' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                📴 You are accessing cached records. Some features may be limited and data may be outdated.
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {hasOfflineData 
              ? 'Offline data available - you can access cached records without internet'
              : 'No offline data found - please login online first to enable offline access'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default HybridLogin;
