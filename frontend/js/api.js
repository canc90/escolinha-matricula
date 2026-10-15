(function () {
  var TOKEN_KEY = 'token';
  var refreshing = null;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(t) {
    localStorage.setItem(TOKEN_KEY, t);
  }

  function redirectLogin() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = 'login.html';
  }

  function authHeaders() {
    var token = getToken();
    if (!token) { redirectLogin(); return null; }
    return { 'Authorization': 'Bearer ' + token };
  }

  async function tryRefresh() {
    if (refreshing) return refreshing;
    refreshing = (async function () {
      try {
        var token = getToken();
        var resp = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        });
        if (!resp.ok) { redirectLogin(); return null; }
        var data = await resp.json();
        setToken(data.token);
        return data.token;
      } catch (e) {
        redirectLogin();
        return null;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  async function handleResponse(resp) {
    if (resp.status === 401) { redirectLogin(); return null; }
    if (resp.status === 403) {
      var newToken = await tryRefresh();
      if (!newToken) return null;
      return { _retry: true, _token: newToken };
    }
    var data = await resp.json().catch(function () { return null; });
    if (!resp.ok) throw new Error((data && data.error) || 'Erro na requisição: ' + resp.status);
    return data;
  }

  async function authFetch(url, opts) {
    var headers = authHeaders();
    if (!headers) return null;
    opts.headers = Object.assign({}, opts.headers, headers);
    var resp = await fetch(url, opts);
    var result = await handleResponse(resp);
    if (result && result._retry) {
      opts.headers['Authorization'] = 'Bearer ' + result._token;
      resp = await fetch(url, opts);
      return handleResponse(resp);
    }
    return result;
  }

  var api = {
    async get(url) {
      return authFetch(url, { method: 'GET' });
    },

    async post(url, body) {
      var opts = { method: 'POST' };
      if (body !== undefined) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
      }
      return authFetch(url, opts);
    },

    async put(url, body) {
      var opts = { method: 'PUT' };
      if (body !== undefined) {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = JSON.stringify(body);
      }
      return authFetch(url, opts);
    },

    async del(url) {
      return authFetch(url, { method: 'DELETE' });
    },

    async upload(url, formData) {
      return authFetch(url, { method: 'POST', body: formData });
    }
  };

  window.api = api;
})();
