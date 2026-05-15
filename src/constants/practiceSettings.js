import { DEFAULT_ENGLISH_LEVEL } from "../config/app.js";

const ENGLISH_LEVELS = [
    {
        id: "A1",
        name: "A1 — Початковий",
        description: "Дуже прості речення та базова лексика",
    },
    {
        id: "A2",
        name: "A2 — Елементарний",
        description: "Прості повсякденні фрази та теми",
    },
    {
        id: "B1",
        name: "B1 — Середній",
        description: "Зрозумілі тексти про знайомі теми",
    },
    {
        id: "B2",
        name: "B2 — Вище середнього",
        description: "Складніші конструкції та абстрактні теми",
    },
    {
        id: "C1",
        name: "C1 — Просунутий",
        description: "Гнучке використання мови в різних контекстах",
    },
    {
        id: "C2",
        name: "C2 — Вільне володіння",
        description: "Природні складні речення та нюанси",
    },
];

const TTS_VOICE_RANDOM = "random";

const TTS_VOICES = [
    { id: TTS_VOICE_RANDOM, name: "Випадковий", description: "Щоразу обирається випадковий голос" },
    { id: "alloy", name: "Alloy", description: "Нейтральний, універсальний" },
    { id: "ash", name: "Ash", description: "Спокійний чоловічий" },
    { id: "ballad", name: "Ballad", description: "М'який, виразний" },
    { id: "coral", name: "Coral", description: "Теплий жіночий" },
    { id: "echo", name: "Echo", description: "Чіткий нейтральний" },
    { id: "fable", name: "Fable", description: "Розповідний стиль" },
    { id: "nova", name: "Nova", description: "Енергійний" },
    { id: "onyx", name: "Onyx", description: "Глибокий чоловічий" },
    { id: "shimmer", name: "Shimmer", description: "Легкий жіночий" },
    { id: "verse", name: "Verse", description: "Динамічний" },
    { id: "marin", name: "Marin", description: "Природний (за замовчуванням)" },
    { id: "cedar", name: "Cedar", description: "Спокійний, чіткий" },
];

const DEFAULT_PRACTICE_SETTINGS = {
    englishLevel: DEFAULT_ENGLISH_LEVEL,
    ttsVoice: "marin",
    ttsSpeed: 1.0,
};

const TTS_VOICE_IDS = TTS_VOICES.map((v) => v.id).filter(
    (id) => id !== TTS_VOICE_RANDOM
);

const ENGLISH_LEVEL_PROMPT = {
    A1: "CEFR A1 (beginner): very simple vocabulary, short sentences, basic grammar",
    A2: "CEFR A2 (elementary): simple everyday language and familiar topics",
    B1: "CEFR B1 (intermediate): clear standard language on familiar matters",
    B2: "CEFR B2 (upper-intermediate): more complex sentences and abstract topics",
    C1: "CEFR C1 (advanced): flexible and natural language with nuance",
    C2: "CEFR C2 (proficient): sophisticated, native-like sentences",
};

function normalizePracticeEnglishLevel(level) {
    const candidate = String(level || "").toUpperCase();
    return ENGLISH_LEVELS.some((l) => l.id === candidate)
        ? candidate
        : DEFAULT_PRACTICE_SETTINGS.englishLevel;
}

function normalizeTtsVoice(voice) {
    const candidate = String(voice || "").toLowerCase();
    return TTS_VOICES.some((v) => v.id === candidate)
        ? candidate
        : DEFAULT_PRACTICE_SETTINGS.ttsVoice;
}

function normalizeTtsSpeed(speed) {
    const n = Number(speed);
    if (!Number.isFinite(n)) {
        return DEFAULT_PRACTICE_SETTINGS.ttsSpeed;
    }
    return Math.min(2, Math.max(0.5, Math.round(n * 100) / 100));
}

function buildEnglishLevelRequirement(englishLevel) {
    const level = normalizePracticeEnglishLevel(englishLevel);
    const description =
        ENGLISH_LEVEL_PROMPT[level] || ENGLISH_LEVEL_PROMPT.B1;
    return `- Create all exercise content for English learners at ${description}`;
}

function pickRandomTtsVoice() {
    const index = Math.floor(Math.random() * TTS_VOICE_IDS.length);
    return TTS_VOICE_IDS[index];
}

export {
    ENGLISH_LEVELS,
    TTS_VOICES,
    TTS_VOICE_RANDOM,
    TTS_VOICE_IDS,
    DEFAULT_PRACTICE_SETTINGS,
    normalizePracticeEnglishLevel,
    normalizeTtsVoice,
    normalizeTtsSpeed,
    buildEnglishLevelRequirement,
    pickRandomTtsVoice,
};
