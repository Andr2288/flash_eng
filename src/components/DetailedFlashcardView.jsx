import { useState, useEffect, useCallback, useRef } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Edit,
    Trash2,
    Volume2,
    Sparkles,
} from "lucide-react";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import { generateSpeech } from "../store/features/vocabularyWords/vocabularyWordsApi.js";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";
import DetailedCardInfo from "./DetailedCardInfo.jsx";

const DetailedFlashcardView = ({
    flashcards,
    onEdit,
    initialCardIndex = 0,
}) => {
    const { deleteFlashcard, updateFlashcard } = useFlashcardStore();
    const {
        settings: userSettings,
        hasApiKey,
        loadSettings,
        getTTSSettings,
    } = useUserSettingsStore();

    const [currentIndex, setCurrentIndex] = useState(initialCardIndex);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    // Delete confirmation modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Settings state
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    const [updatedFlashcards, setUpdatedFlashcards] = useState(flashcards);

    const currentAudioRef = useRef(null);
    const isPlayingRef = useRef(false);

    useEffect(() => {
        if (initialCardIndex !== currentIndex) {
            setCurrentIndex(initialCardIndex);
            setIsFlipped(false); // Скидаємо стан перевороту при зміні картки
        }
    }, [initialCardIndex]);

    // Load user settings on component mount
    useEffect(() => {
        const initializeSettings = async () => {
            try {
                await loadSettings();
                setSettingsLoaded(true);
            } catch (error) {
                console.error("Failed to load settings:", error);
                setSettingsLoaded(true); // Continue with defaults
            }
        };

        initializeSettings();
    }, [loadSettings]);

    // Синхронізуємо updatedFlashcards з пропсами
    useEffect(() => {
        setUpdatedFlashcards(flashcards);
    }, [flashcards]);

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

            if (!settingsLoaded) {
                if (!isAutoPlay) {
                    toast.error("Налаштування ще завантажуються...");
                }
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
                        toast.error(
                            "API ключ недійсний. Перевірте налаштування",
                            {
                                duration: 4000,
                                action: {
                                    label: "Налаштування",
                                    onClick: () =>
                                        (window.location.href = "/settings"),
                                },
                            }
                        );
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
                        toast.error(
                            "OpenAI API не налаштований. Встановіть ключ в налаштуваннях"
                        );
                    } else if (error.code === "ECONNABORTED") {
                        toast.error("Тайм-аут запиту. Спробуйте ще раз");
                    } else {
                        toast.error("Помилка генерації озвучення");
                    }
                }
            }
        },
        [isChanging, settingsLoaded, stopCurrentAudio]
    );

    const handleDeleteClick = (card) => {
        setCardToDelete(card);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!cardToDelete) return;

        setIsDeleting(true);
        try {
            await deleteFlashcard(cardToDelete._id);
            setShowDeleteModal(false);
            setCardToDelete(null);

            const newFlashcards = updatedFlashcards.filter(
                (card) => card._id !== cardToDelete._id
            );
            setUpdatedFlashcards(newFlashcards);

            if (currentIndex >= newFlashcards.length && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
            }
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
        <div className="max-w-4xl mx-auto">
            {/* Main Card Container */}
            <div className="relative">
                {/* Card Actions — лише на лицьовому боку */}
                {!isFlipped && (
                    <div className="absolute top-6 right-6 z-20 flex space-x-2">
                        <button
                            onClick={() => {
                                if (!isChanging) onEdit(currentCard);
                            }}
                            disabled={isChanging}
                            className="bg-white/90 p-2 text-blue-600 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 rounded-full"
                            title="Редагувати (E)"
                        >
                            <Edit className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => {
                                if (!isChanging) {
                                    handleDeleteClick(currentCard);
                                }
                            }}
                            disabled={isChanging}
                            className="bg-white/90 p-2 text-red-600 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 rounded-full"
                            title="Видалити (Del)"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Card Content */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden h-[380px] md:h-[458px] relative">
                    {/* Front Side */}
                    {!isFlipped && (
                        <div
                            key={`front-${validCurrentIndex}`}
                            className={`h-full transition-all duration-150 ${
                                isChanging ? "opacity-70" : "opacity-100"
                            }`}
                        >
                            <div className="bg-white h-full flex flex-col justify-center items-center p-8">
                                <div className="text-center space-y-3 w-full">
                                    {currentCard.isAIGenerated && (
                                        <div className="inline-flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                            <Sparkles className="w-3 h-3" />
                                            <span>ШІ-генерація</span>
                                        </div>
                                    )}

                                    <h2 className="text-3xl font-bold text-gray-900 mb-2 break-words max-w-md mx-auto">
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
                                                isChanging ||
                                                !settingsLoaded
                                            }
                                            className={`px-6 py-3 rounded-lg transition-all shadow-md ${
                                                isPlayingAudio
                                                    ? "bg-green-500 hover:bg-green-600 animate-pulse scale-105"
                                                    : "bg-purple-500 hover:bg-purple-600 hover:scale-105"
                                            } disabled:bg-gray-300 disabled:scale-100 text-white flex items-center space-x-2 mx-auto`}
                                            title={
                                                !settingsLoaded
                                                    ? "Завантаження налаштувань..."
                                                    : isPlayingAudio
                                                      ? "Відтворення... (натисніть V щоб зупинити)"
                                                      : "Прослухати (або натисніть V)"
                                            }
                                        >
                                            <Volume2 className="w-5 h-5" />
                                            <span>
                                                {!settingsLoaded
                                                    ? "Завантаження..."
                                                    : isPlayingAudio
                                                      ? "Відтворення..."
                                                      : "Озвучити"}
                                            </span>
                                        </button>
                                    </div>

                                    <p className="text-gray-500 text-base">
                                        Натисніть Пробіл / Enter, щоб побачити
                                        переклад
                                    </p>

                                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 mt-2">
                                        <div className="flex items-center space-x-1">
                                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                                E
                                            </kbd>
                                            <span>редагувати</span>
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center space-x-1">
                                            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                                Del
                                            </kbd>
                                            <span>видалити</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Back Side */}
                    {isFlipped && (
                        <div
                            key={`back-${validCurrentIndex}`}
                            className={`h-full transition-all duration-150 ${
                                isChanging ? "opacity-70" : "opacity-100"
                            }`}
                        >
                            <DetailedCardInfo
                                displayCard={currentCard}
                                className="h-full overflow-y-auto custom-scrollbar"
                                defaultExpanded={true}
                                collapsible={false}
                                showTopSection={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-4 max-w-4xl mx-auto">
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
