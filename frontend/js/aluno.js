(function () {
  if (!localStorage.getItem('token')) { window.location.href = 'login.html'; return; }

  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });

  var form = document.getElementById('alunoForm');
  var pageTitle = document.getElementById('pageTitle');
  var cancelBtn = document.getElementById('cancelBtn');

  var urlParams = new URLSearchParams(window.location.search);
  var alunoId = urlParams.get('id');
  var isEditMode = !!alunoId;

  async function fetchAlunoData() {
    if (!isEditMode) return;
    try {
      var aluno = await api.get('/api/alunos/' + alunoId);
      if (!aluno) return;
      pageTitle.textContent = 'Editar Aluno: ' + aluno.nome;
      Object.keys(aluno).forEach(function (key) {
        var field = document.getElementById(key);
        if (field) {
          if (field.type === 'checkbox') {
            field.checked = !!aluno[key];
          } else if (field.type === 'date' && aluno[key]) {
            field.value = aluno[key].split('T')[0];
          } else if (field.type !== 'file') {
            field.value = aluno[key];
          }
        }
      });
    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
      alert('Não foi possível carregar os dados do aluno. Redirecionando...');
      window.location.href = 'alunos.html';
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    var fotoUrl = null;
    var documentoUrl = null;
    var fotoInput = document.getElementById('foto');
    if (fotoInput.files && fotoInput.files[0]) {
      var fd = new FormData();
      fd.append('foto', fotoInput.files[0]);
      try {
        var uploadResp = await api.upload('/api/upload/foto', fd);
        fotoUrl = uploadResp.url;
      } catch (e) { alert('Erro ao enviar foto: ' + e.message); return; }
    }
    var docInput = document.getElementById('foto_documento');
    if (docInput.files && docInput.files[0]) {
      var fd2 = new FormData();
      fd2.append('documento', docInput.files[0]);
      try {
        var uploadResp2 = await api.upload('/api/upload/documento', fd2);
        documentoUrl = uploadResp2.url;
      } catch (e) { alert('Erro ao enviar documento: ' + e.message); return; }
    }

    var formData = {
      nome: document.getElementById('nome').value,
      data_nascimento: document.getElementById('data_nascimento').value,
      genero: document.getElementById('genero').value,
      turma: document.getElementById('turma').value,
      turno: document.getElementById('turno').value,
      cpf_aluno: document.getElementById('cpf_aluno').value,
      email_aluno: document.getElementById('email_aluno').value,
      endereco_rua: document.getElementById('endereco_rua').value,
      endereco_bairro: document.getElementById('endereco_bairro').value,
      endereco_cidade: document.getElementById('endereco_cidade').value,
      nome_pai: document.getElementById('nome_pai').value,
      contato_pai: document.getElementById('contato_pai').value,
      cpf_pai: document.getElementById('cpf_pai').value,
      nome_mae: document.getElementById('nome_mae').value,
      contato_mae: document.getElementById('contato_mae').value,
      cpf_mae: document.getElementById('cpf_mae').value,
      alergia_intolerancia: document.getElementById('alergia_intolerancia').checked,
      descricao_alergia: document.getElementById('descricao_alergia').value,
      usa_medicamento: document.getElementById('usa_medicamento').checked,
      necessita_atencao_medicamento: document.getElementById('necessita_atencao_medicamento').checked,
      pode_brincar_areia: document.getElementById('pode_brincar_areia').checked,
      autorizacao_fotos_redes: document.getElementById('autorizacao_fotos_redes').checked,
      autorizacao_passeios: document.getElementById('autorizacao_passeios').checked,
      aniversario_escola: document.getElementById('aniversario_escola').checked,
      contato_emergencia_nome: document.getElementById('contato_emergencia_nome').value,
      contato_emergencia_telefone: document.getElementById('contato_emergencia_telefone').value,
      responsaveis_retirada: document.getElementById('responsaveis_retirada').value,
      observacoes_aniversario_escola: document.getElementById('observacoes_aniversario_escola').value,
      observacoes: document.getElementById('observacoes').value,
    };
    if (fotoUrl) formData.foto = fotoUrl;
    if (documentoUrl) formData.foto_documento = documentoUrl;

    try {
      if (isEditMode) {
        await api.put('/api/alunos/' + alunoId, formData);
      } else {
        await api.post('/api/alunos', formData);
      }
      alert('Aluno salvo com sucesso!');
      window.location.href = 'alunos.html';
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      alert('Erro: ' + error.message);
    }
  });

  cancelBtn.addEventListener('click', function () {
    window.location.href = 'alunos.html';
  });

  fetchAlunoData();
})();
