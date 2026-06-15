// ===== Helpers =====
const $ = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const normUser = (u) => (u||'').trim().toLowerCase().replace(/\s+/g,'_');
const storageJSON = (k, v=undefined) => {
  if (v===undefined){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch{ return null; } }
  (v===null) ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v));
};

// Toasts
function toast(msg, ms=1800){
  const wrap = $('toast-wrap'); if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(4px)'; }, ms-300);
  setTimeout(()=> wrap.removeChild(el), ms);
}

// ===== Theme =====
(function initTheme(){
  const selHeader = $('theme-select');
  const selSettings = $('theme-select-settings');
  const saved = localStorage.getItem('theme') || 'dark';

  function applyTheme(v){
    const real = v === 'auto'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light')
      : v;
    document.documentElement.setAttribute('data-theme', real);
    localStorage.setItem('theme', v);
    if (selHeader) selHeader.value = v;
    if (selSettings) selSettings.value = v;
  }
  on(selHeader,'change',e=>applyTheme(e.target.value));
  on(selSettings,'change',e=>applyTheme(e.target.value));
  on($('pick-dark'),'click',()=>{ applyTheme('dark'); toast('Theme: Dark'); });
  on($('pick-light'),'click',()=>{ applyTheme('light'); toast('Theme: Light'); });
  on($('pick-auto'),'click',()=>{ applyTheme('auto'); toast('Theme: Auto'); });
  applyTheme(saved);
})();

// ===== Views =====
const VIEWS = {
  landing: $('landing-view'),
  login: $('login-view'),
  register: $('register-view'),
  home: $('home-view'),
  profile: $('profile-view'),
  report: $('report-view'),
  settings: $('settings-view'),
  hospitals: $('hospitals-view'),
  orders: $('orders-view'),
  pharmacyLogin: $('pharmacy-login-view'),
  pharmacyRegister: $('pharmacy-register-view'),
  pharmacyDash: $('pharmacy-dashboard-view'),
  hospitalLogin: $('hospital-login-view'),
  hospitalRegister: $('hospital-register-view'),
  hospitalDash: $('hospital-dashboard-view'),
};
const sideNav = $('side-nav');

function showView(name){
  Object.values(VIEWS).forEach(v=>v&&v.classList.add('hidden'));
  VIEWS[name]?.classList.remove('hidden');
  const consumer = ['home','profile','report','settings','hospitals'].includes(name);
  sideNav?.classList.toggle('hidden', !consumer);
  document.body.classList.toggle('with-sidebar', consumer);

  if (name === 'pharmacyDash') {
    setTimeout(()=>{
      if (window.storeMap && window.storeMap.invalidateSize) { try{ window.storeMap.invalidateSize(); }catch{} }
      else if (typeof initStoreMap === 'function') initStoreMap();
    }, 60);
  }
}
on($('brand-home'),'click',()=>{ getCurrentUser()? (showView('home'), ensureMap()) : showView('landing'); });
on($('go-locator'),'click',()=>showView('login'));
on($('go-pharmacy'),'click',()=>showView('pharmacyLogin'));
on($('go-hospital'),'click',()=>showView('hospitalLogin'));
on($('back-to-landing-1'),'click',()=>showView('landing'));
on($('back-to-landing-2'),'click',()=>showView('landing'));
on($('back-to-landing-3'),'click',()=>showView('landing'));

document.querySelectorAll('.side-btn').forEach(btn=>{
  on(btn,'click',()=>{
    const tab = btn.dataset.tab;
    document.querySelectorAll('.side-btn').forEach(b=>b.classList.toggle('active', b===btn));
    if (tab==='settings') showView('settings');
    else if (tab==='profile') showView('profile');
    else if (tab==='report') showView('report');
    else if (tab==='orders'){ showView('orders'); renderOrdersList(); }
    else if (tab==='hospitals'){ showView('hospitals'); renderNearestHospitals(); }
    else showView('home');
  });
});


// ===== Consumer Auth =====
function getUsers(){ return storageJSON('medifind_users') || {}; }
function saveUsers(u){ storageJSON('medifind_users', u); }
function setCurrentUser(u){ localStorage.setItem('medifind_current', u); }
function getCurrentUser(){ return localStorage.getItem('medifind_current'); }

on($('go-register'),'click',()=>showView('register'));
on($('back-to-login'),'click',()=>showView('login'));

on($('reg-submit'),'click',()=>{
  const uRaw = ($('reg-username').value||'').trim();
  const p = ($('reg-password').value||'').trim();
  const c = ($('reg-confirm').value||'').trim();
  const name = ($('reg-name').value||'').trim();
  const contact = ($('reg-contact').value||'').trim();
  const u = normUser(uRaw);
  if(!u || !p) return toast('Username & password required');
  if(p.length < 4) return toast('Password must be at least 4 chars');
  if(p !== c) return toast('Passwords do not match');
  const users = getUsers();
  if(users[u]) return toast('Username already exists');
  users[u] = { password: p, name, contact, history: [] };
  saveUsers(users);
  toast('Registered! Log in now.');
  showView('login');
});

on($('login-submit'),'click',()=>{
  const u = normUser(($('login-username').value||'').trim());
  const p = ($('login-password').value||'').trim();
  if(!u || !p) return toast('Enter username & password');
  const users = getUsers();
  const rec = users[u];
  if(!rec || rec.password !== p) return toast('Invalid username or password');
  setCurrentUser(u); hydrateProfileUI(u, rec); loadAvatar(u);
  showView('home'); ensureMap(); loadPharmacyData(); hydrateHistoryUI(rec.history||[]);
  toast('Welcome back 👋');
});

on($('logout-btn'),'click',()=>{
  localStorage.removeItem('medifind_current');
  showView('landing'); renderResume();
  toast('Signed out');
});

// ===== Profile + Avatar =====
function hydrateProfileUI(u, rec){
  $('profile-username').textContent = `@${u}`;
  $('profile-name').textContent = rec.name || u;
  $('profile-contact').textContent = rec.contact || '';
  const initials = ((rec.name||u).split(/\s+/).map(s=>s[0]).join('').toUpperCase() || '🙂').slice(0,2);
  $('avatar-fallback').textContent = initials.length>=2 ? initials : '🙂';
  const editName=$('edit-name'), editContact=$('edit-contact');
  if(editName) editName.value = rec.name || '';
  if(editContact) editContact.value = rec.contact || '';
}
function loadAvatar(u){
  const key = `medifind_avatar_${u}`;
  const imgData = localStorage.getItem(key);
  const img = $('avatar-img'), fb = $('avatar-fallback');
  if(imgData){
    img.src = imgData; img.classList.remove('hidden'); fb.classList.add('hidden');
  }else{
    img.classList.add('hidden'); fb.classList.remove('hidden');
  }
}
on($('avatar-file'),'change', (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const u = getCurrentUser(); if(!u) return;
  const reader = new FileReader();
  reader.onload = () => {
    localStorage.setItem(`medifind_avatar_${u}`, reader.result);
    loadAvatar(u);
    toast('Avatar updated');
  };
  reader.readAsDataURL(file);
});
on($('edit-profile-btn'),'click',()=>{ $('edit-profile-panel')?.classList.remove('hidden'); });
on($('cancel-profile-btn'),'click',()=>{ $('edit-profile-panel')?.classList.add('hidden'); });
on($('save-profile-btn'),'click',()=>{
  const u = getCurrentUser(); if(!u) return;
  const users = getUsers(); const rec = users[u] || {};
  rec.name = ($('edit-name')?.value||'').trim();
  rec.contact = ($('edit-contact')?.value||'').trim();
  users[u]=rec; saveUsers(users);
  hydrateProfileUI(u, rec);
  $('edit-profile-panel')?.classList.add('hidden');
  toast('Profile saved');
});
on($('change-pass-btn'),'click',()=>{ $('change-pass-panel')?.classList.remove('hidden'); });
on($('cancel-pass-btn'),'click',()=>{ $('change-pass-panel')?.classList.add('hidden'); });
on($('save-pass-btn'),'click',()=>{
  const u = getCurrentUser(); if(!u) return;
  const cur = ($('cur-pass')?.value||'').trim();
  const n1  = ($('new-pass')?.value||'').trim();
  const n2  = ($('new-pass2')?.value||'').trim();
  if(!cur || !n1) return toast('Enter current & new passwords');
  if(n1.length<4) return toast('New password too short');
  if(n1!==n2) return toast('New passwords do not match');
  const users=getUsers(); const rec=users[u];
  if(!rec || rec.password!==cur) return toast('Current password is wrong');
  rec.password=n1; users[u]=rec; saveUsers(users);
  $('cur-pass').value=''; $('new-pass').value=''; $('new-pass2').value='';
  $('change-pass-panel')?.classList.add('hidden');
  toast('Password updated');
});

// ===== Search History (chips + modal) =====
function getHistory(){ const u=getCurrentUser(); if(!u) return []; const users=getUsers(); return users[u]?.history || []; }
function saveHistory(arr){ const u=getCurrentUser(); if(!u) return; const users=getUsers(); users[u]=users[u]||{}; users[u].history=arr.slice(0,50); saveUsers(users); hydrateHistoryUI(users[u].history); }
function pushHistory(q){ if(!q) return; const h=getHistory(); const idx=h.findIndex(x=>x===q); if(idx>=0) h.splice(idx,1); h.unshift(q); saveHistory(h); }
function hydrateHistoryUI(h){
  const wrap=$('history-list'); if(!wrap) return; wrap.innerHTML='';
  const show = (h||[]).slice(0,8);
  show.forEach(item=>{
    const chip=document.createElement('div'); chip.className='chip'; chip.textContent=item;
    chip.addEventListener('click',()=>{ if($('search-input')){ $('search-input').value=item; filterList(); }});
    wrap.appendChild(chip);
  });
}
on($('see-all-history'),'click',()=>{
  const modal=$('history-modal'); const box=$('history-full');
  const h=getHistory(); box.innerHTML='';
  h.forEach((item,i)=>{
    const row=document.createElement('div'); row.className='row space-between list-row';
    row.innerHTML=`<span>${item}</span><button class="btn outline sm" data-del="${i}">Delete</button>`;
    box.appendChild(row);
  });
  box.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const i=Number(e.target.getAttribute('data-del'));
      const h=getHistory(); h.splice(i,1); saveHistory(h);
      $('history-modal').classList.add('hidden'); hydrateHistoryUI(getHistory());
      toast('Deleted from history');
    });
  });
  modal.classList.remove('hidden');
});
on($('hist-close'),'click',()=>$('history-modal').classList.add('hidden'));
on($('clear-history'),'click',()=>{ saveHistory([]); toast('History cleared'); });

// ===== Pharmacy Auth & Portal =====
function getStores(){ return storageJSON('medifind_stores')||{}; }
function saveStores(s){ storageJSON('medifind_stores', s); }
function setActiveStoreUser(u){ localStorage.setItem('medifind_active_store_user', u); }
function getActiveStoreUser(){ return localStorage.getItem('medifind_active_store_user'); }

on($('go-store-register'),'click',()=>showView('pharmacyRegister'));
on($('back-to-store-login'),'click',()=>showView('pharmacyLogin'));

on($('store-reg-submit'),'click',()=>{
  const uRaw = ($('store-reg-user').value||'').trim();
  const p = ($('store-reg-pass').value||'').trim();
  const c = ($('store-reg-confirm').value||'').trim();
  const name = ($('store-reg-name').value||'').trim();
  const contact = ($('store-reg-contact').value||'').trim();
  const u = normUser(uRaw);
  if(!u || !p) return toast('Store username & password required');
  if(p.length < 4) return toast('Password must be at least 4 chars');
  if(p !== c) return toast('Passwords do not match');
  const stores = getStores();
  if(stores[u]) return toast('Store username exists');
  stores[u] = { 
    password:p, 
    profile:{ name: name || u, contact, publish:false, lat:null, lon:null, hours24:false, open:"09:00", close:"21:00" } 
  };
  saveStores(stores);
  toast('Store registered! Log in now.');
  showView('pharmacyLogin');
});

let storeKey = null;
let storeMap = null, storeMarker = null, storeLatLng = null;

on($('store-login-btn'),'click',()=>{
  const u = normUser(($('store-login-user').value||'').trim());
  const p = ($('store-login-pass').value||'').trim();
  if(!u || !p) return toast('Enter store username & password');
  const stores = getStores();
  const rec = stores[u];
  if(!rec || rec.password !== p) return toast('Invalid store credentials');
  setActiveStoreUser(u);
  const prof = rec.profile || {};
  $('store-label').textContent = prof.name || u;
  storeKey = `medifind_store_${u}`;
  showView('pharmacyDash'); initStoreMap(); renderInventory(); loadHoursUI();
  toast('Store dashboard ready');
});
on($('store-logout-btn'),'click',()=>{
  localStorage.removeItem('medifind_active_store_user');
  storeKey=null; showView('landing'); renderResume();
  toast('Store signed out');
});

// Pharmacy tabs
on($('tab-medicines'),'click',()=>{
  $('tab-medicines').classList.add('active');
  $('tab-hospitals').classList.remove('active');
  $('medicines-tab').classList.remove('hidden');
  $('hospitals-tab').classList.add('hidden');
});

on($('tab-hospitals'),'click',()=>{
  $('tab-hospitals').classList.add('active');
  $('tab-medicines').classList.remove('active');
  $('medicines-tab').classList.add('hidden');
  $('hospitals-tab').classList.remove('hidden');
  loadHospitalInfo();
});

function saveHospitalInfo(){
  const user = getActiveStoreUser(); if(!user) return;
  const hospData = {
    name: ($('hosp-name').value||'').trim(),
    specialties: ($('hosp-specialties').value||'').split(',').map(s=>s.trim()).filter(s=>s),
    contact: ($('hosp-contact').value||'').trim(),
    address: ($('hosp-address').value||'').trim(),
    hours24: !!($('hosp-247').checked),
    open: $('hosp-open').value,
    close: $('hosp-close').value
  };

  if(!hospData.name) return toast('Enter hospital name');
  if(!hospData.specialties.length) return toast('Enter at least one specialty');

  storageJSON(`medifind_pharmacy_hospital_${user}`, hospData);
  toast('Hospital information saved');
  displayHospitalInfo(hospData);
}

function loadHospitalInfo(){
  const user = getActiveStoreUser(); if(!user) return;
  const hospData = storageJSON(`medifind_pharmacy_hospital_${user}`);

  if(hospData){
    $('hosp-name').value = hospData.name || '';
    $('hosp-specialties').value = (hospData.specialties || []).join(', ');
    $('hosp-contact').value = hospData.contact || '';
    $('hosp-address').value = hospData.address || '';
    $('hosp-247').checked = !!hospData.hours24;
    $('hosp-open').value = hospData.open || '09:00';
    $('hosp-close').value = hospData.close || '21:00';
    displayHospitalInfo(hospData);
  }

  on($('hosp-247'),'change',()=>{
    const hoursDiv = $('hosp-hours');
    if($('hosp-247').checked) hoursDiv.classList.add('hidden');
    else hoursDiv.classList.remove('hidden');
  });
}

function displayHospitalInfo(hospData){
  const display = $('hospital-info-display');
  const content = $('hospital-info-content');

  if(!hospData || !hospData.name){
    display.classList.add('hidden');
    return;
  }

  content.innerHTML = `
    <div class="row space-between">
      <strong>${hospData.name}</strong>
    </div>
    <div class="hint mt8">
      📍 ${hospData.address}<br/>
      📞 ${hospData.contact}<br/>
      ⏰ ${hospData.hours24 ? 'Open 24/7' : `${hospData.open} - ${hospData.close}`}
    </div>
    <div class="row gap8 mt8">
      ${hospData.specialties.map(s => `<span class="badge specialty">${s}</span>`).join('')}
    </div>
  `;

  display.classList.remove('hidden');
}

on($('save-hospital'),'click',()=>{ saveHospitalInfo(); });
on($('clear-hospital'),'click',()=>{
  $('hosp-name').value = '';
  $('hosp-specialties').value = '';
  $('hosp-contact').value = '';
  $('hosp-address').value = '';
  $('hosp-247').checked = false;
  $('hospital-info-display').classList.add('hidden');
});

const storePublish=$('store-publish'), storeCoordsEl=$('store-coords');
const hours247=$('hours-247'), hoursOpen=$('hours-open'), hoursClose=$('hours-close');

function getStoreProfileForUser(u){
  const stores=getStores(); return (stores[u] && stores[u].profile) ? stores[u].profile : null;
}
function saveStoreProfileForUser(u, prof){
  const stores=getStores(); if(!stores[u]) return; stores[u].profile = prof; saveStores(stores);
}
function loadHoursUI(){
  const user=getActiveStoreUser(); if(!user) return;
  const prof=getStoreProfileForUser(user) || {};
  if (hours247) hours247.checked = !!prof.hours24;
  if (hoursOpen) hoursOpen.value = prof.open || "09:00";
  if (hoursClose) hoursClose.value = prof.close || "21:00";
  if (storePublish) storePublish.checked = !!prof.publish;
  if (storeCoordsEl) {
    storeCoordsEl.textContent = (prof.lat && prof.lon) ? `Lat: ${(+prof.lat).toFixed(6)}, Lon: ${(+prof.lon).toFixed(6)}` : 'Lat: –, Lon: –';
  }
}
on($('save-hours'),'click',()=>{
  const user=getActiveStoreUser(); if(!user) return;
  const prof=getStoreProfileForUser(user) || {};
  prof.hours24 = !!(hours247 && hours247.checked);
  prof.open = (hoursOpen && hoursOpen.value) || "09:00";
  prof.close = (hoursClose && hoursClose.value) || "21:00";
  saveStoreProfileForUser(user, prof);
  toast('Hours saved');
});

function initStoreMap(){
  const el=$('store-map'); if(!el) return;
  if(!window.storeMap){
    window.storeMap=L.map('store-map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'&copy; OpenStreetMap'}).addTo(window.storeMap);
  }
  const user = getActiveStoreUser(); const prof = getStoreProfileForUser(user) || {};
  const def = (prof.lat && prof.lon) ? [prof.lat, prof.lon] : [12.9065,77.4845];
  window.storeMap.setView(def,16);

  if(!storeMarker){
    storeMarker=L.marker(def,{draggable:true}).addTo(window.storeMap).bindPopup('Your store');
    storeMarker.on('dragend',()=>{ const ll=storeMarker.getLatLng(); setStoreLocation(ll.lat,ll.lng); });
  } else storeMarker.setLatLng(def);

  setStoreLocation(def[0],def[1]);
  window.storeMap.off('click');
  window.storeMap.on('click',e=>{ setStoreLocation(e.latlng.lat,e.latlng.lng); storeMarker.setLatLng(e.latlng); });

  setTimeout(()=>{ try { window.storeMap.invalidateSize(); } catch {} }, 50);
}
function setStoreLocation(lat,lon){
  storeLatLng=[lat,lon];
  if (storeCoordsEl) storeCoordsEl.textContent=`Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
  const user = getActiveStoreUser(); if(!user) return;
  const prof = getStoreProfileForUser(user) || {};
  prof.lat=lat; prof.lon=lon; prof.publish=!!(storePublish && storePublish.checked); if(!prof.name) prof.name=user;
  saveStoreProfileForUser(user, prof);
}
on($('store-use-loc'),'click',()=>{
  navigator.geolocation?.getCurrentPosition(
    pos=>{ const {latitude,longitude}=pos.coords; storeMarker?.setLatLng([latitude,longitude]); window.storeMap?.setView([latitude,longitude],17); setStoreLocation(latitude,longitude); toast('Location updated'); },
    ()=>toast('Location blocked. Allow GPS.'),
    { enableHighAccuracy:true, timeout:10000, maximumAge:0 }
  )
});
on(storePublish,'change',()=>{
  const user = getActiveStoreUser(); if(!user) return;
  const prof = getStoreProfileForUser(user) || {};
  prof.publish = !!(storePublish && storePublish.checked);
  if(storeLatLng){prof.lat=storeLatLng[0]; prof.lon=storeLatLng[1];}
  saveStoreProfileForUser(user, prof);
  toast(prof.publish? 'Store published' : 'Store unpublished');
});

// Inventory CRUD
const invBody=$('inv-body');
function getInventory(){ if(!storeKey) return []; return storageJSON(storeKey)||[]; }
function saveInventory(items){ if(!storeKey) return; storageJSON(storeKey, items); }
function renderInventory(){
  if(!invBody) return; const items=getInventory(); invBody.innerHTML='';
  items.forEach((it,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${it.name}</td><td>${it.qty}</td><td>₹${Number(it.price).toFixed(2)}</td>
      <td><button data-idx="${idx}" class="del-btn">Delete</button></td>`;
    invBody.appendChild(tr);
  });
  invBody.querySelectorAll('.del-btn').forEach(btn=> on(btn,'click',e=>{
    const i=Number(e.target.getAttribute('data-idx')); const arr=getInventory(); arr.splice(i,1); saveInventory(arr); renderInventory();
    toast('Item deleted');
  }));
}
on($('add-item'),'click',()=>{
  const name=($('med-name')?.value||'').trim();
  const qty=Number($('med-qty')?.value||0);
  const price=Number($('med-price')?.value||0);
  if(!name) return toast('Enter medicine name');
  if(qty<0||price<0) return toast('Invalid quantity/price');
  const items=getInventory(); const ix=items.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());
  if(ix>=0){ items[ix].qty=qty; items[ix].price=price; } else items.push({name,qty,price});
  saveInventory(items); renderInventory();
  $('med-name').value=''; $('med-qty').value=''; $('med-price').value='';
  toast('Inventory saved');
});
on($('clear-all'),'click',()=>{ if(!storeKey) return; if(confirm('Clear all items?')){ saveInventory([]); renderInventory(); toast('Inventory cleared'); }});
on($('export-json'),'click',()=>{
  const data=getInventory(); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${storeKey||'medifind_store'}.json`; a.click(); URL.revokeObjectURL(url);
  toast('Exported JSON');
});

// ===== Hospitals =====
function getHospitals(){
  const list = storageJSON('medifind_hospitals_list') || [];
  const hospitals = {};
  list.forEach(id => {
    const h = storageJSON(`medifind_hospital_${id}`);
    if(h) hospitals[id] = h;
  });
  return hospitals;
}

function findNearestHospitals(userLat, userLon, count=5){
  if(!userLat || !userLon) userLat=12.9065; userLon=77.4845;
  const hospitals = getHospitals();
  let list = Object.values(hospitals).map(h => {
    const d = km([userLat, userLon], [h.lat, h.lon]);
    const hoursStatus = isOpenNow({hours24: h.hours24, open: h.open, close: h.close});
    return {...h, _dist: d, _eta: eta(d), _open: hoursStatus.open, _openLabel: hoursStatus.label};
  });
  list.sort((a,b) => a._dist - b._dist);
  return list.slice(0, count);
}

function getBookings(){
  const user = getCurrentUser(); if(!user) return [];
  return storageJSON(`medifind_bookings_${user}`) || [];
}

function saveBooking(booking){
  const user = getCurrentUser(); if(!user) return false;
  const bookings = getBookings();
  booking.bookingId = `booking_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
  booking.createdAt = new Date().toISOString();
  booking.status = 'confirmed';
  bookings.push(booking);
  storageJSON(`medifind_bookings_${user}`, bookings);
  return booking;
}

function cancelBooking(bookingId){
  const user = getCurrentUser(); if(!user) return;
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.bookingId === bookingId);
  if(idx >= 0){ bookings[idx].status = 'cancelled'; storageJSON(`medifind_bookings_${user}`, bookings); }
}

function rescheduleBooking(bookingId, newDate, newTime){
  const user = getCurrentUser(); if(!user) return;
  const bookings = getBookings();
  const idx = bookings.findIndex(b => b.bookingId === bookingId);
  if(idx >= 0){ bookings[idx].bookedDate = newDate; bookings[idx].bookedTime = newTime; storageJSON(`medifind_bookings_${user}`, bookings); }
}

function getDoctorsForSpecialty(hospitalId, specialty){
  const hospital = storageJSON(`medifind_hospital_${hospitalId}`);
  if(!hospital) return [];
  return hospital.doctors.filter(d => d.specialty === specialty);
}

function searchHospitals(query){
  if(!userCoords) userCoords = [12.9065, 77.4845];
  const hospitals = findNearestHospitals(userCoords[0], userCoords[1], 5);
  if(!query || query.trim() === '') return hospitals;

  const q = query.toLowerCase();
  return hospitals.filter(h =>
    h.name.toLowerCase().includes(q) ||
    h.specialties.some(s => s.toLowerCase().includes(q)) ||
    h.address.toLowerCase().includes(q)
  );
}

function renderNearestHospitals(){
  if(!userCoords) userCoords = [12.9065, 77.4845];
  const hospitals = findNearestHospitals(userCoords[0], userCoords[1], 5);
  const box = $('hospitals-list'); if(!box) return;
  box.innerHTML = '';

  if(!hospitals.length){
    box.innerHTML = '<div class="card glass"><strong>No hospitals found nearby.</strong></div>';
    return;
  }

  hospitals.forEach((h, idx) => {
    const card = document.createElement('div'); card.className = 'card glass';
    const specsHtml = h.specialties.map(s => `<span class="badge specialty">${s}</span>`).join('');
    card.innerHTML = `
      <div class="row space-between">
        <strong>#${idx+1} ${h.name}</strong>
        <span class="badge ${h._open ? 'open' : 'closed'}">${h._openLabel}</span>
      </div>
      <div class="addr">${h.address}</div>
      <div class="row mt8 gap8">${specsHtml}</div>
      <div class="row mt8 gap8">
        <span class="badge km">${h._dist.toFixed(2)} km</span>
        <span class="badge eta">ETA ${h._eta}</span>
        <span class="badge">📞 ${h.contact}</span>
      </div>
      <div class="row mt8 gap8 wrap">
        <button class="btn sm" data-view-doctors="${h.id}">👨‍⚕️ View Doctors</button>
        <button class="btn sm outline" data-route-hospital="${h.id}">🗺️ Route</button>
        <button class="btn sm outline" data-book-doctor="${h.id}">📅 Book Doctor</button>
      </div>
    `;
    box.appendChild(card);
    card.querySelector(`[data-view-doctors]`).addEventListener('click', () => showDoctorModal(h.id, h.name));
    card.querySelector(`[data-route-hospital]`).addEventListener('click', () => routeToHospital(h.id, h.lat, h.lon, h.name));
    card.querySelector(`[data-book-doctor]`).addEventListener('click', () => showDoctorBookingModal(h.id, h.name));
  });
}

function filterHospitals(){
  const searchInput = $('hospital-search-input');
  const query = searchInput ? searchInput.value : '';
  const results = searchHospitals(query);
  const box = $('hospitals-list'); if(!box) return;
  box.innerHTML = '';

  if(!results.length){
    box.innerHTML = `<div class="card glass"><strong>No hospitals found matching "${query}"</strong><div class="hint">Try searching by hospital name or specialty</div></div>`;
    return;
  }

  results.forEach((h, idx) => {
    const card = document.createElement('div'); card.className = 'card glass';
    const specsHtml = h.specialties.map(s => `<span class="badge specialty">${s}</span>`).join('');
    card.innerHTML = `
      <div class="row space-between">
        <strong>#${idx+1} ${h.name}</strong>
        <span class="badge ${h._open ? 'open' : 'closed'}">${h._openLabel}</span>
      </div>
      <div class="addr">${h.address}</div>
      <div class="row mt8 gap8">${specsHtml}</div>
      <div class="row mt8 gap8">
        <span class="badge km">${h._dist.toFixed(2)} km</span>
        <span class="badge eta">ETA ${h._eta}</span>
        <span class="badge">📞 ${h.contact}</span>
      </div>
      <div class="row mt8 gap8 wrap">
        <button class="btn sm" data-view-doctors="${h.id}">👨‍⚕️ View Doctors</button>
        <button class="btn sm outline" data-route-hospital="${h.id}">🗺️ Route</button>
        <button class="btn sm outline" data-book-doctor="${h.id}">📅 Book Doctor</button>
      </div>
    `;
    box.appendChild(card);
    card.querySelector(`[data-view-doctors]`).addEventListener('click', () => showDoctorModal(h.id, h.name));
    card.querySelector(`[data-route-hospital]`).addEventListener('click', () => routeToHospital(h.id, h.lat, h.lon, h.name));
    card.querySelector(`[data-book-doctor]`).addEventListener('click', () => showDoctorBookingModal(h.id, h.name));
  });
}

function showDoctorModal(hospitalId, hospitalName){
  const hospital = storageJSON(`medifind_hospital_${hospitalId}`);
  if(!hospital) return;

  const modal = $('doctor-modal'); if(!modal) return;
  const docList = $('doctor-list'); if(!docList) return;
  docList.innerHTML = '';

  const specSet = new Set(hospital.doctors.map(d => d.specialty));
  specSet.forEach(spec => {
    const specDiv = document.createElement('div');
    specDiv.className = 'specialty-group';
    specDiv.innerHTML = `<h4>${spec}</h4>`;

    hospital.doctors.filter(d => d.specialty === spec).forEach(doc => {
      const docCard = document.createElement('div'); docCard.className = 'doctor-card';
      docCard.innerHTML = `
        <div class="row space-between">
          <strong>${doc.name}</strong>
          <span class="badge ${doc.available ? 'open' : 'closed'}">${doc.available ? 'Available' : 'Unavailable'}</span>
        </div>
        <small class="hint">${doc.qualification}</small>
        <div class="row mt8 space-between">
          <span>💰 ₹${doc.fee}</span>
          <button class="btn sm" data-book-doctor="${doc.id}" ${!doc.available ? 'disabled' : ''}>Book</button>
        </div>
      `;
      specDiv.appendChild(docCard);

      if(doc.available){
        docCard.querySelector(`[data-book-doctor]`).addEventListener('click', () => {
          showBookingModal(hospitalId, hospitalName, doc);
        });
      }
    });
    docList.appendChild(specDiv);
  });

  modal.classList.remove('hidden');
}

function showBookingModal(hospitalId, hospitalName, doctor){
  const modal = $('booking-modal'); if(!modal) return;
  const form = $('booking-form'); if(!form) return;

  const today = new Date().toISOString().split('T')[0];
  form.innerHTML = `
    <input type="hidden" id="booking-hospital-id" value="${hospitalId}">
    <input type="hidden" id="booking-doctor-id" value="${doctor.id}">
    <div class="form">
      <label><strong>Doctor:</strong> ${doctor.name}</label>
      <label><strong>Specialty:</strong> ${doctor.specialty}</label>
      <label><strong>Consultation Fee:</strong> ₹${doctor.fee}</label>
      <label>Consultation Type</label>
      <div>
        <label class="checkline"><input type="radio" name="consult-type" value="online" checked> Online</label>
        <label class="checkline"><input type="radio" name="consult-type" value="in-person"> In-person</label>
      </div>
      <label>Preferred Date</label>
      <input type="date" id="booking-date" min="${today}" required>
      <label>Preferred Time</label>
      <input type="time" id="booking-time" value="10:00" required>
      <label>Reason for Consultation</label>
      <textarea id="booking-reason" placeholder="e.g., Heart checkup, Follow-up..." rows="2"></textarea>
      <label>Patient Notes (optional)</label>
      <textarea id="booking-notes" placeholder="Additional info..." rows="2"></textarea>
      <div class="row gap8 mt8">
        <button id="confirm-booking" class="btn">Confirm Booking</button>
        <button id="cancel-booking" class="btn outline">Cancel</button>
      </div>
    </div>
  `;

  $('confirm-booking').addEventListener('click', () => {
    const date = $('booking-date').value;
    const time = $('booking-time').value;
    const reason = $('booking-reason').value || 'Consultation';
    const notes = $('booking-notes').value || '';
    const type = document.querySelector('input[name="consult-type"]:checked').value;

    if(!date || !time) return toast('Select date and time');

    const booking = {
      hospitalId, doctorId: doctor.id, doctorName: doctor.name, specialty: doctor.specialty,
      hospitalName, bookedDate: date, bookedTime: time, reason, consultationType: type,
      patientNotes: notes
    };

    saveBooking(booking);
    modal.classList.add('hidden');
    $('doctor-modal').classList.add('hidden');
    toast('✅ Booking confirmed! Check your profile.');
  });

  $('cancel-booking').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.classList.remove('hidden');
}

function renderBookingHistory(){
  const bookings = getBookings();
  const box = $('bookings-history'); if(!box) return;
  box.innerHTML = '';

  if(!bookings.length){
    box.innerHTML = '<div class="card glass"><small class="hint">No bookings yet</small></div>';
    return;
  }

  bookings.forEach(b => {
    const card = document.createElement('div'); card.className = 'card glass mt8';
    const statusColor = b.status === 'confirmed' ? 'open' : b.status === 'cancelled' ? 'closed' : 'muted';
    card.innerHTML = `
      <div class="row space-between">
        <div>
          <strong>${b.doctorName}</strong> - <small>${b.specialty}</small>
          <div class="hint">${b.hospitalName}</div>
        </div>
        <span class="badge ${statusColor}">${b.status}</span>
      </div>
      <div class="row mt8 space-between">
        <span>📅 ${b.bookedDate} at ${b.bookedTime}</span>
        <span>${b.consultationType === 'online' ? '💻 Online' : '🏥 In-person'}</span>
      </div>
      <div class="row mt8 gap8">
        ${b.status === 'confirmed' ? `
          <button class="btn outline sm" data-reschedule="${b.bookingId}">Reschedule</button>
          <button class="btn outline sm" data-cancel="${b.bookingId}">Cancel</button>
        ` : ''}
      </div>
    `;
    box.appendChild(card);

    if(b.status === 'confirmed'){
      card.querySelector(`[data-cancel]`).addEventListener('click', () => {
        if(confirm('Cancel this booking?')){
          cancelBooking(b.bookingId);
          renderBookingHistory();
          toast('Booking cancelled');
        }
      });
    }
  });
}

// ===== Locator: map, GPS, search, AI ranking with Stars =====
let map, userMarker, accuracyCircle, userCoords=null, pharmacies=[];
let pharmacyMarkers = [], routeLines = [];
const locStatus=$('location-status'), sortSelect=$('sort-select'), originHint=$('origin-hint');
const searchInput=$('search-input');

const greenIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <path fill="#22c55e" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`
  ),
  iconSize:[32,48], iconAnchor:[16,48], popupAnchor:[0,-40]
});
const redIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <path fill="#ef4444" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`
  ),
  iconSize:[32,48], iconAnchor:[16,48], popupAnchor:[0,-40]
});
const blueIcon = L.icon({
  iconUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
      <path fill="#3b82f6" d="M16 0c8.8 0 16 7.2 16 16 0 12-16 32-16 32S0 28 0 16C0 7.2 7.2 0 16 0z"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`
  ),
  iconSize:[32,48], iconAnchor:[16,48], popupAnchor:[0,-40]
});

function initMap(){
  if(!$('map')) return;
  map=L.map('map'); 
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'&copy; OpenStreetMap'}).addTo(map);
  const sjbit=[12.9065,77.4845]; map.setView(sjbit,15);

  requestGPS();
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      pos=> updateUserPosition(pos),
      ()=>{},
      { enableHighAccuracy:true, timeout:30000, maximumAge:0 }
    );
  }
  map.on('click',(e)=>{
    if(window._manualUserPin){
      setUserLocation(e.latlng.lat, e.latlng.lng, 10);
      map.setView([e.latlng.lat, e.latlng.lng], 16);
      filterList();
    }
  });
}
function ensureMap(){ if(!map) initMap(); }

function updateUserPosition(pos){
  const {latitude,longitude,accuracy} = pos.coords;
  setUserLocation(latitude, longitude, accuracy);
  filterList();
}
function setUserLocation(lat,lon,acc=50){
  userCoords=[lat,lon];
  window._lastUserLoc = {lat, lon, acc};
  if(userMarker){ userMarker.setLatLng(userCoords); userMarker.dragging && userMarker.dragging.disable(); }
  else { userMarker=L.marker(userCoords,{icon:greenIcon, draggable:false}).addTo(map).bindPopup('You are here'); }
  if(accuracyCircle) accuracyCircle.setLatLng(userCoords).setRadius(acc);
  else accuracyCircle=L.circle(userCoords,{radius:acc, color:'#22c55e', weight:1, fillColor:'#22c55e', fillOpacity:0.15}).addTo(map);

  const insecure = location.protocol !== 'https:' && location.hostname !== 'localhost';
  locStatus && (locStatus.textContent = insecure
    ? 'GPS may be imprecise on HTTP. Use HTTPS or localhost for best accuracy.'
    : `GPS locked (~${Math.round(acc)} m)`);
  if(!map.getBounds().contains(userMarker.getLatLng())) map.setView(userCoords,15);
}
function requestGPS(){
  if(!navigator.geolocation){ locStatus && (locStatus.textContent='Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(
    pos=>{ locStatus && (locStatus.textContent='Location detected'); updateUserPosition(pos); },
    ()=>{ locStatus && (locStatus.textContent='Using default area (allow location for precision)'); },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}
on($('gps-refresh'),'click',()=>{ requestGPS(); toast('Refreshing location…'); });
on($('gps-recenter'),'click',()=>{ if(userCoords && map){ map.setView(userCoords, 16); toast('Map centered'); }});
on($('gps-manual'),'click',()=>{
  window._manualUserPin = !window._manualUserPin;
  toast(window._manualUserPin ? 'Manual mode ON' : 'Manual mode OFF');
  if(userMarker){
    if(window._manualUserPin){ userMarker.dragging && userMarker.dragging.enable(); }
    else { userMarker.dragging && userMarker.dragging.disable(); }
    userMarker.off('dragend');
    userMarker.on('dragend',()=>{
      const ll=userMarker.getLatLng(); setUserLocation(ll.lat, ll.lng, 10); filterList();
    });
  }
});

// Distance, ETA, open/closed
function km(a,b){ const R=6371,toRad=x=>x*Math.PI/180; const dLat=toRad(b[0]-a[0]), dLon=toRad(b[1]-a[1]);
  const s1=Math.sin(dLat/2)**2, s2=Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s1+s2)); }
function eta(k){ return `${Math.max(1, Math.round((k/18)*60))} min`; }
function isOpenNow(store){
  if(store.hours24) return {open:true, label:'Open 24×7'};
  if(!store.open || !store.close) return {open:true, label:'Hours N/A'};
  const now=new Date();
  const [oh,om]=store.open.split(':').map(Number);
  const [ch,cm]=store.close.split(':').map(Number);
  const openM=oh*60+om, closeM=ch*60+cm;
  const curM=now.getHours()*60+now.getMinutes();
  if(closeM>openM){
    const open = curM>=openM && curM<=closeM;
    return {open, label: open?`Open • closes ${store.close}`:`Closed • opens ${store.open}`};
  }else{
    const open = curM>=openM || curM<=closeM;
    return {open, label: open?`Open • closes ${store.close}`:`Closed • opens ${store.open}`};
  }
}

// === AI Recommendation (price + distance + availability) ===
function normalize(val, min, max){ if(max===min) return 0; return (val - min) / (max - min); }
const WEIGHTS = { price: 0.6, distance: 0.3, availability: 0.1 };
function scoreRow(row, mins){
  const pN = normalize(row.price, mins.minPrice, mins.maxPrice);
  const dN = normalize(row._dist, mins.minDist, mins.maxDist);
  const aN = 1 - Math.min(1, (row._qty||0) / (mins.maxQty||1));
  return (WEIGHTS.price*pN) + (WEIGHTS.distance*dN) + (WEIGHTS.availability*aN);
}
function scoreToStarsHTML(score){
  let stars = 5 - (score * 5);
  if (stars < 0) stars = 0;
  if (stars > 5) stars = 5;
  const count = Math.round(stars);
  if (count <= 0) return '';
  let html = `<span class="stars" aria-label="Rating ${count} stars">`;
  for (let i=0; i<count; i++){
    const delay = (i * 0.08).toFixed(2);
    html += `<span class="star" style="animation-delay:${delay}s">★</span>`;
  }
  html += `</span>`;
  return html;
}

// Load pharmacy data (portal-published)
async function loadPharmacyData(){
  const dynamic=[]; const stores = getStores();
  for (const user in stores){
    const prof = stores[user]?.profile || {};
    if (!prof.publish || !prof.lat || !prof.lon) continue;
    const storeInvKey = `medifind_store_${user}`;
    const inv = storageJSON(storeInvKey)||[];
    inv.forEach(item=>{
      dynamic.push({
        store: prof.name || user.toUpperCase(),
        medicine: item.name,
        price: Number(item.price)||0,
        address: prof.contact ? `Contact: ${prof.contact}` : 'User-submitted store',
        lat: prof.lat, lon: prof.lon, _qty: item.qty,
        _hours: { hours24: !!prof.hours24, open: prof.open, close: prof.close }
      });
    });
  }
  pharmacies=[...dynamic];
  renderAll(pharmacies);
}

// Render markers + list
function renderAll(list){ renderMarkers(list); renderList(list); }
function clearRoutes(){ routeLines.forEach(l=>map.removeLayer(l)); routeLines=[]; }
function renderMarkers(list){
  if(!map) return;
  pharmacyMarkers.forEach(m=>map.removeLayer(m)); pharmacyMarkers=[];
  list.forEach(p=>{
    const m=L.marker([p.lat,p.lon],{icon:redIcon}).addTo(map)
      .bindPopup(`<b>${p.store}</b><br/>${p.medicine} — ₹${p.price}${p._qty!=null?` | Qty ${p._qty}`:''}`);
    pharmacyMarkers.push(m);
  });
}
function routeTo(dest){
  if(!userCoords) return toast('Turn on location to route.');
  const url=`https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${dest.lat},${dest.lon}&travelmode=driving`;
  toast('Opening Google Maps…');
  window.open(url, '_blank');
}
function drawLineTo(dest){
  if(!userCoords||!map) return;
  const line=L.polyline([userCoords,[dest.lat,dest.lon]],{color:'#6ea8ff',weight:4,opacity:0.9});
  line.addTo(map); routeLines.push(line);
}

function renderList(list){
  const box=$('results-list'); if(!box) return; box.innerHTML='';

  // skeleton shimmer (brief)
  for(let i=0;i<3;i++){ const s=document.createElement('div'); s.className='skel'; box.appendChild(s); }
  setTimeout(doRender, 180);

  function doRender(){
    box.innerHTML='';
    const origin=userCoords||[12.9065,77.4845];

    let rows=list.map(p=>{
      const d=km(origin,[p.lat,p.lon]); 
      const hours=p._hours || {hours24:true, open:"00:00", close:"23:59"};
      const state=isOpenNow(hours);
      return {...p,_dist:d,_eta:eta(d), _open:state.open, _openLabel:state.label};
    });

    const qText=(searchInput?.value||'').trim().toLowerCase();
    if(!rows.length){
      if(qText){
        box.innerHTML = `<div class="card glass">
          <strong>No stores published yet.</strong>
          <div class="hint">Ask pharmacies to register in the portal and publish their stock.</div>
        </div>`;
      }
      return;
    }

    const mode = (sortSelect?.value||'recommended');
    const mins = rows.length ? {
      minPrice: Math.min(...rows.map(r=>r.price||0)),
      maxPrice: Math.max(...rows.map(r=>r.price||0)),
      minDist:  Math.min(...rows.map(r=>r._dist||0)),
      maxDist:  Math.max(...rows.map(r=>r._dist||0)),
      maxQty:   Math.max(1, ...rows.map(r=>r._qty||0)),
    } : {minPrice:0,maxPrice:1,minDist:0,maxDist:1,maxQty:1};

    if (mode==='distance'){
      rows.sort((a,b)=> (a._dist-b._dist)||(a.price-b.price));
      originHint && (originHint.textContent='Nearest first.');
    } else if (mode==='price'){
      rows.sort((a,b)=> (a.price-b.price)||(a._dist-b._dist));
      originHint && (originHint.textContent='Cheapest first.');
    } else {
      rows.forEach(r=> r._score = scoreRow(r, mins));
      rows.sort((a,b)=> a._score - b._score);
      originHint && (originHint.textContent='Ranking by Recommended (AI): price + distance + stock.');
    }

    const top = rows.slice(0,3);
    top.forEach(p=> drawLineTo(p));

    top.forEach((p,idx)=>{
      const starHTML = (p._score!=null) ? scoreToStarsHTML(p._score) : '';
      const card=document.createElement('div'); card.className='card glass';
      card.innerHTML=`
        <div class="row" style="justify-content:space-between">
          <strong>#${idx+1} ${p.store}</strong>
          <div class="row" style="gap:6px">${starHTML}<span class="badge ${p._open ? 'open' : 'closed'}">${p._openLabel}</span></div>
        </div>
        <div class="addr">${p.address||''}</div>
        <div class="row">
          <span class="badge price">₹${p.price}</span>
          <span class="badge">${p.medicine}</span>
          ${p._qty!=null?`<span class="badge">Qty ${p._qty}</span>`:''}
          <span class="badge km">${p._dist.toFixed(2)} km</span>
          <span class="badge eta">ETA ${p._eta}</span>
        </div>
        <div class="row mt8">
          <button class="btn sm" data-route="${idx}">Route</button>
        </div>
      `;
      box.appendChild(card);
      card.querySelector('[data-route]').addEventListener('click',()=>routeTo(p));
    });

    if(map && top.length){
      const pts = userCoords ? [userCoords, ...top.map(r=>[r.lat,r.lon])] : top.map(r=>[r.lat,r.lon]);
      const bounds=L.latLngBounds(pts); map.fitBounds(bounds,{padding:[30,30]});
    }
  }
}
on($('sort-select'),'change', ()=> filterList());
on($('search-input'),'input',()=>{ filterList(); });
$('search-input')?.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ const q=($('search-input').value||'').trim(); if(q){ pushHistory(q); filterList(); }}});

// Voice
let recognition=null, recognizing=false;
if('webkitSpeechRecognition' in window){
  recognition=new webkitSpeechRecognition(); recognition.lang='en-IN';
  recognition.onresult=(e)=>{ const t=e.results[0][0].transcript; if($('search-input')){ $('search-input').value=t; pushHistory(t); filterList(); } };
  recognition.onend=()=>{ recognizing=false; $('mic-btn')?.classList.remove('active'); };
}else{ $('mic-btn')?.setAttribute('disabled','true'); $('mic-btn')?.setAttribute('title','Voice not supported'); }
on($('mic-btn'),'click',()=>{ if(!recognition) return; if(!recognizing){ recognizing=true; $('mic-btn').classList.add('active'); recognition.start(); } else recognition.stop(); });

// OCR
on($('camera-input'),'change',async (e)=>{
  const file=e.target.files?.[0]; if(!file) return;
  const img=URL.createObjectURL(file);
  try{
    const {data:{text}}=await Tesseract.recognize(img,'eng');
    const word=(text||'').split(/\s+/).find(w=>w.length>3);
    if(word){ $('search-input').value=word; pushHistory(word); filterList(); toast(`Detected: ${word}`); }
  }catch{ toast('OCR failed'); }
});

// Resume on landing
function renderResume(){
  const card=$('resume-card'), wrap=$('resume-buttons'); if(!card||!wrap) return;
  wrap.innerHTML='';
  const consumer=getCurrentUser(); const store=getActiveStoreUser();
  if(!consumer && !store){ card.classList.add('hidden'); return; }
  if(consumer){
    const b=document.createElement('button'); b.className='btn'; b.textContent='Continue as consumer (@'+consumer+')';
    b.addEventListener('click',()=>{
      const users=getUsers(); const rec=users[consumer]||{history:[]};
      hydrateProfileUI(consumer, rec); loadAvatar(consumer);
      showView('home'); ensureMap(); loadPharmacyData(); hydrateHistoryUI(rec.history||[]);
    });
    wrap.appendChild(b);
  }
  if(store){
    const b2=document.createElement('button'); b2.className='btn outline'; b2.textContent='Continue as pharmacy ('+store+')';
    b2.addEventListener('click',()=>{
      const prof=(getStores()[store]||{}).profile || {};
      $('store-label').textContent = prof.name || store;
      storeKey=`medifind_store_${store}`; showView('pharmacyDash'); initStoreMap(); renderInventory(); loadHoursUI();
    });
    wrap.appendChild(b2);
  }
  card.classList.remove('hidden');
}

// Filter
function filterList(){
  const q=($('search-input')?.value||'').trim().toLowerCase();
  let list = pharmacies;
  if(q){ list = pharmacies.filter(p => (p.medicine||'').toLowerCase().includes(q) || (p.store||'').toLowerCase().includes(q)); }
  renderAll(list);
}

// ===== DEMO SEED (distributed 0.5–2 km + price variation) =====
(function seedDemoData(){
  const SEED_FLAG = 'medifind_demo_seed_v2'; // bump to reseed
  if (localStorage.getItem(SEED_FLAG)) return;

  const base = { lat: 12.9065, lon: 77.4845 }; // SJBIT area
  const kmToDeg = (km) => km / 111;
  const jitter = () => {
    const r = kmToDeg(0.5 + Math.random() * 1.5); // 0.5–2.0 km
    const a = Math.random() * Math.PI * 2;
    return { lat: base.lat + r*Math.cos(a), lon: base.lon + r*Math.sin(a) };
  };
  const varyPrice = (base) => +(base * (0.9 + Math.random()*0.2)).toFixed(2);
  const password = 'pass1234';

  const putStore = (user, displayName, items) => {
    const stores = JSON.parse(localStorage.getItem('medifind_stores') || '{}');
    const j = jitter();
    stores[user] = {
      password,
      profile: { name: displayName, contact:'', publish:true, lat:j.lat, lon:j.lon, hours24:true, open:"09:00", close:"21:00" }
    };
    localStorage.setItem('medifind_stores', JSON.stringify(stores));
    localStorage.setItem(`medifind_store_${user}`, JSON.stringify(items));
  };

  // 1
  putStore('sj_health_mart','SJ Health Mart (Kengeri)',[
    {name:'Paracetamol 650 mg (tab)',qty:120,price:varyPrice(3.50)},
    {name:'Pantoprazole 40 mg (tab)',qty:80,price:varyPrice(6.00)},
    {name:'Cetirizine 10 mg (tab)',qty:90,price:varyPrice(2.00)},
    {name:'Dextromethorphan + CPM (cough syrup) 100 ml',qty:15,price:varyPrice(85.00)},
    {name:'ORS Sachet 21 g',qty:60,price:varyPrice(18.00)},
    {name:'Vitamin D3 60,000 IU (cap)',qty:30,price:varyPrice(32.00)},
  ]);
  // 2
  putStore('greenleaf_pharmacy','GreenLeaf Pharmacy',[
    {name:'Dolo 650 (Paracetamol) (tab)',qty:150,price:varyPrice(4.00)},
    {name:'Azithromycin 500 mg (tab)',qty:40,price:varyPrice(21.00)},
    {name:'Ambroxol + Guaifenesin + Terbutaline (syrup) 100 ml',qty:12,price:varyPrice(95.00)},
    {name:'Omeprazole 20 mg (cap)',qty:60,price:varyPrice(5.00)},
    {name:'Zincovit (multivitamin) (tab)',qty:50,price:varyPrice(7.50)},
    {name:'ORS-L (low osmolarity)',qty:40,price:varyPrice(20.00)},
  ]);
  // 3
  putStore('kengeri_wellness','Kengeri Wellness Chemists',[
    {name:'Metformin 500 mg (tab)',qty:100,price:varyPrice(3.00)},
    {name:'Telmisartan 40 mg (tab)',qty:60,price:varyPrice(9.00)},
    {name:'Amlodipine 5 mg (tab)',qty:80,price:varyPrice(3.50)},
    {name:'Pantoprazole + Domperidone (tab)',qty:50,price:varyPrice(9.50)},
    {name:'Levocetirizine 5 mg (tab)',qty:70,price:varyPrice(2.50)},
    {name:'Ondansetron ODT 4 mg',qty:40,price:varyPrice(7.00)},
  ]);
  // 4
  putStore('apollo_cross_road','Cross Road Care Pharmacy',[
    {name:'Amoxicillin 500 mg (cap)',qty:50,price:varyPrice(10.00)},
    {name:'Cefixime 200 mg (tab)',qty:35,price:varyPrice(22.00)},
    {name:'Rabeprazole 20 mg (tab)',qty:50,price:varyPrice(6.50)},
    {name:'Montelukast 10 mg + Levocetirizine 5 mg (tab)',qty:40,price:varyPrice(12.00)},
    {name:'Diclofenac 50 mg (tab)',qty:80,price:varyPrice(3.50)},
    {name:'Antacid Gel 170 ml',qty:20,price:varyPrice(110.00)},
  ]);
  // 5
  putStore('lakeside_medicals','Lakeside Medicals',[
    {name:'Ibuprofen 400 mg (tab)',qty:120,price:varyPrice(3.00)},
    {name:'Paracetamol Syrup 120 mg/5 ml (60 ml)',qty:25,price:varyPrice(28.00)},
    {name:'Cetirizine Syrup 5 mg/5 ml (60 ml)',qty:18,price:varyPrice(35.00)},
    {name:'Pantoprazole 40 mg (tab)',qty:70,price:varyPrice(6.00)},
    {name:'ORS Orange 21 g',qty:50,price:varyPrice(20.00)},
    {name:'B-Complex (tab)',qty:60,price:varyPrice(4.50)},
  ]);
  // 6
  putStore('unity_care_pharma','Unity Care Pharma',[
    {name:'Metformin 1000 mg (tab)',qty:60,price:varyPrice(5.50)},
    {name:'Glimepiride 1 mg (tab)',qty:70,price:varyPrice(6.00)},
    {name:'Atorvastatin 10 mg (tab)',qty:55,price:varyPrice(8.50)},
    {name:'Losartan 50 mg (tab)',qty:50,price:varyPrice(7.00)},
    {name:'Pantoprazole + Domperidone (cap)',qty:40,price:varyPrice(10.00)},
    {name:'Vitamin B12 Methylcobalamin (cap)',qty:30,price:varyPrice(12.00)},
  ]);
  // 7
  putStore('prime_med_store','Prime Med Store',[
    {name:'Azithromycin 500 mg (tab)',qty:30,price:varyPrice(22.00)},
    {name:'Amoxicillin + Clavulanate 625 mg (tab)',qty:28,price:varyPrice(24.00)},
    {name:'Dextromethorphan + Phenylephrine + CPM (syrup) 100 ml',qty:10,price:varyPrice(95.00)},
    {name:'Omeprazole 20 mg (cap)',qty:70,price:varyPrice(5.00)},
    {name:'Cetirizine 10 mg (tab)',qty:90,price:varyPrice(2.00)},
    {name:'Paracetamol 650 mg (tab)',qty:140,price:varyPrice(3.50)},
  ]);
  // 8
  putStore('hill_view_pharmacy','Hill View Pharmacy',[
    {name:'Pantoprazole 40 mg (tab)',qty:90,price:varyPrice(6.00)},
    {name:'Domperidone 10 mg (tab)',qty:60,price:varyPrice(4.50)},
    {name:'Sucralfate Syrup 200 ml',qty:12,price:varyPrice(170.00)},
    {name:'Levocetirizine 5 mg (tab)',qty:60,price:varyPrice(2.50)},
    {name:'Dolo 650 (tab)',qty:120,price:varyPrice(4.00)},
    {name:'ORS Lemon 21 g',qty:45,price:varyPrice(20.00)},
  ]);
  // 9
  putStore('neigh_care_plus','Neighborhood Care Plus',[
    {name:'Amlodipine 5 mg (tab)',qty:70,price:varyPrice(3.50)},
    {name:'Telmisartan 40 mg (tab)',qty:50,price:varyPrice(9.00)},
    {name:'Rosuvastatin 10 mg (tab)',qty:35,price:varyPrice(14.00)},
    {name:'Ranitidine 150 mg (tab) (legacy/alt)',qty:50,price:varyPrice(2.50)},
    {name:'ORS Plain 21 g',qty:60,price:varyPrice(18.00)},
    {name:'Vitamin D3 60,000 IU (cap)',qty:25,price:varyPrice(32.00)},
  ]);
  // 10
  putStore('care_n_cure_meds','Care & Cure Meds',[
    {name:'Cefuroxime 500 mg (tab)',qty:20,price:varyPrice(28.00)},
    {name:'Ciprofloxacin 500 mg (tab)',qty:40,price:varyPrice(10.00)},
    {name:'Pantoprazole 40 mg (tab)',qty:60,price:varyPrice(6.00)},
    {name:'Ondansetron 4 mg (tab)',qty:35,price:varyPrice(6.50)},
    {name:'Ambroxol 30 mg (tab)',qty:50,price:varyPrice(5.00)},
    {name:'B-Complex with Zinc (cap)',qty:40,price:varyPrice(6.50)},
  ]);
  // 11
  putStore('metro_health_pharma','Metro Health Pharma',[
    {name:'Metformin 500 mg (tab)',qty:120,price:varyPrice(3.00)},
    {name:'Gliclazide 80 mg (tab)',qty:50,price:varyPrice(7.50)},
    {name:'Atorvastatin 20 mg (tab)',qty:40,price:varyPrice(12.00)},
    {name:'Esomeprazole 40 mg (tab)',qty:45,price:varyPrice(9.00)},
    {name:'Cetirizine 10 mg (tab)',qty:80,price:varyPrice(2.00)},
    {name:'Zinc + Vit C (tab)',qty:60,price:varyPrice(5.50)},
  ]);
  // 12
  putStore('goodlife_generic','GoodLife Generic Pharmacy',[
    {name:'Paracetamol 500 mg (tab)',qty:200,price:varyPrice(2.50)},
    {name:'Ibuprofen 200 mg (tab)',qty:160,price:varyPrice(2.20)},
    {name:'Omeprazole 20 mg (cap)',qty:120,price:varyPrice(4.50)},
    {name:'Cetirizine 10 mg (tab)',qty:150,price:varyPrice(1.80)},
    {name:'ORS Sachet 21 g',qty:100,price:varyPrice(16.00)},
    {name:'Multivitamin (tab)',qty:130,price:varyPrice(3.80)},
  ]);

  localStorage.setItem(SEED_FLAG, '1');
  console.log('✅ MediFind demo data seeded v2. Password:', password);
})();

// Hospital demo data seeding
(function seedHospitalData(){
  const SEED_FLAG = 'medifind_hospital_seed_v2';
  if (localStorage.getItem(SEED_FLAG)) return;

  const base = { lat: 12.9065, lon: 77.4845 };
  const kmToDeg = (km) => km / 111;
  const jitter = () => {
    const r = kmToDeg(1 + Math.random() * 2);
    const a = Math.random() * Math.PI * 2;
    return { lat: base.lat + r*Math.cos(a), lon: base.lon + r*Math.sin(a) };
  };

  const hospitals = [
    {
      id: 'apollo_hospital_kengeri',
      name: 'Apollo Hospital (Kengeri)',
      contact: '9876543210',
      address: 'Kengeri, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
      doctors: [
        { id: 'd1', name: 'Dr. Rajesh Kumar', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 500 },
        { id: 'd2', name: 'Dr. Priya Sharma', specialty: 'Neurology', qualification: 'MD, DM', available: true, fee: 450 },
        { id: 'd3', name: 'Dr. Vikram Singh', specialty: 'Orthopedics', qualification: 'MS, MCh', available: false, fee: 400 },
        { id: 'd4', name: 'Dr. Anjali Gupta', specialty: 'Pediatrics', qualification: 'MD, DCH', available: true, fee: 350 }
      ]
    },
    {
      id: 'fortis_hospital',
      name: 'Fortis Hospital, Bangalore',
      contact: '9876543211',
      address: 'Near Ashok Nagar, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: false, open: '08:00', close: '20:00',
      specialties: ['Cardiology', 'Oncology', 'Gastroenterology'],
      doctors: [
        { id: 'd5', name: 'Dr. Arun Patel', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 550 },
        { id: 'd6', name: 'Dr. Meera Nair', specialty: 'Oncology', qualification: 'MD, DNB', available: true, fee: 600 },
        { id: 'd7', name: 'Dr. Suresh Iyer', specialty: 'Gastroenterology', qualification: 'MD, DM', available: true, fee: 400 }
      ]
    },
    {
      id: 'manipal_hospital',
      name: 'Manipal Hospital, Malleshwaram',
      contact: '9876543212',
      address: 'Malleshwaram, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Cardiology', 'Pediatrics', 'Orthopedics', 'Neurology', 'Dermatology'],
      doctors: [
        { id: 'd8', name: 'Dr. Deepak Sinha', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 600 },
        { id: 'd9', name: 'Dr. Kavya Reddy', specialty: 'Pediatrics', qualification: 'MD, DCH', available: false, fee: 350 },
        { id: 'd10', name: 'Dr. Mohan Das', specialty: 'Orthopedics', qualification: 'MS, MCh', available: true, fee: 450 },
        { id: 'd11', name: 'Dr. Nisha Joshi', specialty: 'Dermatology', qualification: 'MD, DDV', available: true, fee: 300 }
      ]
    },
    {
      id: 'st_johns_hospital',
      name: "St. John's Medical College Hospital",
      contact: '9876543213',
      address: 'Sarjapur Road, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: false, open: '07:00', close: '21:00',
      specialties: ['Cardiology', 'Neurology', 'Psychiatry', 'Gastroenterology'],
      doctors: [
        { id: 'd12', name: 'Dr. Ravi Verma', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 500 },
        { id: 'd13', name: 'Dr. Sneha Menon', specialty: 'Psychiatry', qualification: 'MD, DNB', available: true, fee: 350 },
        { id: 'd14', name: 'Dr. Ajay Kumar', specialty: 'Gastroenterology', qualification: 'MD, DM', available: false, fee: 420 }
      ]
    },
    {
      id: 'narayana_health',
      name: 'Narayana Health, HSR Layout',
      contact: '9876543214',
      address: 'HSR Layout, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Cardiology', 'Orthopedics', 'Pediatrics', 'Oncology'],
      doctors: [
        { id: 'd15', name: 'Dr. Hari Krishnan', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 550 },
        { id: 'd16', name: 'Dr. Divya Desai', specialty: 'Orthopedics', qualification: 'MS, MCh', available: true, fee: 480 },
        { id: 'd17', name: 'Dr. Sandeep Rao', specialty: 'Oncology', qualification: 'MD, DNB', available: true, fee: 650 }
      ]
    },
    {
      id: 'bangalore_medical_college',
      name: 'Bangalore Medical College Hospital',
      contact: '9876543215',
      address: 'Fort, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: false, open: '06:00', close: '22:00',
      specialties: ['Neurology', 'Pediatrics', 'Dermatology'],
      doctors: [
        { id: 'd18', name: 'Dr. Prakash Sharma', specialty: 'Neurology', qualification: 'MD, DM', available: true, fee: 350 },
        { id: 'd19', name: 'Dr. Lakshmi Das', specialty: 'Pediatrics', qualification: 'MD, DCH', available: false, fee: 300 },
        { id: 'd20', name: 'Dr. Rohan Singh', specialty: 'Dermatology', qualification: 'MD, DDV', available: true, fee: 280 }
      ]
    },
    {
      id: 'rainbow_hospital',
      name: 'Rainbow Hospital, Whitefield',
      contact: '9876543216',
      address: 'Whitefield, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Cardiology', 'Gastroenterology', 'Psychiatry'],
      doctors: [
        { id: 'd21', name: 'Dr. Amit Singh', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 500 },
        { id: 'd22', name: 'Dr. Pooja Bhat', specialty: 'Gastroenterology', qualification: 'MD, DM', available: true, fee: 400 },
        { id: 'd23', name: 'Dr. Nikhil Gupta', specialty: 'Psychiatry', qualification: 'MD, DNB', available: true, fee: 380 }
      ]
    },
    {
      id: 'paul_russell_hospital',
      name: 'Paul Russell Hospital (PMH)',
      contact: '9876543217',
      address: 'Infantry Road, Bangalore',
      lat: jitter().lat, lon: jitter().lon,
      hours24: false, open: '09:00', close: '19:00',
      specialties: ['Orthopedics', 'Pediatrics', 'Neurology'],
      doctors: [
        { id: 'd24', name: 'Dr. Suresh Kumar', specialty: 'Orthopedics', qualification: 'MS, MCh', available: true, fee: 450 },
        { id: 'd25', name: 'Dr. Ananya Reddy', specialty: 'Pediatrics', qualification: 'MD, DCH', available: true, fee: 320 },
        { id: 'd26', name: 'Dr. Vikram Patel', specialty: 'Neurology', qualification: 'MD, DM', available: false, fee: 400 }
      ]
    },
    {
      id: 'kengeri_general_hospital',
      name: 'Kengeri General Hospital',
      contact: '9876543220',
      address: 'Near Kengeri Bus Stop, Bangalore',
      lat: 12.9120, lon: 77.4870,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['General Medicine', 'Emergency', 'Pediatrics', 'Gynecology'],
      doctors: [
        { id: 'd27', name: 'Dr. Rajesh Nair', specialty: 'General Medicine', qualification: 'MD', available: true, fee: 300 },
        { id: 'd28', name: 'Dr. Deepika Sharma', specialty: 'Gynecology', qualification: 'MD, DGO', available: true, fee: 350 },
        { id: 'd29', name: 'Dr. Arun Kumar', specialty: 'Pediatrics', qualification: 'MD, DCH', available: true, fee: 280 }
      ]
    },
    {
      id: 'lakeside_multispec',
      name: 'Lakeside Multispecialty Hospital',
      contact: '9876543221',
      address: 'Lakeside Layout, Kengeri, Bangalore',
      lat: 12.8950, lon: 77.4750,
      hours24: false, open: '08:00', close: '20:00',
      specialties: ['Cardiology', 'Orthopedics', 'General Surgery', 'Neurology'],
      doctors: [
        { id: 'd30', name: 'Dr. Vikram Singh', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 600 },
        { id: 'd31', name: 'Dr. Meera Patel', specialty: 'Orthopedics', qualification: 'MS, MCh', available: true, fee: 500 },
        { id: 'd32', name: 'Dr. Arjun Das', specialty: 'General Surgery', qualification: 'MS', available: false, fee: 400 }
      ]
    },
    {
      id: 'sjbit_medical_center',
      name: 'SJBIT Medical & Wellness Center',
      contact: '9876543222',
      address: 'Inside SJBIT Campus, Kengeri',
      lat: 12.9065, lon: 77.4845,
      hours24: false, open: '08:00', close: '18:00',
      specialties: ['General Medicine', 'Occupational Health', 'Emergency'],
      doctors: [
        { id: 'd33', name: 'Dr. Anandkumar Reddy', specialty: 'General Medicine', qualification: 'MD', available: true, fee: 250 },
        { id: 'd34', name: 'Dr. Sneha Kulkarni', specialty: 'General Medicine', qualification: 'MD', available: true, fee: 250 }
      ]
    },
    {
      id: 'kengeri_cardiac_center',
      name: 'Kengeri Cardiac Care Center',
      contact: '9876543223',
      address: 'Kengeri Satellite Town, Bangalore',
      lat: 12.9150, lon: 77.4800,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Cardiology', 'Pulmonology', 'Emergency'],
      doctors: [
        { id: 'd35', name: 'Dr. Sanjay Kumar', specialty: 'Cardiology', qualification: 'MD, DM', available: true, fee: 700 },
        { id: 'd36', name: 'Dr. Rajini Prakash', specialty: 'Pulmonology', qualification: 'MD, DM', available: true, fee: 550 }
      ]
    },
    {
      id: 'kengeri_orthopedic',
      name: 'Kengeri Orthopedic & Trauma Hospital',
      contact: '9876543224',
      address: 'Near SJBIT, Kengeri, Bangalore',
      lat: 12.9080, lon: 77.4860,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Orthopedics', 'Trauma Surgery', 'General Medicine'],
      doctors: [
        { id: 'd37', name: 'Dr. Mohan Reddy', specialty: 'Orthopedics', qualification: 'MS, MCh', available: true, fee: 550 },
        { id: 'd38', name: 'Dr. Priya Nair', specialty: 'Trauma Surgery', qualification: 'MS', available: true, fee: 600 }
      ]
    },
    {
      id: 'kengeri_maternity',
      name: 'Kengeri Maternity & Child Care Hospital',
      contact: '9876543225',
      address: 'Kengeri Main Road, Bangalore',
      lat: 12.9000, lon: 77.4900,
      hours24: true, open: '00:00', close: '23:59',
      specialties: ['Gynecology', 'Obstetrics', 'Pediatrics', 'Neonatology'],
      doctors: [
        { id: 'd39', name: 'Dr. Anjali Misra', specialty: 'Gynecology', qualification: 'MD, DGO', available: true, fee: 400 },
        { id: 'd40', name: 'Dr. Kavita Sharma', specialty: 'Pediatrics', qualification: 'MD, DCH', available: true, fee: 350 }
      ]
    },
    {
      id: 'kengeri_wellness_clinic',
      name: 'Kengeri Wellness & Diagnostic Center',
      contact: '9876543226',
      address: 'Kengeri, Near Railway Station, Bangalore',
      lat: 12.8980, lon: 77.4920,
      hours24: false, open: '07:00', close: '21:00',
      specialties: ['General Medicine', 'Pathology', 'Radiology', 'Dentistry'],
      doctors: [
        { id: 'd41', name: 'Dr. Ramesh Kumar', specialty: 'General Medicine', qualification: 'MD', available: true, fee: 280 },
        { id: 'd42', name: 'Dr. Seema Gupta', specialty: 'General Medicine', qualification: 'MD', available: true, fee: 280 }
      ]
    }
  ];

  hospitals.forEach(h => {
    localStorage.setItem(`medifind_hospital_${h.id}`, JSON.stringify(h));
  });
  localStorage.setItem('medifind_hospitals_list', JSON.stringify(hospitals.map(h => h.id)));
  localStorage.setItem(SEED_FLAG, '1');
  console.log('✅ Hospital demo data seeded. 15 hospitals with doctors (8 near Kengeri/SJBIT).');
})();

// ===== Hospital Event Handlers =====
on($('hospitals-refresh-gps'), 'click', () => {
  requestGPS();
  setTimeout(() => { renderNearestHospitals(); toast('Location refreshed'); }, 500);
});

on($('hospitals-view-bookings'), 'click', () => {
  renderBookingHistory();
  $('bookings-history-modal').classList.remove('hidden');
});

on($('doctor-modal-close'), 'click', () => {
  $('doctor-modal').classList.add('hidden');
});

on($('bookings-history-close'), 'click', () => {
  $('bookings-history-modal').classList.add('hidden');
});

// Hospital search
on($('hospital-search-input'), 'input', () => {
  filterHospitals();
});

// Bind sort
on($('sort-select'),'change', ()=> filterList());

// ===== AI CHATBOX & MEDICINE ORDERING =====

// Symptom to Medicine mapping
const symptomMedicineMap = {
  'fever': ['Paracetamol 650mg', 'Ibuprofen 400mg', 'Aspirin'],
  'cough': ['Dextromethorphan', 'Ambroxol', 'Cough syrup'],
  'cold': ['Cetirizine 10mg', 'Levocetirizine 5mg', 'Vitamin C'],
  'headache': ['Paracetamol 650mg', 'Ibuprofen 400mg', 'Aspirin'],
  'allergy': ['Cetirizine 10mg', 'Levocetirizine 5mg'],
  'acidity': ['Pantoprazole 40mg', 'Omeprazole 20mg', 'Antacid Gel'],
  'body pain': ['Diclofenac 50mg', 'Ibuprofen 400mg', 'Paracetamol 650mg'],
  'diabetes': ['Metformin 500mg', 'Glimepiride 1mg'],
  'nausea': ['Ondansetron 4mg', 'Domperidone 10mg'],
  'diarrhea': ['ORS Sachet', 'Loperamide'],
};

// Symptom to Specialist mapping
const symptomSpecialistMap = {
  'fever': ['General Medicine', 'Pediatrics'],
  'cough': ['Pulmonology', 'General Medicine'],
  'cold': ['General Medicine', 'Pediatrics'],
  'headache': ['Neurology', 'General Medicine'],
  'allergy': ['Dermatology', 'General Medicine'],
  'acidity': ['Gastroenterology', 'General Medicine'],
  'body pain': ['Orthopedics', 'General Medicine'],
  'diabetes': ['Endocrinology', 'General Medicine'],
  'heart': ['Cardiology'],
  'chest pain': ['Cardiology', 'General Medicine'],
};

let chatHistory = [];

// AI Chatbox Functions
function initAIChatbox(){
  on($('ai-chat-toggle'), 'click', () => {
    $('ai-chat-modal').classList.remove('hidden');
    setTimeout(() => $('ai-chat-input').focus(), 100);
  });

  on($('ai-chat-close'), 'click', () => {
    $('ai-chat-modal').classList.add('hidden');
  });

  on($('ai-chat-send'), 'click', () => {
    const input = $('ai-chat-input');
    if(input.value.trim()) analyzeSymptomsAI(input.value);
    input.value = '';
  });

  on($('ai-chat-input'), 'keydown', (e) => {
    if(e.key === 'Enter' && e.ctrlKey === false) {
      e.preventDefault();
      $('ai-chat-send').click();
    }
  });

  // Symptom quick buttons
  document.querySelectorAll('[data-symptom]').forEach(btn => {
    on(btn, 'click', () => {
      const symptom = btn.dataset.symptom;
      $('ai-chat-input').value = symptom;
      $('ai-chat-send').click();
    });
  });
}

function addChatMessage(role, content) {
  const box = $('ai-chat-messages');
  const msg = document.createElement('div');
  msg.style.marginBottom = '12px';
  msg.style.display = 'flex';
  msg.style.justifyContent = role === 'user' ? 'flex-end' : 'flex-start';

  const bubble = document.createElement('div');
  bubble.style.maxWidth = '80%';
  bubble.style.padding = '10px 14px';
  bubble.style.borderRadius = '10px';
  bubble.style.wordWrap = 'break-word';

  if(role === 'user') {
    bubble.style.background = 'var(--pri)';
    bubble.style.color = '#fff';
  } else {
    bubble.style.background = 'var(--card)';
    bubble.style.border = '1px solid var(--edge)';
  }

  bubble.innerHTML = content;
  msg.appendChild(bubble);
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
}

function analyzeSymptomsAI(userInput) {
  const input = userInput.toLowerCase();

  // Add user message
  addChatMessage('user', userInput);

  // Find matching medicines and specialists
  let suggestedMedicines = [];
  let suggestedSpecialists = [];

  for(let symptom in symptomMedicineMap) {
    if(input.includes(symptom)) {
      suggestedMedicines = [...new Set([...suggestedMedicines, ...symptomMedicineMap[symptom]])];
      suggestedSpecialists = [...new Set([...suggestedSpecialists, ...(symptomSpecialistMap[symptom] || [])])];
    }
  }

  if(!suggestedMedicines.length) {
    addChatMessage('ai', '😊 I understand you\'re experiencing symptoms. Could you describe them more clearly? Try: fever, cough, cold, headache, allergy, acidity, body pain, etc.');
    return;
  }

  // Find pharmacies with suggested medicines
  const stores = getStores();
  const pharmaciesWithMedicines = [];

  for(const storeUser in stores) {
    const prof = stores[storeUser]?.profile || {};
    if(!prof.publish || !prof.lat || !prof.lon) continue;

    const storeInvKey = `medifind_store_${storeUser}`;
    const inventory = storageJSON(storeInvKey) || [];

    const availableMedicines = inventory.filter(med =>
      suggestedMedicines.some(suggested => med.name.toLowerCase().includes(suggested.toLowerCase()))
    );

    if(availableMedicines.length > 0) {
      const dist = km([userCoords[0] || 12.9065, userCoords[1] || 77.4845], [prof.lat, prof.lon]);
      pharmaciesWithMedicines.push({
        name: prof.name,
        distance: dist,
        medicines: availableMedicines,
        lat: prof.lat,
        lon: prof.lon,
      });
    }
  }

  pharmaciesWithMedicines.sort((a,b) => a.distance - b.distance);
  const topPharmacies = pharmaciesWithMedicines.slice(0, 3);

  // Find hospitals with specialists
  const hospitals = findNearestHospitals(userCoords[0] || 12.9065, userCoords[1] || 77.4845, 3);
  const relevantHospitals = hospitals.filter(h =>
    suggestedSpecialists.some(spec => h.specialties && h.specialties.some(s => s.toLowerCase().includes(spec.toLowerCase())))
  );

  // Build AI response
  let response = `<strong>💊 Suggested Treatment Plan:</strong><br/>`;
  response += `<div class="hint mt8">Based on your symptoms: <strong>${userInput}</strong></div>`;

  response += `<div class="mt8"><strong>Recommended Medicines:</strong> ${suggestedMedicines.slice(0, 3).join(', ')}</div>`;

  response += `<div class="mt8"><strong>📍 Nearby Pharmacies (${topPharmacies.length} found):</strong><br/>`;
  topPharmacies.forEach((p, i) => {
    response += `${i+1}. <strong>${p.name}</strong> (${p.distance.toFixed(1)} km)<br/>`;
    response += `   Available: ${p.medicines.slice(0, 2).map(m => m.name).join(', ')}<br/>`;
  });
  response += `</div>`;

  response += `<div class="mt8"><strong>🏥 Nearby Hospitals with ${suggestedSpecialists[0] || 'specialists'} (${relevantHospitals.length} found):</strong><br/>`;
  relevantHospitals.slice(0, 2).forEach((h, i) => {
    response += `${i+1}. <strong>${h.name}</strong> (${h._dist.toFixed(1)} km)<br/>`;
  });
  response += `</div>`;

  response += `<div class="hint mt8" style="font-size:12px;">⚠️ This is not medical advice. Please consult with a healthcare professional.</div>`;

  addChatMessage('ai', response);
}

// Medicine Ordering
function renderQuickOrderMedicines() {
  if(!userCoords) userCoords = [12.9065, 77.4845];

  const nearestPharmacies = findNearestPharmacies(userCoords[0], userCoords[1], 3);
  const box = $('quick-order-list');
  if(!box) return;

  box.innerHTML = '';

  if(!nearestPharmacies.length) {
    box.innerHTML = '<div class="card glass"><small class="hint">No pharmacies found nearby</small></div>';
    return;
  }

  nearestPharmacies.forEach(pharm => {
    const storeInvKey = `medifind_store_${pharm.store}`;
    const inventory = storageJSON(storeInvKey) || [];

    if(!inventory.length) return;

    const topMedicines = inventory.slice(0, 3);

    const card = document.createElement('div');
    card.className = 'card glass';
    card.innerHTML = `
      <div class="row space-between">
        <strong>${pharm.store}</strong>
        <span class="badge km">${pharm._dist.toFixed(1)} km</span>
      </div>
      <div class="hint mt8">Available: ${topMedicines.map(m => m.name).join(', ')}</div>
      <div class="row gap8 mt8">
        <button class="btn sm" data-order-pharmacy="${pharm.store}">📦 Order Now</button>
        <button class="btn outline sm" data-view-pharmacy="${pharm.store}">View All</button>
      </div>
    `;
    box.appendChild(card);

    card.querySelector(`[data-order-pharmacy]`).addEventListener('click', () => {
      window.selectedPharmacyForOrder = pharm;
      showOrderModal(pharm);
    });
  });
}

function showOrderModal(pharmacy) {
  const storeInvKey = `medifind_store_${pharmacy.store}`;
  const inventory = storageJSON(storeInvKey) || [];

  let total = 0;
  let items = [];

  inventory.forEach(med => {
    items.push(med.name);
    total += Number(med.price) || 0;
  });

  const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;

  $('order-id-display').textContent = orderId;
  $('order-pharmacy-display').textContent = pharmacy.store;
  $('order-items-display').textContent = items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '');
  $('order-total-display').textContent = (total * Math.min(3, items.length)).toFixed(2);
  $('order-eta-display').textContent = '30-45 min';

  $('order-confirm-modal').classList.remove('hidden');
  toast('✅ Your order is placed! Tracking your delivery...', 3000);
}

function findNearestPharmacies(userLat, userLon, count=5) {
  if(!userLat || !userLon) userLat=12.9065; userLon=77.4845;
  let rows = pharmacies.map(p=>{
    const d=km([userLat,userLon],[p.lat,p.lon]);
    const hours=p._hours || {hours24:true};
    const state=isOpenNow(hours);
    return {...p,_dist:d,_eta:eta(d), _open:state.open, _openLabel:state.label};
  });
  rows.sort((a,b)=> a._dist-b._dist);
  return rows.slice(0, count);
}

// Hospital Routing
function routeToHospital(hospitalId, hospitalLat, hospitalLon, hospitalName) {
  if(!userCoords) userCoords = [12.9065, 77.4845];
  const origin = `${userCoords[0]},${userCoords[1]}`;
  const destination = `${hospitalLat},${hospitalLon}`;
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  window.open(url, '_blank');
  toast(`🗺️ Opening directions to ${hospitalName}...`);
}

// Doctor Booking
let selectedHospitalForBooking = null;

function showDoctorBookingModal(hospitalId, hospitalName) {
  const hospital = storageJSON(`medifind_hospital_${hospitalId}`);
  if(!hospital) return;

  selectedHospitalForBooking = { id: hospitalId, name: hospitalName, ...hospital };

  // Populate specialties
  const specSelect = $('booking-specialty');
  specSelect.innerHTML = '<option value="">Choose specialty...</option>';
  const specialties = [...new Set(hospital.doctors.map(d => d.specialty))];
  specialties.forEach(spec => {
    const opt = document.createElement('option');
    opt.value = spec;
    opt.textContent = spec;
    specSelect.appendChild(opt);
  });

  on(specSelect, 'change', () => {
    const docList = $('doctor-booking-list');
    docList.innerHTML = '';
    if(!specSelect.value) return;

    const doctorsInSpec = hospital.doctors.filter(d => d.specialty === specSelect.value);
    doctorsInSpec.forEach(doc => {
      const docCard = document.createElement('div');
      docCard.className = 'card glass mt8';
      docCard.innerHTML = `
        <div class="row space-between">
          <div>
            <strong>${doc.name}</strong>
            <div class="hint">${doc.qualification}</div>
          </div>
          <span class="badge ${doc.available ? 'open' : 'closed'}">${doc.available ? 'Available' : 'Unavailable'}</span>
        </div>
        <div class="row mt8 space-between">
          <span>💰 ₹${doc.fee}</span>
          <button class="btn sm" data-select-doctor="${doc.id}" ${!doc.available ? 'disabled' : ''}>Select</button>
        </div>
      `;
      docList.appendChild(docCard);

      if(doc.available) {
        docCard.querySelector(`[data-select-doctor]`).addEventListener('click', () => {
          window.selectedDoctor = doc;
        });
      }
    });
  });

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  $('booking-date').min = today;
  $('booking-date').value = today;

  $('doctor-booking-modal').classList.remove('hidden');
}

on($('confirm-doctor-booking'), 'click', () => {
  if(!window.selectedDoctor) return toast('Please select a doctor');
  const date = $('booking-date').value;
  const time = $('booking-time').value;

  if(!date || !time) return toast('Select date and time');

  const booking = {
    id: `BOOK_${Date.now()}`,
    doctor: window.selectedDoctor,
    hospital: selectedHospitalForBooking,
    date: date,
    time: time,
    status: 'confirmed'
  };

  // Save booking
  const user = getCurrentUser();
  const bookings = storageJSON(`medifind_bookings_${user}`) || [];
  bookings.push(booking);
  storageJSON(`medifind_bookings_${user}`, bookings);

  // Show confirmation
  $('booking-doctor-display').textContent = window.selectedDoctor.name;
  $('booking-specialty-display').textContent = window.selectedDoctor.specialty;
  $('booking-hospital-display').textContent = selectedHospitalForBooking.name;
  $('booking-datetime-display').textContent = `${date} at ${time}`;
  $('booking-location-display').textContent = selectedHospitalForBooking.address || 'Location TBD';

  $('doctor-booking-modal').classList.add('hidden');
  $('booking-confirm-modal').classList.remove('hidden');
  toast('✅ Your appointment is confirmed!', 3000);
});

on($('doctor-booking-close'), 'click', () => {
  $('doctor-booking-modal').classList.add('hidden');
});

on($('order-confirm-close'), 'click', () => {
  $('order-confirm-modal').classList.add('hidden');
});

on($('booking-confirm-close'), 'click', () => {
  $('booking-confirm-modal').classList.add('hidden');
});

on($('cancel-doctor-booking'), 'click', () => {
  $('doctor-booking-modal').classList.add('hidden');
});

// Init on page load
on(window, 'load', () => {
  if(getCurrentUser()) {
    renderQuickOrderMedicines();
    initAIChatbox();
  }
});


// Startup
document.addEventListener('DOMContentLoaded',()=>{
  showView('landing');
  renderResume();
});
