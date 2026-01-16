# 🔐 Настройка Google OAuth

## Шаг 1: Создайте Google Cloud проект

1. Откройте: https://console.cloud.google.com/
2. В верхнем меню нажмите на выпадающий список проектов
3. Нажмите **"New Project"** (Создать проект)
4. Название: `Fitness App` (или любое другое)
5. Нажмите **"Create"**
6. Дождитесь создания проекта (10-20 секунд)

## Шаг 2: Включите Google+ API (опционально)

1. Перейдите: **APIs & Services** → **Library**
2. Найдите: `Google+ API`
3. Нажмите **Enable** (если еще не включен)

## Шаг 3: Создайте OAuth Consent Screen

1. Перейдите: **APIs & Services** → **OAuth consent screen**
2. Выберите **External** (для публичного приложения)
3. Нажмите **Create**
4. Заполните форму:
   - **App name**: `Fitness App`
   - **User support email**: ваш email
   - **Developer contact**: ваш email
5. Нажмите **Save and Continue**
6. **Scopes**: можно пропустить (Next)
7. **Test users**: можно пропустить (Next)
8. Нажмите **Back to Dashboard**

## Шаг 4: Создайте OAuth Client ID

1. Перейдите: **APIs & Services** → **Credentials**
2. Нажмите **+ Create Credentials** → **OAuth client ID**
3. Выберите тип: **Web application**
4. Заполните:
   - **Name**: `Fitness App Web Client`
   - **Authorized JavaScript origins**:
     ```
     https://botrik-mit.github.io
     ```
   - **Authorized redirect URIs**:
     ```
     https://botrik-mit.github.io/fitness_app/
     ```
5. Нажмите **Create**
6. **СКОПИРУЙТЕ CLIENT ID** (выглядит как `123456789-abcdefg...apps.googleusercontent.com`)

## Шаг 5: Обновите код

### 5.1 Обновите app.js

Откройте `app.js` и замените в строке 9:

```javascript
const GOOGLE_CLIENT_ID = 'ВСТАВЬТЕ_СЮДА_ВАШ_CLIENT_ID.apps.googleusercontent.com';
```

### 5.2 Обновите index.html

Откройте `index.html` и найдите строку (примерно строка 260):

```html
data-client_id="YOUR_CLIENT_ID.apps.googleusercontent.com"
```

Замените на ваш Client ID:

```html
data-client_id="ВАШ_CLIENT_ID.apps.googleusercontent.com"
```

## Шаг 6: Загрузите изменения на GitHub

```bash
cd /Users/it/Documents/fitnes_prog
git add app.js index.html
git commit -m "Добавлена авторизация через Google OAuth"
git push
```

## Шаг 7: Проверка

1. Откройте: https://botrik-mit.github.io/fitness_app/
2. Должна появиться кнопка **"Sign in with Google"**
3. Нажмите на кнопку
4. Выберите ваш Google аккаунт
5. Разрешите доступ
6. Вы должны войти в приложение!

---

## ✅ Готово!

Теперь пользователи смогут входить через свой Google аккаунт, и их данные будут автоматически привязаны к их email из Google.

## 🔒 Безопасность

- Email берется напрямую из Google аккаунта
- Не нужно ничего вводить вручную
- Данные защищены OAuth 2.0
- Каждый пользователь видит только свои данные

## 🐛 Проблемы?

### "Popup was blocked"

Разрешите всплывающие окна для вашего сайта.

### "Invalid client ID"

1. Проверьте, что Client ID правильно скопирован
2. Проверьте, что домен добавлен в "Authorized JavaScript origins"
3. Подождите 5-10 минут после создания (Google нужно время на обновление)

### "Error 400: redirect_uri_mismatch"

Проверьте, что в Google Cloud Console добавлен правильный redirect URI:
```
https://botrik-mit.github.io/fitness_app/
```

---

## 📖 Документация

- [Google Sign-In for Web](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
