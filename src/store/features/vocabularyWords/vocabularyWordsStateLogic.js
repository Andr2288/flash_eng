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

            vocabularyItem.metodology_parameters[currentTypeStatusProperty] =
                "MISSED";
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

    const newItems = state.data
        .filter(
            (vocabularyItem) =>
                vocabularyItem.metodology_parameters[
                    currentTypeStatusProperty
                ] === "NEW"
        )
        .slice(0, 3);

    if (newItems.length > 0) {
        nextSelection.push(...newItems);

        newItems.forEach((item) => {
            console.log(`Знайшов new Item: ${item.main_parameters.text}`);
        });
    }

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

export { findMissedVocabularyItems, selectNextItems };
