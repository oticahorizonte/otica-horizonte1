const test = require('node:test');
const assert = require('node:assert/strict');
const {
  gerarParcelasCrediario,
  calcularCrediarioPendenteMes
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
