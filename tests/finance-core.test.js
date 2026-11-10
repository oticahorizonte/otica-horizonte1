const test = require('node:test');
const assert = require('node:assert/strict');
const {
  gerarParcelasCrediario,
  calcularCrediarioPendenteMes,
  listarSaidasFinanceiras,
  totalizarSaidasFinanceiras,
  isDespesaOperacional,
  listarDespesasOperacionais,
  totalizarDespesasOperacionais
} = require('../js/finance-core.js');

test('parcelas fecham o total em centavos e ajustam a última parcela', () => {
  const parcelas = gerarParcelasCrediario(100, 3, 30, '2026-12-01');

  assert.equal(parcelas.length, 3);
  assert.deepEqual(parcelas.map(p => p.valor), [33.33, 33.33, 33.34]);
  assert.equal(parcelas.reduce((soma, p) => soma + Math.round(p.valor * 100), 0), 10000);
  assert.deepEqual(parcelas.map(p => p.status), ['Pendente', 'Pendente', 'Pendente']);
});

test('datas das parcelas respeitam o intervalo e atravessam a virada do mês', () => {
  const parcelas = gerarParcelasCrediario(90, 3, 30, '2026-12-15');

  assert.deepEqual(parcelas.map(p => p.data), ['2026-12-15', '2027-01-14', '2027-02-13']);
});

test('parcelas rejeitam valores, quantidade, intervalo e data inválidos', () => {
  assert.deepEqual(gerarParcelasCrediario(0, 2, 30, '2026-12-01'), []);
  assert.deepEqual(gerarParcelasCrediario(100, 0, 30, '2026-12-01'), []);
  assert.deepEqual(gerarParcelasCrediario(100, 2, -1, '2026-12-01'), []);
  assert.deepEqual(gerarParcelasCrediario(0.02, 3, 30, '2026-12-01'), []);
  assert.deepEqual(gerarParcelasCrediario(100, 2, 30, '2026-02-30'), []);
});

test('crediário do mês conta apenas parcelas não pagas com vencimento no mês', () => {
  const vendas = [
    {pag:'Crediário Próprio', status:'Pendente', crediario:{parcelas:[
      {data:'2026-11-03', valor:25.25, status:'Pendente'},
      {data:'2026-11-20', valor:10, status:'Pago'},
      {data:'2026-12-01', valor:40, status:'Pendente'},
      {data:'2026-10-30', valor:5, status:'Pendente'}
    ]}},
    {pag:'Crediário Próprio', status:'Cancelado', crediario:{parcelas:[
      {data:'2026-11-10', valor:99, status:'Pendente'}
    ]}},
    {pag:'PIX', status:'Pendente', crediario:{parcelas:[
      {data:'2026-11-10', valor:80, status:'Pendente'}
    ]}}
  ];

  assert.deepEqual(calcularCrediarioPendenteMes(vendas, new Date(2026, 10, 3)), {total:25.25, quantidade:1});
});

test('crediário do mês considera também o ano na virada do calendário', () => {
  const vendas = [{pag:'Crediário Próprio', status:'Pago', crediario:{parcelas:[
    {data:'2026-12-31', valor:20, status:'Pendente'},
    {data:'2027-01-01', valor:30, status:'Pendente'}
  ]}}];

  assert.deepEqual(calcularCrediarioPendenteMes(vendas, new Date(2027, 0, 1)), {total:30, quantidade:1});
});

test('retirada de pró-labore aparece nas saídas e no total do caixa sem alterar despesas originais', () => {
  const despesas = [{id:7,data:'2026-11-04',cat:'Aluguel',desc:'Loja',valor:800}];
  const retiradas = [{id:'PL-1',data:'2026-11-05',valor:500,referencia:'Novembro/2026'}];

  const saidas = listarSaidasFinanceiras(despesas, retiradas, '2026-11-01');

  assert.equal(saidas.length, 2);
  assert.equal(saidas[0]._origemSaida, 'prolabore');
  assert.equal(saidas[0].cat, 'Pró-labore');
  assert.equal(saidas[0].valor, 500);
  assert.equal(totalizarSaidasFinanceiras(despesas, retiradas, '2026-11-01'), 1300);
  assert.deepEqual(despesas, [{id:7,data:'2026-11-04',cat:'Aluguel',desc:'Loja',valor:800}]);
});

test('saídas financeiras respeitam a data inicial e aceitam listas ausentes', () => {
  const saidas = listarSaidasFinanceiras(
    [{data:'2026-10-31',valor:100},{data:'2026-11-01',valor:20}],
    [{id:'PL-2',data:'2026-10-30',valor:50},{id:'PL-3',data:'2026-11-02',valor:30}],
    '2026-11-01'
  );

  assert.deepEqual(saidas.map(s=>s.valor), [30,20]);
  assert.equal(totalizarSaidasFinanceiras(null, null), 0);
});

test('compras de estoque e custos diretos continuam no caixa, mas não são contados como despesa operacional', () => {
  const saidas = [
    {cat:'Reposição de Estoque', valor:500},
    {cat:'Custo Direto da Venda', valor:185},
    {cat:'Aluguel', valor:290.87}
  ];

  assert.equal(isDespesaOperacional(saidas[0]), false);
  assert.equal(isDespesaOperacional(saidas[1]), false);
  assert.equal(isDespesaOperacional(saidas[2]), true);
  assert.deepEqual(listarDespesasOperacionais(saidas), [saidas[2]]);
  assert.equal(totalizarDespesasOperacionais(saidas), 290.87);
  assert.equal(totalizarSaidasFinanceiras(saidas, []), 975.87);
});
