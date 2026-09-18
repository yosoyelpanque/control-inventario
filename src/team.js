(function(root) {
  'use strict';
  const SESSION = 'inventario-parejas-session';
  const DIRECTORY = 'inventario-parejas-directory';
  const person = value => {
    const employeeNumber = String(value?.employeeNumber || '').trim();
    const name = String(value?.name || '').trim().replace(/\s+/g, ' ');
    if (!/^\d{1,20}$/.test(employeeNumber) || name.length < 3 || name.length > 120) throw Error('Escribe un nombre completo y un número de empleado válido.');
    return {employeeNumber, name};
  };
  function pair(active, companion) {
    active = person(active); companion = person(companion);
    if (active.employeeNumber.replace(/^0+/, '') === companion.employeeNumber.replace(/^0+/, '')) throw Error('Elige a dos personas distintas.');
    return {active, companion};
  }
  const swap = team => pair(team.companion, team.active);
  const attribution = state => ({
    ubicadoPor: state.currentUser?.name || '',
    ubicadoPorNumero: state.currentUser?.employeeNumber || '',
    auxiliadoPor: state.companion?.name || '',
    auxiliadoPorNumero: state.companion?.employeeNumber || ''
  });
  const clear = () => ({ubicadoPor:'', ubicadoPorNumero:'', auxiliadoPor:'', auxiliadoPorNumero:''});
  const savedAttribution = item => Object.fromEntries(Object.keys(clear()).map(key => [key, item[key] || '']));
  const label = (name, number) => name ? name + (number ? ' · Empleado ' + number : '') : 'Sin registro';
  const excel = item => ({'Ubicado Por':item.ubicadoPor || '', 'No. empleado - Ubicado por':item.ubicadoPorNumero || '', 'Auxiliado Por':item.auxiliadoPor || '', 'No. empleado - Auxiliado por':item.auxiliadoPorNumero || ''});
  function remember(team) { sessionStorage.setItem(SESSION, JSON.stringify(pair(team.active, team.companion))); }
  function forget() { sessionStorage.removeItem(SESSION); }
  async function mount(open) {
    const $ = id => document.getElementById(id), status = $('team-status');
    let directory = [...root.InventoryPeople];
    try {
      const custom = JSON.parse(localStorage.getItem(DIRECTORY) || '[]');
      for (const entry of custom) { const p = person(entry); if (!directory.some(x => x.employeeNumber === p.employeeNumber)) directory.push(p); }
    } catch { status.textContent = 'No se pudo recuperar el directorio local. Puedes registrar de nuevo a las personas.'; }
    function render() {
      for (const id of ['team-active','team-companion']) {
        const select = $(id), previous = select.value;
        select.replaceChildren(new Option('Selecciona una persona', ''));
        for (const p of [...directory].sort((a,b) => a.name.localeCompare(b.name, 'es'))) select.add(new Option(label(p.name,p.employeeNumber), p.employeeNumber));
        select.value = previous;
      }
      excludeActive();
    }
    function excludeActive() {
      const active = $('team-active').value, companion = $('team-companion');
      if (companion.value === active) companion.value = '';
      for (const option of companion.options) option.disabled = !!active && option.value === active;
    }
    $('team-active').onchange = excludeActive;
    $('register-person').onsubmit = event => {
      event.preventDefault();
      try {
        const entry = person({name:$('person-name').value, employeeNumber:$('person-number').value});
        if (directory.some(p => p.employeeNumber.replace(/^0+/,'') === entry.employeeNumber.replace(/^0+/,''))) throw Error('Ese número de empleado ya está registrado. Selecciónalo en la lista.');
        const next = [...directory,entry];
        localStorage.setItem(DIRECTORY,JSON.stringify(next));
        directory = next; render();
        $( $('register-target').value === 'active' ? 'team-active' : 'team-companion').value = entry.employeeNumber;
        excludeActive(); event.target.reset(); $('register-details').open = false;
        status.textContent = 'Persona registrada en este navegador.';
      } catch(error) { status.textContent = error.message; }
    };
    $('team-form').onsubmit = async event => {
      event.preventDefault(); $('team-start').disabled = true;
      try {
        const team = pair(directory.find(p => p.employeeNumber === $('team-active').value), directory.find(p => p.employeeNumber === $('team-companion').value));
        remember(team); await open(team);
      } catch(error) { forget(); status.textContent = 'No se pudo iniciar: ' + error.message; }
      finally { $('team-start').disabled = false; }
    };
    render();
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION) || 'null');
      if (saved) await open(pair(saved.active,saved.companion));
    } catch(error) { forget(); status.textContent = 'Selecciona la pareja para continuar. ' + error.message; }
  }
  root.InventoryTeam = {person, pair, swap, attribution, clear, savedAttribution, label, excel, remember, forget, mount};
  if (typeof module !== 'undefined') module.exports = root.InventoryTeam;
})(globalThis);
