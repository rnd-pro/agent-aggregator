# GitHub Setup Instructions

## Создание приватного репозитория

1. Перейти на https://github.com/new
2. Указать название: `AgentAggregator`
3. Добавить описание: `MCP Server that aggregates tools from multiple MCP servers`
4. ✅ Поставить галочку **"Private"**
5. ❌ НЕ добавлять README, .gitignore или лицензию (они уже есть в проекте)
6. Нажать **"Create repository"**

## Команды для подключения локального репозитория

После создания репозитория на GitHub выполните эти команды в терминале:

```bash
# Добавить удаленный репозиторий
git remote add origin git@github.com:MakerDrive/AgentAggregator.git

# Отправить код в GitHub
git branch -M main
git push -u origin main
```

## Альтернативный способ (HTTPS)

Если SSH не работает, используйте HTTPS:

```bash
# Добавить удаленный репозиторий через HTTPS
git remote add origin https://github.com/MakerDrive/AgentAggregator.git

# Отправить код в GitHub
git branch -M main
git push -u origin main
```

## Проверка

После успешной загрузки проект будет доступен по адресу:
https://github.com/MakerDrive/AgentAggregator

## Что включено в репозиторий

- 📁 Полная структура проекта Agent Aggregator
- 🔧 Все исходные файлы и конфигурации
- 📝 Документация (README.md, PROJECT_STATUS.md)
- 🧪 Тесты и мок-серверы
- ⚙️ package.json с зависимостями
- 🚫 .gitignore с правильными исключениями