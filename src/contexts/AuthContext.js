import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          // Use real-time listener for profile updates
          const unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              setUserProfile(snapshot.data());
            } else {
              setUserProfile(null);
            }
          }, (error) => {
            console.error('Error listening to user profile:', error);
            setUserProfile(null);
          });

          setLoading(false);
          return unsubscribeProfile;
        } catch (error) {
          console.error('Error setting up profile listener:', error);
          setUserProfile(null);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signup = async (email, password, fullName) => {
    try {
      setError('');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (fullName && result.user) {
        await updateProfile(result.user, {
          displayName: fullName
        });
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      setError('');
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError('');
      await signOut(auth);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError('');
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    userProfile,
    error,
    signup,
    login,
    logout,
    resetPassword,
    setError,
    isAdmin: userProfile?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
