const report = require('../services/reportService');
const bi = require('../services/biService');
const resp = require('../services/responseService');
const PDFDocument = require('pdfkit');

function parseFilters(req) {
  return {
    turma_id: req.query.turma_id || null,
    professora_id: req.query.professora_id || null,
    ano_letivo: req.query.ano_letivo || null,
    data_inicio: req.query.data_inicio || null,
    data_fim: req.query.data_fim || null,
  };
}

function applyRoleFilter(req, filters) {
  if (req.user.role !== 'admin') {
    filters.professora_id = req.user.professora_id;
  }
}

// ---- CSV ----

async function presencaCSV(req, res) {
  try {
    const filters = parseFilters(req);
    applyRoleFilter(req, filters);
    const csv = await report.presencaCSV(filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="presenca.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('CSV presenca error:', error);
    return resp.serverError(res);
  }
}

async function turmasCSV(req, res) {
  try {
    if (req.user.role !== 'admin') return resp.forbidden(res);
    const filters = parseFilters(req);
    const csv = await report.turmasCSV(filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="turmas.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('CSV turmas error:', error);
    return resp.serverError(res);
  }
}

async function professorasCSV(req, res) {
  try {
    if (req.user.role !== 'admin') return resp.forbidden(res);
    const filters = parseFilters(req);
    const csv = await report.professorasCSV(filters);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="professoras.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('CSV professoras error:', error);
    return resp.serverError(res);
  }
}

// ---- PDF helpers ----

function drawHeader(doc, title) {
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1.5);
}

function drawSeparator(doc) {
  doc.moveDown(0.5);
  doc.fontSize(10).text('─'.repeat(80), { align: 'center' });
  doc.moveDown(0.5);
}

function drawKpiBox(doc, label, value, x, y, w) {
  doc.roundedRect(x, y, w, 50, 5).stroke('#ddd');
  doc.fontSize(9).font('Helvetica').fillColor('#666').text(label, x + 5, y + 5, { width: w - 10, align: 'center' });
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#333').text(String(value), x + 5, y + 22, { width: w - 10, align: 'center' });
}

async function relatorioGeralPDF(req, res) {
  try {
    if (req.user.role !== 'admin') return resp.forbidden(res);
    const filters = parseFilters(req);
    const data = await report.relatorioGeral(filters);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-geral.pdf"');
    doc.pipe(res);

    drawHeader(doc, 'Relatório Geral - Direção Escolar');
    doc.fontSize(8).fillColor('#999').text(`Período: ${filters.data_inicio || 'início'} a ${filters.data_fim || 'hoje'}`, { align: 'center' });
    doc.moveDown(1);

    // KPIs
    const p = data.dashboard;
    drawKpiBox(doc, 'Presença Geral', p.presenca.percentualPresenca + '%', 40, doc.y, 120);
    drawKpiBox(doc, 'Total Alunos', p.totais.alunos, 168, doc.y, 120);
    drawKpiBox(doc, 'Total Turmas', p.totais.turmas, 296, doc.y, 120);
    drawKpiBox(doc, 'Aulas Diário', p.diario.totalRegistros, 424, doc.y, 120);
    doc.moveDown(5);

    // Ranking turmas
    doc.addPage();
    drawHeader(doc, 'Ranking de Turmas');
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Pos.  Turma                  Turno     % Presença  Presentes  Faltas');
    doc.fontSize(9).font('Helvetica');
    data.rankingTurmas.forEach((t, i) => {
      doc.text(
        String(i + 1).padStart(3) + '   ' +
        t.turma_nome.padEnd(22) +
        (t.turno || '-').padEnd(10) +
        String(t.percentualPresenca).padStart(5) + '%' +
        String(t.totalPresentes).padStart(8) +
        String(t.totalFaltas).padStart(8)
      );
    });

    if (data.evolucaoPresenca.length > 0) {
      doc.addPage();
      drawHeader(doc, 'Evolução Mensal da Presença');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Mês         Total  Presentes  Faltas  %     Variação');
      doc.fontSize(9).font('Helvetica');
      data.evolucaoPresenca.forEach(e => {
        doc.text(
          String(e.mes).padEnd(11) +
          String(e.total).padStart(6) +
          String(e.presentes).padStart(8) +
          String(e.faltas).padStart(8) +
          String(e.percentual).padStart(4) + '%' +
          (e.variacaoPercentual !== null ? String(e.variacaoPercentual).padStart(7) + '%' : '     -')
        );
      });
    }

    if (data.rankingProfessoras.length > 0) {
      doc.addPage();
      drawHeader(doc, 'Atividade Docente');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Professora              Registros  Dias   Regularidade');
      doc.fontSize(9).font('Helvetica');
      data.rankingProfessoras.forEach(p => {
        doc.text(
          String(p.nome).padEnd(24) +
          String(p.totalRegistros).padStart(8) +
          String(p.totalDias).padStart(7) +
          String(p.regularidade).padStart(10)
        );
      });
    }

    doc.end();
  } catch (error) {
    console.error('PDF geral error:', error);
    if (!res.headersSent) return resp.serverError(res);
  }
}

async function relatorioTurmaPDF(req, res) {
  try {
    const filters = parseFilters(req);
    const turmaId = req.params.id;

    // Professora pode ver apenas turmas vinculadas
    if (req.user.role !== 'admin') {
      const vinculo = await require('../services/frequenciasService').verificarVinculo(turmaId, req.user.professora_id);
      if (!vinculo) return resp.forbidden(res);
    }

    const data = await report.relatorioTurma(turmaId, filters);
    if (!data) return resp.notFound(res, 'Turma não encontrada.');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="turma-${data.turma.nome}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, `Relatório da Turma ${data.turma.nome}`);
    doc.fontSize(9).fillColor('#666').text(`Turno: ${data.turma.turno || '-'}  |  Ano: ${data.turma.anoLetivo || '-'}  |  Alunos: ${data.totalAlunos}`, { align: 'center' });
    doc.moveDown(1);

    drawKpiBox(doc, '% Presença', data.presenca.percentualPresenca + '%', 40, doc.y, 110);
    drawKpiBox(doc, 'Presentes', data.presenca.totalPresentes, 160, doc.y, 110);
    drawKpiBox(doc, 'Faltas', data.presenca.totalFaltas, 280, doc.y, 110);
    drawKpiBox(doc, 'Aulas Diário', data.totalAulasDiario, 400, doc.y, 110);
    doc.moveDown(5);

    // Lista de alunos
    doc.addPage();
    drawHeader(doc, `Alunos - ${data.turma.nome}`);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Nome                          Presentes  Faltas');
    doc.fontSize(9).font('Helvetica');
    for (const a of data.alunos) {
      doc.text(
        String(a.nome).padEnd(30) +
        String(a.frequencia.presente).padStart(8) +
        String(a.frequencia.falta).padStart(8)
      );
    }

    // Histórico diário
    if (data.diario.length > 0) {
      doc.addPage();
      drawHeader(doc, `Histórico de Aulas - ${data.turma.nome}`);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Data       Conteúdo');
      doc.fontSize(9).font('Helvetica');
      for (const d of data.diario) {
        doc.text(String(d.data).padEnd(10) + ' ' + (d.conteudo_aula || '-'));
      }
    }

    // Evolução
    if (data.evolucaoPresenca.length > 0) {
      doc.addPage();
      drawHeader(doc, `Evolução da Presença - ${data.turma.nome}`);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Mês         % Presença  Presentes  Faltas');
      doc.fontSize(9).font('Helvetica');
      data.evolucaoPresenca.forEach(e => {
        doc.text(
          String(e.mes).padEnd(11) +
          String(e.percentual).padStart(6) + '%' +
          String(e.presentes).padStart(8) +
          String(e.faltas).padStart(8)
        );
      });
    }

    doc.end();
  } catch (error) {
    console.error('PDF turma error:', error);
    if (!res.headersSent) return resp.serverError(res);
  }
}

async function relatorioProfessoraPDF(req, res) {
  try {
    const profId = req.params.id;

    if (req.user.role !== 'admin' && Number(req.user.professora_id) !== Number(profId)) {
      return resp.forbidden(res);
    }

    const data = await report.relatorioProfessora(profId);
    if (!data) return resp.notFound(res, 'Professora não encontrada.');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="professora-${data.professora.nome}.pdf"`);
    doc.pipe(res);

    drawHeader(doc, `Relatório - Professora ${data.professora.nome}`);
    doc.moveDown(1);

    drawKpiBox(doc, 'Total Aulas', data.totalAulas, 40, doc.y, 120);
    drawKpiBox(doc, 'Turmas', data.turmasVinculadas.length, 170, doc.y, 120);
    drawKpiBox(doc, 'Registros/Dia', data.ranking?.regularidade || '-', 300, doc.y, 120);
    doc.moveDown(5);

    if (data.turmasVinculadas.length > 0) {
      doc.moveDown(1);
      doc.fontSize(12).font('Helvetica-Bold').text('Turmas Vinculadas');
      doc.fontSize(9).font('Helvetica');
      for (const t of data.turmasVinculadas) {
        doc.text(`  ${t.nome}${t.principal ? ' (principal)' : ''}`);
      }
    }

    if (data.diarioRegistros.length > 0) {
      doc.addPage();
      drawHeader(doc, 'Registros no Diário de Classe');
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Data       Turma    Conteúdo');
      doc.fontSize(9).font('Helvetica');
      for (const d of data.diarioRegistros) {
        doc.text(
          String(d.data).padEnd(10) + ' ' +
          String(d.turma_nome).padEnd(10) + ' ' +
          (d.conteudo_aula || '-')
        );
      }
    }

    if (data.auditLogs.length > 0) {
      doc.addPage();
      drawHeader(doc, 'Histórico de Ações (Auditoria)');
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Data/Hora            Ação      Entidade         ID');
      doc.fontSize(8).font('Helvetica');
      for (const a of data.auditLogs) {
        doc.text(
          String(a.created_at).padEnd(20) +
          String(a.action).padEnd(10) +
          String(a.entity || '-').padEnd(16) +
          String(a.entity_id || '-')
        );
      }
    }

    doc.end();
  } catch (error) {
    console.error('PDF professora error:', error);
    if (!res.headersSent) return resp.serverError(res);
  }
}

module.exports = { presencaCSV, turmasCSV, professorasCSV, relatorioGeralPDF, relatorioTurmaPDF, relatorioProfessoraPDF };
