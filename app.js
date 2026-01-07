// Calculadora de recibos (luz, agua y gas) con guardado en localStorage
// Interfaz en español. Guarda automáticamente al cambiar cualquier dato.

// ---------- UTIL ----------
const STORAGE_KEY = 'utilityCalcData_v1';

function $i(id){ return document.getElementById(id); }
function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null } catch(e){ return null } }
function formatMoney(v){
  const n = Number(v || 0);
  // round to 2 decimals, then trim trailing zeros
  const fixed = n.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  // thousands separator: dot
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // remove trailing zeros in decimal part
  const decTrimmed = decPart.replace(/0+$/,'');
  if(decTrimmed === '') return intWithDots;
  return `${intWithDots},${decTrimmed}`;
}

// ---------- DEFAULT DATA ----------
const defaultData = {
  units: [
    { id: '101', people: 1, rent: 0 },
    { id: '201', people: 1, rent: 0 },
    { id: '202', people: 1, rent: 0 },
    { id: '300', people: 1, rent: 0 },
    { id: '401', people: 1, rent: 0 },
    { id: '402', people: 1, rent: 0 },
    { id: '500', people: 1, rent: 0 }
  ],
  // Electricity receipt A (201+202)
  ea: { totalKwh: 0, totalPrice: 0, prev202: 0, curr202: 0 },
  // Electricity receipt B (401,500 and 402 computed)
  eb: { totalKwh: 0, totalPrice: 0, prev401: 0, curr401: 0, prev500: 0, curr500: 0 },
  // Water
  water: { totalPrice: 0 },
  // Gas
  gas: { price201_202: 0, price401_402: 0 },
  // Extras (por unidad)
  extras: [
    // { id, name, amount, unitId: '101' }
  ]
};

// ---------- STATE ----------
let state = load() || defaultData;

// ---------- DOM helpers ----------
function renderUnits(){
  const container = $i('units-list');
  container.innerHTML = '';
  state.units.forEach((u, idx) => {
    const row = document.createElement('div'); row.className = 'unit-row';
    const nameInput = document.createElement('input'); nameInput.value = u.id; nameInput.type='text';
    nameInput.addEventListener('change', ()=>{ u.id = nameInput.value.trim() || u.id; syncAndSave(); renderUnits(); renderExtrasEditor(); computeAndRender(); });
    const peopleInput = document.createElement('input'); peopleInput.type='number'; peopleInput.min=0; peopleInput.value = u.people;
    peopleInput.addEventListener('change', ()=>{ u.people = Math.max(0, Number(peopleInput.value) || 0); syncAndSave(); computeAndRender(); });
    const rentInput = document.createElement('input'); rentInput.type='number'; rentInput.min=0; rentInput.value = u.rent || 0; rentInput.style.width='100px';
    rentInput.placeholder = 'Arriendo';
    rentInput.addEventListener('change', ()=>{ u.rent = Math.max(0, Number(rentInput.value) || 0); syncAndSave(); computeAndRender(); });
    const removeBtn = document.createElement('button'); removeBtn.className='small-btn'; removeBtn.textContent='Eliminar';
    removeBtn.addEventListener('click', ()=>{
      if(!confirm(`¿Eliminar la unidad ${u.id}? Esta acción quitará también sus extras.`)) return;
      state.units.splice(idx,1);
      // also remove extras assigned to this unit
      state.extras = state.extras.filter(e => e.unitId !== u.id);
      syncAndSave(); renderUnits(); renderExtrasEditor(); computeAndRender();
    });
    row.appendChild(nameInput);
    row.appendChild(peopleInput);
    row.appendChild(rentInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
  // populate extra-unit-select
  renderExtrasEditor();
  // populate summary select
  const s = $i('unit-summary-select'); if(s){ s.innerHTML = ''; state.units.forEach(u=>{ const opt=document.createElement('option'); opt.value=u.id; opt.textContent=u.id; s.appendChild(opt); }); }
}

function renderExtrasEditor(){
  const select = $i('extra-unit-select');
  select.innerHTML = '';
  state.units.forEach(u=>{
    const opt = document.createElement('option'); opt.value = u.id; opt.textContent = u.id;
    select.appendChild(opt);
  });
  // render extras list
  const list = $i('extras-list'); list.innerHTML = '';
  state.extras.forEach((ex, idx)=>{
    const row = document.createElement('div'); row.className='extra-row';
    const text = document.createElement('div'); text.style.flex='1'; text.innerHTML = `<strong>${ex.name}</strong> — ${formatMoney(ex.amount)} — → ${ex.unitId}`;
    const del = document.createElement('button'); del.className='small-btn'; del.textContent='Eliminar';
    del.addEventListener('click', ()=>{
      if(!confirm(`¿Eliminar el extra "${ex.name}" (${formatMoney(ex.amount)}) de la unidad ${ex.unitId}?`)) return;
      state.extras.splice(idx,1);
      syncAndSave(); renderExtrasEditor(); computeAndRender();
    });
    row.appendChild(text); row.appendChild(del);
    list.appendChild(row);
  });
}

// ---------- Inputs binding ----------
function bindInputs(){
  // Units add
  $i('add-unit').addEventListener('click', ()=>{
    const name = $i('new-unit-name').value.trim();
    const people = Math.max(0, Number($i('new-unit-people').value) || 0);
    const rent = Math.max(0, Number($i('new-unit-rent').value) || 0);
    if(!name) return alert('Ingresa nombre de unidad');
    state.units.push({ id: name, people, rent });
    $i('new-unit-name').value='';
    $i('new-unit-people').value='1';
    $i('new-unit-rent').value='0';
    syncAndSave(); renderUnits(); computeAndRender();
  });

  // Electricity EA
  $i('ea-total-kwh').addEventListener('input', e=>{ state.ea.totalKwh = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('ea-total-price').addEventListener('input', e=>{ state.ea.totalPrice = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('ea-prev-202').addEventListener('input', e=>{ state.ea.prev202 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('ea-curr-202').addEventListener('input', e=>{ state.ea.curr202 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  // Electricity EB
  $i('eb-total-kwh').addEventListener('input', e=>{ state.eb.totalKwh = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('eb-total-price').addEventListener('input', e=>{ state.eb.totalPrice = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('eb-prev-401').addEventListener('input', e=>{ state.eb.prev401 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('eb-curr-401').addEventListener('input', e=>{ state.eb.curr401 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('eb-prev-500').addEventListener('input', e=>{ state.eb.prev500 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('eb-curr-500').addEventListener('input', e=>{ state.eb.curr500 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });

  // Water
  $i('water-total-price').addEventListener('input', e=>{ state.water.totalPrice = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });

  // Gas
  $i('gas-201-202-price').addEventListener('input', e=>{ state.gas.price201_202 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });
  $i('gas-401-402-price').addEventListener('input', e=>{ state.gas.price401_402 = Number(e.target.value)||0; syncAndSave(); computeAndRender(); });

  // Extras add (per unit)
  $i('add-extra').addEventListener('click', ()=>{
    const name = $i('extra-name').value.trim(); const amount = Number($i('extra-amount').value) || 0;
    const unitId = $i('extra-unit-select').value;
    if(!name) return alert('Nombre del extra requerido');
    if(!unitId) return alert('Selecciona una unidad para asignar el extra');
    const id = Date.now().toString(36);
    state.extras.push({ id, name, amount, unitId });
    $i('extra-name').value=''; $i('extra-amount').value='';
    syncAndSave(); renderExtrasEditor(); computeAndRender();
  });

  // Reset
  $i('reset-all').addEventListener('click', ()=>{
    if(!confirm('¿Borrar todos los datos guardados?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = JSON.parse(JSON.stringify(defaultData));
    initializeUIFromState();
    syncAndSave();
    computeAndRender();
  });

  // Export / Import
  $i('export-json').addEventListener('click', ()=>{
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'utility-data.json'; document.body.appendChild(a);
    a.click(); a.remove(); URL.revokeObjectURL(url);
  });
  $i('import-json').addEventListener('click', ()=>{ $i('import-file').click(); });
  $i('import-file').addEventListener('change', (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        // minimal validation
        if(!imported.units) throw new Error('Formato inválido');
        state = imported;
        syncAndSave(); initializeUIFromState(); renderUnits(); computeAndRender();
        alert('Datos importados correctamente');
      } catch(e){
        alert('Error al importar: ' + e.message);
      }
    };
    reader.readAsText(f);
  });

  // Summary controls listeners (if present)
  const sel = $i('unit-summary-select'); if(sel) sel.addEventListener('change', renderUnitSummary);
  ['include-electricity','include-water','include-gas','include-extras','include-rent'].forEach(id=>{
    const el = $i(id); if(el) el.addEventListener('change', renderUnitSummary);
  });
}

// ---------- COMPUTATION ----------
// Based on the user's description:
// - Recibo A: total kWh + precio total -> precio/kWh.
//   - 202 consumo = curr202 - prev202
//   - 201 consumo = totalKwhA - consumo202
// - Recibo B: total kWh + precio total -> precio/kWh.
//   - 401 consumo = curr401 - prev401
//   - 500 consumo = curr500 - prev500
//   - 402 consumo = totalKwhB - consumo401 - consumo500
//
// Water: price per head = totalWater / totalPeople(all units). Each unit pays peopleUnit * pricePerHead.
//
// Gas: two recibos: one for (201+202) and another for (401+402). Each recibo price divided by people in the group, multiplied by people in each unit of the group.
//
// Extras: can be equal-share among all units or assigned to a specific unit.

function computeAllocations(){
  const units = state.units.map(u => ({ id: u.id, people: Number(u.people)||0, rent: Number(u.rent)||0 }));
  // Initialize results map
  const results = {}; units.forEach(u => results[u.id] = { electricity: 0, water: 0, gas: 0, extras: 0, rent: Number(u.rent)||0, breakdown: {} });

  // --- ELECTRICITY A ---
  const ea = state.ea;
  const ea_totalKwh = Number(ea.totalKwh)||0;
  const ea_totalPrice = Number(ea.totalPrice)||0;
  const ea_pricePerKwh = ea_totalKwh > 0 ? (ea_totalPrice / ea_totalKwh) : 0;
  const consumption202 = Math.max(0, (Number(ea.curr202)||0) - (Number(ea.prev202)||0));
  // find unit ids 201 and 202 in current units
  const id201 = findUnitIdLike(units, '201');
  const id202 = findUnitIdLike(units, '202');
  // consumption201 = remaining kwh of receipt A
  const consumption201 = Math.max(0, ea_totalKwh - consumption202);

  if(id202) results[id202].electricity += consumption202 * ea_pricePerKwh;
  if(id201) results[id201].electricity += consumption201 * ea_pricePerKwh;

  // --- ELECTRICITY B ---
  const eb = state.eb;
  const eb_totalKwh = Number(eb.totalKwh)||0;
  const eb_totalPrice = Number(eb.totalPrice)||0;
  const eb_pricePerKwh = eb_totalKwh > 0 ? (eb_totalPrice / eb_totalKwh) : 0;

  const consumption401 = Math.max(0, (Number(eb.curr401)||0) - (Number(eb.prev401)||0));
  const consumption500 = Math.max(0, (Number(eb.curr500)||0) - (Number(eb.prev500)||0));
  const id401 = findUnitIdLike(units, '401');
  const id500 = findUnitIdLike(units, '500');
  const id402 = findUnitIdLike(units, '402');
  // 402 = total - 401 - 500
  let consumption402 = Math.max(0, eb_totalKwh - consumption401 - consumption500);

  if(id401) results[id401].electricity += consumption401 * eb_pricePerKwh;
  if(id500) results[id500].electricity += consumption500 * eb_pricePerKwh;
  if(id402) results[id402].electricity += consumption402 * eb_pricePerKwh;

  // --- WATER ---
  const waterTotal = Number(state.water.totalPrice)||0;
  const totalPeople = units.reduce((s,u)=>s + (Number(u.people)||0), 0);
  const pricePerHead = totalPeople > 0 ? (waterTotal / totalPeople) : 0;
  units.forEach(u => {
    const val = (Number(u.people)||0) * pricePerHead;
    results[u.id].water += val;
  });

  // --- GAS ---
  // Receipt for 201+202
  const gasA = Number(state.gas.price201_202)||0;
  const groupA_units = ['201','202'].map(x => findUnitIdLike(units,x)).filter(Boolean);
  const groupA_people = groupA_units.reduce((s,id)=> s + (units.find(u=>u.id===id).people||0), 0);
  const gasA_perHead = groupA_people > 0 ? (gasA / groupA_people) : 0;
  groupA_units.forEach(id=>{
    const people = units.find(u=>u.id===id).people||0;
    results[id].gas += people * gasA_perHead;
  });

  // Receipt for 401+402
  const gasB = Number(state.gas.price401_402)||0;
  const groupB_units = ['401','402'].map(x => findUnitIdLike(units,x)).filter(Boolean);
  const groupB_people = groupB_units.reduce((s,id)=> s + (units.find(u=>u.id===id).people||0), 0);
  const gasB_perHead = groupB_people > 0 ? (gasB / groupB_people) : 0;
  groupB_units.forEach(id=>{
    const people = units.find(u=>u.id===id).people||0;
    results[id].gas += people * gasB_perHead;
  });

  // --- EXTRAS (todos asignados por unidad) ---
  state.extras.forEach(ex=>{
    if(results[ex.unitId]){
      const amt = Number(ex.amount) || 0;
      results[ex.unitId].extras += amt;
      // ensure breakdown extrasList and extrasMap exist
      results[ex.unitId].breakdown.extrasList = results[ex.unitId].breakdown.extrasList || [];
      results[ex.unitId].breakdown.extrasList.push({ id: ex.id, name: ex.name, amount: amt });
      results[ex.unitId].breakdown.extrasMap = results[ex.unitId].breakdown.extrasMap || {};
      results[ex.unitId].breakdown.extrasMap[ex.name] = (results[ex.unitId].breakdown.extrasMap[ex.name] || 0) + amt;
    }
  });

  // rounding and totals
  units.forEach(u=>{
    const r = results[u.id];
    r.electricity = Number((r.electricity||0).toFixed(2));
    r.water = Number((r.water||0).toFixed(2));
    r.gas = Number((r.gas||0).toFixed(2));
    r.extras = Number((r.extras||0).toFixed(2));
    r.rent = Number((r.rent||0).toFixed(2));
    r.total = Number((r.electricity + r.water + r.gas + r.extras + r.rent).toFixed(2));
  });

  return { results, debug: { ea_pricePerKwh, eb_pricePerKwh, consumption202, consumption201, consumption401, consumption500, consumption402, pricePerHead, gasA_perHead, gasB_perHead } };
}

// Compute a per-unit summary with optional includes
function computeUnitSummary(unitId, includes){
  const { results } = computeAllocations();
  const r = results[unitId];
  if(!r) return null;
  const breakdown = {};
  breakdown.electricity = includes.electricity ? r.electricity : 0;
  breakdown.water = includes.water ? r.water : 0;
  breakdown.gas = includes.gas ? r.gas : 0;
  // include detailed extras list when requested
  breakdown.extrasList = includes.extras ? (r.breakdown.extrasList || []) : [];
  breakdown.extras = breakdown.extrasList.reduce((s,it)=>s + (Number(it.amount)||0), 0);
  breakdown.rent = includes.rent ? r.rent : 0;
  breakdown.total = Number((breakdown.electricity + breakdown.water + breakdown.gas + breakdown.extras + breakdown.rent).toFixed(2));
  return breakdown;
}

function renderUnitSummary(){
  const sel = $i('unit-summary-select'); if(!sel) return;
  const unitId = sel.value || (state.units[0] && state.units[0].id);
  const includes = {
    electricity: !!$i('include-electricity')?.checked,
    water: !!$i('include-water')?.checked,
    gas: !!$i('include-gas')?.checked,
    extras: !!$i('include-extras')?.checked,
    rent: !!$i('include-rent')?.checked
  };
  const s = computeUnitSummary(unitId, includes);
  const card = $i('unit-summary-card');
  if(!s){ card.innerHTML = '<p>Selecciona una unidad válida.</p>'; return; }
  // Render summary as a neat table with rows per concept and per-extra rows
  let rows = '';
  if(includes.electricity) rows += `<tr><td>Luz</td><td style="text-align:right">$ ${formatMoney(s.electricity)}</td></tr>`;
  if(includes.water) rows += `<tr><td>Agua</td><td style="text-align:right">$ ${formatMoney(s.water)}</td></tr>`;
  if(includes.gas) rows += `<tr><td>Gas</td><td style="text-align:right">$ ${formatMoney(s.gas)}</td></tr>`;
  if(includes.extras){
    if(s.extrasList && s.extrasList.length){
      s.extrasList.forEach(ex => {
        rows += `<tr class="extra-row-item"><td style="text-align:left">${ex.name}</td><td style="text-align:right">$ ${formatMoney(ex.amount)} <button class="small-btn extra-remove" data-extra-id="${ex.id}" style="margin-left:.5rem">Quitar</button></td></tr>`;
      });
    } else {
      rows += `<tr><td>Extras</td><td style="text-align:right">$ ${formatMoney(0)}</td></tr>`;
    }
  }
  if(includes.rent) rows += `<tr><td>Arriendo</td><td style="text-align:right">$ ${formatMoney(s.rent)}</td></tr>`;
  rows += `<tr class="summary-total"><td style="font-weight:700">Total</td><td style="text-align:right;font-weight:700">$ ${formatMoney(s.total)}</td></tr>`;

  card.innerHTML = `<div class="summary-panel"><div style="margin-bottom:.5rem"><strong>${unitId}</strong><div style="color:var(--muted);font-size:.9rem">Detalle del pago</div></div><table class="summary-table"><tbody>${rows}</tbody></table></div>`;

  // attach remove listeners for extras inside the card (with confirmation)
  const remBtns = card.querySelectorAll('.extra-remove');
  remBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const eid = btn.getAttribute('data-extra-id');
      const ex = state.extras.find(e=>e.id===eid);
      if(!ex) return;
      if(!confirm(`¿Eliminar el extra "${ex.name}" (${formatMoney(ex.amount)}) de la unidad ${ex.unitId}?`)) return;
      state.extras = state.extras.filter(e => e.id !== eid);
      syncAndSave();
      renderExtrasEditor();
      computeAndRender();
      renderUnitSummary();
    });
  });
}

function findUnitIdLike(units, pattern){
  // Try exact match first
  const exact = units.find(u => u.id === pattern);
  if(exact) return exact.id;
  // else try includes pattern
  const incl = units.find(u => u.id && u.id.toString().includes(pattern));
  return incl ? incl.id : null;
}

// ---------- RENDER RESULTS ----------
function computeAndRender(){
  const { results, debug } = computeAllocations();
  const resultsDiv = $i('results');
  const ids = Object.keys(results);
  if(ids.length === 0){
    resultsDiv.innerHTML = '<p>No hay unidades registradas.</p>'; return;
  }
  // Build list of unique extra names (preserve order)
  const extraNames = [];
  state.extras.forEach(ex=>{ if(!extraNames.includes(ex.name)) extraNames.push(ex.name); });

  // table header (dynamic extras columns)
  let html = `<table class="results-table"><thead><tr><th>Unidad</th><th>Luz</th><th>Agua</th><th>Gas</th>`;
  extraNames.forEach(n => { html += `<th style="min-width:120px">${n}</th>`; });
  html += `<th>Arriendo</th><th>Total</th></tr></thead><tbody>`;

  ids.forEach(id=>{
    const r = results[id];
    html += `<tr><td style="text-align:left">${id}</td><td>$ ${formatMoney(r.electricity)}</td><td>$ ${formatMoney(r.water)}</td><td>$ ${formatMoney(r.gas)}</td>`;
    extraNames.forEach(n => {
      const v = (r.breakdown.extrasMap && r.breakdown.extrasMap[n]) ? formatMoney(r.breakdown.extrasMap[n]) : '';
      html += `<td>${v ? '$ ' + v : ''}</td>`;
    });
    html += `<td>$ ${formatMoney(r.rent)}</td><td><strong>$ ${formatMoney(r.total)}</strong></td></tr>`;
  });
  html += `</tbody></table>`;

  // debug (hidden unless needed)
  html += `<details style="margin-top:.5rem"><summary>Ver cálculos detallados (debug)</summary>
  <pre style="white-space:pre-wrap">Precio kWh (recibo A): ${formatMoney(debug.ea_pricePerKwh)}
Precio kWh (recibo B): ${formatMoney(debug.eb_pricePerKwh)}
Consumo 202: ${formatMoney(debug.consumption202)} kWh
Consumo 201 (estimado por diferencia): ${formatMoney(debug.consumption201)} kWh
Consumo 401: ${formatMoney(debug.consumption401)} kWh
Consumo 500: ${formatMoney(debug.consumption500)} kWh
Consumo 402 (estimado por diferencia): ${formatMoney(debug.consumption402)} kWh
Precio agua por cabeza: ${formatMoney(debug.pricePerHead)}
Precio gas (201+202) por cabeza: ${formatMoney(debug.gasA_perHead)}
Precio gas (401+402) por cabeza: ${formatMoney(debug.gasB_perHead)}</pre></details>`;

  resultsDiv.innerHTML = html;
}

// ---------- SYNC UI <-> STATE ----------
function initializeUIFromState(){
  // units rendered separately
  renderUnits();

  // EA
  $i('ea-total-kwh').value = state.ea.totalKwh || 0;
  $i('ea-total-price').value = state.ea.totalPrice || 0;
  $i('ea-prev-202').value = state.ea.prev202 || 0;
  $i('ea-curr-202').value = state.ea.curr202 || 0;

  // EB
  $i('eb-total-kwh').value = state.eb.totalKwh || 0;
  $i('eb-total-price').value = state.eb.totalPrice || 0;
  $i('eb-prev-401').value = state.eb.prev401 || 0;
  $i('eb-curr-401').value = state.eb.curr401 || 0;
  $i('eb-prev-500').value = state.eb.prev500 || 0;
  $i('eb-curr-500').value = state.eb.curr500 || 0;

  // Water
  $i('water-total-price').value = state.water.totalPrice || 0;

  // Gas
  $i('gas-201-202-price').value = state.gas.price201_202 || 0;
  $i('gas-401-402-price').value = state.gas.price401_402 || 0;

  // extras editor
  renderExtrasEditor();
  // render summary controls initially
  renderUnitSummary();
}

function syncAndSave(){
  save(state);
}

// ---------- START ----------
function start(){
  bindInputs();
  initializeUIFromState();
  computeAndRender();
  // autosave on page unload
  window.addEventListener('beforeunload', ()=> save(state));
}

start();
