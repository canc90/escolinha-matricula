const VALID_STRING_FIELDS = [
  'nome', 'genero', 'endereco_rua', 'endereco_bairro', 'endereco_cidade',
  'nome_pai', 'contato_pai', 'nome_mae', 'contato_mae', 'email_aluno',
  'descricao_alergia', 'contato_emergencia_nome', 'contato_emergencia_telefone',
  'responsaveis_retirada', 'observacoes_aniversario_escola', 'turma', 'turno', 'foto', 'foto_documento',
  'cpf_aluno', 'cpf_pai', 'cpf_mae',
];

const BOOLEAN_FIELDS = [
  'alergia_intolerancia', 'usa_medicamento', 'necessita_atencao_medicamento',
  'autorizacao_fotos_redes', 'autorizacao_passeios', 'pode_brincar_areia',
  'aniversario_escola',
];

const NUMERIC_FIELDS = ['id_alu'];

const MAX_STRING_LENGTH = 255;

function sanitizeString(val) {
  if (typeof val !== 'string') return '';
  return val.trim().substring(0, MAX_STRING_LENGTH);
}

function validateLoginInput(req, res, next) {
  const { usuario, senha } = req.body;

  if (!usuario || typeof usuario !== 'string' || usuario.trim().length === 0) {
    return res.status(400).json({ error: 'Usuário inválido.' });
  }
  if (!senha || typeof senha !== 'string' || senha.trim().length === 0) {
    return res.status(400).json({ error: 'Senha inválida.' });
  }

  req.body.usuario = usuario.trim();
  req.body.senha = senha;
  next();
}

function validateAlunoInput(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisição inválido.' });
  }

  if (body.nome !== undefined && (typeof body.nome !== 'string' || body.nome.trim().length === 0)) {
    return res.status(400).json({ error: 'Nome inválido.' });
  }

  if (body.email_aluno && typeof body.email_aluno === 'string' && body.email_aluno.trim().length > 0) {
    const email = body.email_aluno.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }
    body.email_aluno = email;
  }

  if (body.data_nascimento && typeof body.data_nascimento === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.data_nascimento.trim())) {
      return res.status(400).json({ error: 'Data de nascimento inválida. Use o formato AAAA-MM-DD.' });
    }
  }

  for (const field of VALID_STRING_FIELDS) {
    if (field in body) {
      body[field] = sanitizeString(body[field]);
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (field in body) {
      body[field] = !!body[field];
    }
  }

  if ('id_alu' in body && body.id_alu !== null && body.id_alu !== undefined && body.id_alu !== '') {
    const parsed = parseInt(body.id_alu, 10);
    if (isNaN(parsed)) {
      return res.status(400).json({ error: 'id_alu deve ser um número.' });
    }
    body.id_alu = parsed;
  }

  next();
}

const PROFESSORA_STRING_FIELDS = [
  'nome', 'email', 'telefone', 'especialidade', 'turma', 'turno', 'rg', 'cpf', 'foto', 'foto_documento',
];

function validateProfessoraInput(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisição inválido.' });
  }

  if (body.nome !== undefined && (typeof body.nome !== 'string' || body.nome.trim().length === 0)) {
    return res.status(400).json({ error: 'Nome inválido.' });
  }

  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const email = body.email.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }
    body.email = email;
  }

  for (const field of PROFESSORA_STRING_FIELDS) {
    if (field in body) {
      body[field] = sanitizeString(body[field]);
    }
  }

  next();
}

module.exports = { validateLoginInput, validateAlunoInput, validateProfessoraInput };
