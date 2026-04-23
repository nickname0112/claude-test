const Storage = {
  HABITS_KEY: "habit_tracker_habits",
  COMPLETIONS_KEY: "habit_tracker_completions",
  available: true,

  init() {
    try {
      localStorage.setItem("__test__", "1");
      localStorage.removeItem("__test__");
    } catch {
      this.available = false;
    }
  },

  getHabits() {
    try { return JSON.parse(localStorage.getItem(this.HABITS_KEY)) ?? []; }
    catch { return []; }
  },

  saveHabits(habits) {
    if (!this.available) return;
    try { localStorage.setItem(this.HABITS_KEY, JSON.stringify(habits)); } catch {}
  },

  getCompletions() {
    try { return JSON.parse(localStorage.getItem(this.COMPLETIONS_KEY)) ?? {}; }
    catch { return {}; }
  },

  saveCompletions(map) {
    if (!this.available) return;
    try { localStorage.setItem(this.COMPLETIONS_KEY, JSON.stringify(map)); } catch {}
  },

  completionKey(id, date) {
    return `${id}::${date}`;
  },
};

const State = {
  habits: [],
  completions: {},
  today: "",
};

const Logic = {
  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  subtractDays(dateStr, n) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - n);
    return this.formatDate(d);
  },

  generateId() {
    return "h_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  },

  escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  isCompleteToday(habitId) {
    return !!State.completions[Storage.completionKey(habitId, State.today)];
  },

  calculateStreak(habitId) {
    const done = Logic.isCompleteToday(habitId);
    let cursor = done ? State.today : Logic.subtractDays(State.today, 1);
    let streak = 0;
    for (let i = 0; i < 3650; i++) {
      if (State.completions[Storage.completionKey(habitId, cursor)]) {
        streak++;
        cursor = Logic.subtractDays(cursor, 1);
      } else {
        break;
      }
    }
    return streak;
  },

  formatStreakLabel(n) {
    if (n === 1) return "1-day streak";
    return `${n}-day streak`;
  },
};

const UI = {
  render() {
    const list = document.getElementById("habit-list");
    if (State.habits.length === 0) {
      list.innerHTML = '<li class="empty-state">No habits yet. Add one above!</li>';
      return;
    }

    list.innerHTML = State.habits.map((habit) => {
      const complete = Logic.isCompleteToday(habit.id);
      const streak = Logic.calculateStreak(habit.id);
      const streakClass = streak > 0 ? "streak active" : "streak";
      const cardClass = complete ? "habit-card complete" : "habit-card";
      const toggleLabel = complete ? "Mark incomplete" : "Mark complete";
      const checkmark = complete ? "&#10003;" : "";

      return `
        <li class="${cardClass}">
          <button
            class="toggle-btn ${complete ? "complete" : ""}"
            data-action="toggle"
            data-id="${habit.id}"
            aria-label="${toggleLabel}"
          >${checkmark}</button>
          <span class="habit-name" title="${Logic.escapeHtml(habit.name)}">${Logic.escapeHtml(habit.name)}</span>
          <span class="${streakClass}">${Logic.formatStreakLabel(streak)}</span>
          <button
            class="delete-btn"
            data-action="delete"
            data-id="${habit.id}"
            aria-label="Delete ${Logic.escapeHtml(habit.name)}"
          >&#215;</button>
        </li>
      `;
    }).join("");
  },

  handleAddHabit(e) {
    e.preventDefault();
    const input = document.getElementById("habit-name-input");
    const name = input.value.trim();

    if (!name) return;

    const duplicate = State.habits.some(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      input.setCustomValidity("A habit with this name already exists.");
      input.reportValidity();
      return;
    }

    input.setCustomValidity("");
    const habit = {
      id: Logic.generateId(),
      name,
      createdAt: State.today,
    };
    State.habits.push(habit);
    Storage.saveHabits(State.habits);
    input.value = "";
    UI.render();
  },

  handleListClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const { action, id } = btn.dataset;

    if (action === "toggle") {
      const key = Storage.completionKey(id, State.today);
      if (State.completions[key]) {
        delete State.completions[key];
      } else {
        State.completions[key] = true;
      }
      Storage.saveCompletions(State.completions);
      UI.render();
    }

    if (action === "delete") {
      State.habits = State.habits.filter((h) => h.id !== id);
      Storage.saveHabits(State.habits);
      UI.render();
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  Storage.init();

  if (!Storage.available) {
    document.getElementById("storage-warning").classList.remove("hidden");
  }

  State.today = Logic.formatDate(new Date());
  State.habits = Storage.getHabits();
  State.completions = Storage.getCompletions();

  const form = document.getElementById("add-habit-form");
  const input = document.getElementById("habit-name-input");
  const list = document.getElementById("habit-list");

  form.addEventListener("submit", UI.handleAddHabit);
  list.addEventListener("click", UI.handleListClick);

  input.addEventListener("input", () => input.setCustomValidity(""));

  document.getElementById("today-display").textContent = new Date().toLocaleDateString(
    undefined,
    { month: "long", day: "numeric", year: "numeric" }
  );

  UI.render();
});
