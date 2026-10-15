const { extrairAlunosDeArquivo, analisarAlunosParaImportacao, registrarLogImportacao } = require('../services/pdfImportService');
const db = require('../database/connection');
const path = require('path');
const resp = require('../services/responseService');
const logger = require('../services/loggerService');

async function importarAlunosCSV(req, res) {
  let filePath;
  try {
    if (!req.file) return resp.fail(res, 'Arquivo CSV não enviado.');

    filePath = req.file.path;
    const originalName = req.file.originalname || path.basename(filePath);
    const ext = path.extname(originalName).toLowerCase();

    if (ext !== '.csv') return resp.fail(res, 'Apenas arquivos CSV são aceitos.');

    const registrosBrutos = await extrairAlunosDeArquivo(filePath);
    const totalLido = registrosBrutos.length;

    const { validos, duplicados, invalidos } = await analisarAlunosParaImportacao(registrosBrutos);

    const resultado = await db.transaction(async (trx) => {
      const inseridos = [];
      const erros = [];

      for (const aluno of validos) {
        try {
          const [novoId] = await trx('alunos').insert({ ...aluno, deleted: false });
          inseridos.push({ id: novoId, id_alu: aluno.id_alu, nome: aluno.nome });
        } catch (err) {
          erros.push({ id_alu: aluno.id_alu, nome: aluno.nome, erro: err.message });
        }
      }

      return { inseridos, erros };
    });

    const usuario = req.user?.username || req.user?.id || 'sistema';
    await registrarLogImportacao(usuario, filePath, totalLido, resultado.inseridos.length, duplicados.length, invalidos.length + resultado.erros.length, resultado.erros);

    logger.log(req.user?.id, 'import', 'aluno', null, { count: resultado.inseridos.length });

    return res.json({
      message: 'Importação concluída.',
      arquivo: path.basename(filePath),
      totalLido,
      totalImportado: resultado.inseridos.length,
      totalDuplicados: duplicados.length,
      totalInvalidos: invalidos.length,
      totalErros: resultado.erros.length,
      importado: { itens: resultado.inseridos.map(i => ({ id_alu: i.id_alu, nome: i.nome })) },
      ignorados: {
        duplicados: duplicados.map(d => ({ id_alu: d.aluno.id_alu, nome: d.aluno.nome, motivo: 'Aluno já cadastrado.' })),
        invalidos: invalidos.map(i => ({ id_alu: i.aluno?.id_alu || null, nome: i.aluno?.nome || '(sem nome)', motivo: i.motivo })),
      },
      erros: resultado.erros,
    });
  } catch (error) {
    console.error('Erro na importação de alunos:', error);
    return resp.serverError(res, error.message);
  }
}

module.exports = { importarAlunosCSV };
