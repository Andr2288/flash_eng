import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader, LogIn, Sparkles } from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";

const LoginPage = () => {
    const navigate = useNavigate();
    const { signInWithEmail } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await signInWithEmail(email.trim(), password);
            navigate("/", { replace: true });
        } catch (err) {
            setError(err.message || "Не вдалося увійти");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100 p-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 bg-linear-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Вхід
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 text-center">
                            Увійдіть, щоб продовжити вивчення
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="login-email"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Електронна пошта
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="login-password"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Пароль
                            </label>
                            <input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    Вхід…
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Увійти
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Немає акаунту?{" "}
                        <Link
                            to="/signup"
                            className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Зареєструватися
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export { LoginPage };
