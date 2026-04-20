import { Routes, Route, Navigate } from "react-router-dom";
import { Loader } from "lucide-react";

import Navbar from "./components/common/Navbar.jsx";

import {
    LoginPage,
    SignUpPage,
    HomePage,
    PracticePage,
    ProfilePage,
    SettingsPage,
} from "./pages/index.js";

import {
    TranslateSentenceExercise,
    FillTheGapExercise,
    ListenAndFillTheGapExercise,
} from "./components/exercises/index.js";

import { useAuth } from "./context/AuthContext.jsx";

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
                <Loader className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Завантаження…</p>
            </div>
        );
    }

    return (
        <div>
            {user ? <Navbar /> : null}

            <Routes>
                <Route
                    path="/"
                    element={
                        user ? <HomePage /> : <Navigate to="/login" replace />
                    }
                />
                <Route
                    path="/practice"
                    element={
                        user ? (
                            <PracticePage />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/signup"
                    element={
                        user ? (
                            <Navigate to="/" replace />
                        ) : (
                            <SignUpPage />
                        )
                    }
                />
                <Route
                    path="/login"
                    element={
                        user ? (
                            <Navigate to="/" replace />
                        ) : (
                            <LoginPage />
                        )
                    }
                />
                <Route
                    path="/settings"
                    element={
                        user ? (
                            <SettingsPage />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/profile"
                    element={
                        user ? (
                            <ProfilePage />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />

                <Route
                    path="/practice/translate-sentence"
                    element={
                        user ? (
                            <TranslateSentenceExercise />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/practice/fill-the-gap"
                    element={
                        user ? (
                            <FillTheGapExercise />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/practice/listen-and-fill"
                    element={
                        user ? (
                            <ListenAndFillTheGapExercise />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
        </div>
    );
}

export default App;
