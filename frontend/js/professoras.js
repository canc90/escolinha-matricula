(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  var loginProfessoraId = null;

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  var TURMAS_MAP = {};
  var TURMAS_LIST = [];

  async function loadTurmas() {
    try {
      var data = await api.get('/api/turmas');
      var turmas = data.turmas || data.data || data || [];
      TURMAS_LIST = turmas;
      TURMAS_MAP = {};
      turmas.forEach(function (t) { TURMAS_MAP[t.id] = t.nome; });
      var selects = ['turmaInput', 'turmaFilter'];
      selects.forEach(function (sid) {
        var sel = document.getElementById(sid);
        if (!sel) return;
        var currentVal = sel.value;
        sel.innerHTML = '<option value="">' + (sid === 'turmaFilter' ? 'Todas as turmas' : 'Selecione') + '</option>';
        turmas.forEach(function (t) {
          var opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.nome;
          sel.appendChild(opt);
        });
        if (currentVal) sel.value = currentVal;
      });
    } catch (e) { console.error('Erro ao carregar turmas:', e); }
  }

  var PAGE_SIZE = 10;
  var currentPage = 1, totalPages = 1, deleteId = null, editingId = null;

  async function fetchProfessoras(page) {
    page = page || 1;
    var search = document.getElementById('searchInput').value;
    var turma = document.getElementById('turmaFilter').value;
    var turno = document.getElementById('turnoFilter').value;
    var params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    if (search) params.set('search', search);
    if (turma) params.set('turma', turma);
    if (turno) params.set('turno', turno);
    try {
      var data = await api.get('/api/professoras?' + params.toString());
      if (!data) return;
      totalPages = data.totalPages || 1;
      currentPage = data.page || 1;
      renderTable(data.professoras || []);
      renderPagination();
    } catch (e) { alert(e.message); }
  }

  function applyFilters() { currentPage = 1; fetchProfessoras(1); }

  function renderTable(professoras) {
    var tbody = document.getElementById('professorasTbody');
    tbody.innerHTML = '';
    professoras.forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML = [
        '<td>' + escapeHtml(p.nome) + '</td>',
        '<td>' + escapeHtml(p.email) + '</td>',
        '<td>' + escapeHtml(p.telefone) + '</td>',
        '<td>' + escapeHtml(p.especialidade) + '</td>',
        '<td>' + escapeHtml(TURMAS_MAP[p.turma] || p.turma || '') + '</td>',
        '<td>' + escapeHtml(p.turno) + '</td>',
        '<td>' +
          '<button class="btn btn-sm btn-info me-1 btn-visualizar" data-id="' + p.id + '">Visualizar</button>' +
          '<button class="btn btn-sm btn-warning me-1 btn-editar" data-id="' + p.id + '">Editar</button>' +
          '<button class="btn btn-sm btn-warning me-1 btn-login" data-id="' + p.id + '" data-nome="' + escapeHtml(p.nome) + '">Login</button>' +
          '<button class="btn btn-sm btn-danger" data-id="' + p.id + '">Excluir</button>' +
        '</td>'
      ].join('');
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button.btn-visualizar').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'));
        window.verProfessora(id);
      });
    });
    tbody.querySelectorAll('button.btn-editar').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'));
        window.editarProfessora(id);
      });
    });
    tbody.querySelectorAll('button.btn-login').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'));
        var nome = this.getAttribute('data-nome');
        window.criarLogin(id, nome);
      });
    });
    tbody.querySelectorAll('button.btn-danger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteId = this.getAttribute('data-id');
        new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show();
      });
    });
  }

  function renderPagination() {
    var ul = document.getElementById('pagination');
    ul.innerHTML = '';
    if (totalPages <= 1) return;
    function createPageItem(pageNum, label, active, disabled) {
      label = label || pageNum; active = active || false; disabled = disabled || false;
      var li = document.createElement('li');
      li.className = 'page-item' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
      li.innerHTML = '<a class="page-link" href="#">' + label + '</a>';
      li.addEventListener('click', function (e) { e.preventDefault(); if (!disabled) { currentPage = pageNum; fetchProfessoras(currentPage); } });
      return li;
    }
    ul.appendChild(createPageItem(currentPage - 1, '&laquo;', false, currentPage === 1));
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, startPage + 4);
    for (var p = startPage; p <= endPage; p++) ul.appendChild(createPageItem(p, p, p === currentPage));
    ul.appendChild(createPageItem(currentPage + 1, '&raquo;', false, currentPage === totalPages));
  }

  function resetForm() {
    document.getElementById('professoraId').value = '';
    document.getElementById('nomeInput').value = '';
    document.getElementById('emailInput').value = '';
    document.getElementById('telefoneInput').value = '';
    document.getElementById('especialidadeInput').value = '';
    document.getElementById('turmaInput').value = '';
    document.getElementById('turnoInput').value = '';
    document.getElementById('fotoInput').value = '';
    document.getElementById('documentoInput').value = '';
  }

  function openCreateModal() {
    editingId = null;
    document.getElementById('professoraModalLabel').textContent = 'Nova Professora';
    resetForm();
    new bootstrap.Modal(document.getElementById('professoraModal')).show();
  }

  window.editarProfessora = async function (id) {
    try {
      var p = await api.get('/api/professoras/' + id);
      if (!p) return;
      editingId = p.id;
      document.getElementById('professoraModalLabel').textContent = 'Editar Professora';
      document.getElementById('professoraId').value = p.id;
      document.getElementById('nomeInput').value = p.nome || '';
      document.getElementById('emailInput').value = p.email || '';
      document.getElementById('telefoneInput').value = p.telefone || '';
      document.getElementById('especialidadeInput').value = p.especialidade || '';
      document.getElementById('turmaInput').value = p.turma || '';
      document.getElementById('turnoInput').value = p.turno || '';
      new bootstrap.Modal(document.getElementById('professoraModal')).show();
    } catch (e) { alert(e.message); }
  };

  window.verProfessora = async function (id) {
    try {
      var p = await api.get('/api/professoras/' + id);
      if (!p) return;
      var fotoHtml = p.foto ? '<div class="row mb-2"><div class="col-4 fw-semibold">Foto</div><div class="col-8"><img src="' + escapeHtml(p.foto) + '" class="rounded" style="max-width:120px;max-height:120px"></div></div>' : '';
      var docHtml = p.foto_documento ? '<div class="row mb-2"><div class="col-4 fw-semibold">Documento</div><div class="col-8"><img src="' + escapeHtml(p.foto_documento) + '" class="rounded border" style="max-width:200px;max-height:150px"></div></div>' : '';
      document.getElementById('viewProfessoraBody').innerHTML = [
        fotoHtml,
        docHtml,
        '<div class="row mb-2"><div class="col-4 fw-semibold">Nome</div><div class="col-8">' + (escapeHtml(p.nome) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Email</div><div class="col-8">' + (escapeHtml(p.email) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Telefone</div><div class="col-8">' + (escapeHtml(p.telefone) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Especialidade</div><div class="col-8">' + (escapeHtml(p.especialidade) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Turma</div><div class="col-8">' + (escapeHtml(TURMAS_MAP[p.turma] || p.turma) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Turno</div><div class="col-8">' + (escapeHtml(p.turno) || '-') + '</div></div>'
      ].join('');
      new bootstrap.Modal(document.getElementById('viewProfessoraModal')).show();
    } catch (e) { alert(e.message); }
  };

  window.criarLogin = function (id, nome) {
    loginProfessoraId = id;
    document.getElementById('loginProfessoraNome').textContent = nome;
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
    document.getElementById('loginErrorMsg').textContent = '';
    new bootstrap.Modal(document.getElementById('criarLoginModal')).show();
  };

  document.getElementById('saveLoginBtn').addEventListener('click', async function () {
    var usuario = document.getElementById('loginUsuario').value.trim();
    var senha = document.getElementById('loginSenha').value;
    var errorEl = document.getElementById('loginErrorMsg');
    errorEl.textContent = '';
    if (!usuario) { errorEl.textContent = 'Usuário é obrigatório.'; return; }
    if (!senha || senha.length < 4) { errorEl.textContent = 'Senha deve ter no mínimo 4 caracteres.'; return; }
    try {
      await api.post('/api/professoras/' + loginProfessoraId + '/criar-login', { usuario: usuario, senha: senha });
      bootstrap.Modal.getInstance(document.getElementById('criarLoginModal')).hide();
      fetchProfessoras(currentPage);
    } catch (e) { errorEl.textContent = e.message; }
  });

  document.getElementById('novaProfessoraBtn').addEventListener('click', openCreateModal);

  document.getElementById('saveProfessoraBtn').addEventListener('click', async function () {
    var nome = document.getElementById('nomeInput').value.trim();
    if (!nome) { alert('Nome é obrigatório.'); return; }
    var fotoUrl = null;
    var fotoInput = document.getElementById('fotoInput');
    if (fotoInput.files && fotoInput.files[0]) {
      var fd = new FormData();
      fd.append('foto', fotoInput.files[0]);
      try {
        var uploadResp = await api.upload('/api/upload/foto', fd);
        fotoUrl = uploadResp.url;
      } catch (e) { alert('Erro ao enviar foto: ' + e.message); return; }
    }
    var documentoUrl = null;
    var docInput = document.getElementById('documentoInput');
    if (docInput.files && docInput.files[0]) {
      var fd2 = new FormData();
      fd2.append('documento', docInput.files[0]);
      try {
        var uploadResp2 = await api.upload('/api/upload/documento', fd2);
        documentoUrl = uploadResp2.url;
      } catch (e) { alert('Erro ao enviar documento: ' + e.message); return; }
    }
    var body = { nome: nome, email: document.getElementById('emailInput').value.trim(), telefone: document.getElementById('telefoneInput').value.trim(), especialidade: document.getElementById('especialidadeInput').value.trim(), turma: document.getElementById('turmaInput').value, turno: document.getElementById('turnoInput').value };
    if (fotoUrl) body.foto = fotoUrl;
    if (documentoUrl) body.foto_documento = documentoUrl;
    try {
      if (editingId) { await api.put('/api/professoras/' + editingId, body); }
      else { await api.post('/api/professoras', body); }
      bootstrap.Modal.getInstance(document.getElementById('professoraModal')).hide();
      fetchProfessoras(currentPage);
    } catch (e) { alert(e.message); }
  });

  document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
    if (!deleteId) return;
    try {
      await api.del('/api/professoras/' + deleteId);
      fetchProfessoras(currentPage);
    } catch (e) { alert(e.message); } finally {
      var modalEl = document.getElementById('confirmDeleteModal');
      var modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      deleteId = null;
    }
  });

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('turmaFilter').addEventListener('change', applyFilters);
  document.getElementById('turnoFilter').addEventListener('change', applyFilters);

  document.getElementById('importarCsvBtn').addEventListener('click', function () {
    document.getElementById('csvFile').value = '';
    document.getElementById('importAlertArea').innerHTML = '';
    document.getElementById('importResultado').classList.add('d-none');
    new bootstrap.Modal(document.getElementById('importCsvModal')).show();
  });

  document.getElementById('importForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var alertArea = document.getElementById('importAlertArea');
    alertArea.innerHTML = '';
    var fileInput = document.getElementById('csvFile');
    if (!fileInput.files || fileInput.files.length === 0) {
      alertArea.innerHTML = '<div class="alert alert-warning">Selecione um arquivo CSV.</div>';
      return;
    }
    var formData = new FormData();
    formData.append('csv', fileInput.files[0]);
    var btn = document.getElementById('importSubmitBtn');
    var txt = document.getElementById('importSubmitText');
    var spinner = document.getElementById('importSubmitSpinner');
    btn.disabled = true;
    txt.textContent = 'Importando...';
    spinner.classList.remove('d-none');
    try {
      var data = await api.upload('/api/importar-professoras', formData);
      if (!data) return;
      document.getElementById('importLidos').textContent = data.totalLido;
      document.getElementById('importImportados').textContent = data.totalImportado;
      document.getElementById('importInvalidos').textContent = data.totalInvalidos;
      document.getElementById('importErros').textContent = data.totalErros;
      document.getElementById('importResultado').classList.remove('d-none');
      alertArea.innerHTML = '<div class="alert alert-success">Importação concluída.</div>';
      currentPage = 1;
      fetchProfessoras(1);
    } catch (e) {
      alertArea.innerHTML = '<div class="alert alert-danger">Erro de comunicação.</div>';
    } finally {
      btn.disabled = false;
      txt.textContent = 'Importar';
      spinner.classList.add('d-none');
    }
  });

  loadTurmas();
  fetchProfessoras(1);
})();
