(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  var TURMA_MAP = { '1': 'Maternal I', '2': 'Maternal II', '3': 'Jardim I', '4': 'Jardim II' };
  function nomeTurma(id) { return TURMA_MAP[id] || id; }

  var PAGE_SIZE = 10;
  var currentPage = 1;
  var totalPages = 1;
  var deleteId = null;

  async function fetchAlunos(page) {
    page = page || 1;
    var search = document.getElementById('searchInput').value;
    var turma = document.getElementById('turmaFilter').value;
    var turno = document.getElementById('turnoFilter').value;

    var params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    if (search) params.set('search', search);
    if (turma) params.set('turma_id', turma);
    if (turno) params.set('turno', turno);

    try {
      var data = await api.get('/api/alunos?' + params.toString());
      if (!data) return;
      totalPages = data.totalPages || 1;
      currentPage = data.page || 1;
      renderTable(data.alunos || []);
      renderPagination();
    } catch (e) { alert(e.message); }
  }

  function applyFilters() { currentPage = 1; fetchAlunos(1); }

  function renderTable(alunos) {
    var tbody = document.getElementById('alunosTbody');
    tbody.innerHTML = '';
    alunos.forEach(function (a) {
      var tr = document.createElement('tr');
      tr.innerHTML = [
        '<td>' + (a.foto ? '<img src="' + escapeHtml(a.foto) + '" class="rounded me-2" style="width:32px;height:32px;object-fit:cover">' : '') + escapeHtml(a.nome) + '</td>',
        '<td>' + (a.data_nascimento ? new Date(a.data_nascimento).toLocaleDateString('pt-BR') : '') + '</td>',
        '<td>' + escapeHtml(nomeTurma(a.turma)) + '</td>',
        '<td>' + escapeHtml(a.turno) + '</td>',
        '<td>' + escapeHtml(a.nome_mae) + '</td>',
        '<td>' + escapeHtml(a.contato_mae) + '</td>',
        '<td><button class="btn btn-sm btn-info me-1 btn-visualizar" data-id="' + a.id + '">Visualizar</button><a href="aluno.html?id=' + a.id + '" class="btn btn-sm btn-warning me-1">Editar</a><button class="btn btn-sm btn-danger" data-id="' + a.id + '">Excluir</button></td>'
      ].join('');
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button.btn-visualizar').forEach(function (btn) {
      btn.addEventListener('click', function () {
        verAluno(parseInt(this.getAttribute('data-id')));
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
      li.addEventListener('click', function (e) { e.preventDefault(); if (!disabled) { currentPage = pageNum; fetchAlunos(currentPage); } });
      return li;
    }

    ul.appendChild(createPageItem(currentPage - 1, '&laquo;', false, currentPage === 1));
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, startPage + 4);
    for (var p = startPage; p <= endPage; p++) ul.appendChild(createPageItem(p, p, p === currentPage));
    ul.appendChild(createPageItem(currentPage + 1, '&raquo;', false, currentPage === totalPages));
  }

  window.verAluno = async function (id) {
    try {
      var a = await api.get('/api/alunos/' + id);
      if (!a) return;
      var fotoHtml = a.foto ? '<div class="row mb-2"><div class="col-4 fw-semibold">Foto</div><div class="col-8"><img src="' + escapeHtml(a.foto) + '" class="rounded" style="max-width:120px;max-height:120px"></div></div>' : '';
      var docHtml = a.foto_documento ? '<div class="row mb-2"><div class="col-4 fw-semibold">Documento</div><div class="col-8"><img src="' + escapeHtml(a.foto_documento) + '" class="rounded border" style="max-width:200px;max-height:150px"></div></div>' : '';
      document.getElementById('viewAlunoBody').innerHTML = [
        fotoHtml,
        docHtml,
        '<div class="row mb-2"><div class="col-4 fw-semibold">Nome</div><div class="col-8">' + (escapeHtml(a.nome) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Turma</div><div class="col-8">' + (escapeHtml(nomeTurma(a.turma)) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Turno</div><div class="col-8">' + (escapeHtml(a.turno) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Data de Nascimento</div><div class="col-8">' + (a.data_nascimento ? new Date(a.data_nascimento).toLocaleDateString('pt-BR') : '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Mãe</div><div class="col-8">' + (escapeHtml(a.nome_mae) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Contato da Mãe</div><div class="col-8">' + (escapeHtml(a.contato_mae) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">CPF Aluno</div><div class="col-8">' + (escapeHtml(a.cpf_aluno) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">CPF Pai</div><div class="col-8">' + (escapeHtml(a.cpf_pai) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">CPF Mãe</div><div class="col-8">' + (escapeHtml(a.cpf_mae) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Pai</div><div class="col-8">' + (escapeHtml(a.nome_pai) || '-') + '</div></div>'
      ].join('');
      new bootstrap.Modal(document.getElementById('viewAlunoModal')).show();
    } catch (e) { alert(e.message); }
  };

  document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
    if (!deleteId) return;
    try {
      await api.del('/api/alunos/' + deleteId);
      fetchAlunos(currentPage);
    } catch (e) { alert(e.message); } finally {
      var modalEl = document.getElementById('confirmDeleteModal');
      var modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      deleteId = null;
    }
  });

  async function carregarFiltros() {
    try {
      var data = await api.get('/api/turmas?limit=100');
      var turmas = data?.turmas || [];
      var selTurma = document.getElementById('turmaFilter');
      turmas.forEach(function (t) {
        var opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.nome + (t.turno ? ' (' + t.turno + ')' : '');
        selTurma.appendChild(opt);
      });
    } catch (e) { /* silencioso */ }
    var selTurno = document.getElementById('turnoFilter');
    ['matutino', 'vespertino'].forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      selTurno.appendChild(opt);
    });
  }

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('turmaFilter').addEventListener('change', applyFilters);
  document.getElementById('turnoFilter').addEventListener('change', applyFilters);

  carregarFiltros();
  fetchAlunos(1);
})();
