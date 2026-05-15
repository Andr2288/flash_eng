import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Edit, Trash2, Volume2 } from "lucide-react";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { generateSpeech } from "../store/features/vocabularyWords/vocabularyWordsApi.js";
import toast from "react-hot-toast";
import { GENERIC_ERROR_TOAST } from "../constants/toastMessages.js";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";
import DetailedCardInfo from "./DetailedCardInfo.jsx";

const LEVEL_BADGE_STYLES = {
    A0: "bg-blue-100 text-blue-800 border-blue-200",
    A1: "bg-green-100 text-green-800 border-green-200",
    A2: "bg-yellow-100 text-yellow-800 border-yellow-200",
    B1: "bg-purple-100 text-purple-800 border-purple-200",
    B2: "bg-pink-100 text-pink-800 border-pink-200",
    C1: "bg-emerald-100 text-emerald-800 border-emerald-200",
    C2: "bg-slate-100 text-slate-800 border-slate-200",
};

function getNormalizedEnglishLevel(level) {
    const normalized = String(level || "A0").toUpperCase();
    return LEVEL_BADGE_STYLES[normalized] ? normalized : "A0";
}

const DetailedFlashcardView = ({
    flashcards,
    onEdit,
    initialCardIndex = 0,
    onCardIndexChange,
}) => {
    const { deleteFlashcard, updateFlashcard } = useFlashcardStore();

    const [currentIndex, setCurrentIndex] = useState(initialCardIndex);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [updatedFlashcards, setUpdatedFlashcards] = useState(flashcards);

    const currentAudioRef = useRef(null);
    const isPlayingRef = useRef(false);

    useEffect(() => {
        if (initialCardIndex !== currentIndex) {
            setCurrentIndex(initialCardIndex);
            setIsFlipped(false);
        }
    }, [initialCardIndex]);

    useEffect(() => {
        setUpdatedFlashcards(flashcards);
    }, [flashcards]);

    useEffect(() => {
        if (typeof onCardIndexChange === "function") {
            onCardIndexChange(currentIndex);
        }
    }, [currentIndex, onCardIndexChange]);

    const processTextContent = (text) => {
        if (!text) return "";

        let processedText = text;

        processedText = processedText.replace(
            /\n\n/g,
            '</p><p class="mb-4 last:mb-0">'
        );
        processedText = `<p class="mb-4 last:mb-0">${processedText}</p>`;

        return processedText;
    };

    const stopCurrentAudio = useCallback(() => {
        if (currentAudioRef.current) {
            try {
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current = null;
            } catch (error) {
                console.warn("Error stopping audio:", error);
            }
        }
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
    }, []);

    const handleFlip = useCallback(() => {
        if (!isChanging) {
            setIsFlipped(!isFlipped);
        }
    }, [isChanging, isFlipped]);

    const handleCardContextMenu = useCallback(
        (event) => {
            event.preventDefault();
            handleFlip();
        },
        [handleFlip]
    );

    const nextCard = useCallback(() => {
        if (currentIndex < updatedFlashcards.length - 1 && !isChanging) {
            setIsChanging(true);
            setIsFlipped(false);
            stopCurrentAudio();
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
                setIsChanging(false);
            }, 0);
        }
    }, [currentIndex, updatedFlashcards.length, isChanging, stopCurrentAudio]);

    const prevCard = useCallback(() => {
        if (currentIndex > 0 && !isChanging) {
            setIsChanging(true);
            setIsFlipped(false);
            stopCurrentAudio();
            setTimeout(() => {
                setCurrentIndex(currentIndex - 1);
                setIsChanging(false);
            }, 0);
        }
    }, [currentIndex, isChanging, stopCurrentAudio]);

    const goToCard = useCallback(
        (index) => {
            if (index !== currentIndex && !isChanging) {
                setIsChanging(true);
                setIsFlipped(false);
                stopCurrentAudio();
                setTimeout(() => {
                    setCurrentIndex(index);
                    setIsChanging(false);
                }, 0);
            }
        },
        [currentIndex, isChanging, stopCurrentAudio]
    );

    const speakText = useCallback(
        async (text, isAutoPlay = false) => {
            if (!text || isChanging || isPlayingRef.current) {
                console.log("Speech blocked:", {
                    text: !!text,
                    isChanging,
                    isPlaying: isPlayingRef.current,
                });
                return;
            }

            try {
                stopCurrentAudio();

                isPlayingRef.current = true;
                setIsPlayingAudio(true);

                console.log("Starting TTS for:", text.substring(0, 50));

                if (!isPlayingRef.current) {
                    console.log("TTS request cancelled");
                    return;
                }

                const audioUrl = await generateSpeech(text.trim());
                const audio = new Audio(audioUrl);

                currentAudioRef.current = audio;

                audio.onended = () => {
                    console.log("Audio ended");
                    isPlayingRef.current = false;
                    setIsPlayingAudio(false);
                    currentAudioRef.current = null;
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = (error) => {
                    console.error("Audio error:", error);
                    isPlayingRef.current = false;
                    setIsPlayingAudio(false);
                    currentAudioRef.current = null;
                    URL.revokeObjectURL(audioUrl);
                    if (!isAutoPlay) {
                        toast.error("Помилка відтворення звуку");
                    }
                };

                audio.onabort = () => {
                    console.log("Audio aborted");
                    isPlayingRef.current = false;
                    setIsPlayingAudio(false);
                    currentAudioRef.current = null;
                    URL.revokeObjectURL(audioUrl);
                };

                await audio.play();
                console.log("Audio started playing");
            } catch (error) {
                isPlayingRef.current = false;
                setIsPlayingAudio(false);
                currentAudioRef.current = null;

                console.error("Error playing TTS:", error);

                if (!isAutoPlay) {
                    if (error.response?.status === 401) {
                        toast.error("API ключ недійсний");
                    } else if (error.response?.status === 402) {
                        toast.error(
                            "Недостатньо кредитів OpenAI. Поповніть баланс"
                        );
                    } else if (error.response?.status === 429) {
                        toast.error(
                            "Перевищено ліміт запитів OpenAI. Спробуйте пізніше"
                        );
                    } else if (error.response?.status === 503) {
                        toast.error("Проблеми з підключенням до OpenAI API");
                    } else if (error.response?.status === 500) {
                        toast.error("OpenAI API не налаштований");
                    } else if (error.code === "ECONNABORTED") {
                        toast.error("Тайм-аут запиту. Спробуйте ще раз");
                    } else {
                        toast.error("Помилка генерації озвучення");
                    }
                }
            }
        },
        [isChanging, stopCurrentAudio]
    );

    const handleDeleteClick = (card) => {
        setCardToDelete(card);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!cardToDelete) return;

        setIsDeleting(true);
        const idToDelete = cardToDelete._id;
        try {
            await deleteFlashcard(idToDelete);
            setShowDeleteModal(false);
            setCardToDelete(null);

            const newFlashcards = updatedFlashcards.filter(
                (card) => card._id !== idToDelete
            );
            setUpdatedFlashcards(newFlashcards);

            if (currentIndex >= newFlashcards.length && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
            }
        } catch (error) {
            console.error("Error deleting flashcard:", error);
            toast.error(GENERIC_ERROR_TOAST);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        if (!isDeleting) {
            setShowDeleteModal(false);
            setCardToDelete(null);
        }
    };

    useEffect(() => {
        const handleKeyPress = (event) => {
            const isModalOpen = document.querySelector(
                ".fixed.inset-0.bg-gray-600\\/80"
            );
            if (isModalOpen) return;

            const activeElement = document.activeElement;
            const isInputField =
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.contentEditable === "true");

            if (isInputField) return;

            const currentCard = updatedFlashcards[currentIndex];
            if (!currentCard) return;

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                prevCard();
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                nextCard();
            } else if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                handleFlip();
            } else if (
                event.key === "v" ||
                event.key === "V" ||
                event.key === "м" ||
                event.key === "М"
            ) {
                event.preventDefault();

                if (currentCard?.text && !isPlayingRef.current && !isChanging) {
                    console.log(
                        "Keyboard TTS triggered for:",
                        currentCard.text
                    );
                    speakText(currentCard.text);
                } else {
                    console.log("TTS blocked by conditions:", {
                        hasText: !!currentCard?.text,
                        isPlaying: isPlayingRef.current,
                        isChanging,
                    });
                }
            } else if (
                event.key === "e" ||
                event.key === "E" ||
                event.key === "у" ||
                event.key === "У"
            ) {
                event.preventDefault();
                if (!isFlipped && !isChanging) {
                    onEdit(currentCard);
                }
            } else if (event.key === "Delete") {
                event.preventDefault();
                if (!isFlipped && !isChanging) {
                    handleDeleteClick(currentCard);
                }
            }
        };

        window.addEventListener("keydown", handleKeyPress, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [
        prevCard,
        nextCard,
        handleFlip,
        speakText,
        currentIndex,
        updatedFlashcards,
        isChanging,
        isFlipped,
    ]);

    useEffect(() => {
        return () => {
            stopCurrentAudio();
        };
    }, [currentIndex, stopCurrentAudio]);

    useEffect(() => {
        return () => {
            stopCurrentAudio();
        };
    }, []);

    if (!updatedFlashcards || updatedFlashcards.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-gray-500 text-lg">
                    Немає карток для відображення
                </p>
            </div>
        );
    }

    const validCurrentIndex = Math.min(
        currentIndex,
        updatedFlashcards.length - 1
    );
    const currentCard = updatedFlashcards[validCurrentIndex];

    return (
        <div className="mx-auto w-full min-w-0 max-w-4xl shrink-0 self-stretch">
            {/* Main Card Container */}
            <div className="relative w-full">
                {/* Card Actions — лише на лицьовому боку */}
                {!isFlipped && (
                    <div className="absolute top-6 right-6 z-20 flex space-x-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (!isChanging) onEdit(currentCard);
                            }}
                            disabled={isChanging}
                            className="cursor-pointer p-2 bg-white hover:bg-blue-50 text-blue-600 rounded-lg shadow-sm border border-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="Редагувати (E)"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!isChanging) {
                                    handleDeleteClick(currentCard);
                                }
                            }}
                            disabled={isChanging}
                            className="cursor-pointer p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg shadow-sm border border-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="Видалити (Del)"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {!isFlipped && (
                    <div className="absolute top-6 left-6 z-20">
                        <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${LEVEL_BADGE_STYLES[getNormalizedEnglishLevel(currentCard.englishLevel)]}`}
                        >
                            Рівень:{" "}
                            {getNormalizedEnglishLevel(currentCard.englishLevel)}
                        </span>
                    </div>
                )}

                {/* Card Content */}
                <div
                    className="relative h-[400px] w-full min-w-0 overflow-hidden rounded-2xl bg-white shadow-md md:h-[458px]"
                    onContextMenu={handleCardContextMenu}
                >
                    {/* Front Side */}
                    <div
                        key={`front-${validCurrentIndex}`}
                        className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${
                            isFlipped
                                ? "pointer-events-none opacity-0"
                                : isChanging
                                  ? "opacity-70"
                                  : "opacity-100"
                        }`}
                        aria-hidden={isFlipped}
                    >
                        <div className="flex h-full w-full min-w-0 flex-col justify-center bg-white p-10">
                            <div className="w-full min-w-0 space-y-3 text-center">
                                <h2 className="mb-2 w-full break-words text-3xl font-bold text-gray-900">
                                        {currentCard.text}
                                    </h2>

                                    {currentCard.transcription && (
                                        <p className="text-base text-gray-600 font-mono mb-2">
                                            {currentCard.transcription}
                                        </p>
                                    )}

                                    <div className="py-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                speakText(currentCard.text)
                                            }
                                            disabled={
                                                !currentCard.text ||
                                                isPlayingAudio ||
                                                isChanging
                                            }
                                            className={`cursor-pointer disabled:cursor-default px-6 py-3 rounded-lg transition-colors shadow-md ${
                                                isPlayingAudio
                                                    ? "bg-green-500 hover:bg-green-600 animate-pulse"
                                                    : "bg-purple-500 hover:bg-purple-600"
                                            } disabled:bg-gray-300 text-white flex items-center space-x-2 mx-auto`}
                                            title={
                                                isPlayingAudio
                                                    ? "Відтворення... (натисніть V щоб зупинити)"
                                                    : "Прослухати (або натисніть V)"
                                            }
                                        >
                                            <Volume2 className="w-5 h-5" />
                                            <span>
                                                {isPlayingAudio
                                                    ? "Відтворення..."
                                                    : "Озвучити"}
                                            </span>
                                        </button>
                                    </div>

                                <p className="text-base text-gray-500">
                                    Натисніть Пробіл / Enter / ПКМ, щоб
                                    побачити переклад
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Back Side */}
                    <div
                        key={`back-${validCurrentIndex}`}
                        className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${
                            !isFlipped
                                ? "pointer-events-none opacity-0"
                                : isChanging
                                  ? "opacity-70"
                                  : "opacity-100"
                        }`}
                        aria-hidden={!isFlipped}
                    >
                        <DetailedCardInfo
                            displayCard={currentCard}
                            className="h-full w-full min-w-0 overflow-y-auto custom-scrollbar"
                            defaultExpanded={true}
                            collapsible={false}
                            showTopSection={false}
                        />
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="mx-auto mt-4 flex w-full min-w-0 max-w-4xl items-center justify-between">
                {/* Left button */}
                <button
                    onClick={prevCard}
                    disabled={validCurrentIndex === 0 || isChanging}
                    className="flex items-center space-x-2 px-5 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors min-w-[140px] cursor-pointer"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Попередня</span>
                </button>

                {/* Center dots */}
                <div className="flex space-x-1 overflow-hidden max-w-md">
                    {updatedFlashcards.length <= 20 ? (
                        updatedFlashcards.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToCard(index)}
                                disabled={isChanging}
                                className={`w-3 h-3 rounded-full transition-colors disabled:cursor-not-allowed flex-shrink-0 ${
                                    index === validCurrentIndex
                                        ? "bg-blue-600"
                                        : "bg-gray-300 hover:bg-gray-400"
                                }`}
                            />
                        ))
                    ) : (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                                {validCurrentIndex + 1} /{" "}
                                {updatedFlashcards.length}{" "}
                            </span>
                            <div className="w-80 bg-gray-300 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                                    style={{
                                        width: `${((validCurrentIndex + 1) / updatedFlashcards.length) * 100}%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right button */}
                <button
                    onClick={nextCard}
                    disabled={
                        validCurrentIndex === updatedFlashcards.length - 1 ||
                        isChanging
                    }
                    className="flex items-center space-x-2 px-5 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition-colors min-w-[140px] cursor-pointer"
                >
                    <span>Наступна</span>
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                cardText={cardToDelete?.text}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default DetailedFlashcardView;
