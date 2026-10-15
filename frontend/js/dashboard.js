(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }
  var _lb = document.getElementById('logoutBtn');
  if (_lb) _lb.addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  var fmt = function (n) { return n.toLocaleString('pt-BR'); };

  async function init() {
    try {
      var data = await api.get('/api/alunos?limit=100');
      if (!data) return;
      var alunos = data.alunos || [];

      var total = data.total || alunos.length;
      var turmasSet = [];
      alunos.forEach(function (a) {
        if (a.turma && turmasSet.indexOf(a.turma) === -1) turmasSet.push(a.turma);
      });
      var matutino = 0, vespertino = 0;
      alunos.forEach(function (a) {
        var t = a.turno || '';
        if (t.toLowerCase() === 'matutino') matutino++;
        else if (t.toLowerCase() === 'vespertino') vespertino++;
      });

      document.getElementById('totalAlunos').textContent = fmt(total);
      document.getElementById('totalTurmas').textContent = fmt(turmasSet.length);
      document.getElementById('totalMatutino').textContent = fmt(matutino);
      document.getElementById('totalVespertino').textContent = fmt(vespertino);

      var turmaCounts = {};
      alunos.forEach(function (a) {
        var t = a.turma || 'Sem turma';
        turmaCounts[t] = (turmaCounts[t] || 0) + 1;
      });
      var turmaLabels = Object.keys(turmaCounts);
      var turmaValues = turmaLabels.map(function (t) { return turmaCounts[t]; });

      new Chart(document.getElementById('turmaChart'), {
        type: 'bar',
        data: {
          labels: turmaLabels,
          datasets: [{ data: turmaValues, backgroundColor: ['#ffc107', '#198754', '#17a2b8', '#dc3545', '#6f42c1'], borderRadius: 4 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });

      var turnoMatutino = 0, turnoVespertino = 0;
      alunos.forEach(function (a) {
        var t = (a.turno || '').toLowerCase();
        if (t === 'matutino') turnoMatutino++;
        else if (t === 'vespertino') turnoVespertino++;
      });

      new Chart(document.getElementById('turnoChart'), {
        type: 'doughnut',
        data: {
          labels: ['Matutino', 'Vespertino'],
          datasets: [{ data: [turnoMatutino, turnoVespertino], backgroundColor: ['#ffc107', '#17a2b8'] }]
        }
      });

      var month = new Date().getMonth() + 1;
      var aniversariantes = alunos.filter(function (a) {
        if (!a.data_nascimento) return false;
        var m = parseInt(a.data_nascimento.split('-')[1], 10);
        return m === month;
      });

      var list = document.getElementById('birthdayList');
      if (aniversariantes.length === 0) {
        list.innerHTML = '<p class="text-muted">Nenhum aniversariante este mês.</p>';
      } else {
        list.innerHTML = aniversariantes.map(function (a) {
          return '<span class="badge bg-info fs-6 px-3 py-2">' + a.nome.split(' ')[0] + ' 🎂 ' + a.data_nascimento.split('-')[2] + '/' + a.data_nascimento.split('-')[1] + '</span>';
        }).join('');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar dados.');
    }
  }

  init();
})();
