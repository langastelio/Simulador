const capitalInput = document.getElementById('capital');
const moedaSelect = document.getElementById('moeda');
const prazoSelect = document.getElementById('prazo');
const tipoJurosSelect = document.getElementById('tipoJuros');
const taxaNegociadaInput = document.getElementById('taxaNegociada');
const printLogo = document.getElementById('printLogo');
const printCompanyName = document.getElementById('printCompanyName');
const reutilizarJurosCheckbox = document.getElementById('reutilizarJuros');
const calcularBtn = document.getElementById('calcularBtn');
const limparBtn = document.getElementById('limparBtn');
const imprimirBtn = document.getElementById('imprimirBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const tabelaBody = document.querySelector('#tabelaResultados tbody');
const resCapital = document.getElementById('resCapital');
const resTaxa = document.getElementById('resTaxa');
const resIrps = document.getElementById('resIrps');
const resJurosBruto = document.getElementById('resJurosBruto');
const resImposto = document.getElementById('resImposto');
const resJurosLiquido = document.getElementById('resJurosLiquido');
const resMontante = document.getElementById('resMontante');
const campoPadraoContainer = document.getElementById('campoPadraoContainer');
const campoNegociadoContainer = document.getElementById('campoNegociadoContainer');
const taxaPadraoDisplay = document.getElementById('taxaPadrao');
const erroCapital = document.getElementById('erroCapital');
const erroTaxaPadrao = document.getElementById('erroTaxaPadrao');
const erroTaxaNegociada = document.getElementById('erroTaxaNegociada');
const resultadoSection = document.getElementById('passo2');
const printData = document.getElementById('printData');
const printRef = document.getElementById('printRef');

// Indica se o painel de resultados reflete uma simulação já calculada.
let temResultado = false;
// Dados estruturados da última simulação calculada (para gerar o PDF).
let ultimaSimulacao = null;


// Localização: português de Portugal/Moçambique (separador decimal vírgula).
// Trocar para 'pt-MZ' aqui caso se pretenda esse identificador.
const LOCALE = 'pt-PT';

const IRPS = 0.10;
// Limites de sanidade para a taxa negociada (taxa anual em %).
const TAXA_NEGOCIADA_MAX = 100;    // acima disto é certamente um erro de digitação -> rejeita
const TAXA_NEGOCIADA_ALERTA = 20;  // acima disto é invulgar -> pede confirmação
const taxaPorMoeda = {
  MZN: { 30: 3.15, 90: 3.15, 180: 3.15, 365: 3.15 },
  USD: { 30: 1.77, 90: 1.77, 180: 1.77, 365: 1.77 },
  ZAR: { 30: 3.72, 90: 3.72, 180: 3.72, 365: 3.72 },
  EUR: { 30: 0.69, 90: 0.69, 180: 0.69, 365: 0.69 },
  GBP: { 30: 0.28, 90: 0.28, 180: 0.28, 365: 0.28 }
};

function formatValue(value, currency) {
  try {
    return value.toLocaleString(LOCALE, { style: 'currency', currency, currencyDisplay: 'code' });
  } catch {
    return value.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

// Percentagem com o separador decimal da localização (ex.: 3,15%).
function formatPercent(value, casas = 2) {
  return value.toLocaleString(LOCALE, { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
}

function getTaxa(moeda, prazo) {
  return taxaPorMoeda[moeda]?.[prazo] ?? 0;
}

const pad2 = (n) => String(n).padStart(2, '0');

// Data/hora da geração, no formato dd/mm/aaaa hh:mm.
function formatarDataHora(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ` +
         `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Referência rastreável da simulação: SIM-AAAAMMDD-HHMMSS.
function gerarReferencia(d) {
  const data = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const hora = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  return `SIM-${data}-${hora}`;
}

// Mostra/limpa uma mensagem inline sob um campo.
// tipo: 'erro' (bloqueia), 'aviso' (apenas alerta) ou '' (limpa).
function setFieldMessage(msgEl, inputEl, message, tipo) {
  msgEl.textContent = message || '';
  msgEl.className = 'field-msg' + (message ? ` field-${tipo}` : '');
  if (inputEl) {
    inputEl.classList.toggle('input-invalid', tipo === 'erro' && Boolean(message));
  }
}

function limparMensagens() {
  setFieldMessage(erroCapital, capitalInput, '', '');
  setFieldMessage(erroTaxaPadrao, null, '', '');
  setFieldMessage(erroTaxaNegociada, taxaNegociadaInput, '', '');
}

// Ativa/desativa as ações que dependem de resultados atuais (imprimir e WhatsApp).
function definirAcoesAtivas(ativas, titulo) {
  [imprimirBtn, whatsappBtn].forEach((btn) => {
    btn.disabled = !ativas;
    btn.title = titulo;
  });
}

// Marca os resultados como desatualizados quando uma entrada muda após um cálculo.
// Enquanto estiverem desatualizados, imprimir/enviar fica bloqueado para evitar
// partilhar números que já não correspondem ao formulário.
function marcarDesatualizado() {
  if (temResultado) {
    resultadoSection.classList.add('stale');
    definirAcoesAtivas(false, 'Os dados mudaram. Recalcule antes de continuar.');
  }
}

// Resumo em texto da simulação atual para partilha.
function construirMensagemWhatsApp() {
  const tipo = tipoJurosSelect.value === 'negociado' ? 'Negociado' : 'Padrão';
  const capitaliza = reutilizarJurosCheckbox.checked ? 'Sim' : 'Não';
  return [
    '*Simulação de Depósito a Prazo*',
    'Standard Bank Moçambique',
    '',
    `Referência: ${printRef.textContent}`,
    `Data: ${printData.textContent}`,
    '',
    `Capital inicial: ${resCapital.textContent}`,
    `Moeda: ${moedaSelect.value}`,
    `Prazo: ${prazoSelect.value} dias`,
    `Taxa aplicada: ${resTaxa.textContent}`,
    `Tipo de juros: ${tipo}`,
    `Capitalização dos juros: ${capitaliza}`,
    '',
    `Juros bruto: ${resJurosBruto.textContent}`,
    `Imposto (IRPS ${resIrps.textContent}): ${resImposto.textContent}`,
    `Juros líquidos: ${resJurosLiquido.textContent}`,
    `Montante final: ${resMontante.textContent}`,
  ].join('\n');
}

// Gera o PDF da última simulação calculada e devolve o documento jsPDF.
function gerarPdfSimulacao() {
  const s = ultimaSimulacao;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const azul = [0, 82, 204];

  // Marca de água "CONFIDENCIAL" (desenhada primeiro, por baixo do conteúdo).
  doc.saveGraphicsState();
  try { doc.setGState(new doc.GState({ opacity: 0.08 })); } catch (e) { /* sem suporte a opacidade */ }
  doc.setTextColor(...azul);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(70);
  doc.text('CONFIDENCIAL', pageW / 2, pageH / 2, { align: 'center', angle: 35 });
  doc.restoreGraphicsState();

  // Cabeçalho com a marca.
  doc.setFillColor(...azul);
  doc.rect(0, 0, pageW, 72, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Standard Bank Moçambique', margin, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Simulação de Depósito a Prazo', margin, 52);
  doc.setFontSize(9);
  doc.text(`Referência: ${s.ref}`, pageW - margin, 32, { align: 'right' });
  doc.text(`Data: ${s.data}`, pageW - margin, 46, { align: 'right' });

  // Resumo (pares rótulo/valor).
  doc.setTextColor(0, 0, 0);
  let y = 104;
  const resumo = [
    ['Capital inicial', formatValue(s.capital, s.moeda)],
    ['Moeda', s.moeda],
    ['Prazo', `${s.prazo} dias`],
    ['Taxa aplicada', formatPercent(s.taxa)],
    ['Tipo de juros', s.tipo],
    ['Capitalização dos juros', s.capitaliza],
    ['Juros bruto', formatValue(s.totalBruto, s.moeda)],
    ['Imposto (IRPS ' + formatPercent(IRPS * 100, 0) + ')', formatValue(s.totalImposto, s.moeda)],
    ['Juros líquidos', formatValue(s.totalLiquido, s.moeda)],
    ['Montante final', formatValue(s.montanteFinal, s.moeda)],
  ];
  doc.setFontSize(10);
  resumo.forEach(([rotulo, valor]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.text(rotulo, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(String(valor), pageW - margin, y, { align: 'right' });
    y += 18;
  });

  // Tabela mês a mês.
  y += 12;
  const colunas = [
    { titulo: 'Mês', largura: 35, align: 'left' },
    { titulo: 'Saldo Inicial', largura: 100, align: 'right' },
    { titulo: 'Juros Bruto', largura: 95, align: 'right' },
    { titulo: 'Imposto', largura: 90, align: 'right' },
    { titulo: 'Juros Líquidos', largura: 100, align: 'right' },
    { titulo: 'Saldo Final', largura: 95, align: 'right' },
  ];
  const startX = margin;

  function desenharLinha(celulas, yLinha, opcoes = {}) {
    let x = startX;
    colunas.forEach((col, i) => {
      const tx = col.align === 'right' ? x + col.largura - 4 : x + 4;
      doc.text(String(celulas[i]), tx, yLinha, { align: col.align });
      x += col.largura;
    });
  }

  // Cabeçalho da tabela.
  const tabelaW = colunas.reduce((soma, c) => soma + c.largura, 0);
  doc.setFillColor(...azul);
  doc.rect(startX, y - 12, tabelaW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  desenharLinha(colunas.map((c) => c.titulo), y);
  y += 16;

  // Linhas de dados.
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  s.linhas.forEach((l, idx) => {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin + 10;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(240, 244, 252);
      doc.rect(startX, y - 11, tabelaW, 16, 'F');
    }
    desenharLinha([
      l.mes,
      formatValue(l.saldoInicial, s.moeda),
      formatValue(l.bruto, s.moeda),
      formatValue(l.imposto, s.moeda),
      formatValue(l.liquido, s.moeda),
      formatValue(l.saldoFinal, s.moeda),
    ], y);
    y += 16;
  });

  return doc;
}

// Gera o PDF da simulação e partilha-o via WhatsApp (Web Share API).
// Em plataformas sem partilha de ficheiros, descarrega o PDF e abre o WhatsApp com o resumo em texto.
async function enviarPdfWhatsApp() {
  if (!temResultado || resultadoSection.classList.contains('stale') || !ultimaSimulacao) return;

  if (!window.jspdf || !window.jspdf.jsPDF) {
    // Biblioteca de PDF indisponível: recorre ao envio de texto.
    window.open('https://wa.me/?text=' + encodeURIComponent(construirMensagemWhatsApp()), '_blank', 'noopener');
    return;
  }

  const doc = gerarPdfSimulacao();
  const blob = doc.output('blob');
  const nomeFicheiro = `simulacao-${ultimaSimulacao.ref || 'deposito'}.pdf`;
  const ficheiro = new File([blob], nomeFicheiro, { type: 'application/pdf' });

  // Partilha nativa do ficheiro (mostra o WhatsApp como destino em telemóveis).
  if (navigator.canShare && navigator.canShare({ files: [ficheiro] })) {
    try {
      await navigator.share({
        files: [ficheiro],
        title: 'Simulação de Depósito a Prazo',
        text: 'Simulação de Depósito a Prazo — Standard Bank Moçambique',
      });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // utilizador cancelou
      // Caso contrário, continua para o plano alternativo.
    }
  }

  // Alternativa (ex.: computador): descarrega o PDF e abre o WhatsApp com o texto.
  doc.save(nomeFicheiro);
  window.open('https://wa.me/?text=' + encodeURIComponent(construirMensagemWhatsApp()), '_blank', 'noopener');
}

function atualizarVisibilidadeTaxa() {
  limparMensagens();
  const tipoJuros = tipoJurosSelect.value;
  if (tipoJuros === 'padrao') {
    campoPadraoContainer.style.display = 'block';
    campoNegociadoContainer.style.display = 'none';
    atualizarTaxaPadrao();
  } else {
    campoPadraoContainer.style.display = 'none';
    campoNegociadoContainer.style.display = 'block';
  }
}

function atualizarTaxaPadrao() {
  const moeda = moedaSelect.value;
  const prazo = Number(prazoSelect.value);
  const taxa = getTaxa(moeda, prazo);
  taxaPadraoDisplay.textContent = formatPercent(taxa);
}


function calcularSimulacao() {
  const capital = Number(capitalInput.value) || 0;
  const moeda = moedaSelect.value;
  const prazo = Number(prazoSelect.value);
  const tipoJuros = tipoJurosSelect.value;
  
  let taxa = tipoJuros === 'padrao' 
    ? getTaxa(moeda, prazo)
    : Number(taxaNegociadaInput.value) || 0;

  limparMensagens();
  let valido = true;
  // Elemento de mensagem da taxa conforme o modo selecionado.
  const erroTaxaEl = tipoJuros === 'negociado' ? erroTaxaNegociada : erroTaxaPadrao;
  const taxaInputEl = tipoJuros === 'negociado' ? taxaNegociadaInput : null;

  if (capital <= 0) {
    setFieldMessage(erroCapital, capitalInput, 'Informe um capital inicial maior que zero.', 'erro');
    valido = false;
  }

  if (taxa <= 0) {
    setFieldMessage(erroTaxaEl, taxaInputEl, 'A taxa de juros deve ser maior que zero.', 'erro');
    valido = false;
  } else if (tipoJuros === 'negociado' && taxa > TAXA_NEGOCIADA_MAX) {
    setFieldMessage(
      erroTaxaNegociada, taxaNegociadaInput,
      `Taxa inválida. Indique uma taxa anual até ${TAXA_NEGOCIADA_MAX}%.`, 'erro'
    );
    valido = false;
  }

  if (!valido) return;

  // Aviso não bloqueante: taxa elevada mas plausível.
  if (tipoJuros === 'negociado' && taxa > TAXA_NEGOCIADA_ALERTA) {
    setFieldMessage(
      erroTaxaNegociada, taxaNegociadaInput,
      `Taxa invulgarmente elevada (${formatPercent(taxa)}). Verifique se está correta.`, 'aviso'
    );
  }

  const reutilizar = reutilizarJurosCheckbox.checked;
  const meses = prazo === 365 ? 12 : prazo / 30;
  const diasPorMes = prazo / meses;
  const taxaDiaria = taxa / 100 / 365;

  let tabelaHTML = '';
  let saldo = capital;
  let totalBruto = 0;
  let totalImposto = 0;
  let totalLiquido = 0;
  const linhas = [];

  for (let mes = 1; mes <= meses; mes++) {
    const saldoInicial = saldo;
    // Base sobre a qual os juros incidem: no juro composto cresce com o saldo;
    // no juro simples mantém-se sempre o capital inicial.
    const baseJuros = reutilizar ? saldoInicial : capital;
    const bruto = baseJuros * taxaDiaria * diasPorMes;
    const imposto = bruto * IRPS;
    const liquido = bruto - imposto;
    // O saldo acumula sempre os juros líquidos do mês, mesmo no juro simples,
    // para que a coluna "Saldo Final" reflita o montante acumulado.
    const saldoFinal = saldoInicial + liquido;

    totalBruto += bruto;
    totalImposto += imposto;
    totalLiquido += liquido;
    linhas.push({ mes, saldoInicial, bruto, imposto, liquido, saldoFinal });

    tabelaHTML += `
      <tr>
        <td>${mes}</td>
        <td>${formatValue(saldoInicial, moeda)}</td>
        <td>${formatValue(bruto, moeda)}</td>
        <td>${formatValue(imposto, moeda)}</td>
        <td>${formatValue(liquido, moeda)}</td>
        <td>${formatValue(saldoFinal, moeda)}</td>
      </tr>
    `;

    saldo = saldoFinal;
  }

  tabelaBody.innerHTML = tabelaHTML;

  const montanteFinal = saldo;

  resCapital.textContent = formatValue(capital, moeda);
  resTaxa.textContent = formatPercent(taxa);
  resIrps.textContent = formatPercent(IRPS * 100, 0);
  resJurosBruto.textContent = formatValue(totalBruto, moeda);
  resImposto.textContent = formatValue(totalImposto, moeda);
  resJurosLiquido.textContent = formatValue(totalLiquido, moeda);
  resMontante.textContent = formatValue(montanteFinal, moeda);

  // Carimba a data e a referência da simulação para o documento impresso.
  const agora = new Date();
  const dataTexto = formatarDataHora(agora);
  const refTexto = gerarReferencia(agora);
  printData.textContent = dataTexto;
  printRef.textContent = refTexto;

  // Guarda a simulação estruturada para gerar o PDF.
  ultimaSimulacao = {
    moeda, prazo, taxa,
    tipo: tipoJuros === 'negociado' ? 'Negociado' : 'Padrão',
    capitaliza: reutilizar ? 'Sim' : 'Não',
    capital, totalBruto, totalImposto, totalLiquido, montanteFinal,
    data: dataTexto, ref: refTexto, linhas,
  };

  // Resultados agora refletem as entradas atuais.
  temResultado = true;
  resultadoSection.classList.remove('stale');
  definirAcoesAtivas(true, '');
}

function renderInitialState() {
  const moeda = moedaSelect.value || 'MZN';
  tabelaBody.innerHTML = '';
  resCapital.textContent = formatValue(0, moeda);
  resTaxa.textContent = formatPercent(0);
  resIrps.textContent = formatPercent(IRPS * 100, 0);
  resJurosBruto.textContent = formatValue(0, moeda);
  resImposto.textContent = formatValue(0, moeda);
  resJurosLiquido.textContent = formatValue(0, moeda);
  resMontante.textContent = formatValue(0, moeda);
  atualizarTaxaPadrao();
}

// Repõe o formulário e os resultados no estado inicial, sem recarregar a página.
function limparSimulacao() {
  capitalInput.value = '0';
  moedaSelect.value = 'MZN';
  prazoSelect.value = '30';
  tipoJurosSelect.value = 'padrao';
  taxaNegociadaInput.value = '0';
  reutilizarJurosCheckbox.checked = false;

  atualizarVisibilidadeTaxa();
  renderInitialState();

  temResultado = false;
  ultimaSimulacao = null;
  resultadoSection.classList.remove('stale');
  definirAcoesAtivas(false, 'Calcule uma simulação antes de continuar.');
}

calcularBtn.addEventListener('click', calcularSimulacao);
limparBtn.addEventListener('click', limparSimulacao);
imprimirBtn.addEventListener('click', () => {
  // Só imprime resultados calculados e atualizados.
  if (!temResultado || resultadoSection.classList.contains('stale')) return;
  window.print();
});
whatsappBtn.addEventListener('click', enviarPdfWhatsApp);
moedaSelect.addEventListener('change', atualizarTaxaPadrao);
prazoSelect.addEventListener('change', atualizarTaxaPadrao);
tipoJurosSelect.addEventListener('change', atualizarVisibilidadeTaxa);
// Limpa a mensagem do campo assim que o utilizador corrige o valor.
capitalInput.addEventListener('input', () => setFieldMessage(erroCapital, capitalInput, '', ''));
taxaNegociadaInput.addEventListener('input', () => setFieldMessage(erroTaxaNegociada, taxaNegociadaInput, '', ''));

// Qualquer alteração às entradas marca os resultados existentes como desatualizados.
[capitalInput, moedaSelect, prazoSelect, tipoJurosSelect, taxaNegociadaInput, reutilizarJurosCheckbox]
  .forEach((el) => {
    el.addEventListener('input', marcarDesatualizado);
    el.addEventListener('change', marcarDesatualizado);
  });

renderInitialState();
