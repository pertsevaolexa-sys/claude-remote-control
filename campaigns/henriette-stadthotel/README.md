# Henriette Stadthotel Vienna: материалы для четырёх исходников

Кейс: умывальники (washstands) из Polygood® в номерах Circular Living отеля Henriette Stadthotel Vienna.

**Цель:** привлечь тех, кто сейчас ремонтируется, представителей HoReCa и специфайеров. Показать им, что Polygood® выдерживает гостиничную нагрузку: больше года гостей и мойки паром, а состояние по-прежнему «impeccable».

## Как запустить агента

```bash
git clone -b claude/kind-euler-1jteeo https://github.com/pertsevaolexa-sys/claude-remote-control.git
cd claude-remote-control
claude
```

Дальше в Claude Code:

```text
/henriette
```

Команда запускает агента `polygood-content` (`.claude/agents/polygood-content.md`). Он читает этот комплект и проверяет фото. Потом пишет тексты для четырёх каналов, собирает и рендерит графику и сам её проверяет. Для одного канала: `/henriette linkedin`.

Перед первым запуском положите фото и логотипы в `assets/photos/` и `assets/brand/` (см. `assets/README.md`). Если в Claude Code подключён Notion, агент скачает их сам.

## Что в комплекте

| Файл | Что в нём |
|---|---|
| [AGENT-BRIEF.md](AGENT-BRIEF.md) | Задание агенту: что прочитать, что сдать, правила, критерии готовности |
| [ANSWERS.md](ANSWERS.md) | Ответы на 14 вопросов агента и что пока открыто |
| [01-mailchimp-segment.md](01-mailchimp-segment.md) | Сегмент рассылки: как собрать тег `HoReCa`, ориентиры по открытиям и кликам |
| [02-facts-and-sources.md](02-facts-and-sources.md) | Факты с источниками, цитаты, фото и права, что проверить до публикации |
| [03-channel-kit.md](03-channel-kit.md) | Целевая группа и персоны, главное сообщение, хуки, общий CTA, спецификации каналов |
| [brand.md](brand.md) | Тон, термины, запреты, временные цвета и шрифты |
| [source-article.md](source-article.md) | Статья из Notion, два CTA объединены в один |
| [assets/](assets/README.md) | Список 14 фото с подписями (`photos.json`) и как их скачать |
| [graphics/](graphics/README.md) | Шаблоны, спецификации для пяти форматов, скрипт рендера |

Агент пишет тексты в `outputs/henriette/`, а картинки кладёт в `graphics/out/`.

## Публичный репозиторий

Репозиторий открыт всем. Поэтому:

- **Фото, логотипы и картинки** с фото остаются только у вас на компьютере. `.gitignore` это гарантирует.
- **Адреса контактов** для тега `HoReCa` здесь не лежат.
- **Внутренние данные.** В `01-mailchimp-segment.md` есть размеры аудитории, названия тегов и статистика рассылок. Если они не должны быть публичными, сделайте репозиторий приватным: GitHub → Settings → General → Danger Zone → Change visibility.

## Проверить до публикации

- Фраза «умывальники были холодильниками». У Sapphire Terrazzo на сайте The Good Plastic Company источником сырья указаны катушки (spools).
- Статус GreenSign Circular.
- Согласие Verena на цитаты.
- Цвета и шрифты из брендбука вместо временных.
