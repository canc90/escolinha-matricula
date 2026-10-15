(function () {
  const tbody = document.getElementById('usersTbody');
  const form = document.getElementById('userForm');
  const modalEl = document.getElementById('userModal');
  const modal = new bootstrap.Modal(modalEl);
  const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
  let deleteId = null;
  let professorasCache = [];

  async function loadProfessoras() {
    try {
      const data = await api.get('/api/professoras?limit=1000');
      professorasCache = data && data.professoras || [];
      const select = document.getElementById('professora_id');
      select.innerHTML = '<option value="">Nenhuma</option>';
      professorasCache.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nome;
        select.appendChild(opt);
      });
    } catch (e) {
      console.error('Erro ao carregar professoras:', e);
    }
  }

  function roleLabel(role) {
    const labels = { admin: 'Admin', direcao: 'Direção', pedagogico: 'Pedagógico', professor: 'Professor', professora: 'Professora' };
    return labels[role] || role;
  }

  function render(users) {
    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      const prof = professorasCache.find(p => p.id === u.professora_id);
      tr.innerHTML = `
        <td>${u.nome}</td>
        <td>${u.usuario}</td>
        <td><span class="badge bg-${roleColor(u.role)}">${roleLabel(u.role)}</span></td>
        <td>${prof ? prof.nome : '—'}</td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}</td>
        <td>
          <button class="btn btn-sm btn-outline-warning" onclick="editUser(${u.id})">Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmDelete(${u.id})">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function roleColor(role) {
    const colors = { admin: 'danger', direcao: 'warning', pedagogico: 'info', professor: 'success', professora: 'warning' };
    return colors[role] || 'secondary';
  }

  async function loadUsers() {
    try {
      const data = await api.get('/api/users');
      render(data);
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    }
  }

  window.openCreateModal = function () {
    form.reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModalLabel').textContent = 'Novo Usuário';
    document.getElementById('senha').required = true;
    document.getElementById('senhaHelp').textContent = 'Obrigatório para novo usuário';
    modal.show();
  };

  window.editUser = async function (id) {
    try {
      const user = await api.get(`/api/users/${id}`);
      document.getElementById('userId').value = user.id;
      document.getElementById('nome').value = user.nome;
      document.getElementById('usuario').value = user.usuario;
      document.getElementById('role').value = user.role;
      document.getElementById('professora_id').value = user.professora_id || '';
      document.getElementById('senha').value = '';
      document.getElementById('senha').required = false;
      document.getElementById('senhaHelp').textContent = 'Deixe em branco para não alterar';
      document.getElementById('userModalLabel').textContent = 'Editar Usuário';
      modal.show();
    } catch (e) {
      alert('Erro ao carregar usuário: ' + e.message);
    }
  };

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const body = {
      nome: document.getElementById('nome').value,
      usuario: document.getElementById('usuario').value,
      role: document.getElementById('role').value,
      professora_id: document.getElementById('professora_id').value || null,
    };
    const senha = document.getElementById('senha').value;
    if (senha) body.senha = senha;

    try {
      if (id) {
        await api.put(`/api/users/${id}`, body);
      } else {
        await api.post('/api/users', body);
      }
      modal.hide();
      loadUsers();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  });

  window.confirmDelete = function (id) {
    deleteId = id;
    confirmModal.show();
  };

  document.getElementById('confirmDeleteBtn').addEventListener('click', async function () {
    if (!deleteId) return;
    try {
      await api.del(`/api/users/${deleteId}`);
      confirmModal.hide();
      loadUsers();
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
    }
  });

  async function init() {
    await loadProfessoras();
    await loadUsers();
  }

  init();
})();