
    import { db, ref, push, set, remove, onValue, get } from '../../firebase.js';

    const categorySelect = document.getElementById('categorySelect');
    const addSection = document.getElementById('addSection');
    const tbody = document.querySelector('#dataTable tbody');
    const msg = document.getElementById('msg');
    
    let packageFilter = {
    model: '',
    cc: ''
  };

    let currentCategory = categorySelect.value;
    let brandsCache = {};   // keys: brandKey -> { name, models: { modelName: {name, ...} } }
    let modelsCache = {};   // keys: modelName -> { name: modelName, cc: { ccName: { name } } }

    const norm = v => (v || '').toString().trim().toUpperCase();

    // ---------- Custom Message Box ----------
const messageBox = document.getElementById('messageBox');
const msgText = document.getElementById('msgText');
const msgClose = document.getElementById('msgClose');

    function showMessage(message, type='error') {
      msgText.textContent = message;
      if(type === 'error') {
        messageBox.style.backgroundColor = '#f44336';
        document.getElementById('msgIcon').textContent = '❌';
      } else if(type === 'success') {
        messageBox.style.backgroundColor = '#4CAF50';
        document.getElementById('msgIcon').textContent = '✔️';
      }
      messageBox.classList.remove('hidden');
      setTimeout(() => messageBox.classList.add('hidden'), 3000);
    }

    msgClose.addEventListener('click', () => messageBox.classList.add('hidden'));


    // ---------- Render Add Section ----------
    function renderAddSection() {
      addSection.innerHTML = '';
      msg.textContent = '';

      if (['brand','color','supplier','consignee','location','agent','ship_name'].includes(currentCategory)) {
  addSection.innerHTML = `
    <input type="text" id="inputField" placeholder="Enter ${currentCategory}">
    <button id="addBtn">Add</button>
  `;
  document.getElementById('addBtn').onclick = addSimple;  // <-- saves to Firebase
}

      else if (currentCategory === 'model') {
        // brand dropdown from brandsCache
        const brandOptions = Object.values(brandsCache)
          .sort((a,b)=>a.name.localeCompare(b.name))
          .map(b => `<option value="${b.name}">${b.name}</option>`).join('');
        addSection.innerHTML = `
          <select id="brandSelect"><option value="">Select Brand</option>${brandOptions}</select>
          <input type="text" id="modelInput" placeholder="Enter Model">
          <button id="addBtn">Add</button>
        `;
        document.getElementById('addBtn').onclick = addModel;
      }
      else if (currentCategory === 'cc') {
    const modelOptions = Object.values(modelsCache)
      .sort((a,b)=>a.name.localeCompare(b.name))
      .map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    
    addSection.innerHTML = `
      <select id="modelSelect"><option value="">Select Model</option>${modelOptions}</select>
      <input type="text" id="ccInput" placeholder="Enter CC">
      <button id="addBtn">Add</button>
    `;

    const modelSelectEl = document.getElementById('modelSelect');

    // 🔹 When model changes, filter table
    modelSelectEl.addEventListener('change', e => {
      const selectedModel = e.target.value;
      renderCCTable(modelsCache, selectedModel);
    });

    // 🔹 Add CC
    document.getElementById('addBtn').onclick = addCC;
}

      else if (currentCategory === 'package') {
        // Show model select (brand found from model) and cc select populated after model chosen
        const modelOptions = Object.values(modelsCache)
          .sort((a,b)=>a.name.localeCompare(b.name))
          .map(m => `<option value="${m.name}">${m.name}</option>`).join('');
        addSection.innerHTML = `
          <select id="packageModelSelect"><option value="">Select Model</option>${modelOptions}</select>
          <select id="packageCCSelect"><option value="">Select CC</option></select>
          <input type="text" id="packageInput" placeholder="Enter Package">
          <button id="addBtn">Add</button>
        `;

        const modelSel = document.getElementById('packageModelSelect');
    const ccSel = document.getElementById('packageCCSelect');

    modelSel.addEventListener('change', e => {
      const modelName = e.target.value;

      // populate CC dropdown based on selected model
      ccSel.innerHTML = '<option value="">Select CC</option>';
      if (modelName && modelsCache[modelName]) {
        const ccs = modelsCache[modelName].cc || {};
        Object.keys(ccs).forEach(cc => {
          const opt = document.createElement('option');
          opt.value = cc;
          opt.textContent = cc;
          ccSel.appendChild(opt);
        });
      }

      // 🔹 update package table filtered by selected model
      // if no CC is selected, show all packages of this model
      packageFilter.model = modelName;
      packageFilter.cc = ccSel.value || '';
      renderPackageTable(window.packagesData || {}, packageFilter.model, packageFilter.cc);

    });

    // 🔹 Filter package table by CC dropdown as well
    ccSel.addEventListener('change', e => {
      const modelName = modelSel.value;
      const ccName = e.target.value;
      // if CC is empty, show all packages of the selected model
      packageFilter.model = modelName;
      packageFilter.cc = ccName || '';
      renderPackageTable(window.packagesData || {}, packageFilter.model, packageFilter.cc);
    });

    // set add button
    document.getElementById('addBtn').onclick = addPackage;

      }
    }

    // ---------- Render Tables ----------
    function renderSimpleTable(data) {
      tbody.innerHTML = '';
      const entries = Object.entries(data).sort((a,b)=>{
        const va = (a[1].name || a[1]).toString().toUpperCase();
        const vb = (b[1].name || b[1]).toString().toUpperCase();
        return va.localeCompare(vb);
      });
      let i=1;
      entries.forEach(([id, item])=>{
        const value = (typeof item === 'string') ? item : (item.name || '');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i++}</td>
          <td class="valueCell">${value}</td>
          <td>
            <button class="editBtn" data-id="${id}">Edit</button>
            <button class="deleteBtn" data-id="${id}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderModelTable(brandsObj) {
      tbody.innerHTML = '';
      const rows = [];
      Object.values(brandsObj).forEach(b=>{
        const models = b.models || {};
        Object.keys(models).forEach(m => rows.push([b.name, m]));
      });
      rows.sort((a,b)=> a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
      let i=1;
      rows.forEach(([brandName, modelName])=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${i++}</td>
          <td class="valueCell">${brandName} | ${modelName}</td>
          <td>
            <button class="editModelBtn" data-brand="${brandName}" data-model="${modelName}">Edit</button>
            <button class="deleteModelBtn" data-brand="${brandName}" data-model="${modelName}">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderCCTable(modelsObj, modelFilter = '') {
  tbody.innerHTML = '';
  const rows = [];
  Object.values(modelsObj).forEach(m => {
    const modelName = m.name;
    if (modelFilter && modelName !== modelFilter) return; // <-- filter here
    const brandName = findBrandForModel(modelName);
    Object.keys(m.cc || {}).forEach(cc => rows.push([brandName, modelName, cc]));
  });

  rows.sort((a,b)=> a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  let i=1;
  rows.forEach(([brandName, modelName, ccName])=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i++}</td>
      <td class="valueCell">${brandName} | ${modelName} | ${ccName}</td>
      <td>
        <button class="editCCBtn" data-model="${modelName}" data-cc="${ccName}">Edit</button>
        <button class="deleteCCBtn" data-model="${modelName}" data-cc="${ccName}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


    function renderPackageTable(data, modelFilter = '', ccFilter = '') {
  tbody.innerHTML = '';
  const entries = Object.entries(data || {}).sort((a,b)=>{
    const A = `${a[1].brand||''}|${a[1].model||''}|${a[1].cc||''}|${a[1].name||''}`.toUpperCase();
    const B = `${b[1].brand||''}|${b[1].model||''}|${b[1].cc||''}|${b[1].name||''}`.toUpperCase();
    return A.localeCompare(B);
  });

  let i=1;
  entries.forEach(([id, pkg])=>{
    if (modelFilter && pkg.model !== modelFilter) return; // <-- filter model
    if (ccFilter && pkg.cc !== ccFilter) return;         // <-- filter CC if needed
    const val = `${pkg.brand || ''} | ${pkg.model || ''} | ${pkg.cc || ''} | ${pkg.name || ''}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i++}</td>
      <td class="valueCell">${val}</td>
      <td>
        <button class="editPackageBtn" data-id="${id}">Edit</button>
        <button class="deletePackageBtn" data-id="${id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


    // ---------- Helpers ----------
    function findBrandForModel(modelName) {
      for (const k of Object.keys(brandsCache)) {
        const b = brandsCache[k];
        if (b.models && b.models[modelName]) return b.name;
      }
      return "UNKNOWN";
    }

    // ---------- Listeners to DB ----------
    function listenSimpleCategory(category) {
  let listenCategory = category;
  if (category === 'agent') {
    listenCategory = 'insurance_agent';
  } else if (category === 'ship_name') {
    listenCategory = 'ship_name';
  }
  
  const r = ref(db, `essentials/${listenCategory}`);
  onValue(r, snap => {
    renderSimpleTable(snap.val() || {});
  });
}


    function listenBrandsAndModels() {
      onValue(ref(db, 'essentials/brand'), async snap => {
        const raw = snap.val() || {};
        brandsCache = {};
        Object.entries(raw).forEach(([key, val])=>{
          brandsCache[key] = { name: val.name || val, models: val.models || {} };
        });
        // ensure modelsCache stays updated from essentials/model too
        if (currentCategory === 'model') renderModelTable(brandsCache);
        renderAddSection();
      });

      onValue(ref(db, 'essentials/model'), snap => {
        const raw = snap.val() || {};
        modelsCache = {};
        Object.entries(raw).forEach(([key, val])=>{
          // here key is modelName or key; val may have .cc object
          const name = val.name || key;
          modelsCache[name] = { name, cc: val.cc || {} };
        });
        if (currentCategory === 'cc') renderCCTable(modelsCache);
        renderAddSection();
      });
    }

    function listenPackages() {
  onValue(ref(db, 'essentials/package'), snap => {
    window.packagesData = snap.val() || {};
    renderPackageTable(
      window.packagesData,
      packageFilter.model,
      packageFilter.cc
    );
  });
}



    // ---------- Add Handlers ----------
    async function addSimple() {
      const val = norm(document.getElementById('inputField').value || '');
      if (!val) return msg.textContent = 'Enter a value';
      const saveCategory = currentCategory === 'agent'
      ? 'insurance_agent'
      : currentCategory;

    const r = ref(db, `essentials/${saveCategory}`);

      const snap = await get(r);
      const data = snap.val() || {};
      if (Object.values(data).some(v => (v.name || v) === val)) {
        msg.textContent = 'Duplicate entry not allowed';
        return;
      }
      await push(r, { name: val });
      document.getElementById('inputField').value = '';
      msg.textContent = `${currentCategory} added`;
    }

    async function addModel() {
      const brandName = document.getElementById('brandSelect').value;
      const model = (document.getElementById('modelInput').value || '').trim().toUpperCase();
      if (!brandName || !model) return msg.textContent = 'Select brand and enter model';
      // find brandKey
      const brandSnap = await get(ref(db, 'essentials/brand'));
      const brands = brandSnap.val() || {};
      const brandKey = Object.keys(brands).find(k => (brands[k].name || brands[k]) === brandName);
      if (!brandKey) return msg.textContent = 'Brand not found';
      const modelRef = ref(db, `essentials/brand/${brandKey}/models`);
      const modelSnap = await get(modelRef);
      const models = modelSnap.val() || {};
      if (Object.keys(models).includes(model)) return msg.textContent = 'Duplicate model';
      await set(ref(db, `essentials/brand/${brandKey}/models/${model}`), { name: model });
      await set(ref(db, `essentials/model/${model}`), { name: model });
      document.getElementById('modelInput').value = '';
      msg.textContent = 'Model added successfully';
    }

    async function addCC() {
      const model = document.getElementById('modelSelect').value;
      const cc = norm(document.getElementById('ccInput').value || '');
      if (!model || !cc) return msg.textContent = 'Select model and enter CC';
      const modelRef = ref(db, `essentials/model/${model}/cc`);
      const snap = await get(modelRef);
      const ccs = snap.val() || {};
      if (Object.keys(ccs).includes(cc)) return msg.textContent = 'Duplicate CC';
      // preserve existing ccs and add new
      await set(modelRef, { ...ccs, [cc]: { name: cc } });
      document.getElementById('ccInput').value = '';
      msg.textContent = 'CC added';
    }

    async function addPackage() {
      const model = (document.getElementById('packageModelSelect').value || '').toString().trim();
      const cc = (document.getElementById('packageCCSelect').value || '').toString().trim();
      const name = norm(document.getElementById('packageInput').value || '');
      if (!model || !cc || !name) return msg.textContent = 'Select model, CC and enter package name';
      const brandRaw = findBrandForModel(model);
      const brand = norm(brandRaw);
      const pkgRef = ref(db, 'essentials/package');
      const snap = await get(pkgRef);
      const data = snap.val() || {};
      if (Object.values(data).some(p => norm(p.name) === name && norm(p.brand) === brand && norm(p.model) === norm(model) && norm(p.cc) === norm(cc))) {
        msg.textContent = 'Duplicate package not allowed';
        return;
      }
      await push(pkgRef, { name, brand, model: model.toString().toUpperCase(), cc: cc.toString().toUpperCase() });
      document.getElementById('packageInput').value = '';
      msg.textContent = 'Package added successfully';
    }

    // ---------- Edit / Delete (event delegation) ----------
    tbody.addEventListener('click', async (e) => {
      const t = e.target;
      // get vehicles snapshot once for usage checks
      const vehiclesSnap = await get(ref(db, 'vehicles'));
      const vehicles = vehiclesSnap.val() || {};

      // --- SIMPLE EDIT (brand/color/supplier/consignee) ---
      if (t.classList.contains('editBtn')) {
        const tr = t.closest('tr');
        const td = tr.querySelector('.valueCell');
        const old = td.textContent;
        td.innerHTML = `<input type="text" value="${old}">`;
        t.textContent = 'Save';
        t.classList.replace('editBtn', 'saveBtn');
        return;
      }
      if (t.classList.contains('saveBtn')) {
  const tr = t.closest('tr');
  const id = t.dataset.id;
  const oldVal = tr.querySelector('input').defaultValue.trim();
  const newVal = norm(tr.querySelector('input').value || '');
  if (!newVal) return msg.textContent = 'Enter value';

  // Update in essentials
  await set(ref(db, `essentials/${currentCategory}/${id}`), { name: newVal });

  // --- Propagate changes to vehicles ---
const vehiclesSnap = await get(ref(db, 'vehicles'));
const vehicles = vehiclesSnap.val() || {};
for (const vid in vehicles) {
  if (!vehicles[vid]) continue;
  
  // Handle special case for ship_name -> shipName field mapping
  let fieldName = currentCategory;
  if (currentCategory === 'ship_name') {
    fieldName = 'shipName';
  }
  
  if (norm(vehicles[vid][fieldName]) === norm(oldVal)) {
    await set(ref(db, `vehicles/${vid}/${fieldName}`), newVal);
  }
}

// --- Propagate changes to sold ---
const soldSnap = await get(ref(db, 'sold'));
const sold = soldSnap.val() || {};
for (const sid in sold) {
  if (!sold[sid]) continue;
  
  // Handle special case for ship_name -> shipName field mapping
  let fieldName = currentCategory;
  if (currentCategory === 'ship_name') {
    fieldName = 'shipName';
  }
  
  if (norm(sold[sid][fieldName]) === norm(oldVal)) {
    await set(ref(db, `sold/${sid}/${fieldName}`), newVal);
  }
}

  msg.textContent = 'Updated successfully in essentials, stock, and sold!';
  listenSimpleCategory(currentCategory);
  return;
}


      // --- DELETE SIMPLE ---
      if (t.classList.contains('deleteBtn')) {
        const id = t.dataset.id;
        const tr = t.closest('tr');
        const valueText = tr.querySelector('.valueCell').textContent.trim();
        // check usage in vehicles
        const used = Object.values(vehicles).some(v => {
          if (!v) return false;
          if (currentCategory === 'brand' && norm(v.brand) === norm(valueText)) return true;
          if (currentCategory === 'color' && norm(v.color) === norm(valueText)) return true;
          if (currentCategory === 'supplier' && norm(v.supplier) === norm(valueText)) return true;
          if (currentCategory === 'consignee' && norm(v.consignee) === norm(valueText)) return true;
          if (currentCategory === 'location' && norm(v.location) === norm(valueText)) return true;
          if (currentCategory === 'ship_name' && norm(v.shipName) === norm(valueText)) return true;
          return false;
        });
        if (used) { showMessage(`Cannot delete "${valueText}".`, 'error');
 return; }
        await remove(ref(db, `essentials/${currentCategory}/${id}`));
        msg.textContent = 'Deleted successfully.';
        return;
      }

      // --- EDIT MODEL ---
      if (t.classList.contains('editModelBtn')) {
        const tr = t.closest('tr');
        const td = tr.querySelector('.valueCell');
        const [brandName, modelName] = td.textContent.split('|').map(x => x.trim());
        td.innerHTML = `<strong>${brandName}</strong> | <input type="text" id="editModelInput" value="${modelName}">`;
        t.textContent = 'Save';
        t.classList.replace('editModelBtn', 'saveModelBtn');
        return;
      }

      // --- SAVE MODEL ---
      if (t.classList.contains('saveModelBtn')) {
  const tr = t.closest('tr');
  const oldModel = t.dataset.model;
  const brandName = t.dataset.brand;
  const newModel = norm(tr.querySelector('#editModelInput').value || '');
  if (!newModel) return alert('Enter model name');

  // Update essentials as before
  const brandKey = Object.keys(brandsCache).find(k => brandsCache[k].name === brandName);
  const oldModelRef = ref(db, `essentials/model/${oldModel}`);
  const oldDataSnap = await get(oldModelRef);
  const oldData = oldDataSnap.val() || {};

  await remove(ref(db, `essentials/brand/${brandKey}/models/${oldModel}`));
  await set(ref(db, `essentials/brand/${brandKey}/models/${newModel}`), { name: newModel });
  await remove(oldModelRef);
  await set(ref(db, `essentials/model/${newModel}`), { name: newModel, cc: oldData.cc || {} });

  // --- Update vehicles ---
  const vehiclesSnap = await get(ref(db, 'vehicles'));
  const vehicles = vehiclesSnap.val() || {};
  for (const vid in vehicles) {
    if (vehicles[vid]?.model === oldModel) {
      await set(ref(db, `vehicles/${vid}/model`), newModel);
    }
  }

  // --- Update sold ---
  const soldSnap = await get(ref(db, 'sold'));
  const sold = soldSnap.val() || {};
  for (const sid in sold) {
    if (sold[sid]?.model === oldModel) {
      await set(ref(db, `sold/${sid}/model`), newModel);
    }
  }

  msg.textContent = 'Model updated in essentials, stock, and sold!';
  listenBrandsAndModels();
  switchCategory('model');
  return;
}


      // --- DELETE MODEL ---
      if (t.classList.contains('deleteModelBtn')) {
        const brandName = t.dataset.brand;
        const modelName = t.dataset.model;
        const used = Object.values(vehicles).some(v => norm(v.model) === norm(modelName));
        if (used) { alert(`Cannot delete model "${modelName}" because it is used in vehicle records.`); return; }
        const brandKey = Object.keys(brandsCache).find(k => brandsCache[k].name === brandName);
        if (brandKey) await remove(ref(db, `essentials/brand/${brandKey}/models/${modelName}`));
        await remove(ref(db, `essentials/model/${modelName}`));
        msg.textContent = 'Model deleted';
        listenBrandsAndModels();
        return;
      }

      // --- EDIT CC ---
      if (t.classList.contains('editCCBtn')) {
        const tr = t.closest('tr');
        const td = tr.querySelector('.valueCell');
        const [brandName, modelName, ccName] = td.textContent.split('|').map(x=>x.trim());
        td.innerHTML = `<strong>${brandName} | ${modelName}</strong> | <input type="text" id="editCCInput" value="${ccName}">`;
        t.textContent = 'Save';
        t.classList.replace('editCCBtn','saveCCBtn');
        return;
      }

      // --- SAVE CC ---
      if (t.classList.contains('saveCCBtn')) {
  const tr = t.closest('tr');
  const model = t.dataset.model;
  const oldCC = t.dataset.cc;
  const newCC = norm(tr.querySelector('#editCCInput').value || '');
  if (!newCC) return alert('Enter CC');

  const ccRef = ref(db, `essentials/model/${model}/cc`);
  const snap = await get(ccRef);
  const ccs = snap.val() || {};
  if (oldCC in ccs) delete ccs[oldCC];
  ccs[newCC] = { name: newCC };
  await set(ccRef, ccs);

  // --- Update vehicles ---
  const vehiclesSnap = await get(ref(db, 'vehicles'));
  const vehicles = vehiclesSnap.val() || {};
  for (const vid in vehicles) {
    if (vehicles[vid]?.cc === oldCC && vehicles[vid]?.model === model) {
      await set(ref(db, `vehicles/${vid}/cc`), newCC);
    }
  }

  // --- Update sold ---
  const soldSnap = await get(ref(db, 'sold'));
  const sold = soldSnap.val() || {};
  for (const sid in sold) {
    if (sold[sid]?.cc === oldCC && sold[sid]?.model === model) {
      await set(ref(db, `sold/${sid}/cc`), newCC);
    }
  }

  msg.textContent = 'CC updated in essentials, stock, and sold!';
  listenBrandsAndModels();
  switchCategory('cc');
  return;
}


      // --- DELETE CC ---
      if (t.classList.contains('deleteCCBtn')) {
        const model = t.dataset.model;
        const cc = t.dataset.cc;
        const used = Object.values(vehicles).some(v => norm(v.cc) === norm(cc));
        if (used) { alert(`Cannot delete CC "${cc}" because it is used.`); return; }
        await remove(ref(db, `essentials/model/${model}/cc/${cc}`));
        msg.textContent = 'CC deleted';
        listenBrandsAndModels();
        return;
      }

      // --- EDIT PACKAGE ---
      if (t.classList.contains('editPackageBtn')) {
        const tr = t.closest('tr');
        const td = tr.querySelector('.valueCell');
        const parts = td.textContent.split('|').map(p => p.trim());
        const oldName = parts[3] || '';
        td.innerHTML = `${parts[0]} | ${parts[1]} | ${parts[2]} | <input id="editPackageName" value="${oldName}">`;
        t.textContent = 'Save';
        t.classList.replace('editPackageBtn','savePackageBtn');
        return;
      }

      if (t.classList.contains('savePackageBtn')) {
  const tr = t.closest('tr');
  const id = t.dataset.id;
  const newName = norm(tr.querySelector('#editPackageName').value || '');
  if (!newName) return msg.textContent = 'Enter package name';

  const pkgRef = ref(db, `essentials/package/${id}`);
  const snap = await get(pkgRef);
  const oldPkg = snap.val() || {};
  await set(pkgRef, { ...oldPkg, name: newName });

  // --- UPDATE VEHICLES ---
  const vehiclesSnap = await get(ref(db, 'vehicles'));
  const vehicles = vehiclesSnap.val() || {};
  for (const vid in vehicles) {
    const v = vehicles[vid];
    if (norm(v.brand) === norm(oldPkg.brand) && norm(v.model) === norm(oldPkg.model) && norm(v.cc) === norm(oldPkg.cc) && norm(v.package) === norm(oldPkg.name)) {
      await set(ref(db, `vehicles/${vid}/package`), newName);
    }
  }

  const soldSnap = await get(ref(db, 'sold'));
  const soldVehicles = soldSnap.val() || {};
  for (const sid in soldVehicles) {
    const v = soldVehicles[sid];
    if (norm(v.brand) === norm(oldPkg.brand) && norm(v.model) === norm(oldPkg.model) && norm(v.cc) === norm(oldPkg.cc) && norm(v.package) === norm(oldPkg.name)) {
      await set(ref(db, `sold/${sid}/package`), newName);
    }
  }

  msg.textContent = 'Package updated in essentials, stock and sold vehicles';
  listenPackages();
  return;
}


      // --- DELETE PACKAGE ---
if (t.classList.contains('deletePackageBtn')) {
  const id = t.dataset.id;
  const pkgRef = ref(db, `essentials/package/${id}`);
  const snap = await get(pkgRef);
  const pkg = snap.val();
  if (!pkg) return;

  // Check usage in vehicles (case-insensitive)
  const used = Object.values(vehicles).some(v => 
    v.package && norm(v.package) === norm(pkg.name) &&
    v.brand && norm(v.brand) === norm(pkg.brand) &&
    v.model && norm(v.model) === norm(pkg.model) &&
    v.cc && norm(v.cc) === norm(pkg.cc)
  );

  if (used) {
    alert(`Cannot delete package "${pkg.name}" because it is used in vehicle records.`);
    return;
  }

  await remove(pkgRef);
  msg.textContent = 'Package deleted';
  listenPackages();
  return;
}

    });

    // ---------- Category switch ----------
    function switchCategory(cat) {
  currentCategory = cat;
  msg.textContent = '';
  
  if (['brand','color','supplier','consignee','location','agent','ship_name'].includes(currentCategory)) {
    renderAddSection();
    listenSimpleCategory(cat);
  } else if (cat === 'model') {
    renderAddSection();
    // brands & models loaded by listenBrandsAndModels updates caches and renders model table
    listenBrandsAndModels();
  } else if (cat === 'cc') {
    renderAddSection();
    listenBrandsAndModels();
  } else if (cat === 'package') {
    packageFilter.model = '';
    packageFilter.cc = '';
    renderAddSection();
    listenPackages();
  }
}

    categorySelect.addEventListener('change', e => switchCategory(e.target.value));

    // ---------- Init ----------
    (function init() {
      // initial listeners to populate caches & UI
      listenBrandsAndModels();
      // also ensure simple lists keep updating when used
      onValue(ref(db, 'essentials/brand'), () => {});
      onValue(ref(db, 'essentials/model'), () => {});
      switchCategory(currentCategory);
    })();

 