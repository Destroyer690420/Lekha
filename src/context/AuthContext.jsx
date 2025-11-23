import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    function loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    }

    async function signupWithEmail(email, password, displayName) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });

        // Create user profile in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
            displayName: displayName,
            createdAt: new Date().toISOString(),
        });

        return userCredential;
    }

    function loginWithEmail(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Subscribe to user profile changes
                const docRef = doc(db, "users", user.uid);
                const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        user.profile = docSnap.data();
                    }
                    // We need to create a new object reference to trigger re-renders
                    setCurrentUser({ ...user });
                    setLoading(false);
                });

                // Cleanup snapshot listener when auth state changes or component unmounts
                return () => unsubscribeSnapshot();
            } else {
                setCurrentUser(null);
                setLoading(false);
            }
        });

        return unsubscribeAuth;
    }, []);

    const value = {
        currentUser,
        loginWithGoogle,
        signupWithEmail,
        loginWithEmail,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
