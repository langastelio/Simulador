# Simulador de Depósito a Prazo

Simulador web de depósitos a prazo para o **Standard Bank Moçambique**. Aplicação
estática (sem dependências nem build) que calcula juros, imposto (IRPS) e montante
final de um depósito, com vista de impressão marcada como confidencial.

## Funcionalidades

- Cálculo de juros por moeda (MZN, USD, ZAR, EUR, GBP) e prazo (30/90/180/365 dias).
- Taxa padrão automática ou taxa negociada manualmente.
- Opção de capitalização dos juros (juros compostos) ou juros simples.
- Retenção de IRPS de 10% sobre os juros brutos.
- Tabela mês a mês e resumo dos resultados.
- Vista de impressão com cabeçalho da marca e marca de água "CONFIDENCIAL".

## Utilização

Abra o ficheiro [`index.html`](index.html) num navegador. Não é necessário servidor
nem instalação.

## Ficheiros

| Ficheiro      | Descrição                                  |
|---------------|--------------------------------------------|
| `index.html`  | Estrutura da página e formulário.          |
| `style.css`   | Estilos e regras de impressão.             |
| `script.js`   | Lógica de cálculo da simulação.            |
| `logo-standard-bank.png` | Logótipo usado no cabeçalho de impressão. |
