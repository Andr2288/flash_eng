# Software Design Document (SDD)

## 1. Архітектура

Тип: SPA (React)

---

## 2. Компоненти

### UI Layer

- сторінки (Home, Practice, Profile)
- компоненти вправ

### State Layer

- Redux Toolkit
- vocabularyWordsSlice

### Integration Layer

- Supabase API
- OpenAI API

---

## 3. Потоки

### Додавання слова

UI → Redux → Supabase

### Генерація вправи

Redux → OpenAI API → UI

---

## 4. Модель даних

VocabularyWord:

- id
- text
- topic
- status
