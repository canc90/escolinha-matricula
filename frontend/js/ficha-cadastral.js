document.addEventListener('DOMContentLoaded', function () {

  const form = document.getElementById('fichaForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  const alertArea = document.getElementById('alertArea');

  const API_URL = '/api/public/matricula';
  const UPLOAD_URL = '/api/public/upload';
  const UPLOAD_DOC_URL = '/api/public/upload-documento';

  var fotoUrl = null;
  var documentoUrl = null;

  function clearAlerts() {
    alertArea.innerHTML = '';
  }

  function showAlert(message, type) {
    alertArea.innerHTML = '<div class="alert alert-' + type + ' alert-dismissible fade show">'
      + message
      + '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>'
      + '</div>';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitText.classList.toggle('d-none', loading);
    submitSpinner.classList.toggle('d-none', !loading);
    submitBtn.classList.toggle('disabled', loading);
  }

  async function uploadFoto() {
    var input = document.getElementById('foto');
    if (!input.files || !input.files[0]) return null;
    var fd = new FormData();
    fd.append('foto', input.files[0]);
    var resp = await fetch(UPLOAD_URL, { method: 'POST', body: fd });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erro ao enviar foto.');
    return data.url;
  }

  async function uploadDocumento() {
    var input = document.getElementById('documento');
    if (!input.files || !input.files[0]) return null;
    var fd = new FormData();
    fd.append('documento', input.files[0]);
    var resp = await fetch(UPLOAD_DOC_URL, { method: 'POST', body: fd });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Erro ao enviar documento.');
    return data.url;
  }

  function getFormData() {
    return {
      nome: document.getElementById('nome').value.trim(),
      data_nascimento: document.getElementById('data_nascimento').value,
      genero: document.getElementById('genero').value,
      turma: document.getElementById('turma').value || null,
      turno: document.getElementById('turno').value,
      cpf_aluno: document.getElementById('cpf_aluno').value.trim(),
      endereco_rua: document.getElementById('endereco_rua').value.trim(),
      endereco_bairro: document.getElementById('endereco_bairro').value.trim(),
      endereco_cidade: document.getElementById('endereco_cidade').value.trim(),
      nome_pai: document.getElementById('nome_pai').value.trim(),
      contato_pai: document.getElementById('contato_pai').value.trim(),
      cpf_pai: document.getElementById('cpf_pai').value.trim(),
      nome_mae: document.getElementById('nome_mae').value.trim(),
      contato_mae: document.getElementById('contato_mae').value.trim(),
      cpf_mae: document.getElementById('cpf_mae').value.trim(),
      alergia_intolerancia: document.getElementById('alergia_intolerancia').checked,
      descricao_alergia: document.getElementById('descricao_alergia').value.trim(),
      usa_medicamento: document.getElementById('usa_medicamento').checked,
      necessita_atencao_medicamento: document.getElementById('necessita_atencao_medicamento').checked,
      autorizacao_fotos_redes: document.getElementById('autorizacao_fotos_redes').checked,
      autorizacao_passeios: document.getElementById('autorizacao_passeios').checked,
      aniversario_escola: document.getElementById('aniversario_escola').checked,
      contato_emergencia_nome: document.getElementById('contato_emergencia_nome').value.trim(),
      contato_emergencia_telefone: document.getElementById('contato_emergencia_telefone').value.trim(),
      responsaveis_retirada: document.getElementById('responsaveis_retirada').value.trim(),
      observacoes_aniversario_escola: document.getElementById('observacoes').value.trim(),
      foto: fotoUrl,
      foto_documento: documentoUrl,
    };
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlerts();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const honey = document.getElementById('website').value;
    if (honey) {
      showAlert('Ocorreu um erro. Tente novamente.', 'danger');
      return;
    }

    setLoading(true);

    try {
      fotoUrl = await uploadFoto();
    } catch (err) {
      showAlert(err.message, 'danger');
      setLoading(false);
      return;
    }

    try {
      documentoUrl = await uploadDocumento();
    } catch (err) {
      showAlert(err.message, 'danger');
      setLoading(false);
      return;
    }

    const data = getFormData();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.error || 'Erro ao enviar cadastro. Tente novamente.', 'danger');
        setLoading(false);
        return;
      }

      form.reset();
      form.classList.remove('was-validated');
      fotoUrl = null;
      documentoUrl = null;
      showAlert('Cadastro enviado com sucesso! Entraremos em contato em breve.', 'success');
      submitBtn.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      showAlert('Erro de conexão. Verifique sua internet e tente novamente.', 'danger');
    }
    setLoading(false);
  });
});
