import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../store/features/vocabularyWords/supabase.js";
import {
    deleteProfileAvatarObject,
    uploadProfileAvatarFromDataUrl,
} from "../store/features/vocabularyWords/avatarStorage.js";

import { AuthContext } from "./auth-context.jsx";

function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            setUser(s?.user ?? null);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            setUser(s?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = useCallback(async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw error;
        }
        return data;
    }, []);

    const signUpWithEmail = useCallback(async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) {
            throw error;
        }
        return data;
    }, []);

    const signOut = useCallback(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
    }, []);

    const updateProfile = useCallback(async ({ fullName, profilePic }) => {
        const trimmed = (fullName || "").trim();
        if (!trimmed || trimmed.length < 2) {
            throw new Error("Ім'я має містити принаймні 2 символи");
        }

        const {
            data: { session: currentSession },
            error: sessionErr,
        } = await supabase.auth.getSession();
        if (sessionErr) {
            throw new Error(sessionErr.message);
        }
        if (!currentSession?.user?.id) {
            throw new Error("Потрібна активна сесія");
        }
        const userId = currentSession.user.id;

        const MAX_HTTP_AVATAR_URL = 2000;
        const pic = profilePic != null ? String(profilePic).trim() : "";

        let avatar_url = "";
        let uploadedNewAvatar = false;
        if (!pic) {
            try {
                await deleteProfileAvatarObject(userId);
            } catch {
                /* ignore cleanup errors */
            }
            avatar_url = "";
        } else if (pic.startsWith("data:")) {
            avatar_url = await uploadProfileAvatarFromDataUrl(userId, pic);
            uploadedNewAvatar = true;
        } else if (pic.length > MAX_HTTP_AVATAR_URL) {
            throw new Error("Посилання на фото занадто довге.");
        } else {
            avatar_url = pic;
        }

        const { data, error } = await supabase.auth.updateUser({
            data: {
                full_name: trimmed,
                avatar_url,
            },
        });
        if (error) {
            if (uploadedNewAvatar) {
                await deleteProfileAvatarObject(userId).catch(() => {});
            }
            throw error;
        }

        const {
            data: { session: nextSession },
        } = await supabase.auth.getSession();
        setSession(nextSession ?? null);
        setUser(nextSession?.user ?? data?.user ?? null);
        return data;
    }, []);

    const value = useMemo(
        () => ({
            user,
            session,
            loading,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            updateProfile,
        }),
        [
            user,
            session,
            loading,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            updateProfile,
        ]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export { AuthProvider };
