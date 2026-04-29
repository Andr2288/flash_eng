import { create } from "zustand";
import {
    fetchUserSettings,
    upsertUserSettings,
} from "./features/homepage/homepageApi.js";

const DEFAULT_SETTINGS = {
    general: {},
    generalSettings: {
        categorySortBy: "date",
        categorySortOrder: "desc",
    },
    categorySort: { sortBy: "date", sortOrder: "desc" },
    flashcardSort: { sortBy: "date", sortOrder: "desc" },
    tts: {
        voice: "alloy",
    },
    ai: {
        defaultEnglishLevel: "B1",
        chatGPTModel: "gpt-4o-mini",
        hasUserApiKey: false,
    },
};

const useUserSettingsStore = create((set, get) => ({
    settings: DEFAULT_SETTINGS,
    isLoading: false,
    loaded: false,

    loadSettings: async () => {
        set({ isLoading: true });
        const data = await fetchUserSettings(DEFAULT_SETTINGS);
        const merged = {
            ...DEFAULT_SETTINGS,
            ...data,
            generalSettings: {
                ...DEFAULT_SETTINGS.generalSettings,
                ...(data?.generalSettings || {}),
            },
            categorySort: {
                ...DEFAULT_SETTINGS.categorySort,
                ...(data?.categorySort || {}),
            },
            flashcardSort: {
                ...DEFAULT_SETTINGS.flashcardSort,
                ...(data?.flashcardSort || {}),
            },
            tts: {
                ...DEFAULT_SETTINGS.tts,
                ...(data?.tts || {}),
            },
            ai: {
                ...DEFAULT_SETTINGS.ai,
                ...(data?.ai || {}),
            },
        };

        set({ settings: merged, loaded: true, isLoading: false });
        return merged;
    },

    areSettingsLoaded: () => get().loaded,
    getGeneralSettings: () => ({
        ...get().settings.general,
        ...get().settings.generalSettings,
    }),
    getCategorySortSettings: () => get().settings.categorySort,
    getFlashcardSortSettings: () => get().settings.flashcardSort,
    getTTSSettings: () => get().settings.tts,
    getDefaultEnglishLevel: () => get().settings.ai.defaultEnglishLevel || "B1",
    getChatGPTModel: () => get().settings.ai.chatGPTModel || "gpt-4o-mini",
    hasApiKey: () => get().settings.ai.hasUserApiKey,
    hasUserApiKey: () => get().settings.ai.hasUserApiKey,
    updateSetting: (path, value) => {
        const keys = String(path).split(".");
        set((state) => {
            const next = { ...state.settings };
            let current = next;

            for (let i = 0; i < keys.length - 1; i += 1) {
                const key = keys[i];
                current[key] = { ...(current[key] || {}) };
                current = current[key];
            }

            current[keys[keys.length - 1]] = value;
            upsertUserSettings(next).catch((error) => {
                console.warn("Persist setting failed:", error.message);
            });
            return { settings: next };
        });
    },
}));

export { useUserSettingsStore };
