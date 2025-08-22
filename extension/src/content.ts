
(function () {
  // Exemplo mínimo: intercepta erros de JS e envia como event log futuro
  window.addEventListener('error', (e) => {
    // Neste starter, apenas registra no console para simplificar.
    console.debug('[bug-inspector] window error:', e.message, e.filename, e.lineno);
  }, true);
})();
