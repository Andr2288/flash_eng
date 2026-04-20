import { useState, useEffect, useRef, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useThunk } from "../../hooks/use-thunk";
import {
    useVocabularyWordsStore,
    generateListenAndFill,
    generateSpeech,
    makeNextSelection,
    updateExerciseState,
    updateVocabularyWord,
} from "../../store";
import { Loader, CheckCircle, XCircle, Volume2 } from "lucide-react";

const ListenAndFillTheGapExercise = () => {
    const [
        doUpdateVocabularyWord,
        isUpdatingVocabularyWord,
        updateVocabularyWordError,
    ] = useThunk(updateVocabularyWord);

    const [doGenerateListenAndFill, isGenerating, generateListenAndFillError] =
        useThunk(generateListenAndFill);

    const [doGenerateSpeech, isGeneratingSpeech, generateSpeechError] =
        useThunk(generateSpeech);

    const { singleStatusMode, data, exerciseState, checkpoints } =
        useVocabularyWordsStore(
            useShallow((state) => ({
                singleStatusMode: state.singleStatusMode,
                data: state.data,
                exerciseState: state.exerciseState,
                checkpoints: state.checkpoints,
            }))
        );

    // TranslateSentenceExercise state
    const [exerciseData, setExerciseData] = useState(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    // Audio state
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

    const inputRef = useRef(null);

    const isLoading = isGenerating;
    const combinedProcessing = isGenerating;

    // Генерація вправи при зміні поточного слова
    useEffect(() => {
        if (
            exerciseState.currentSelection.length > 0 &&
            exerciseState.generateNextStage
        ) {
            const currentWord =
                exerciseState.currentSelection[
                    exerciseState.currentVocabularyWordIndex
                ];
            loadExercise(currentWord.main_parameters);
        }
    }, [
        exerciseState.currentSelection,
        exerciseState.currentVocabularyWordIndex,
        exerciseState.generateNextStage,
    ]);

    const loadExercise = async (vocabularyWordMainParameters) => {
        try {
            // Reset state
            setUserAnswer("");
            setSelectedAnswer(null);
            setIsCorrect(null);
            setShowResult(false);
            setExerciseData(null);

            const result = await doGenerateListenAndFill(
                vocabularyWordMainParameters
            );

            setExerciseData(result);
        } catch (error) {
            console.error("Помилка генерації вправи:", error);
        }
    };

    const handlePlayAudio = async (text) => {
        try {
            setIsGeneratingAudio(true);
            const audioUrl = await doGenerateSpeech(text);
            const audio = new Audio(audioUrl);
            audio.play();
        } catch (error) {
            console.error("Помилка відтворення аудіо:", error);
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const checkAnswer = (answer, correctAnswer, originalWord) => {
        const normalizeText = (text) => {
            return text
                .toLowerCase()
                .trim()
                .replace(/[.,!?;:'"]/g, "");
        };

        const normalizedAnswer = normalizeText(answer);
        const normalizedCorrect = normalizeText(correctAnswer);
        const normalizedOriginal = normalizeText(originalWord);

        // Check exact match with correct form
        if (normalizedAnswer === normalizedCorrect) {
            return true;
        }

        // Check exact match with original word
        if (normalizedAnswer === normalizedOriginal) {
            return true;
        }

        // Check if it's part of a phrase
        if (normalizedCorrect.includes(" ")) {
            return normalizedCorrect
                .split(" ")
                .some((word) => word === normalizedAnswer);
        }

        return false;
    };

    const handleSubmitAnswer = () => {
        if (
            !userAnswer.trim() ||
            selectedAnswer !== null ||
            !exerciseData ||
            combinedProcessing
        )
            return;

        const currentWord =
            exerciseState.currentSelection[
                exerciseState.currentVocabularyWordIndex
            ];

        const correct = checkAnswer(
            userAnswer,
            exerciseData.correctAnswer,
            currentWord.main_parameters.text
        );

        setSelectedAnswer(userAnswer);
        setIsCorrect(correct);
        setShowResult(true);
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !showResult && !combinedProcessing) {
            handleSubmitAnswer();
        }
    };

    const updateCurrentSelectionItem = async () => {
        const currentWord =
            exerciseState.currentSelection[
                exerciseState.currentVocabularyWordIndex
            ];

        let currentCheckpointIndex = 0;

        if (singleStatusMode) {
            currentCheckpointIndex = checkpoints.findIndex((checkpoint) => {
                return (
                    checkpoint.checkpoint ===
                    currentWord.metodology_parameters
                        .checkpoint_translate_sentence_exercise
                );
            });
        } else {
            currentCheckpointIndex = checkpoints.findIndex((checkpoint) => {
                return (
                    checkpoint.checkpoint ===
                    currentWord.metodology_parameters
                        .checkpoint_listen_and_fill_the_gap_exercise
                );
            });
        }

        let currentLastReviewed = null;

        if (singleStatusMode) {
            currentLastReviewed =
                currentWord.metodology_parameters
                    .last_reviewed_translate_sentence_exercise;
        } else {
            currentLastReviewed =
                currentWord.metodology_parameters
                    .last_reviewed_listen_and_fill_the_gap_exercise;
        }

        const today = new Date().toISOString().split("T")[0];

        let nextCheckpoint = checkpoints[currentCheckpointIndex].checkpoint;
        if (currentLastReviewed !== today) {
            if (!isCorrect && currentCheckpointIndex !== 0) {
                nextCheckpoint =
                    checkpoints[currentCheckpointIndex - 1].checkpoint;
            } else if (
                isCorrect &&
                checkpoints.length !== currentCheckpointIndex + 1
            ) {
                nextCheckpoint =
                    checkpoints[currentCheckpointIndex + 1].checkpoint;
            }
        }

        console.log(isCorrect);
        try {
            if (singleStatusMode) {
                await doUpdateVocabularyWord({
                    id: currentWord.id,
                    exerciseType: "translate_sentence_exercise",
                    metodology_parameters: {
                        status_translate_sentence_exercise: isCorrect
                            ? "REVIEW"
                            : "AGAIN",
                        last_reviewed_translate_sentence_exercise:
                            new Date().toISOString(),
                        checkpoint_translate_sentence_exercise: nextCheckpoint,
                    },
                });
            } else {
                await doUpdateVocabularyWord({
                    id: currentWord.id,
                    exerciseType: exerciseState.exerciseType,
                    metodology_parameters: {
                        status_listen_and_fill_the_gap_exercise: isCorrect
                            ? "REVIEW"
                            : "AGAIN",
                        last_reviewed_listen_and_fill_the_gap_exercise:
                            new Date().toISOString(),
                        checkpoint_listen_and_fill_the_gap_exercise:
                            nextCheckpoint,
                    },
                });
            }
        } catch (error) {
            console.error("Помилка оновлення:", error);
        }
    };

    const handleNextClick = async () => {
        if (exerciseState.currentSelection.length === 0) {
            console.log("Немає слів для проходження");
            return;
        }

        await updateCurrentSelectionItem();

        const nextIndex = getNextVocabularyItemIndex();

        const exercises = [
            "translate_sentence_exercise",
            "fill_the_gap_exercise",
        ];

        const nextExerciseType =
            exercises[Math.floor(Math.random() * exercises.length)];

        updateExerciseState({
            exerciseType: nextExerciseType,
            currentVocabularyWordIndex: nextIndex,
            generateNextStage: true,
        });
    };

    const getNextVocabularyItemIndex = () => {
        if (
            exerciseState.currentVocabularyWordIndex ===
            exerciseState.currentSelection.length - 1
        ) {
            makeNextSelection();
            return 0;
        } else {
            return exerciseState.currentVocabularyWordIndex + 1;
        }
    };

    const STATUS_MAP = {
        NEW: {
            label: "Нове",
            className: "bg-blue-100 text-blue-700 border-blue-300",
        },
        AGAIN: {
            label: "Повтор",
            className: "bg-orange-100 text-orange-700 border-orange-300",
        },
        LEARNING: {
            label: "Вивчається",
            className: "bg-green-100 text-green-700 border-green-300",
        },
        MISSED: {
            label: "Пропущено",
            className: "bg-red-100 text-red-700 border-red-300",
        },
    };

    return (
        <div className="w-full sm:w-2/3 min-h-160 sm:min-h-130 flex flex-col items-center bg-white rounded-2xl shadow-md p-12 pb-8 mx-5 sm:m-auto">
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center w-full text-center py-8 sm:py-12">
                    <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-sm sm:text-base text-gray-600">
                        Зачекайте, будь ласка ...
                    </p>
                </div>
            ) : (
                <>
                    {exerciseState.currentSelection.length > 0 && (
                        <div className="mb-8 flex justify-center">
                            <span
                                className={`px-4 py-1.5 text-sm font-semibold rounded-full border ${
                                    STATUS_MAP[
                                        exerciseState.currentSelection[
                                            exerciseState
                                                .currentVocabularyWordIndex
                                        ].metodology_parameters
                                            .status_translate_sentence_exercise
                                    ]?.className
                                }`}
                            >
                                {
                                    STATUS_MAP[
                                        exerciseState.currentSelection[
                                            exerciseState
                                                .currentVocabularyWordIndex
                                        ].metodology_parameters
                                            .status_translate_sentence_exercise
                                    ]?.label
                                }
                            </span>
                        </div>
                    )}
                    {/* Audio Controls */}
                    <div className="text-center mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            Яке слово ви чуєте на місці пропуску?
                        </h2>

                        <div className="bg-blue-100/80 rounded-md p-6 border-l-4 border-r-4 border-blue-400">
                            <div className="flex items-center justify-center mb-4">
                                <button
                                    onClick={() =>
                                        handlePlayAudio(
                                            exerciseData?.completeSentence
                                        )
                                    }
                                    disabled={
                                        !exerciseData?.completeSentence ||
                                        isGeneratingAudio ||
                                        combinedProcessing
                                    }
                                    className="flex items-center justify-center hover:bg-blue-100 rounded-lg p-2 transition-colors duration-200 cursor-pointer disabled:opacity-50"
                                    title="Відтворити аудіо"
                                >
                                    {isGeneratingAudio ? (
                                        <Loader className="w-6 h-6 animate-spin text-blue-600" />
                                    ) : (
                                        <Volume2 className="w-6 h-6 text-blue-600" />
                                    )}
                                </button>
                            </div>

                            {/* Show sentence text */}
                            {exerciseData?.displaySentence && (
                                <div>
                                    <p className="text-xl text-gray-800 leading-relaxed font-mono tracking-wide mb-3">
                                        {showResult
                                            ? exerciseData.completeSentence
                                                  .split(
                                                      new RegExp(
                                                          `(\\b${exerciseData.correctAnswer}\\b)`,
                                                          "gi"
                                                      )
                                                  )
                                                  .map((part, index) =>
                                                      part.toLowerCase() ===
                                                      exerciseData.correctAnswer.toLowerCase() ? (
                                                          <mark
                                                              key={index}
                                                              className={`px-2 py-1 rounded font-bold ${
                                                                  isCorrect
                                                                      ? "bg-green-300 text-green-900"
                                                                      : "bg-yellow-300 text-yellow-900"
                                                              }`}
                                                          >
                                                              {part}
                                                          </mark>
                                                      ) : (
                                                          part
                                                      )
                                                  )
                                            : exerciseData.displaySentence}
                                    </p>

                                    {showResult &&
                                        exerciseData.sentenceTranslation && (
                                            <div className="pt-3 border-t border-blue-300">
                                                {/*<p className="text-sm text-gray-600 mb-1">*/}
                                                {/*    Переклад речення:*/}
                                                {/*</p>*/}
                                                <p className="text-base text-gray-700 italic">
                                                    {
                                                        exerciseData.sentenceTranslation
                                                    }
                                                </p>
                                            </div>
                                        )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Answer Input */}
                    <div className="w-1/2 space-y-4">
                        <div className="mx-auto">
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={userAnswer}
                                    onChange={(e) =>
                                        setUserAnswer(e.target.value)
                                    }
                                    onKeyPress={handleKeyPress}
                                    disabled={showResult || combinedProcessing}
                                    placeholder="Впишіть слово..."
                                    className={`w-full p-4 text-[17px] text-gray-800 text-center rounded-md border-2 transition-all duration-200 font-semibold ${
                                        showResult
                                            ? isCorrect
                                                ? "border-green-500 bg-green-50 text-green-700"
                                                : "border-red-500 bg-red-50 text-red-700"
                                            : combinedProcessing
                                              ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                                              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    }`}
                                />
                                {showResult && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        {isCorrect ? (
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        ) : (
                                            <XCircle className="w-6 h-6 text-red-600" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {!showResult ? (
                            <div className="flex justify-center text-center">
                                <button
                                    onClick={handleSubmitAnswer}
                                    disabled={
                                        !userAnswer.trim() || combinedProcessing
                                    }
                                    className={`px-6 sm:px-22.5 py-3.5 rounded-md font-semibold flex-1 text-[17px] transition-all duration-200 flex justify-center items-center gap-2 sm:gap-3 shadow-md w-full sm:w-auto ${
                                        !userAnswer.trim() || combinedProcessing
                                            ? "bg-gray-400 text-white cursor-not-allowed"
                                            : "bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg hover:scale-102 cursor-pointer"
                                    }`}
                                >
                                    Перевірити
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center text-center mt-4">
                                <button
                                    onClick={handleNextClick}
                                    className={`px-6 sm:px-22.5 py-3.5 rounded-md font-semibold text-[17px] flex-1 transition-all duration-200 flex justify-center items-center gap-2 sm:gap-3 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-102 cursor-pointer w-full`}
                                >
                                    Далі
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export { ListenAndFillTheGapExercise };
