import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import * as api from "./features/vocabularyWords/vocabularyWordsApi.js";
import { usePracticeSettingsStore } from "./usePracticeSettingsStore.js";
import {
    findMissedVocabularyItems,
    reorderDataMissedReversedThenRest,
    selectNextItems,
} from "./features/vocabularyWords/vocabularyWordsStateLogic.js";

function mapVocabularyWordFromRow(word) {
    const category = word.flashcard_categories
        ? {
              id: word.flashcard_categories.id,
              name: word.flashcard_categories.name,
              color: word.flashcard_categories.color,
          }
        : null;

    return {
        id: word.id,
        categoryId: word.category_id ?? null,
        category,
        main_parameters: {
            text: word.text,
            topic: word.topic,
            relevant_translations: word.relevant_translations,
        },
        metodology_parameters: {
            status_translate_sentence_exercise:
                word.status_translate_sentence_exercise,
            status_fill_the_gap_exercise: word.status_fill_the_gap_exercise,
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
    };
}

const useVocabularyWordsStore = create(
    immer((set) => ({
        singleStatusMode: true,
        data: [],
        exerciseState: {
            exerciseType: "translate-sentence",
            mixedMode: false,
            generatedExerciseData: null,
            currentSelection: [],
            currentVocabularyWordIndex: 0,
            isLoading: false,
            generateNextStage: true,
            practiceCategoryId: null,
        },
        checkpoints: [
            { checkpoint: 0, threshold: 1 },
            { checkpoint: 1, threshold: 1 },
            { checkpoint: 2, threshold: 5 },
            { checkpoint: 7, threshold: 7 },
            { checkpoint: 14, threshold: 16 },
        ],

        updateExerciseState: (payload) => {
            set((state) => {
                state.exerciseState = {
                    ...state.exerciseState,
                    ...payload,
                };
            });
        },

        makeNextSelection: () => {
            set((state) => {
                state.exerciseState.currentSelection = [];
                findMissedVocabularyItems(state);
                reorderDataMissedReversedThenRest(state);
                state.exerciseState.currentSelection = selectNextItems(state);
            });
        },

        addVocabularyWord: async (newWord) => {
            const word = await api.addVocabularyWord(newWord);
            set((state) => {
                state.data.push(mapVocabularyWordFromRow(word));

                if (state.exerciseState.currentSelection.length === 0) {
                    state.exerciseState.currentSelection =
                        selectNextItems(state);
                }
            });
            return word;
        },

        fetchVocabularyWords: async () => {
            const vocabulary_words = await api.fetchVocabularyWords();
            set((state) => {
                state.data = vocabulary_words.map(mapVocabularyWordFromRow);
            });
            return vocabulary_words;
        },

        updateVocabularyWord: async (params) => {
            set((state) => {
                state.exerciseState.isLoading = true;
            });
            try {
                const data = await api.updateVocabularyWord(params);
                const word = data[0];
                console.log(data[0]);
                set((state) => {
                    const index = state.data.findIndex((w) => w.id === word.id);
                    if (index !== -1) {
                        const mapped = mapVocabularyWordFromRow(word);
                        state.data[index] = {
                            ...mapped,
                            category:
                                mapped.category ?? state.data[index].category,
                        };
                    }
                });
                return data;
            } finally {
                set((state) => {
                    state.exerciseState.isLoading = false;
                });
            }
        },

        generateExerciseVocabularyItem: async (vocabularyWordMainParameters) => {
            const { englishLevel } =
                usePracticeSettingsStore.getState().getGenerationOptions();
            set((state) => {
                state.exerciseState.isLoading = true;
                state.exerciseState.generateNextStage = false;
            });
            try {
                const parsed = await api.generateExerciseVocabularyItem(
                    vocabularyWordMainParameters,
                    { englishLevel }
                );
                set((state) => {
                    state.exerciseState.generatedExerciseData = parsed;
                });
                return parsed;
            } finally {
                set((state) => {
                    state.exerciseState.isLoading = false;
                });
            }
        },

        generateSpeech: (text) => {
            const { ttsVoice, ttsSpeed } =
                usePracticeSettingsStore.getState().getGenerationOptions();
            return api.generateSpeech(text, { voice: ttsVoice, speed: ttsSpeed });
        },

        generateSentenceCompletion: (vocabularyWordMainParameters) => {
            const { englishLevel } =
                usePracticeSettingsStore.getState().getGenerationOptions();
            return api.generateSentenceCompletion(
                vocabularyWordMainParameters,
                { englishLevel }
            );
        },

        generateListenAndFill: (vocabularyWordMainParameters) => {
            const { englishLevel } =
                usePracticeSettingsStore.getState().getGenerationOptions();
            return api.generateListenAndFill(vocabularyWordMainParameters, {
                englishLevel,
            });
        },

        translateWithDeepL: (params) => api.translateWithDeepL(params),
    }))
);

const updateExerciseState = (payload) =>
    useVocabularyWordsStore.getState().updateExerciseState(payload);
const makeNextSelection = () =>
    useVocabularyWordsStore.getState().makeNextSelection();
const addVocabularyWord = (arg) =>
    useVocabularyWordsStore.getState().addVocabularyWord(arg);
const fetchVocabularyWords = () =>
    useVocabularyWordsStore.getState().fetchVocabularyWords();
const updateVocabularyWord = (arg) =>
    useVocabularyWordsStore.getState().updateVocabularyWord(arg);
const generateExerciseVocabularyItem = (arg) =>
    useVocabularyWordsStore.getState().generateExerciseVocabularyItem(arg);
const generateSpeech = (arg) =>
    useVocabularyWordsStore.getState().generateSpeech(arg);
const generateSentenceCompletion = (arg) =>
    useVocabularyWordsStore.getState().generateSentenceCompletion(arg);
const generateListenAndFill = (arg) =>
    useVocabularyWordsStore.getState().generateListenAndFill(arg);
const translateWithDeepL = (arg) =>
    useVocabularyWordsStore.getState().translateWithDeepL(arg);

export {
    useVocabularyWordsStore,
    updateExerciseState,
    makeNextSelection,
    addVocabularyWord,
    fetchVocabularyWords,
    updateVocabularyWord,
    generateExerciseVocabularyItem,
    generateSpeech,
    generateSentenceCompletion,
    generateListenAndFill,
    translateWithDeepL,
};
