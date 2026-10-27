# Графика кампании

Картинки собираются из настоящих фото проекта и текста в JSON. Сгенерированных изображений отеля или умывальников здесь нет и не будет: это кейс, и показывать можно только то, что есть на самом деле.

## Запуск

```bash
cd campaigns/henriette-stadthotel/graphics
npm run setup      # один раз: Playwright и Chromium
npm run render     # все спецификации из specs/
node render.mjs specs/linkedin-carousel.json   # одна спецификация
```

Результат появляется в `out/<спецификация>/`: файлы `01-…png`, `02-…png` и т. д., а также `_contact.png`, где все кадры на одном листе. Папку `out/` git игнорирует, потому что в картинках лицензированные фото.

Предупреждения рендер пишет в консоль: нет фото, неизвестный layout, текст не помещается. Если хоть одно есть, скрипт завершается с кодом 1.

## Спецификации

| Файл | Канал | Размер |
|---|---|---|
| `specs/instagram-carousel.json` | Коллаб-пост Instagram, 7 слайдов | 1080×1350 |
| `specs/instagram-story.json` | Stories: опрос «угадай материал», ответ, CTA | 1080×1920 |
| `specs/linkedin-carousel.json` | PDF-карусель LinkedIn, 6 слайдов | 1080×1350 |
| `specs/newsletter.json` | Шапка и полоса с цитатой для письма | 1200×600 |
| `specs/website-og.json` | Превью ссылки на страницу кейса | 1200×630 |

Текст в спецификациях стартовый. Агент переписывает его вместе с текстами каналов, а здесь повторяет финальный вариант слово в слово.

## Layouts

Поле `layout` у каждого слайда:

| layout | Поля | Для чего |
|---|---|---|
| `photo-hook` | `photo`, `focus`, `eyebrow`, `headline`, `body` | Первый слайд: фото на весь кадр, заголовок снизу |
| `photo-split` | `photo`, `focus`, `tag`, `eyebrow`, `headline`, `body`, `bg` | Паттерн: фото сверху, подпись на цветной панели |
| `triptych` | `eyebrow`, `headline`, `items[{photo, focus, label, sub}]`, `bg` | Три паттерна рядом |
| `quote` | `eyebrow`, `quote`, `name`, `role`, `bg` | Цитата Verena |
| `statement` | `eyebrow`, `big`, `body`, `note`, `bg` | Одна крупная мысль |
| `cta` | `eyebrow`, `headline`, `actions[]`, `footer`, `bg` | Общий CTA |
| `story` | `photo`, `focus`, `position` (`top` или `bottom`), `eyebrow`, `headline`, `body` | Stories |
| `banner` | `photo`, `focus`, `eyebrow`, `headline`, `body`, `bg` | Широкие форматы: рассылка, превью ссылки |

Как устроены поля:

- `photo` — это `id` из `../assets/photos.json`. Подпись автора рендер ставит сам.
- `focus` — какая часть фото остаётся в кадре, как CSS `background-position`: `"50% 60%"`.
- `bg` — один из `paper`, `sand`, `ink`, `sapphire`, `emerald`, `terracotta`.
- `**слово**` в тексте выделяет слово цветом.
- `counter: true` на уровне спецификации включает номера слайдов «2/7».

## Перенос в Figma

Макеты можно собрать в Figma как редактируемые слои: текст, плашки, градиенты, логотип-компонент и фото с той же кадрировкой. Для этого нужен Figma MCP, а в нём инструмент `use_figma`.

1. Отрендерите макеты с выгрузкой слоёв: `node render.mjs --dump`. В каждой папке `out/<спецификация>/` появится `layers.json`.
2. Выполните `node figma/make-script.mjs setup` и запустите получившийся `out/figma/00-setup.js` через `use_figma`. Скрипт создаёт страницу, блок «Read me» и компонент логотипа и возвращает `logoId`.
3. Выполните `node figma/make-script.mjs build <logoId>` и запустите каждый `out/figma/NN-build.js` отдельным вызовом. На местах фото появятся подписанные заглушки `photo/<id>`.
4. Загрузите фото через `upload_assets` без указания цели и соберите их `imageHash` в JSON вида `{"J123": "…"}`. Затем выполните `node figma/make-script.mjs photos hashes.json` и запустите `out/figma/photos.js`. Фото встанут во все заглушки с нужной кадрировкой.

Первые черновики уже лежат в Figma: «Polygood × Henriette Stadthotel — campaign drafts v1», https://www.figma.com/design/IeSGuOc1DqLqN8wiOX4XNB

Цвета и шрифты берутся из `brand/tokens.css`. Они временные: сверьте их с брендбуком Polygood, разметка от этого не изменится. Логотип берётся из `../assets/brand/`. Если его там нет, на месте логотипа будет текст «polygood®».
