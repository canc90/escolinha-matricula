(function () {
  const NAV_ITEMS = {
    admin: [
      { href: 'dashboard.html', label: 'Dashboard' },
      { href: 'alunos.html', label: 'Alunos' },
      { href: 'professoras.html', label: 'Professoras' },
      { href: 'turmas-page', label: 'Turmas' },
      { href: 'diario-page', label: 'Diário' },
      { href: 'frequencias', label: 'Chamada' },
      { href: 'visualizar-chamadas', label: 'Relatório' },
      { href: 'dashboard-pedagogico', label: 'Painel Pedagógico' },
      { href: 'direcao', label: 'Direção' },
      { href: 'ia-educacional', label: 'IA' },
      { href: 'users', label: 'Usuários' },
    ],
    direcao: [
      { href: 'dashboard.html', label: 'Dashboard' },
      { href: 'alunos.html', label: 'Alunos' },
      { href: 'professoras.html', label: 'Professoras' },
      { href: 'turmas-page', label: 'Turmas' },
      { href: 'diario-page', label: 'Diário' },
      { href: 'frequencias', label: 'Chamada' },
      { href: 'visualizar-chamadas', label: 'Relatório' },
      { href: 'dashboard-pedagogico', label: 'Painel Pedagógico' },
      { href: 'direcao', label: 'Direção' },
      { href: 'ia-educacional', label: 'IA' },
      { href: 'users', label: 'Usuários' },
    ],
    pedagogico: [
      { href: 'dashboard.html', label: 'Dashboard' },
      { href: 'alunos.html', label: 'Alunos' },
      { href: 'turmas-page', label: 'Turmas' },
      { href: 'diario-page', label: 'Diário' },
      { href: 'frequencias', label: 'Chamada' },
      { href: 'visualizar-chamadas', label: 'Relatório' },
      { href: 'dashboard-pedagogico', label: 'Painel Pedagógico' },
      { href: 'direcao', label: 'Direção' },
      { href: 'ia-educacional', label: 'IA' },
      { href: 'users', label: 'Usuários' },
    ],
    professor: [
      { href: 'dashboard-professora', label: 'Dashboard' },
      { href: 'alunos.html', label: 'Alunos' },
      { href: 'diario-page', label: 'Diário' },
      { href: 'frequencias', label: 'Chamada' },
      { href: 'users', label: 'Usuários' },
    ],
    professora: [
      { href: 'dashboard-professora', label: 'Dashboard' },
      { href: 'alunos.html', label: 'Alunos' },
      { href: 'diario-page', label: 'Diário' },
      { href: 'frequencias', label: 'Chamada' },
      { href: 'users', label: 'Usuários' },
    ],
  };

  function getUserRole() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'admin';
    } catch (e) {
      return null;
    }
  }

  function renderNavbar() {
    const role = getUserRole();
    const items = NAV_ITEMS[role] || NAV_ITEMS.admin;
    const container = document.getElementById('navbarLinks');
    const navbar = container?.closest('.navbar');
    if (!container || !navbar) return;

    const collapseId = 'navbarNav';
    let collapseDiv = navbar.querySelector('.navbar-collapse');
    if (!collapseDiv) {
      collapseDiv = document.createElement('div');
      collapseDiv.className = 'collapse navbar-collapse';
      collapseDiv.id = collapseId;
      container.parentNode.insertBefore(collapseDiv, container);
      collapseDiv.appendChild(container);
    }

    let toggler = navbar.querySelector('.navbar-toggler');
    if (!toggler) {
      toggler = document.createElement('button');
      toggler.className = 'navbar-toggler';
      toggler.type = 'button';
      toggler.setAttribute('data-bs-toggle', 'collapse');
      toggler.setAttribute('data-bs-target', '#' + collapseId);
      toggler.setAttribute('aria-controls', collapseId);
      toggler.setAttribute('aria-expanded', 'false');
      toggler.setAttribute('aria-label', 'Toggle navigation');
      toggler.innerHTML = '<span class="navbar-toggler-icon"></span>';
      navbar.querySelector('.container-fluid').appendChild(toggler);
    }

    container.innerHTML = '';
    const nav = document.createElement('ul');
    nav.className = 'navbar-nav me-auto mb-2 mb-lg-0';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'nav-item';
      const a = document.createElement('a');
      a.className = 'nav-link text-white';
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      nav.appendChild(li);
    });
    container.appendChild(nav);

    const logoutLi = document.createElement('li');
    logoutLi.className = 'nav-item';
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutBtn';
    logoutBtn.className = 'btn btn-outline-light';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', logout);
    logoutLi.appendChild(logoutBtn);
    container.appendChild(logoutLi);
  }

  function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }

  function init() {
    renderNavbar();
    window.addEventListener('storage', function (e) {
      if (e.key === 'token') renderNavbar();
    });
  }

  init();
})();