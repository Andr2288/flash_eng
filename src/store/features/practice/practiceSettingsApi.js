import { supabase } from "../vocabularyWords/supabase.js";
import {
    DEFAULT_PRACTICE_SETTINGS,
    normalizePracticeEnglishLevel,
    normalizeTtsSpeed,
    normalizeTtsVoice,
} from "../../../constants/practiceSettings.js";

async function requireUserId() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        throw new Error(error.message);
    }
    if (!user?.id) {
        throw new Error("Потрібно увійти в акаунт");
    }
    return user.id;
}

function mapRowToSettings(row) {
    if (!row) {
        return { ...DEFAULT_PRACTICE_SETTINGS };
    }
    return {
        englishLevel: normalizePracticeEnglishLevel(row.english_level),
        ttsVoice: normalizeTtsVoice(row.tts_voice),
        ttsSpeed: normalizeTtsSpeed(row.tts_speed),
    };
}

async function fetchPracticeSettings() {
    const userId = await requireUserId();

    const { data, error } = await supabase
        .from("practice_settings")
        .select("english_level, tts_voice, tts_speed")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return mapRowToSettings(data);
}

async function upsertPracticeSettings(partial) {
    const userId = await requireUserId();
    const current = await fetchPracticeSettings();

    const next = {
        englishLevel: normalizePracticeEnglishLevel(
            partial.englishLevel ?? current.englishLevel
        ),
        ttsVoice: normalizeTtsVoice(partial.ttsVoice ?? current.ttsVoice),
        ttsSpeed: normalizeTtsSpeed(partial.ttsSpeed ?? current.ttsSpeed),
    };

    const { data, error } = await supabase
        .from("practice_settings")
        .upsert(
            {
                user_id: userId,
                english_level: next.englishLevel,
                tts_voice: next.ttsVoice,
                tts_speed: next.ttsSpeed,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        )
        .select("english_level, tts_voice, tts_speed")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return mapRowToSettings(data);
}

export { fetchPracticeSettings, upsertPracticeSettings };
