document.addEventListener('DOMContentLoaded', function () {

  var TURMA_OPTIONS = [
    { value: '1', label: 'Maternal I' },
    { value: '2', label: 'Maternal II' },
    { value: '3', label: 'Jardim I' },
    { value: '4', label: 'Jardim II' },
  ];

  var turmaSelect = document.getElementById('turma');
  TURMA_OPTIONS.forEach(function (t) {
    var opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    turmaSelect.appendChild(opt);
  });

  var form = document.getElementById('cadastroForm');
  var submitBtn = document.getElementById('submitBtn');
  var submitText = document.getElementById('submitText');
  var submitSpinner = document.getElementById('submitSpinner');
  var alertArea = document.getElementById('alertArea');

  var API_URL = '/api/public/professoras';
  var UPLOAD_URL = '/api/public/upload';
  var UPLOAD_DOC_URL = '/api/public/upload-documento';

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
      cpf: document.getElementById('cpf').value.trim(),
      rg: document.getElementById('rg').value.trim(),
      email: document.getElementById('email').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      especialidade: document.getElementById('especialidade').value.trim(),
      turma: document.getElementById('turma').value,
      turno: document.getElementById('turno').value,
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

    var honey = document.getElementById('website').value;
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

    var data = getFormData();

    try {
      var response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      var result = await response.json();

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
