(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  var PAGE_SIZE = 10;
  var currentPage = 1, totalPages = 1, editingId = null;

  async function loadTurmas() {
    try {
      var data = await api.get('/api/turmas?limit=100');
      var turmas = data?.turmas || [];
      var sel1 = document.getElementById('turmaSelect');
      var sel2 = document.getElementById('filterTurma');
      var opts = '<option value="">Selecione</option>' + turmas.map(function (t) { return '<option value="' + t.id + '">' + escapeHtml(t.nome) + '</option>'; }).join('');
      sel1.innerHTML = opts;
      sel2.innerHTML = '<option value="">Todas as turmas</option>' + turmas.map(function (t) { return '<option value="' + t.id + '">' + escapeHtml(t.nome) + '</option>'; }).join('');
    } catch (e) { alert(e.message); }
  }

  async function fetchDiario(page) {
    page = page || 1;
    var p = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    var turma = document.getElementById('filterTurma').value;
    var data = document.getElementById('filterData').value;
    if (turma) p.set('turma_id', turma);
    if (data) p.set('data', data);
    try {
      var d = await api.get('/api/diario?' + p.toString());
      if (!d) return;
      totalPages = d.totalPages || 1; currentPage = d.page || 1;
      renderTable(d.registros || []);
      renderPagination();
    } catch (e) { alert(e.message); }
  }

  function renderTable(registros) {
    var tbody = document.getElementById('diarioTbody');
    tbody.innerHTML = '';
    registros.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = [
        '<td>' + (r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '') + '</td>',
        '<td>' + escapeHtml(r.turma_nome || r.turma_id) + '</td>',
        '<td>' + escapeHtml((r.conteudo_aula || '').substring(0, 80)) + '</td>',
        '<td>' + escapeHtml((r.observacoes || '').substring(0, 80)) + '</td>',
        '<td><button class="btn btn-sm btn-warning btn-editar-diario" data-id="' + r.id + '">Editar</button></td>'
      ].join('');
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-editar-diario').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(this.getAttribute('data-id'));
        window.editarDiario(id);
      });
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
      li.addEventListener('click', function (e) { e.preventDefault(); if (!d) { currentPage = p; fetchDiario(p); } });
      return li;
    }
    ul.appendChild(item(currentPage - 1, '&laquo;', false, currentPage === 1));
    var sp = Math.max(1, currentPage - 2), ep = Math.min(totalPages, sp + 4);
    for (var p = sp; p <= ep; p++) ul.appendChild(item(p, p, p === currentPage));
    ul.appendChild(item(currentPage + 1, '&raquo;', false, currentPage === totalPages));
  }

  function resetDiarioForm() {
    editingId = null;
    document.getElementById('diarioId').value = '';
    document.getElementById('conteudoInput').value = '';
    document.getElementById('observacoesInput').value = '';
    document.getElementById('cancelEditBtn').style.display = 'none';
  }

  window.editarDiario = async function (id) {
    try {
      var d = await api.get('/api/diario/' + id);
      if (!d) return;
      editingId = d.id;
      document.getElementById('diarioId').value = d.id;
      document.getElementById('turmaSelect').value = d.turma_id || '';
      document.getElementById('dataInput').value = d.data || '';
      document.getElementById('conteudoInput').value = d.conteudo_aula || '';
      document.getElementById('observacoesInput').value = d.observacoes || '';
      document.getElementById('cancelEditBtn').style.display = 'inline-block';
      document.getElementById('turmaSelect').disabled = true;
      document.getElementById('dataInput').disabled = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { alert(e.message); }
  };

  document.getElementById('diarioForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var turmaId = document.getElementById('turmaSelect').value;
    var data = document.getElementById('dataInput').value;
    if (!turmaId || !data) { alert('Turma e data são obrigatórios.'); return; }
    var body = { turma_id: parseInt(turmaId), data: data, conteudo_aula: document.getElementById('conteudoInput').value, observacoes: document.getElementById('observacoesInput').value };
    try {
      if (editingId) { await api.put('/api/diario/' + editingId, body); }
      else { await api.post('/api/diario', body); }
      document.getElementById('turmaSelect').disabled = false;
      document.getElementById('dataInput').disabled = false;
      resetDiarioForm();
      fetchDiario(1);
    } catch (e) { alert(e.message); }
  });

  document.getElementById('cancelEditBtn').addEventListener('click', resetDiarioForm);
  document.getElementById('filterTurma').addEventListener('change', function () { currentPage = 1; fetchDiario(1); });
  document.getElementById('filterData').addEventListener('change', function () { currentPage = 1; fetchDiario(1); });

  loadTurmas().then(function () {
    document.getElementById('dataInput').value = new Date().toISOString().split('T')[0];
    var params = new URLSearchParams(window.location.search);
    var turmaId = params.get('turma_id');
    if (turmaId) {
      document.getElementById('filterTurma').value = turmaId;
    }
    fetchDiario(1);
  });

  document.getElementById('importCsvBtn').addEventListener('click', async function () {
    var file = document.getElementById('csvFileInput').files[0];
    if (!file) return alert('Selecione um arquivo CSV.');
    var btn = document.getElementById('importCsvBtn');
    btn.disabled = true; btn.textContent = 'Importando...';
    var fd = new FormData(); fd.append('csv', file);
    try {
      var d = await api.upload('/api/importar-diario', fd);
      if (!d) return;
      document.getElementById('importResult').innerHTML = d.error
        ? '<div class="alert alert-danger">' + d.error + '</div>'
        : '<div class="alert alert-info">' + d.message + ' — ' + (d.totalImportado || 0) + ' importados, ' + (d.totalInvalidos || 0) + ' inválidos, ' + (d.totalErros || 0) + ' erros.</div>';
      fetchDiario(1);
    } catch (e) {
      document.getElementById('importResult').innerHTML = '<div class="alert alert-danger">Erro ao importar.</div>';
    } finally {
      btn.disabled = false; btn.textContent = 'Importar';
    }
  });
})();
