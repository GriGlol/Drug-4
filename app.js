/* ============================================================
   ФАРМАСПРАВОЧНИК — APP.JS
   Вся логика интерфейса: поиск, фильтры, карточки, избранное,
   сравнение, история просмотра, темы, алфавит
   ============================================================ */

'use strict';

// ─── STATE ───────────────────────────────────────────────────
const state = {
  activeGroup: null,         // фильтр по группе
  favorites: new Set(),      // id препаратов
  compareList: [],           // id препаратов (макс 4)
  history: [],               // id препаратов (макс 10)
  darkMode: false,
  activeDrug: null,
  activeMobileTab: 'drugs',
  activeAlphaLetter: null,
};

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  renderAll();
  bindEvents();
  checkHash();
});

function renderAll() {
  renderGroupFilters();
  renderDrugGroups();
  renderMechanisms();
  renderSections();
  renderAlphabet();
  renderRecentBar();
  renderFavorites();
  updateDrugsCount();
  applyTheme();
}

// ─── STORAGE ─────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const favs = localStorage.getItem('pharma_favs');
    if (favs) JSON.parse(favs).forEach(id => state.favorites.add(id));
    const hist = localStorage.getItem('pharma_hist');
    if (hist) state.history = JSON.parse(hist);
    const comp = localStorage.getItem('pharma_compare');
    if (comp) state.compareList = JSON.parse(comp);
    const theme = localStorage.getItem('pharma_theme');
    if (theme === 'dark') state.darkMode = true;
  } catch(e) {}
}
function save() {
  localStorage.setItem('pharma_favs', JSON.stringify([...state.favorites]));
  localStorage.setItem('pharma_hist', JSON.stringify(state.history));
  localStorage.setItem('pharma_compare', JSON.stringify(state.compareList));
  localStorage.setItem('pharma_theme', state.darkMode ? 'dark' : 'light');
}

// ─── THEME ───────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.dataset.theme = state.darkMode ? 'dark' : 'light';
  document.getElementById('theme-btn').textContent = state.darkMode ? '☽' : '☀';
}

// ─── RENDER: GROUP FILTERS ───────────────────────────────────
function renderGroupFilters() {
  const container = document.getElementById('group-filters');
  container.innerHTML = DRUG_GROUPS.map(g => `
    <button class="filter-item ${state.activeGroup === g.id ? 'active' : ''}"
      data-group="${g.id}" onclick="toggleGroupFilter('${g.id}')">
      <span class="filter-dot" style="background:${g.color}"></span>
      <span class="filter-name">${g.shortName}</span>
      <span class="filter-num">${g.drugs.length}</span>
    </button>
  `).join('');

  const chips = document.getElementById('active-chips');
  if (state.activeGroup) {
    const g = DRUG_GROUPS.find(x => x.id === state.activeGroup);
    chips.innerHTML = g ? `
      <span class="chip">
        <span class="chip-dot" style="width:7px;height:7px;border-radius:50%;background:${g.color};display:inline-block"></span>
        ${g.shortName}
        <button class="chip-remove" onclick="clearGroupFilter()">✕</button>
      </span>` : '';
  } else {
    chips.innerHTML = '';
  }
}

function toggleGroupFilter(id) {
  state.activeGroup = state.activeGroup === id ? null : id;
  renderGroupFilters();
  renderDrugGroups();
  updateDrugsCount();
}
function clearGroupFilter() {
  state.activeGroup = null;
  renderGroupFilters();
  renderDrugGroups();
  updateDrugsCount();
}

// ─── RENDER: DRUG GROUPS ─────────────────────────────────────
function getFilteredGroups() {
  if (!state.activeGroup) return DRUG_GROUPS;
  return DRUG_GROUPS.filter(g => g.id === state.activeGroup);
}

function renderDrugGroups() {
  const container = document.getElementById('drug-groups-list');
  const groups = getFilteredGroups();
  container.innerHTML = groups.map(g => `
    <div class="drug-group" id="dg-${g.id}">
      <button class="group-header ${state.activeGroup === g.id ? 'open' : ''}"
        onclick="toggleGroup('${g.id}')" aria-expanded="${state.activeGroup === g.id}">
        <span class="group-swatch" style="background:${g.color}"></span>
        <span class="group-name">${g.name}</span>
        <span class="group-count">${g.drugs.length}</span>
        <span class="group-arrow">▶</span>
      </button>
      <div class="group-drugs ${state.activeGroup === g.id ? 'open' : ''}" id="gdrugs-${g.id}">
        ${g.drugs.map(d => drugButton(d, g)).join('')}
      </div>
    </div>
  `).join('');
}

function drugButton(drug, group) {
  const isFav = state.favorites.has(drug.id);
  const isActive = state.activeDrug === drug.id;
  return `
    <button class="drug-btn ${isActive ? 'active' : ''} ${isFav ? 'favorited' : ''}"
      id="dbtn-${drug.id}"
      onclick="openDrug('${drug.id}')"
      title="${drug.subgroup || ''}">
      ${drug.name}
      <span class="drug-fav-star">★</span>
    </button>`;
}

function toggleGroup(id) {
  const header = document.querySelector(`#dg-${id} .group-header`);
  const drugs = document.getElementById(`gdrugs-${id}`);
  if (!header || !drugs) return;
  const isOpen = header.classList.toggle('open');
  drugs.classList.toggle('open', isOpen);
  header.setAttribute('aria-expanded', isOpen);
}

function updateDrugsCount() {
  const groups = getFilteredGroups();
  const total = groups.reduce((s, g) => s + g.drugs.length, 0);
  document.getElementById('drugs-count').textContent = `${total}`;
  document.getElementById('result-count').textContent = state.activeGroup
    ? `Показано: ${total} препаратов` : `Всего: ${ALL_DRUGS.length} препаратов`;
}

// ─── RENDER: MECHANISMS ──────────────────────────────────────
function renderMechanisms() {
  const container = document.getElementById('mechanisms-list');
  container.innerHTML = DRUG_GROUPS.map(g => `
    <div class="mech-item">
      <button class="mech-header" onclick="toggleMech(this)">
        <span class="mech-swatch" style="background:${g.color}"></span>
        <span class="mech-group-name">${g.shortName}</span>
        <span class="group-arrow" style="margin-left:auto;font-size:10px;color:var(--text3)">▶</span>
      </button>
      <div class="mech-body">
        <p>${g.mechanism}</p>
        <button class="mech-link" onclick="event.stopPropagation();filterByGroup('${g.id}')">
          Показать ${g.drugs.length} препаратов →
        </button>
      </div>
    </div>
  `).join('');
}

function toggleMech(btn) {
  const body = btn.parentElement.querySelector('.mech-body');
  const arrow = btn.querySelector('.group-arrow');
  const isOpen = body.classList.toggle('open');
  if (arrow) arrow.style.transform = isOpen ? 'rotate(90deg)' : '';
}

function filterByGroup(id) {
  state.activeGroup = id;
  renderGroupFilters();
  renderDrugGroups();
  updateDrugsCount();
  // Scroll to drugs on mobile
  if (window.innerWidth < 769) switchMobileTab('drugs');
  showToast(`Фильтр: ${DRUG_GROUPS.find(g=>g.id===id)?.shortName}`);
}

// ─── RENDER: SECTIONS ────────────────────────────────────────
function renderSections() {
  const container = document.getElementById('sections-list');
  container.innerHTML = SECTIONS.map(s => `
    <button class="section-item" onclick="openSection('${s.id}')">
      <span class="section-icon">${s.icon}</span>
      <div>
        <div class="section-name">${s.name}</div>
        <div class="section-desc">${s.desc}</div>
      </div>
    </button>
  `).join('');
}

function openSection(id) {
  const sec = SECTIONS.find(s => s.id === id);
  if (!sec) return;

  document.getElementById('section-panel-title').textContent = sec.name;

  // Build content: list drugs by group with source file links
  const content = document.getElementById('section-panel-content');
  let html = `<p style="color:var(--text3);font-size:13px;margin-bottom:16px">${sec.desc}</p>`;

  DRUG_GROUPS.forEach(g => {
    html += `
      <div class="section-group-title">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};margin-right:8px;vertical-align:middle"></span>
        ${g.name}
        <small style="color:var(--text3);font-size:11px;margin-left:8px">→ ${g.sourceFile}</small>
      </div>
      <div class="section-drug-list">
        ${g.drugs.map(d => `
          <button class="section-drug-item" onclick="closeSection();openDrug('${d.id}')">
            <span style="width:7px;height:7px;border-radius:50%;background:${g.color};flex-shrink:0"></span>
            <span>${d.name}</span>
            <span style="font-size:11px;color:var(--text3);margin-left:auto">${d.subgroup ? d.subgroup.split('—')[0].trim() : ''}</span>
          </button>
        `).join('')}
      </div>`;
  });

  content.innerHTML = html;
  document.getElementById('section-overlay').style.display = 'flex';
}

function closeSection() {
  document.getElementById('section-overlay').style.display = 'none';
}

// ─── DRUG CARD ────────────────────────────────────────────────
function openDrug(drugId) {
  const drug = ALL_DRUGS.find(d => d.id === drugId);
  if (!drug) return;

  state.activeDrug = drugId;
  addToHistory(drugId);
  updateHash(drugId);

  // Update active state in list
  document.querySelectorAll('.drug-btn.active').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`dbtn-${drugId}`);
  if (btn) btn.classList.add('active');

  renderCard(drug);
  document.getElementById('card-overlay').style.display = 'flex';
  document.getElementById('card-panel').scrollTop = 0;
  updateCardFavBtn(drugId);
  updateCompareBtn(drugId);
}

function renderCard(drug) {
  const group = DRUG_GROUPS.find(g => g.id === drug.groupId);
  const isFav = state.favorites.has(drug.id);
  const inCompare = state.compareList.includes(drug.id);

  document.getElementById('card-fav').textContent = isFav ? '★ В избранном' : '★ Избранное';
  document.getElementById('card-fav').className = 'card-action-btn' + (isFav ? ' favorited' : '');
  document.getElementById('card-compare').textContent = inCompare ? '⇄ В сравнении' : '⇄ Сравнить';

  const content = document.getElementById('card-content');
  content.innerHTML = `
    <div class="card-eyebrow" style="color:${group.color}">${group.name}</div>
    <div class="card-drug-name">${drug.name}</div>
    <div class="card-subgroup">${drug.subgroup || ''}</div>
    <div class="card-source">
      Источник: <a href="original/${group.sourceFile}" target="_blank">${group.sourceFile}</a>
    </div>

    <div class="card-summary">
      <div class="card-summary-title">◉ Коротко</div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Группа</div>
          <div class="summary-val">${group.name}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Механизм (кратко)</div>
          <div class="summary-val">${group.mechanism.split(';')[0]}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Подгруппа / особенность</div>
          <div class="summary-val">${drug.subgroup || '<span class="no-data">Нет данных в источнике</span>'}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Показания (группа)</div>
          <div class="summary-val">${group.indications ? group.indications.split(/;\s*/)[0] : '—'}</div>
        </div>
      </div>
    </div>

    <div class="card-anchors">
      <button class="anchor-btn" onclick="scrollToSection('mechanism')">Механизм</button>
      <button class="anchor-btn" onclick="scrollToSection('subgroup')">Подгруппа</button>
      <button class="anchor-btn" onclick="scrollToSection('dosage')">Дозировка</button>
      <button class="anchor-btn" onclick="scrollToSection('indications')">Показания</button>
      <button class="anchor-btn" onclick="scrollToSection('contraindications')">Противопоказания</button>
      <button class="anchor-btn" onclick="scrollToSection('group-drugs')">Группа</button>
      <button class="anchor-btn" onclick="scrollToSection('source')">Источник</button>
    </div>

    <div class="card-section" id="cs-mechanism">
      <div class="card-section-title">
        <span class="card-section-icon">⚙</span> Механизм действия
      </div>
      <div class="card-section-body">
        <div class="info-box note">${group.mechanism}</div>
      </div>
    </div>

    <div class="card-section" id="cs-subgroup">
      <div class="card-section-title">
        <span class="card-section-icon">◈</span> Подгруппа и ключевые особенности
      </div>
      <div class="card-section-body">
        ${drug.subgroup
          ? `<p>${drug.subgroup}</p>`
          : `<p class="no-data">Нет данных в источнике</p>`}
      </div>
    </div>

    <div class="card-section" id="cs-dosage">
      <div class="card-section-title">
        <span class="card-section-icon">💊</span> Дозировка
      </div>
      <div class="card-section-body">
        ${drug.dosage
          ? `<div class="dosage-list">${
              drug.dosage.split(' | ').map(d => {
                const i = d.indexOf(':');
                if (i > -1) {
                  return `<div class="dosage-row"><span class="dosage-label">${d.slice(0, i).trim()}</span><span class="dosage-val">${d.slice(i + 1).trim()}</span></div>`;
                }
                return `<div class="dosage-row"><span class="dosage-val">${d}</span></div>`;
              }).join('')
            }</div>`
          : `<div class="info-box note">Конкретные дозы — в исходном файле: <a href="original/${group.sourceFile}" target="_blank" rel="noopener">${group.sourceFile}</a></div>`}
      </div>
    </div>

    <div class="card-section" id="cs-group-drugs">
      <div class="card-section-title">
        <span class="card-section-icon">⊞</span> Другие препараты группы «${group.shortName}»
      </div>
      <div class="card-section-body">
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${group.drugs.filter(d => d.id !== drug.id).map(d => `
            <button onclick="openDrug('${d.id}')" style="
              padding:5px 12px;border-radius:7px;
              border:1px solid var(--border);background:var(--bg3);
              font-size:12px;cursor:pointer;color:var(--text2);
              font-family:inherit;transition:all 0.18s"
              onmouseover="this.style.borderColor='${group.color}';this.style.color='${group.color}'"
              onmouseout="this.style.borderColor='';this.style.color=''"
            >${d.name}</button>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card-section" id="cs-indications">
      <div class="card-section-title">
        <span class="card-section-icon">✓</span> Показания к применению
      </div>
      <div class="card-section-body">
        ${group.indications
          ? `<ul class="clin-list clin-ok">${
              group.indications.split(/;\s*/).filter(Boolean).map(s => `<li>${s.replace(/\.$/, '')}</li>`).join('')
            }</ul>`
          : `<p class="no-data">Нет данных в источнике</p>`}
        <p class="card-note">Показания указаны для группы «${group.shortName}». Подробности по конкретному препарату — в источнике.</p>
      </div>
    </div>

    <div class="card-section" id="cs-contraindications">
      <div class="card-section-title">
        <span class="card-section-icon">✗</span> Противопоказания
      </div>
      <div class="card-section-body">
        ${group.contraindications
          ? `<ul class="clin-list clin-no">${
              group.contraindications.split(/;\s*/).filter(Boolean).map(s => `<li>${s.replace(/\.$/, '')}</li>`).join('')
            }</ul>`
          : `<p class="no-data">Нет данных в источнике</p>`}
      </div>
    </div>

    <div class="card-section" id="cs-source">
      <div class="card-section-title">
        <span class="card-section-icon">📄</span> Источник информации
      </div>
      <div class="card-section-body">
        <p>Основной файл: <a class="source-link" href="original/${group.sourceFile}" target="_blank" rel="noopener">${group.sourceFile} ↗</a></p>
        ${group.sourceFile2 ? `<p>Дополнительно: <a class="source-link" href="original/${group.sourceFile2}" target="_blank" rel="noopener">${group.sourceFile2} ↗</a></p>` : ''}
        <div class="info-box note" style="margin-top:8px">
          Нажмите на ссылку, чтобы открыть полный исходный файл в новой вкладке. Файлы должны лежать в папке <code>original/</code> рядом с <code>index.html</code>.
        </div>
      </div>
    </div>
  `;
}

function scrollToSection(id) {
  const el = document.getElementById(`cs-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeCard() {
  document.getElementById('card-overlay').style.display = 'none';
  state.activeDrug = null;
  history.replaceState(null, '', location.pathname);
  document.querySelectorAll('.drug-btn.active').forEach(b => b.classList.remove('active'));
}

// ─── FAVORITES ───────────────────────────────────────────────
function toggleFavorite(drugId) {
  if (state.favorites.has(drugId)) {
    state.favorites.delete(drugId);
    showToast('Удалено из избранного');
  } else {
    state.favorites.add(drugId);
    showToast('Добавлено в избранное ★');
  }
  save();
  updateCardFavBtn(drugId);
  renderFavorites();
  updateFavCount();
  // Refresh drug button star
  const btn = document.getElementById(`dbtn-${drugId}`);
  if (btn) btn.classList.toggle('favorited', state.favorites.has(drugId));
}

function updateCardFavBtn(drugId) {
  const btn = document.getElementById('card-fav');
  if (!btn) return;
  const isFav = state.favorites.has(drugId);
  btn.textContent = isFav ? '★ В избранном' : '★ Избранное';
  btn.className = 'card-action-btn' + (isFav ? ' favorited' : '');
}

function updateFavCount() {
  const el = document.getElementById('fav-count');
  const n = state.favorites.size;
  el.textContent = n;
  el.style.display = n > 0 ? 'flex' : 'none';
}

function renderFavorites() {
  const el = document.getElementById('favorites-content');
  if (state.favorites.size === 0) {
    el.innerHTML = '<div class="fav-empty">★ Вы пока не добавили препараты в избранное.<br><br>Нажмите ★ на любом препарате.</div>';
    updateFavCount();
    return;
  }
  el.innerHTML = [...state.favorites].map(id => {
    const drug = ALL_DRUGS.find(d => d.id === id);
    if (!drug) return '';
    return `
      <div class="fav-item">
        <span class="fav-dot" style="width:8px;height:8px;border-radius:50%;background:${drug.groupColor};flex-shrink:0"></span>
        <span class="fav-name" onclick="openDrug('${id}')">${drug.name}</span>
        <span class="fav-group">${drug.groupShortName}</span>
        <button class="fav-remove" onclick="toggleFavorite('${id}')" title="Удалить">✕</button>
      </div>`;
  }).join('');
  updateFavCount();
}

// ─── COMPARE ─────────────────────────────────────────────────
function updateCompareBtn(drugId) {
  const btn = document.getElementById('card-compare');
  if (!btn) return;
  btn.textContent = state.compareList.includes(drugId) ? '⇄ В сравнении' : '⇄ Сравнить';
}

function toggleCompare(drugId) {
  if (state.compareList.includes(drugId)) {
    state.compareList = state.compareList.filter(id => id !== drugId);
    showToast('Убрано из сравнения');
  } else if (state.compareList.length >= 4) {
    showToast('Максимум 4 препарата для сравнения');
    return;
  } else {
    state.compareList.push(drugId);
    showToast('Добавлено к сравнению ⇄');
  }
  save();
  updateCompareBtn(drugId);
  updateCompareCount();
}

function updateCompareCount() {
  const el = document.getElementById('compare-count');
  const n = state.compareList.length;
  el.textContent = n;
  el.style.display = n > 0 ? 'flex' : 'none';
}

function openCompare() {
  renderCompareTable();
  document.getElementById('compare-overlay').style.display = 'flex';
}

function closeCompare() {
  document.getElementById('compare-overlay').style.display = 'none';
}

function clearCompare() {
  state.compareList = [];
  save();
  updateCompareCount();
  renderCompareTable();
}

function renderCompareTable() {
  const el = document.getElementById('compare-content');
  if (state.compareList.length === 0) {
    el.innerHTML = '<p style="color:var(--text3);padding:20px;font-size:13px">Нет препаратов для сравнения. Откройте карточку препарата и нажмите «Сравнить».</p>';
    return;
  }

  const drugs = state.compareList.map(id => ALL_DRUGS.find(d => d.id === id)).filter(Boolean);
  const rows = [
    ['Группа', d => d.groupName],
    ['Подгруппа / особенности', d => d.subgroup || '<span class="no-data">—</span>'],
    ['Механизм действия', d => DRUG_GROUPS.find(g=>g.id===d.groupId)?.mechanism || '—'],
    ['Источник', d => d.sourceFile || d.groupId],
  ];

  el.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th class="row-label">Параметр</th>
          ${drugs.map(d => `
            <th>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span style="color:${d.groupColor}">${d.name}</span>
                <button class="compare-remove" onclick="removeFromCompare('${d.id}')" title="Убрать">✕</button>
              </div>
              <div style="font-size:10px;color:var(--text3);font-weight:400;margin-top:2px">${d.groupShortName}</div>
            </th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, fn]) => `
          <tr>
            <td class="row-label">${label}</td>
            ${drugs.map(d => `<td>${fn(d)}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function removeFromCompare(id) {
  state.compareList = state.compareList.filter(x => x !== id);
  save();
  updateCompareCount();
  renderCompareTable();
}

// Compare search
function bindCompareSearch() {
  const input = document.getElementById('compare-search');
  const results = document.getElementById('compare-search-results');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = 'none'; results.classList.remove('open'); return; }
    const found = ALL_DRUGS.filter(d => d.name.toLowerCase().includes(q)).slice(0, 8);
    if (!found.length) { results.innerHTML = '<div class="sr-none">Не найдено</div>'; }
    else results.innerHTML = found.map(d => `
      <button class="sr-item" onclick="addToCompareFromSearch('${d.id}')">
        <span class="sr-dot" style="background:${d.groupColor}"></span>
        <span class="sr-name">${d.name}</span>
        <span class="sr-sub">${d.groupShortName}</span>
      </button>`).join('');
    results.style.display = 'block';
    results.classList.add('open');
  });
  document.addEventListener('click', e => {
    if (!results.contains(e.target) && e.target !== input) {
      results.style.display = 'none'; results.classList.remove('open');
    }
  });
}

function addToCompareFromSearch(id) {
  document.getElementById('compare-search').value = '';
  document.getElementById('compare-search-results').style.display = 'none';
  document.getElementById('compare-search-results').classList.remove('open');
  if (!state.compareList.includes(id)) {
    if (state.compareList.length >= 4) { showToast('Максимум 4 препарата'); return; }
    state.compareList.push(id);
    save(); updateCompareCount(); renderCompareTable();
  }
}

// ─── HISTORY ─────────────────────────────────────────────────
function addToHistory(drugId) {
  state.history = [drugId, ...state.history.filter(id => id !== drugId)].slice(0, 10);
  save();
  renderRecentBar();
}

function renderRecentBar() {
  const bar = document.getElementById('recent-bar');
  const list = document.getElementById('recent-list');
  if (state.history.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  list.innerHTML = state.history.slice(0, 8).map(id => {
    const d = ALL_DRUGS.find(x => x.id === id);
    return d ? `<button class="recent-item" onclick="openDrug('${d.id}')"
      style="border-color:${d.groupColor}22">${d.name}</button>` : '';
  }).join('');
}

function clearHistory() {
  state.history = [];
  save();
  renderRecentBar();
}

// ─── ALPHABET ────────────────────────────────────────────────
function renderAlphabet() {
  const allLetters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
  const drugsByLetter = {};
  ALL_DRUGS.forEach(d => {
    const letter = d.name[0].toUpperCase();
    if (!drugsByLetter[letter]) drugsByLetter[letter] = [];
    drugsByLetter[letter].push(d);
  });

  const bar = document.getElementById('alphabet-bar');
  bar.innerHTML = allLetters.map(l => `
    <button class="alpha-btn ${!drugsByLetter[l] ? '' : ''} ${state.activeAlphaLetter === l ? 'active' : ''}"
      ${!drugsByLetter[l] ? 'disabled' : ''}
      onclick="filterAlpha('${l}')">${l}</button>
  `).join('');

  renderAlphaList(drugsByLetter);
}

function filterAlpha(letter) {
  state.activeAlphaLetter = state.activeAlphaLetter === letter ? null : letter;
  renderAlphabet();
}

function renderAlphaList(drugsByLetter) {
  const list = document.getElementById('alphabet-list');
  const letters = state.activeAlphaLetter
    ? [state.activeAlphaLetter]
    : Object.keys(drugsByLetter).sort();

  list.innerHTML = letters.map(letter => {
    const drugs = drugsByLetter[letter];
    if (!drugs || !drugs.length) return '';
    return `
      <div class="alpha-section">
        <div class="alpha-letter">${letter}</div>
        <div class="alpha-drugs">
          ${drugs.sort((a,b) => a.name.localeCompare(b.name, 'ru')).map(d => `
            <button class="alpha-drug-btn" onclick="openDrug('${d.id}')">
              <span class="alpha-dot" style="background:${d.groupColor}"></span>
              ${d.name}
              <small style="margin-left:auto;font-size:10px;color:var(--text3)">${d.groupShortName}</small>
            </button>`).join('')}
        </div>
      </div>`;
  }).join('');
}

// ─── SEARCH ──────────────────────────────────────────────────
let searchTimeout;

function initSearch() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');
  const results = document.getElementById('search-results');
  const overlay = document.getElementById('search-overlay');

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    clear.style.display = q ? 'block' : 'none';
    if (!q) { closeSearch(); return; }
    searchTimeout = setTimeout(() => doSearch(q), 80);
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) doSearch(input.value.trim());
  });

  clear.addEventListener('click', () => {
    input.value = '';
    clear.style.display = 'none';
    closeSearch();
    input.focus();
  });

  overlay.addEventListener('click', closeSearch);
}

function closeSearch() {
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('search-results').classList.remove('open');
  document.getElementById('search-overlay').style.display = 'none';
}

function doSearch(query) {
  const q = expandWithSynonyms(query.toLowerCase());
  const results = document.getElementById('search-results');
  const overlay = document.getElementById('search-overlay');

  // Search drugs
  const matchedDrugs = ALL_DRUGS.filter(d =>
    q.some(term =>
      d.name.toLowerCase().includes(term) ||
      (d.subgroup || '').toLowerCase().includes(term) ||
      d.groupName.toLowerCase().includes(term)
    )
  ).slice(0, 12);

  // Search groups
  const matchedGroups = DRUG_GROUPS.filter(g =>
    q.some(term =>
      g.name.toLowerCase().includes(term) ||
      g.mechanism.toLowerCase().includes(term)
    )
  ).slice(0, 4);

  if (!matchedDrugs.length && !matchedGroups.length) {
    results.innerHTML = `<div class="sr-none">Ничего не найдено по «${query}»</div>`;
  } else {
    let html = '';
    if (matchedDrugs.length) {
      html += `<div class="sr-group">
        <div class="sr-group-label">Препараты (${matchedDrugs.length})</div>
        ${matchedDrugs.map(d => `
          <button class="sr-item" onclick="closeSearch();openDrug('${d.id}')">
            <span class="sr-dot" style="background:${d.groupColor}"></span>
            <span class="sr-name">${highlight(d.name, query)}</span>
            <span class="sr-sub">${d.groupShortName}</span>
          </button>`).join('')}
      </div>`;
    }
    if (matchedGroups.length) {
      html += `<div class="sr-group">
        <div class="sr-group-label">Группы</div>
        ${matchedGroups.map(g => `
          <button class="sr-item" onclick="closeSearch();filterByGroup('${g.id}');if(window.innerWidth<769)switchMobileTab('drugs')">
            <span class="sr-dot" style="background:${g.color}"></span>
            <span class="sr-name">${highlight(g.name, query)}</span>
            <span class="sr-sub">${g.drugs.length} пр.</span>
          </button>`).join('')}
      </div>`;
    }
    const total = matchedDrugs.length + matchedGroups.length;
    html += `<div class="sr-count">Найдено: ${total}</div>`;
    results.innerHTML = html;
  }

  results.style.display = 'block';
  results.classList.add('open');
  overlay.style.display = 'block';
}

function expandWithSynonyms(query) {
  const terms = [query];
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    if (query.includes(key) || vals.some(v => query.includes(v))) {
      terms.push(...vals, key);
    }
  }
  return [...new Set(terms)];
}

function highlight(text, query) {
  const re = new RegExp(`(${escRe(query)})`, 'gi');
  return text.replace(re, '<mark class="sr-highlight">$1</mark>');
}
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ─── MOBILE TABS ─────────────────────────────────────────────
function switchMobileTab(tab) {
  state.activeMobileTab = tab;
  document.querySelectorAll('.mtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  const cols = document.getElementById('three-cols');
  const alphTab = document.getElementById('tab-alphabet');
  const favTab = document.getElementById('tab-favorites');

  cols.style.display = (tab === 'drugs' || tab === 'mechanisms' || tab === 'sections') ? 'grid' : 'none';
  alphTab.style.display = tab === 'alphabet' ? 'block' : 'none';
  favTab.style.display = tab === 'favorites' ? 'block' : 'none';

  if (tab === 'drugs') {
    document.getElementById('tab-drugs').style.display = '';
    document.getElementById('tab-mechanisms').style.display = 'none';
    document.getElementById('tab-sections').style.display = 'none';
  } else if (tab === 'mechanisms') {
    document.getElementById('tab-drugs').style.display = 'none';
    document.getElementById('tab-mechanisms').style.display = '';
    document.getElementById('tab-sections').style.display = 'none';
  } else if (tab === 'sections') {
    document.getElementById('tab-drugs').style.display = 'none';
    document.getElementById('tab-mechanisms').style.display = 'none';
    document.getElementById('tab-sections').style.display = '';
  }
}

// ─── MOBILE FILTER ───────────────────────────────────────────
function openMobileFilter() {
  const content = document.getElementById('mobile-filter-content');
  content.innerHTML = `
    <div style="padding:16px">
      <div class="filter-label" style="margin-bottom:10px">Группа препаратов</div>
      ${DRUG_GROUPS.map(g => `
        <button class="filter-item ${state.activeGroup === g.id ? 'active' : ''}"
          data-group="${g.id}"
          onclick="toggleGroupFilter('${g.id}');closeMobileFilter()">
          <span class="filter-dot" style="background:${g.color}"></span>
          <span class="filter-name">${g.name}</span>
          <span class="filter-num">${g.drugs.length}</span>
        </button>`).join('')}
      ${state.activeGroup ? `
        <button onclick="clearGroupFilter();closeMobileFilter()" class="reset-filters"
          style="margin-top:10px;padding:8px 14px;border:1px solid var(--border);border-radius:7px">
          Сбросить фильтр
        </button>` : ''}
    </div>`;
  document.getElementById('mobile-filter-overlay').style.display = 'flex';
}

function closeMobileFilter() {
  document.getElementById('mobile-filter-overlay').style.display = 'none';
}

// ─── URL HASH ────────────────────────────────────────────────
function updateHash(drugId) {
  history.replaceState(null, '', `#drug-${drugId}`);
}
function checkHash() {
  const hash = location.hash;
  if (hash.startsWith('#drug-')) {
    const id = hash.replace('#drug-', '');
    if (ALL_DRUGS.find(d => d.id === id)) openDrug(id);
  }
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ─── BACK TO TOP ─────────────────────────────────────────────
function initScrollBehavior() {
  const btn = document.getElementById('back-top');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─── BIND ALL EVENTS ─────────────────────────────────────────
function bindEvents() {
  // Theme
  document.getElementById('theme-btn').addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    save(); applyTheme();
  });

  // Card close (back btn)
  document.getElementById('card-back').addEventListener('click', closeCard);
  document.getElementById('card-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('card-overlay')) closeCard();
  });

  // Card actions
  document.getElementById('card-fav').addEventListener('click', () => {
    if (state.activeDrug) toggleFavorite(state.activeDrug);
  });
  document.getElementById('card-compare').addEventListener('click', () => {
    if (state.activeDrug) toggleCompare(state.activeDrug);
  });
  document.getElementById('card-copy').addEventListener('click', () => {
    if (state.activeDrug) {
      const url = `${location.origin}${location.pathname}#drug-${state.activeDrug}`;
      navigator.clipboard?.writeText(url).then(() => showToast('Ссылка скопирована!')).catch(() => showToast(url));
    }
  });

  // Fav button in header
  document.getElementById('fav-btn').addEventListener('click', () => {
    if (window.innerWidth < 769) switchMobileTab('favorites');
    else {
      // scroll to favorites or show a panel — on desktop just scroll
      switchMobileTab('favorites');
    }
  });

  // Compare header button
  document.getElementById('compare-btn').addEventListener('click', openCompare);
  document.getElementById('close-compare').addEventListener('click', closeCompare);
  document.getElementById('clear-compare').addEventListener('click', clearCompare);
  document.getElementById('compare-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('compare-overlay')) closeCompare();
  });

  // Section overlay
  document.getElementById('close-section').addEventListener('click', closeSection);
  document.getElementById('section-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('section-overlay')) closeSection();
  });

  // Mobile tabs
  document.querySelectorAll('.mtab').forEach(btn => {
    btn.addEventListener('click', () => switchMobileTab(btn.dataset.tab));
  });

  // Mobile filter
  document.getElementById('fab-filter').addEventListener('click', openMobileFilter);
  document.getElementById('close-mobile-filter').addEventListener('click', closeMobileFilter);
  document.getElementById('mobile-filter-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('mobile-filter-overlay')) closeMobileFilter();
  });

  // Reset filters
  document.getElementById('reset-filters').addEventListener('click', () => {
    clearGroupFilter();
  });

  // Recent clear
  document.getElementById('recent-clear').addEventListener('click', clearHistory);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCard(); closeCompare(); closeSection(); closeMobileFilter(); closeSearch();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    }
  });

  // Init sub-systems
  initSearch();
  initScrollBehavior();
  bindCompareSearch();
  updateFavCount();
  updateCompareCount();
}

// ═══════════════════════════════════════════════════════════════
// STUDY MODE
// ═══════════════════════════════════════════════════════════════

const studyState = {
  mode: 'flashcard',          // 'flashcard' | 'quiz'
  deck: [],                   // shuffled drug ids
  deckIndex: 0,
  flipped: false,
  selectedGroup: '',           // '' = all groups
  quizType: 'group',          // 'group' | 'mechanism' | 'which-drug'
  quizScore: { correct: 0, total: 0 },
  quizAnswered: false,
};

function initStudyMode() {
  buildDeck();
  renderStudy();

  // Mode toggle buttons
  document.querySelectorAll('.study-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.study-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      studyState.mode = btn.dataset.mode;
      studyState.quizScore = { correct: 0, total: 0 };
      buildDeck();
      renderStudy();
    });
  });
}

function buildDeck() {
  let source = studyState.selectedGroup
    ? ALL_DRUGS.filter(d => d.groupId === studyState.selectedGroup)
    : ALL_DRUGS;
  studyState.deck = shuffleArr([...source]);
  studyState.deckIndex = 0;
  studyState.flipped = false;
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderStudy() {
  const el = document.getElementById('study-content');
  if (!el) return;
  if (studyState.mode === 'flashcard') renderFlashcards(el);
  else renderQuiz(el);
}

// ── FLASHCARDS ──────────────────────────────────────────────────
function renderFlashcards(el) {
  const drug = studyState.deck[studyState.deckIndex];
  const group = drug ? DRUG_GROUPS.find(g => g.id === drug.groupId) : null;
  const total = studyState.deck.length;
  const idx = studyState.deckIndex;

  el.innerHTML = `
    <select class="study-group-select" id="fc-group-select" onchange="fcChangeGroup(this.value)">
      <option value="">Все группы (${ALL_DRUGS.length} карточек)</option>
      ${DRUG_GROUPS.map(g => `<option value="${g.id}" ${studyState.selectedGroup===g.id?'selected':''}>${g.name} (${g.drugs.length})</option>`).join('')}
    </select>

    <div class="flashcard-wrap">
      <div class="flashcard-progress">${idx + 1} / ${total}</div>

      <div class="flashcard ${studyState.flipped ? 'flipped' : ''}" id="fc-card" onclick="fcFlip()" title="Нажмите чтобы перевернуть">
        <div class="fc-front">
          <div class="fc-label">Препарат</div>
          <div class="fc-drug-name" style="color:${group?.color || 'var(--text)'}">${drug?.name || '—'}</div>
          <div class="fc-hint">Нажмите чтобы узнать группу и механизм</div>
        </div>
        <div class="fc-back">
          <div class="fc-label" style="color:${group?.color}">Ответ</div>
          <div class="fc-group-name" style="color:${group?.color}">${group?.name || '—'}</div>
          <div class="fc-mechanism">${group?.mechanism?.split(';')[0] || ''}</div>
          <div class="fc-subgroup">${drug?.subgroup || ''}</div>
        </div>
      </div>

      <div class="flashcard-controls">
        <button class="fc-btn" onclick="fcPrev()" ${idx === 0 ? 'disabled' : ''}>← Назад</button>
        <button class="fc-btn primary" onclick="fcFlip()">${studyState.flipped ? '↩ Вопрос' : '↩ Ответ'}</button>
        <button class="fc-btn" onclick="fcNext()" ${idx >= total - 1 ? 'disabled' : ''}>Вперёд →</button>
      </div>
      <button class="fc-shuffle-btn" onclick="fcShuffle()">🔀 Перемешать</button>
      <button class="fc-shuffle-btn" onclick="openDrug('${drug?.id}')">🔗 Открыть карточку</button>
    </div>`;
}

function fcFlip() {
  studyState.flipped = !studyState.flipped;
  const card = document.getElementById('fc-card');
  if (card) card.classList.toggle('flipped', studyState.flipped);
  // Update flip btn text
  const flipBtn = document.querySelector('.fc-btn.primary');
  if (flipBtn) flipBtn.textContent = studyState.flipped ? '↩ Вопрос' : '↩ Ответ';
}
function fcNext() {
  if (studyState.deckIndex < studyState.deck.length - 1) {
    studyState.deckIndex++; studyState.flipped = false;
    renderStudy();
  }
}
function fcPrev() {
  if (studyState.deckIndex > 0) {
    studyState.deckIndex--; studyState.flipped = false;
    renderStudy();
  }
}
function fcShuffle() {
  studyState.deck = shuffleArr([...studyState.deck]);
  studyState.deckIndex = 0; studyState.flipped = false;
  renderStudy(); showToast('Карточки перемешаны');
}
function fcChangeGroup(val) {
  studyState.selectedGroup = val;
  buildDeck(); renderStudy();
}

// ── QUIZ ────────────────────────────────────────────────────────
function renderQuiz(el) {
  const { correct, total } = studyState.quizScore;

  el.innerHTML = `
    <select class="quiz-type-select" id="quiz-type-sel" onchange="quizChangeType(this.value)">
      <option value="group" ${studyState.quizType==='group'?'selected':''}>Угадай группу препарата</option>
      <option value="mechanism" ${studyState.quizType==='mechanism'?'selected':''}>Угадай механизм действия</option>
      <option value="which-drug" ${studyState.quizType==='which-drug'?'selected':''}>Угадай препарат по описанию</option>
    </select>
    <div class="quiz-score">Правильно: ${correct} / ${total}</div>
    <div id="quiz-question-area"></div>`;

  generateQuestion();
}

function quizChangeType(val) {
  studyState.quizType = val;
  studyState.quizAnswered = false;
  renderStudy();
}

function generateQuestion() {
  const area = document.getElementById('quiz-question-area');
  if (!area) return;

  studyState.quizAnswered = false;
  const drug = studyState.deck[studyState.deckIndex % studyState.deck.length];
  const group = DRUG_GROUPS.find(g => g.id === drug.groupId);

  let question = '', correctAnswer = '', options = [];

  if (studyState.quizType === 'group') {
    question = `К какой фармакологической группе относится препарат «${drug.name}»?`;
    correctAnswer = group.name;
    const wrong = shuffleArr(DRUG_GROUPS.filter(g => g.id !== group.id)).slice(0, 3).map(g => g.name);
    options = shuffleArr([correctAnswer, ...wrong]);
  } else if (studyState.quizType === 'mechanism') {
    question = `Какой механизм действия у группы «${group.name}»?`;
    correctAnswer = group.mechanism.split(';')[0];
    const wrong = shuffleArr(DRUG_GROUPS.filter(g => g.id !== group.id)).slice(0, 3).map(g => g.mechanism.split(';')[0]);
    options = shuffleArr([correctAnswer, ...wrong]);
  } else {
    // which-drug: description → drug name
    question = `Какой препарат описан: «${drug.subgroup || group.mechanism.split(';')[0]}»?`;
    correctAnswer = drug.name;
    const sameGroup = group.drugs.filter(d => d.id !== drug.id);
    const wrong = shuffleArr(sameGroup.length >= 3 ? sameGroup : ALL_DRUGS.filter(d => d.id !== drug.id)).slice(0, 3).map(d => d.name);
    options = shuffleArr([correctAnswer, ...wrong]);
  }

  area.innerHTML = `
    <div class="quiz-question">${question}</div>
    <div class="quiz-options">
      ${options.map(opt => `
        <button class="quiz-opt" onclick="checkAnswer(this, '${escapeJs(opt)}', '${escapeJs(correctAnswer)}')">${opt}</button>
      `).join('')}
    </div>
    <div class="quiz-feedback" id="quiz-feedback"></div>
    <div style="text-align:center">
      <button class="fc-btn" id="quiz-next-btn" onclick="quizNext()" style="display:none">Следующий вопрос →</button>
    </div>`;
}

function checkAnswer(btn, selected, correct) {
  if (studyState.quizAnswered) return;
  studyState.quizAnswered = true;
  studyState.quizScore.total++;

  const isCorrect = selected === correct;
  if (isCorrect) studyState.quizScore.correct++;

  // Mark buttons
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.disabled = true;
    const text = b.textContent.trim();
    if (text === correct) b.classList.add('correct');
    else if (text === selected && !isCorrect) b.classList.add('wrong');
  });

  const fb = document.getElementById('quiz-feedback');
  fb.textContent = isCorrect ? '✓ Правильно!' : `✗ Неверно. Правильный ответ: ${correct}`;
  fb.className = `quiz-feedback show ${isCorrect ? 'correct' : 'wrong'}`;

  // Update score
  const scoreEl = document.querySelector('.quiz-score');
  if (scoreEl) scoreEl.textContent = `Правильно: ${studyState.quizScore.correct} / ${studyState.quizScore.total}`;

  document.getElementById('quiz-next-btn').style.display = 'inline-block';
}

function quizNext() {
  studyState.deckIndex++;
  if (studyState.deckIndex >= studyState.deck.length) {
    studyState.deck = shuffleArr([...studyState.deck]);
    studyState.deckIndex = 0;
  }
  studyState.quizAnswered = false;
  generateQuestion();
}

function escapeJs(s) { return s.replace(/'/g, "\\'").replace(/"/g, '\\"'); }

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TABLE
// ═══════════════════════════════════════════════════════════════

let tableSort = { col: 'group', dir: 1 };

function renderOverviewTable(filterText) {
  const el = document.getElementById('table-content');
  if (!el) return;

  const q = (filterText || '').toLowerCase();
  let rows = ALL_DRUGS.filter(d =>
    !q || d.name.toLowerCase().includes(q) ||
    d.groupName.toLowerCase().includes(q) ||
    (d.subgroup || '').toLowerCase().includes(q)
  );

  // Sort
  rows.sort((a, b) => {
    const va = tableSort.col === 'name' ? a.name : a.groupName;
    const vb = tableSort.col === 'name' ? b.name : b.groupName;
    return va.localeCompare(vb, 'ru') * tableSort.dir;
  });

  const arrow = (col) => {
    if (tableSort.col !== col) return '<span class="sort-arrow">↕</span>';
    return `<span class="sort-arrow">${tableSort.dir === 1 ? '↑' : '↓'}</span>`;
  };

  el.innerHTML = `
    <table class="ov-table">
      <thead>
        <tr>
          <th onclick="sortTable('group')" class="${tableSort.col==='group'?'sorted':''}">
            Группа ${arrow('group')}
          </th>
          <th onclick="sortTable('name')" class="${tableSort.col==='name'?'sorted':''}">
            Препарат ${arrow('name')}
          </th>
          <th>Механизм действия</th>
          <th>Особенности</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(d => {
          const g = DRUG_GROUPS.find(g => g.id === d.groupId);
          return `
            <tr>
              <td>
                <span class="ov-group-badge"
                  style="background:${g.colorBg};color:${g.color};border:1px solid ${g.color}44">
                  ${g.shortName}
                </span>
              </td>
              <td>
                <button class="ov-drug-link" onclick="openDrug('${d.id}')">${d.name}</button>
              </td>
              <td class="ov-mech-cell">${g.mechanism.split(';')[0]}</td>
              <td style="font-size:11.5px;color:var(--text3)">${d.subgroup ? d.subgroup.split('—')[0].trim() : '—'}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="padding:8px 4px;font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace">
      Показано: ${rows.length} из ${ALL_DRUGS.length} препаратов
    </div>`;
}

function sortTable(col) {
  if (tableSort.col === col) tableSort.dir *= -1;
  else { tableSort.col = col; tableSort.dir = 1; }
  renderOverviewTable(document.getElementById('table-filter')?.value || '');
}

function initTableTab() {
  renderOverviewTable();
  const filterInput = document.getElementById('table-filter');
  const sortSelect = document.getElementById('table-sort');
  if (filterInput) {
    filterInput.addEventListener('input', () => renderOverviewTable(filterInput.value));
  }
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      tableSort.col = sortSelect.value; tableSort.dir = 1;
      renderOverviewTable(filterInput?.value || '');
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// PATCH: extend switchMobileTab for new tabs
// ═══════════════════════════════════════════════════════════════

const _origSwitch = switchMobileTab;
// Override to handle new tabs
window.switchMobileTab = function(tab) {
  state.activeMobileTab = tab;
  document.querySelectorAll('.mtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  const cols = document.getElementById('three-cols');
  const alphTab = document.getElementById('tab-alphabet');
  const favTab = document.getElementById('tab-favorites');
  const studyTab = document.getElementById('tab-study');
  const tableTab = document.getElementById('tab-table');

  const specialTabs = ['alphabet', 'favorites', 'study', 'table'];
  cols.style.display = specialTabs.includes(tab) ? 'none' : 'grid';
  alphTab.style.display = tab === 'alphabet' ? 'block' : 'none';
  favTab.style.display = tab === 'favorites' ? 'block' : 'none';
  studyTab.style.display = tab === 'study' ? 'block' : 'none';
  tableTab.style.display = tab === 'table' ? 'block' : 'none';

  if (!specialTabs.includes(tab)) {
    document.getElementById('tab-drugs').style.display = tab === 'drugs' ? '' : 'none';
    document.getElementById('tab-mechanisms').style.display = tab === 'mechanisms' ? '' : 'none';
    document.getElementById('tab-sections').style.display = tab === 'sections' ? '' : 'none';
  }

  // Lazy init
  if (tab === 'study' && !studyTab.dataset.init) {
    studyTab.dataset.init = '1';
    setTimeout(initStudyMode, 50);
  }
  if (tab === 'table' && !tableTab.dataset.init) {
    tableTab.dataset.init = '1';
    setTimeout(initTableTab, 50);
  }
};

// Also expose study/table from desktop — add desktop nav links at bottom of bindEvents
const _origBind = bindEvents;
// Extend renderAll to also show study + table in desktop sidebar-like nav
// For desktop, add table + study buttons to header area
(function addDesktopExtras() {
  document.addEventListener('DOMContentLoaded', () => {
    // Add Study & Table quick-access to header on desktop
    const actions = document.querySelector('.header-actions');
    if (!actions) return;

    const studyBtn = document.createElement('button');
    studyBtn.className = 'icon-btn';
    studyBtn.title = 'Режим обучения';
    studyBtn.setAttribute('aria-label', 'Обучение');
    studyBtn.innerHTML = '🎓';
    studyBtn.style.fontSize = '16px';
    studyBtn.addEventListener('click', () => {
      const tab = document.getElementById('tab-study');
      if (!tab) return;
      // On desktop, toggle a study panel below the columns
      tab.style.display = tab.style.display === 'block' ? 'none' : 'block';
      if (tab.style.display === 'block' && !tab.dataset.init) {
        tab.dataset.init = '1';
        setTimeout(initStudyMode, 50);
      }
      // Also slide into mobile if mobile
      if (window.innerWidth < 769) switchMobileTab('study');
    });

    const tableBtn = document.createElement('button');
    tableBtn.className = 'icon-btn';
    tableBtn.title = 'Обзорная таблица';
    tableBtn.setAttribute('aria-label', 'Таблица');
    tableBtn.innerHTML = '📋';
    tableBtn.style.fontSize = '15px';
    tableBtn.addEventListener('click', () => {
      const tab = document.getElementById('tab-table');
      if (!tab) return;
      tab.style.display = tab.style.display === 'block' ? 'none' : 'block';
      if (tab.style.display === 'block' && !tab.dataset.init) {
        tab.dataset.init = '1';
        setTimeout(initTableTab, 50);
      }
      if (window.innerWidth < 769) switchMobileTab('table');
    });

    actions.insertBefore(tableBtn, actions.firstChild);
    actions.insertBefore(studyBtn, actions.firstChild);
  });
})();
