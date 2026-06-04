const ROUND_EXERCISE_TYPES = [
    "translate_sentence_exercise",
    "fill_the_gap_exercise",
    "listen_and_fill_the_gap_exercise",
];

const MIXED_EXERCISE_TYPE = "mixed_exercises";

function pickRandomRoundExerciseType() {
    return ROUND_EXERCISE_TYPES[
        Math.floor(Math.random() * ROUND_EXERCISE_TYPES.length)
    ];
}

export {
    ROUND_EXERCISE_TYPES,
    MIXED_EXERCISE_TYPE,
    pickRandomRoundExerciseType,
};
