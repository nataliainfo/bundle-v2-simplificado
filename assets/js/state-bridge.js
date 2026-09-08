/*
 * Ponte de estado entre os arquivos de bundle (Varejo / Indústria).
 * Cada fluxo (edição / criação) agora vive em 2 arquivos — um por bundle —
 * pra manter cada um mais simples de ler. O radio de Bundle continua
 * mostrando as duas opções; clicar na opção que NÃO é a deste arquivo
 * navega pro arquivo irmão. Pra essa troca não parecer um reset completo
 * do formulário, o estado (o que não depende do bundle) é salvo aqui e
 * reaplicado no arquivo de destino.
 */

function contratoStateKey(flow) {
  return 'contratoState_' + flow;
}

function captureContratoState() {
  const byId = (id) => document.getElementById(id);
  const state = {};

  const clienteValueEl = document.querySelector('#cliente-mount [data-ms-value]');
  if (clienteValueEl && clienteValueEl.classList.contains('has-value')) {
    state.clienteLabel = clienteValueEl.textContent;
  }
  const organizacaoEl = byId('organizacao');
  if (organizacaoEl) {
    state.organizacaoValue = organizacaoEl.value;
    state.organizacaoPlaceholder = organizacaoEl.placeholder;
  }

  const respValueEl = document.querySelector('#responsavel-mount [data-ms-value]');
  if (respValueEl && respValueEl.classList.contains('has-value')) {
    state.responsavelLabel = respValueEl.textContent;
  }

  if (byId('data-inicio')) state.dataInicio = byId('data-inicio').value;
  if (byId('data-fim')) state.dataFim = byId('data-fim').value;
  if (byId('mrr')) state.mrr = byId('mrr').value;

  const ativoRadios = Array.from(document.querySelectorAll('input[name="ativo"]'));
  const ativoChecked = document.querySelector('input[name="ativo"]:checked');
  if (ativoChecked) state.ativoIndex = ativoRadios.indexOf(ativoChecked);

  const canaisGroup = byId('canais-group');
  if (canaisGroup) {
    state.canais = Array.from(canaisGroup.querySelectorAll('.chip--filled')).map((c) => c.dataset.value);
  }
  state.canaisTipos = {};
  document.querySelectorAll('[data-canal-campo]').forEach((campo) => {
    const tipo = campo.dataset.canalCampo;
    const checked = Array.from(campo.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
    if (checked.length) state.canaisTipos[tipo] = checked;
  });

  const coberturaGroup = byId('cobertura-group');
  if (coberturaGroup) {
    state.cobertura = Array.from(coberturaGroup.querySelectorAll('.chip--filled')).map((c) => c.dataset.value);
  }
  const campoRegiao = byId('campo-regiao');
  const campoUf = byId('campo-uf');
  const campoCidade = byId('campo-cidade');
  if (campoRegiao) state.regioes = Array.from(campoRegiao.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  if (campoUf) state.ufs = Array.from(campoUf.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  if (campoCidade) state.cidades = Array.from(campoCidade.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);

  if (byId('plano-input')) state.plano = byId('plano-input').value;

  if (byId('dominio-tbody')) {
    state.dominios = Array.from(byId('dominio-tbody').querySelectorAll('.list-table__row')).map((row) => {
      return row.querySelector('.list-table__cell').textContent;
    });
  }
  if (byId('administrador-tbody')) {
    state.administradores = Array.from(byId('administrador-tbody').querySelectorAll('.list-table__row')).map((row) => {
      const cells = row.querySelectorAll('.list-table__cell');
      return { nome: cells[0].textContent, email: cells[1].textContent };
    });
  }
  if (byId('usuario-tbody')) {
    state.usuarios = Array.from(byId('usuario-tbody').querySelectorAll('.list-table__row')).map((row) => {
      const cells = row.querySelectorAll('.list-table__cell');
      return { nome: cells[0].textContent, email: cells[1].textContent };
    });
  }

  return state;
}

function goToBundle(targetHref, flow) {
  try {
    sessionStorage.setItem(contratoStateKey(flow), JSON.stringify(captureContratoState()));
  } catch (e) {
    /* sessionStorage indisponível (ex: modo privado) — segue sem preservar estado */
  }
  window.location.href = targetHref;
}

// Lê E remove o estado salvo — só deve valer uma vez, logo após a navegação
// que o gravou. Sem isso, um simples F5 (ou visitar o link direto) reaplicaria
// pra sempre o último estado salvo, duplicando linhas e sobrescrevendo os
// valores padrão do próprio arquivo.
function consumeContratoState(flow) {
  const key = contratoStateKey(flow);
  try {
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Reaplica o estado capturado no arquivo de origem. `ctx` traz os pedaços
// que variam por arquivo (edição não tem Cliente editável; criação revela
// Adicionais só depois do plano escolhido; etc).
function applyContratoState(state, ctx) {
  if (!state) return;
  ctx = ctx || {};
  const byId = (id) => document.getElementById(id);

  // Cliente/Organização só viajam entre bundles no fluxo de Criação — lá são
  // input ao vivo da pessoa. Na Edição, cada arquivo representa um contrato
  // de exemplo já existente e fixo (um cliente diferente por bundle); herdar
  // o cliente do arquivo de origem sobrescreveria esse dado errado.
  if (ctx.applyCliente !== false) {
    if (state.clienteLabel) {
      const clienteValueEl = document.querySelector('#cliente-mount [data-ms-value]');
      if (clienteValueEl) {
        clienteValueEl.textContent = state.clienteLabel;
        clienteValueEl.classList.add('has-value');
      }
    }
    const organizacaoEl = byId('organizacao');
    if (organizacaoEl && state.organizacaoValue !== undefined) {
      organizacaoEl.value = state.organizacaoValue;
      if (state.organizacaoPlaceholder !== undefined) organizacaoEl.placeholder = state.organizacaoPlaceholder;
    }
  }

  if (state.responsavelLabel) {
    const respValueEl = document.querySelector('#responsavel-mount [data-ms-value]');
    if (respValueEl) {
      respValueEl.textContent = state.responsavelLabel;
      respValueEl.classList.add('has-value');
    }
  }

  if (state.dataInicio && byId('data-inicio')) byId('data-inicio').value = state.dataInicio;
  if (state.dataFim && byId('data-fim')) byId('data-fim').value = state.dataFim;
  if (state.mrr && byId('mrr')) byId('mrr').value = state.mrr;

  if (state.ativoIndex !== undefined) {
    const ativoRadios = document.querySelectorAll('input[name="ativo"]');
    if (ativoRadios[state.ativoIndex]) ativoRadios[state.ativoIndex].checked = true;
  }

  if (state.canais && state.canais.length) {
    state.canais.forEach((value) => {
      const chip = document.querySelector(`#canais-group .chip[data-value="${value}"]`);
      if (chip && !chip.classList.contains('chip--filled')) chip.click();
    });
  }
  if (state.canaisTipos) {
    Object.keys(state.canaisTipos).forEach((tipo) => {
      const campo = document.querySelector(`[data-canal-campo="${tipo}"]`);
      if (!campo) return;
      state.canaisTipos[tipo].forEach((valor) => {
        const cb = Array.from(campo.querySelectorAll('input[type="checkbox"]')).find((i) => i.value === valor);
        if (cb && !cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  if (state.cobertura && state.cobertura.length) {
    state.cobertura.forEach((value) => {
      const chip = document.querySelector(`#cobertura-group .chip[data-value="${value}"]`);
      if (chip && !chip.classList.contains('chip--filled')) chip.click();
    });
  }
  const campoRegiao = byId('campo-regiao');
  if (campoRegiao && state.regioes) {
    state.regioes.forEach((valor) => {
      const cb = Array.from(campoRegiao.querySelectorAll('input[type="checkbox"]')).find((i) => i.value === valor);
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  const campoUf = byId('campo-uf');
  if (campoUf && state.ufs) {
    state.ufs.forEach((valor) => {
      const cb = Array.from(campoUf.querySelectorAll('input[type="checkbox"]')).find((i) => i.value === valor);
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  const campoCidade = byId('campo-cidade');
  if (campoCidade && state.cidades) {
    state.cidades.forEach((valor) => {
      const cb = Array.from(campoCidade.querySelectorAll('input[type="checkbox"]')).find((i) => i.value === valor);
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  if (state.plano && byId('plano-input')) {
    byId('plano-input').value = state.plano;
    if (typeof ctx.onPlanoSet === 'function') ctx.onPlanoSet();
  }

  if (state.dominios && state.dominios.length && typeof ctx.addDominio === 'function') {
    state.dominios.forEach(ctx.addDominio);
  }
  if (state.administradores && state.administradores.length && typeof ctx.addAdministrador === 'function') {
    state.administradores.forEach((a) => ctx.addAdministrador(a.nome, a.email));
  }
  if (state.usuarios && state.usuarios.length && typeof ctx.addUsuario === 'function') {
    state.usuarios.forEach((u) => ctx.addUsuario(u.nome, u.email));
  }
}
