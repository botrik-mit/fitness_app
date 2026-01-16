/* ==========================================
   КОНФИГУРАЦИЯ SUPABASE
========================================== */
const SUPABASE_URL = 'https://ifzksmsmahbleakswryr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmemtzbXNtYWhibGVha3N3cnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjM0NzksImV4cCI6MjA4NDEzOTQ3OX0.Kxk6bozJPG35nbSFC6Z2rM7JLQ107M2g6eHdQXFcAAQ';

// Инициализация Supabase клиента
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   АУТЕНТИФИКАЦИЯ
========================================== */
let userEmail = null;

// Проверка наличия сохраненного email
function checkAuth() {
  userEmail = localStorage.getItem('userEmail');
  
  if (userEmail) {
    showApp();
  } else {
    showAuth();
  }
}

function showAuth() {
  document.getElementById('authScreen').style.display = 'block';
  document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  
  // Загружаем данные после показа приложения
  loadFromServer();
}

document.getElementById('loginBtn').onclick = function() {
  const email = prompt('Придумайте свой уникальный логин:');
  
  if (email && email.trim()) {
    userEmail = email.trim();
    localStorage.setItem('userEmail', userEmail);
    showApp();
  } else if (email !== null) {
    alert('⚠️ Логин не может быть пустым. Попробуйте снова.');
  }
};

/* ==========================================
   API - РАБОТА С GOOGLE APPS SCRIPT
========================================== */
let appData = {};
let isDataLoaded = false;
let saveTimeout = null;

async function loadFromServer() {
  console.log('🔍 Загрузка данных из Supabase...');
  console.log('User Email:', userEmail);
  
  if (!userEmail) {
    console.error('❌ ОШИБКА: Email не определен');
    showAuth();
    return;
  }
  
  try {
    // Загружаем данные из Supabase
    const { data, error } = await supabaseClient
      .from('user_data')
      .select('data')
      .eq('email', userEmail)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Ошибка Supabase:', error);
      throw error;
    }
    
    if (data && data.data) {
      console.log('✅ Данные успешно загружены из Supabase');
      appData = data.data;
    } else {
      console.log('📝 Новый пользователь - используем дефолтные данные');
      appData = getDefaultData();
    }
    
    isDataLoaded = true;
    applyLoadedData();
    
  } catch (error) {
    console.error('❌ Ошибка загрузки данных:', error);
    appData = getDefaultData();
    isDataLoaded = true;
    applyLoadedData();
  }
}

async function saveToServer() {
  if (!isDataLoaded) {
    console.warn('⚠️ Данные еще не загружены, пропускаем сохранение');
    return;
  }
  
  if (!userEmail) {
    console.error('❌ Email не определен для сохранения');
    return;
  }
  
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async function() {
    console.log('💾 Сохранение данных в Supabase...');
    
    try {
      // Пробуем обновить существующую запись
      const { data: existingData, error: selectError } = await supabaseClient
        .from('user_data')
        .select('id')
        .eq('email', userEmail)
        .single();
      
      let result;
      
      if (existingData) {
        // Обновляем существующую запись
        result = await supabaseClient
          .from('user_data')
          .update({ 
            data: appData,
            updated_at: new Date().toISOString()
          })
          .eq('email', userEmail);
      } else {
        // Создаем новую запись
        result = await supabaseClient
          .from('user_data')
          .insert([{ 
            email: userEmail, 
            data: appData 
          }]);
      }
      
      if (result.error) {
        console.error('❌ Ошибка сохранения:', result.error);
      } else {
        console.log('✅ Данные успешно сохранены в Supabase');
      }
      
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
    }
  }, 500);
}

async function saveToServerImmediately() {
  if (!isDataLoaded || !userEmail) return;
  
  clearTimeout(saveTimeout);
  
  try {
    console.log('💾 Немедленное сохранение данных в Supabase...');
    
    // Пробуем обновить существующую запись
    const { data: existingData, error: selectError } = await supabaseClient
      .from('user_data')
      .select('id')
      .eq('email', userEmail)
      .single();
    
    let result;
    
    if (existingData) {
      // Обновляем существующую запись
      result = await supabaseClient
        .from('user_data')
        .update({ 
          data: appData,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);
    } else {
      // Создаем новую запись
      result = await supabaseClient
        .from('user_data')
        .insert([{ 
          email: userEmail, 
          data: appData 
        }]);
    }
    
    if (result.error) {
      console.error('❌ Ошибка сохранения:', result.error);
    } else {
      console.log('✅ Данные успешно сохранены в Supabase');
    }
    
  } catch (error) {
    console.error('❌ Ошибка сохранения:', error);
  }
}

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

/* ==========================================
   ВЕСЬ ОСТАЛЬНОЙ КОД ИЗ ОРИГИНАЛЬНОГО index.html
   (копируем из тега <script> без изменений)
========================================== */

// ==========================================
// СИНХРОНИЗАЦИЯ DOM → trainingData
// ==========================================
function syncDOMToTrainingData() {
  if (!week) return;
  
  document.querySelectorAll('.weight-input').forEach(input => {
    const id = input.dataset.id;
    const value = input.value.trim();
    if (id) {
      const key = `weight_w${week}_${id}`;
      if (value !== '') {
        appData.weights[key] = value;
      } else {
        delete appData.weights[key];
      }
    }
  });
  
  document.querySelectorAll('.rpe-select').forEach(select => {
    const id = select.dataset.id;
    if (id) {
      const key = `rpe_w${week}_${id}`;
      if (select.value) {
        appData.rpe[key] = select.value;
      } else {
        delete appData.rpe[key];
      }
    }
  });
  
  document.querySelectorAll('.task').forEach(checkbox => {
    const id = checkbox.dataset.id;
    if (id) {
      const key = `task_${id}`;
      appData.tasks[key] = checkbox.checked;
    }
  });
}

// ==========================================
// ЖЁСТКИЙ afterDataChange() - ЕДИНАЯ ТОЧКА ОБНОВЛЕНИЯ
// ==========================================
function afterDataChange() {
  syncDOMToTrainingData();
  
  appData.trainingData = trainingData;
  appData.week = week;
  appData.weekStats = weekStats;
  
  saveToServer();
  
  updateAllUI();
}

// ==========================================
// ЕДИНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ UI
// ==========================================
function updateAllUI() {
  if (!trainingData) return;
  
  updateProgress();
  updateStats();
  updateNextWeekButton();
}

function updateNextWeekButton() {
  const btn = document.querySelector('.next-week-btn');
  if (!btn) return;
  
  if (!week || week >= 12 || !trainingData) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

function applyLoadedData() {
  if (appData.theme === "dark") {
    document.body.classList.add("dark");
  }
  
  if (!appData.trainingData || !appData.trainingData.days || appData.trainingData.days.length === 0) {
    appData.trainingData = getDefaultData().trainingData;
  }
  if (!appData.week) appData.week = 1;
  if (!appData.weekStats || !Array.isArray(appData.weekStats)) {
    appData.weekStats = new Array(12).fill(0);
  }
  if (!appData.supplements) appData.supplements = getDefaultData().supplements;
  if (!appData.tasks) appData.tasks = {};
  if (!appData.weights) appData.weights = {};
  if (!appData.rpe) appData.rpe = {};
  if (!appData.comments) appData.comments = {};
  if (appData.progress === undefined || appData.progress === null) {
    appData.progress = 0;
  }
  
  trainingData = appData.trainingData;
  week = appData.week;
  weekStats = appData.weekStats;
  
  if (trainingData.days.length && !selectedDayId) {
    selectedDayId = trainingData.days[0].id;
  }
  
  if (appData.nutritionText) {
    nutritionData = appData.nutritionText;
    nutritionText.value = nutritionData;
    nutritionView.textContent = nutritionData;
  }
  
  loadSupplements();
  
  renderDaysEditor();
  renderDaySelector();
  renderExerciseEditor();
  renderTrainingPlan();
  renderSupplements();
  loadWeightsForCurrentWeek();
  
  updateAllUI();
}

/* ==========================================
   ТЕМА
========================================== */
function toggleTheme(){
  document.body.classList.toggle("dark");
  appData.theme = document.body.classList.contains("dark") ? "dark" : "light";
  saveToServer();
}

/* ==========================================
   ПЕРЕКЛЮЧЕНИЕ СТРАНИЦ
========================================== */
function showPage(id){
  syncDOMToTrainingData();
  
  todayOnly = false;
  document.querySelectorAll(".container").forEach(c=>c.style.display="none");
  document.getElementById(id).style.display="block";
  
  if (id === "training") {
    renderDaysEditor();
    renderDaySelector();
    renderExerciseEditor();
    renderTrainingPlan();
    loadWeightsForCurrentWeek();
    updateAllUI();
  }
  if (id === 'stats') {
    updateStats();
    initStatsWeekSelector();
    renderWeekStats(week);
    showStatsMode('week');
  }
  if (id === 'supplements') {
    renderSupplements();
  }
  
  const supplementSections = [
    { key: 'breakfast', textId: 'supplementBreakfastText', viewId: 'supplementBreakfastView' },
    { key: 'lunch', textId: 'supplementLunchText', viewId: 'supplementLunchView' },
    { key: 'dinner', textId: 'supplementDinnerText', viewId: 'supplementDinnerView' },
    { key: 'preWorkout', textId: 'supplementPreWorkoutText', viewId: 'supplementPreWorkoutView' },
    { key: 'postWorkout', textId: 'supplementPostWorkoutText', viewId: 'supplementPostWorkoutView' }
  ];
  
  if (id !== "supplements") {
    supplementSections.forEach(section => {
      const textarea = document.getElementById(section.textId);
      const view = document.getElementById(section.viewId);
      if (textarea) textarea.style.display = "none";
      if (view) view.style.display = "block";
    });
    if (editSupplementsBtn) editSupplementsBtn.textContent = "✏ Редактировать";
  }
  
  if (id !== "nutrition") {
    nutritionText.style.display = "none";
    nutritionView.style.display = "block";
    editNutritionBtn.textContent = "✏ Редактировать";
  }
}

/* ==========================================
   TRAINING DATA — ИНИЦИАЛИЗАЦИЯ
========================================== */
let trainingData = null;
let todayOnly = false;
let todayDayId = null;
let selectedDayId = null;
function saveTrainingData(){
  afterDataChange();
}

/* ===== ДОБАВЛЕНИЕ ДНЯ ТРЕНИРОВКИ ===== */
let editingDayIndex = null;

document.getElementById("addDayBtn").onclick = () => {
  editingDayIndex = null;
  document.getElementById("dayNameInput").value = "";
  document.getElementById("dayWeekdaySelect").value = "1";
  document.getElementById("dayNameInput").focus();
};

function saveDay() {
  if (!trainingData || !trainingData.days) {
    console.error('trainingData не загружен');
    return;
  }
  
  const title = document.getElementById("dayNameInput").value.trim();
  if (!title) {
    alert("Введите название дня");
    return;
  }

  const weekday = Number(document.getElementById("dayWeekdaySelect").value);
  
  if (editingDayIndex === null) {
    trainingData.days.push({
      id: "day_" + Date.now(),
      title,
      weekday,
      exercises: []
    });
  } else {
    trainingData.days[editingDayIndex].title = title;
    trainingData.days[editingDayIndex].weekday = weekday;
  }

  afterDataChange();
  
  document.getElementById("dayNameInput").value = "";
  document.getElementById("dayWeekdaySelect").value = "1";
  editingDayIndex = null;

  renderDaysEditor();  
  renderDaySelector();
  renderExerciseEditor();
  renderTrainingPlan();
}

document.getElementById("saveDayBtn").onclick = saveDay;

document.getElementById("dayNameInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveDay();
  }
});
document.getElementById("dayWeekdaySelect").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveDay();
  }
});

document.getElementById("cancelDayBtn").onclick = () => {
  document.getElementById("dayNameInput").value = "";
  document.getElementById("dayWeekdaySelect").value = "1";
  editingDayIndex = null;
};

/* ==========================================
   РЕДАКТОР УПРАЖНЕНИЙ
========================================== */

function renderExerciseEditor() {
  const ul = document.getElementById("exerciseEditorList");
  ul.innerHTML = "";

  if (!trainingData || !trainingData.days || !trainingData.days.length) return;

  if (!trainingData.days.find(d => d.id === selectedDayId)) {
    selectedDayId = trainingData.days[0].id;
  }

  const day = trainingData.days.find(d => d.id === selectedDayId);
  if (!day) return;

  day.exercises.forEach((ex, i) => {
    const li = document.createElement("li");
    li.className = "exercise-editor-item";
    li.innerHTML = `
      <span style="font-weight:500; font-size:0.9em;">${ex.name} — ${ex.sets}×${ex.reps} ${ex.hasWeight ? "⚖" : ""}</span>
      <div>
        <button class="edit-btn" onclick="editTrainingExercise('${selectedDayId}',${i})">✏</button>
        <button class="del-btn" onclick="deleteTrainingExercise('${selectedDayId}',${i})">🗑</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

let editingExerciseIndex = null;

document.getElementById("addExerciseBtn").onclick = () => {
  editingExerciseIndex = null;
  document.getElementById("exerciseNameInput").value = "";
  document.getElementById("exerciseSetsInput").value = "";
  document.getElementById("exerciseRepsInput").value = "";
  document.getElementById("exerciseHasWeightInput").checked = false;
  document.getElementById("exerciseNameInput").focus();
};

function saveExercise() {
  if (!trainingData || !trainingData.days) {
    console.error('trainingData не загружен');
    return;
  }
  
  const name = document.getElementById("exerciseNameInput").value.trim();
  if (!name) {
    alert("Введите название упражнения");
    return;
  }

  const sets = document.getElementById("exerciseSetsInput").value.trim();
  if (!sets) {
    alert("Введите количество подходов");
    return;
  }

  const reps = document.getElementById("exerciseRepsInput").value.trim();
  if (!reps) {
    alert("Введите количество повторений");
    return;
  }

  const hasWeight = document.getElementById("exerciseHasWeightInput").checked;

  const day = trainingData.days.find(d => d.id === selectedDayId);
  if (!day) return;

  if (editingExerciseIndex === null) {
    day.exercises.push({
      id: Date.now(),
      name, sets, reps, hasWeight
    });
  } else {
    const ex = day.exercises[editingExerciseIndex];
    day.exercises[editingExerciseIndex] = { ...ex, name, sets, reps, hasWeight };
  }

  afterDataChange();
  
  document.getElementById("exerciseNameInput").value = "";
  document.getElementById("exerciseSetsInput").value = "";
  document.getElementById("exerciseRepsInput").value = "";
  document.getElementById("exerciseHasWeightInput").checked = false;
  editingExerciseIndex = null;

  renderExerciseEditor();
  renderTrainingPlan();
  
  if (todayOnly && selectedDayId) {
    renderDaySelector();
  }
}

document.getElementById("saveExerciseBtn").onclick = saveExercise;

document.getElementById("exerciseNameInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("exerciseSetsInput").focus();
  }
});
document.getElementById("exerciseSetsInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("exerciseRepsInput").focus();
  }
});
document.getElementById("exerciseRepsInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    saveExercise();
  }
});

document.getElementById("cancelExerciseBtn").onclick = () => {
  document.getElementById("exerciseNameInput").value = "";
  document.getElementById("exerciseSetsInput").value = "";
  document.getElementById("exerciseRepsInput").value = "";
  document.getElementById("exerciseHasWeightInput").checked = false;
  editingExerciseIndex = null;
};

function editTrainingExercise(dayId, i){
  if (!trainingData || !trainingData.days) return;
  
  const day = trainingData.days.find(d => d.id === dayId);
  if (!day) return;
  
  const ex = day.exercises[i];
  if (!ex) return;

  editingExerciseIndex = i;
  selectedDayId = dayId;
  
  document.getElementById("exerciseNameInput").value = ex.name || "";
  document.getElementById("exerciseSetsInput").value = ex.sets || "";
  document.getElementById("exerciseRepsInput").value = ex.reps || "";
  document.getElementById("exerciseHasWeightInput").checked = ex.hasWeight || false;
  
  document.getElementById("exerciseNameInput").focus();
  
  renderDaySelector();
}

function deleteTrainingExercise(day, i){
  if (!trainingData || !trainingData.days) return;
  if(!confirm("Удалить?")) return;
  
  const d = trainingData.days.find(x => x.id === day);
  if (!d) return;
  
  d.exercises.splice(i,1);
  
  afterDataChange();
  
  renderExerciseEditor();
  renderTrainingPlan();
}

/* ==========================================
   ОТРИСОВКА ДИНАМИЧНЫХ ТРЕНИРОВОК
========================================== */
function renderTrainingPlan(){
  if (!trainingData || !trainingData.days) return;
  
  const editor = document.getElementById("trainingEditor");
  if (editor) {
    editor.style.display = todayOnly ? "none" : "block";
  }

  const container = document.getElementById("dynamicTrainingDays");
  container.innerHTML = "";

  const daysToRender = todayOnly
  ? trainingData.days.filter(d => d.id === todayDayId)
  : trainingData.days;

daysToRender.forEach(day => {
    const block = document.createElement("div");
    block.className = "day";
    block.innerHTML = `<h3>${day.title}</h3>`;

    day.exercises.forEach(ex=>{
      const row = document.createElement("div");
      row.className = "exercise-row";

const left = `
  <label>
    <input type="checkbox" class="task" data-id="${ex.id}">
    ${ex.name} — ${ex.sets}×${ex.reps}
  </label>
`;

let right = ``;

if (ex.hasWeight) {
  right += `
    <input type="number" class="weight-input" data-id="${ex.id}" step="0.5" placeholder="кг">
    <span class="last-weight" data-id="${ex.id}"></span>
  `;
}

right += `
  <select class="rpe-select" data-id="${ex.id}">
    <option value="">RPE</option>
    ${[...Array(10)].map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}
  </select>

  <button class="comment-btn" data-id="${ex.id}">
  💬<span class="comment-star">★</span>
</button>
`;

row.innerHTML = `
  <div class="exercise-left">${left}</div>
  <div class="exercise-right">${right}</div>
`;
      block.appendChild(row);
    });

    container.appendChild(block);
  });

  initDynamicCheckboxes();
  loadWeightsForCurrentWeek();
  initWeightInputs();
  initRPE();
  initComments();
}

/* ==========================================
   ЧЕКБОКСЫ
========================================== */
function initDynamicCheckboxes(){
  document.querySelectorAll(".task").forEach(t=>{
    const id = t.dataset.id;
    const key = "task_"+id;
    const saved = appData.tasks[key];
    if(saved === true) t.checked = true;

    t.onchange = ()=>{
      appData.tasks[key] = t.checked;
      afterDataChange();
    };
  });
}

/* ==========================================
   ВЕСА
========================================== */
let week = null;

function saveCurrentWeights() {
  syncDOMToTrainingData();
}

function loadWeightsForCurrentWeek() {
  if (!week) return;
  
  document.querySelectorAll('.weight-input').forEach(input => {
    const id = input.dataset.id;
    const key = `weight_w${week}_${id}`;
    const saved = appData.weights[key];
    input.value = saved || '';

    const span = document.querySelector(`.last-weight[data-id="${id}"]`);
    if (span) {
      const last = appData.weights[`weight_w${week-1}_${id}`] || appData.weights[key];
      span.textContent = last ? last + " кг" : "";
      span.classList.toggle("has-value", !!last);
    }
  });
}

function initWeightInputs() {
  document.querySelectorAll('.weight-input').forEach(input => {
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        syncDOMToTrainingData();
        appData.trainingData = trainingData;
        appData.week = week;
        appData.weekStats = weekStats;
        saveToServer();
        updateAllUI();
      }, 300);
    });

    input.addEventListener('blur', () => {
      syncDOMToTrainingData();
      appData.trainingData = trainingData;
      appData.week = week;
      appData.weekStats = weekStats;
      saveToServer();
      updateAllUI();
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        syncDOMToTrainingData();
        appData.trainingData = trainingData;
        appData.week = week;
        appData.weekStats = weekStats;
        saveToServer();
        updateAllUI();
        input.blur();
      }
    });
  });
}

/* ==========================================
   ПРОГРЕСС
========================================== */
function updateProgress(){
  if (!trainingData) return;
  
  const tasks = document.querySelectorAll(".task");
  const done = [...tasks].filter(t=>t.checked).length;
  const percent = tasks.length ? Math.round(done/tasks.length*100) : 0;
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = percent + '%';
  }
  appData.progress = percent;
}

/* ==========================================
   НЕДЕЛИ
========================================== */
function nextWeek(){
  if (!trainingData || !week || !weekStats) {
    console.error('Данные не загружены');
    return;
  }
  
  if (week >= 12) {
    alert('Достигнут максимум недель (12)');
    return;
  }
  
  syncDOMToTrainingData();
  
  updateStats();

  appData.tasks = {};
  
  week++;
  appData.week = week;
  
  appData.progress = 0;
  
  appData.trainingData = trainingData;
  appData.weekStats = weekStats;
  
  renderTrainingPlan();
  
  updateProgress();
  
  saveToServerImmediately();
}

/* ==========================================
   СТАТИСТИКА
========================================== */
let weekStats = null;

function updateStats(){
  if (!trainingData || !weekStats || !week) return;
  
  const tasks = document.querySelectorAll(".task");
  const done = [...tasks].filter(t => t.checked).length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  weekStats[week - 1] = percent;
  appData.weekStats = weekStats;
}

/* ==========================================
   СУППЛЕМЕНТЫ
========================================== */
const supplementSections = [
  { key: 'breakfast', textId: 'supplementBreakfastText', viewId: 'supplementBreakfastView', default: '' },
  { key: 'lunch', textId: 'supplementLunchText', viewId: 'supplementLunchView', default: '' },
  { key: 'dinner', textId: 'supplementDinnerText', viewId: 'supplementDinnerView', default: '' },
  { key: 'preWorkout', textId: 'supplementPreWorkoutText', viewId: 'supplementPreWorkoutView', default: '' },
  { key: 'postWorkout', textId: 'supplementPostWorkoutText', viewId: 'supplementPostWorkoutView', default: '' }
];

function loadSupplements() {
  supplementSections.forEach(section => {
    const saved = appData.supplements[section.key] || section.default;
    const textarea = document.getElementById(section.textId);
    const view = document.getElementById(section.viewId);
    
    if (textarea) textarea.value = saved;
    if (view) view.textContent = saved;
  });
}

function saveSupplements() {
  supplementSections.forEach(section => {
    const textarea = document.getElementById(section.textId);
    if (textarea) {
      appData.supplements[section.key] = textarea.value;
    }
  });
  saveToServer();
}

function renderSupplements() {
  supplementSections.forEach(section => {
    const saved = appData.supplements[section.key] || section.default;
    const view = document.getElementById(section.viewId);
    if (view) view.textContent = saved;
  });
}

const editSupplementsBtn = document.getElementById("editSupplementsBtn");

editSupplementsBtn.onclick = () => {
  const isEditing = document.getElementById("supplementBreakfastText").style.display === "block";

  if (isEditing) {
    saveSupplements();
    renderSupplements();
    
    supplementSections.forEach(section => {
      const textarea = document.getElementById(section.textId);
      const view = document.getElementById(section.viewId);
      if (textarea) textarea.style.display = "none";
      if (view) view.style.display = "block";
    });
    
    editSupplementsBtn.textContent = "✏ Редактировать";
  } else {
    supplementSections.forEach(section => {
      const textarea = document.getElementById(section.textId);
      const view = document.getElementById(section.viewId);
      if (textarea) textarea.style.display = "block";
      if (view) view.style.display = "none";
    });
    
    editSupplementsBtn.textContent = "💾 Сохранить";
  }
};

/* ==========================================
   ПИТАНИЕ
========================================== */
const nutritionText = document.getElementById("nutritionText");
const nutritionView = document.getElementById("nutritionView");
const editNutritionBtn = document.getElementById("editNutritionBtn");

const defaultNutrition = `Белок: 1.6–2 г/кг
Жиры: 0.8–1 г/кг
Углеводы: добор калорий
+300–400 ккал к норме`;

let nutritionData = defaultNutrition;

editNutritionBtn.onclick = () => {
  const isEditing = nutritionText.style.display === "block";

  if (isEditing) {
    nutritionData = nutritionText.value.trim();
    appData.nutritionText = nutritionData;
    saveToServer();
    nutritionView.textContent = nutritionData;

    nutritionText.style.display = "none";
    nutritionView.style.display = "block";
    editNutritionBtn.textContent = "✏ Редактировать";
  } else {
    nutritionText.style.display = "block";
    nutritionView.style.display = "none";
    editNutritionBtn.textContent = "💾 Сохранить";
  }
};

function initRPE() {
  if (!week) return;
  
  document.querySelectorAll('.rpe-select').forEach(select => {
    const id = select.dataset.id;
    const key = `rpe_w${week}_${id}`;

    const saved = appData.rpe[key];
    if (saved) select.value = saved;

    select.onchange = () => {
      syncDOMToTrainingData();
      appData.trainingData = trainingData;
      appData.week = week;
      appData.weekStats = weekStats;
      saveToServer();
      updateAllUI();
    };
  });
}

function initComments() {
  if (!week) return;
  
  document.querySelectorAll('.comment-btn').forEach(btn => {
    const id = btn.dataset.id;
    const key = `comment_w${week}_${id}`;

    btn.onclick = () => {
      const prev = appData.comments[key] || "";
      const text = prompt("Комментарий к упражнению:", prev);
      if (text === null) return;

      if (text.trim()) {
        appData.comments[key] = text.trim();
        btn.querySelector(".comment-star").style.visibility = "visible";
      } else {
        delete appData.comments[key];
        btn.querySelector(".comment-star").style.visibility = "hidden";
      }
      saveToServer();
    };

    if (appData.comments[key]) {
      btn.querySelector(".comment-star").style.visibility = "visible";
    }
  });
}

function showToday() {
  if (!trainingData || !trainingData.days) {
    console.error('trainingData не загружен');
    return;
  }
  
  syncDOMToTrainingData();
  
  const today = new Date().getDay();
  const day = trainingData.days.find(d => d.weekday === today);

  if (!day) {
    alert("Сегодня день отдыха 💆‍♂️");
    todayOnly = false;
    showPage("training");
    return;
  }

  todayOnly = true;
  todayDayId = day.id;
  selectedDayId = day.id;

  document.querySelectorAll(".container").forEach(c => c.style.display = "none");
  document.getElementById("training").style.display = "block";
  
  renderDaysEditor();
  renderDaySelector();
  renderExerciseEditor();
  renderTrainingPlan();
  loadWeightsForCurrentWeek();
  updateAllUI();
}

function initStatsWeekSelector() {
  const select = document.getElementById("statsWeekSelect");
  select.innerHTML = "";

  for (let w = 1; w <= 12; w++) {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = "Неделя " + w;
    if (w === week) opt.selected = true;
    select.appendChild(opt);
  }

  select.onchange = () => {
    renderWeekStats(+select.value);
  };
}

function renderWeekStats(selectedWeek) {

  const summary = document.getElementById("weekSummary");
  const percent = weekStats[selectedWeek - 1] || 0;

  summary.innerHTML = `
    <div style="
      background: var(--day-bg);
      padding: 14px;
      border-radius: 10px;
      margin: 16px 0;
    ">
      <strong>Неделя ${selectedWeek}</strong><br>
      Выполнение: <b>${percent}%</b>
    </div>
  `;

  renderWeekDiary(selectedWeek);
}

function renderWeekDiary(selectedWeek) {
  const box = document.getElementById("rpeStats");
  box.innerHTML = "";

  trainingData.days.forEach(day => {
    let exercisesHTML = "";
    let hasData = false;

    const avgRPE = getAverageRPEForExercises(day.exercises, selectedWeek);

    day.exercises.forEach(ex => {
      const weight = appData.weights[`weight_w${selectedWeek}_${ex.id}`];
      const rpe = appData.rpe[`rpe_w${selectedWeek}_${ex.id}`];
      const comment = appData.comments[`comment_w${selectedWeek}_${ex.id}`];

      if (!weight && !rpe && !comment) return;

      hasData = true;

      exercisesHTML += `
        <div style="background:var(--card);padding:10px;border-radius:8px;margin-top:8px;">
          <strong>${ex.name}</strong><br>
          ${weight ? `Вес: <b>${weight} кг</b><br>` : ""}
          ${rpe ? `RPE: <b class="${getRPEClass(rpe)}">${rpe}</b><br>` : ""}
          ${comment ? `💬 ${comment}` : ""}
        </div>
      `;
    });

    box.innerHTML += `
      <div style="background:var(--day-bg);padding:12px;border-radius:10px;margin-bottom:14px;">
        <strong>${day.title}</strong>
        ${avgRPE ? `<span class="${getRPEClass(avgRPE)}"> · ср. RPE: <b>${avgRPE}</b></span>` : ""}
        ${hasData ? exercisesHTML : `<div style="opacity:.6;margin-top:6px;">Нет данных</div>`}
      </div>
    `;
  });
}
function getAverageRPEForExercises(exercises, week) {
  let sum = 0;
  let count = 0;

  exercises.forEach(ex => {
    const rpe = appData.rpe[`rpe_w${week}_${ex.id}`];
    if (rpe) {
      sum += Number(rpe);
      count++;
    }
  });

  return count ? (sum / count).toFixed(1) : null;
}
function getRPEClass(rpe) {
  const val = Number(rpe);
  if (val <= 7) return "rpe-low";
  if (val <= 8) return "rpe-mid";
  return "rpe-high";
}
function resetAllStats() {
  if (!confirm("Сбросить ВСЮ статистику, веса, RPE, комментарии и пройденные упражнения?")) return;

  weekStats = new Array(12).fill(0);
  appData.weekStats = weekStats;
  
  week = 1;
  appData.week = 1;
  
  appData.weights = {};
  appData.rpe = {};
  appData.comments = {};
  appData.tasks = {};
  appData.progress = 0;
  
  appData.trainingData = trainingData;
  
  renderTrainingPlan();
  
  updateProgress();
  updateStats();
  
  initStatsWeekSelector();
  
  renderWeekStats(1);
  
  const totalStats = document.getElementById("totalStats");
  if (totalStats && totalStats.style.display !== "none") {
    renderTotalStats();
  }
  
  saveToServerImmediately();
}
function showStatsMode(mode) {
  const weekSelect = document.getElementById("statsWeekSelect");
  const weekSummary = document.getElementById("weekSummary");
  const totalStats = document.getElementById("totalStats");

  document.getElementById("weekStatsBtn").style.opacity = mode === "week" ? "1" : ".5";
  document.getElementById("totalStatsBtn").style.opacity = mode === "total" ? "1" : ".5";
document.querySelector("#stats h3").style.display =
  mode === "week" ? "block" : "none";
  if (mode === "week") {
    weekSelect.style.display = "inline-block";
    weekSummary.style.display = "block";
    document.getElementById("rpeStats").style.display = "block";
    totalStats.style.display = "none";

    renderWeekStats(+weekSelect.value);
  } else {
    weekSelect.style.display = "none";
    weekSummary.style.display = "none";
    document.getElementById("rpeStats").style.display = "none";
    totalStats.style.display = "block";

    renderTotalStats();
  }
}
function renderTotalStats() {
  const box = document.getElementById("totalStats");
  box.innerHTML = "";

  const completedWeeks = weekStats.filter(v => v > 0);
  const avgCompletion = completedWeeks.length
    ? Math.round(completedWeeks.reduce((a,b)=>a+b,0) / completedWeeks.length)
    : 0;

  let totalRPE = 0;
  let rpeCount = 0;
  let rpeByWeek = [];

  let totalExercises = 0;
  let exercisesWithWeight = 0;
  let weightProgress = [];

  trainingData.days.forEach(day => {
    day.exercises.forEach(ex => {
      let weekRPE = [];
      let hasAnyData = false;

      for (let w = 1; w <= 12; w++) {
        const rpe = appData.rpe[`rpe_w${w}_${ex.id}`];
        const weight = appData.weights[`weight_w${w}_${ex.id}`];

        if (rpe) {
          totalRPE += Number(rpe);
          rpeCount++;
          weekRPE.push(Number(rpe));
        }

        if (weight) {
          exercisesWithWeight++;
          hasAnyData = true;
          if (ex.hasWeight) {
            const weightNum = parseFloat(weight);
            if (!weightProgress[ex.id]) weightProgress[ex.id] = [];
            weightProgress[ex.id].push({ week: w, weight: weightNum });
          }
        }
      }

      if (hasAnyData) {
        totalExercises++;
      }

      if (weekRPE.length > 0) {
        rpeByWeek.push(weekRPE);
      }
    });
  });

  const avgRPE = rpeCount ? (totalRPE / rpeCount).toFixed(1) : "—";

  let progressChart = "";
  const maxPercent = Math.max(...weekStats, 1);
  weekStats.forEach((percent, index) => {
    const height = maxPercent > 0 ? (percent / maxPercent * 100) : 0;
    const color = percent >= 80 ? "#2ecc71" : percent >= 50 ? "#f1c40f" : "#e74c3c";
    progressChart += `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="width:30px;height:80px;background:#ddd;border-radius:4px;position:relative;overflow:hidden;">
          <div style="position:absolute;bottom:0;width:100%;height:${height}%;background:${color};border-radius:4px;"></div>
        </div>
        <span style="font-size:0.75em;">${index + 1}</span>
      </div>
    `;
  });

  let trend = "";
  if (completedWeeks.length >= 2) {
    const recent = weekStats.slice(-3).filter(v => v > 0);
    const earlier = weekStats.slice(-6, -3).filter(v => v > 0);
    if (recent.length && earlier.length) {
      const recentAvg = recent.reduce((a,b)=>a+b,0) / recent.length;
      const earlierAvg = earlier.reduce((a,b)=>a+b,0) / earlier.length;
      if (recentAvg > earlierAvg + 5) trend = "📈 Улучшение";
      else if (recentAvg < earlierAvg - 5) trend = "📉 Снижение";
      else trend = "➡️ Стабильно";
    }
  }

  box.innerHTML = `
    <div style="
      background: var(--day-bg);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
    ">
      <h3>📊 Общая статистика</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:12px 0;">
        <div>
          <div style="font-size:0.9em;color:#888;margin-bottom:4px;">Завершённых недель</div>
          <div style="font-size:1.5em;font-weight:bold;">${completedWeeks.length} / 12</div>
        </div>
        <div>
          <div style="font-size:0.9em;color:#888;margin-bottom:4px;">Среднее выполнение</div>
          <div style="font-size:1.5em;font-weight:bold;">${avgCompletion}%</div>
        </div>
        <div>
          <div style="font-size:0.9em;color:#888;margin-bottom:4px;">Средний RPE</div>
          <div style="font-size:1.5em;font-weight:bold;">${avgRPE}</div>
        </div>
        <div>
          <div style="font-size:0.9em;color:#888;margin-bottom:4px;">Выполнено упражнений</div>
          <div style="font-size:1.5em;font-weight:bold;">${totalExercises}</div>
        </div>
      </div>
      ${trend ? `<div style="margin:12px 0;padding:8px;background:var(--card);border-radius:6px;text-align:center;"><b>${trend}</b></div>` : ""}
    </div>

    <div style="
      background: var(--day-bg);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
    ">
      <h3>📈 Прогресс по неделям</h3>
      <div style="display:flex;gap:8px;justify-content:center;align-items:flex-end;margin:16px 0;min-height:120px;">
        ${progressChart || "<div style='opacity:0.6;'>Нет данных</div>"}
      </div>
    </div>
  `;
}

function renderDaySelector() {
  const box = document.getElementById("daySelector");
  box.innerHTML = "";

  if (!trainingData || !trainingData.days) return;

  trainingData.days.forEach(day => {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.textContent = day.title;
    btn.classList.toggle("active", day.id === selectedDayId);

    btn.addEventListener('click', () => {
      syncDOMToTrainingData();
      
      todayOnly = false;
      selectedDayId = day.id;
      renderDaySelector();
      renderExerciseEditor();
      renderTrainingPlan();
    });

    box.appendChild(btn);
  });
}
function renderDaysEditor() {
  const ul = document.getElementById("daysEditor");
  ul.innerHTML = "";

  if (!trainingData || !trainingData.days) return;

  trainingData.days.forEach((day, i) => {
    const li = document.createElement("li");
    li.className = "editable-item";
    li.innerHTML = `
      <span style="font-weight:500; font-size:0.95em;">${day.title}</span>
      <div>
        <button onclick="moveDay(${i}, -1)" title="Вверх">↑</button>
        <button onclick="moveDay(${i}, 1)" title="Вниз">↓</button>
        <button class="edit-btn" onclick="editDay(${i})" title="Редактировать">✏</button>
        <button class="del-btn" onclick="deleteDay(${i})" title="Удалить">🗑</button>
      </div>
    `;

    ul.appendChild(li);
  });
}
function moveDay(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= trainingData.days.length) return;

  const tmp = trainingData.days[index];
  trainingData.days[index] = trainingData.days[newIndex];
  trainingData.days[newIndex] = tmp;

  saveTrainingData();
  renderDaysEditor();
  renderDaySelector();
  renderTrainingPlan();
}

function editDay(index) {
  if (!trainingData || !trainingData.days) return;
  
  const day = trainingData.days[index];
  if (!day) return;

  editingDayIndex = index;
  document.getElementById("dayNameInput").value = day.title || "";
  document.getElementById("dayWeekdaySelect").value = day.weekday || "1";
  document.getElementById("dayNameInput").focus();
}

function deleteDay(index) {
  if (!trainingData || !trainingData.days) return;
  if (!confirm("Удалить день и все упражнения?")) return;

  trainingData.days.splice(index, 1);
  selectedDayId = trainingData.days[0]?.id || null;

  afterDataChange();
  
  renderDaysEditor();
  renderDaySelector();
  renderTrainingPlan();
}

/* ==========================================
   ИНИЦИАЛИЗАЦИЯ
========================================== */
checkAuth();
