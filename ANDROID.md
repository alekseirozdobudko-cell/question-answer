# Сборка и скачивание APK

Для скачивания на Android нужен APK-файл. `npm run export:android` создаёт экспорт JavaScript-приложения, а не устанавливаемый APK.

## Скачать готовый APK

[Question-and-Answer.apk](https://github.com/alekseirozdobudko-cell/question-answer/releases/latest/download/Question-and-Answer.apk)

Скачайте APK на Android, откройте его и при запросе разрешите установку из используемого браузера или файлового менеджера. Expo Go не нужен.

Это предварительная сборка с тестовым ключом подписи из Android-шаблона Expo. Она работает без сервера разработки, но не предназначена для Google Play. При переходе на собственную подпись может понадобиться удалить эту версию, что удалит сохранённые настройки.

## Повторная сборка на GitHub

Откройте Actions → Build Android APK → Run workflow. После завершения скачайте артефакт `Question-and-Answer-APK`: внутри будет APK. Процесс проверяет типы и тесты, генерирует Android-проект Expo и собирает release-вариант с тестовой подписью. Аккаунт Expo и секреты для этой сборки не нужны.

## Сборка с собственной подписью через Expo

1. Установите Node.js и войдите в Expo: `npx eas-cli login`.
2. Свяжите проект с Expo при первом запуске: `npx eas-cli build:configure`.
3. Соберите APK в облаке: `npx eas-cli build --platform android --profile preview`.
4. Скачайте APK по ссылке из завершённой сборки.

Сборка `preview` настроена как APK для прямой установки. EAS может попросить создать Android signing key; создайте его через EAS и не добавляйте ключ в репозиторий.

## Публикация релиза

После сборки прикрепите APK к GitHub Release с именем `Question-and-Answer.apk`. Тогда его можно будет скачать по адресу:

`https://github.com/alekseirozdobudko-cell/question-answer/releases/latest/download/Question-and-Answer.apk`

В общедоступном репозитории исходный код доступен сразу после публикации, а APK станет доступен после загрузки файла в Release.
