import { create } from "zustand";
import {
    DEFAULT_PRACTICE_SETTINGS,
    pickRandomTtsVoice,
    TTS_VOICE_RANDOM,
} from "../constants/practiceSettings.js";
import {
    fetchPracticeSettings,
    upsertPracticeSettings,
} from "./features/practice/practiceSettingsApi.js";

const usePracticeSettingsStore = create((set, get) => ({
    settings: null,
    isLoading: false,
    isSaving: false,
    loadError: null,

    loadPracticeSettings: async () => {
        set({ isLoading: true, loadError: null });
        try {
            const settings = await fetchPracticeSettings();
            set({ settings, isLoading: false });
            return settings;
        } catch (error) {
            set({
                settings: { ...DEFAULT_PRACTICE_SETTINGS },
                isLoading: false,
                loadError: error?.message || "Помилка завантаження",
            });
            return { ...DEFAULT_PRACTICE_SETTINGS };
        }
    },

    updateSetting: async (key, value) => {
        const prev = get().settings ?? { ...DEFAULT_PRACTICE_SETTINGS };
        const optimistic = { ...prev, [key]: value };
        set({ settings: optimistic, isSaving: true });

        try {
            const saved = await upsertPracticeSettings(optimistic);
            set({ settings: saved, isSaving: false });
            return saved;
        } catch (error) {
            set({ settings: prev, isSaving: false });
            throw error;
        }
    },

    getResolvedTtsVoice: () => {
        const voice = get().settings?.ttsVoice ?? DEFAULT_PRACTICE_SETTINGS.ttsVoice;
        if (voice === TTS_VOICE_RANDOM) {
            return pickRandomTtsVoice();
        }
        return voice;
    },

    getGenerationOptions: () => {
        const s = get().settings ?? DEFAULT_PRACTICE_SETTINGS;
        return {
            englishLevel: s.englishLevel,
            ttsVoice: get().getResolvedTtsVoice(),
            ttsSpeed: s.ttsSpeed,
        };
    },
}));

export { usePracticeSettingsStore };
