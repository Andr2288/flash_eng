import { useEffect, useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import {
    User,
    BookOpen,
    BarChart3,
    Trophy,
    Activity,
    Loader,
    Edit3,
} from "lucide-react";

import { useAuth } from "../context/useAuth.js";
import { ProfileEditModal } from "../components/ProfileEditModal.jsx";
import {
    useVocabularyWordsStore,
    fetchVocabularyWords,
} from "../store/index.js";
import { useThunk } from "../hooks/use-thunk.js";
import { useNavReselectStore } from "../store/useNavReselectStore.js";

const TOPIC_PALETTE = [
    "#3B82F6",
    "#10B981",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
    "#06B6D4",
    "#6366F1",
    "#14B8A6",
];

/** Значення з metadata, яке не варто показувати (плейсхолдери в Dashboard тощо). */
function metaDisplayString(value) {
    const t = value != null ? String(value).trim() : "";
    if (!t) {
        return "";
    }
    if (t === "-" || t === "—" || t === "–" || t === "n/a" || t === "N/A") {
        return "";
    }
    return t;
}

function resolveShownName(user) {
    if (!user) {
        return "Користувач";
    }
    const meta = user.user_metadata || {};
    const fromMeta =
        metaDisplayString(meta.full_name) ||
        metaDisplayString(meta.name) ||
        metaDisplayString(meta.display_name);
    if (fromMeta) {
        return fromMeta;
    }
    if (user.email) {
        return user.email.split("@")[0];
    }
    return "Користувач";
}

function wordCreatedAt(word) {
    return word.metodology_parameters?.createdAt || null;
}

const ProfilePage = () => {
    const { user, loading: authLoading, updateProfile } = useAuth();
    const { data } = useVocabularyWordsStore(
        useShallow((state) => ({ data: state.data }))
    );

    const [statsLoading, setStatsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [stats, setStats] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [profileModalKey, setProfileModalKey] = useState(0);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    const [doFetchVocabularyWords, isFetchingWords] =
        useThunk(fetchVocabularyWords);

    const profileNavReselect = useNavReselectStore(
        (s) => s.bumps["/profile"] ?? 0
    );

    const loadVocabulary = useCallback(async () => {
        setStatsLoading(true);
        setLoadError(null);
        try {
            await doFetchVocabularyWords();
        } catch (e) {
            if (e?.name !== "AbortError" && e?.name !== "CanceledError") {
                setLoadError(
                    e?.message || "Не вдалося завантажити словник з сервера"
                );
            }
        } finally {
            setStatsLoading(false);
        }
    }, [doFetchVocabularyWords]);

    useEffect(() => {
        loadVocabulary();
    }, [loadVocabulary, profileNavReselect]);

    const handleProfileUpdate = async (formData) => {
        setIsUpdatingProfile(true);
        try {
            await updateProfile({
                fullName: formData.fullName,
                profilePic: formData.profilePic,
            });
            setShowEditModal(false);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const calculateStats = useCallback((words) => {
        const list = Array.isArray(words) ? words : [];
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const totalWords = list.length;

        const wordsThisMonth = list.filter((w) => {
            const c = wordCreatedAt(w);
            if (!c) {
                return false;
            }
            return new Date(c) >= startOfMonth;
        }).length;

        const today = new Date();
        const currentDay = today.getDay();
        const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;

        const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - daysFromMonday + i);

            const dayWords = list.filter((w) => {
                const c = wordCreatedAt(w);
                if (!c) {
                    return false;
                }
                const cardDate = new Date(c);
                return cardDate.toDateString() === date.toDateString();
            }).length;

            const isToday = date.toDateString() === today.toDateString();

            return {
                day: date.toLocaleDateString("uk-UA", { weekday: "short" }),
                count: dayWords,
                isToday,
            };
        });

        const wordsThisWeek = weeklyActivity.reduce((s, d) => s + d.count, 0);

        const topicMap = new Map();
        list.forEach((w) => {
            const raw = w.main_parameters?.topic;
            const name =
                raw && String(raw).trim() ? String(raw).trim() : "Без теми";
            topicMap.set(name, (topicMap.get(name) || 0) + 1);
        });

        const topicStats = [...topicMap.entries()]
            .map(([name, count], index) => ({
                id: name,
                name,
                color: TOPIC_PALETTE[index % TOPIC_PALETTE.length],
                count,
                percentage:
                    totalWords > 0 ? (count / totalWords) * 100 : 0,
            }))
            .sort((a, b) => b.count - a.count);

        setStats({
            totalWords,
            wordsThisMonth,
            wordsThisWeek,
            topicStats: topicStats.slice(0, 5),
            weeklyActivity,
        });
    }, []);

    useEffect(() => {
        if (statsLoading) {
            return;
        }
        calculateStats(data);
    }, [data, statsLoading, calculateStats]);

    const profileHeader = (
        <div className="shrink-0 bg-white border-b border-gray-200">
            <div className="p-8">
                <div className="max-w-7xl mx-auto flex items-center">
                    <div className="bg-linear-to-r from-orange-600 to-red-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-md">
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Профіль
                        </h1>
                        <p className="text-gray-600">
                            Статистика словника та акаунту FlashEng
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    if (authLoading || !user) {
        return (
            <div className="ml-68 flex min-h-screen min-w-0 flex-col bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
                {profileHeader}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
                    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
                        <div className="flex flex-1 flex-col items-center justify-center gap-4">
                            <Loader className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-sm text-gray-600">
                                Зачекайте, будь ласка
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const avatar = user.user_metadata?.avatar_url || null;
    const name = resolveShownName(user);
    const err = loadError;

    return (
        <div className="ml-68 flex min-h-screen min-w-0 flex-col bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
            {profileHeader}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
                <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col space-y-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                                <div className="w-20 h-20 rounded-full bg-linear-to-r from-orange-100 to-red-100 overflow-hidden shrink-0">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-10 h-10 text-orange-400" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900">
                                        {name}
                                    </h2>
                                    <p className="text-gray-600 text-sm mt-1">
                                        {user.email}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        З нами з{" "}
                                        {new Date(
                                            user.created_at || Date.now()
                                        ).toLocaleDateString("uk-UA")}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setProfileModalKey((k) => k + 1);
                                    setShowEditModal(true);
                                }}
                                disabled={isUpdatingProfile}
                                className="shrink-0 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-70 text-white px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                            >
                                <Edit3 className="w-4 h-4" />
                                <span>
                                    {isUpdatingProfile
                                        ? "Збереження..."
                                        : "Редагувати"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {err ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center max-w-lg mx-auto">
                            <p className="text-red-800 font-medium">
                                Не вдалося завантажити дані
                            </p>
                            <p className="text-sm text-red-600/90 mt-2">{err}</p>
                            <button
                                type="button"
                                onClick={() => loadVocabulary()}
                                className="mt-4 text-sm font-medium text-red-800 underline hover:no-underline"
                            >
                                Спробувати ще раз
                            </button>
                        </div>
                    ) : statsLoading ||
                      isFetchingWords ||
                      stats == null ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4">
                            <Loader className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-sm text-gray-600">
                                Зачекайте, будь ласка
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Всього слів
                                            </p>
                                            <p className="text-3xl font-bold text-blue-600">
                                                {stats.totalWords}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-linear-to-r from-blue-500 to-blue-600 rounded-lg shadow-md">
                                            <BookOpen className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        +{stats.wordsThisMonth} додано цього
                                        місяця
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">
                                                Цього тижня
                                            </p>
                                            <p className="text-3xl font-bold text-purple-600">
                                                {stats.wordsThisWeek}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-linear-to-r from-purple-500 to-purple-600 rounded-lg shadow-md">
                                            <Trophy className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Усього додано за поточний тиждень (пн–нд)
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Activity className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Нові слова за тиждень
                                        </h3>
                                    </div>
                                    <div className="space-y-4">
                                        {stats.weeklyActivity.map(
                                            (day, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center space-x-3"
                                                >
                                                    <div
                                                        className={`w-12 text-sm text-right font-medium ${
                                                            day.isToday
                                                                ? "text-blue-600 bg-blue-50 px-2 py-1 rounded-md"
                                                                : "text-gray-600"
                                                        }`}
                                                    >
                                                        {day.day}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    day.isToday
                                                                        ? "bg-linear-to-r from-blue-500 to-blue-600 shadow-md"
                                                                        : "bg-blue-500"
                                                                }`}
                                                                style={{
                                                                    width: `${Math.max(
                                                                        5,
                                                                        (day.count /
                                                                            Math.max(
                                                                                ...stats.weeklyActivity.map(
                                                                                    (
                                                                                        d
                                                                                    ) =>
                                                                                        d.count
                                                                                ),
                                                                                1
                                                                            )) *
                                                                            100
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={`w-8 text-sm font-medium text-right ${
                                                            day.isToday
                                                                ? "text-blue-600"
                                                                : "text-gray-700"
                                                        }`}
                                                    >
                                                        {day.count}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <BarChart3 className="w-5 h-5 text-emerald-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Топ тем
                                        </h3>
                                    </div>
                                    {stats.topicStats.length === 0 ? (
                                        <p className="text-sm text-gray-500">
                                            Додайте слова з темами — тут з’явиться
                                            розподіл.
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {stats.topicStats.map(
                                                (topic) => (
                                                    <div
                                                        key={topic.id}
                                                        className="flex items-center space-x-3"
                                                    >
                                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                            <div
                                                                className="w-4 h-4 rounded shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        topic.color,
                                                                }}
                                                            />
                                                            <span className="text-sm font-medium text-gray-700 truncate">
                                                                {topic.name}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-3 shrink-0">
                                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            topic.color,
                                                                        width: `${Math.max(
                                                                            5,
                                                                            topic.percentage
                                                                        )}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-600 w-8 text-right">
                                                                {topic.count}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showEditModal ? (
                <ProfileEditModal
                    key={profileModalKey}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleProfileUpdate}
                    initialData={{
                        fullName: resolveShownName(user),
                        profilePic: user.user_metadata?.avatar_url || "",
                    }}
                    isLoading={isUpdatingProfile}
                />
            ) : null}
        </div>
    );
};

export { ProfilePage };
