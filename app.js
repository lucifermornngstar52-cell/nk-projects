// ===== CONFIG =====
const GITHUB_REPOS = [
  'lucifermornngstar52-cell/aika-assistant',
  'lucifermornngstar52-cell/airi-assistant',
  'lucifermornngstar52-cell/clock-angle-game',
  'lucifermornngstar52-cell/aika-admin'
];

const ADMIN_PASSWORD = 'nikita2026';

// Предзаполненные проекты (показываются всегда, дополняются релизами)
const DEFAULT_PROJECTS = [
  {
    id: 'default_aika',
    name: 'Aika Assistant',
    desc: 'AI-ассистент для Android с 3D-аватаром, голосовым управлением, доступом к экрану и автоматизацией задач. Live2D и 3D модели, оверлей поверх других приложений.',
    category: 'app',
    icon: 'aika-banner.png',
    repo: 'lucifermornngstar52-cell/aika-assistant',
    version: '—',
    url: '',
    date: '2026-08-11T00:00:00Z',
    downloads: 0,
    shots: [],
    auto: false,
    platforms: ['android']
  },
  {
    id: 'default_airi',
    name: 'AIRI Assistant',
    desc: 'AI-ассистент с тёмным UI на Flutter + GPT-4o-mini. Голосовое управление, чат, автоматизация задач.',
    category: 'app',
    icon: '🌙',
    repo: 'lucifermornngstar52-cell/airi-assistant',
    version: '—',
    url: '',
    date: '2026-07-26T00:00:00Z',
    downloads: 0,
    shots: [],
    auto: false,
    platforms: ['android']
  },
  {
    id: 'default_clock',
    name: 'Хранители Времени',
    desc: 'Образовательная игра по математике времени для детей 1-5 классов. Учи углы стрелок часов в увлекательной форме! Android APK + Windows EXE.',
    category: 'game',
    icon: '🕐',
    repo: 'lucifermornngstar52-cell/clock-angle-game',
    version: 'v16',
    url: '',
    date: '2026-08-11T10:32:52Z',
    downloads: 0,
    shots: [],
    auto: false,
    platforms: ['android', 'windows']
  },
  {
    id: 'default_aika_admin',
    name: 'Aika Admin Panel',
    desc: 'Панель управления лицензиями для Aika Assistant. Управление доступом, ключами и пользователями.',
    category: 'tool',
    icon: '🔧',
    repo: 'lucifermornngstar52-cell/aika-admin',
    version: '—',
    url: '',
    date: '2026-06-06T00:00:00Z',
    downloads: 0,
    shots: [],
    auto: false,
    platforms: ['web']
  }
];

// ===== STATE =====
let projects = [];
let currentFilter = 'all';
let isAdmin = false;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  setupNavFilters();
});

function setupNavFilters() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentFilter = link.dataset.filter;
      renderProjects();
    });
  });
}

// ===== LOAD PROJECTS =====
async function loadProjects() {
  const custom = JSON.parse(localStorage.getItem('nk_projects') || '[]');
  projects = [...DEFAULT_PROJECTS, ...custom];

  // Загружаем релизы из всех репозиториев
  for (const repo of GITHUB_REPOS) {
    try {
      const releases = await fetchGitHubReleases(repo);
      for (const rel of releases) {
        const assets = rel.assets || [];
        // Ищем APK, EXE, ZIP
        const apk = assets.find(a => a.name.endsWith('.apk'));
        const exe = assets.find(a => a.name.endsWith('.exe'));
        const zip = assets.find(a => a.name.endsWith('.zip'));
        const primaryAsset = apk || exe || zip || assets[0];

        // Ищем matching default project
        const existing = projects.find(p => p.repo === repo && !p.auto);

        if (existing) {
          // Обновляем существующий проект данными из релиза
          if (primaryAsset && !existing.url) existing.url = primaryAsset.browser_download_url;
          if (rel.tag_name && (existing.version === '—' || existing.version === 'v16')) existing.version = rel.tag_name;
          existing.downloads = (existing.downloads || 0) + assets.reduce((s, a) => s + a.download_count, 0);
          if (rel.published_at && new Date(rel.published_at) > new Date(existing.date || 0)) existing.date = rel.published_at;
          // Мержим все ассеты из всех релизов
          if (!existing.allAssets) existing.allAssets = [];
          const newAssets = assets.map(a => ({
            name: a.name,
            url: a.browser_download_url,
            size: a.size,
            downloads: a.download_count
          }));
          // Не дублируем ассеты по имени
          for (const na of newAssets) {
            if (!existing.allAssets.find(a => a.name === na.name)) existing.allAssets.push(na);
          }
          // Объединяем платформы
          const relPlatforms = detectPlatforms(assets);
          if (!existing.platforms) existing.platforms = [];
          for (const p of relPlatforms) {
            if (!existing.platforms.includes(p)) existing.platforms.push(p);
          }
        } else {
          // Создаём новый проект из релиза
          const isGame = repo.includes('clock') || repo.includes('game');
          projects.push({
            id: 'gh_' + repo + '_' + rel.tag_name,
            name: formatRepoName(repo),
            desc: rel.body ? rel.body.substring(0, 200) : 'Релиз ' + rel.tag_name,
            category: isGame ? 'game' : 'app',
            icon: '📦',
            repo: repo,
            version: rel.tag_name || '—',
            url: primaryAsset ? primaryAsset.browser_download_url : rel.html_url,
            downloads: assets.reduce((s, a) => s + a.download_count, 0),
            date: rel.published_at,
            shots: [],
            auto: true,
            platforms: detectPlatforms(assets),
            allAssets: assets.map(a => ({
              name: a.name,
              url: a.browser_download_url,
              size: a.size,
              downloads: a.download_count
            }))
          });
        }
      }
    } catch (e) {
      console.log('GitHub API error for', repo, e);
    }
  }

  // Обновляем clock-angle-game с правильными ассетами
  const clock = projects.find(p => p.repo === 'lucifermornngstar52-cell/clock-angle-game');
  if (clock && clock.version === '—') clock.version = 'v16';

  // Debug logging
  const clockProj = projects.find(p => p.id === 'default_clock');
  if (clockProj) {
    console.log('[DEBUG] Clock project:', {
      version: clockProj.version,
      downloads: clockProj.downloads,
      allAssets: clockProj.allAssets ? clockProj.allAssets.length : 'undefined',
      url: clockProj.url,
      platforms: clockProj.platforms
    });
    if (clockProj.allAssets) {
      clockProj.allAssets.forEach(a => console.log('  asset:', a.name, a.size, a.url.substring(0, 60)));
    }
  }

  projects.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  renderProjects();
  updateStats();
}

function detectPlatforms(assets) {
  const platforms = [];
  if (assets.some(a => a.name.endsWith('.apk'))) platforms.push('android');
  if (assets.some(a => a.name.endsWith('.exe'))) platforms.push('windows');
  if (assets.some(a => a.name.endsWith('.zip'))) platforms.push('pwa');
  return platforms.length ? platforms : ['other'];
}

async function fetchGitHubReleases(repo) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=10`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('GitHub API: ' + resp.status);
  return resp.json();
}

function formatRepoName(repo) {
  const name = repo.split('/')[1] || repo;
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ===== RENDER =====
function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (projects.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">📂</div><p>Пока нет проектов</p></div>`;
    return;
  }

  const filtered = currentFilter === 'all'
    ? projects
    : projects.filter(p => p.category === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">🔍</div><p>Нет проектов в этой категории</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const iconHtml = p.icon && (p.icon.startsWith('http') || p.icon.match(/\.(png|jpg|jpeg|webp|gif|svg)/i))
      ? `<img src="${p.icon}" alt="${p.name}">`
      : p.icon || '📦';

    const platformIcons = (p.platforms || []).map(pl => {
      const icons = { android: '🤖', windows: '🪟', web: '🌐', pwa: '📱', other: '📦' };
      return icons[pl] || '📦';
    }).join(' ');

    const dlBtn = p.url
      ? `<button class="card-download" onclick="event.stopPropagation();downloadProject('${p.id}')">⬇ Скачать</button>`
      : `<button class="card-download" disabled>Скоро</button>`;

    return `
      <div class="project-card" onclick="openModal('${p.id}')">
        <div class="card-banner">${iconHtml}
          ${p.downloads ? `<span class="card-badge">⬇ ${p.downloads}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-title">${p.name}</div>
          <div class="card-desc">${p.desc}</div>
          <div class="card-footer">
            <span class="card-version">${platformIcons} v${p.version}</span>
            ${dlBtn}
          </div>
        </div>
      </div>`;
  }).join('');
}

function updateStats() {
  document.getElementById('statApps').textContent = projects.length;
  const totalDl = projects.reduce((s, p) => s + (p.downloads || 0), 0);
  document.getElementById('statDownloads').textContent = totalDl > 1000 ? (totalDl / 1000).toFixed(1) + 'k' : totalDl;
  if (projects.length > 0) {
    document.getElementById('statLatest').textContent = projects[0].version || '—';
  }
}

// ===== MODAL =====
function openModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;

  const iconHtml = p.icon && (p.icon.startsWith('http') || p.icon.match(/\.(png|jpg|jpeg|webp|gif|svg)/i))
    ? `<img src="${p.icon}" alt="${p.name}">`
    : p.icon || '📦';

  const shotsHtml = p.shots && p.shots.length
    ? `<div class="modal-shots">${p.shots.map(s => `<img src="${s}" alt="screenshot">`).join('')}</div>`
    : '';

  const platformIcons = (p.platforms || []).map(pl => {
    const icons = { android: '🤖 Android', windows: '🪟 Windows', web: '🌐 Web', pwa: '📱 PWA', other: '📦' };
    return `<span class="meta-item">${icons[pl] || '📦'}</span>`;
  }).join('');

  const metaHtml = `
    <div class="modal-meta">
      <span class="meta-item">📅 ${p.date ? new Date(p.date).toLocaleDateString('ru') : '—'}</span>
      <span class="meta-item">⬇ ${p.downloads || 0} загрузок</span>
      ${platformIcons}
    </div>`;

  // Если есть несколько ассетов — показываем все
  let dlBtn;
  if (p.allAssets && p.allAssets.length > 1) {
    dlBtn = `<div class="modal-assets">${p.allAssets.map(a => {
      const icon = a.name.endsWith('.apk') ? '🤖' : a.name.endsWith('.exe') ? '🪟' : a.name.endsWith('.zip') ? '📦' : '📄';
      const sizeMb = (a.size / 1024 / 1024).toFixed(1);
      return `<a href="${a.url}" download class="btn-asset"><span>${icon} ${a.name}</span><small>${sizeMb} MB · ⬇ ${a.downloads}</small></a>`;
    }).join('')}</div>`;
  } else if (p.url) {
    dlBtn = `<a href="${p.url}" download class="btn-primary">⬇ Скачать</a>`;
  } else {
    dlBtn = `<button class="btn-primary" disabled>Файл недоступен</button>`;
  }

  const githubBtn = p.repo ? `<a href="https://github.com/${p.repo}" target="_blank" class="btn-secondary">📂 GitHub</a>` : '';
  const isMultiAsset = p.allAssets && p.allAssets.length > 1;
  
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-icon">${iconHtml}</div>
    <h2>${p.name}</h2>
    <p class="modal-version">Версия ${p.version}</p>
    ${metaHtml}
    <p class="modal-desc">${p.desc}</p>
    ${shotsHtml}
    ${isMultiAsset ? `<div class="modal-assets-section"><h4>Файлы для скачивания:</h4>${dlBtn}</div>` : ''}
    <div class="modal-actions">
      ${isMultiAsset ? githubBtn : dlBtn + githubBtn}
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('active');
}

function downloadProject(id) {
  const p = projects.find(x => x.id === id);
  if (p && p.url) window.open(p.url, '_blank');
}

// ===== ADMIN =====
function toggleAdmin() {
  const panel = document.getElementById('adminPanel');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'flex';
  if (!visible && isAdmin) {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    renderAdminList();
  }
}

function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    renderAdminList();
  } else {
    document.getElementById('adminHint').textContent = 'Неверный пароль';
  }
}

function addProject() {
  const name = document.getElementById('projName').value.trim();
  if (!name) { alert('Введите название'); return; }

  const shots = document.getElementById('projShots').value.trim()
    .split(',').map(s => s.trim()).filter(s => s);

  const project = {
    id: 'custom_' + Date.now(),
    name: name,
    desc: document.getElementById('projDesc').value.trim() || 'Без описания',
    category: document.getElementById('projCategory').value,
    icon: document.getElementById('projIcon').value.trim() || '📦',
    repo: document.getElementById('projRepo').value.trim() || '',
    version: document.getElementById('projVersion').value.trim() || '1.0.0',
    url: document.getElementById('projUrl').value.trim() || '',
    date: new Date().toISOString(),
    downloads: 0,
    shots: shots,
    platforms: ['other']
  };

  if (project.repo && !project.url) {
    fetchGitHubReleases(project.repo).then(releases => {
      if (releases.length > 0) {
        const apk = releases[0].assets.find(a => a.name.endsWith('.apk'));
        if (apk) {
          project.url = apk.browser_download_url;
          project.version = releases[0].tag_name;
          project.downloads = releases[0].assets.reduce((s, a) => s + a.download_count, 0);
          project.date = releases[0].published_at;
        }
      }
      saveProject(project);
    }).catch(() => saveProject(project));
  } else {
    saveProject(project);
  }
}

function saveProject(project) {
  const custom = JSON.parse(localStorage.getItem('nk_projects') || '[]');
  custom.push(project);
  localStorage.setItem('nk_projects', JSON.stringify(custom));

  ['projName','projDesc','projIcon','projRepo','projVersion','projUrl','projShots']
    .forEach(id => document.getElementById(id).value = '');

  loadProjects();
  renderAdminList();
}

function renderAdminList() {
  const list = document.getElementById('adminProjectList');
  const custom = JSON.parse(localStorage.getItem('nk_projects') || '[]');
  if (custom.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:14px;">Нет кастомных проектов</p>';
    return;
  }
  list.innerHTML = custom.map(p => `
    <div class="admin-project-item">
      <span>${p.icon || '📦'} ${p.name} (v${p.version})</span>
      <button onclick="deleteProject('${p.id}')">Удалить</button>
    </div>
  `).join('');
}

function deleteProject(id) {
  if (!confirm('Удалить проект?')) return;
  const custom = JSON.parse(localStorage.getItem('nk_projects') || '[]');
  const filtered = custom.filter(p => p.id !== id);
  localStorage.setItem('nk_projects', JSON.stringify(filtered));
  loadProjects();
  renderAdminList();
}
