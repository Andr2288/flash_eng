import { useState, useRef, useEffect } from "react";
import { generateSpeech } from "../store/features/vocabularyWords/vocabularyWordsApi.js";
import {
    Volume2,
    StickyNote,
    Sparkles,
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
                <div className="p-8 pb-10">
                    {showTopSection && (
                        <div className="text-center pb-4 space-y-4">
                        {displayCard.isAIGenerated && (
                            <div className="flex justify-center">
                                <div className="inline-flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                    <Sparkles className="w-3 h-3" />
                                    <span>ШІ-генерація</span>
                                </div>
                            </div>
                        )}

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
                        {displayCard.translation && (
                            <div className="text-center py-4">
                                <p className="text-2xl font-bold text-gray-900 leading-relaxed mb-2">
                                    {displayCard.translation
                                        .charAt(0)
                                        .toUpperCase() +
                                        displayCard.translation.slice(1)}
                                </p>
                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
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

                        {displayCard.notes && (
                            <div>
                                <h4 className="text-sm font-semibold text-rose-700 mb-3 uppercase tracking-wide flex items-center">
                                    <StickyNote className="w-4 h-4 mr-1" />
                                    Особисті нотатки
                                </h4>
                                <div className="bg-rose-50/80 rounded-lg p-4 border-l-4 border-rose-300">
                                    <p className="text-gray-800 leading-relaxed text-lg">
                                        {displayCard.notes}
                                    </p>
                                </div>
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
                            !displayCard.notes && (
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
