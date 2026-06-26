const alunoService = require('../services/alunoService');
const professoraService = require('../services/professoraService');
const resp = require('../services/responseService');

async function matricula(req, res) {
  try {
    const aluno = await alunoService.upsert(req.body);
    return res.status(201).json({ message: 'Cadastro enviado com sucesso!', id: aluno.id });
  } catch (error) {
    console.error('Matricula publica error:', error);
    return resp.serverError(res, 'Erro ao processar cadastro.');
  }
}

async function cadastroProfessora(req, res) {
  try {
    const professora = await professoraService.create(req.body);
    return res.status(201).json({ message: 'Cadastro enviado com sucesso!', id: professora.id });
  } catch (error) {
    console.error('Cadastro professora error:', error);
    return resp.serverError(res, 'Erro ao processar cadastro.');
  }
}

module.exports = { matricula, cadastroProfessora };
