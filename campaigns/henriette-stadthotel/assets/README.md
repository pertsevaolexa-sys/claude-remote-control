# Фото и логотипы

Репозиторий публичный. Фото Henriette лицензированы только для соцсетей с подписью, поэтому в git их нет. Папки `photos/` и `brand/` git игнорирует: положите файлы туда у себя на компьютере.

## Что нужно

```text
assets/
  photos/   14 кадров с именами из photos.json → "file"
  brand/    Polygood_horizontal_white.svg, Polygood_horizontal_Black.svg
```

## Как скачать

**Вариант 1, через агента.** В Claude Code должен быть подключён Notion. Агент вызывает `notion-get-file-download-urls` со значениями `notion_file` из `photos.json`, скачивает каждую ссылку через `curl` (ссылки живут 5 минут) и уменьшает кадры до 2400 px по длинной стороне. Оригиналы весят по 17–34 МБ. На macOS это делается так:

```bash
sips -Z 2400 assets/photos/*.jpg
```

**Вариант 2, вручную.**

1. Откройте две страницы Notion из `photos.json`: съёмки Patrick Johannsen и supersusi.com.
2. Скачайте кадры в `assets/photos/` с теми же именами файлов.
3. Логотипы скачайте со страницы Notion → Polygood® Toolkit → Logos.

## Подписи

Рендер графики ставит подпись автоматически по полю `set` кадра:

- Johannsen: © Stadthotel Henriette / Patrick Johannsen Fotografie
- supersusi: © Henriette Stadthotel Vienna / supersusi.com

В соцсетях ещё отмечаем @hotel.henriette.

## Какие кадры я уже посмотрела

| id | Что на кадре |
|---|---|
| J123 | Самый широкий кадр номера 3: ёлочный паркет, терракотовый диван, кровать, справа умывальник Emerald Ghost |
| J55 | Ванная номера 1: умывальник Sapphire Terrazzo, круглое зеркало, латунный светильник |
| J101 | Ванная номера 2: длинный умывальник Sapphire Terrazzo |
| S5050 | Sapphire Terrazzo крупнее: раковина, смеситель, сухоцветы |
| S1516 | White Terrazzo крупным планом: цветная крошка, белая раковина |

Остальные кадры (`"reviewed": false`) посмотрите сами перед использованием. Крупный план Emerald Ghost, скорее всего, среди J124 и J125.
