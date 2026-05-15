import { useEffect } from "react";
import { Sparkles, Volume2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { ENGLISH_LEVELS, TTS_VOICES } from "../constants/practiceSettings.js";
import { usePracticeSettingsStore } from "../store/usePracticeSettingsStore.js";

const selectClassName =
    "w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500";

const PracticeSettingsPanel = () => {
    const { settings, isLoading, loadPracticeSettings, updateSetting } =
        usePracticeSettingsStore(
            useShallow((s) => ({
                settings: s.settings,
                isLoading: s.isLoading,
                loadPracticeSettings: s.loadPracticeSettings,
                updateSetting: s.updateSetting,
            }))
        );

    useEffect(() => {
        loadPracticeSettings();
    }, [loadPracticeSettings]);

    const handleChange = async (key, value) => {
        try {
            await updateSetting(key, value);
        } catch {
            // rollback handled in store
        }
    };

    if (isLoading && !settings) {
        return (
            <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
                <div className="flex justify-center">
                    <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
                <p className="mt-3 text-center text-sm text-gray-500">
                    Завантаження налаштувань…
                </p>
            </section>
        );
    }

    if (!settings) {
        return null;
    }

    const selectedLevel = ENGLISH_LEVELS.find(
        (l) => l.id === settings.englishLevel
    );
    const selectedVoice = TTS_VOICES.find((v) => v.id === settings.ttsVoice);

    return (
        <section className="relative z-10 mt-10 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-lg">
                <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center space-x-3">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            Налаштування ШІ для вправ
                        </h2>
                    </div>
                    <p className="mt-1 text-gray-600">
                        Рівень складності речень при генерації вправ
                    </p>
                </div>
                <div className="p-6">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Рівень англійської для вправ
                    </label>
                    <select
                        value={settings.englishLevel}
                        onChange={(e) =>
                            handleChange("englishLevel", e.target.value)
                        }
                        className={selectClassName}
                    >
                        {ENGLISH_LEVELS.map((level) => (
                            <option key={level.id} value={level.id}>
                                {level.name}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                        {selectedLevel?.description ||
                            "Рівень складності для генерації вправ"}
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow hover:shadow-lg">
                <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center space-x-3">
                        <Volume2 className="h-5 w-5 text-purple-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            Налаштування озвучки
                        </h2>
                    </div>
                    <p className="mt-1 text-gray-600">
                        Голос і швидкість TTS у вправах з прослуховуванням
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Голос
                        </label>
                        <select
                            value={settings.ttsVoice}
                            onChange={(e) =>
                                handleChange("ttsVoice", e.target.value)
                            }
                            className={selectClassName}
                        >
                            {TTS_VOICES.map((voice) => (
                                <option key={voice.id} value={voice.id}>
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {selectedVoice?.description}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Швидкість: {settings.ttsSpeed || 1.0}x
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.10"
                            value={settings.ttsSpeed || 1.0}
                            onChange={(e) =>
                                handleChange(
                                    "ttsSpeed",
                                    parseFloat(e.target.value)
                                )
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0.5x</span>
                            <span className="mr-45">1x</span>
                            <span>2x</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export { PracticeSettingsPanel };
