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

function parseJsonOutput(text) {
    const raw = String(text || "").trim();
    if (!raw) {
        throw new Error("OpenAI returned empty output");
    }

    const removeCodeFence = (value) =>
        value
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

    const tryParse = (value) => {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    };

    // 1) Direct parse (in case model returns plain JSON)
    const direct = tryParse(raw);
    if (direct) {
        return direct;
    }

    // 2) Parse after removing markdown fences
    const deFenced = removeCodeFence(raw);
    const parsedDefenced = tryParse(deFenced);
    if (parsedDefenced) {
        return parsedDefenced;
    }

    // 3) Extract the first JSON object block as a fallback
    const firstBrace = deFenced.indexOf("{");
    const lastBrace = deFenced.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const extracted = deFenced.slice(firstBrace, lastBrace + 1).trim();
        const parsedExtracted = tryParse(extracted);
        if (parsedExtracted) {
            return parsedExtracted;
        }
    }

    throw new Error("OpenAI returned invalid JSON");
}

function buildResponsesCreatePayload(model, input) {
    const payload = { model, input };
    if (String(model).startsWith("gpt-5")) {
        payload.reasoning = { effort: "low" };
    }
    return payload;
}

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

async function generateCompleteFlashcard({
    text,
    englishLevel = "B1",
    categoryContext = "",
    model = GPTModel.GPT5Mini,
}) {
    const input = `Create a comprehensive flashcard for an English vocabulary word/phrase. Word: "${text}".
The output must be in English level: ${englishLevel}.

Return JSON format:
{
  "text": "${text}",
  "transcription": "Resources: Oxford Learner's Dictionaries. Must use \\n\\n between each variant. Format for output: UK: [ˌjuːnɪˈvɜːsəti] US: [ˌjuːnɪˈvɜːrsəti];",
  "translation": "Several possible Ukrainian translation variants (1-2 or more) for: "${text}". Output only in the format like: "Виглядати; дивитися; вигляд; зовнішність". No extra text. Only the string.",
  "shortDescription": "A very short description (1-2 sentences max, under 100 characters). The description should be concise and clear",
  "explanation": "Write a comprehensive, detailed explanation of the word/phrase that includes ALL of the following elements:

1. DETAILED MEANING: Start with a clear, complete definition of the word. Explain what it means in depth, including any nuances or variations
2. USAGE CONTEXT: Describe when and how this word is typically used in simple words to understand
3. REAL-WORLD APPLICATION: Describe practical situations where this word is used and explain the meaning (for example you can use synonims)
4. SOME INTERESTING FACTS: some facts form life or specific examples 

Your explanation must be written in an engaging, educational article style appropriate for ${englishLevel} level learners (must use \\n\\n between paragraphs). Think of it as a mini-encyclopedia entry that thoroughly covers the topic. Use simple language but provide comprehensive information.

Examples structure:
  "examples": ["Example sentence 1 using the word", "Example sentence 2 showing different context", "Example sentence 3 with another usage"],
  "notes": ""
}

Requirements:
- Ensure all content is in ${englishLevel} English level
- Don't use conclusion at the end of explanation like "In conclusion" or "Overall, ...", only the main information without unnecessary text
- The "explanation" property text must be 3-4 paragraphs max

Example for word "opportunity":

{
  "text": "opportunity",
  "transcription": "UK: [ˌɒpəˈtjuːnəti]\\\\n\\\\nUS: [ˌɑːpərˈtuːnəti]",
  "translation": "можливість; нагода; шанс; перспектива",
  "shortDescription": "A chance to do something good or important that can help you succeed.",
  "explanation": "An opportunity is a chance to do something that can be good for you. It is like a special moment when you can try something new or improve your life. When you have an opportunity, it means the right time has come to do something important.\\n\\nOpportunities can happen in many parts of your life. At work, you might get an opportunity to get a better job or learn new skills. At school, you might have an opportunity to join a club or study in another country. In your personal life, you might get an opportunity to meet new friends or visit new places. Some opportunities come and go quickly, so you need to act fast. Other opportunities stay for a longer time. The important thing is to notice them and decide if you want to try.\\n\\nThe word 'opportunity' is very common in English. People use it when they talk about jobs, education, and life in general. For example, your teacher might say 'This is a good opportunity to practice English.' Here, opportunity means a special chance or the right moment to improve your English skills by practicing. Your boss might say 'We have an opportunity to work with a new company.' It means we can start working together with another company. In real life, opportunities are everywhere. When you meet new people, that's an opportunity to make friends. When you see a job advertisement, that's an opportunity to get work. The word 'opportunity' is a noun. You can also use the word 'chance' which means almost the same thing.",
  "examples": [
    "This job is a good opportunity for me to learn new things.",
    "I missed the opportunity to see my favorite band in concert.",
    "Going to university is an opportunity to meet new friends."
  ],
  "notes": ""
}

Example for word "valley":

{
  "text": "valley",
  "transcription": "UK: [ˈvæli]\\n\\nUS: [ˈvæli]",
  "translation": "долина",
  "shortDescription": "A low area of land between hills or mountains, often with a river or stream.",
  "explanation": "A valley is a low area of land between hills or mountains. Valleys are made by rivers or ice moving through the land. Usually, the land goes down in the middle and up on both sides.\\n\\nSome valleys are wide with soft, green sides and flat bottoms. Other valleys are narrow with steep sides. Many valleys have rivers or small streams running through them. They can look like natural roads between hills or mountains.\\n\\nValleys are useful for people. The soil is rich, so farmers can grow crops. Many people live in valleys because they are protected from strong winds. Valleys make good paths for travel. Beautiful valleys attract tourists. Rivers in valleys can give water for drinking.\\n\\nSome valleys are very big. The Grand Canyon in the USA is 446 km long and 29 km wide. Some valleys on Mars are even bigger. Some valleys are made by rivers over millions of years. Others are made by ice called glaciers. Valleys are not always safe. Heavy rain can cause floods. Cold air can stay in valleys, making them colder than other places. Landslides can happen on valley sides. Fog is common and can make it hard to see.",
  "examples": [
    "The hikers walked through a beautiful valley with a river running through it.",
    "Farmers grow crops in the fertile soil of the valley.",
    "The Grand Canyon is a famous valley in the United States."
  ],
  "notes": ""
}
${categoryContext}`;

    const response = await client.responses.create({
        ...buildResponsesCreatePayload(model, input),
    });

    return parseJsonOutput(response.output_text || "");
}

export {
    addVocabularyWord,
    fetchVocabularyWords,
    updateVocabularyWord,
    generateExerciseVocabularyItem,
    generateSpeech,
    generateSentenceCompletion,
    generateListenAndFill,
    generateCompleteFlashcard,
    translateWithDeepL,
    DeepLTargetLanguage,
};
