import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
    TranslateSentenceExercise,
    FillTheGapExercise,
    ListenAndFillTheGapExercise,
} from "../components/exercises/index.js";
import { LoadErrorNotice } from "../components/LoadErrorNotice.jsx";
import { PracticeSettingsPanel } from "../components/PracticeSettingsPanel.jsx";

import {
    ChevronLeft,
    ChevronRight,
    Target,
    Headphones,
    Type,
    Languages,
    BarChart2,
    Loader,
    LayoutGrid,
    Check,
    FolderOpen,
    ChevronDown,
} from "lucide-react";
import {
    useVocabularyWordsStore,
    fetchVocabularyWords,
    makeNextSelection,
    updateExerciseState,
} from "../store/index.js";
import { useThunk } from "../hooks/use-thunk.js";
import { useNavReselectStore } from "../store/useNavReselectStore.js";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { matchesPracticeCategory } from "../store/features/vocabularyWords/vocabularyWordsStateLogic.js";

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

const GRADING_BADGE = {
    self: {
        label: "Самооцінювання",
        className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    auto: {
        label: "Автоперевірка",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
};

const StatsSidebar = ({
    isOpen,
    onToggle,
    data,
    exerciseType,
    singleStatusMode,
}) => {
    const statusKey = singleStatusMode
        ? EXERCISE_STATUS_KEY[ExerciseType.TranslateSentenceExercise]
        : EXERCISE_STATUS_KEY[exerciseType] ||
          EXERCISE_STATUS_KEY[ExerciseType.TranslateSentenceExercise];

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

    const toggleButtonClassName =
        "flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 text-gray-600 hover:text-blue-600 text-sm font-medium cursor-pointer";

    return (
        <>
            {!isOpen && (
                <button
                    onClick={onToggle}
                    className={`absolute top-4 right-7 z-20 ${toggleButtonClassName}`}
                >
                    <BarChart2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Статистика</span>
                    <ChevronLeft className="h-4 w-4" />
                </button>
            )}

            <div
                className={`absolute top-0 right-0 h-full z-10 transition-all duration-300 ease-in-out ${
                    isOpen ? "w-64" : "w-0"
                } overflow-hidden`}
            >
                <div className="w-64 h-full bg-white border-l border-gray-200 shadow-xl flex flex-col">
                    <div className="flex flex-col items-center gap-3 border-b border-gray-100 px-4 pb-4 pt-5">
                        <button
                            onClick={onToggle}
                            className={toggleButtonClassName}
                        >
                            <BarChart2 className="h-4 w-4" />
                            <span>Статистика</span>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                        </button>
                        <p className="text-center text-md text-gray-400">
                            Всього: {total} слів
                        </p>
                    </div>

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

const PracticeCategoryDropdown = ({
    categories,
    value,
    onChange,
    className = "",
}) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    const options = useMemo(() => {
        return [
            {
                id: null,
                label: "Усі категорії",
                hint: "Повний словник",
                kind: "all",
            },
            {
                id: "uncategorized",
                label: "Без категорії",
                hint: "Картки без категорії",
                kind: "uncategorized",
            },
            ...categories.map((c) => ({
                id: c._id,
                label: c.name,
                hint: c.description?.trim() || "Категорія",
                kind: "folder",
                color: c.color || "#6366f1",
            })),
        ];
    }, [categories]);

    const selected = useMemo(() => {
        return (
            options.find((o) => o.id === value) ??
            options[0] ?? {
                id: null,
                label: "Усі категорії",
                hint: "Повний словник",
                kind: "all",
            }
        );
    }, [options, value]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const onDocMouseDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const renderOptionIcon = (opt, small) => {
        const box = small ? "h-9 w-9 rounded-lg" : "h-10 w-10 rounded-xl";
        if (opt.kind === "all") {
            return (
                <span
                    className={`flex ${box} shrink-0 items-center justify-center bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm`}
                >
                    <LayoutGrid className={small ? "h-4 w-4" : "h-5 w-5"} />
                </span>
            );
        }
        if (opt.kind === "uncategorized") {
            return (
                <span
                    className={`flex ${box} shrink-0 items-center justify-center bg-linear-to-br from-slate-500 to-slate-700 text-white shadow-sm`}
                >
                    <FolderOpen className={small ? "h-4 w-4" : "h-5 w-5"} />
                </span>
            );
        }
        return (
            <span
                className={`flex ${box} shrink-0 items-center justify-center text-white shadow-sm`}
                style={{
                    background: `linear-gradient(145deg, ${opt.color}, color-mix(in srgb, ${opt.color} 72%, #1e293b))`,
                }}
            >
                <FolderOpen className={small ? "h-4 w-4" : "h-5 w-5"} />
            </span>
        );
    };

    return (
        <div
            className={`relative ${open ? "z-30" : ""} ${className}`}
            ref={rootRef}
        >
            <button
                type="button"
                id="practice-category-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls="practice-category-listbox"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-md transition-all duration-200 hover:border-indigo-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
            >
                {renderOptionIcon(selected, true)}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                        {selected.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {selected.hint}
                    </span>
                </span>
                <ChevronDown
                    className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
                        open ? "rotate-180 text-indigo-500" : ""
                    }`}
                    aria-hidden
                />
            </button>

            {open && (
                <div
                    id="practice-category-listbox"
                    role="listbox"
                    aria-labelledby="practice-category-trigger"
                    className="absolute left-0 right-0 z-[100] mt-2 max-h-[min(28rem,calc(100dvh-10rem))] overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-200/90 bg-white py-1.5 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-100/30 [scrollbar-width:thin] [scrollbar-color:rgb(199_210_254)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-indigo-200/90"
                >
                    {options.map((opt, index) => {
                        const isSelected = opt.id === value;
                        const showDivider =
                            index === 2 && categories.length > 0;
                        return (
                            <div key={String(opt.id ?? "all")}>
                                {showDivider && (
                                    <div
                                        className="my-1.5 border-t border-gray-100"
                                        aria-hidden
                                    />
                                )}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ${
                                        isSelected
                                            ? "bg-indigo-50/90"
                                            : "hover:bg-linear-to-r hover:from-slate-50 hover:to-transparent"
                                    }`}
                                >
                                    {renderOptionIcon(opt, true)}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-gray-900">
                                            {opt.label}
                                        </span>
                                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                                            {opt.hint}
                                        </span>
                                    </span>
                                    {isSelected && (
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                                            <Check
                                                className="h-4 w-4"
                                                strokeWidth={2.5}
                                            />
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const PracticePage = () => {
    const [uiState, setUiState] = useState({
        showExercise: false,
    });

    const [selectedPracticeCategoryId, setSelectedPracticeCategoryId] =
        useState(null);

    const [vocabularyLoadSettled, setVocabularyLoadSettled] = useState(false);

    const { categories, getCategories } = useCategoryStore(
        useShallow((s) => ({
            categories: s.categories,
            getCategories: s.getCategories,
        }))
    );

    const { exerciseState, data, singleStatusMode } = useVocabularyWordsStore(
        useShallow((state) => ({
            exerciseState: state.exerciseState,
            data: state.data,
            singleStatusMode: state.singleStatusMode,
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
        getCategories();
    }, [getCategories]);

    useEffect(() => {
        let disposed = false;

        if (practiceNavReselect > 0) {
            queueMicrotask(() => {
                if (disposed) {
                    return;
                }
                setVocabularyLoadSettled(false);
                setUiState((prev) => ({ ...prev, showExercise: false }));
            });
        }
        doFetchVocabularyWords()
            .catch(() => {})
            .finally(() => {
                if (!disposed) {
                    setVocabularyLoadSettled(true);
                }
            });

        return () => {
            disposed = true;
        };
    }, [doFetchVocabularyWords, practiceNavReselect]);

    const showVocabularyLoader =
        !vocabularyLoadSettled || isLoadingVocabularyWords;

    const statsData = useMemo(() => {
        const id = exerciseState.practiceCategoryId;
        if (id === null || id === undefined || id === "") {
            return data;
        }
        return data.filter((w) => matchesPracticeCategory(w, id));
    }, [data, exerciseState.practiceCategoryId]);

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
            features: [
                "Активний словниковий запас",
                "Навички перекладу",
                "Розуміння контексту",
            ],
            gradingMode: "self",
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
                "Пасивний словниковий запас",
                "Навички читання",
                "Розуміння контексту",
            ],
            gradingMode: "auto",
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
            features: [
                "Розпізнавання слів",
                "Навички слухання",
                "Навички вимови",
            ],
            gradingMode: "auto",
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
            practiceCategoryId: selectedPracticeCategoryId,
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
        <div className="ml-68 flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
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

            {!uiState.showExercise && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8 [scrollbar-gutter:stable]">
                    {showVocabularyLoader ? (
                        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col items-center justify-center gap-4 min-h-[45vh]">
                            <Loader className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="text-sm text-gray-600">
                                Зачекайте, будь ласка
                            </p>
                        </div>
                    ) : loadingVocabularyWordsError ? (
                        <LoadErrorNotice />
                    ) : (
                        <div className="mx-auto w-full max-w-7xl">
                            <section className="relative z-20 mb-10 rounded-2xl border border-indigo-100/80 bg-white/90 shadow-md shadow-indigo-100/30 ring-1 ring-white/60 backdrop-blur-sm">
                                <div
                                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                                    aria-hidden
                                >
                                    <div className="absolute -right-12 -top-10 h-32 w-32 rounded-full bg-linear-to-br from-indigo-200/40 to-violet-200/25 blur-2xl" />
                                </div>
                                <div className="relative z-10 flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:p-8">
                                    <div className="max-w-xl shrink-0">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/90">
                                            Перед стартом
                                        </p>
                                        <h2 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">
                                            Категорія для практики
                                        </h2>
                                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                            Оберіть категорію, з якої вправи
                                            братимусь картки
                                        </p>
                                    </div>
                                    <PracticeCategoryDropdown
                                        categories={categories}
                                        value={selectedPracticeCategoryId}
                                        onChange={setSelectedPracticeCategoryId}
                                        className="w-full sm:max-w-md sm:shrink-0"
                                    />
                                </div>
                            </section>

                            <div className="relative z-0 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                                {coreExercisesData.map((exercise) => {
                                    const Icon = exercise.icon;
                                    const gradingBadge =
                                        GRADING_BADGE[exercise.gradingMode];

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
                                            {gradingBadge ? (
                                                <span
                                                    className={`absolute top-4 right-4 z-[1] inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${gradingBadge.className}`}
                                                >
                                                    {gradingBadge.label}
                                                </span>
                                            ) : null}
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
                                                        {exercise.difficulty}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-2">
                                                    {exercise.features.map(
                                                        (feature, index) => (
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

                            <PracticeSettingsPanel />
                        </div>
                    )}
                </div>
            )}

            {uiState.showExercise && (
                <div
                    className={`relative flex min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] transition-[padding] duration-300 ease-in-out ${
                        uiState.showStatsSidebar
                            ? "py-8 pl-8 pr-[calc(2rem+16rem)]"
                            : "p-8"
                    }`}
                >
                    {exercise}
                    <StatsSidebar
                        isOpen={uiState.showStatsSidebar}
                        onToggle={toggleStatsSidebar}
                        data={statsData}
                        exerciseType={exerciseState.exerciseType}
                        singleStatusMode={singleStatusMode}
                    />
                </div>
            )}
        </div>
    );
};

export { PracticePage };
