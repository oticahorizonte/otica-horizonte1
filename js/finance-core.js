(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OticaFinanceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function gerarParcelasCrediario(total, num, intervalo, primeiraData) {
    var valorTotal = Number(total);
    var quantidade = Number(num);
    var diasIntervalo = Number(intervalo);
    var dataTexto = String(primeiraData || '');
    if (!Number.isFinite(valorTotal) || valorTotal <= 0 ||
        !Number.isInteger(quantidade) || quantidade < 1 ||
        !Number.isInteger(diasIntervalo) || diasIntervalo < 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dataTexto)) return [];

    var dataBase = new Date(dataTexto + 'T12:00:00');
    if (isNaN(dataBase.getTime()) || dataBase.toISOString().slice(0,10) !== dataTexto) return [];
    var totalCentavos = Math.round(valorTotal * 100);
    if (totalCentavos < quantidade) return [];

    var centavosParcela = Math.floor(totalCentavos / quantidade);
    var parcelas = [];
    for (var i = 0; i < quantidade; i++) {
      var data = new Date(dataBase);
      data.setDate(data.getDate() + diasIntervalo * i);
      parcelas.push({
        data: data.toISOString().slice(0,10),
        valor: (i === quantidade - 1
          ? totalCentavos - centavosParcela * (quantidade - 1)
          : centavosParcela) / 100,
        status: 'Pendente'
      });
    }
    return parcelas;
  }

  function calcularCrediarioPendenteMes(vendas, dataReferencia) {
    var referencia = dataReferencia instanceof Date ? dataReferencia : new Date();
    var mesAtual = referencia.getFullYear() + '-' + String(referencia.getMonth() + 1).padStart(2, '0');
    var resultado = {total:0, quantidade:0};
    if (!Array.isArray(vendas)) return resultado;

    vendas.forEach(function(venda) {
      if (!venda || venda.status === 'Cancelado' || venda.pag !== 'Crediário Próprio' ||
          !venda.crediario || !Array.isArray(venda.crediario.parcelas)) return;
      venda.crediario.parcelas.forEach(function(parcela) {
        if (!parcela || parcela.status === 'Pago' || String(parcela.data || '').slice(0,7) !== mesAtual) return;
        var valor = Number(parcela.valor);
        if (!Number.isFinite(valor)) return;
        resultado.total += valor;
        resultado.quantidade++;
      });
    });
    resultado.total = Math.round(resultado.total * 100) / 100;
    return resultado;
  }

  function listarSaidasFinanceiras(despesas, retiradasProLabore, dataInicial) {
    var inicio = String(dataInicial || '');
    var saidas = (Array.isArray(despesas) ? despesas : []).map(function(despesa) {
      return Object.assign({}, despesa, {_origemSaida:'despesa'});
    });
    (Array.isArray(retiradasProLabore) ? retiradasProLabore : []).forEach(function(retirada) {
      if (!retirada) return;
      saidas.push({
        id:retirada.id,
        data:retirada.data || '',
        cat:'Pró-labore',
        desc:'Retirada de pró-labore' + (retirada.referencia ? ' — ' + retirada.referencia : ''),
        valor:Number(retirada.valor) || 0,
        recorrente:'nao',
        referencia:retirada.referencia || '',
        obs:retirada.obs || '',
        _origemSaida:'prolabore'
      });
    });
    return saidas.filter(function(saida) {
      return !inicio || String(saida.data || '') >= inicio;
    }).sort(function(a,b) {
      return String(b.data || '').localeCompare(String(a.data || ''));
    });
  }

  function totalizarSaidasFinanceiras(despesas, retiradasProLabore, dataInicial) {
    return listarSaidasFinanceiras(despesas, retiradasProLabore, dataInicial)
      .reduce(function(total, saida) { return total + (Number(saida.valor) || 0); }, 0);
  }

  return {
    gerarParcelasCrediario: gerarParcelasCrediario,
    calcularCrediarioPendenteMes: calcularCrediarioPendenteMes,
    listarSaidasFinanceiras: listarSaidasFinanceiras,
    totalizarSaidasFinanceiras: totalizarSaidasFinanceiras
  };
});
