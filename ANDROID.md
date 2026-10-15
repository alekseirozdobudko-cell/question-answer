# Сборка и скачивание APK

Для скачивания на Android нужен APK-файл. `npm run export:android` создаёт экспорт JavaScript-приложения, а не устанавливаемый APK.

## Сборка

1. Установите Node.js и войдите в Expo: `npx eas-cli login`.
2. Свяжите проект с Expo при первом запуске: `npx eas-cli build:configure`.
3. Соберите APK в облаке: `npx eas-cli build --platform android --profile preview`.
4. Скачайте APK по ссылке из завершённой сборки.

Сборка `preview` настроена как APK для прямой установки. EAS может попросить создать Android signing key; создайте его через EAS и не добавляйте ключ в репозиторий.

## Публикация релиза

После сборки прикрепите APK к GitHub Release с именем `Question-and-Answer.apk`. Тогда его можно будет скачать по адресу:

`https://github.com/OWNER/REPOSITORY/releases/latest/download/Question-and-Answer.apk`

Замените `OWNER/REPOSITORY` на владельца и имя созданного GitHub-репозитория. В общедоступном репозитории исходный код доступен сразу после публикации, а APK станет доступен после загрузки файла в Release.
