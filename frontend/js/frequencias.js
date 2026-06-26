(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  var registrosAtuais = [];
  var turmaIdAtual = null;
  var dataAtual = null;

  async function carregarTurmas() {
    try {
      var data = await api.get('/api/turmas?limit=100');
      var sel = document.getElementById('turmaSelect');
      sel.innerHTML = '<option value="">Selecione</option>' + (data?.turmas || []).map(function (t) {
        return '<option value="' + t.id + '">' + escapeHtml(t.nome) + '</option>';
      }).join('');
    } catch (e) { alert(e.message); }
  }

  async function carregarChamada() {
    var turmaId = document.getElementById('turmaSelect').value;
    var data = document.getElementById('dataInput').value;
    if (!turmaId || !data) { alert('Selecione turma e data.'); return; }
    turmaIdAtual = turmaId;
    dataAtual = data;
    try {
      var result = await api.get('/api/frequencias?turma_id=' + turmaId + '&data=' + data);
      if (!result) return;
      registrosAtuais = result.registros || [];
      var turmaNome = document.getElementById('turmaSelect').selectedOptions[0]?.text || '';
      document.getElementById('turmaNomeDisplay').textContent = turmaNome;
      document.getElementById('dataDisplay').textContent = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
      renderTabela();
      carregarHistorico(turmaId);
      document.getElementById('chamadaContainer').classList.remove('d-none');
      document.getElementById('salvarBtn').disabled = false;
    } catch (e) { alert(e.message); }
  }

  function renderTabela() {
    var tbody = document.getElementById('alunosTbody');
    tbody.innerHTML = '';
    var presentes = 0;
    registrosAtuais.forEach(function (r, i) {
      if (r.presente) presentes++;
      var tr = document.createElement('tr');
      tr.innerHTML = [
        '<td>' + (i + 1) + '</td>',
        '<td>' + escapeHtml(r.nome) + '</td>',
        '<td><div class="form-check form-switch"><input class="form-check-input presenca-check" type="checkbox" data-index="' + i + '"' + (r.presente ? ' checked' : '') + '></div></td>'
      ].join('');
      tbody.appendChild(tr);
    });
    document.getElementById('contadorPresenca').textContent = presentes + '/' + registrosAtuais.length + ' presentes';
    tbody.querySelectorAll('.presenca-check').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var idx = parseInt(this.dataset.index);
        registrosAtuais[idx].presente = this.checked;
        var p = registrosAtuais.filter(function (r) { return r.presente; }).length;
        document.getElementById('contadorPresenca').textContent = p + '/' + registrosAtuais.length + ' presentes';
      });
    });
  }

  async function salvarChamada() {
    if (!turmaIdAtual || !dataAtual || registrosAtuais.length === 0) return;
    var body = {
      turma_id: parseInt(turmaIdAtual),
      data: dataAtual,
      registros: registrosAtuais.map(function (r) { return { aluno_id: r.aluno_id, presente: r.presente }; })
    };
    try {
      var result = await api.post('/api/frequencias', body);
      if (!result) return;
      alert('Chamada salva! ' + result.count + ' registro(s).');
    } catch (e) { alert(e.message); }
  }

  async function carregarHistorico(turmaId) {
    try {
      var data = await api.get('/api/frequencias/historico?turma_id=' + turmaId);
      var container = document.getElementById('historicoLista');
      container.innerHTML = '';
      if (!data?.datas || data.datas.length === 0) {
        container.innerHTML = '<span class="text-muted">Nenhuma chamada anterior.</span>';
        return;
      }
      data.datas.forEach(function (d) {
        var btn = document.createElement('button');
        btn.className = 'btn btn-outline-secondary btn-sm';
        btn.textContent = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
        btn.addEventListener('click', function () {
          document.getElementById('dataInput').value = d;
          carregarChamada();
        });
        container.appendChild(btn);
      });
    } catch (e) { alert(e.message); }
  }

  document.getElementById('carregarBtn').addEventListener('click', carregarChamada);
  document.getElementById('salvarBtn').addEventListener('click', salvarChamada);

  document.getElementById('dataInput').value = new Date().toISOString().split('T')[0];
  carregarTurmas().then(function () {
    var params = new URLSearchParams(window.location.search);
    var turmaId = params.get('turma_id');
    if (turmaId) {
      document.getElementById('turmaSelect').value = turmaId;
      carregarChamada();
    }
  });
})();
