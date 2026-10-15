(function () {
  var token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () { localStorage.removeItem('token'); window.location.href = 'login.html'; });

  function parseToken(t) {
    try {
      return JSON.parse(atob(t.split('.')[1]));
    } catch (e) { return null; }
  }

  var payload = parseToken(token);
  var professoraId = payload && payload.professora_id;
  var nome = payload && payload.nome;

  if (!professoraId) {
    document.getElementById('turmasContainer').innerHTML = '<div class="alert alert-warning">Perfil sem vínculo com professora.</div>';
    return;
  }

  document.getElementById('professoraNome').textContent = 'Bem-vinda, ' + (nome || 'Professora') + '!';

  async function carregarTurmas() {
    try {
      var data = await api.get('/api/turmas/professora/' + professoraId + '/turmas');
      if (!data) return;
      renderTurmas(data.turmas || []);
    } catch (e) {
      document.getElementById('turmasContainer').innerHTML = '<div class="alert alert-danger">Erro ao carregar turmas.</div>';
    }
  }

  function renderTurmas(turmas) {
    var container = document.getElementById('turmasContainer');
    container.innerHTML = '';
    if (turmas.length === 0) {
      container.innerHTML = '<div class="alert alert-info">Nenhuma turma vinculada a você.</div>';
      return;
    }
    turmas.forEach(function (t) {
      var col = document.createElement('div');
      col.className = 'col-md-4';
      col.innerHTML = [
        '<div class="card turma-card border-0 shadow-sm h-100">',
          '<div class="card-body">',
            '<h5 class="card-title">' + t.nome + '</h5>',
            '<p class="card-text text-muted">Turno: ' + (t.turno || '-') + '</p>',
            '<div class="d-grid gap-2">',
              '<a href="frequencias?turma_id=' + t.id + '" class="btn btn-warning">Lançar Chamada</a>',
              '<a href="diario-page?turma_id=' + t.id + '" class="btn btn-warning">Registrar Diário</a>',
            '</div>',
          '</div>',
        '</div>'
      ].join('');
      container.appendChild(col);
    });
  }

  carregarTurmas();
})();
