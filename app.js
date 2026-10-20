const STORAGE_KEY = "seafarer-finance-log-v1";

const monthNames = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

const calendarMonths = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

const app = {
  selectedYear: getFinancialYearStart(new Date()),
  selectedMonth: null,
  voyageOpen: false,
  data: loadData(),
};

const els = {
  topbar: document.querySelector("#topbar"),
  yearSelect: document.querySelector("#yearSelect"),
  addYearButton: document.querySelector("#addYearButton"),
  calendarPanel: document.querySelector("#calendarPanel"),
  calendarTitle: document.querySelector("#calendarTitle"),
  toggleVoyageButton: document.querySelector("#toggleVoyageButton"),
  voyagePanel: document.querySelector("#voyagePanel"),
  monthGrid: document.querySelector("#monthGrid"),
  monthTemplate: document.querySelector("#monthTemplate"),
  detailPanel: document.querySelector("#detailPanel"),
  closeDetailButton: document.querySelector("#closeDetailButton"),
  periodForm: document.querySelector("#periodForm"),
  periodStart: document.querySelector("#periodStart"),
  periodEnd: document.querySelector("#periodEnd"),
  periodList: document.querySelector("#periodList"),
  selectedMonthTitle: document.querySelector("#selectedMonthTitle"),
  selectedMonthTotal: document.querySelector("#selectedMonthTotal"),
  monthIncome: document.querySelector("#monthIncome"),
  monthOutflow: document.querySelector("#monthOutflow"),
  incomeForm: document.querySelector("#incomeForm"),
  incomeTag: document.querySelector("#incomeTag"),
  incomeAmount: document.querySelector("#incomeAmount"),
  incomeList: document.querySelector("#incomeList"),
  expenseForm: document.querySelector("#expenseForm"),
  expenseTag: document.querySelector("#expenseTag"),
  expenseAmount: document.querySelector("#expenseAmount"),
  expenseList: document.querySelector("#expenseList"),
};

function getFinancialYearStart(date) {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

function yearLabel(year) {
  return `${year}-${String(year + 1).slice(2)}`;
}

function monthDate(year, index) {
  const month = calendarMonths[index];
  const actualYear = index < 9 ? year : year + 1;
  return new Date(actualYear, month, 1);
}

function monthKey(year, index) {
  const date = monthDate(year, index);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(Number(value) || 0);
}

function numberValue(value) {
  return Number.parseFloat(value) || 0;
}

function loadData() {
  const fallback = { years: {} };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(app.data));
}

function emptyYear() {
  return {
    periods: [],
    fixedItems: [],
    months: {},
  };
}

function currentYear() {
  if (!app.data.years[app.selectedYear]) {
    app.data.years[app.selectedYear] = emptyYear();
  }
  return app.data.years[app.selectedYear];
}

function getMonthRecord(index) {
  const year = currentYear();
  const key = monthKey(app.selectedYear, index);
  if (!year.months[key]) {
    year.months[key] = { incomeEntries: [], expenseEntries: [] };
  }
  normalizeMonthRecord(year.months[key]);
  return year.months[key];
}

function hasMonthRecord(index) {
  const record = currentYear().months[monthKey(app.selectedYear, index)];
  if (!record) return false;
  normalizeMonthRecord(record);
  return record.incomeEntries.length > 0 || record.expenseEntries.length > 0;
}

function normalizeMonthRecord(record) {
  if (!Array.isArray(record.incomeEntries)) record.incomeEntries = [];
  if (!Array.isArray(record.expenseEntries)) record.expenseEntries = [];

  if (record.earning && !record.legacyEarningMoved) {
    record.incomeEntries.push({
      id: crypto.randomUUID(),
      tag: "Monthly earning",
      amount: numberValue(record.earning),
    });
    record.legacyEarningMoved = true;
  }

  if (record.spending && !record.legacySpendingMoved) {
    record.expenseEntries.push({
      id: crypto.randomUUID(),
      tag: "Monthly spending",
      amount: numberValue(record.spending),
    });
    record.legacySpendingMoved = true;
  }
}

function fixedTotals() {
  return currentYear().fixedItems.reduce(
    (totals, item) => {
      totals[item.kind] += item.amount;
      return totals;
    },
    { earning: 0, deduction: 0 },
  );
}

function monthTotals(index) {
  const record = getMonthRecord(index);
  const income = record.incomeEntries.reduce((total, entry) => total + numberValue(entry.amount), 0);
  const outflow = record.expenseEntries.reduce((total, entry) => total + numberValue(entry.amount), 0);
  return { income, outflow, balance: income - outflow };
}

function dateRangeDays(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return Math.max(0, Math.round((end - start) / 86400000) + 1);
}

function clampPeriodToMonth(period, start, end) {
  const periodStart = new Date(`${period.start}T00:00:00`);
  const periodEnd = new Date(`${period.end}T00:00:00`);
  const startDate = new Date(Math.max(periodStart, start));
  const endDate = new Date(Math.min(periodEnd, end));
  if (startDate > endDate) return 0;
  return Math.round((endDate - startDate) / 86400000) + 1;
}

function monthStatus(index) {
  const start = monthDate(app.selectedYear, index);
  const end = endOfMonth(start);
  const days = { ship: 0, land: 0 };

  currentYear().periods.forEach((period) => {
    days[period.type] += clampPeriodToMonth(period, start, end);
  });

  if (days.ship > 0 && days.land > 0) return { type: "mixed", label: `${days.ship} ship / ${days.land} land days`, days };
  if (days.ship > 0) return { type: "ship", label: `${days.ship} ship days`, days };
  if (days.land > 0) return { type: "land", label: `${days.land} land days`, days };
  return { type: "none", label: "No period tagged", days };
}

function monthShipBackground(index) {
  const monthStart = monthDate(app.selectedYear, index);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = monthEnd.getDate();
  const segments = [];

  currentYear().periods.forEach((period) => {
    if (period.type !== "ship") return;
    const periodStart = new Date(`${period.start}T00:00:00`);
    const periodEnd = new Date(`${period.end}T00:00:00`);
    const segmentStart = new Date(Math.max(periodStart, monthStart));
    const segmentEnd = new Date(Math.min(periodEnd, monthEnd));
    if (segmentStart > segmentEnd) return;

    const startPercent = ((segmentStart.getDate() - 1) / daysInMonth) * 100;
    const endPercent = (segmentEnd.getDate() / daysInMonth) * 100;
    segments.push({ startPercent, endPercent });
  });

  if (!segments.length) return "";

  segments.sort((a, b) => a.startPercent - b.startPercent);
  const stops = [];
  let cursor = 0;

  segments.forEach((segment) => {
    if (segment.startPercent > cursor) {
      stops.push(`#fbfcfb ${cursor}% ${segment.startPercent}%`);
    }
    stops.push(`var(--ship-soft) ${segment.startPercent}% ${segment.endPercent}%`);
    cursor = Math.max(cursor, segment.endPercent);
  });

  if (cursor < 100) {
    stops.push(`#fbfcfb ${cursor}% 100%`);
  }

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function renderYearSelect() {
  const existingYears = Object.keys(app.data.years).map(Number);
  const start = Math.min(app.selectedYear - 1, ...existingYears, getFinancialYearStart(new Date()) - 1);
  const end = Math.max(app.selectedYear + 1, ...existingYears, getFinancialYearStart(new Date()) + 1);
  els.yearSelect.innerHTML = "";

  for (let year = start; year <= end; year += 1) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = yearLabel(year);
    option.selected = year === app.selectedYear;
    els.yearSelect.append(option);
  }
}

function renderMonths() {
  els.monthGrid.innerHTML = "";
  monthNames.forEach((name, index) => {
    const status = monthStatus(index);
    const date = monthDate(app.selectedYear, index);
    const card = els.monthTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("active", index === app.selectedMonth);
    if (status.type !== "none") card.classList.add(status.type);
    const shipBackground = monthShipBackground(index);
    if (shipBackground) card.style.setProperty("--ship-background", shipBackground);
    card.querySelector(".month-name").textContent = name;
    card.querySelector(".month-year").textContent = date.getFullYear();
    if (hasMonthRecord(index)) card.title = "This month has saved money details";
    card.addEventListener("click", () => {
      app.selectedMonth = index;
      setDefaultDates();
      render();
      els.detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.monthGrid.append(card);
  });
}

function renderPeriods() {
  const periods = currentYear().periods;
  els.voyagePanel.classList.toggle("is-hidden", !app.voyageOpen);
  els.periodList.innerHTML = periods.length ? "" : "<p class=\"empty\">No voyages added yet.</p>";
  periods.forEach((period) => {
    if (!period.name) period.name = "Ship contract";
    const item = document.createElement("div");
    item.className = "list-item ship";
    item.innerHTML = `
      <div class="contract-name-row">
        <strong>${period.name}</strong>
        <button class="edit-contract-button" type="button" aria-label="Edit ${period.name}" title="Edit contract name">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"></path>
          </svg>
        </button>
      </div>
      <div class="contract-date-row">
        <label class="field compact-date">
          <span>Sign on</span>
          <input class="contract-start-input" type="date" value="${period.start}">
        </label>
        <label class="field compact-date">
          <span>Sign off</span>
          <input class="contract-end-input" type="date" value="${period.end}">
        </label>
        <span class="contract-days">${dateRangeDays(period.start, period.end)} days</span>
      </div>
      <button class="remove-contract-button" type="button">Remove</button>
    `;
    item.querySelector(".edit-contract-button").addEventListener("click", () => {
      const row = item.querySelector(".contract-name-row");
      const nameText = row.querySelector("strong");
      const editButton = row.querySelector(".edit-contract-button");
      const input = document.createElement("input");
      input.className = "contract-name-input";
      input.type = "text";
      input.value = period.name;
      input.setAttribute("aria-label", "Contract name");

      function saveName() {
        period.name = input.value.trim() || "Ship contract";
        saveData();
        render();
      }

      nameText.replaceWith(input);
      editButton.classList.add("is-hidden");
      input.focus();
      input.select();
      input.addEventListener("blur", saveName);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") input.blur();
        if (event.key === "Escape") render();
      });
    });
    const startInput = item.querySelector(".contract-start-input");
    const endInput = item.querySelector(".contract-end-input");
    function saveContractDates() {
      if (!startInput.value || !endInput.value) return;
      if (startInput.value > endInput.value) {
        alert("Sign on date must be before the sign off date.");
        render();
        return;
      }
      period.start = startInput.value;
      period.end = endInput.value;
      saveData();
      render();
    }
    startInput.addEventListener("change", saveContractDates);
    endInput.addEventListener("change", saveContractDates);
    item.querySelector(".remove-contract-button").addEventListener("click", () => {
      currentYear().periods = currentYear().periods.filter((entry) => entry.id !== period.id);
      saveData();
      render();
    });
    els.periodList.append(item);
  });
}

function renderEntryList(type) {
  const record = getMonthRecord(app.selectedMonth);
  const entries = type === "income" ? record.incomeEntries : record.expenseEntries;
  const list = type === "income" ? els.incomeList : els.expenseList;
  list.innerHTML = entries.length ? "" : `<p class="empty">No ${type} added yet.</p>`;

  entries.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "entry-item";
    item.innerHTML = `
      <span>${entry.tag}</span>
      <strong>${money(entry.amount)}</strong>
      <button class="delete-entry-button" type="button" aria-label="Remove ${entry.tag}" title="Remove">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M3 6h18"></path>
          <path d="M8 6V4h8v2"></path>
          <path d="M6 6l1 14h10l1-14"></path>
          <path d="M10 11v5"></path>
          <path d="M14 11v5"></path>
        </svg>
      </button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      const latest = getMonthRecord(app.selectedMonth);
      const key = type === "income" ? "incomeEntries" : "expenseEntries";
      latest[key] = latest[key].filter((savedEntry) => savedEntry.id !== entry.id);
      saveData();
      render();
    });
    list.append(item);
  });
}

function renderSelectedMonth() {
  if (app.selectedMonth === null) {
    els.topbar.classList.remove("is-hidden");
    els.calendarPanel.classList.remove("is-hidden");
    els.detailPanel.classList.add("is-hidden");
    return;
  }

  els.topbar.classList.add("is-hidden");
  els.calendarPanel.classList.add("is-hidden");
  els.detailPanel.classList.remove("is-hidden");
  const totals = monthTotals(app.selectedMonth);
  const date = monthDate(app.selectedYear, app.selectedMonth);
  els.selectedMonthTitle.textContent = `${monthNames[app.selectedMonth]} ${date.getFullYear()}`;
  els.monthIncome.textContent = money(totals.income);
  els.monthOutflow.textContent = money(totals.outflow);
  els.selectedMonthTotal.textContent = money(totals.balance);
  renderEntryList("income");
  renderEntryList("expense");
}

function render() {
  currentYear();
  renderYearSelect();
  els.calendarTitle.textContent = `Financial Year ${yearLabel(app.selectedYear)}`;
  renderMonths();
  renderPeriods();
  renderSelectedMonth();
  saveData();
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const rows = [["Financial Year", "Month", "Status", "Income", "Outflow", "Balance", "Notes"]];
  monthNames.forEach((name, index) => {
    const totals = monthTotals(index);
    const status = monthStatus(index);
    const record = getMonthRecord(index);
    rows.push([
      yearLabel(app.selectedYear),
      `${name} ${monthDate(app.selectedYear, index).getFullYear()}`,
      status.label,
      totals.income,
      totals.outflow,
      totals.balance,
      record.notes || "",
    ]);
  });
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  download(`seafarer-finance-${yearLabel(app.selectedYear)}.csv`, csv, "text/csv");
}

function bindEvents() {
  els.yearSelect.addEventListener("change", () => {
    app.selectedYear = Number(els.yearSelect.value);
    app.selectedMonth = null;
    render();
  });

  els.addYearButton.addEventListener("click", () => {
    app.selectedYear += 1;
    app.selectedMonth = null;
    render();
  });

  els.closeDetailButton.addEventListener("click", () => {
    app.selectedMonth = null;
    render();
  });

  els.toggleVoyageButton.addEventListener("click", () => {
    app.voyageOpen = !app.voyageOpen;
    renderPeriods();
  });

  els.periodForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.periodStart.value > els.periodEnd.value) {
      alert("Start date must be before the end date.");
      return;
    }
    currentYear().periods.push({
      id: crypto.randomUUID(),
      type: "ship",
      start: els.periodStart.value,
      end: els.periodEnd.value,
    });
    els.periodForm.reset();
    saveData();
    render();
  });

  els.incomeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = getMonthRecord(app.selectedMonth);
    record.incomeEntries.push({
      id: crypto.randomUUID(),
      tag: els.incomeTag.value.trim(),
      amount: numberValue(els.incomeAmount.value),
    });
    els.incomeForm.reset();
    saveData();
    render();
  });

  els.expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const record = getMonthRecord(app.selectedMonth);
    record.expenseEntries.push({
      id: crypto.randomUUID(),
      tag: els.expenseTag.value.trim(),
      amount: numberValue(els.expenseAmount.value),
    });
    els.expenseForm.reset();
    saveData();
    render();
  });
}

function setDefaultDates() {
  const index = app.selectedMonth === null ? 0 : app.selectedMonth;
  const selectedDate = monthDate(app.selectedYear, index);
  els.periodStart.value = isoDate(selectedDate);
  els.periodEnd.value = isoDate(endOfMonth(selectedDate));
}

bindEvents();
currentYear();
setDefaultDates();
render();
