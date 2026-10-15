const path = require('path');
const db = require('../database/connection');
const { readCSV } = require('../services/importService');

const CSV_PATH = path.resolve(__dirname, '..', '..', 'data', 'BDEG.csv');
const BOOLEANOS_CSV = ['alergia_intolerancia', 'aniversario_escola'];
const BOOLEANOS_FIXOS = ['usa_medicamento', 'necessita_atencao_medicamento', 'autorizacao_fotos_redes', 'autorizacao_passeios'];

const MAPA_COLUNAS = {
  id_aluno: 'id_alu',
  nome: 'nome',
  data_nascimento: 'data_nascimento',
  genero: 'genero',
  endereco_rua: 'endereco_rua',
  endereco_bairro: 'endereco_bairro',
  endereco_cidade: 'endereco_cidade',
  nome_pai: 'nome_pai',
  contato_pai: 'contato_pai',
  nome_mae: 'nome_mae',
  contato_mae: 'contato_mae',
  email_aluno: 'email_aluno',
  alergia_intolerancia: 'alergia_intolerancia',
  descricao_alergia: 'descricao_alergia',
  aniversario_escola: 'aniversario_escola',
  observacoes_aniversario_escola: 'observacoes_aniversario_escola',
  contato_emergencia_nome: 'contato_emergencia_nome',
  contato_emergencia_telefone: 'contato_emergencia_telefone',
  responsaveis_retirada: 'responsaveis_retirada',
  turma: 'turma',
  turno: 'turno',
};

function normalizarData(valor) {
  if (!valor) return null;
  const v = String(valor).trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function dataValida(iso) {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00Z');
  return !isNaN(d.getTime()) && iso === d.toISOString().slice(0, 10);
}

function normalizarBooleano(valor) {
  if (valor === undefined || valor === null) return false;
  const v = String(valor).toLowerCase().trim();
  return v === 'sim' || v === 'true' || v === '1' || v === 's';
}

function limpar(valor) {
  if (valor === undefined || valor === null) return '';
  return String(valor).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function chaveDuplicado(nome, nomeMae) {
  const n = (nome || '').toLowerCase().trim();
  const m = (nomeMae || '').toLowerCase().trim();
  return `${n}::${m}`;
}

function normalizarRegistro(row) {
  const get = (csvKey) => limpar(row[csvKey] !== undefined ? row[csvKey] : '');
  const dbKey = {};
  for (const [csvKey, field] of Object.entries(MAPA_COLUNAS)) {
    dbKey[field] = csvKey;
  }

  const registro = {};
  for (const [csvKey, field] of Object.entries(MAPA_COLUNAS)) {
    registro[field] = get(csvKey);
  }

  registro.id_alu = registro.id_alu ? parseInt(registro.id_alu, 10) || null : null;
  registro.data_nascimento = normalizarData(registro.data_nascimento);

  for (const campo of BOOLEANOS_CSV) {
    registro[campo] = normalizarBooleano(registro[campo]);
  }
  for (const campo of BOOLEANOS_FIXOS) {
    registro[campo] = false;
  }

  return registro;
}

async function main() {
  console.log('Importador de Alunos - BDEG.csv\n');

  const registros = readCSV(CSV_PATH);
  if (registros.length === 0) {
    console.error('CSV vazio ou sem dados.');
    process.exit(1);
  }
  console.log(`Total de linhas lidas: ${registros.length}\n`);

  const existentes = await db('alunos').select('nome', 'nome_mae');
  const chavesExistentes = new Set(existentes.map(a => chaveDuplicado(a.nome, a.nome_mae)));
  console.log(`Registros pre-existentes no banco: ${existentes.length}\n`);

  let importado = 0;
  let ignoradoDuplicado = 0;
  let ignoradoInvalido = 0;
  const primeirosImportados = [];
  const erros = [];

  for (let i = 0; i < registros.length; i++) {
    const registro = normalizarRegistro(registros[i]);

    if (!registro.nome) {
      ignoradoInvalido++;
      erros.push({ linha: i + 2, motivo: 'Nome vazio' });
      continue;
    }
    if (!registro.data_nascimento || !dataValida(registro.data_nascimento)) {
      ignoradoInvalido++;
      erros.push({ linha: i + 2, nome: registro.nome, motivo: `Data invalida: ${registro.data_nascimento || '(vazio)'}` });
      continue;
    }

    const chave = chaveDuplicado(registro.nome, registro.nome_mae);
    if (chavesExistentes.has(chave)) {
      ignoradoDuplicado++;
      continue;
    }

    try {
      await db('alunos').insert({ ...registro, deleted: false });
      chavesExistentes.add(chave);
      importado++;
      if (primeirosImportados.length < 5) {
        primeirosImportados.push({
          id_alu: registro.id_alu,
          nome: registro.nome,
          data_nascimento: registro.data_nascimento,
          nome_mae: registro.nome_mae,
          turma: registro.turma,
          turno: registro.turno,
        });
      }
    } catch (err) {
      ignoradoInvalido++;
      erros.push({ linha: i + 2, nome: registro.nome, motivo: err.message });
    }
  }

  console.log('===== RESULTADO DA IMPORTACAO =====');
  console.log(`Lidos:     ${registros.length}`);
  console.log(`Importados: ${importado}`);
  console.log(`Duplicados: ${ignoradoDuplicado}`);
  console.log(`Invalidos:  ${ignoradoInvalido}`);
  console.log('===================================\n');

  if (primeirosImportados.length > 0) {
    console.log('Primeiros 5 registros importados:');
    primeirosImportados.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [ID_alu=${r.id_alu}] ${r.nome}`);
      console.log(`     Nasc.: ${r.data_nascimento} | Mae: ${r.nome_mae || '(nao informada)'} | Turma: ${r.turma} | Turno: ${r.turno}`);
    });
    console.log('');
  }

  if (erros.length > 0) {
    console.log('Erros encontrados:');
    erros.slice(0, 10).forEach(e => {
      console.log(`  Linha ${e.linha}: ${e.nome || '(sem nome)'} - ${e.motivo}`);
    });
    if (erros.length > 10) console.log(`  ... e mais ${erros.length - 10} erro(s).`);
  }

  await db.destroy();
  process.exit(0);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
