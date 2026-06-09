import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import DetailedCardInfo from "../DetailedCardInfo.jsx";
import { vocabularyWordToDisplayCard } from "../../store/features/vocabularyWords/vocabularyWordDisplayCard.js";

/** Та сама ширина, що в DetailedFlashcardView на головній (max-w-4xl). */
const EXERCISE_CARD_LAYOUT_CLASS =
    "relative mx-auto flex min-h-[min(72dvh,32.5rem)] w-full min-w-0 max-w-4xl shrink-0 flex-col items-stretch rounded-2xl bg-white shadow-md p-4 pb-6 sm:min-h-130 sm:p-8 sm:pb-8 md:p-12";

const WORD_INFO_BUTTON_CLASS =
    "cursor-pointer rounded-lg border border-gray-200 bg-white p-2 text-blue-600 shadow-sm transition-colors hover:bg-blue-50";

const ExerciseCardShell = ({
    currentWord,
    className = "",
    children,
    footer = null,
}) => {
    const [showDetails, setShowDetails] = useState(false);

    const displayCard = useMemo(
        () => vocabularyWordToDisplayCard(currentWord),
        [currentWord]
    );

    useEffect(() => {
        setShowDetails(false);
    }, [currentWord?.id]);

    const toggleDetails = useCallback(() => {
        if (!displayCard) {
            return;
        }
        setShowDetails((prev) => !prev);
    }, [displayCard]);

    const handleContextMenu = useCallback(
        (event) => {
            if (!displayCard) {
                return;
            }
            event.preventDefault();
            toggleDetails();
        },
        [displayCard, toggleDetails]
    );

    const shellClassName = className
        ? `${EXERCISE_CARD_LAYOUT_CLASS} ${className}`
        : EXERCISE_CARD_LAYOUT_CLASS;

    return (
        <div className={shellClassName} onContextMenu={handleContextMenu}>
            {displayCard ? (
                <button
                    type="button"
                    onClick={toggleDetails}
                    className={`absolute left-3 top-3 z-10 md:hidden ${
                        showDetails
                            ? "cursor-pointer rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 shadow-sm"
                            : WORD_INFO_BUTTON_CLASS
                    }`}
                    title={showDetails ? "До вправи" : "Інфо про слово"}
                    aria-label={showDetails ? "До вправи" : "Інфо про слово"}
                    aria-pressed={showDetails}
                >
                    <BookOpen className="h-4 w-4" />
                </button>
            ) : null}
            {showDetails && displayCard ? (
                <div className="flex w-full min-h-0 flex-1 flex-col pt-8 md:pt-0">
                    <DetailedCardInfo
                        displayCard={displayCard}
                        className="max-h-[min(60dvh,32rem)] min-h-0 overflow-y-auto custom-scrollbar sm:max-h-[min(65dvh,36rem)]"
                        defaultExpanded={true}
                        collapsible={false}
                        showTopSection={false}
                    />
                    <p className="mt-3 hidden text-center text-xs text-gray-400 md:block">
                        ПКМ — повернутися до вправи
                    </p>
                </div>
            ) : (
                <div className="flex w-full min-h-0 flex-1 flex-col items-center">
                    {children}
                    {footer}
                </div>
            )}
        </div>
    );
};

export { ExerciseCardShell, EXERCISE_CARD_LAYOUT_CLASS };
