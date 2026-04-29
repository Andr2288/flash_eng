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
        <div className="ml-68 min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100">
            <h1>Welcome to the SettingsPage</h1>
        </div>
    );
};

export { SettingsPage };
