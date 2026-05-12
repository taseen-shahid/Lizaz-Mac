
import { db, ref, set, get, onValue, push } from '../../firebase.js';

const brandSelect = document.getElementById('brand');
const modelSelect = document.getElementById('model');
const ccSelect = document.getElementById('cc');
const colorSelect = document.getElementById('color');
const supplierSelect = document.getElementById('supplier');
const supplierOnWaySelect = document.getElementById('supplierOnWay');
const consigneeSelect = document.getElementById('consignee');
const packageSelect = document.getElementById('package');
const locationSelect = document.getElementById('location');
const fuelSelect = document.getElementById('fuel');
const shiftSelect = document.getElementById('shift');
const driveSelect = document.getElementById('drive');
const pendingToggle = document.getElementById('pendingToggle');
const pendingToggleLabel = document.getElementById('pendingToggleLabel');
const shipNameSelect = document.getElementById('shipName');
const modeBadge = document.getElementById('modeBadge');

const form = document.getElementById('addForm');
const status = document.getElementById('status');
const receivingDate = document.getElementById('receivingDate');
const shipmentDate = document.getElementById('shipmentDate');
const regInput = document.getElementById('regno');
const chassisInput = document.getElementById('chassis');
const engineInput = document.getElementById('engine');
const modelYearInput = document.getElementById('modelYear');
const modelYearLabel = document.getElementById('modelYearLabel');
const modelYearHint = document.getElementById('modelYearHint');
const mileageInput = document.getElementById('milage');
const remarksInput = document.getElementById('remarks');
const logbookInput = document.getElementById('logbook');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');

// Containers for row 1
const stockReceivingDate = document.getElementById('stockReceivingDate');
const stockSupplier = document.getElementById('stockSupplier');
const onwayShipmentDate = document.getElementById('onwayShipmentDate');
const onwayShipName = document.getElementById('onwayShipName');
const onwaySupplier = document.getElementById('onwaySupplier');

let brands = {};
let maxVehicleId = 0;

function applyFieldEnableDisable(isOnTheWay) {
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  
  if (isOnTheWay) {
    // ON THE WAY MODE - Show shipment date, vessel, supplier (onway)
    stockReceivingDate.style.display = 'none';
    stockSupplier.style.display = 'none';
    onwayShipmentDate.style.display = 'block';
    onwayShipName.style.display = 'block';
    onwaySupplier.style.display = 'block';
    
    // Change Model Year field to just YEAR (number input)
    modelYearLabel.innerHTML = 'MODEL YEAR <span style="color:#dc3545;">*</span>';
    modelYearHint.innerHTML = 'Enter only the year (e.g., 2023)';
    modelYearInput.type = 'number';
    modelYearInput.min = '2000';
    modelYearInput.max = currentYear.toString();
    modelYearInput.placeholder = 'ENTER YEAR';
    modelYearInput.value = currentYear.toString();
    
    
    // Set shipment date defaults
    if (!shipmentDate.value) {
      shipmentDate.value = today;
    }
    shipmentDate.min = '2000-01-01';  // Change this line - allow past dates
    shipmentDate.max = '';             // No max limit, can select future dates
    shipmentDate.required = true;
    shipNameSelect.required = true;
    supplierOnWaySelect.required = true;
    
    // Enable fields for ON THE WAY mode - EXCLUDING cc, fuel, shift, drive
    const enabledFields = [
      shipmentDate, shipNameSelect, supplierOnWaySelect, 
      brandSelect, modelSelect, chassisInput, modelYearInput, colorSelect
    ];
    const disabledFields = [
      receivingDate, supplierSelect, consigneeSelect, engineInput, 
      packageSelect, mileageInput, locationSelect, remarksInput, regInput, logbookInput,
      ccSelect, fuelSelect, shiftSelect, driveSelect  // DISABLE these 4
    ];
    
    enabledFields.forEach(field => { if (field) field.disabled = false; });
    disabledFields.forEach(field => { if (field) field.disabled = true; });
    
    // Update UI
    modeBadge.innerHTML = '🚢 ON THE WAY MODE';
    modeBadge.style.background = '#ffc107';
    modeBadge.style.color = '#2c3e50';
    
  } else {
    // IN STOCK MODE - Show receiving date and supplier
    stockReceivingDate.style.display = 'block';
    stockSupplier.style.display = 'block';
    onwayShipmentDate.style.display = 'none';
    onwayShipName.style.display = 'none';
    onwaySupplier.style.display = 'none';
    
    // Change Model Year field back to MONTH input
    modelYearLabel.innerHTML = 'MODEL YEAR/MONTH <span style="color:#dc3545;">*</span>';
    modelYearHint.innerHTML = 'Select year and month';
    modelYearInput.type = 'month';
    modelYearInput.min = '2000-01';
    const currentMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2,'0')}`;
    modelYearInput.max = currentMonth;
    modelYearInput.value = currentMonth;
    modelYearInput.placeholder = '';
    
    // Set receiving date defaults
    receivingDate.max = today;
    receivingDate.min = '2000-01-01';
    if (!receivingDate.value || receivingDate.value > today) {
      receivingDate.value = today;
    }
    receivingDate.required = true;
    supplierSelect.required = true;
    shipmentDate.required = false;
    shipNameSelect.required = false;
    supplierOnWaySelect.required = false;
    
    // Enable all fields for IN STOCK mode
    const allFields = [
      receivingDate, supplierSelect, consigneeSelect, chassisInput, engineInput, 
      brandSelect, modelSelect, modelYearInput, ccSelect, packageSelect, colorSelect, 
      fuelSelect, shiftSelect, driveSelect, mileageInput, locationSelect, 
      remarksInput, regInput, logbookInput
    ];
    allFields.forEach(field => { if (field) field.disabled = false; });
    
    // Update UI
    modeBadge.innerHTML = '📦 IN STOCK MODE';
    modeBadge.style.background = '#2c3e50';
    modeBadge.style.color = 'white';
  }
}

pendingToggle.addEventListener('change', function() {
  const isOnTheWay = this.checked;
  
  if (isOnTheWay) {
    pendingToggleLabel.textContent = 'ON';
    applyFieldEnableDisable(true);
    showStatus('🚢 ON THE WAY MODE ACTIVE: Fill Shipment Date, Vessel, Supplier, Brand, Model, Year, and Color.', 'info');
  } else {
    pendingToggleLabel.textContent = 'OFF';
    applyFieldEnableDisable(false);
    showStatus('📦 IN STOCK MODE: All fields are editable.', 'info');
  }
});

// Load supplier data for both selects
onValue(ref(db, 'essentials/supplier'), snap => {
  const data = snap.val() || {};
  const suppliers = Object.values(data).map(v => v.name || v).filter(n => n).sort();
  
  // Populate both supplier selects
  [supplierSelect, supplierOnWaySelect].forEach(sel => {
    sel.innerHTML = '<option value="">SELECT SUPPLIER</option>';
    suppliers.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name.toUpperCase();
      sel.appendChild(opt);
    });
  });
});

async function getNextVehicleId() {
  try {
    if (maxVehicleId > 0) {
      const nextId = maxVehicleId + 1;
      setTimeout(async () => {
        try {
          await set(ref(db, 'counters/vehicleId'), nextId);
        } catch(e) {}
      }, 0);
      return nextId.toString();
    }
    
    const counterRef = ref(db, 'counters/vehicleId');
    const counterSnap = await get(counterRef);
    
    if (counterSnap.exists()) {
      const counterValue = counterSnap.val();
      maxVehicleId = counterValue;
      const nextId = counterValue + 1;
      await set(counterRef, nextId);
      return nextId.toString();
    }
    
    const vehiclesSnap = await get(ref(db, 'vehicles'));
    const vehicles = vehiclesSnap.val() || {};
    
    let maxId = 0;
    Object.keys(vehicles).forEach(id => {
      const numId = parseInt(id, 10);
      if (!isNaN(numId) && numId > maxId) maxId = numId;
    });
    
    maxVehicleId = maxId;
    const nextId = maxId + 1;
    await set(counterRef, nextId);
    return nextId.toString();
  } catch (error) {
    console.error('Error getting next ID:', error);
    return Date.now().toString();
  }
}

function showStatus(message, type = 'info') {
  status.textContent = message;
  status.className = type;
  status.style.display = 'flex';
  
  if (type === 'success') {
    status.style.backgroundColor = '#d4edda';
    status.style.color = '#155724';
    status.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    status.style.backgroundColor = '#f8d7da';
    status.style.color = '#721c24';
    status.style.border = '1px solid #f5c6cb';
  } else if (type === 'loading') {
    status.style.backgroundColor = '#d1ecf1';
    status.style.color = '#0c5460';
    status.style.border = '1px solid #bee5eb';
  }
}

function showLoading(show) {
  if (show) {
    submitBtn.disabled = true;
    submitText.textContent = 'SAVING...';
    submitSpinner.style.display = 'inline-block';
    showStatus('Saving vehicle details...', 'loading');
  } else {
    submitBtn.disabled = false;
    submitText.textContent = 'ADD VEHICLE';
    submitSpinner.style.display = 'none';
  }
}

async function initializeMaxId() {
  try {
    const counterRef = ref(db, 'counters/vehicleId');
    const counterSnap = await get(counterRef);
    if (counterSnap.exists()) {
      maxVehicleId = counterSnap.val();
    } else {
      const vehiclesSnap = await get(ref(db, 'vehicles'));
      const vehicles = vehiclesSnap.val() || {};
      let maxId = 0;
      Object.keys(vehicles).forEach(id => {
        const numId = parseInt(id, 10);
        if (!isNaN(numId) && numId > maxId) maxId = numId;
      });
      maxVehicleId = maxId;
      await set(counterRef, maxId + 1);
    }
  } catch (error) {
    console.error('Error initializing max ID:', error);
  }
}

// Auto-format registration input
if (regInput) {
  regInput.addEventListener('input', (e) => {
    const raw = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,7);
    const formatted = raw.length > 3 ? raw.slice(0,3) + ' ' + raw.slice(3) : raw;
    e.target.value = formatted;
  });
}

// Set default dates
const today = new Date().toISOString().split('T')[0];
receivingDate.value = today;
receivingDate.max = today;
receivingDate.min = '2000-01-01';

// Load data from Firebase
onValue(ref(db, 'essentials/brand'), snap => {
  brands = snap.val() || {};
  brandSelect.innerHTML = '<option value="">SELECT BRAND</option>';
  Object.values(brands).map(b => b.name).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name.toUpperCase();
    brandSelect.appendChild(opt);
  });
  modelSelect.innerHTML = '<option value="">SELECT MODEL</option>';
  ccSelect.innerHTML = '<option value="">SELECT CC</option>';
});

onValue(ref(db, 'essentials/ship_name'), snap => {
  shipNameSelect.innerHTML = '<option value="">SELECT VESSEL</option>';
  const data = snap.val() || {};
  Object.values(data).map(item => item.name || item).filter(n => n && n.trim()).sort().forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name.toUpperCase();
    shipNameSelect.appendChild(opt);
  });
});

[['color', colorSelect], ['consignee', consigneeSelect], ['location', locationSelect]].forEach(([key, sel]) => {
  onValue(ref(db, `essentials/${key}`), snap => {
    sel.innerHTML = `<option value="">SELECT ${key.toUpperCase()}</option>`;
    const data = snap.val() || {};
    Object.values(data).map(v => v.name || v).filter(n => n).sort().forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name.toUpperCase();
      sel.appendChild(opt);
    });
  });
});

brandSelect.addEventListener('change', () => {
  const brandName = brandSelect.value;
  modelSelect.innerHTML = '<option value="">SELECT MODEL</option>';
  ccSelect.innerHTML = '<option value="">SELECT CC</option>';
  packageSelect.innerHTML = '<option value="STANDARD">STANDARD</option>';
  if (!brandName) return;
  const brand = Object.values(brands).find(b => b.name === brandName);
  if (brand && brand.models) {
    Object.keys(brand.models).sort().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m.toUpperCase();
      modelSelect.appendChild(opt);
    });
  }
});

modelSelect.addEventListener('change', async () => {
  const brandName = brandSelect.value;
  const modelName = modelSelect.value;
  ccSelect.innerHTML = '<option value="">SELECT CC</option>';
  if (!brandName || !modelName) return;
  try {
    const modelSnap = await get(ref(db, `essentials/model/${modelName}/cc`));
    if (modelSnap.exists()) {
      const ccs = modelSnap.val() || {};
      Object.keys(ccs).sort((a,b)=>Number(a)-Number(b)).forEach(cc => {
        const opt = document.createElement('option');
        opt.value = cc;
        opt.textContent = cc;
        ccSelect.appendChild(opt);
      });
    }
  } catch (error) {
    console.error('Error loading CC:', error);
  }
});

// FORM SUBMISSION
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading(true);

  try {
    const isPending = pendingToggle.checked;
    const todayDate = new Date().toISOString().split('T')[0];
    
    const chassis = chassisInput.value.trim().toUpperCase();
    const engine = engineInput.value.trim().toUpperCase();
    const brand = brandSelect.value.trim().toUpperCase();
    const model = modelSelect.value.trim().toUpperCase();
    const color = colorSelect.value.trim().toUpperCase();
    const remarks = remarksInput.value.trim().toUpperCase() || null;
    const regno = regInput.value.trim().toUpperCase() || null;
    const logbook = logbookInput.value.trim().toUpperCase() || null;
    
    let supplier = null;
    let consignee = null;
    let dateValue = null;
    let shipName = null;
    let cc = null;
    let fuel = null;
    let shift = null;
    let drive = null;
    let modelYear = null;
    
    if (isPending) {
      // ON THE WAY MODE validation - ONLY required fields (CC, Fuel, Shift, Drive NOT required)
      shipName = shipNameSelect.value.trim().toUpperCase();
      supplier = supplierOnWaySelect.value.trim().toUpperCase();
      dateValue = shipmentDate.value;
      const yearValue = modelYearInput.value;
      
      if (!yearValue) {
        showStatus('Model Year is required', 'error');
        showLoading(false);
        modelYearInput.focus();
        return;
      }
      
      // Format year as YYYY-01 for storage (first month of the year)
      modelYear = `${yearValue}-01`;
      
      if (!shipName) {
        showStatus('Vessel / Ship Name is required', 'error');
        showLoading(false);
        shipNameSelect.focus();
        return;
      }
      if (!supplier) {
        showStatus('Supplier is required', 'error');
        showLoading(false);
        supplierOnWaySelect.focus();
        return;
      }
      if (!dateValue) {
        showStatus('Shipment date is required', 'error');
        showLoading(false);
        shipmentDate.focus();
        return;
      }
      if (dateValue < todayDate) {
        showStatus('Shipment date cannot be in the past. Select today or future.', 'error');
        showLoading(false);
        shipmentDate.focus();
        return;
      }
      if (!brand) { showStatus('Brand is required', 'error'); showLoading(false); return; }
      if (!model) { showStatus('Model is required', 'error'); showLoading(false); return; }
      if (!chassis) { showStatus('Chassis Number is required', 'error'); showLoading(false); return; }
      if (!color) { showStatus('Color is required', 'error'); showLoading(false); return; }
      
      // CC, Fuel, Shift, Drive are NOT required in ON THE WAY mode
      // Set them to null
      cc = null;
      fuel = null;
      shift = null;
      drive = null;
      
    } else {
      // IN STOCK MODE validation
      supplier = supplierSelect.value.trim().toUpperCase();
      consignee = consigneeSelect.value.trim().toUpperCase();
      cc = ccSelect.value;
      fuel = fuelSelect.value.trim().toUpperCase();
      shift = shiftSelect.value.trim().toUpperCase();
      drive = driveSelect.value.trim().toUpperCase();
      const location = locationSelect.value.trim().toUpperCase();
      const mileage = Number(mileageInput.value);
      dateValue = receivingDate.value;
      modelYear = modelYearInput.value;
      
      if (!dateValue || dateValue > todayDate) {
        showStatus('Receiving date must be today or past', 'error');
        showLoading(false);
        return;
      }
      if (!supplier) { showStatus('Supplier required', 'error'); showLoading(false); return; }
      if (!consignee) { showStatus('Consignee required', 'error'); showLoading(false); return; }
      if (!chassis) { showStatus('Chassis required', 'error'); showLoading(false); return; }
      if (!engine) { showStatus('Engine required', 'error'); showLoading(false); return; }
      if (!brand) { showStatus('Brand required', 'error'); showLoading(false); return; }
      if (!model) { showStatus('Model required', 'error'); showLoading(false); return; }
      if (!modelYear) { showStatus('Model Year/Month required', 'error'); showLoading(false); return; }
      if (!cc) { showStatus('CC required', 'error'); showLoading(false); return; }
      if (!color) { showStatus('Color required', 'error'); showLoading(false); return; }
      if (!fuel) { showStatus('Fuel required', 'error'); showLoading(false); return; }
      if (!shift) { showStatus('Shift required', 'error'); showLoading(false); return; }
      if (!drive) { showStatus('Drive required', 'error'); showLoading(false); return; }
      if (!location) { showStatus('Location required', 'error'); showLoading(false); return; }
      if (isNaN(mileage) || mileage < 0) { showStatus('Valid mileage required', 'error'); showLoading(false); return; }
      
      // Validate Model Year/Month for IN STOCK mode
      const now = new Date();
      const currentYm = new Date(now.getFullYear(), now.getMonth(), 1);
      const selectedYm = new Date(modelYear + "-01");
      if (selectedYm > currentYm) {
        showStatus('Model Year/Month cannot be in the future', 'error');
        showLoading(false);
        return;
      }
    }
    
    const nextId = await getNextVehicleId();
    
    const vehicleData = {
      id: nextId,
      chassis: chassis,
      brand: brand,
      model: model,
      modelYearMonth: modelYear,
      year: modelYear.split('-')[0],
      color: color,
      status: isPending ? "pending" : "available",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      remarks: remarks,
      regno: regno,
      logbook: logbook,
      supplier: supplier,
      cc: cc,
      fuel: fuel,
      shift: shift,
      drive: drive
    };
    
    if (isPending) {
      vehicleData.shipmentDate = dateValue;
      vehicleData.shipName = shipName;
      vehicleData.receivingDate = null;
      vehicleData.consignee = null;
      vehicleData.engine = null;
      vehicleData.mileage = null;
      vehicleData.location = null;
      vehicleData.package = null;
    } else {
      vehicleData.receivingDate = dateValue;
      vehicleData.consignee = consignee;
      vehicleData.engine = engine;
      vehicleData.mileage = Number(mileageInput.value);
      vehicleData.location = locationSelect.value.trim().toUpperCase();
      vehicleData.package = packageSelect.value.toUpperCase();
      vehicleData.shipmentDate = null;
      vehicleData.shipName = null;
      
      const lockedFields = {};
      if (vehicleData.regno) lockedFields.regno = true;
      if (vehicleData.logbook) lockedFields.logbook = true;
      vehicleData.lockedFields = lockedFields;
    }
    
    await set(ref(db, `vehicles/${nextId}`), vehicleData);
    
    if (isPending) {
      const onTheWayData = {
        vehicleId: nextId,
        chassis: chassis,
        brand: brand,
        model: model,
        year: modelYear.split('-')[0],
        color: color,
        shipName: shipName,
        shipmentDate: dateValue,
        supplier: supplier,
        status: "pending",
        addedAt: Date.now()
      };
      const onTheWayRef = push(ref(db, 'onTheWay'));
      await set(onTheWayRef, onTheWayData);
    }
    
    maxVehicleId = parseInt(nextId);
    
    let message = `✅ Vehicle added successfully with ID: ${nextId}. `;
    if (isPending) {
      message += `Marked as ON THE WAY. Vessel: ${shipName}, Shipment Date: ${dateValue}`;
    } else {
      message += `Added to Available Stock.`;
    }
    
    showStatus(message, 'success');
    
    setTimeout(() => {
      if (isPending) {
        window.location.href = 'onTheWay.html';
      } else {
        window.location.href = 'stock.html';
      }
    }, 1500);
    
  } catch (error) {
    console.error('Save error:', error);
    showStatus('❌ Error saving vehicle: ' + (error.message || 'Please try again'), 'error');
  } finally {
    showLoading(false);
  }
});

// Set default month for IN STOCK mode
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
modelYearInput.value = currentMonth;
modelYearInput.min = '2000-01';
modelYearInput.max = currentMonth;

document.addEventListener('DOMContentLoaded', () => {
  initializeMaxId();
  applyFieldEnableDisable(false);
  showStatus('Ready to add new vehicle. Toggle ON THE WAY mode to add vehicles in transit.', 'info');
});

