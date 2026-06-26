(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }
  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  var charts = {};

  function destroyCharts() {
    Object.values(charts).forEach(function (c) { if (c) c.destroy(); });
    charts = {};
  }

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  window.exportUrl = function (path) {
    var token = localStorage.getItem('token');
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(token || '');
  };

  function getFiltros() {
    return {
      ano_letivo: document.getElementById('filtroAno').value || null,
      turma_id: document.getElementById('filtroTurma').value || null,
      professora_id: document.getElementById('filtroProfessora').value || null,
      data_inicio: document.getElementById('filtroDataInicio').value || null,
      data_fim: document.getElementById('filtroDataFim').value || null,
    };
  }

  function qs(obj) {
    var parts = [];
    for (var k in obj) {
      if (obj[k] !== null && obj[k] !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
    }
    return parts.length ? '?' + parts.join('&') : '';
  }

  async function carregarFiltros() {
    try {
      var tData = await api.get('/api/turmas');
      var pData = await api.get('/api/professoras');
      var selTurma = document.getElementById('filtroTurma');
      var selProf = document.getElementById('filtroProfessora');
      (tData && tData.turmas || []).forEach(function (t) {
        var o = document.createElement('option');
        o.value = t.id; o.textContent = t.nome;
        selTurma.appendChild(o);
      });
      (pData && pData.professoras || []).forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id; o.textContent = p.nome;
        selProf.appendChild(o);
      });
    } catch (e) { console.error('Erro filtros:', e); }
  }

  async function carregar() {
    var f = getFiltros();
    try {
      var dados = await Promise.all([
        api.get('/api/bi/dashboard-direcao' + qs(f)),
        api.get('/api/bi/evolucao-presenca' + qs(f)),
        api.get('/api/bi/ranking-turmas' + qs(f)),
        api.get('/api/bi/ranking-professoras' + qs(f)),
        api.get('/api/bi/kpis-compostos' + qs(f)),
      ]);
      var dashboard = dados[0], evolucao = dados[1], rankingT = dados[2], rankingP = dados[3], kpis = dados[4];
      if (!dashboard) return;

      document.getElementById('kpiPresenca').textContent = (dashboard.presenca?.percentualPresenca || 0) + '%';
      document.getElementById('kpiAlunos').textContent = dashboard.totais?.alunos || 0;
      document.getElementById('kpiTurmas').textContent = dashboard.totais?.turmas || 0;
      document.getElementById('kpiDiario').textContent = dashboard.diario?.totalRegistros || 0;

      destroyCharts();
      var evo = evolucao || [];
      var ctx = document.getElementById('evolucaoChart').getContext('2d');
      charts.evolucao = new Chart(ctx, {
        type: 'line',
        data: {
          labels: evo.map(function (e) { return e.mes; }),
          datasets: [{
            label: '% Presença',
            data: evo.map(function (e) { return e.percentual; }),
            borderColor: '#ffc107',
            backgroundColor: 'rgba(13,110,253,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } } }
      });

      var kpisDiv = document.getElementById('kpisCompostos');
      if (kpis) {
        kpisDiv.innerHTML =
          '<div class="mb-2"><span class="fw-bold">Média Geral:</span> <span class="badge bg-warning fs-6">' + kpis.mediaGeralPresenca + '%</span></div>' +
          '<div class="mb-2"><span class="fw-bold">Tendência:</span> <span class="badge ' + (kpis.tendenciaGeral >= 0 ? 'bg-success' : 'bg-danger') + ' fs-6">' + (kpis.tendenciaGeral >= 0 ? '+' : '') + kpis.tendenciaGeral + '%</span></div>' +
          '<div class="mb-2"><span class="fw-bold">Meses analisados:</span> ' + kpis.totalMeses + '</div>' +
          '<div class="mb-2"><span class="fw-bold text-success">Melhor:</span> ' + (kpis.maiorPresenca?.turma_nome || '-') + ' (' + (kpis.maiorPresenca?.mediaPercentual || 0) + '%)</div>' +
          '<div class="mb-2"><span class="fw-bold text-danger">Pior:</span> ' + (kpis.menorPresenca?.turma_nome || '-') + ' (' + (kpis.menorPresenca?.mediaPercentual || 0) + '%)</div>';
      }

      var rankTBody = document.getElementById('rankingTurmasBody');
      rankTBody.innerHTML = '';
      (rankingT || []).forEach(function (t, i) {
        var tr = document.createElement('tr');
        var pctClass = t.percentualPresenca >= 75 ? 'text-success' : t.percentualPresenca >= 50 ? 'text-warning' : 'text-danger';
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td><a href="' + exportUrl('/api/reports/turma/' + t.turma_id + '.pdf') + '" target="_blank" title="PDF da turma">' + escapeHtml(t.turma_nome) + '</a></td>' +
          '<td>' + escapeHtml(t.turno || '-') + '</td>' +
          '<td>' + t.totalRegistros + '</td>' +
          '<td class="fw-bold ' + pctClass + '">' + t.percentualPresenca + '%</td>' +
          '<td>' + t.totalPresentes + '</td>' +
          '<td>' + t.totalFaltas + '</td>';
        rankTBody.appendChild(tr);
      });

      var rankPBody = document.getElementById('rankingProfBody');
      rankPBody.innerHTML = '';
      (rankingP || []).forEach(function (p, i) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td><a href="' + exportUrl('/api/reports/professora/' + p.professora_id + '.pdf') + '" target="_blank" title="PDF da professora">' + escapeHtml(p.nome) + '</a></td>' +
          '<td>' + p.totalRegistros + '</td>' +
          '<td>' + p.totalDias + '</td>' +
          '<td>' + (p.regularidade !== null && p.regularidade !== undefined ? p.regularidade.toFixed(2) : '-') + '</td>' +
          '<td>' + p.totalTurmasVinculadas + '</td>';
        rankPBody.appendChild(tr);
      });

      var sorted = (rankingT || []).sort(function (a, b) { return a.percentualPresenca - b.percentualPresenca; });
      var piores = document.getElementById('pioresTurmas');
      piores.innerHTML = '';
      sorted.slice(0, 3).forEach(function (t) {
        piores.innerHTML += '<div class="d-flex justify-content-between align-items-center border-bottom py-1"><span>' + escapeHtml(t.turma_nome) + '</span><span class="badge bg-danger">' + t.percentualPresenca + '%</span></div>';
      });
      if (sorted.length === 0) piores.innerHTML = '<p class="text-muted small">Sem dados.</p>';

      var melhores = document.getElementById('melhoresTurmas');
      melhores.innerHTML = '';
      sorted.slice(-3).reverse().forEach(function (t) {
        melhores.innerHTML += '<div class="d-flex justify-content-between align-items-center border-bottom py-1"><span>' + escapeHtml(t.turma_nome) + '</span><span class="badge bg-success">' + t.percentualPresenca + '%</span></div>';
      });
      if (sorted.length === 0) melhores.innerHTML = '<p class="text-muted small">Sem dados.</p>';
    } catch (e) {
      console.error(e);
      if (e.message && (e.message.includes('403') || e.message.includes('proibido') || e.message.includes('FORBIDDEN'))) {
        window.location.href = 'dashboard.html';
      } else {
        document.getElementById('kpiCards').innerHTML = '<div class="alert alert-danger">Erro ao carregar dados.</div>';
      }
    }
  }

  carregarFiltros();
  carregar();

  document.getElementById('btnFiltrar').addEventListener('click', carregar);
  document.getElementById('exportCSV').addEventListener('click', function (e) {
    e.preventDefault();
    var f = getFiltros();
    var params = [];
    if (f.turma_id) params.push('turma_id=' + f.turma_id);
    if (f.data_inicio) params.push('data_inicio=' + f.data_inicio);
    if (f.data_fim) params.push('data_fim=' + f.data_fim);
    var q = params.length ? '?' + params.join('&') : '';
    window.open(exportUrl('/api/reports/presenca.csv' + q), '_blank');
  });
  document.getElementById('exportPDF').addEventListener('click', function (e) {
    e.preventDefault();
    var f = getFiltros();
    var params = [];
    if (f.ano_letivo) params.push('ano_letivo=' + f.ano_letivo);
    if (f.turma_id) params.push('turma_id=' + f.turma_id);
    if (f.data_inicio) params.push('data_inicio=' + f.data_inicio);
    if (f.data_fim) params.push('data_fim=' + f.data_fim);
    var q = params.length ? '?' + params.join('&') : '';
    window.open(exportUrl('/api/reports/geral.pdf' + q), '_blank');
  });

  carregar();
})();
