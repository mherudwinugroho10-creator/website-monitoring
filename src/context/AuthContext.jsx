import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseAuth, db } from '../services/firebase';

var AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  var [currentUser, setCurrentUser] = useState(null);
  var [userData, setUserData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    var unsubscribe = onAuthStateChanged(firebaseAuth, async function (user) {
      setCurrentUser(user);

      if (user) {
        try {
          var userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            var data = userDoc.data();
            setUserData(Object.assign({}, data, { uid: user.uid, email: user.email }));
          } else {
            setUserData({ uid: user.uid, email: user.email, name: 'User', role: 'user' });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData({ uid: user.uid, email: user.email, name: 'User', role: 'user' });
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return function () { unsubscribe(); };
  }, []);

  async function register(email, password, name) {
    try {
      var userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      var user = userCredential.user;

      var userDataToSave = {
        name: name,
        email: email,
        role: 'user',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userDataToSave);
      setUserData(Object.assign({}, userDataToSave, { uid: user.uid }));

      return { success: true, role: 'user' };
    } catch (error) {
      var errorMessage = 'Registrasi gagal.';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Email sudah terdaftar.';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Format email tidak valid.';
      else if (error.code === 'auth/weak-password') errorMessage = 'Password minimal 6 karakter.';
      return { success: false, error: errorMessage };
    }
  }

  async function login(email, password) {
    try {
      var userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      var user = userCredential.user;

      var role = 'user';
      var name = 'User';
      
      try {
        var userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          var data = userDoc.data();
          role = data.role || 'user';
          name = data.name || 'User';
          setUserData(Object.assign({}, data, { uid: user.uid, email: user.email }));
        } else {
          setUserData({ uid: user.uid, email: user.email, name: name, role: role });
        }
      } catch (fetchError) {
        console.error('Error fetching user data:', fetchError);
        setUserData({ uid: user.uid, email: user.email, name: name, role: role });
      }

      return { success: true, role: role };
    } catch (error) {
      var errorMessage = 'Login gagal.';
      if (error.code === 'auth/user-not-found') errorMessage = 'Email tidak terdaftar.';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Password salah.';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Format email tidak valid.';
      else if (error.code === 'auth/invalid-credential') errorMessage = 'Email atau password salah.';
      else if (error.code === 'auth/too-many-requests') errorMessage = 'Terlalu banyak percobaan.';
      return { success: false, error: errorMessage };
    }
  }

  async function logout() {
    try {
      await signOut(firebaseAuth);
      setCurrentUser(null);
      setUserData(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Logout gagal.' };
    }
  }

  async function updateUserProfile(updates) {
    if (!currentUser) return { success: false, error: 'Belum login.' };
    try {
      await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      setUserData(function (prev) { return Object.assign({}, prev, updates); });
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'Gagal menyimpan perubahan.' };
    }
  }

  var value = {
    currentUser: currentUser,
    userData: userData,
    loading: loading,
    register: register,
    login: login,
    logout: logout,
    updateUserProfile: updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}