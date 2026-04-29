import { create } from "zustand";
import {
    fetchFlashcards,
    createFlashcard as apiCreateFlashcard,
    updateFlashcard as apiUpdateFlashcard,
    deleteFlashcard as apiDeleteFlashcard,
} from "./features/homepage/homepageApi.js";

const useFlashcardStore = create((set, get) => ({
    flashcards: [],
    allFlashcards: [],
    isLoading: false,
    currentCategoryFilter: null,

    getFlashcards: async (categoryId = null, options = {}) => {
        const silent = options.silent === true;
        if (!silent) {
            set({ isLoading: true });
        }
        try {
            const data = await fetchFlashcards(categoryId);
            set({
                flashcards: data,
                allFlashcards: categoryId ? get().allFlashcards : data,
                currentCategoryFilter: categoryId,
                ...(silent ? {} : { isLoading: false }),
            });
            return data;
        } catch (error) {
            if (!silent) {
                set({ isLoading: false });
            }
            throw error;
        }
    },

    createFlashcard: async (formData) => {
        const created = await apiCreateFlashcard(formData);
        set((state) => ({
            allFlashcards: [created, ...state.allFlashcards],
            flashcards: [created, ...state.flashcards],
        }));
        return { newIndex: 0 };
    },

    updateFlashcard: async (id, formData) => {
        const updated = await apiUpdateFlashcard(id, formData);
        set((state) => ({
            allFlashcards: state.allFlashcards.map((card) =>
                card._id === id ? updated : card
            ),
            flashcards: state.flashcards.map((card) =>
                card._id === id ? updated : card
            ),
        }));
        return updated;
    },

    deleteFlashcard: async (id) => {
        await apiDeleteFlashcard(id);
        set((state) => ({
            allFlashcards: state.allFlashcards.filter((card) => card._id !== id),
            flashcards: state.flashcards.filter((card) => card._id !== id),
        }));
    },

    setCategoryFilter: (categoryId) => set({ currentCategoryFilter: categoryId }),
}));

export { useFlashcardStore };
