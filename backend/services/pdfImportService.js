const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../database/connection');
const path = require('path');

/**
 * Extrai os dados brutos do PDF da BDEG.
 * O PDF contém dados tabulares com layout fixo de colunas (dump do banco).
 * Estratégia: extrair texto bruto, identificar linhas de dados pelos IDs numéricos,
 * e fazer parsing campo a campo baseado nos padrões conhecidos.
 */

function normalizarData(valor) {
  if (!valor) return null;
  // Remove espaços e quebras
  let limpo = valor.replace(/\s+/g, '').trim();
  // Padrão: 2021-10-15, 20211015, 15/10/2021, etc
  const match = limpo.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const match2 = limpo.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match2) {
    return `${match2[3]}-${match2[2]}-${match2[1]}`;
  }
  const match3 = limpo.match(/(\d{4})(\d{2})(\d{2})/);
  if (match3) {
    return `${match3[1]}-${match3[2]}-${match3[3]}`;
  }
  return null;
}

function normalizarBooleano(valor) {
  if (!valor) return false;
  const v = valor.toLowerCase().trim();
  return v === 'sim' || v === 'true' || v === '1' || v === 's';
}

function limparTexto(valor) {
  if (!valor) return '';
  return valor
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Parse do texto extraído do PDF.
 * O PDF tem cabeçalhos duplicados a cada página.
 * Os registos começam com um número (ID_alu) seguido do nome.
 */
function parseAlunosFromText(fullText) {
  // Remove os cabeçalhos repetidos
  const headerPattern = /Banco de dados: BDEG[\s\S]*?ID_alu\s*no\s*NomeData_[\s\S]*?TurmaTurno/g;
  let cleanText = fullText.replace(headerPattern, '\n---REGISTRO---\n');

  // Remove rodapés de página
  cleanText = cleanText.replace(/Número da página: \d+\/\d+[\s\S]*?Powered by TCPDF[\s\S]*?/g, '');
  cleanText = cleanText.replace(/12\/03\/2024 às 03:48/g, '');

  // Junta linhas quebradas
  cleanText = cleanText.replace(/-\s*\n\s*/g, ''); // hifenização
  cleanText = cleanText.replace(/([a-zà-ú])\s*\n\s*([a-zà-ú])/gi, '$1$2'); // palavras partidas sem hífen

  const registros = [];
  const alunoBlocks = cleanText.split(/---REGISTRO---/);
  
  for (const block of alunoBlocks) {
    if (block.trim().length < 10) continue;

    const lines = block.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Verifica se começa com dígito(s) seguido de nome (letra maiúscula)
      const recordStart = trimmed.match(/^(\d{1,3})([A-ZÀ-Ú][a-zà-ú]+)/);
      if (!recordStart) continue;

      const idAlu = parseInt(recordStart[1]);
      const restante = trimmed.substring(recordStart[0].length);
      
      const aluno = extrairCamposDoRestante(idAlu, restante);
      if (aluno && aluno.nome) {
        registros.push(aluno);
      }
    }
  }

  return registros;
}

/**
 * Extrai campos do texto restante após ID e início do nome.
 */
function extrairCamposDoRestante(idAlu, texto) {
  try {
    let rest = texto;

    // 1. Nome - termina antes da data (padrão: 4 dígitos - 2 dígitos - 2 dígitos)
    const dateMatch = rest.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) return null;
    
    const nomeRaw = rest.substring(0, rest.indexOf(dateMatch[0])).trim();
    const nome = limparTexto(nomeRaw);
    const dataNascimento = dateMatch[1];
    rest = rest.substring(rest.indexOf(dateMatch[0]) + dateMatch[1].length);

    // 2. Genero - "feminino" ou "masculino"
    const generoMatch = rest.match(/(feminino|masculino)/i);
    const genero = generoMatch ? generoMatch[1].toLowerCase() : '';
    if (generoMatch) {
      rest = rest.substring(rest.indexOf(generoMatch[0]) + generoMatch[0].length);
    }

    const telefonePattern = /(\+?\d{2}\s?\d{4,5}-?\d{4}|\d{2}\s?\d{4,5}-?\d{4}|\d{8,11}|\(\d{2}\)\s?\d{4,5}-?\d{4})/g;
    
    const telefones = [];
    let telMatch;
    const textoCopy = rest;
    while ((telMatch = telefonePattern.exec(textoCopy)) !== null) {
      telefones.push({ value: telMatch[0], index: telMatch.index });
    }

    const simNaoPattern = /(sim|nao|não)/gi;
    const simNaoMatches = [];
    let snMatch;
    const textoCopy2 = rest;
    const simNaoRegex = new RegExp(simNaoPattern.source, 'gi');
    while ((snMatch = simNaoRegex.exec(textoCopy2)) !== null) {
      simNaoMatches.push({ value: snMatch[0].toLowerCase(), index: snMatch.index });
    }

    let alergiaIntolerancia = false;
    let descricaoAlergia = '';
    let usaMedicamento = false;
    let necessitaAtencaoMedicamento = false;
    let autorizacaoFotosRedes = false;
    let autorizacaoPasseios = false;
    let aniversarioEscola = false;
    let observacoesAniversario = '';

    if (simNaoMatches.length >= 7) {
      alergiaIntolerancia = simNaoMatches[0].value === 'sim';
      
      if (alergiaIntolerancia && simNaoMatches.length >= 2) {
        const inicioDesc = simNaoMatches[0].index + simNaoMatches[0].value.length;
        const fimDesc = simNaoMatches[1].index;
        descricaoAlergia = limparTexto(rest.substring(inicioDesc, fimDesc));
      }
      
      usaMedicamento = simNaoMatches.length >= 3 ? simNaoMatches[2].value === 'sim' : false;
      necessitaAtencaoMedicamento = simNaoMatches.length >= 4 ? simNaoMatches[3].value === 'sim' : false;
      autorizacaoFotosRedes = simNaoMatches.length >= 5 ? simNaoMatches[4].value === 'sim' : false;
      autorizacaoPasseios = simNaoMatches.length >= 6 ? simNaoMatches[5].value === 'sim' : false;
      aniversarioEscola = simNaoMatches.length >= 7 ? simNaoMatches[6].value === 'sim' : false;

      if (aniversarioEscola && simNaoMatches.length >= 7) {
        const inicioObs = simNaoMatches[6].index + simNaoMatches[6].value.length;
        let fimObs = rest.length;
        if (telefones.length > 0) {
          for (const tel of telefones) {
            if (tel.index > inicioObs) {
              fimObs = tel.index;
              break;
            }
          }
        }
        observacoesAniversario = limparTexto(rest.substring(inicioObs, fimObs));
      }
    }

    let contatoEmergenciaNome = '';
    let contatoEmergenciaTelefone = '';

    const booleanEndIndex = simNaoMatches.length >= 7 
      ? simNaoMatches[6].index + simNaoMatches[6].value.length 
      : 0;
    
    const afterBooleans = rest.substring(booleanEndIndex);
    
    const finalTelefones = [];
    const finalTelRegex = new RegExp(telefonePattern.source, 'g');
    let ftMatch;
    while ((ftMatch = finalTelRegex.exec(afterBooleans)) !== null) {
      finalTelefones.push({ value: ftMatch[0], index: ftMatch.index });
    }

    const turmaTurnoMatch = afterBooleans.match(/(\d{1,2})\s*(matutino|vespertino)/i);
    let turma = '';
    let turno = '';
    if (turmaTurnoMatch) {
      turma = turmaTurnoMatch[1];
      turno = turmaTurnoMatch[2].toLowerCase();
    }

    if (finalTelefones.length >= 1) {
      contatoEmergenciaTelefone = finalTelefones[0].value.replace(/\s+/g, '');
      const telIndex = finalTelefones[0].index;
      const antesTel = afterBooleans.substring(0, telIndex).trim();
      contatoEmergenciaNome = limparTexto(antesTel.replace(observacoesAniversario, ''));
    }

    let responsaveisRetirada = '';
    if (finalTelefones.length >= 2 && turmaTurnoMatch) {
      const inicioResp = finalTelefones[finalTelefones.length - 1].index + finalTelefones[finalTelefones.length - 1].value.length;
      const fimResp = afterBooleans.indexOf(turmaTurnoMatch[0]);
      if (inicioResp < fimResp) {
        responsaveisRetirada = limparTexto(afterBooleans.substring(inicioResp, fimResp));
      }
    } else if (turmaTurnoMatch) {
      const fimResp = afterBooleans.indexOf(turmaTurnoMatch[0]);
      const inicioResp = finalTelefones.length > 0 
        ? finalTelefones[finalTelefones.length - 1].index + finalTelefones[finalTelefones.length - 1].value.length
        : 0;
      if (inicioResp < fimResp) {
        responsaveisRetirada = limparTexto(afterBooleans.substring(inicioResp, fimResp));
      }
    }

    const antesBooleanos = rest.substring(0, booleanEndIndex > 0 ? booleanEndIndex : rest.length);
    
    const inicioTelefones = [];
    const inicioTelRegex = new RegExp(telefonePattern.source, 'g');
    let itMatch;
    while ((itMatch = inicioTelRegex.exec(antesBooleanos)) !== null) {
      inicioTelefones.push({ value: itMatch[0], index: itMatch.index });
    }

    return {
      id_alu: idAlu,
      nome,
      data_nascimento: dataNascimento,
      genero,
      endereco_rua: '',
      endereco_bairro: '',
      endereco_cidade: '',
      nome_pai: '',
      contato_pai: '',
      nome_mae: '',
      contato_mae: '',
      email_aluno: '',
      alergia_intolerancia: alergiaIntolerancia,
      descricao_alergia: descricaoAlergia,
      usa_medicamento: usaMedicamento,
      necessita_atencao_medicamento: necessitaAtencaoMedicamento,
      autorizacao_fotos_redes: autorizacaoFotosRedes,
      autorizacao_passeios: autorizacaoPasseios,
      pode_brincar_areia: false,
      aniversario_escola: aniversarioEscola,
      observacoes_aniversario_escola: observacoesAniversario,
      contato_emergencia_nome: contatoEmergenciaNome,
      contato_emergencia_telefone: contatoEmergenciaTelefone,
      responsaveis_retirada: responsaveisRetirada,
      turma,
      turno,
    };
  } catch (error) {
    console.error(`Erro ao parsear registro ID ${idAlu}:`, error.message);
    return null;
  }
}

/**
 * Parse de arquivo CSV estruturado.
 */
function parseAlunosFromCSV(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filtra linhas vazias
  const cleanRows = rows.filter(r => r.length > 0 && r.some(f => f.trim() !== ''));
  if (cleanRows.length < 2) return [];

  const headers = cleanRows[0].map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const records = [];

  for (let r = 1; r < cleanRows.length; r++) {
    const row = cleanRows[r];
    if (row.length < headers.length) continue;

    const data = {};
    headers.forEach((header, index) => {
      data[header] = row[index] ? row[index].trim() : '';
    });

    if (!data['nome']) continue;

    const mapped = {
      id_alu: parseInt(data['id_aluno'] || data['id_alu']) || null,
      nome: data['nome'] || '',
      data_nascimento: normalizarData(data['data_nascimento']),
      genero: data['genero'] || '',
      endereco_rua: data['endereco_rua'] || '',
      endereco_bairro: data['endereco_bairro'] || '',
      endereco_cidade: data['endereco_cidade'] || '',
      nome_pai: data['nome_pai'] || '',
      contato_pai: data['contato_pai'] || '',
      nome_mae: data['nome_mae'] || '',
      contato_mae: data['contato_mae'] || '',
      email_aluno: data['email_aluno'] || '',
      alergia_intolerancia: normalizarBooleano(data['alergia_intolerancia']),
      descricao_alergia: data['descricao_alergia'] || '',
      usa_medicamento: normalizarBooleano(data['usa_medicamento']),
      necessita_atencao_medicamento: normalizarBooleano(data['necessita_atencao_medicamento']),
      autorizacao_fotos_redes: normalizarBooleano(data['autorizacao_fotos_redes']),
      autorizacao_passeios: normalizarBooleano(data['autorizacao_passeios']),
      pode_brincar_areia: normalizarBooleano(data['pode_brincar_areia']),
      aniversario_escola: normalizarBooleano(data['aniversario_escola']),
      observacoes_aniversario_escola: data['observacoes_aniversario_escola'] || data['observacoes'] || '',
      contato_emergencia_nome: data['contato_emergencia_nome'] || '',
      contato_emergencia_telefone: data['contato_emergencia_telefone'] || '',
      responsaveis_retirada: data['responsaveis_retirada'] || '',
      turma: data['turma'] || '',
      turno: data['turno'] || '',
    };

    records.push(mapped);
  }

  return records;
}

/**
 * Lê o arquivo e extrai a lista bruta de alunos baseada no tipo.
 */
async function extrairAlunosDeArquivo(caminhoArquivo) {
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
  }

  const ext = path.extname(caminhoArquivo).toLowerCase();

  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(caminhoArquivo);
    const pdfData = await pdfParse(dataBuffer);
    return parseAlunosFromText(pdfData.text);
  } else if (ext === '.csv') {
    const csvText = fs.readFileSync(caminhoArquivo, 'utf8');
    return parseAlunosFromCSV(csvText);
  } else {
    throw new Error(`Formato de arquivo não suportado: ${ext}`);
  }
}

/**
 * Classifica registros em válidos, duplicados e inválidos.
 */
async function analisarAlunosParaImportacao(alunos) {
  const validos = [];
  const duplicados = [];
  const invalidos = [];

  for (const aluno of alunos) {
    if (!aluno.nome || aluno.nome.trim() === '') {
      invalidos.push({
        aluno,
        motivo: 'Nome do aluno está vazio.'
      });
      continue;
    }

    // Verifica duplicado no banco (por id_alu ou por Nome e Nome da Mãe)
    let existente = null;
    if (aluno.id_alu) {
      existente = await db('alunos')
        .where({ id_alu: aluno.id_alu, deleted: false })
        .first();
    } else {
      existente = await db('alunos')
        .where({ nome: aluno.nome, deleted: false })
        .first();
    }

    if (existente) {
      duplicados.push({
        aluno,
        existente: {
          id: existente.id,
          nome: existente.nome,
          turma: existente.turma,
          turno: existente.turno
        }
      });
    } else {
      validos.push(aluno);
    }
  }

  return {
    validos,
    duplicados,
    invalidos
  };
}

/**
 * Grava histórico de logs de importação.
 */
async function registrarLogImportacao(usuario, arquivo, totalLido, totalImportado, totalDuplicados, totalInvalidos, erros) {
  try {
    const logDir = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'import_logs.json');
    
    let logs = [];
    if (fs.existsSync(logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch (e) {
        logs = [];
      }
    }

    const novoLog = {
      timestamp: new Date().toISOString(),
      usuario: usuario || 'sistema',
      arquivo: path.basename(arquivo),
      totalLido,
      totalImportado,
      totalDuplicados,
      totalInvalidos,
      erros,
    };

    logs.unshift(novoLog);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar log de importação:', error);
  }
}

// Mantido para compatibilidade se necessário
async function importarPDF(caminhoArquivo) {
  const resultado = {
    totalLido: 0,
    totalInserido: 0,
    erros: [],
  };

  try {
    const alunos = await extrairAlunosDeArquivo(caminhoArquivo);
    resultado.totalLido = alunos.length;

    const txResult = await db.transaction(async (trx) => {
      let inseridos = 0;
      const erros = [];

      for (const aluno of alunos) {
        try {
          const existente = await trx('alunos')
            .where({ id_alu: aluno.id_alu, deleted: false })
            .first();

          if (existente) {
            await trx('alunos').where({ id: existente.id }).update({
              ...aluno,
              updated_at: trx.fn.now(),
            });
          } else {
            await trx('alunos').insert(aluno);
          }
          inseridos++;
        } catch (err) {
          erros.push({
            id_alu: aluno.id_alu,
            nome: aluno.nome,
            erro: err.message,
          });
        }
      }

      return { inseridos, erros };
    });

    resultado.totalInserido = txResult.inseridos;
    resultado.erros = txResult.erros;
    return resultado;
  } catch (error) {
    throw new Error(`Falha na importação: ${error.message}`);
  }
}

module.exports = {
  extrairAlunosDeArquivo,
  analisarAlunosParaImportacao,
  registrarLogImportacao,
  importarPDF
};
