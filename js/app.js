let drivers = [];
let pendingDriver = {};
let renewingDriverId = null;

// Pagination
let currentPage = 1;
const itemsPerPage = 50;

/* ---------------------
   Toast
--------------------- */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

/* ---------------------
   Modales
--------------------- */
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'block';
}
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

/* ---------------------
   Défilement fluide & thème
--------------------- */
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
}
document.getElementById('toggleTheme')?.addEventListener('click', toggleTheme);

/* ---------------------
   Local Storage
--------------------- */
function saveToLocalStorage() {
  localStorage.setItem('drivers', JSON.stringify(drivers));
}
function loadFromLocalStorage() {
  const storedDrivers = localStorage.getItem('drivers');
  if (storedDrivers) drivers = JSON.parse(storedDrivers);
  updateDriversList();
  updateDashboard();
}

/* ---------------------
   Pagination
--------------------- */
function updatePagination(totalItems) {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Précédent";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      updateDriversList(document.getElementById('searchDrivers').value);
    }
  };
  paginationContainer.appendChild(prevBtn);

  const pageInfo = document.createElement("span");
  pageInfo.textContent = `Page ${currentPage} sur ${totalPages}`;
  paginationContainer.appendChild(pageInfo);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Suivant";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      updateDriversList(document.getElementById('searchDrivers').value);
    }
  };
  paginationContainer.appendChild(nextBtn);
}

/* ---------------------
   Mise à jour des listes
--------------------- */
function updateDriversList(filter = '') {
  const now = new Date();
  const activeDrivers = drivers.filter(driver => new Date(driver.expirationDate) > now);
  const filtered = activeDrivers.filter(driver =>
    driver.name.toLowerCase().includes(filter.toLowerCase())
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDrivers = filtered.slice(startIndex, endIndex);

  const html = paginatedDrivers.map((driver, index) => `
    <div class="driver-card" style="animation-delay: ${index * 0.1}s">
      <button class="delete-btn" onclick="deleteDriver(${driver.id})">✕</button>
      <img src="${driver.photo || 'https://via.placeholder.com/150'}" alt="Photo de ${driver.name}" class="driver-photo">
      <h3><i class="fa-solid fa-box icon"></i> ${driver.name}</h3>
      <p><i class="fa-solid fa-truck icon"></i> ${driver.vehicle} • ${driver.price} FCFA</p>
      <p><i class="fa-solid fa-phone icon"></i> ${driver.phone}</p>
      <p><i class="fa-solid fa-location-dot icon"></i> ${driver.city}</p>
      <p class="rating">${'★'.repeat(driver.rating)}${'☆'.repeat(5 - driver.rating)}</p>
      <p>Abonnement actif jusqu'au ${new Date(driver.expirationDate).toLocaleDateString()}</p>
    </div>
  `).join("");

  document.getElementById('driversList').innerHTML = html;
  updatePagination(filtered.length);
}

function updateDashboard(filter = '') {
  const filtered = drivers.filter(driver =>
    driver.name.toLowerCase().includes(filter.toLowerCase())
  );
  const html = filtered.map(driver => `
    <div class="dashboard-item">
      <div>
        <strong>${driver.name}</strong> - ${driver.vehicle} - ${driver.phone} - ${driver.city}<br>
        Abonné jusqu'au ${new Date(driver.expirationDate).toLocaleDateString()}
      </div>
      <button class="delete-btn" onclick="deleteDriver(${driver.id})">Supprimer</button>
    </div>
  `).join("");
  document.getElementById('dashboardList').innerHTML = html;
}

function deleteDriver(id) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce livreur ?")) {
    drivers = drivers.filter(driver => driver.id !== id);
    saveToLocalStorage();
    updateDriversList();
    updateDashboard();
  }
}

/* ---------------------
   Inscription (avec image du livreur)
--------------------- */
async function processRegistration() {
  try {
    pendingDriver = {
      name: document.getElementById('driverName').value.trim(),
      vehicle: document.getElementById('driverVehicle').value.trim(),
      price: document.getElementById('driverPrice').value.trim(),
      phone: document.getElementById('driverPhone').value.trim(),
      city: document.getElementById('driverCity').value.trim(),
      rating: 5
    };

    if (!pendingDriver.name || !pendingDriver.vehicle || !pendingDriver.price || !pendingDriver.phone || !pendingDriver.city) {
      alert("Veuillez remplir tous les champs.");
      return;
    }

    const fileInput = document.getElementById('driverImage');
    const file = fileInput.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = function () {
        pendingDriver.photo = reader.result;
        const expiration = new Date();
        expiration.setMonth(expiration.getMonth() + 1);
        pendingDriver.expirationDate = expiration.toISOString();
        closeModal('registrationModal');
        showModal('paymentModal');
      };
      reader.readAsDataURL(file);
    } else {
      alert("Veuillez télécharger une photo.");
    }
  } catch (error) {
    console.error("Erreur d'inscription :", error);
  }
}

/* ---------------------
   Paiement
--------------------- */
function confirmPayment() {
  if (renewingDriverId) {
    const driver = drivers.find(d => d.id === renewingDriverId);
    if (driver) {
      const newExpiration = new Date();
      newExpiration.setMonth(newExpiration.getMonth() + 1);
      driver.expirationDate = newExpiration.toISOString();
      alert("Abonnement renouvelé jusqu'au " + newExpiration.toLocaleDateString());
      saveToLocalStorage();
      updateDriversList();
      updateDashboard();
    }
    renewingDriverId = null;
    closeModal('paymentModal');
    return;
  }

  pendingDriver.id = Date.now();
  drivers.push({ ...pendingDriver });
  saveToLocalStorage();
  updateDriversList();
  updateDashboard();
  closeModal('paymentModal');
  showToast("Inscription réussie !");
}

/* ---------------------
   Initialisation
--------------------- */
window.onload = () => {
  loadFromLocalStorage();
};
