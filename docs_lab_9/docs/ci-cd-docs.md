# Documentation CI/CD Pipeline

## Артефакти документації

У процесі CI/CD автоматично генеруються:

- API-документація (Swagger UI)
- UI-документація (Storybook)
- статичний сайт документації (MkDocs)

---

## Тригери генерації

- push у feature-гілку
- merge у main

---

## Pipeline (послідовність кроків)

1. Валідація OpenAPI специфікації
2. Генерація Swagger UI
3. Збірка Storybook
4. Генерація статичного сайту документації (MkDocs)
5. Публікація на GitHub Pages

---

## Місце публікації

Документація публікується на GitHub Pages:

URL структура:
https://username.github.io/flasheng-docs/

---

## Versioning документації

- версія документації відповідає версії продукту
- при breaking changes створюється нова major версія
