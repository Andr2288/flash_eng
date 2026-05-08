import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader, MailQuestion, Sparkles } from "lucide-react";

import { useAuth } from "../context/useAuth.js";

const ForgotPasswordPage = () => {
    const { requestPasswordReset } = useAuth();

    const [email, setEmail] = useState("");
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setSubmitting(true);

        try {
            await requestPasswordReset(email);
            setInfo(
                "Якщо акаунт із такою поштою існує, ми надіслали інструкцію для відновлення пароля."
            );
        } catch (err) {
            setError(err.message || "Не вдалося надіслати лист для відновлення");
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
                            Відновлення пароля
                        </h1>
                        <p className="text-gray-500 text-sm mt-1 text-center">
                            Вкажіть пошту, і ми надішлемо посилання
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="forgot-email"
                                className="block text-sm font-medium text-gray-700 mb-1.5"
                            >
                                Електронна пошта
                            </label>
                            <input
                                id="forgot-email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-gray-900"
                                placeholder="you@example.com"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        {info && (
                            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
                                {info}
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
                                    Надсилаємо…
                                </>
                            ) : (
                                <>
                                    <MailQuestion className="w-5 h-5" />
                                    Надіслати посилання
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-600">
                        Згадали пароль?{" "}
                        <Link
                            to="/login"
                            className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Повернутися до входу
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export { ForgotPasswordPage };
