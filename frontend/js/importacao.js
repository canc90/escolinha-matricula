(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });

  var form = document.getElementById('uploadForm');
  var submitBtn = document.getElementById('submitBtn');
  var submitText = document.getElementById('submitText');
  var submitSpinner = document.getElementById('submitSpinner');
  var alertArea = document.getElementById('alertArea');
  var resultado = document.getElementById('resultado');

  function showAlert(message, type) {
    type = type || 'danger';
    alertArea.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' + message + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function fillTbody(id, rows, cols) {
    var tbody = document.getElementById(id);
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + cols.length + '" class="text-center text-muted">Nenhum registro.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return '<tr>' + cols.map(function (c) { return '<td>' + escapeHtml(r[c]) + '</td>'; }).join('') + '</tr>';
    }).join('');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertArea.innerHTML = '';
    var fileInput = document.getElementById('csvFile');
    if (!fileInput.files || fileInput.files.length === 0) {
      showAlert('Selecione um arquivo CSV.', 'warning');
      return;
    }
    var file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showAlert('O arquivo deve ter extensão .csv', 'warning');
      return;
    }
    var formData = new FormData();
    formData.append('csv', file);
    submitBtn.disabled = true;
    submitText.textContent = 'Importando...';
    submitSpinner.classList.remove('d-none');
    resultado.classList.add('d-none');
    try {
      var data = await api.upload('/api/importar', formData);
      if (!data) return;
      resultado.classList.remove('d-none');
      document.getElementById('cardTotalLido').textContent = data.totalLido;
      document.getElementById('cardImportado').textContent = data.totalImportado;
      document.getElementById('cardDuplicado').textContent = data.totalDuplicados;
      document.getElementById('cardErros').textContent = (data.totalInvalidos + data.totalErros);
      fillTbody('tbodyImportados', (data.importado?.itens || []), ['id_alu', 'nome']);
      var dupList = (data.ignorados?.duplicados || []).map(function (d) { return { id_alu: d.id_alu, nome: d.nome, motivo: d.motivo }; });
      fillTbody('tbodyDuplicados', dupList, ['id_alu', 'nome', 'motivo']);
      fillTbody('tbodyInvalidos', (data.ignorados?.invalidos || []), ['id_alu', 'nome', 'motivo']);
      fillTbody('tbodyErros', (data.erros || []), ['id_alu', 'nome', 'erro']);
      showAlert('Importação concluída. ' + data.totalImportado + ' importado(s), ' + data.totalDuplicados + ' duplicado(s), ' + (data.totalInvalidos + data.totalErros) + ' com erro.', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Erro de comunicação com o servidor.', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = 'Importar';
      submitSpinner.classList.add('d-none');
    }
  });
})();
