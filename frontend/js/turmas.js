(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  var PAGE_SIZE = 10;
  var currentPage = 1, totalPages = 1, deleteId = null, editingId = null, vinculoTurmaId = null;

  async function fetchTurmas(page) {
    page = page || 1;
    var p = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    var search = document.getElementById('searchInput').value;
    var turno = document.getElementById('turnoFilter').value;
    var ano = document.getElementById('anoFilter').value;
    if (search) p.set('search', search);
    if (turno) p.set('turno', turno);
    if (ano) p.set('ano_letivo', ano);
    try {
      var data = await api.get('/api/turmas?' + p.toString());
      if (!data) return;
      totalPages = data.totalPages || 1; currentPage = data.page || 1;
      renderTable(data.turmas || []);
      renderPagination();
    } catch (e) { alert(e.message); }
  }

  function applyFilters() { currentPage = 1; fetchTurmas(1); }

  function renderTable(turmas) {
    var tbody = document.getElementById('turmasTbody');
    tbody.innerHTML = '';
    turmas.forEach(function (t) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(t.nome) + '</td>' +
        '<td>' + escapeHtml(t.turno) + '</td>' +
        '<td>' + escapeHtml(t.ano_letivo) + '</td>' +
        '<td><button class="btn btn-sm btn-outline-info btn-professoras" data-id="' + t.id + '" data-nome="' + escapeHtml(t.nome).replace(/"/g, '&quot;') + '">Professoras</button></td>' +
        '<td>' +
        '<button class="btn btn-sm btn-info me-1 btn-ver-turma" data-id="' + t.id + '">Visualizar</button>' +
        '<button class="btn btn-sm btn-warning me-1 btn-editar-turma" data-id="' + t.id + '">Editar</button>' +
        '<button class="btn btn-sm btn-danger" data-id="' + t.id + '">Excluir</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-ver-turma').forEach(function (b) {
      b.addEventListener('click', function () { window.verTurma(parseInt(this.dataset.id)); });
    });
    tbody.querySelectorAll('.btn-editar-turma').forEach(function (b) {
      b.addEventListener('click', function () { window.editarTurma(parseInt(this.dataset.id)); });
    });
    tbody.querySelectorAll('.btn-professoras').forEach(function (b) {
      b.addEventListener('click', function () { window.abrirVinculo(parseInt(this.dataset.id), this.dataset.nome); });
    });
    tbody.querySelectorAll('.btn-danger').forEach(function (b) {
      b.addEventListener('click', function () { deleteId = this.dataset.id; new bootstrap.Modal(document.getElementById('confirmDeleteModal')).show(); });
    });
  }

  function renderPagination() {
    var ul = document.getElementById('pagination');
    ul.innerHTML = '';
    if (totalPages <= 1) return;
    function item(p, l, a, d) {
      l = l || p; a = a || false; d = d || false;
      var li = document.createElement('li');
      li.className = 'page-item' + (a ? ' active' : '') + (d ? ' disabled' : '');
      li.innerHTML = '<a class="page-link" href="#">' + l + '</a>';
      li.addEventListener('click', function (e) { e.preventDefault(); if (!d) { currentPage = p; fetchTurmas(p); } });
      return li;
    }
    ul.appendChild(item(currentPage - 1, '&laquo;', false, currentPage === 1));
    var sp = Math.max(1, currentPage - 2), ep = Math.min(totalPages, sp + 4);
    for (var p = sp; p <= ep; p++) ul.appendChild(item(p, p, p === currentPage));
    ul.appendChild(item(currentPage + 1, '&raquo;', false, currentPage === totalPages));
  }

  function resetForm() { document.getElementById('turmaId').value = ''; document.getElementById('nomeInput').value = ''; document.getElementById('turnoInput').value = ''; document.getElementById('anoInput').value = ''; }

  document.getElementById('novaTurmaBtn').addEventListener('click', function () { editingId = null; document.getElementById('turmaModalLabel').textContent = 'Nova Turma'; resetForm(); new bootstrap.Modal(document.getElementById('turmaModal')).show(); });

  window.editarTurma = async function (id) {
    try {
      var d = await api.get('/api/turmas/' + id);
      if (!d) return;
      editingId = d.id;
      document.getElementById('turmaModalLabel').textContent = 'Editar Turma';
      document.getElementById('turmaId').value = d.id;
      document.getElementById('nomeInput').value = d.nome || '';
      document.getElementById('turnoInput').value = d.turno || '';
      document.getElementById('anoInput').value = d.ano_letivo || '';
      new bootstrap.Modal(document.getElementById('turmaModal')).show();
    } catch (e) { alert(e.message); }
  };

  window.verTurma = async function (id) {
    try {
      var d = await api.get('/api/turmas/' + id);
      var profsResp = await api.get('/api/turmas/' + id + '/professoras');
      var profs = profsResp?.professoras || [];
      var lista = profs.map(function (p) { return escapeHtml(p.nome) + (p.principal ? ' (principal)' : ''); }).join('<br>') || '-';
      document.getElementById('viewTurmaBody').innerHTML = [
        '<div class="row mb-2"><div class="col-4 fw-semibold">Nome</div><div class="col-8">' + escapeHtml(d.nome) + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Turno</div><div class="col-8">' + (escapeHtml(d.turno) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Ano Letivo</div><div class="col-8">' + (escapeHtml(d.ano_letivo) || '-') + '</div></div>',
        '<div class="row mb-2"><div class="col-4 fw-semibold">Professoras</div><div class="col-8">' + lista + '</div></div>'
      ].join('');
      new bootstrap.Modal(document.getElementById('viewTurmaModal')).show();
    } catch (e) { alert(e.message); }
  };

  document.getElementById('saveTurmaBtn').addEventListener('click', async function () {
    var nome = document.getElementById('nomeInput').value.trim();
    if (!nome) { alert('Nome é obrigatório.'); return; }
    var body = { nome: nome, turno: document.getElementById('turnoInput').value, ano_letivo: document.getElementById('anoInput').value };
    try {
      if (editingId) { await api.put('/api/turmas/' + editingId, body); }
      else { await api.post('/api/turmas', body); }
      bootstrap.Modal.getInstance(document.getElementById('turmaModal')).hide();
      fetchTurmas(currentPage);
    } catch (e) { alert(e.message); }
  });

  document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
    if (!deleteId) return;
    try {
      await api.del('/api/turmas/' + deleteId);
      bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal')).hide();
      deleteId = null;
      fetchTurmas(currentPage);
    } catch (e) { alert(e.message); }
  });

  window.abrirVinculo = async function (turmaId, turmaNome) {
    vinculoTurmaId = turmaId;
    document.getElementById('vinculoTurmaInfo').textContent = 'Turma: ' + turmaNome;
    document.getElementById('vinculoLista').innerHTML = '';
    document.getElementById('vinculoProfessoraSelect').value = '';
    document.getElementById('vinculoPrincipal').checked = false;
    try {
      var profsResp = await api.get('/api/professoras?limit=100');
      var profs = profsResp?.professoras || [];
      var select = document.getElementById('vinculoProfessoraSelect');
      select.innerHTML = '<option value="">Selecione uma professora</option>' + profs.map(function (p) { return '<option value="' + p.id + '">' + escapeHtml(p.nome) + '</option>'; }).join('');
      await recarregarVinculos(turmaId);
      new bootstrap.Modal(document.getElementById('vinculoModal')).show();
    } catch (e) { alert(e.message); }
  };

  async function recarregarVinculos(turmaId) {
    try {
      var data = await api.get('/api/turmas/' + turmaId + '/professoras');
      var lista = document.getElementById('vinculoLista');
      lista.innerHTML = '';
      (data?.professoras || []).forEach(function (p) {
        var li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = escapeHtml(p.nome) + (p.principal ? ' <span class="badge bg-warning">Principal</span>' : '') + ' <button class="btn btn-sm btn-outline-danger desvincular" data-id="' + p.id + '">Remover</button>';
        lista.appendChild(li);
      });
      lista.querySelectorAll('.desvincular').forEach(function (b) {
        b.addEventListener('click', async function () {
          try {
            await api.del('/api/turmas/' + turmaId + '/professora/' + this.dataset.id);
            recarregarVinculos(turmaId);
          } catch (e) { alert(e.message); }
        });
      });
    } catch (e) { alert(e.message); }
  }

  document.getElementById('vincularBtn').addEventListener('click', async function () {
    var select = document.getElementById('vinculoProfessoraSelect');
    var id = parseInt(select.value);
    if (!id) { alert('Selecione uma professora.'); return; }
    try {
      await api.post('/api/turmas/' + vinculoTurmaId + '/professoras', { professora_id: id, principal: document.getElementById('vinculoPrincipal').checked });
      recarregarVinculos(vinculoTurmaId);
    } catch (e) { alert(e.message); }
  });

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('turnoFilter').addEventListener('change', applyFilters);
  document.getElementById('anoFilter').addEventListener('input', applyFilters);

  fetchTurmas(1);

  document.getElementById('importCsvBtn').addEventListener('click', async function () {
    var file = document.getElementById('csvFileInput').files[0];
    if (!file) return alert('Selecione um arquivo CSV.');
    var btn = document.getElementById('importCsvBtn');
    btn.disabled = true; btn.textContent = 'Importando...';
    var fd = new FormData(); fd.append('csv', file);
    try {
      var d = await api.upload('/api/importar-turmas', fd);
      if (!d) return;
      document.getElementById('importResult').innerHTML = d.error
        ? '<div class="alert alert-danger">' + d.error + '</div>'
        : '<div class="alert alert-info">' + d.message + ' — ' + (d.totalImportado || 0) + ' importados, ' + (d.totalInvalidos || 0) + ' inválidos, ' + (d.totalErros || 0) + ' erros.</div>';
      fetchTurmas(1);
    } catch (e) {
      document.getElementById('importResult').innerHTML = '<div class="alert alert-danger">Erro ao importar.</div>';
    } finally {
      btn.disabled = false; btn.textContent = 'Importar';
    }
  });
})();
