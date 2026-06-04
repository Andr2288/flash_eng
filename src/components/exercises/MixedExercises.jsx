import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { TranslateSentenceExercise } from "./TranslateSentenceExercise";
import { FillTheGapExercise } from "./FillTheGapExercise";
import { ListenAndFillTheGapExercise } from "./ListenAndFillTheGapExercise.jsx";
import {
    ROUND_EXERCISE_TYPES,
    pickRandomRoundExerciseType,
} from "../../constants/practiceExerciseTypes.js";
import {
    updateExerciseState,
    useVocabularyWordsStore,
} from "../../store";

const MixedExercises = () => {
    const { exerciseType, currentVocabularyWordIndex } = useVocabularyWordsStore(
        useShallow((state) => ({
            exerciseType: state.exerciseState.exerciseType,
            currentVocabularyWordIndex:
                state.exerciseState.currentVocabularyWordIndex,
        }))
    );

    const prevIndexRef = useRef(null);

    useEffect(() => {
        if (prevIndexRef.current === null) {
            prevIndexRef.current = currentVocabularyWordIndex;
            return;
        }
        if (prevIndexRef.current === currentVocabularyWordIndex) {
            return;
        }
        prevIndexRef.current = currentVocabularyWordIndex;

        updateExerciseState({
            exerciseType: pickRandomRoundExerciseType(),
        });
    }, [currentVocabularyWordIndex]);

    if (!ROUND_EXERCISE_TYPES.includes(exerciseType)) {
        return null;
    }

    const remountKey = `${exerciseType}-${currentVocabularyWordIndex}`;

    if (exerciseType === "translate_sentence_exercise") {
        return <TranslateSentenceExercise key={remountKey} />;
    }
    if (exerciseType === "fill_the_gap_exercise") {
        return <FillTheGapExercise key={remountKey} />;
    }
    return <ListenAndFillTheGapExercise key={remountKey} />;
};

export { MixedExercises };
