import { createSlice, current } from "@reduxjs/toolkit";
import {
    addVocabularyWord,
    fetchVocabularyWords,
    updateVocabularyWord,
    generateExerciseVocabularyItem,
} from "./vocabularyWordsThunks";

const findMissedVocabularyItems = (state) => {
    let currentTypeStatusProperty = "";
    let currentTypeCheckpointProperty = "";
    let currentTypeLastReviewedProperty = "";

    if (state.singleStatusMode) {
        currentTypeStatusProperty = "status_translate_sentence_exercise";
        currentTypeCheckpointProperty =
            "checkpoint_translate_sentence_exercise";
        currentTypeLastReviewedProperty =
            "last_reviewed_translate_sentence_exercise";
    } else {
        currentTypeStatusProperty = `status_${state.exerciseState.exerciseType}`;
        currentTypeCheckpointProperty = `checkpoint_${state.exerciseState.exerciseType}`;
        currentTypeLastReviewedProperty = `last_reviewed_${state.exerciseState.exerciseType}`;
    }

    console.log(state.exerciseState.exerciseType);

    for (const vocabularyItem of state.data) {
        // 1. Find daysPassedAfterLastReview
        if (
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] ===
                "MISSED" ||
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] ===
                "NEW"
        ) {
            continue;
        }

        const today = new Date();
        const lastReviewed = new Date(
            vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        );
        today.setHours(0, 0, 0, 0);
        lastReviewed.setHours(0, 0, 0, 0);
        const diffInMs = today - lastReviewed;
        const daysPassedAfterLastReview = diffInMs / (1000 * 60 * 60 * 24);

        // 2. Find currentCheckpointIndex
        const currentCheckpointIndex = state.checkpoints.findIndex(
            (checkpoint) => {
                return (
                    checkpoint.checkpoint ===
                    vocabularyItem.metodology_parameters[
                        currentTypeCheckpointProperty
                    ]
                );
            }
        );

        if (currentCheckpointIndex === -1) {
            continue;
        }

        // 3. Update Missed Item
        if (
            daysPassedAfterLastReview >
            state.checkpoints[currentCheckpointIndex].threshold
        ) {
            console.log(
                `Знайшов елемент, де пропущено повторення: ${vocabularyItem.main_parameters.text}
                    Current Checkpoint: ${vocabularyItem.metodology_parameters[currentTypeCheckpointProperty]}
                    Last previewed: ${new Date(vocabularyItem.metodology_parameters[currentTypeLastReviewedProperty])}
                    Threshold for Current Checkpoint: ${state.checkpoints[currentCheckpointIndex].threshold}
                    Days passed after last review: ${daysPassedAfterLastReview}
                    ***
                    Set Status to: "MISSED"
                    `
            );

            // Update Item In Data Array
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] =
                "MISSED";

            // if (
            //     vocabularyItem.metodology_parameters[
            //         currentTypeCheckpointProperty
            //     ] > 0
            // ) {
            //     vocabularyItem.metodology_parameters[
            //         currentTypeCheckpointProperty
            //     ] = state.checkpoints[currentCheckpointIndex - 1].checkpoint;
            // }
        }
    }
};

const selectNextItems = (state) => {
    let currentTypeStatusProperty = "";
    let currentTypeCheckpointProperty = "";
    let currentTypeLastReviewedProperty = "";

    if (state.singleStatusMode) {
        currentTypeStatusProperty = "status_translate_sentence_exercise";
        currentTypeCheckpointProperty =
            "checkpoint_translate_sentence_exercise";
        currentTypeLastReviewedProperty =
            "last_reviewed_translate_sentence_exercise";
    } else {
        currentTypeStatusProperty = `status_${state.exerciseState.exerciseType}`;
        currentTypeCheckpointProperty = `checkpoint_${state.exerciseState.exerciseType}`;
        currentTypeLastReviewedProperty = `last_reviewed_${state.exerciseState.exerciseType}`;
    }

    const nextSelection = [];

    // Пріоритет 1: MISSED Item
    const missedItemIndex = state.data.findIndex((vocabularyItem) => {
        return (
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] ===
            "MISSED"
        );
    });
    if (missedItemIndex !== -1) {
        nextSelection.push(state.data[missedItemIndex]);
        console.log(
            `Знайшов MISSED Item: ${state.data[missedItemIndex].main_parameters.text}`
        );
    }

    // Пріоритет 2: Item reviewed 1 day ago
    const yesterdayItemIndex = state.data.findIndex((vocabularyItem) => {
        if (
            !vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        ) {
            return false;
        }

        const today = new Date();
        const lastReviewed = new Date(
            vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        );
        today.setHours(0, 0, 0, 0);
        lastReviewed.setHours(0, 0, 0, 0);
        const diffInMs = today - lastReviewed;
        const daysPassedAfterLastReview = diffInMs / (1000 * 60 * 60 * 24);

        return (
            daysPassedAfterLastReview === 1 &&
            vocabularyItem.metodology_parameters[
                currentTypeCheckpointProperty
            ] <= 1 &&
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] !==
                "MISSED"
        );
    });
    if (yesterdayItemIndex !== -1) {
        state.data[yesterdayItemIndex].metodology_parameters[
            currentTypeStatusProperty
        ] = "LEARNING";

        nextSelection.push(state.data[yesterdayItemIndex]);
        console.log(
            `Знайшов Item reviewed 1 day ago: ${state.data[yesterdayItemIndex].main_parameters.text}`
        );
    }

    // Пріоритет 3: Item reviewed 7 days ago
    const sevenDaysAgoItemIndex = state.data.findIndex((vocabularyItem) => {
        if (
            !vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        ) {
            return false;
        }

        const today = new Date();
        const lastReviewed = new Date(
            vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        );
        today.setHours(0, 0, 0, 0);
        lastReviewed.setHours(0, 0, 0, 0);
        const diffInMs = today - lastReviewed;
        const daysPassedAfterLastReview = diffInMs / (1000 * 60 * 60 * 24);

        return (
            daysPassedAfterLastReview === 5 &&
            vocabularyItem.metodology_parameters[
                currentTypeCheckpointProperty
            ] === 2 &&
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] !==
                "MISSED"
        );
    });
    if (sevenDaysAgoItemIndex !== -1) {
        state.data[sevenDaysAgoItemIndex].metodology_parameters[
            currentTypeStatusProperty
        ] = "LEARNING";

        nextSelection.push(state.data[sevenDaysAgoItemIndex]);
        console.log(
            `Знайшов Item reviewed 7 days ago: ${state.data[sevenDaysAgoItemIndex].main_parameters.text}`
        );
    }

    // Пріоритет 4: Item reviewed 14 days ago
    const fourteenDaysAgoItemIndex = state.data.findIndex((vocabularyItem) => {
        if (
            !vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        ) {
            return false;
        }

        const today = new Date();
        const lastReviewed = new Date(
            vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        );
        today.setHours(0, 0, 0, 0);
        lastReviewed.setHours(0, 0, 0, 0);

        const diffInMs = today - lastReviewed;
        const daysPassedAfterLastReview = diffInMs / (1000 * 60 * 60 * 24);

        return (
            daysPassedAfterLastReview === 7 &&
            vocabularyItem.metodology_parameters[
                currentTypeCheckpointProperty
            ] === 7 &&
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] !==
                "MISSED"
        );
    });
    if (fourteenDaysAgoItemIndex !== -1) {
        state.data[fourteenDaysAgoItemIndex].metodology_parameters[
            currentTypeStatusProperty
        ] = "LEARNING";

        nextSelection.push(state.data[fourteenDaysAgoItemIndex]);
        console.log(
            `Знайшов Item reviewed 14 days ago: ${state.data[fourteenDaysAgoItemIndex].main_parameters.text}`
        );
    }

    // Пріоритет 5: Item reviewed 30 days ago
    const thirtyDaysAgoItemIndex = state.data.findIndex((vocabularyItem) => {
        if (
            !vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        ) {
            return false;
        }

        const today = new Date();
        const lastReviewed = new Date(
            vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        );
        today.setHours(0, 0, 0, 0);
        lastReviewed.setHours(0, 0, 0, 0);

        const diffInMs = today - lastReviewed;
        const daysPassedAfterLastReview = diffInMs / (1000 * 60 * 60 * 24);

        return (
            daysPassedAfterLastReview === 16 &&
            vocabularyItem.metodology_parameters[
                currentTypeCheckpointProperty
            ] === 14 &&
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] !==
                "MISSED"
        );
    });
    if (thirtyDaysAgoItemIndex !== -1) {
        state.data[thirtyDaysAgoItemIndex].metodology_parameters[
            currentTypeStatusProperty
        ] = "LEARNING";

        nextSelection.push(state.data[thirtyDaysAgoItemIndex]);
        console.log(
            `Знайшов Item reviewed 30 days ago: ${state.data[thirtyDaysAgoItemIndex].main_parameters.text}`
        );
    }

    // Пріоритет 6: New Items (30%)
    const newItems = state.data
        .filter(
            (vocabularyItem) =>
                vocabularyItem.metodology_parameters[
                    currentTypeStatusProperty
                ] === "NEW"
        )
        .slice(0, 3); // беремо рівно 3

    if (newItems.length > 0) {
        nextSelection.push(...newItems);

        newItems.forEach((item) => {
            console.log(`Знайшов new Item: ${item.main_parameters.text}`);
        });
    }

    // Пріоритет 7: AGAIN today item
    const againItemIndex = state.data.findIndex((vocabularyItem) => {
        if (
            !vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        ) {
            return false;
        }

        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Europe/Kyiv",
        });
        const lastReviewed = new Date(
            vocabularyItem.metodology_parameters[
                currentTypeLastReviewedProperty
            ]
        ).toLocaleDateString("en-CA", {
            timeZone: "Europe/Kyiv",
        });

        return (
            vocabularyItem.metodology_parameters[currentTypeStatusProperty] ===
                "AGAIN" && lastReviewed === today
        );
    });
    if (againItemIndex !== -1) {
        nextSelection.push(state.data[againItemIndex]);
        console.log(
            `Знайшов AGAIN today item: ${state.data[againItemIndex].main_parameters.text}`
        );
    }

    console.log(nextSelection.length);
    return nextSelection;
};

const vocabularyWordsSlice = createSlice({
    name: "vocabularyWords",
    initialState: {
        singleStatusMode: true,
        data: [],
        exerciseState: {
            exerciseType: "translate-sentence",
            generatedExerciseData: null,
            currentSelection: [],
            currentVocabularyWordIndex: 0,
            isLoading: false,
            generateNextStage: true,
        },
        checkpoints: [
            {
                checkpoint: 0,
                threshold: 1,
            },
            {
                checkpoint: 1,
                threshold: 1,
            },
            {
                checkpoint: 2,
                threshold: 5,
            },
            {
                checkpoint: 7,
                threshold: 7,
            },
            {
                checkpoint: 14,
                threshold: 16,
            },
        ],
    },
    reducers: {
        updateExerciseState: (state, action) => {
            state.exerciseState = {
                ...state.exerciseState,
                ...action.payload,
            };
        },
        makeNextSelection: (state) => {
            state.exerciseState.currentSelection = [];
            findMissedVocabularyItems(state);
            state.exerciseState.currentSelection = selectNextItems(state);
        },
    },
    extraReducers(builder) {
        builder.addCase(addVocabularyWord.fulfilled, (state, action) => {
            const word = action.payload;
            state.data.push({
                id: word.id,
                main_parameters: {
                    text: word.text,
                    topic: word.topic,
                    relevant_translations: word.relevant_translations,
                },
                metodology_parameters: {
                    status_translate_sentence_exercise:
                        word.status_translate_sentence_exercise,
                    status_fill_the_gap_exercise:
                        word.status_fill_the_gap_exercise,
                    status_listen_and_fill_the_gap_exercise:
                        word.status_listen_and_fill_the_gap_exercise,

                    checkpoint_translate_sentence_exercise:
                        word.checkpoint_translate_sentence_exercise,
                    checkpoint_fill_the_gap_exercise:
                        word.checkpoint_fill_the_gap_exercise,
                    checkpoint_listen_and_fill_the_gap_exercise:
                        word.checkpoint_listen_and_fill_the_gap_exercise,

                    last_reviewed_translate_sentence_exercise:
                        word.last_reviewed_translate_sentence_exercise,
                    last_reviewed_fill_the_gap_exercise:
                        word.last_reviewed_fill_the_gap_exercise,
                    last_reviewed_listen_and_fill_the_gap_exercise:
                        word.last_reviewed_listen_and_fill_the_gap_exercise,
                },
            });

            if (state.exerciseState.currentSelection.length === 0) {
                state.exerciseState.currentSelection = selectNextItems(state);
            }
        });

        builder.addCase(fetchVocabularyWords.fulfilled, (state, action) => {
            state.data = action.payload.map((word) => ({
                id: word.id,
                main_parameters: {
                    text: word.text,
                    topic: word.topic,
                    relevant_translations: word.relevant_translations,
                },
                metodology_parameters: {
                    status_translate_sentence_exercise:
                        word.status_translate_sentence_exercise,
                    status_fill_the_gap_exercise:
                        word.status_fill_the_gap_exercise,
                    status_listen_and_fill_the_gap_exercise:
                        word.status_listen_and_fill_the_gap_exercise,

                    checkpoint_translate_sentence_exercise:
                        word.checkpoint_translate_sentence_exercise,
                    checkpoint_fill_the_gap_exercise:
                        word.checkpoint_fill_the_gap_exercise,
                    checkpoint_listen_and_fill_the_gap_exercise:
                        word.checkpoint_listen_and_fill_the_gap_exercise,

                    last_reviewed_translate_sentence_exercise:
                        word.last_reviewed_translate_sentence_exercise,
                    last_reviewed_fill_the_gap_exercise:
                        word.last_reviewed_fill_the_gap_exercise,
                    last_reviewed_listen_and_fill_the_gap_exercise:
                        word.last_reviewed_listen_and_fill_the_gap_exercise,

                    createdAt: word.created_at,
                },
            }));

            console.log(state.data);
        });

        builder.addCase(updateVocabularyWord.pending, (state) => {
            state.exerciseState.isLoading = true;
        });

        builder.addCase(updateVocabularyWord.fulfilled, (state, action) => {
            const word = action.payload[0];
            console.log(action.payload[0]);
            const index = state.data.findIndex((w) => w.id === word.id);
            if (index !== -1) {
                state.data[index] = {
                    id: word.id,
                    main_parameters: {
                        text: word.text,
                        topic: word.topic,
                        relevant_translations: word.relevant_translations,
                    },
                    metodology_parameters: {
                        status_translate_sentence_exercise:
                            word.status_translate_sentence_exercise,
                        status_fill_the_gap_exercise:
                            word.status_fill_the_gap_exercise,
                        status_listen_and_fill_the_gap_exercise:
                            word.status_listen_and_fill_the_gap_exercise,

                        checkpoint_translate_sentence_exercise:
                            word.checkpoint_translate_sentence_exercise,
                        checkpoint_fill_the_gap_exercise:
                            word.checkpoint_fill_the_gap_exercise,
                        checkpoint_listen_and_fill_the_gap_exercise:
                            word.checkpoint_listen_and_fill_the_gap_exercise,

                        last_reviewed_translate_sentence_exercise:
                            word.last_reviewed_translate_sentence_exercise,
                        last_reviewed_fill_the_gap_exercise:
                            word.last_reviewed_fill_the_gap_exercise,
                        last_reviewed_listen_and_fill_the_gap_exercise:
                            word.last_reviewed_listen_and_fill_the_gap_exercise,
                    },
                };
            }
            state.exerciseState.isLoading = false;
        });

        builder.addCase(generateExerciseVocabularyItem.pending, (state) => {
            state.exerciseState.isLoading = true;
            state.exerciseState.generateNextStage = false;
        });

        builder.addCase(
            generateExerciseVocabularyItem.fulfilled,
            (state, action) => {
                state.exerciseState.generatedExerciseData = action.payload;
                state.exerciseState.isLoading = false;
            }
        );
    },
});

export const { updateExerciseState, makeNextSelection } =
    vocabularyWordsSlice.actions;
export const vocabularyWordsReducer = vocabularyWordsSlice.reducer;
