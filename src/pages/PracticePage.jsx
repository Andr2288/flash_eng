import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
    TranslateSentenceExercise,
    FillTheGapExercise,
    ListenAndFillTheGapExercise,
} from "../components/exercises/index.js";

import {
    ChevronLeft,
    ChevronRight,
    Target,
    Headphones,
    Type,
    Languages,
    BarChart2,
    Loader,
} from "lucide-react";
import {
    useVocabularyWordsStore,
    fetchVocabularyWords,
    makeNextSelection,
    updateExerciseState,
} from "../store/index.js";
import { useThunk } from "../hooks/use-thunk.js";
import { useNavReselectStore } from "../store/useNavReselectStore.js";

const STATUS_CONFIG = {
    MISSED: {
        label: "Пропущені",
        color: "bg-red-500",
        textColor: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
    },
    LEARNING: {
        label: "Вивчаються",
        color: "bg-green-500",
        textColor: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
    },
    NEW: {
        label: "Нові",
        color: "bg-blue-500",
        textColor: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
    },
    AGAIN: {
        label: "Повторити",
        color: "bg-orange-500",
        textColor: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
    },
    // REVIEW: {
    //     label: "На повторенні",
    //     color: "bg-purple-500",
    //     textColor: "text-purple-700",
    //     bg: "bg-purple-50",
    //     border: "border-purple-200",
    // },
};

const ExerciseType = {
    TranslateSentenceExercise: "translate_sentence_exercise",
    FillTheGapExercise: "fill_the_gap_exercise",
    ListenAndFillTheGapExercise: "listen_and_fill_the_gap_exercise",
};

const EXERCISE_STATUS_KEY = {
    [ExerciseType.TranslateSentenceExercise]:
        "status_translate_sentence_exercise",
    [ExerciseType.FillTheGapExercise]: "status_fill_the_gap_exercise",
    [ExerciseType.ListenAndFillTheGapExercise]:
        "status_listen_and_fill_the_gap_exercise",
};

const EXERCISE_LABEL = {
    [ExerciseType.TranslateSentenceExercise]: "Переклади речення",
    [ExerciseType.FillTheGapExercise]: "Доповни речення",
    [ExerciseType.ListenAndFillTheGapExercise]: "Слухання та письмо",
};

const StatsSidebar = ({ isOpen, onToggle, data, exerciseType }) => {
    const statusKey =
        EXERCISE_STATUS_KEY[exerciseType] ||
        "status_translate_sentence_exercise";

    const stats = useMemo(() => {
        const rawCounts = {
            NEW: 0,
            LEARNING: 0,
            REVIEW: 0,
            AGAIN: 0,
            MISSED: 0,
        };

        data.forEach((word) => {
            const status = word.metodology_parameters?.[statusKey];
            if (status && rawCounts[status] !== undefined) {
                rawCounts[status]++;
            }
        });

        return {
            ...rawCounts,
            LEARNING: rawCounts.LEARNING + rawCounts.REVIEW + rawCounts.AGAIN,
        };
    }, [data, statusKey]);

    const total = data.length;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute top-4 right-7 z-20 flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-gray-600 hover:text-blue-600 text-sm font-medium cursor-pointer"
            >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">Статистика</span>
                <ChevronLeft
                    className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Sidebar Panel */}
            <div
                className={`absolute top-0 right-0 h-full z-10 transition-all duration-300 ease-in-out ${
                    isOpen ? "w-56" : "w-0"
                } overflow-hidden`}
            >
                <div className="w-64 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
                    {/* Header */}
                    <div className="p-5 pt-18">
                        <p className="text-md text-gray-400 mt-1.5 ml-9">
                            Всього: {total} слів
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 overflow-y-auto p-4 pt-0 mr-3.5 space-y-2.5">
                        {Object.entries(STATUS_CONFIG).map(
                            ([status, config]) => {
                                const count = stats[status] || 0;
                                const percent =
                                    total > 0
                                        ? +((count / total) * 100).toFixed(2)
                                        : 0;

                                return (
                                    <div
                                        key={status}
                                        className={`rounded-xl border p-3.5 mr-3.5 ${config.bg} ${config.border}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-2 h-2 rounded-full ${config.color}`}
                                                />
                                                <span
                                                    className={`text-xs font-semibold ${config.textColor}`}
                                                >
                                                    {config.label}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-lg font-bold ${config.textColor}`}
                                            >
                                                {count}
                                            </span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${config.color} rounded-full transition-all duration-500`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {percent}%
                                        </p>
                                    </div>
                                );
                            }
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-xs text-gray-400 text-center">
                            Поточна вправа
                        </p>
                        <p className="text-xs font-medium text-gray-600 text-center mt-0.5">
                            {EXERCISE_LABEL[exerciseType] || "—"}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

const PracticePage = () => {
    const [uiState, setUiState] = useState({
        showExercise: false,
    });

    const [vocabularyLoadSettled, setVocabularyLoadSettled] = useState(false);

    const { exerciseState, data } = useVocabularyWordsStore(
        useShallow((state) => ({
            exerciseState: state.exerciseState,
            data: state.data,
        }))
    );

    const [
        doFetchVocabularyWords,
        isLoadingVocabularyWords,
        loadingVocabularyWordsError,
    ] = useThunk(fetchVocabularyWords);

    const practiceNavReselect = useNavReselectStore(
        (s) => s.bumps["/practice"] ?? 0
    );

    useEffect(() => {
        if (practiceNavReselect > 0) {
            setVocabularyLoadSettled(false);
        }
        doFetchVocabularyWords()
            .catch(() => {})
            .finally(() => setVocabularyLoadSettled(true));
    }, [doFetchVocabularyWords, practiceNavReselect]);

    const showVocabularyLoader =
        !vocabularyLoadSettled || isLoadingVocabularyWords;

    const ExerciseType = {
        TranslateSentenceExercise: "translate_sentence_exercise",
        FillTheGapExercise: "fill_the_gap_exercise",
        ListenAndFillTheGapExercise: "listen_and_fill_the_gap_exercise",
    };

    const coreExercisesData = [
        {
            id: "translate-sentence-exercise",
            type: ExerciseType.TranslateSentenceExercise,
            title: "Переклади речення",
            description: "Перекладіть речення англійською",
            icon: Languages,
            color: "from-blue-500 to-cyan-500",
            difficulty: "Складно",
            difficultyColor: "text-purple-600",
            difficultyBg: "bg-purple-600",
            features: ["Словниковий запас", "Навички перекладу", ""],
        },
        {
            id: "fill_the_gap_exercise",
            type: ExerciseType.FillTheGapExercise,
            title: "Доповни речення",
            description: "Оберіть правильне слово для пропуску",
            icon: Type,
            color: "from-emerald-500 to-teal-500",
            difficulty: "Нормально",
            difficultyColor: "text-blue-600",
            difficultyBg: "bg-blue-600",
            features: [
                "Граматичний контекст",
                "Розуміння структури",
                "Швидке мислення",
            ],
        },
        {
            id: "listen-and-fill-exercise",
            type: ExerciseType.ListenAndFillTheGapExercise,
            title: "Слухання та письмо",
            description: "Прослухайте речення та впишіть пропущене слово",
            icon: Headphones,
            color: "from-blue-500 to-cyan-500",
            difficulty: "Складно",
            difficultyColor: "text-purple-600",
            difficultyBg: "bg-purple-600",
            features: ["Розвиток слуху", "Правопис", "Вимова"],
        },
    ];

    let exercise;

    if (exerciseState.exerciseType === ExerciseType.TranslateSentenceExercise) {
        exercise = <TranslateSentenceExercise />;
    } else if (exerciseState.exerciseType === ExerciseType.FillTheGapExercise) {
        exercise = <FillTheGapExercise />;
    } else if (
        exerciseState.exerciseType === ExerciseType.ListenAndFillTheGapExercise
    ) {
        exercise = <ListenAndFillTheGapExercise />;
    }

    Object.freeze(ExerciseType);

    const handleExerciseButtonClick = (exerciseType) => {
        updateExerciseState({
            currentVocabularyWordIndex: 0,
            generateNextStage: true,
            exerciseType,
        });

        makeNextSelection();

        setUiState((prev) => {
            return {
                ...prev,
                showExercise: true,
            };
        });
    };

    const toggleStatsSidebar = () => {
        setUiState((prev) => ({
            ...prev,
            showStatsSidebar: !prev.showStatsSidebar,
        }));
    };

    return (
        <div className="fixed md:ml-68 inset-0 flex flex-col min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
            {/* Hero Section */}
            {!uiState.showExercise && (
                <div className="shrink-0 bg-white border-b border-gray-200 overflow-hidden p-8">
                    <div className="mx-auto flex items-center">
                        <div className="bg-linear-to-r from-blue-600 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-md">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">
                                Практика ⚡
                            </h1>
                            <p className="text-gray-600">
                                Покращуйте свої навички за допомогою
                                інтерактивних вправ
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Scrollable Content */}
            {!uiState.showExercise && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8">
                    <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col">
                        {showVocabularyLoader ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-4">
                                <Loader className="w-10 h-10 animate-spin text-blue-600" />
                                <p className="text-sm text-gray-600">
                                    Зачекайте, будь ласка
                                </p>
                            </div>
                        ) : loadingVocabularyWordsError ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center max-w-lg mx-auto">
                                <p className="text-red-800 font-medium">
                                    Ой. Щось пішло не так :(
                                </p>
                                <p className="text-sm text-red-600/90 mt-2">
                                    Спробуйте оновити сторінку або перевірте
                                    з’єднання.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <Target className="w-5 h-5 mr-2 text-blue-500" />
                                    Основні вправи
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                                    {coreExercisesData.map((exercise) => {
                                        const Icon = exercise.icon;

                                        return (
                                            <div
                                                key={exercise.id}
                                                onClick={() =>
                                                    handleExerciseButtonClick(
                                                        exercise.type
                                                    )
                                                }
                                                className={`group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-2`}
                                            >
                                                <div>
                                                    <div
                                                        className={`absolute inset-0 bg-linear-to-br ${exercise.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}
                                                    />

                                                    <div
                                                        className={`w-16 h-16 bg-linear-to-br ${exercise.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300`}
                                                    >
                                                        <Icon className="w-8 h-8 text-white" />
                                                    </div>

                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-xl font-bold text-gray-900">
                                                            {exercise.title}
                                                        </h4>
                                                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                                    </div>

                                                    <p className="text-gray-600 mb-6">
                                                        {exercise.description}
                                                    </p>
                                                </div>

                                                <div className="relative">
                                                    <div className="flex items-center space-x-4 mb-6 text-sm">
                                                        <div
                                                            className={`flex items-center ${exercise.difficultyColor}`}
                                                        >
                                                            <span
                                                                className={`w-2 h-2 ${exercise.difficultyBg} rounded-full mr-2`}
                                                            />
                                                            {
                                                                exercise.difficulty
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 mb-2">
                                                        {exercise.features.map(
                                                            (
                                                                feature,
                                                                index
                                                            ) => (
                                                                <div
                                                                    key={index}
                                                                    className="flex items-center text-sm text-gray-600"
                                                                >
                                                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3" />
                                                                    {feature}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Exercise View with Stats Sidebar */}
            {uiState.showExercise && (
                <div className="relative flex-1 flex overflow-y-auto p-8">
                    {exercise}
                    <StatsSidebar
                        isOpen={uiState.showStatsSidebar}
                        onToggle={toggleStatsSidebar}
                        data={data}
                        exerciseType={"translate_sentence_exercise"}
                    />
                </div>
            )}
        </div>
    );
};

export { PracticePage };
