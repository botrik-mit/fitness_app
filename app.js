/* ==========================================
   КОНФИГУРАЦИЯ SUPABASE
========================================== */
const SUPABASE_URL = 'https://ifzksmsmahbleakswryr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmemtzbXNtYWhibGVha3N3cnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NjM0NzksImV4cCI6MjA4NDEzOTQ3OX0.Kxk6bozJPG35nbSFC6Z2rM7JLQ107M2g6eHdQXFcAAQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   АУТЕНТИФИКАЦИЯ
========================================== */
let userEmail = null;

function checkAuth() {
  userEmail = localStorage.getItem('userEmail');
  if (userEmail) showApp();
  else showAuth();
}

function showAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';
  loadFromServer();
}

function logout() {
  if (confirm('Выйти из аккаунта?')) {
    localStorage.removeItem('userEmail');
    window.location.reload();
  }
}

document.getElementById('loginBtn').onclick = () => {
  const email = prompt('Придумайте логин:');
  if (email?.trim()) {
    userEmail = email.trim();
    localStorage.setItem('userEmail', userEmail);
    showApp();
  }
};

/* ==========================================
   ДАННЫЕ И API
========================================== */
let appData = {};
let isDataLoaded = false;
let saveTimeout = null;

async function loadFromServer() {
  try {
    const { data, error } = await supabaseClient.from('user_data').select('data').eq('email', userEmail).single();
    if (data?.data) appData = data.data;
    else appData = getDefaultData();
    isDataLoaded = true;
    applyLoadedData();
  } catch (e) {
    appData = getDefaultData();
    isDataLoaded = true;
    applyLoadedData();
  }
}

function saveToServer() {
  if (!isDataLoaded || !userEmail) return;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const { data } = await supabaseClient.from('user_data').select('id').eq('email', userEmail).single();
      if (data) await supabaseClient.from('user_data').update({ data: appData, updated_at: new Date().toISOString() }).eq('email', userEmail);
      else await supabaseClient.from('user_data').insert([{ email: userEmail, data: appData }]);
    } catch (e) {}
  }, 1000);
}

function getDefaultData() {
  return {
    trainingData: {
      days: [
        { id: "mon", title: "Понедельник", weekday: 1, exercises: [] },
        { id: "wed", title: "Среда", weekday: 3, exercises: [] },
        { id: "fri", title: "Пятница", weekday: 5, exercises: [] }
      ]
    },
    week: 1,
    weekStats: new Array(12).fill(0),
    theme: "light",
    nutritionText: "Белок: 1.6-2г/кг\nЖиры: 0.8-1г/кг",
    supplements: { breakfast: "", lunch: "", dinner: "", preWorkout: "", postWorkout: "" },
    tasks: {}, weights: {}, rpe: {}, comments: {}
  };
}

/* ==========================================
   РЕНДЕРИНГ UI
========================================== */
let trainingData, week, weekStats, selectedDayId;

function applyLoadedData() {
  if (appData.theme === "dark") document.body.classList.add("dark");
  trainingData = appData.trainingData;
  week = appData.week || 1;
  weekStats = appData.weekStats || new Array(12).fill(0);
  if (trainingData.days.length && !selectedDayId) selectedDayId = trainingData.days[0].id;

  document.getElementById("nutritionText").value = appData.nutritionText || "";
  document.getElementById("nutritionView").textContent = appData.nutritionText || "";

  renderAll();
}

function renderAll() {
  renderDaysEditor();
  renderDaySelector();
  renderExerciseEditor();
  renderTrainingPlan();
  renderSupplements();
  updateProgress();
  updateNextWeekButton();
}

function renderTrainingPlan() {
  const container = document.getElementById("dynamicTrainingDays");
  container.innerHTML = "";
  document.getElementById("currentWeekNum").textContent = week;

  trainingData.days.forEach(day => {
    const block = document.createElement("div");
    block.className = "day";
    block.innerHTML = `<h3>${day.title}</h3>`;

    day.exercises.forEach(ex => {
      const row = document.createElement("div");
      row.className = "exercise-row";
      
      const isDone = appData.tasks[`task_${ex.id}`];
      const weight = appData.weights[`weight_w${week}_${ex.id}`] || "";
      const currentRpe = appData.rpe[`rpe_w${week}_${ex.id}`] || "";

      row.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <label class="exercise-header" style="margin-bottom: 0; flex: 1;">
            <input type="checkbox" class="task" data-id="${ex.id}" ${isDone ? 'checked' : ''} onchange="toggleTask('${ex.id}', this.checked)">
            <div class="exercise-title">${ex.name} — ${ex.sets}×${ex.reps}</div>
          </label>
          <button class="comment-btn" onclick="openComment('${ex.id}')">
            <span>💬</span>
            <span class="comment-star" id="star_${ex.id}" style="visibility: ${appData.comments[`comment_w${week}_${ex.id}`] ? 'visible' : 'hidden'}"></span>
          </button>
        </div>
        <div class="exercise-controls">
          ${ex.hasWeight ? `
            <div class="input-group">
              <input type="number" step="0.5" placeholder="0" value="${weight}" oninput="updateWeight('${ex.id}', this.value)">
              <span>кг</span>
            </div>
          ` : ''}
          <div style="flex: 1; max-width: 100px;">
            <select class="rpe-select" onchange="updateRpe('${ex.id}', this.value)" style="width: 100%;">
              <option value="">RPE</option>
              ${[6,7,8,9,10].map(v => `<option value="${v}" ${currentRpe == v ? 'selected' : ''}>${v}</option>`).join("")}
            </select>
          </div>
        </div>
      `;
      block.appendChild(row);
    });
    container.appendChild(block);
  });
}

/* ==========================================
   ФУНКЦИИ ВЗАИМОДЕЙСТВИЯ
========================================== */
function toggleTask(id, val) {
  appData.tasks[`task_${id}`] = val;
  updateProgress();
  saveToServer();
}

function updateWeight(id, val) {
  appData.weights[`weight_w${week}_${id}`] = val;
  saveToServer();
}

function updateRpe(id, val) {
  appData.rpe[`rpe_w${week}_${id}`] = val;
  saveToServer();
}

function openComment(id) {
  const key = `comment_w${week}_${id}`;
  const text = prompt("Заметка:", appData.comments[key] || "");
  if (text !== null) {
    if (text.trim()) appData.comments[key] = text.trim();
    else delete appData.comments[key];
    document.getElementById(`star_${id}`).style.visibility = appData.comments[key] ? 'visible' : 'hidden';
    saveToServer();
  }
}

function updateProgress() {
  const tasks = document.querySelectorAll(".task");
  const done = [...tasks].filter(t => t.checked).length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  document.getElementById('progressBar').style.width = percent + '%';
}

function nextWeek() {
  if (week < 12 && confirm(`Завершить неделю ${week} и перейти к следующей?`)) {
    appData.weekStats[week - 1] = parseInt(document.getElementById('progressBar').style.width);
    appData.tasks = {};
    appData.week++;
    appData.progress = 0;
    applyLoadedData();
    saveToServer();
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  appData.theme = document.body.classList.contains("dark") ? "dark" : "light";
  saveToServer();
}

function showPage(id) {
  document.querySelectorAll(".container").forEach(c => c.style.display = "none");
  document.getElementById(id).style.display = "block";
  document.querySelectorAll("#mainNav button").forEach(btn => {
    btn.classList.remove("active");
    if (btn.classList.contains(`nav-${id === 'supplements' ? 'supps' : id}`)) btn.classList.add("active");
  });
}

function showToday() {
  const today = new Date().getDay();
  const day = trainingData.days.find(d => d.weekday === today);
  if (!day) alert("Сегодня день отдыха! 🧘‍♂️");
  else {
    selectedDayId = day.id;
    showPage('training');
    renderAll();
  }
}

/* ==========================================
   РЕДАКТИРОВАНИЕ ПЛАНА
========================================== */
function renderDaysEditor() {
  const ul = document.getElementById("daysEditor");
  ul.innerHTML = "";
  trainingData.days.forEach((day, i) => {
    const li = document.createElement("li");
    li.className = "editable-item";
    li.innerHTML = `
      <strong>${day.title}</strong>
      <div>
        <button class="btn" style="padding:4px 8px;" onclick="moveDay(${i}, -1)">↑</button>
        <button class="btn" style="padding:4px 8px;" onclick="moveDay(${i}, 1)">↓</button>
        <button class="btn" style="padding:4px 8px;" onclick="editDay(${i})">✏</button>
        <button class="btn btn-danger" style="padding:4px 8px;" onclick="deleteDay(${i})">🗑</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function renderDaySelector() {
  const box = document.getElementById("daySelector");
  box.innerHTML = "";
  trainingData.days.forEach(day => {
    const btn = document.createElement("button");
    btn.className = day.id === selectedDayId ? "btn btn-primary" : "btn btn-secondary";
    btn.textContent = day.title;
    btn.onclick = () => { selectedDayId = day.id; renderAll(); };
    box.appendChild(btn);
  });
}

function renderExerciseEditor() {
  const ul = document.getElementById("exerciseEditorList");
  ul.innerHTML = "";
  const day = trainingData.days.find(d => d.id === selectedDayId);
  if (!day) return;
  day.exercises.forEach((ex, i) => {
    const li = document.createElement("li");
    li.className = "editable-item";
    li.innerHTML = `
      <div><b>${ex.name}</b> <small>${ex.sets}×${ex.reps}</small></div>
      <div>
        <button class="btn" style="padding:4px 8px;" onclick="editEx(${i})">✏</button>
        <button class="btn btn-danger" style="padding:4px 8px;" onclick="deleteEx(${i})">🗑</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

let editingDayIdx = null;
function editDay(idx) {
  editingDayIdx = idx;
  const day = trainingData.days[idx];
  document.getElementById("dayNameInput").value = day.title;
  document.getElementById("dayWeekdaySelect").value = day.weekday;
  document.getElementById("dayEditForm").classList.add("active");
}

let editingExIdx = null;
function editEx(idx) {
  editingExIdx = idx;
  const day = trainingData.days.find(d => d.id === selectedDayId);
  const ex = day.exercises[idx];
  document.getElementById("exerciseNameInput").value = ex.name;
  document.getElementById("exerciseSetsInput").value = ex.sets;
  document.getElementById("exerciseRepsInput").value = ex.reps;
  document.getElementById("exerciseHasWeightInput").checked = ex.hasWeight;
  document.getElementById("exerciseEditForm").classList.add("active");
}

document.getElementById("addDayBtn").onclick = () => { editingDayIdx = null; document.getElementById("dayEditForm").classList.toggle("active"); };
document.getElementById("addExerciseBtn").onclick = () => { editingExIdx = null; document.getElementById("exerciseEditForm").classList.toggle("active"); };

document.getElementById("saveDayBtn").onclick = () => {
  const title = document.getElementById("dayNameInput").value;
  const weekday = parseInt(document.getElementById("dayWeekdaySelect").value);
  if (!title) return;
  if (editingDayIdx === null) trainingData.days.push({ id: "d" + Date.now(), title, weekday, exercises: [] });
  else { trainingData.days[editingDayIdx].title = title; trainingData.days[editingDayIdx].weekday = weekday; }
  document.getElementById("dayEditForm").classList.remove("active");
  renderAll(); saveToServer();
};

document.getElementById("saveExerciseBtn").onclick = () => {
  const name = document.getElementById("exerciseNameInput").value;
  const sets = document.getElementById("exerciseSetsInput").value;
  const reps = document.getElementById("exerciseRepsInput").value;
  const hasWeight = document.getElementById("exerciseHasWeightInput").checked;
  if (!name || !sets) return;
  const day = trainingData.days.find(d => d.id === selectedDayId);
  if (editingExIdx === null) day.exercises.push({ id: "ex" + Date.now(), name, sets, reps, hasWeight });
  else { 
    const id = day.exercises[editingExIdx].id;
    day.exercises[editingExIdx] = { id, name, sets, reps, hasWeight }; 
  }
  document.getElementById("exerciseEditForm").classList.remove("active");
  renderAll(); saveToServer();
};

function deleteDay(idx) { if (confirm("Удалить день?")) { trainingData.days.splice(idx, 1); renderAll(); saveToServer(); } }
function deleteEx(idx) { 
  if (confirm("Удалить упражнение?")) { 
    const day = trainingData.days.find(d => d.id === selectedDayId);
    day.exercises.splice(idx, 1); 
    renderAll(); saveToServer(); 
  } 
}

/* ==========================================
   ПИТАНИЕ И ДОБАВКИ
========================================== */
document.getElementById("editNutritionBtn").onclick = () => {
  const txt = document.getElementById("nutritionText");
  const view = document.getElementById("nutritionView");
  const btn = document.getElementById("editNutritionBtn");
  if (txt.style.display === "none") {
    txt.style.display = "block"; view.style.display = "none"; btn.textContent = "💾 Сохранить";
  } else {
    appData.nutritionText = txt.value;
    txt.style.display = "none"; view.style.display = "block"; view.textContent = txt.value;
    btn.textContent = "✏ Редактировать"; saveToServer();
  }
};

function renderSupplements() {
  const container = document.getElementById("suppsList");
  container.innerHTML = "";
  const names = { breakfast: "🌅 Завтрак", lunch: "🍽 Обед", dinner: "🍴 Ужин", preWorkout: "💪 Предтреник", postWorkout: "🏋️ После" };
  for (let key in names) {
    const div = document.createElement("div");
    div.className = "stat-card";
    div.style.textAlign = "left";
    div.innerHTML = `
      <div style="font-weight:800; margin-bottom:8px;">${names[key]}</div>
      <div id="supp_view_${key}" style="font-size:0.95rem; opacity:0.8; white-space:pre-wrap;">${appData.supplements[key] || "—"}</div>
      <textarea id="supp_edit_${key}" style="display:none; margin-top:10px; height:80px;">${appData.supplements[key] || ""}</textarea>
    `;
    container.appendChild(div);
  }
}

document.getElementById("editSupplementsBtn").onclick = () => {
  const btn = document.getElementById("editSupplementsBtn");
  const isEditing = btn.textContent.includes("Сохранить");
  for (let key in appData.supplements) {
    const view = document.getElementById(`supp_view_${key}`);
    const edit = document.getElementById(`supp_edit_${key}`);
    if (isEditing) {
      appData.supplements[key] = edit.value;
      view.textContent = edit.value || "—";
      view.style.display = "block"; edit.style.display = "none";
    } else {
      view.style.display = "none"; edit.style.display = "block";
    }
  }
  btn.textContent = isEditing ? "✏ Редактировать" : "💾 Сохранить";
  if (isEditing) saveToServer();
};

/* ==========================================
   СТАТИСТИКА
========================================== */
function showStatsMode(mode) {
  const isWeek = mode === 'week';
  document.getElementById("weekStatsContainer").style.display = isWeek ? 'block' : 'none';
  document.getElementById("totalStats").style.display = isWeek ? 'none' : 'block';
  document.getElementById("weekStatsBtn").className = isWeek ? "btn btn-primary" : "btn btn-secondary";
  document.getElementById("totalStatsBtn").className = isWeek ? "btn btn-secondary" : "btn btn-primary";
  if (isWeek) {
    const select = document.getElementById("statsWeekSelect");
    select.innerHTML = Array.from({length:12}, (_,i) => `<option value="${i+1}" ${week == i+1 ? 'selected' : ''}>Неделя ${i+1}</option>`).join("");
    select.onchange = (e) => renderWeekStats(e.target.value);
    renderWeekStats(week);
  } else renderTotalStats();
}

function renderWeekStats(w) {
  const percent = weekStats[w-1] || 0;
  document.getElementById("weekSummary").innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${w}</div><div class="stat-label">Неделя</div></div>
      <div class="stat-card"><div class="stat-value">${percent}%</div><div class="stat-label">Прогресс</div></div>
    </div>
  `;
}

function renderTotalStats() {
  const doneWeeks = weekStats.filter(v => v > 0).length;
  const avgProgress = weekStats.reduce((a,b)=>a+b,0) / 12;
  document.getElementById("totalStats").innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${doneWeeks}</div><div class="stat-label">Недель</div></div>
      <div class="stat-card"><div class="stat-value">${Math.round(avgProgress)}%</div><div class="stat-label">Средний %</div></div>
    </div>
  `;
}

function resetAllStats() {
  if (confirm("Удалить ВООБЩЕ ВСЁ? Это действие нельзя отменить.")) {
    appData = getDefaultData();
    saveToServer();
    window.location.reload();
  }
}

function updateNextWeekButton() {}

checkAuth();
