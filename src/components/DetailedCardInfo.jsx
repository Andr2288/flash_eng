import { useState, useRef, useEffect } from "react";
import { generateSpeech } from "../store/features/vocabularyWords/vocabularyWordsApi.js";
import {
    Volume2,
    StickyNote,
    ChevronDown,
    ChevronUp,
    BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

const DetailedCardInfo = ({
    displayCard,
    className = "",
    isCorrect = null,
    defaultExpanded = null,
    collapsible = true,
    showTopSection = true,
}) => {
    // Audio states
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const [isExpanded, setIsExpanded] = useState(() => {
        if (!collapsible) return true;
        if (defaultExpanded !== null) return defaultExpanded;
        return isCorrect === false || isCorrect === null;
    });
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isImageChanging, setIsImageChanging] = useState(false);

    const currentAudioRef = useRef(null);

    useEffect(() => {
        if (!collapsible) {
            setIsExpanded(true);
            return;
        }
        if (defaultExpanded === null && isCorrect !== null) {
            setIsExpanded(isCorrect === false);
        }
    }, [isCorrect, defaultExpanded, collapsible]);

    // Audio cleanup
    useEffect(() => {
        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

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

    // TTS Function
    const speakText = async (text) => {
        if (!text || isPlayingAudio) return;

        try {
            // Stop current audio
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            setIsPlayingAudio(true);

            const audioUrl = await generateSpeech(text.trim());
            const audio = new Audio(audioUrl);

            currentAudioRef.current = audio;

            audio.onended = () => {
                setIsPlayingAudio(false);
                currentAudioRef.current = null;
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setIsPlayingAudio(false);
                currentAudioRef.current = null;
                URL.revokeObjectURL(audioUrl);
                toast.error("Помилка відтворення звуку");
            };

            await audio.play();
        } catch (error) {
            setIsPlayingAudio(false);
            currentAudioRef.current = null;
            console.error("Error playing TTS:", error);

            if (error.response?.status === 401) {
                toast.error("API ключ недійсний");
            } else if (error.response?.status === 402) {
                toast.error("Недостатньо кредитів OpenAI");
            } else {
                toast.error("Помилка генерації озвучення");
            }
        }
    };

    // Get examples from card (supporting both old and new format)
    const getExamples = (card) => {
        if (
            card?.examples &&
            Array.isArray(card.examples) &&
            card.examples.length > 0
        ) {
            return card.examples.filter((ex) => ex && ex.trim());
        } else if (card?.example && card.example.trim()) {
            return [card.example.trim()];
        }
        return [];
    };

    const toggleExpanded = () => {
        if (!collapsible) return;
        setIsExpanded(!isExpanded);
    };

    if (!displayCard) {
        return null;
    }

    const examples = getExamples(displayCard);
    const imageUrls = Array.isArray(displayCard?.imageUrls)
        ? displayCard.imageUrls.filter((u) => u && String(u).trim())
        : [];
    const hasImages = imageUrls.length > 0;
    const activeImageUrl = hasImages
        ? imageUrls[activeImageIndex % imageUrls.length]
        : "";
    const notesText =
        displayCard?.notes != null ? String(displayCard.notes).trim() : "";
    const hasNotes = notesText.length > 0;

    useEffect(() => {
        setActiveImageIndex(0);
    }, [displayCard?._id]);

    useEffect(() => {
        if (!isImageChanging) {
            return;
        }
        const timeoutId = setTimeout(() => {
            setIsImageChanging(false);
        }, 220);
        return () => clearTimeout(timeoutId);
    }, [isImageChanging]);

    return (
        <div className={`bg-white overflow-hidden ${className}`}>
            {collapsible && (
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <button
                        onClick={toggleExpanded}
                        className="w-full flex items-center justify-between text-left hover:bg-gray-100 transition-colors rounded-lg p-2 -m-2"
                    >
                        <div className="flex items-center">
                            <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                                Детальна інформація про слово
                            </h3>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">
                                {isExpanded ? "Згорнути" : "Розгорнути"}
                            </span>
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                        </div>
                    </button>
                </div>
            )}

            {isExpanded && (
                <div className="p-10 pb-10">
                    {showTopSection && (
                        <div className="text-center pb-4 space-y-4">
                            <h3 className="text-3xl font-bold text-gray-900">
                                {displayCard.text}
                            </h3>

                            {displayCard.transcription && (
                                <p className="text-lg text-gray-600 font-mono">
                                    {displayCard.transcription}
                                </p>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={() => speakText(displayCard.text)}
                                    disabled={isPlayingAudio}
                                    className={`px-6 py-3 rounded-lg transition-all shadow-md ${
                                        isPlayingAudio
                                            ? "bg-green-500 hover:bg-green-600 animate-pulse scale-105"
                                            : "bg-purple-500 hover:bg-purple-600 hover:scale-105"
                                    } disabled:bg-gray-300 disabled:scale-100 text-white flex items-center space-x-2 mx-auto`}
                                >
                                    <Volume2 className="w-5 h-5" />
                                    <span>
                                        {isPlayingAudio
                                            ? "Відтворення..."
                                            : "Озвучити"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {hasImages ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsImageChanging(true);
                                    setActiveImageIndex(
                                        (i) => (i + 1) % imageUrls.length
                                    );
                                }}
                                className="group relative block w-full overflow-hidden rounded-2xl shadow-md"
                                title="Натисніть, щоб показати наступне фото"
                            >
                                <img
                                    src={activeImageUrl}
                                    alt={
                                        displayCard.text || "Картинка до картки"
                                    }
                                    className={`h-82 w-full object-cover transition-all duration-300 group-hover:scale-[1.02] ${
                                        isImageChanging
                                            ? "scale-[1.015] opacity-80"
                                            : "scale-100 opacity-100"
                                    }`}
                                    loading="lazy"
                                />
                                {imageUrls.length > 1 ? (
                                    <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                                        {activeImageIndex + 1}/
                                        {imageUrls.length}
                                    </div>
                                ) : null}
                            </button>
                        ) : null}

                        {displayCard.translation && (
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900 leading-relaxed mb-2">
                                    {displayCard.translation
                                        .charAt(0)
                                        .toUpperCase() +
                                        displayCard.translation.slice(1)}
                                </p>
                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
                            </div>
                        )}

                        {hasNotes && (
                            <div>
                                <h4 className="mb-3 flex items-center text-sm font-semibold uppercase tracking-wide text-yellow-800">
                                    <StickyNote className="mr-1 h-4 w-4 text-yellow-600" />
                                    Нотатки
                                </h4>
                                <div className="rounded-lg border-l-4 border-yellow-400 bg-yellow-50/95 p-4 shadow-sm">
                                    <p className="text-lg leading-relaxed whitespace-pre-wrap text-yellow-950/90">
                                        {notesText}
                                    </p>
                                </div>
                            </div>
                        )}

                        {displayCard.explanation && (
                            <div className="mb-10">
                                <h4 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                                    Детальне пояснення
                                </h4>
                                <div
                                    className="bg-blue-100/80 rounded-lg p-8 py-4 border-l-4 border-blue-300 text-lg leading-7"
                                    dangerouslySetInnerHTML={{
                                        __html: processTextContent(
                                            displayCard.explanation
                                        ),
                                    }}
                                />
                            </div>
                        )}

                        {examples.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
                                    Приклади використання
                                </h4>

                                <div className="space-y-3">
                                    {examples.map((example, index) => (
                                        <div
                                            key={index}
                                            className="bg-green-100/80 rounded-lg p-4 border-l-4 border-green-300"
                                        >
                                            <p className="text-gray-800 italic leading-relaxed text-lg">
                                                "{example}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!displayCard.translation &&
                            !displayCard.explanation &&
                            examples.length === 0 &&
                            !hasNotes && (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-center text-gray-500">
                                        <p className="text-lg mb-2">
                                            Додаткової інформації немає
                                        </p>
                                        <p className="text-sm">
                                            Відредагуйте картку, щоб додати
                                            пояснення або приклади
                                        </p>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            )}

            {collapsible && !isExpanded && (
                <div className="px-6 py-4 bg-white">
                    <div className="flex items-center justify-center space-x-7 text-sm text-gray-600">
                        <div className="flex items-center">
                            <span className="font-bold text-lg text-gray-900 mr-7">
                                {displayCard.text}
                            </span>
                            {displayCard.translation && (
                                <span>{displayCard.translation}</span>
                            )}
                        </div>
                        {displayCard.transcription && (
                            <span className="font-mono text-gray-500">
                                {displayCard.transcription}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailedCardInfo;
