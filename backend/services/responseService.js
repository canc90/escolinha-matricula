function success(res, data, meta, status = 200) {
  const body = { data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

function created(res, data) {
  return success(res, data, null, 201);
}

function noContent(res) {
  return res.status(204).end();
}

function fail(res, message, status = 400, code) {
  const body = { error: message };
  if (code) body.code = code;
  return res.status(status).json(body);
}

function notFound(res, message = 'Registro não encontrado.') {
  return fail(res, message, 404, 'NOT_FOUND');
}

function unauthorized(res, message = 'Não autorizado.') {
  return fail(res, message, 401, 'UNAUTHORIZED');
}

function forbidden(res, message = 'Acesso proibido.') {
  return fail(res, message, 403, 'FORBIDDEN');
}

function serverError(res, message = 'Erro interno do servidor.') {
  return fail(res, message, 500, 'SERVER_ERROR');
}

module.exports = { success, created, noContent, fail, notFound, unauthorized, forbidden, serverError };
