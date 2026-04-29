import { create } from "zustand";
import {
    fetchCategories as apiFetchCategories,
    createCategory as apiCreateCategory,
    updateCategory as apiUpdateCategory,
    deleteCategory as apiDeleteCategory,
} from "./features/homepage/homepageApi.js";

const useCategoryStore = create((set, get) => ({
    categories: [],
    isLoading: false,
    selectedCategory: null,

    getCategories: async () => {
        set({ isLoading: true });
        const categories = await apiFetchCategories();
        set({ categories, isLoading: false });
        return categories;
    },

    setSelectedCategory: (category) => {
        set({ selectedCategory: category });
    },

    getCategoryById: (id) => get().categories.find((c) => c._id === id) || null,

    createCategory: async (payload) => {
        const created = await apiCreateCategory(payload);
        set((state) => ({ categories: [created, ...state.categories] }));
        return created;
    },

    updateCategory: async (id, payload) => {
        const updated = await apiUpdateCategory(id, payload);
        set((state) => ({
            categories: state.categories.map((category) =>
                category._id === id ? updated : category
            ),
        }));
        return updated;
    },

    deleteCategory: async (id) => {
        await apiDeleteCategory(id);
        set((state) => ({
            categories: state.categories.filter((category) => category._id !== id),
        }));
    },

    getCategoryColors: () => [
        "#3B82F6",
        "#10B981",
        "#8B5CF6",
        "#F59E0B",
        "#EF4444",
        "#14B8A6",
        "#6366F1",
        "#EC4899",
        "#84CC16",
        "#6B7280",
    ],
}));

export { useCategoryStore };
