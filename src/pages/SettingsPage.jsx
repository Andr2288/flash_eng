import { useEffect } from "react";

import { useNavReselectStore } from "../store/useNavReselectStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";

const SettingsPage = () => {
    const settingsNavReselect = useNavReselectStore(
        (s) => s.bumps["/settings"] ?? 0
    );
    const loadSettings = useUserSettingsStore((s) => s.loadSettings);

    useEffect(() => {
        if (settingsNavReselect === 0) {
            return;
        }
        void loadSettings().catch(() => {});
    }, [settingsNavReselect, loadSettings]);

    return (
        <div className="ml-68 flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
            <div className="shrink-0 border-b border-gray-200 bg-white">
                <div className="p-8">
                    <h1 className="text-xl font-bold text-gray-900">
                        Налаштування
                    </h1>
                    <p className="text-gray-600">
                        Керуйте параметрами вашого акаунту FlashEng
                    </p>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-8 [scrollbar-gutter:stable]">
                <div className="mx-auto w-full max-w-7xl">
                    <div className="rounded-xl bg-white p-6 shadow-md">
                        <p className="text-gray-700">
                            Сторінка налаштувань у процесі наповнення.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { SettingsPage };
