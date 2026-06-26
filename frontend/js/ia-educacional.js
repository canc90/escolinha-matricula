(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }
  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  var rankingData = [];

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  async function carregarFiltros() {
    try {
      var turmas = await api.get('/api/turmas');
      var sel = document.getElementById('filtroTurma');
      (turmas.turmas || []).forEach(function (t) {
        var o = document.createElement('option');
        o.value = t.id; o.textContent = t.nome;
        sel.appendChild(o);
      });
    } catch (e) { }
  }

  async function carregarDashboard() {
    var f = document.getElementById('filtroTurma').value;
    var params = f ? '?turma_id=' + f : '';
    try {
      var dashboard = await api.get('/api/ai/risk/dashboard' + params);
      if (!dashboard) return;
      document.getElementById('totalAlunos').textContent = dashboard.totalAlunos || 0;
      document.getElementById('totalCritical').textContent = dashboard.totalCritical || 0;
      document.getElementById('totalHigh').textContent = dashboard.totalHigh || 0;
      document.getElementById('totalMedium').textContent = dashboard.totalMedium || 0;
      document.getElementById('totalLow').textContent = dashboard.totalLow || 0;
      document.getElementById('mediaRisco').textContent = 'Média: ' + (dashboard.mediaRiscoGeral || 0).toFixed(2);
      rankingData = dashboard.ranking || [];
      var body = document.getElementById('rankingBody');
      body.innerHTML = '';
      rankingData.forEach(function (a, i) {
        var tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        var riskClass = a.risk_level === 'CRITICAL' ? 'risk-critical' : a.risk_level === 'HIGH' ? 'risk-high' : a.risk_level === 'MEDIUM' ? 'risk-medium' : 'risk-low';
        var trendIcon = a.trend === 'WORSENING' ? '🔴 piorando' : a.trend === 'IMPROVING' ? '🟢 melhorando' : '⚪ estável';
        var trendClass = a.trend === 'WORSENING' ? 'text-danger' : a.trend === 'IMPROVING' ? 'text-success' : 'text-muted';
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td>' + escapeHtml(a.aluno_nome || 'ID ' + a.aluno_id) + '</td>' +
          '<td>' + escapeHtml(a.turma_nome || '-') + '</td>' +
          '<td class="fw-bold">' + (a.risk_score || 0).toFixed(2) + '</td>' +
          '<td><span class="risk-badge ' + riskClass + '">' + a.risk_level + '</span></td>' +
          '<td class="' + trendClass + ' small">' + trendIcon + '</td>' +
          '<td><button class="btn btn-sm btn-outline-primary btn-detalhes-risco" data-id="' + a.aluno_id + '">Detalhes</button></td>';
        body.appendChild(tr);
      });
      body.querySelectorAll('.btn-detalhes-risco').forEach(function (b) {
        b.addEventListener('click', function () { window.verDetalhes(parseInt(this.dataset.id)); });
      });
      if (rankingData.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">Nenhum dado de risco disponível.</td></tr>';
      }
    } catch (e) {
      console.error(e);
      if (e.message && (e.message.includes('403') || e.message.includes('proibido') || e.message.includes('FORBIDDEN'))) {
        document.getElementById('rankingBody').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Acesso restrito à direção.</td></tr>';
      } else {
        document.getElementById('rankingBody').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
      }
    }
  }

  async function carregarAlertas() {
    try {
      var data = await api.get('/api/ai/alerts?resolved=false');
      var list = document.getElementById('alertasList');
      if (!data || !data.registros || data.registros.length === 0) {
        list.innerHTML = '<div class="text-center text-muted py-4">Nenhum alerta ativo.</div>';
        return;
      }
      list.innerHTML = '';
      data.registros.slice(0, 10).forEach(function (a) {
        var severityClass = a.severity === 'CRITICAL' ? 'bg-danger' : a.severity === 'HIGH' ? 'bg-warning text-dark' : a.severity === 'MEDIUM' ? 'bg-info text-dark' : 'bg-success';
        var div = document.createElement('div');
        div.className = 'border-bottom p-2 alerta-card';
        div.innerHTML =
          '<div class="d-flex justify-content-between align-items-start">' +
          '<div class="small">' +
          '<span class="badge ' + severityClass + ' me-1">' + a.severity + '</span> ' +
          escapeHtml(a.aluno_nome || 'Aluno #' + a.aluno_id) +
          '</div>' +
          '<button class="btn btn-sm btn-outline-success py-0 px-1 btn-resolver-alerta" data-id="' + a.id + '" title="Resolver">✓</button>' +
          '</div>' +
          '<small class="text-muted d-block mt-1">' + escapeHtml(a.message || '') + '</small>';
        list.appendChild(div);
      });
      list.querySelectorAll('.btn-resolver-alerta').forEach(function (b) {
        b.addEventListener('click', function () { window.resolverAlerta(parseInt(this.dataset.id)); });
      });
    } catch (e) { console.error(e); document.getElementById('alertasList').innerHTML = '<span class="text-danger">Erro ao carregar alertas.</span>'; }
  }

  window.verDetalhes = async function (alunoId) {
    try {
      var results = await Promise.all([
        api.get('/api/ai/risk/aluno/' + alunoId),
        api.get('/api/ai/recommendations/aluno/' + alunoId),
      ]);
      var risco = results[0], recs = results[1];
      document.getElementById('detalhesCard').classList.remove('d-none');
      document.getElementById('detalhesNome').textContent = 'Detalhes — ' + escapeHtml(risco.aluno_nome || 'Aluno #' + alunoId);
      var fatoresDiv = document.getElementById('detalhesFatores');
      fatoresDiv.innerHTML = '';
      (risco.factors || []).forEach(function (f) {
        var div = document.createElement('div');
        div.className = 'factor-item';
        div.textContent = f.replace(/_/g, ' ');
        fatoresDiv.appendChild(div);
      });
      if (!risco.factors || risco.factors.length === 0) {
        fatoresDiv.innerHTML = '<span class="text-success">Nenhum fator de risco significativo.</span>';
      }
      var expDiv = document.getElementById('detalhesExplanation');
      if (risco.explanation) {
        expDiv.innerHTML = '<strong>' + escapeHtml(risco.explanation.resumo) + '</strong><br>' +
          (risco.explanation.fatores || []).map(function (f) { return '<div>• ' + f + '</div>'; }).join('');
      } else {
        expDiv.innerHTML = '<span class="text-muted">Sem dados.</span>';
      }
      var estDiv = document.getElementById('detalhesEstatisticas');
      var e = risco.estatisticas || {};
      estDiv.innerHTML =
        '<div class="row small g-1">' +
        '<div class="col-6">Presença: <strong>' + (e.percentualPresenca || 0) + '%</strong></div>' +
        '<div class="col-6">Média turma: <strong>' + (e.mediaTurma || 0) + '%</strong></div>' +
        '<div class="col-6">Presentes: <strong>' + (e.totalPresentes || 0) + '</strong></div>' +
        '<div class="col-6">Faltas: <strong>' + (e.totalFaltas || 0) + '</strong></div>' +
        '<div class="col-6">Registros: <strong>' + (e.totalRegistros || 0) + '</strong></div>' +
        '<div class="col-6">Score: <strong>' + (risco.risk_score || 0).toFixed(2) + '</strong></div>' +
        '</div>';
      var recDiv = document.getElementById('detalhesRecomendacoes');
      recDiv.innerHTML = '';
      if (recs && recs.recommendations) {
        var ul = document.createElement('ul');
        ul.className = 'list-unstyled mb-0 small';
        recs.recommendations.forEach(function (r) {
          var li = document.createElement('li');
          li.className = 'mb-1';
          li.innerHTML = '→ ' + escapeHtml(r);
          ul.appendChild(li);
        });
        recDiv.appendChild(ul);
      } else {
        recDiv.innerHTML = '<span class="text-muted">Sem recomendações.</span>';
      }
      document.getElementById('detalhesCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { console.error(e); alert('Erro ao carregar detalhes do aluno.'); }
  };

  window.fecharDetalhes = function () {
    document.getElementById('detalhesCard').classList.add('d-none');
  };

  window.resolverAlerta = async function (id) {
    try {
      await api.post('/api/ai/alerts/' + id + '/resolve');
      carregarAlertas();
    } catch (e) { console.error(e); alert('Erro ao resolver alerta.'); }
  };

  document.getElementById('filtroTurma').addEventListener('change', function () {
    carregarDashboard();
    carregarAlertas();
  });

  document.getElementById('btnGerarAlertas').addEventListener('click', async function () {
    try {
      var result = await api.post('/api/ai/alerts/gerar');
      alert(result.message || 'Alertas gerados.');
      carregarAlertas();
    } catch (e) { alert(e.message); }
  });

  document.getElementById('fecharDetalhesBtn').addEventListener('click', window.fecharDetalhes);

  carregarFiltros();
  carregarDashboard();
  carregarAlertas();
})();
