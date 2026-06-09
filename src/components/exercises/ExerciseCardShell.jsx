import { useCallback, useEffect, useMemo, useState } from "react";

import DetailedCardInfo from "../DetailedCardInfo.jsx";
import { vocabularyWordToDisplayCard } from "../../store/features/vocabularyWords/vocabularyWordDisplayCard.js";

/** Та сама ширина, що в DetailedFlashcardView на головній (max-w-4xl). */
const EXERCISE_CARD_LAYOUT_CLASS =
    "mx-auto w-full min-w-0 max-w-4xl shrink-0 flex flex-col items-stretch bg-white rounded-2xl shadow-md p-4 pb-6 sm:p-8 sm:pb-8 md:p-12";

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

    const handleContextMenu = useCallback(
        (event) => {
            if (!displayCard) {
                return;
            }
            event.preventDefault();
            setShowDetails((prev) => !prev);
        },
        [displayCard]
    );

    const shellClassName = className
        ? `${EXERCISE_CARD_LAYOUT_CLASS} ${className}`
        : EXERCISE_CARD_LAYOUT_CLASS;

    return (
        <div className={shellClassName} onContextMenu={handleContextMenu}>
            {showDetails && displayCard ? (
                <div className="flex min-h-0 flex-1 flex-col w-full">
                    <DetailedCardInfo
                        displayCard={displayCard}
                        className="min-h-0 flex-1 overflow-y-auto custom-scrollbar"
                        defaultExpanded={true}
                        collapsible={false}
                        showTopSection={false}
                    />
                    <p className="shrink-0 py-3 text-center text-sm text-gray-500">
                        ПКМ — повернутися до вправи
                    </p>
                </div>
            ) : (
                <>
                    {children}
                    {footer}
                </>
            )}
        </div>
    );
};

export { ExerciseCardShell, EXERCISE_CARD_LAYOUT_CLASS };
