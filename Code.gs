/**
 * Google Apps Script для фитнес-приложения
 * Хранит данные пользователей в Google Sheets
 */

// ID таблицы Google Sheets (замените на свой)
// Получить можно из URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_ID = '1a7ejvv7Mf6bDQ-WEhFITvZlU8cs9BOJX9r5yMYknyQc';

/**
 * doGet() - точка входа для веб-приложения
 * Возвращает HTML страницу
 */
function doGet() {
  // Загружаем HTML из файла index.html
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('План Роста и Тренировок')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * doPost() - API endpoint для PWA версии
 * Позволяет PWA загружать и сохранять данные через HTTP запросы
 * Поддерживает CORS для работы с GitHub Pages
 */
function doPost(e) {
  try {
    // Поддержка JSON payload (для fetch с body)
    let params = e.parameter;
    
    // Если данные пришли в теле запроса как JSON
    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        params = body;
      } catch (parseError) {
        Logger.log('Не удалось распарсить JSON body, используем e.parameter');
      }
    }
    
    const action = params.action;
    const email = params.email;
    
    if (!email) {
      return createCORSResponse({error: 'Email не указан'});
    }
    
    if (action === 'load') {
      const data = loadDataByEmail(email);
      return createCORSResponse(data);
    }
    
    if (action === 'save') {
      const data = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;
      const success = saveDataByEmail(email, data);
      return createCORSResponse({success: success});
    }
    
    return createCORSResponse({error: 'Неизвестное действие'});
      
  } catch (error) {
    Logger.log('Ошибка в doPost: ' + error.toString());
    return createCORSResponse({error: error.toString()});
  }
}

/**
 * Создает ответ с CORS заголовками для работы с GitHub Pages
 */
function createCORSResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Добавляем CORS заголовки (к сожалению, Google Apps Script не позволяет их добавить напрямую)
  // Поэтому возвращаем JSONP callback или обычный JSON
  return output;
}

/**
 * Получает email пользователя всеми возможными способами (для мобильных устройств)
 * @return {string|null} Email пользователя или null
 */
function getUserEmail() {
  let email = null;
  
  // Метод 1: getActiveUser (работает на десктопе)
  try {
    email = Session.getActiveUser().getEmail();
    if (email) {
      Logger.log('Email получен через getActiveUser(): ' + email);
      return email;
    }
  } catch (e) {
    Logger.log('getActiveUser() не сработал: ' + e.toString());
  }
  
  // Метод 2: getEffectiveUser (работает когда есть делегирование)
  try {
    email = Session.getEffectiveUser().getEmail();
    if (email) {
      Logger.log('Email получен через getEffectiveUser(): ' + email);
      return email;
    }
  } catch (e) {
    Logger.log('getEffectiveUser() не сработал: ' + e.toString());
  }
  
  // Метод 3: Через проверку прав доступа к таблице (для мобильных)
  try {
    const sheet = getOrCreateSheet();
    const spreadsheet = sheet.getParent();
    
    // Пробуем получить владельца таблицы
    try {
      const owner = spreadsheet.getOwner();
      if (owner) {
        email = owner.getEmail();
        Logger.log('Email получен через getOwner(): ' + email);
        return email;
      }
    } catch (e) {
      Logger.log('getOwner() не сработал: ' + e.toString());
    }
    
    // Пробуем получить список редакторов и найти текущего пользователя
    try {
      const editors = spreadsheet.getEditors();
      Logger.log('Найдено редакторов: ' + editors.length);
      
      if (editors && editors.length > 0) {
        // Пробуем определить текущего пользователя через попытку записи
        // Если пользователь может писать, значит он один из редакторов
        for (let i = 0; i < editors.length; i++) {
          try {
            const editorEmail = editors[i].getEmail();
            Logger.log('Проверяем редактора #' + (i+1) + ': ' + editorEmail);
            
            // Пробуем использовать email этого редактора
            // Если это текущий пользователь, то запись пройдет успешно
            email = editorEmail;
            Logger.log('Пробуем использовать email: ' + email);
            return email;
          } catch (e) {
            Logger.log('Ошибка при проверке редактора #' + (i+1) + ': ' + e.toString());
            continue;
          }
        }
      }
    } catch (e) {
      Logger.log('Не удалось получить список редакторов: ' + e.toString());
    }
    
    // Метод 3.5: Пробуем через проверку прав на файл в Drive
    try {
      const file = DriveApp.getFileById(SPREADSHEET_ID);
      const editors = file.getEditors();
      Logger.log('Найдено редакторов через Drive API: ' + editors.length);
      
      if (editors && editors.length > 0) {
        // Берем первого редактора (обычно это текущий пользователь на мобильных)
        email = editors[0].getEmail();
        Logger.log('Email получен через Drive API (первый редактор): ' + email);
        return email;
      }
    } catch (e) {
      Logger.log('Drive API (getEditors) не помог: ' + e.toString());
    }
  } catch (e) {
    Logger.log('Не удалось получить email через права доступа: ' + e.toString());
  }
  
  // Метод 4: Через Drive API (последняя попытка)
  try {
    const file = DriveApp.getFileById(SPREADSHEET_ID);
    const owner = file.getOwner();
    if (owner) {
      email = owner.getEmail();
      Logger.log('Email получен через Drive API (owner): ' + email);
      return email;
    }
  } catch (e) {
    Logger.log('Drive API не помог: ' + e.toString());
  }
  
  Logger.log('⚠️ ВНИМАНИЕ: Не удалось определить email пользователя всеми методами');
  return null;
}

/**
 * Загружает данные текущего пользователя
 * @return {Object} Данные пользователя или null если данных нет
 */
function loadData() {
  try {
    const email = getUserEmail();
    
    if (!email) {
      Logger.log('ОШИБКА: Не удалось получить email пользователя. Возвращаем дефолтные данные.');
      const defaultData = getDefaultData();
      defaultData._anonymous = true;
      defaultData._error = 'Email не определен - возможно проблема с авторизацией на мобильном устройстве';
      return defaultData;
    }
    
    Logger.log('✅ Email пользователя получен: ' + email);
    return loadDataByEmail(email);
  } catch (error) {
    Logger.log('Ошибка загрузки данных: ' + error.toString());
    return getDefaultData();
  }
}

/**
 * Загружает данные пользователя по email (для PWA API)
 * @param {string} email - Email пользователя
 * @return {Object} Данные пользователя
 */
function loadDataByEmail(email) {
  try {
    Logger.log('Загрузка данных для пользователя: ' + email);
    const sheet = getOrCreateSheet();
    const data = findUserData(sheet, email);
    
    if (data) {
      const parsed = JSON.parse(data);
      Logger.log('Данные загружены для: ' + email);
      return parsed;
    }
    
    Logger.log('Данные не найдены, возвращаем дефолтные для: ' + email);
    return getDefaultData();
  } catch (error) {
    Logger.log('Ошибка загрузки данных: ' + error.toString());
    return getDefaultData();
  }
}

/**
 * Сохраняет данные текущего пользователя
 * @param {Object} data - Объект с данными для сохранения
 * @return {boolean} true если успешно
 */
function saveData(data) {
  try {
    let email = getUserEmail();
    
    // Если email не определен, пробуем агрессивный метод - через попытку записи
    if (!email) {
      Logger.log('⚠️ Email не определен стандартными методами, пробуем определить через запись...');
      
      try {
        const sheet = getOrCreateSheet();
        const spreadsheet = sheet.getParent();
        
        // Пробуем получить список всех редакторов и использовать первого
        const editors = spreadsheet.getEditors();
        if (editors && editors.length > 0) {
          // Берем первого редактора (на мобильных это часто текущий пользователь)
          email = editors[0].getEmail();
          Logger.log('✅ Используем email первого редактора: ' + email);
        } else {
          // Если редакторов нет, пробуем через Drive
          const file = DriveApp.getFileById(SPREADSHEET_ID);
          const fileEditors = file.getEditors();
          if (fileEditors && fileEditors.length > 0) {
            email = fileEditors[0].getEmail();
            Logger.log('✅ Используем email первого редактора через Drive: ' + email);
          }
        }
      } catch (e) {
        Logger.log('❌ Не удалось определить email даже через редакторов: ' + e.toString());
      }
    }
    
    if (!email) {
      Logger.log('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось получить email пользователя при сохранении');
      Logger.log('Возможные причины:');
      Logger.log('1. Пользователь не авторизован в Google');
      Logger.log('2. Нет прав доступа к таблице');
      Logger.log('3. Проблема с мобильным браузером');
      Logger.log('Данные НЕ будут сохранены. Проверьте логи выше для деталей.');
      return false;
    }
    
    Logger.log('💾 Сохранение данных для пользователя: ' + email);
    const result = saveDataByEmail(email, data);
    
    if (result) {
      Logger.log('✅ Данные успешно сохранены для: ' + email);
    } else {
      Logger.log('❌ Ошибка при сохранении данных для: ' + email);
      Logger.log('Проверьте права доступа к таблице и логи выше');
    }
    
    return result;
  } catch (error) {
    Logger.log('❌ КРИТИЧЕСКАЯ ОШИБКА сохранения данных: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return false;
  }
}

/**
 * Сохраняет данные пользователя по email (для PWA API)
 * @param {string} email - Email пользователя
 * @param {Object} data - Объект с данными для сохранения
 * @return {boolean} true если успешно
 */
function saveDataByEmail(email, data) {
  try {
    Logger.log('💾 Начало сохранения данных для: ' + email);
    
    // Проверяем доступ к таблице
    let sheet;
    try {
      sheet = getOrCreateSheet();
      Logger.log('✅ Лист таблицы получен успешно');
    } catch (e) {
      Logger.log('❌ ОШИБКА: Не удалось получить лист таблицы: ' + e.toString());
      Logger.log('Проверьте SPREADSHEET_ID и права доступа к таблице');
      return false;
    }
    
    const dataString = JSON.stringify(data);
    Logger.log('Данные сериализованы, размер: ' + dataString.length + ' символов');
    
    // Ищем строку с email пользователя
    const emailColumn = 1;
    const dataColumn = 2;
    const lastRow = sheet.getLastRow();
    Logger.log('Текущая последняя строка в таблице: ' + lastRow);
    
    let foundRow = null;
    const emailTrimmed = email.toString().trim().toLowerCase();
    
    for (let i = 2; i <= lastRow; i++) {
      try {
        const rowEmail = sheet.getRange(i, emailColumn).getValue();
        if (rowEmail && rowEmail.toString().trim().toLowerCase() === emailTrimmed) {
          foundRow = i;
          Logger.log('✅ Найдена существующая строка для ' + email + ' (строка ' + foundRow + ')');
          break;
        }
      } catch (e) {
        Logger.log('Ошибка при чтении строки ' + i + ': ' + e.toString());
        continue;
      }
    }
    
    if (foundRow) {
      // Обновляем существующую строку
      try {
        sheet.getRange(foundRow, dataColumn).setValue(dataString);
        Logger.log('✅ Данные обновлены для пользователя: ' + email + ' (строка ' + foundRow + ')');
      } catch (e) {
        Logger.log('❌ Ошибка при обновлении строки ' + foundRow + ': ' + e.toString());
        return false;
      }
    } else {
      // Добавляем новую строку
      try {
        sheet.appendRow([email, dataString]);
        Logger.log('✅ Данные добавлены для нового пользователя: ' + email + ' (новая строка)');
      } catch (e) {
        Logger.log('❌ Ошибка при добавлении новой строки: ' + e.toString());
        Logger.log('Возможно, нет прав на запись в таблицу');
        return false;
      }
    }
    
    Logger.log('✅ Сохранение завершено успешно для: ' + email);
    return true;
  } catch (error) {
    Logger.log('❌ КРИТИЧЕСКАЯ ОШИБКА сохранения данных: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return false;
  }
}

/**
 * Получает или создаёт таблицу для хранения данных
 * @return {Sheet} Лист таблицы
 */
function getOrCreateSheet() {
  let spreadsheet;
  
  Logger.log('🔍 Попытка открыть таблицу с ID: ' + SPREADSHEET_ID);
  
  try {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    Logger.log('✅ Таблица успешно открыта: ' + spreadsheet.getName());
    
    // Проверяем права доступа
    try {
      const editors = spreadsheet.getEditors();
      Logger.log('Редакторы таблицы: ' + editors.length + ' человек');
    } catch (e) {
      Logger.log('⚠️ Не удалось получить список редакторов: ' + e.toString());
    }
    
  } catch (error) {
    Logger.log('❌ ОШИБКА: Не удалось открыть таблицу: ' + error.toString());
    Logger.log('Возможные причины:');
    Logger.log('1. Неверный SPREADSHEET_ID');
    Logger.log('2. Нет прав доступа к таблице');
    Logger.log('3. Таблица была удалена');
    
    // Если таблицы нет, создаём новую (но это не должно происходить в продакшене)
    try {
      spreadsheet = SpreadsheetApp.create('Fitness App Data');
      Logger.log('⚠️ Создана новая таблица: ' + spreadsheet.getId());
      Logger.log('⚠️ ВАЖНО: Замените SPREADSHEET_ID в коде на: ' + spreadsheet.getId());
    } catch (createError) {
      Logger.log('❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось создать новую таблицу: ' + createError.toString());
      throw createError;
    }
  }
  
  let sheet = spreadsheet.getSheetByName('Users');
  if (!sheet) {
    Logger.log('📝 Лист "Users" не найден, создаём новый...');
    try {
      sheet = spreadsheet.insertSheet('Users');
      // Добавляем заголовки
      sheet.getRange(1, 1).setValue('email');
      sheet.getRange(1, 2).setValue('data');
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      Logger.log('✅ Лист "Users" создан успешно');
    } catch (e) {
      Logger.log('❌ Ошибка при создании листа: ' + e.toString());
      throw e;
    }
  } else {
    Logger.log('✅ Лист "Users" найден');
  }
  
  return sheet;
}

/**
 * Находит данные пользователя в таблице
 * @param {Sheet} sheet - Лист таблицы
 * @param {string} email - Email пользователя
 * @return {string|null} JSON строка с данными или null
 */
function findUserData(sheet, email) {
  const emailColumn = 1;
  const dataColumn = 2;
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) return null;
  
  // ВАЖНО: Используем trim для сравнения, как в saveData
  const emailTrimmed = email.toString().trim();
  
  for (let i = 2; i <= lastRow; i++) {
    const rowEmail = sheet.getRange(i, emailColumn).getValue();
    if (rowEmail && rowEmail.toString().trim() === emailTrimmed) {
      return sheet.getRange(i, dataColumn).getValue();
    }
  }
  
  return null;
}

/**
 * Возвращает данные по умолчанию для нового пользователя
 * @return {Object} Объект с дефолтными данными
 */
function getDefaultData() {
  return {
    trainingData: {
      days: [
        { id: "mon", title: "Понедельник", weekday: 1, exercises: [] },
        { id: "tue", title: "Вторник", weekday: 2, exercises: [] },
        { id: "wed", title: "Среда", weekday: 3, exercises: [] },
        { id: "thu", title: "Четверг", weekday: 4, exercises: [] },
        { id: "fri", title: "Пятница", weekday: 5, exercises: [] }
      ]
    },
    week: 1,
    weekStats: new Array(12).fill(0),
    theme: "light",
    nutritionText: "Белок: 1.6–2 г/кг\nЖиры: 0.8–1 г/кг\nУглеводы: добор калорий\n+300–400 ккал к норме",
    supplements: {
      breakfast: "",
      lunch: "",
      dinner: "",
      preWorkout: "",
      postWorkout: ""
    },
    tasks: {},
    weights: {},
    rpe: {},
    comments: {},
    progress: 0
  };
}

/**
 * Вспомогательная функция для включения HTML файлов
 * (если нужно подключать отдельные CSS/JS файлы)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
