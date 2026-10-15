const authService = require('../services/authService');
const logger = require('../services/loggerService');
const resp = require('../services/responseService');

async function login(req, res) {
  try {
    const { usuario, senha } = req.body;

    if (!usuario || !senha) {
      return resp.fail(res, 'Usuário e senha são obrigatórios.');
    }

    const result = await authService.login(usuario, senha);

    if (!result) {
      return resp.fail(res, 'Usuário ou senha inválidos.', 401);
    }

    logger.log(result.user.id, 'login', 'auth', result.user.id);
    return res.json({ token: result.token, user: result.user });
  } catch (error) {
    console.error('Login error:', error);
    return resp.serverError(res);
  }
}

async function refresh(req, res) {
  try {
    const result = await authService.refresh(req.user.id);
    if (!result) return resp.notFound(res, 'Usuário não encontrado.');
    return res.json({ token: result.token });
  } catch (error) {
    console.error('Refresh error:', error);
    return resp.serverError(res);
  }
}

module.exports = { login, refresh };
