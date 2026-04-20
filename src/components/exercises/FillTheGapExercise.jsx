import { useState, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useThunk } from "../../hooks/use-thunk";
import {
    useVocabularyWordsStore,
    generateSentenceCompletion,
    generateSpeech,
    makeNextSelection,
    updateExerciseState,
    updateVocabularyWord,
} from "../../store";
import { Loader, CheckCircle, XCircle } from "lucide-react";

const FillTheGapExercise = () => {
    const [
        doUpdateVocabularyWord,
        isUpdatingVocabularyWord,
        updateVocabularyWordError,
    ] = useThunk(updateVocabularyWord);

    const [
        doGenerateSentenceCompletion,
        isGenerating,
        generateSentenceCompletionError,
    ] = useThunk(generateSentenceCompletion);

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

    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [sentenceData, setSentenceData] = useState(null);
    const [answerOptions, setAnswerOptions] = useState([]);
    const [correctAnswer, setCorrectAnswer] = useState("");

    const isLoading = isGenerating;
    const combinedProcessing = isGenerating;

    const loadExercise = async (vocabularyWordMainParameters) => {
        try {
            setSelectedAnswer(null);
            setShowResult(false);
            setIsCorrect(false);

            const result = await doGenerateSentenceCompletion(
                vocabularyWordMainParameters
            );

            setSentenceData(result);
            setCorrectAnswer(result.correctAnswer);

            // 1. Визначаємо регістр correctAnswer
            const isUpperCase =
                result.correctAnswer === result.correctAnswer.toUpperCase();

            // 2. Беремо елементи з data, виключаючи correctAnswer
            const words = data
                .map((item) => item.main_parameters.text)
                .filter((text) => text !== result.correctAnswer);

            // 3. Рандомно перемішуємо та беремо 3
            const randomWords = words
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            // 4. Формуємо options
            let options = [result.correctAnswer, ...randomWords];

            // 5. Приводимо до одного регістру
            options = options.map((word) =>
                isUpperCase ? word.toUpperCase() : word.toLowerCase()
            );

            // 6. Перемішуємо options (Fisher–Yates)
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }

            setAnswerOptions(options);
        } catch (error) {
            console.error("Помилка генерації вправи:", error);
        }
    };

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

    const handleAnswerSelect = (option) => {
        if (selectedAnswer !== null) return;

        setSelectedAnswer(option);
        const correct = option.toLowerCase() === correctAnswer.toLowerCase();
        setIsCorrect(correct);
        setShowResult(true);
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
                        .checkpoint_fill_the_gap_exercise
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
                    .last_reviewed_fill_the_gap_exercise;
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
                        status_fill_the_gap_exercise: isCorrect
                            ? "REVIEW"
                            : "AGAIN",
                        last_reviewed_fill_the_gap_exercise:
                            new Date().toISOString(),
                        checkpoint_fill_the_gap_exercise: nextCheckpoint,
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

        const nextVocabularyItemIndex = getNextVocabularyItemIndex();

        const exercises = [
            "translate_sentence_exercise",
            "listen_and_fill_the_gap_exercise",
        ];

        const nextExerciseType =
            exercises[Math.floor(Math.random() * exercises.length)];

        updateExerciseState({
            exerciseType: nextExerciseType,
            currentVocabularyWordIndex: nextVocabularyItemIndex,
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
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            Яке слово підходить для пропуску?
                        </h2>
                        <div className="bg-green-100/80 rounded-md p-6 border-l-4 border-r-4 border-emerald-400">
                            <p className="text-xl text-gray-800 leading-relaxed font-mono tracking-wide mb-3">
                                {showResult
                                    ? sentenceData?.completeSentence
                                        ? sentenceData.completeSentence
                                              .split(
                                                  new RegExp(
                                                      `(\\b${correctAnswer}\\b)`,
                                                      "gi"
                                                  )
                                              )
                                              .map((part, index) =>
                                                  part.toLowerCase() ===
                                                  correctAnswer.toLowerCase() ? (
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
                                        : null
                                    : sentenceData?.displaySentence}
                            </p>

                            {showResult &&
                                sentenceData?.sentenceTranslation && (
                                    <div className="pt-3 border-t border-emerald-300">
                                        {/*<p className="text-sm text-gray-700 mb-1">*/}
                                        {/*    Переклад речення:*/}
                                        {/*</p>*/}
                                        <p className="text-base text-gray-700 italic">
                                            {sentenceData.sentenceTranslation}
                                        </p>
                                    </div>
                                )}

                            {sentenceData?.hint && !showResult && (
                                <p className="text-sm text-emerald-600 font-medium pt-3 italic">
                                    Підказка: {sentenceData.hint}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Answer Options */}
                    <div className="grid grid-cols-2 gap-4 w-full mx-auto mb-6">
                        {answerOptions.map((option, index) => {
                            let buttonClass =
                                "w-full p-5 text-center rounded-xl border-2 transition-all duration-200 font-medium text-lg ";

                            if (selectedAnswer === null) {
                                buttonClass += combinedProcessing
                                    ? "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-700 hover:shadow-lg hover:scale-102 cursor-pointer";
                            } else if (
                                option.toLowerCase() ===
                                correctAnswer.toLowerCase()
                            ) {
                                buttonClass +=
                                    "border-green-500 bg-green-50 text-green-700 shadow-lg";
                            } else if (option === selectedAnswer) {
                                buttonClass +=
                                    "border-red-400 bg-red-50 text-red-700 shadow-lg";
                            } else {
                                buttonClass +=
                                    "border-gray-200 bg-gray-50 text-gray-500";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(option)}
                                    disabled={
                                        selectedAnswer !== null ||
                                        combinedProcessing
                                    }
                                    className={buttonClass}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="flex-1">{option}</span>
                                        {selectedAnswer !== null && (
                                            <span className="ml-3">
                                                {option.toLowerCase() ===
                                                correctAnswer.toLowerCase() ? (
                                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                                ) : option ===
                                                  selectedAnswer ? (
                                                    <XCircle className="w-6 h-6 text-red-600" />
                                                ) : null}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Button */}
                    <div className="w-1/2 flex justify-center">
                        <button
                            onClick={handleNextClick}
                            disabled={
                                selectedAnswer === null || combinedProcessing
                            }
                            className={`px-6 sm:px-22.5 py-3.5 rounded-md font-semibold flex-1 text-[17px] transition-all duration-200 flex justify-center items-center gap-2 sm:gap-3 shadow-md w-full sm:w-auto ${
                                selectedAnswer === null || combinedProcessing
                                    ? "bg-gray-400 text-white cursor-not-allowed"
                                    : "bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white hover:shadow-lg hover:scale-102 cursor-pointer"
                            }`}
                        >
                            Далі
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export { FillTheGapExercise };
