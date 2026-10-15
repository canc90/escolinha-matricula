(function () {
  var form = document.getElementById('loginForm');
  var errorMsg = document.getElementById('errorMsg');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorMsg.textContent = '';
    var usuario = document.getElementById('usuario').value.trim();
    var senha = document.getElementById('senha').value;
    try {
      var response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario, senha: senha })
      });
      var data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha no login');
      }
      localStorage.setItem('token', data.token);
      var role = data.user && data.user.role;
      if (role === 'professor' || role === 'professora') {
        window.location.href = 'dashboard-professora';
      } else if (role === 'direcao') {
        window.location.href = 'direcao';
      } else if (role === 'pedagogico') {
        window.location.href = 'dashboard-pedagogico';
      } else {
        window.location.href = 'dashboard.html';
      }
    } catch (err) {
      errorMsg.textContent = err.message;
    }
  });
})();
