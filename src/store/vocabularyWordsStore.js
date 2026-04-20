import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import * as api from "./features/vocabularyWords/vocabularyWordsApi.js";
import {
    findMissedVocabularyItems,
    selectNextItems,
} from "./features/vocabularyWords/vocabularyWordsStateLogic.js";

const useVocabularyWordsStore = create(
    immer((set) => ({
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
                state.exerciseState.currentSelection = selectNextItems(state);
            });
        },

        addVocabularyWord: async (newWord) => {
            const word = await api.addVocabularyWord(newWord);
            set((state) => {
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
                    state.exerciseState.currentSelection =
                        selectNextItems(state);
                }
            });
            return word;
        },

        fetchVocabularyWords: async () => {
            const vocabulary_words = await api.fetchVocabularyWords();
            set((state) => {
                state.data = vocabulary_words.map((word) => ({
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
            });
            return vocabulary_words;
        },

        updateVocabularyWord: async (params) => {
            set((state) => {
                state.exerciseState.isLoading = true;
            });
            const data = await api.updateVocabularyWord(params);
            const word = data[0];
            console.log(data[0]);
            set((state) => {
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
            return data;
        },

        generateExerciseVocabularyItem: async (vocabularyWordMainParameters) => {
            set((state) => {
                state.exerciseState.isLoading = true;
                state.exerciseState.generateNextStage = false;
            });
            const parsed = await api.generateExerciseVocabularyItem(
                vocabularyWordMainParameters
            );
            set((state) => {
                state.exerciseState.generatedExerciseData = parsed;
                state.exerciseState.isLoading = false;
            });
            return parsed;
        },

        generateSpeech: (text) => api.generateSpeech(text),

        generateSentenceCompletion: (vocabularyWordMainParameters) =>
            api.generateSentenceCompletion(vocabularyWordMainParameters),

        generateListenAndFill: (vocabularyWordMainParameters) =>
            api.generateListenAndFill(vocabularyWordMainParameters),
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
};
