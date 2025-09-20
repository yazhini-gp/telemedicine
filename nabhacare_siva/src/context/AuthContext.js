import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { auth, ADMIN_EMAILS } from '../services/firebase';
import { createUser, getUser } from '../services/api';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email, password, userData) => {
    try {
      console.log('Starting signup process...');
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Firebase Auth user created:', user.uid);
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: userData.name
      });
      console.log('Firebase Auth profile updated');

      // Determine role: auto-assign admin if email matches configured list
      const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes((user.email || '').toLowerCase().trim());

      // Create user profile in Firestore
      const userProfileData = {
        id: user.uid,
        email: user.email,
        name: userData.name,
        role: isAdmin ? 'admin' : userData.role,
        domain: userData.domain || '',
        availability: userData.availability || 'available'
      };
      
      console.log('Creating Firestore user profile:', userProfileData);
      await createUser(userProfileData);
      console.log('Firestore user profile created successfully');

      return userCredential;
    } catch (error) {
      console.error('=== SIGNUP ERROR DETAILS ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      console.error('Error stack:', error.stack);
      console.error('============================');
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      
      // Clear enhanced offline storage
      try {
        const enhancedOfflineStorage = (await import('../utils/enhancedOfflineStorage')).default;
        await enhancedOfflineStorage.clearAll();
        console.log('Enhanced offline storage cleared on logout');
      } catch (error) {
        console.warn('Failed to clear enhanced offline storage:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Attempt to hydrate from localStorage first for offline/after restart
    const cachedAuth = localStorage.getItem('auth:lastUserId');
    const cachedProfileRaw = cachedAuth ? localStorage.getItem(`auth:profile:${cachedAuth}`) : null;
    if (cachedAuth && cachedProfileRaw) {
      try {
        const cachedProfile = JSON.parse(cachedProfileRaw);
        setUserProfile(cachedProfile);
      } catch (_) {}
    }

    // Also check enhanced offline storage for auth data
    const checkEnhancedOfflineAuth = async () => {
      try {
        const enhancedOfflineStorage = (await import('../utils/enhancedOfflineStorage')).default;
        await enhancedOfflineStorage.initialize();
        const authData = await enhancedOfflineStorage.getAuth();
        
        if (authData && authData.uid) {
          console.log('Found auth data in enhanced offline storage:', {
            uid: authData.uid,
            email: authData.email,
            expiresAt: new Date(authData.expiresAt).toLocaleString()
          });
          
          // Check if token is still valid
          const tokenExpired = Date.now() > authData.expiresAt;
          if (tokenExpired) {
            console.log('Auth token expired, will need to refresh when online');
          } else {
            console.log('Auth token is still valid');
          }
        } else {
          console.log('No auth data found in enhanced offline storage');
        }
      } catch (error) {
        console.warn('Failed to check enhanced offline auth:', error);
      }
    };
    
    checkEnhancedOfflineAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getUser(user.uid);
          if (profile) {
            setUserProfile(profile);
            try {
              localStorage.setItem('auth:lastUserId', user.uid);
              localStorage.setItem(`auth:profile:${user.uid}`, JSON.stringify(profile));
              
              // Initialize sync service and cache user data when online
              if (navigator.onLine) {
                const syncService = (await import('../services/syncService')).default;
                await syncService.initialize();
                
                // Cache user data for offline access
                try {
                  const { getPatientReports, getPatientPrescriptions } = await import('../services/api');
                  const [reports, prescriptions] = await Promise.all([
                    getPatientReports(user.uid).catch(() => []),
                    getPatientPrescriptions(user.uid).catch(() => [])
                  ]);
                  
                  // Store auth data in enhanced offline storage for sync service
                  const enhancedOfflineStorage = (await import('../utils/enhancedOfflineStorage')).default;
                  await enhancedOfflineStorage.initialize();
                  
                  // Store auth data with token expiration
                  const authData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                    token: await user.getIdToken(),
                    refreshToken: user.refreshToken,
                    loginTime: Date.now()
                  };
                  await enhancedOfflineStorage.storeAuth(authData);
                  console.log('Auth data stored in enhanced offline storage:', {
                    uid: authData.uid,
                    email: authData.email,
                    expiresAt: new Date(authData.expiresAt).toLocaleString()
                  });
                  
                  // Store profile and data
                  await enhancedOfflineStorage.storeProfile(profile);
                  if (reports.length > 0) await enhancedOfflineStorage.storeReports(reports);
                  if (prescriptions.length > 0) await enhancedOfflineStorage.storePrescriptions(prescriptions);
                  
                  console.log('User data cached for offline access in enhanced storage');
                } catch (cacheError) {
                  console.warn('Failed to cache user data:', cacheError);
                }
              }
            } catch (_) {}
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setCurrentUser(null);
        // Keep last cached profile for offline display
        // Do not clear cached profile keys here
        setUserProfile(prev => prev || null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
