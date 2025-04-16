
let drivers = [];
let editingId = null;
let currentPage = 1;
const itemsPerPage = 20;

function showToast(msg) { /* inchangé */ }
function openModal(id) { document.getElementById(id).style.display='block'; }
function closeModal(id) { document.getElementById(id).style.display='none'; clearForm(); }
function clearForm() {
  document.getElementById('driverForm').reset(); editingId = null;
  document.getElementById('modalTitle').textContent = 'Inscription Livreur';
  document.getElementById('formSubmitBtn').textContent = 'Valider';
}

async function processForm() {
  const name = document.getElementById('driverName').value.trim();
  const vehicle = document.getElementById('driverVehicle').value.trim();
  const price = Number(document.getElementById('driverPrice').value);
  const phone = document.getElementById('driverPhone').value.trim();
  const rating = Number(document.getElementById('driverRating').value);
  const fileInput = document.getElementById('driverPhoto');
  const phonePattern = /^\+?\d{8,15}$/;
  if (!phonePattern.test(phone)) { alert('Format de téléphone invalide'); return; }

  let photoURL = 'assets/default-avatar.png';
  if (fileInput.files && fileInput.files[0]) {
    photoURL = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    });
  }

  if (editingId) {
    const idx = drivers.findIndex(d => d.id === editingId);
    Object.assign(drivers[idx], { name, vehicle, price, phone, rating, photo: photoURL });
  } else {
    const id = Date.now();
    drivers.push({ id, name, vehicle, price, phone, rating, photo: photoURL });
  }
  save(); closeModal('registrationModal'); updateDriversList(); updateDashboard();
  showToast('Opération réussie !');
}

function editDriver(id) {
  const d = drivers.find(d => d.id === id);
  editingId = id;
  document.getElementById('driverName').value = d.name;
  document.getElementById('driverVehicle').value = d.vehicle;
  document.getElementById('driverPrice').value = d.price;
  document.getElementById('driverPhone').value = d.phone;
  document.getElementById('driverRating').value = d.rating;
  document.getElementById('modalTitle').textContent = 'Modifier Livreur';
  document.getElementById('formSubmitBtn').textContent = 'Enregistrer';
  openModal('registrationModal');
}

function deleteDriver(id) { drivers = drivers.filter(d => d.id !== id); save(); updateDriversList(); updateDashboard(); }

function updateDriversList() {
  const text = document.getElementById('searchDrivers').value.toLowerCase();
  const minR = Number(document.getElementById('filterRating').value);
  const minP = Number(document.getElementById('minPrice').value) || 0;
  const maxP = Number(document.getElementById('maxPrice').value) || Infinity;
  const veh = document.getElementById('filterVehicle').value.toLowerCase();

  let filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(text) &&
    d.rating >= minR &&
    d.price >= minP && d.price <= maxP &&
    d.vehicle.toLowerCase().includes(veh)
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filtered.slice(start, start + itemsPerPage);

  const html = pageItems.map(d => `
    <div class="driver-card">
      <img src="${d.photo}" alt="Photo de ${d.name}" class="driver-photo" />
      <button class="delete-btn" onclick="deleteDriver(${d.id})">✕</button>
      <button class="edit-btn" onclick="editDriver(${d.id})">✎</button>
      <h3>${d.name}</h3>
      <p>${d.vehicle} • ${d.price} FCFA</p>
      <p>${d.phone}</p>
      <p>${'★'.repeat(d.rating)}${'☆'.repeat(5-d.rating)}</p>
    </div>
  `).join('');

  document.getElementById('driversList').innerHTML = html;
  renderPagination(filtered.length);
}

function renderPagination(total) {
  const nav = document.getElementById('pagination'); nav.innerHTML = '';
  const pages = Math.ceil(total/itemsPerPage);
  const prev = document.createElement('button'); prev.textContent='Précédent'; prev.disabled = currentPage===1;
  prev.onclick=()=>{currentPage--; updateDriversList();}; nav.append(prev);
  nav.append(document.createTextNode(` Page ${currentPage} / ${pages} `));
  const next = document.createElement('button'); next.textContent='Suivant'; next.disabled = currentPage===pages;
  next.onclick=()=>{currentPage++; updateDriversList();}; nav.append(next);
}

function updateDashboard() {
  const list = document.getElementById('dashboardList');
  list.innerHTML = drivers.map(d=>`
    <div class="dashboard-item">
      <img src="${d.photo}" alt="Photo de ${d.name}" class="driver-photo" />
      <span><strong>${d.name}</strong> - ${d.vehicle} - ${d.phone}</span>
      <div>
        <button class="edit-btn" onclick="editDriver(${d.id})">✎</button>
        <button class="delete-btn" onclick="deleteDriver(${d.id})">✕</button>
      </div>
    </div>
  `).join('');
}

function save() { localStorage.setItem('drivers', JSON.stringify(drivers)); }
function load() { const s=localStorage.getItem('drivers'); if(s) drivers=JSON.parse(s); }
window.onload = ()=>{ load(); updateDriversList(); updateDashboard(); };
