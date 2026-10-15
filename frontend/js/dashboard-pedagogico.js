(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }
  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  var charts = {};

  function destroyCharts() {
    Object.values(charts).forEach(function (c) { if (c) c.destroy(); });
    charts = {};
  }

  function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

  async function carregar() {
    try {
      var dados = await Promise.all([
        api.get('/api/metrics/presenca-geral'),
        api.get('/api/metrics/presenca-por-turma'),
        api.get('/api/metrics/evolucao-semanal'),
        api.get('/api/metrics/diario-resumo'),
        api.get('/api/metrics/atividade-professoras?limit=5'),
      ]);
      var presencaGeralData = dados[0], presencaTurmaData = dados[1], evolucaoData = dados[2], diarioData = dados[3], ativasData = dados[4];
      if (!presencaGeralData || !presencaTurmaData) return;

      document.getElementById('presencaGeral').textContent = (presencaGeralData.percentualPresenca || 0) + '%';
      document.getElementById('totalPresentes').textContent = presencaGeralData.totalPresentes || 0;
      document.getElementById('totalFaltas').textContent = presencaGeralData.totalFaltas || 0;
      document.getElementById('totalRegistrosPresenca').textContent = presencaGeralData.totalRegistros || 0;

      if (diarioData) {
        document.getElementById('diarioTotalAulas').textContent = diarioData.totalRegistros || 0;
        document.getElementById('diarioDias').textContent = diarioData.totalDias || 0;
        document.getElementById('diarioTurmas').textContent = diarioData.totalTurmas || 0;
      }

      destroyCharts();

      var ctx1 = document.getElementById('presencaTurmaChart').getContext('2d');
      var sorted = (presencaTurmaData || []).sort(function (a, b) { return b.percentualPresenca - a.percentualPresenca; });
      charts.presencaTurma = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: sorted.map(function (t) { return t.turma_nome; }),
          datasets: [{
            label: '% Presença',
            data: sorted.map(function (t) { return t.percentualPresenca; }),
            backgroundColor: sorted.map(function (t) { return t.percentualPresenca >= 75 ? '#198754' : t.percentualPresenca >= 50 ? '#ffc107' : '#dc3545'; }),
            borderRadius: 4,
          }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { stepSize: 20 } } } }
      });

      var ctx2 = document.getElementById('evolucaoChart').getContext('2d');
      var evo = evolucaoData || [];
      charts.evolucao = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: evo.map(function (e) { return e.semana; }),
          datasets: [{
            label: '% Presença',
            data: evo.map(function (e) { return e.percentual; }),
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255,193,7,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
      });

      var menorPresenca = document.getElementById('menorPresencaLista');
      menorPresenca.innerHTML = '';
      var piores = (presencaTurmaData || []).sort(function (a, b) { return a.percentualPresenca - b.percentualPresenca; }).slice(0, 5);
      if (piores.length === 0) {
        menorPresenca.innerHTML = '<p class="text-muted">Nenhum dado de presença.</p>';
      } else {
        var ul = document.createElement('ul');
        ul.className = 'list-group list-group-flush';
        piores.forEach(function (t) {
          var li = document.createElement('li');
          li.className = 'list-group-item d-flex justify-content-between align-items-center';
          li.innerHTML = '<span>' + escapeHtml(t.turma_nome) + '</span><span class="badge bg-' + (t.percentualPresenca >= 75 ? 'success' : t.percentualPresenca >= 50 ? 'warning text-dark' : 'danger') + ' rounded-pill">' + t.percentualPresenca + '%</span>';
          ul.appendChild(li);
        });
        menorPresenca.appendChild(ul);
      }

      var ativas = document.getElementById('ativasLista');
      ativas.innerHTML = '';
      var profs = ativasData || [];
      if (profs.length === 0) {
        ativas.innerHTML = '<p class="text-muted">Nenhum registro de atividade.</p>';
      } else {
        var ul2 = document.createElement('ul');
        ul2.className = 'list-group list-group-flush';
        profs.forEach(function (p) {
          var li = document.createElement('li');
          li.className = 'list-group-item d-flex justify-content-between align-items-center';
          li.innerHTML = '<span>' + escapeHtml(p.nome) + '</span><span class="badge bg-warning rounded-pill">' + p.totalRegistros + ' registros</span>';
          ul2.appendChild(li);
        });
        ativas.appendChild(ul2);
      }
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  }

  carregar();
})();
