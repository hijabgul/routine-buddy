 // ---------- state ----------
let tasks = [
  { id: "t1", time: 480, label: "Take morning medicine", emoji: "💊", done: false, lastAnnounced: null },
  { id: "t2", time: 510, label: "Eat breakfast", emoji: "🍽️", done: false, lastAnnounced: null },
  { id: "t3", time: 750, label: "Eat lunch", emoji: "🍽️", done: false, lastAnnounced: null },
  { id: "t4", time: 900, label: "Drink a glass of water", emoji: "💧", done: false, lastAnnounced: null },
  { id: "t5", time: 1140, label: "Eat dinner", emoji: "🍽️", done: false, lastAnnounced: null },
  { id: "t6", time: 1260, label: "Take evening medicine", emoji: "💊", done: false, lastAnnounced: null }
];

const REPEAT_EVERY = 4; // re-remind every 4 simulated minutes if still due
let currentTime = nowMinutes();
let playing = false;
let playInterval = null;

// ---------- helpers ----------
function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(mins) {
  let hours = Math.floor(mins / 60);
  let minutes = mins % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

function speak(text) {
  document.getElementById("srAnnounce").textContent = text;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }
}

// ---------- DOM references ----------
const timeDisplay = document.getElementById("timeDisplay");
const timeSlider = document.getElementById("timeSlider");
const playBtn = document.getElementById("playBtn");
const nowBtn = document.getElementById("nowBtn");
const spotlightEl = document.getElementById("spotlight");
const upcomingEl = document.getElementById("upcoming");
const completedEl = document.getElementById("completed");
const completedSection = document.getElementById("completedSection");
const addBtn = document.getElementById("addBtn");

// ---------- actions ----------
function markDone(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, done: true } : t));
  render();
}

function removeTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  render();
}

function addTask() {
  const timeVal = document.getElementById("newTime").value; // "HH:MM"
  const emoji = document.getElementById("newEmoji").value;
  const labelInput = document.getElementById("newLabel");
  const label = labelInput.value.trim();
  if (!label) return;

  const [h, m] = timeVal.split(":").map(Number);
  const newTask = {
    id: "t" + Date.now(),
    time: h * 60 + m,
    label,
    emoji,
    done: false,
    lastAnnounced: null
  };
  tasks.push(newTask);
  tasks.sort((a, b) => a.time - b.time);
  labelInput.value = "";
  render();
}

// ---------- due-check + announce (runs every render) ----------
function checkDueAndAnnounce() {
  tasks.forEach((t) => {
    if (t.done || t.time > currentTime) return;
    const neverAnnounced = t.lastAnnounced === null;
    const dueLongEnough = neverAnnounced || currentTime - t.lastAnnounced >= REPEAT_EVERY;
    if (dueLongEnough) {
      speak(`Reminder: ${t.label}`);
      t.lastAnnounced = currentTime;
    }
  });
}

// ---------- rendering ----------
function render() {
  checkDueAndAnnounce();

  const sorted = [...tasks].sort((a, b) => a.time - b.time);
  const dueNow = sorted.filter((t) => !t.done && t.time <= currentTime);
  const upcoming = sorted.filter((t) => !t.done && t.time > currentTime);
  const completed = sorted.filter((t) => t.done);
  const spotlight = dueNow[0];

  renderSpotlight(spotlight, dueNow.length > 0);
  renderList(upcomingEl, upcoming, false);

  if (completed.length > 0) {
    completedSection.style.display = "block";
    renderList(completedEl, completed, true);
  } else {
    completedSection.style.display = "none";
  }

  timeDisplay.textContent = formatTime(currentTime);
  timeSlider.value = currentTime;
}

function renderSpotlight(spotlight, isDue) {
  if (!spotlight) {
    spotlightEl.innerHTML = `
      <div class="spotlight-card spotlight-idle">
        <p style="margin:0; font-size:16px; font-weight:500;">Nothing due right now — next up is below.</p>
      </div>`;
    return;
  }

  spotlightEl.innerHTML = `
    <div class="spotlight-card spotlight-due ${isDue ? "rb-pulse" : ""}">
      <p class="spotlight-label-tag">Happening now</p>
      <div class="spotlight-row">
        <div class="spotlight-info">
          <span class="spotlight-emoji" aria-hidden="true">${spotlight.emoji}</span>
          <div>
            <p class="spotlight-title">${spotlight.label}</p>
            <p class="spotlight-sub">Was due at ${formatTime(spotlight.time)}</p>
          </div>
        </div>
        <div class="spotlight-actions">
          <button class="icon-btn" aria-label="Hear reminder again" onclick="speak('Reminder: ${spotlight.label}')">🔊</button>
          <button class="done-btn" onclick="markDone('${spotlight.id}')">✓ Mark done</button>
        </div>
      </div>
    </div>`;
}

function renderList(container, list, isCompleted) {
  if (list.length === 0) {
    container.innerHTML = `<p class="empty-note">${isCompleted ? "" : "Nothing else scheduled."}</p>`;
    return;
  }

  container.innerHTML = list.map((t) => `
    <div class="task-row ${isCompleted ? "completed" : ""}">
      <div class="task-row-info">
        <span class="emoji" aria-hidden="true">${t.emoji}</span>
        <div>
          <p class="label">${t.label}</p>
          <p class="time">${formatTime(t.time)}</p>
        </div>
      </div>
      ${isCompleted
        ? ""
        : `<button class="remove-btn" aria-label="Remove ${t.label}" onclick="removeTask('${t.id}')">✕</button>`
      }
    </div>
  `).join("");
}

// ---------- clock controls ----------
function togglePlay() {
  playing = !playing;
  playBtn.textContent = playing ? "⏸ Pause" : "▶ Play";

  if (playing) {
    playInterval = setInterval(() => {
      currentTime += 1;
      if (currentTime >= 1439) {
        currentTime = 1439;
        playing = false;
        playBtn.textContent = "▶ Play";
        clearInterval(playInterval);
      }
      render();
    }, 220);
  } else {
    clearInterval(playInterval);
  }
}

function resetToNow() {
  playing = false;
  playBtn.textContent = "▶ Play";
  clearInterval(playInterval);
  currentTime = nowMinutes();
  render();
}

// ---------- event listeners ----------
timeSlider.addEventListener("input", () => {
  playing = false;
  playBtn.textContent = "▶ Play";
  clearInterval(playInterval);
  currentTime = Number(timeSlider.value);
  render();
});

playBtn.addEventListener("click", togglePlay);
nowBtn.addEventListener("click", resetToNow);
addBtn.addEventListener("click", addTask);

// ---------- first render ----------
render();