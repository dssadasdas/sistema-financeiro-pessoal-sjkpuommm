import { DreReport, MonthlyComparative } from './dreEngine'
import { formatCurrency } from './constants'

export interface PdfExportOptions {
  title: string
  userName?: string
  periodLabel: string
  generationDate?: string
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Gera e dispara o download/impressão de um PDF profissional e limpo formatado para DRE
 */
export function exportDrePdf(dre: DreReport, userName = 'Usuário') {
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Constrói as linhas de tabela
  const rows: {
    label: string
    value: string
    pct: string
    isHeader?: boolean
    isTotal?: boolean
    isGroup?: boolean
    indent?: number
  }[] = [
    {
      label: 'RECEITA BRUTA OPERACIONAL',
      value: formatCurrency(dre.receitaBruta),
      pct: '100,0%',
      isHeader: true,
    },
  ]

  // Itens da Receita Bruta
  dre.groups.receita_bruta.items.forEach((item) => {
    rows.push({
      label: item.category,
      value: formatCurrency(item.value),
      pct: `${(item.percentageOfGross || 0).toFixed(1)}%`,
      indent: 1,
    })
  })

  rows.push({
    label: '(-) Deduções da Receita Bruta',
    value: `−${formatCurrency(dre.deducoes)}`,
    pct: `${((dre.deducoes / (dre.receitaBruta || 1)) * 100).toFixed(1)}%`,
    isGroup: true,
  })
  dre.groups.deducoes.items.forEach((item) => {
    rows.push({
      label: item.category,
      value: `−${formatCurrency(item.value)}`,
      pct: `${(item.percentageOfGross || 0).toFixed(1)}%`,
      indent: 1,
    })
  })

  rows.push({
    label: '= RECEITA OPERACIONAL LÍQUIDA',
    value: formatCurrency(dre.receitaLiquida),
    pct: '100,0%',
    isTotal: true,
  })

  rows.push({
    label: '(-) Custos dos Produtos / Serviços (CMV)',
    value: `−${formatCurrency(dre.cmv)}`,
    pct: `${dre.receitaLiquida > 0 ? ((dre.cmv / dre.receitaLiquida) * 100).toFixed(1) : '0,0'}%`,
    isGroup: true,
  })
  dre.groups.cmv.items.forEach((item) => {
    rows.push({
      label: item.category,
      value: `−${formatCurrency(item.value)}`,
      pct: `${(item.percentageOfNet || 0).toFixed(1)}%`,
      indent: 1,
    })
  })

  rows.push({
    label: `= LUCRO BRUTO (Margem Bruta: ${dre.margemBrutaPct.toFixed(1)}%)`,
    value: formatCurrency(dre.lucroBruto),
    pct: `${dre.margemBrutaPct.toFixed(1)}%`,
    isTotal: true,
  })

  rows.push({
    label: '(-) DESPESAS OPERACIONAIS',
    value: `−${formatCurrency(dre.despesasOperacionaisTotal)}`,
    pct: `${dre.receitaLiquida > 0 ? ((dre.despesasOperacionaisTotal / dre.receitaLiquida) * 100).toFixed(1) : '0,0'}%`,
    isGroup: true,
  })

  const operationalGroups = [
    dre.groups.despesas_administrativas,
    dre.groups.despesas_comerciais,
    dre.groups.pessoal,
    dre.groups.ocupacao,
    dre.groups.despesas_financeiras,
    dre.groups.outras_operacionais,
  ]

  operationalGroups.forEach((grp) => {
    if (grp.total > 0) {
      rows.push({
        label: grp.label.replace('(-) ', ''),
        value: `−${formatCurrency(grp.total)}`,
        pct: `${dre.receitaLiquida > 0 ? ((grp.total / dre.receitaLiquida) * 100).toFixed(1) : '0,0'}%`,
        indent: 1,
      })
      grp.items.forEach((item) => {
        rows.push({
          label: item.category,
          value: `−${formatCurrency(item.value)}`,
          pct: `${(item.percentageOfNet || 0).toFixed(1)}%`,
          indent: 2,
        })
      })
    }
  })

  rows.push({
    label: `= RESULTADO OPERACIONAL (Margem Operacional: ${dre.margemOperacionalPct.toFixed(1)}%)`,
    value: formatCurrency(dre.resultadoOperacional),
    pct: `${dre.margemOperacionalPct.toFixed(1)}%`,
    isTotal: true,
  })

  if (dre.outrasReceitasDespesas !== 0 || dre.groups.outras_receitas_despesas.items.length > 0) {
    rows.push({
      label: '(+/-) Outras Receitas / Despesas Não Operacionais',
      value: formatCurrency(dre.outrasReceitasDespesas),
      pct: `${dre.receitaLiquida > 0 ? ((dre.outrasReceitasDespesas / dre.receitaLiquida) * 100).toFixed(1) : '0,0'}%`,
      isGroup: true,
    })
    dre.groups.outras_receitas_despesas.items.forEach((item) => {
      rows.push({
        label: item.category,
        value: formatCurrency(item.value),
        pct: `${(item.percentageOfNet || 0).toFixed(1)}%`,
        indent: 1,
      })
    })
  }

  rows.push({
    label: `= RESULTADO LÍQUIDO DO PERÍODO (Margem Líquida: ${dre.margemLiquidaPct.toFixed(1)}%)`,
    value: formatCurrency(dre.resultadoLiquido),
    pct: `${dre.margemLiquidaPct.toFixed(1)}%`,
    isTotal: true,
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>DRE — Demonstrativo de Resultado — Semeia com Propósito</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          background: #fff;
          font-size: 11px;
        }
        .header {
          border-bottom: 2px solid #059669;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .brand-title {
          font-size: 18px;
          font-weight: 800;
          color: #059669;
          letter-spacing: -0.5px;
        }
        .brand-subtitle {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-top: 2px;
        }
        .meta-info {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .meta-info strong {
          color: #0f172a;
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .kpi-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          background: #f8fafc;
        }
        .kpi-title {
          font-size: 9px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
        }
        .kpi-value {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 3px;
        }
        .table-dre {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .table-dre th {
          background: #f1f5f9;
          text-align: left;
          padding: 6px 8px;
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #cbd5e1;
        }
        .table-dre td {
          padding: 5px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .row-header {
          background: #f8fafc;
          font-weight: 700;
          color: #0f172a;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
        }
        .row-group {
          font-weight: 600;
          color: #334155;
          background: #fafafa;
        }
        .row-total {
          background: #ecfdf5;
          font-weight: 800;
          color: #065f46;
          border-top: 1.5px solid #059669;
          border-bottom: 1.5px solid #059669;
        }
        .indent-1 { padding-left: 18px !important; color: #475569; }
        .indent-2 { padding-left: 28px !important; color: #64748b; font-size: 10px; }
        .text-right { text-align: right; }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">Semeia com Propósito</div>
          <div class="brand-subtitle">Demonstrativo de Resultado do Exercício (DRE)</div>
        </div>
        <div class="meta-info">
          <div>Usuário: <strong>${escapeHtml(userName)}</strong></div>
          <div>Período: <strong>${escapeHtml(dre.periodLabel)}</strong></div>
          <div>Emissão: ${escapeHtml(dateStr)}</div>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi-card">
          <div class="kpi-title">Receita Bruta</div>
          <div class="kpi-value">${formatCurrency(dre.receitaBruta)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Lucro Bruto (MB: ${dre.margemBrutaPct.toFixed(1)}%)</div>
          <div class="kpi-value">${formatCurrency(dre.lucroBruto)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Res. Operacional</div>
          <div class="kpi-value">${formatCurrency(dre.resultadoOperacional)}</div>
        </div>
        <div class="kpi-card" style="background: #ecfdf5; border-color: #a7f3d0;">
          <div class="kpi-title" style="color: #065f46;">Resultado Líquido (ML: ${dre.margemLiquidaPct.toFixed(1)}%)</div>
          <div class="kpi-value" style="color: ${dre.resultadoLiquido >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(dre.resultadoLiquido)}</div>
        </div>
      </div>

      <table class="table-dre">
        <thead>
          <tr>
            <th style="width: 65%;">Estrutura da DRE</th>
            <th style="width: 20%;" class="text-right">Valor (R$)</th>
            <th style="width: 15%;" class="text-right">Part. %</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((r) => {
              let cls = ''
              if (r.isTotal) cls = 'row-total'
              else if (r.isHeader) cls = 'row-header'
              else if (r.isGroup) cls = 'row-group'

              let indentCls = ''
              if (r.indent === 1) indentCls = 'indent-1'
              else if (r.indent === 2) indentCls = 'indent-2'

              return `
                <tr class="${cls}">
                  <td class="${indentCls}">${escapeHtml(r.label)}</td>
                  <td class="text-right" style="font-family: monospace; font-size: 11px;">${r.value}</td>
                  <td class="text-right" style="color: #64748b; font-size: 10px;">${r.pct}</td>
                </tr>
              `
            })
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        <span>Semeia com Propósito — Relatório Contábil & Gerencial</span>
        <span>Documento gerado automaticamente sem expor credenciais</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `

  openPrintWindow(htmlContent)
}

/**
 * Gera e dispara o download/impressão do Comparativo Mensal em PDF
 */
export function exportComparativePdf(comp: MonthlyComparative, userName = 'Usuário') {
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Comparativo Mensal — Semeia com Propósito</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          background: #fff;
          font-size: 11px;
        }
        .header {
          border-bottom: 2px solid #059669;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .brand-title { font-size: 18px; font-weight: 800; color: #059669; }
        .brand-subtitle { font-size: 13px; font-weight: 700; color: #0f172a; }
        .meta-info { text-align: right; font-size: 10px; color: #64748b; }
        .meta-info strong { color: #0f172a; }
        .insights-box {
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 16px;
        }
        .insights-title { font-weight: 700; color: #1e40af; font-size: 11px; margin-bottom: 6px; }
        .insights-list { margin: 0; padding-left: 16px; font-size: 10.5px; color: #1e3a8a; }
        .insights-list li { margin-bottom: 3px; }
        .table-comp { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .table-comp th {
          background: #f1f5f9;
          text-align: left;
          padding: 6px 8px;
          font-size: 10px;
          font-weight: 700;
          color: #475569;
          border-bottom: 1px solid #cbd5e1;
        }
        .table-comp td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
        .text-right { text-align: right; }
        .text-green { color: #059669; font-weight: 700; }
        .text-red { color: #dc2626; font-weight: 700; }
        .footer {
          margin-top: 24px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">Semeia com Propósito</div>
          <div class="brand-subtitle">Relatório de Comparativo Mensal</div>
        </div>
        <div class="meta-info">
          <div>Usuário: <strong>${escapeHtml(userName)}</strong></div>
          <div>Comparação: <strong>${escapeHtml(comp.currentMonthLabel)}</strong> vs <strong>${escapeHtml(comp.previousMonthLabel)}</strong></div>
          <div>Emissão: ${escapeHtml(dateStr)}</div>
        </div>
      </div>

      ${
        comp.insights.length > 0
          ? `
        <div class="insights-box">
          <div class="insights-title">💡 Insights Automáticos do Mês</div>
          <ul class="insights-list">
            ${comp.insights.map((ins) => `<li>${escapeHtml(ins)}</li>`).join('')}
          </ul>
        </div>
      `
          : ''
      }

      <table class="table-comp">
        <thead>
          <tr>
            <th style="width: 35%;">Indicador</th>
            <th style="width: 20%;" class="text-right">${escapeHtml(comp.previousMonthLabel)}</th>
            <th style="width: 20%;" class="text-right">${escapeHtml(comp.currentMonthLabel)}</th>
            <th style="width: 15%;" class="text-right">Diferença (R$)</th>
            <th style="width: 10%;" class="text-right">Var. %</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Receitas (Receita Bruta)</strong></td>
            <td class="text-right">${formatCurrency(comp.incomePrevious)}</td>
            <td class="text-right">${formatCurrency(comp.incomeCurrent)}</td>
            <td class="text-right ${comp.incomeDiff >= 0 ? 'text-green' : 'text-red'}">
              ${comp.incomeDiff >= 0 ? '+' : ''}${formatCurrency(comp.incomeDiff)}
            </td>
            <td class="text-right ${comp.incomeVariationPct >= 0 ? 'text-green' : 'text-red'}">
              ${comp.incomeVariationPct >= 0 ? '+' : ''}${comp.incomeVariationPct.toFixed(1)}%
            </td>
          </tr>
          <tr>
            <td><strong>Despesas Totais</strong></td>
            <td class="text-right">${formatCurrency(comp.expensePrevious)}</td>
            <td class="text-right">${formatCurrency(comp.expenseCurrent)}</td>
            <td class="text-right ${comp.expenseDiff <= 0 ? 'text-green' : 'text-red'}">
              ${comp.expenseDiff >= 0 ? '+' : ''}${formatCurrency(comp.expenseDiff)}
            </td>
            <td class="text-right ${comp.expenseVariationPct <= 0 ? 'text-green' : 'text-red'}">
              ${comp.expenseVariationPct >= 0 ? '+' : ''}${comp.expenseVariationPct.toFixed(1)}%
            </td>
          </tr>
          <tr style="background: #f8fafc; font-weight: 700;">
            <td><strong>Resultado Líquido</strong></td>
            <td class="text-right">${formatCurrency(comp.resultPrevious)}</td>
            <td class="text-right">${formatCurrency(comp.resultCurrent)}</td>
            <td class="text-right ${comp.resultDiff >= 0 ? 'text-green' : 'text-red'}">
              ${comp.resultDiff >= 0 ? '+' : ''}${formatCurrency(comp.resultDiff)}
            </td>
            <td class="text-right ${comp.resultVariationPct >= 0 ? 'text-green' : 'text-red'}">
              ${comp.resultVariationPct >= 0 ? '+' : ''}${comp.resultVariationPct.toFixed(1)}%
            </td>
          </tr>
          <tr>
            <td>Margem Líquida %</td>
            <td class="text-right">${comp.marginPrevious.toFixed(1)}%</td>
            <td class="text-right">${comp.marginCurrent.toFixed(1)}%</td>
            <td class="text-right ${comp.marginDiff >= 0 ? 'text-green' : 'text-red'}">
              ${comp.marginDiff >= 0 ? '+' : ''}${comp.marginDiff.toFixed(1)} p.p.
            </td>
            <td class="text-right">—</td>
          </tr>
          <tr>
            <td>Taxa de Economia %</td>
            <td class="text-right">${comp.savingsPrevious.toFixed(1)}%</td>
            <td class="text-right">${comp.savingsCurrent.toFixed(1)}%</td>
            <td class="text-right ${comp.savingsDiff >= 0 ? 'text-green' : 'text-red'}">
              ${comp.savingsDiff >= 0 ? '+' : ''}${comp.savingsDiff.toFixed(1)} p.p.
            </td>
            <td class="text-right">—</td>
          </tr>
        </tbody>
      </table>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
          <strong style="font-size: 11px; color: #dc2626;">Top 5 Maiores Despesas (${escapeHtml(comp.currentMonthLabel)})</strong>
          <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px;">
            ${comp.top5Expenses
              .map(
                (exp) => `
              <tr>
                <td style="padding: 3px 0;">${escapeHtml(exp.category)}</td>
                <td class="text-right" style="padding: 3px 0; font-family: monospace;">${formatCurrency(exp.value)}</td>
                <td class="text-right" style="padding: 3px 0; color: #64748b;">${exp.percentage.toFixed(1)}%</td>
              </tr>
            `,
              )
              .join('')}
          </table>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
          <strong style="font-size: 11px; color: #059669;">Top 5 Fontes de Receita (${escapeHtml(comp.currentMonthLabel)})</strong>
          <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px;">
            ${comp.top5Incomes
              .map(
                (inc) => `
              <tr>
                <td style="padding: 3px 0;">${escapeHtml(inc.category)}</td>
                <td class="text-right" style="padding: 3px 0; font-family: monospace;">${formatCurrency(inc.value)}</td>
                <td class="text-right" style="padding: 3px 0; color: #64748b;">${inc.percentage.toFixed(1)}%</td>
              </tr>
            `,
              )
              .join('')}
          </table>
        </div>
      </div>

      <div class="footer">
        <span>Semeia com Propósito — Relatório de Análise Comparativa</span>
        <span>Gerado com segurança e dados 100% reais</span>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `

  openPrintWindow(htmlContent)
}

function openPrintWindow(htmlContent: string) {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (doc) {
    doc.open()
    doc.write(htmlContent)
    doc.close()
  }

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (_) {
      // Fallback popup se iframe for bloqueado
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(htmlContent)
        win.document.close()
      }
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 2000)
    }
  }, 300)
}
