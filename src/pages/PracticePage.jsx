import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
    TranslateSentenceExercise,
    FillTheGapExercise,
    ListenAndFillTheGapExercise,
    MixedExercises,
} from "../components/exercises/index.js";
import {
    MIXED_EXERCISE_TYPE,
    pickRandomRoundExerciseType,
} from "../constants/practiceExerciseTypes.js";
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
    Shuffle,
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
    MixedExercises: MIXED_EXERCISE_TYPE,
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
    [ExerciseType.MixedExercises]: "Змішані вправи",
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
    mixed: {
        label: "Випадкова черга",
        className: "border-violet-200 bg-violet-50 text-violet-800",
    },
};

const StatsSidebar = ({
    isOpen,
    onToggle,
    data,
    exerciseType,
    singleStatusMode,
    mixedMode,
}) => {
    const statusKey =
        singleStatusMode || mixedMode
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
            {isOpen && (
                <button
                    type="button"
                    aria-label="Закрити статистику"
                    onClick={onToggle}
                    className="fixed inset-0 z-[15] bg-black/30 md:hidden"
                />
            )}

            {!isOpen && (
                <div className="sticky top-0 z-20 flex shrink-0 justify-end px-4 pb-2 pt-2 md:absolute md:right-7 md:top-4 md:px-0 md:pb-0 md:pt-0">
                    <button
                        onClick={onToggle}
                        className={toggleButtonClassName}
                    >
                        <BarChart2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Статистика</span>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div
                className={`fixed right-0 top-0 z-20 h-full transition-all duration-300 ease-in-out md:absolute md:z-10 ${
                    isOpen ? "w-[min(100%,18rem)]" : "w-0"
                } overflow-hidden`}
            >
                <div className="flex h-full w-[min(100vw,18rem)] flex-col border-l border-gray-200 bg-white shadow-xl">
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
                            {mixedMode
                                ? EXERCISE_LABEL[ExerciseType.MixedExercises]
                                : EXERCISE_LABEL[exerciseType] || "—"}
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

    const mixedMode = exerciseState.mixedMode === true;

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
        {
            id: "mixed-exercises",
            type: ExerciseType.MixedExercises,
            title: "Змішані вправи",
            description:
                "Усі три типи вправ по черзі у випадковому порядку",
            icon: Shuffle,
            color: "from-violet-500 to-fuchsia-500",
            difficulty: "Різна",
            difficultyColor: "text-violet-600",
            difficultyBg: "bg-violet-600",
            features: [
                "Переклад, доповнення та слухання",
                "Випадкова черга вправ",
                "Повторення типів дозволені",
            ],
            gradingMode: "mixed",
        },
    ];

    let exercise;

    if (mixedMode) {
        exercise = <MixedExercises />;
    } else if (exerciseState.exerciseType === ExerciseType.TranslateSentenceExercise) {
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
        const isMixed = exerciseType === ExerciseType.MixedExercises;

        updateExerciseState({
            currentVocabularyWordIndex: 0,
            generateNextStage: true,
            mixedMode: isMixed,
            exerciseType: isMixed
                ? pickRandomRoundExerciseType()
                : exerciseType,
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
        <div className="ml-sidebar flex h-app-mobile min-h-0 min-w-0 flex-col overflow-hidden bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
            {!uiState.showExercise && (
                <div className="shrink-0 overflow-hidden border-b border-gray-200 bg-white p-4 sm:p-6 md:p-8">
                    <div className="mx-auto flex items-center">
                        <div className="bg-linear-to-r from-blue-600 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3 shadow-md">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                                Практика ⚡
                            </h1>
                            <p className="text-sm text-gray-600 sm:text-base">
                                Покращуйте свої навички за допомогою
                                інтерактивних вправ
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!uiState.showExercise && (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-scroll-end [scrollbar-gutter:stable] sm:px-6 sm:pt-6 md:p-8">
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

                            <div className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
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
                                            className="group relative flex cursor-pointer flex-col justify-between rounded-2xl bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-lg sm:p-6 md:p-8"
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
                                                    className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br ${exercise.color} transition-transform duration-300 group-hover:scale-110 sm:mb-8 sm:h-16 sm:w-16`}
                                                >
                                                    <Icon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                                                </div>

                                                <div className="mb-2 flex items-center justify-between">
                                                    <h4 className="text-lg font-bold text-gray-900 sm:text-xl">
                                                        {exercise.title}
                                                    </h4>
                                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                                </div>

                                                <p className="mb-4 text-sm text-gray-600 sm:mb-6 sm:text-base">
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
                    className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable] transition-[padding] duration-300 ease-in-out ${
                        uiState.showStatsSidebar
                            ? "md:py-8 md:pl-8 md:pr-[calc(2rem+16rem)]"
                            : "md:p-8"
                    }`}
                >
                    <StatsSidebar
                        isOpen={uiState.showStatsSidebar}
                        onToggle={toggleStatsSidebar}
                        data={statsData}
                        exerciseType={exerciseState.exerciseType}
                        singleStatusMode={singleStatusMode}
                        mixedMode={mixedMode}
                    />
                    <div
                        className={`flex min-h-full w-full flex-col justify-center pb-scroll-end ${
                            uiState.showStatsSidebar
                                ? "px-4 py-2"
                                : "px-4 py-2 sm:px-6"
                        }`}
                    >
                        <div className="w-full shrink-0">{exercise}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { PracticePage };
