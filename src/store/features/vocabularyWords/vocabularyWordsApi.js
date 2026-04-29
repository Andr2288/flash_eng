import OpenAI from "openai";
import { supabase } from "./supabase.js";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const DEEPL_API_KEY = import.meta.env.VITE_DEEPL_API_KEY;

const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

const GPTModel = {
    GPT4oMini: "gpt-4o-mini",
    GPT41Mini: "gpt-4.1-mini",
    GPT5Mini: "gpt-5-mini",
};

Object.freeze(GPTModel);

const TTSVoice = {
    Alloy: "alloy",
    Ash: "ash",
    Ballad: "ballad",
    Coral: "coral",
    Echo: "echo",
    Fable: "fable",
    Nova: "nova",
    Onyx: "onyx",
    Shimmer: "shimmer",
    Verse: "verse",
    Marin: "marin",
    Cedar: "cedar",
};

Object.freeze(TTSVoice);

const DeepLTargetLanguage = {
    EnglishBritish: "EN-GB",
    EnglishAmerican: "EN-US",
    Ukrainian: "UK",
};

Object.freeze(DeepLTargetLanguage);

async function translateWithDeepL({
    text,
    targetLang = DeepLTargetLanguage.Ukrainian,
    sourceLang = null,
}) {
    if (!DEEPL_API_KEY) {
        throw new Error("VITE_DEEPL_API_KEY не знайдено");
    }
    if (!text?.trim()) {
        throw new Error("Немає тексту для перекладу");
    }

    const useFreeApi = DEEPL_API_KEY.includes(":fx");
    const endpoint = import.meta.env.DEV
        ? useFreeApi
            ? "/api/deepl-free/v2/translate"
            : "/api/deepl-pro/v2/translate"
        : useFreeApi
          ? "https://api-free.deepl.com/v2/translate"
          : "https://api.deepl.com/v2/translate";

    const body = new URLSearchParams();
    body.append("text", text);
    body.append("target_lang", targetLang);
    if (sourceLang) {
        body.append("source_lang", sourceLang);
    }

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
    });

    if (!response.ok) {
        let errorMessage = `DeepL API error: ${response.status}`;
        try {
            const errorPayload = await response.json();
            if (errorPayload?.message) {
                errorMessage = `DeepL API error: ${errorPayload.message}`;
            }
        } catch {
            // keep generic message when DeepL doesn't return JSON
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    const translatedText = data?.translations?.[0]?.text;
    if (!translatedText) {
        throw new Error("DeepL повернув порожній переклад");
    }
    return translatedText;
}

async function requireUserId() {
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
        throw new Error(sessionError.message);
    }
    if (!session?.user?.id) {
        throw new Error("Потрібно увійти в акаунт");
    }
    return session.user.id;
}

async function addVocabularyWord(newWord) {
    const userId = await requireUserId();

    const { data, error } = await supabase
        .from("vocabulary_words")
        .insert([
            {
                user_id: userId,
                text: newWord.text,
                topic: newWord.topic || null,
                relevant_translations: newWord.relevant_translations || null,
            },
        ])
        .select();

    if (error) {
        throw new Error(error.message);
    }

    return data[0];
}

async function fetchVocabularyWords() {
    const userId = await requireUserId();

    const { data: vocabulary_words, error } = await supabase
        .from("vocabulary_words")
        .select("*")
        .eq("user_id", userId)
        .order("id", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return vocabulary_words;
}

async function updateVocabularyWord({
    id,
    exerciseType,
    metodology_parameters,
}) {
    const userId = await requireUserId();

    const { data, error } = await supabase
        .from("vocabulary_words")
        .update({
            [`status_${exerciseType}`]:
                metodology_parameters[`status_${exerciseType}`],
            [`last_reviewed_${exerciseType}`]:
                metodology_parameters[`last_reviewed_${exerciseType}`],
            [`checkpoint_${exerciseType}`]:
                metodology_parameters[`checkpoint_${exerciseType}`],
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select();

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

async function generateExerciseVocabularyItem(vocabularyWordMainParameters) {
    const input = `Generate a JSON object for an English word/phrase/pattern.

INPUT:
- Word/phrase/pattern: "${vocabularyWordMainParameters.text}"
${vocabularyWordMainParameters.topic ? `- Topic: "${vocabularyWordMainParameters.topic}"` : ""}
${vocabularyWordMainParameters.relevant_translations ? `- Relevant translations: ${vocabularyWordMainParameters.relevant_translations}` : ""}

OUTPUT STRUCTURE:
{
    "example_ukr": "Natural Ukrainian sentence using this word/phrase/pattern",
    "example_eng": "The same sentence in English",
    "used_form": "the exact form of word/phrase/pattern you used in "example_eng" (because after parsing I want to underline used form on the client side)"
}

REQUIREMENTS:
1. Create ONE example sentence for English learners (BEGINNER Level - A1-A2)
3. As Ukrainian example as English example must sound native and natural - DO NOT translate word-by-word
4. Reference Cambridge, Oxford, Collins, or YouGlish for usage guidance.
5. If the input contains relevant translations - use them as translation examples and don't translate the word/phrase/pattern by yourself
6. Return ONLY valid JSON, no markdown, no explanations

A GOOD EXAMPLE FOR A VERB PHRASE:

INPUT:
- Word/phrase/pattern: "To pay for"

OUTPUT:
{
    "example_ukr": "Я заплачу за квартиру завтра",
    "example_eng": "I will pay for the apartment tomorrow",
    "used_form": "will pay for"
}

A GOOD EXAMPLE FOR A PATTERN:

INPUT:
- Word/phrase/pattern: "On {month} {ordinal numeral}"
- Topic: "Time & Dates" 
- Relevant translations: "Восьмого грудня"

OUTPUT:
{
    "example_ukr": "Моя відпустка починається п'ятого липня",
    "example_eng": "My vacation starts on July 5th",
    "used_form": "on July 5th"
}`;

    const response = await client.responses.create({
        model: GPTModel.GPT5Mini,

        reasoning: { effort: "low" },
        input,
    });

    let parsed;
    try {
        parsed = JSON.parse(response.output_text);
        console.log(response.usage);
    } catch (e) {
        throw new Error("OpenAI returned invalid JSON");
    }
    return parsed;
}

async function generateSpeech(text) {
    const response = await client.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: TTSVoice.Marin,
        input: text,
    });

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    return url;
}

async function generateSentenceCompletion(vocabularyWordMainParameters) {
    const input = `Create a sentence completion exercise for word/phrase/pattern.

INPUT:
- Word/phrase/pattern: "${vocabularyWordMainParameters.text}"
${vocabularyWordMainParameters.topic ? `- Topic: "${vocabularyWordMainParameters.topic}"` : ""}
${vocabularyWordMainParameters.relevant_translations ? `- Relevant translations: ${vocabularyWordMainParameters.relevant_translations}` : ""}

IMPORTANT: Create a detailed text.

Return a JSON object with this exact structure:
{
  "displaySentence": "Same sentence with ____ (gap) instead of the word/phrase/pattern",
  "completeSentence": "Complete English sentence with the word/phrase/pattern",
  "sentenceTranslation": "Ukrainian translation of the complete sentence",
  "correctAnswer": "the exact form of word/phrase/pattern you used in "completeSentence" because after parsing I want to underline used form on the client side",
  "hint": "clear and short explanation"
}

Requirements:
- Create the sentence for English learners (BEGINNER Level - A1)
- The displaySentence should have exactly one ____ where the word (or several words) was / were removed
- correctAnswer: The actual exact form of word/phrase/pattern that fits (may be different due to tense, plural, etc.)
- hint: Create an explanation/description for the word/phrase/pattern. Make it clear and concise but don't use the word itself or its direct translations. The explanation should be 1 sentence long and help learners identify the word.
- As Ukrainian example as English example must sound native and natural - DO NOT translate word-by-word
- Reference Cambridge, Oxford, Collins, or YouGlish for usage guidance.
- Look at the BAD EXAMPLE - it's VERY important

Example for word "clear":

{
  "displaySentence": "Tomorrow the sky will be ____ throughout the day, with no clouds expected. Temperatures will rise steadily in the afternoon, bringing warm and pleasant weather.",
  "completeSentence": "Tomorrow the sky will be clear throughout the day, with no clouds expected. Temperatures will rise steadily in the afternoon, bringing warm and pleasant weather.",
  "sentenceTranslation": "Завтра небо буде ясним протягом усього дня, без очікуваних хмар. Температура поступово підвищуватиметься вдень, приносячи теплу та приємну погоду.",
  "correctAnswer": "clear",
  "hint": "Typical word in forecasts when the sky has no clouds at all."
}

Example for word "hungry":

{
  "displaySentence": "After walking all afternoon in the forest, the children were so ____ that they could hardly wait for dinner.",
  "completeSentence": "After walking all afternoon in the forest, the children were so hungry that they could hardly wait for dinner.",
  "sentenceTranslation": "Після прогулянки лісом увесь день діти були такими голодними, що ледве дочекалися вечері.",
  "correctAnswer": "hungry",
  "hint": "A feeling when your body needs food."
}

Bad example:

{
  "displaySentence": "If you feel angry, try not to ____ your temper and stay calm.",
  "completeSentence": "If you feel angry, try not to lose your temper and stay calm.",
  "sentenceTranslation": "Якщо ти відчуваєш голод, намагайся не втрачати здоровий глузд та залишатися спокійним",
  "correctAnswer": "lose your temper",
  "hint": "When you get very angry and cannot control your feelings."
} Why is it a bad example? Because if you put "correctForm" into gap it sounds: "If you feel angry, try not to ____ your temper and stay calm." -> "If you feel angry, try not to lose your temper your temper and stay calm." So in this case you must use "correctAnswer":"lose"`;

    const response = await client.responses.create({
        model: GPTModel.GPT5Mini,

        reasoning: { effort: "low" },
        input,
    });

    let parsed;
    try {
        parsed = JSON.parse(response.output_text);
        console.log("Sentence completion generated:", response.usage);
    } catch (e) {
        throw new Error("OpenAI returned invalid JSON");
    }
    return parsed;
}

async function generateListenAndFill(vocabularyWordMainParameters) {
    const input = `Create a sentence completion exercise for word/phrase/pattern.

INPUT:
- Word/phrase/pattern: "${vocabularyWordMainParameters.text}"
${vocabularyWordMainParameters.topic ? `- Topic: "${vocabularyWordMainParameters.topic}"` : ""}
${vocabularyWordMainParameters.relevant_translations ? `- Relevant translations: ${vocabularyWordMainParameters.relevant_translations}` : ""}

IMPORTANT: Create a detailed text.

Return a JSON object with this exact structure:
{
  "displaySentence": "Same sentence with ____ (gap) instead of the word/phrase/pattern",
  "completeSentence": "Complete English sentence with the word/phrase/pattern",
  "sentenceTranslation": "Ukrainian translation of the complete sentence",
  "correctAnswer": "the exact form of word/phrase/pattern you used in "completeSentence" because after parsing I want to underline used form on the client side",
  "hint": "clear and short explanation"
}

Requirements:
- Create the sentence for English learners (BEGINNER Level - A1)
- The displaySentence should have exactly one ____ where the word (or several words) was / were removed
- correctAnswer: The actual exact form of word/phrase/pattern that fits (may be different due to tense, plural, etc.)
- hint: Create an explanation/description for the word/phrase/pattern. Make it clear and concise but don't use the word itself or its direct translations. The explanation should be 1 sentence long and help learners identify the word.
- As Ukrainian example as English example must sound native and natural - DO NOT translate word-by-word
- Reference Cambridge, Oxford, Collins, or YouGlish for usage guidance.
- Look at the BAD EXAMPLE - it's VERY important

Example for word "clear":

{
  "displaySentence": "Tomorrow the sky will be ____ throughout the day, with no clouds expected. Temperatures will rise steadily in the afternoon, bringing warm and pleasant weather.",
  "completeSentence": "Tomorrow the sky will be clear throughout the day, with no clouds expected. Temperatures will rise steadily in the afternoon, bringing warm and pleasant weather.",
  "sentenceTranslation": "Завтра небо буде ясним протягом усього дня, без очікуваних хмар. Температура поступово підвищуватиметься вдень, приносячи теплу та приємну погоду.",
  "correctAnswer": "clear",
  "hint": "Typical word in forecasts when the sky has no clouds at all."
}

Example for word "hungry":

{
  "displaySentence": "After walking all afternoon in the forest, the children were so ____ that they could hardly wait for dinner.",
  "completeSentence": "After walking all afternoon in the forest, the children were so hungry that they could hardly wait for dinner.",
  "sentenceTranslation": "Після прогулянки лісом увесь день діти були такими голодними, що ледве дочекалися вечері.",
  "correctAnswer": "hungry",
  "hint": "A feeling when your body needs food."
}

Bad example:

{
  "displaySentence": "If you feel angry, try not to ____ your temper and stay calm.",
  "completeSentence": "If you feel angry, try not to lose your temper and stay calm.",
  "sentenceTranslation": "Якщо ти відчуваєш голод, намагайся не втрачати здоровий глузд та залишатися спокійним",
  "correctAnswer": "lose your temper",
  "hint": "When you get very angry and cannot control your feelings."
} Why is it a bad example? Because if you put "correctForm" into gap it sounds: "If you feel angry, try not to ____ your temper and stay calm." -> "If you feel angry, try not to lose your temper your temper and stay calm." So in this case you must use "correctAnswer":"lose"`;

    const response = await client.responses.create({
        model: GPTModel.GPT5Mini,

        reasoning: { effort: "low" },
        input,
    });

    let parsed;
    try {
        parsed = JSON.parse(response.output_text);
        console.log("Listen and fill generated:", response.usage);
    } catch (e) {
        throw new Error("OpenAI returned invalid JSON");
    }
    return parsed;
}

export {
    addVocabularyWord,
    fetchVocabularyWords,
    updateVocabularyWord,
    generateExerciseVocabularyItem,
    generateSpeech,
    generateSentenceCompletion,
    generateListenAndFill,
    translateWithDeepL,
    DeepLTargetLanguage,
};
