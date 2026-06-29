const capitalInput = document.getElementById('capital');
const moedaSelect = document.getElementById('moeda');
const prazoSelect = document.getElementById('prazo');
const tipoJurosSelect = document.getElementById('tipoJuros');
const taxaNegociadaInput = document.getElementById('taxaNegociada');
const printLogo = document.getElementById('printLogo');
const printCompanyName = document.getElementById('printCompanyName');
const reutilizarJurosCheckbox = document.getElementById('reutilizarJuros');
const calcularBtn = document.getElementById('calcularBtn');
const imprimirBtn = document.getElementById('imprimirBtn');
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

// Indica se o painel de resultados reflete uma simulação já calculada.
let temResultado = false;


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
    return value.toLocaleString('pt-BR', { style: 'currency', currency, currencyDisplay: 'code' });
  } catch {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}

function getTaxa(moeda, prazo) {
  return taxaPorMoeda[moeda]?.[prazo] ?? 0;
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

// Marca os resultados como desatualizados quando uma entrada muda após um cálculo.
function marcarDesatualizado() {
  if (temResultado) {
    resultadoSection.classList.add('stale');
  }
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
  taxaPadraoDisplay.textContent = `${taxa.toFixed(2)}%`;
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
      `Taxa invulgarmente elevada (${taxa.toFixed(2)}%). Verifique se está correta.`, 'aviso'
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
  resTaxa.textContent = `${taxa.toFixed(2)}%`;
  resIrps.textContent = `${(IRPS * 100).toFixed(0)}%`;
  resJurosBruto.textContent = formatValue(totalBruto, moeda);
  resImposto.textContent = formatValue(totalImposto, moeda);
  resJurosLiquido.textContent = formatValue(totalLiquido, moeda);
  resMontante.textContent = formatValue(montanteFinal, moeda);

  // Resultados agora refletem as entradas atuais.
  temResultado = true;
  resultadoSection.classList.remove('stale');
}

function renderInitialState() {
  const moeda = moedaSelect.value || 'MZN';
  tabelaBody.innerHTML = '';
  resCapital.textContent = formatValue(0, moeda);
  resTaxa.textContent = '0,00%';
  resIrps.textContent = '10%';
  resJurosBruto.textContent = formatValue(0, moeda);
  resImposto.textContent = formatValue(0, moeda);
  resJurosLiquido.textContent = formatValue(0, moeda);
  resMontante.textContent = formatValue(0, moeda);
  atualizarTaxaPadrao();
}

calcularBtn.addEventListener('click', calcularSimulacao);
imprimirBtn.addEventListener('click', () => window.print());
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
