(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  async function carregarTurmas() {
    try {
      var data = await api.get('/api/turmas?limit=100');
      var sel = document.getElementById('turmaSelect');
      sel.innerHTML = '<option value="">Selecione</option>' + (data?.turmas || []).map(function (t) {
        return '<option value="' + t.id + '">' + escapeHtml(t.nome) + '</option>';
      }).join('');
    } catch (e) { alert(e.message); }
  }

  async function carregarRelatorio() {
    var turmaId = document.getElementById('turmaSelect').value;
    if (!turmaId) return;
    try {
      var d = await api.get('/api/frequencias/relatorio?turma_id=' + turmaId);
      if (!d) return;
      d.alunos = d.alunos || [];
      d.datas = d.datas || [];
      document.getElementById('relatorioContainer').classList.remove('d-none');
      document.getElementById('semDados').classList.add('d-none');
      document.getElementById('totalAulas').textContent = d.totalAulas;
      document.getElementById('totalAlunos').textContent = d.totalAlunos;
      if (d.totalAulas === 0) {
        document.getElementById('semDados').classList.remove('d-none');
        document.getElementById('relatorioContainer').classList.add('d-none');
        return;
      }
      function calcularMedia(arr) {
        return arr.length > 0 ? Math.round(arr.reduce(function (s, a) { return s + a.percentual; }, 0) / arr.length) : 0;
      }
      document.getElementById('mediaPresenca').textContent = calcularMedia(d.alunos) + '%';
      var menor = d.alunos.reduce(function (p, a) { return a.percentual < p.percentual ? a : p; }, d.alunos[0]);
      document.getElementById('menorPresenca').textContent = menor ? escapeHtml(menor.nome) + ' (' + menor.percentual + '%)' : '-';
      var header = document.getElementById('relatorioHeader');
      var headerHtml = '<th style="min-width:200px">Aluno</th><th style="width:90px">%</th><th style="width:80px">P</th><th style="width:80px">F</th>';
      d.datas.forEach(function (data) {
        headerHtml += '<th style="width:40px;font-size:0.7rem;writing-mode:vertical-lr;text-align:center;padding:4px 2px">' + new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + '</th>';
      });
      header.innerHTML = headerHtml;
      document.getElementById('legendaDatas').textContent = 'Datas: ' + d.datas.map(function (data) {
        return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
      }).join(', ');
      var tbody = document.getElementById('relatorioTbody');
      tbody.innerHTML = '';
      d.alunos.sort(function (a, b) { return a.nome.localeCompare(b.nome); }).forEach(function (a) {
        var cor = a.percentual >= 75 ? '' : a.percentual >= 50 ? 'table-warning' : 'table-danger';
        var tr = document.createElement('tr');
        tr.className = cor;
        var cells = '<td>' + escapeHtml(a.nome) + '</td><td class="fw-bold">' + a.percentual + '%</td><td class="text-success fw-bold">' + a.totalPresencas + '</td><td class="text-danger">' + a.totalFaltas + '</td>';
        a.presencas.forEach(function (p) {
          cells += '<td class="' + (p ? 'text-success' : 'text-danger') + ' fw-bold text-center">' + (p ? 'P' : 'F') + '</td>';
        });
        tr.innerHTML = cells;
        tbody.appendChild(tr);
      });
    } catch (e) { alert(e.message); }
  }

  document.getElementById('carregarBtn').addEventListener('click', carregarRelatorio);
  carregarTurmas();
})();
