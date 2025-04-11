let drivers = [];
let pendingDriver = {};
let renewingDriverId = null;
let map;
let markers = [];
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
   Initialisation de la carte avec Leaflet
--------------------- */
function initMap() {
  map = L.map('mapContainer').setView([14.6928, -17.4467], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
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
   Défilement fluide et thème
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
  plotDriversOnMap();
}

/* ---------------------
   Pagination Controls
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

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDrivers = filtered.slice(startIndex, endIndex);

  const html = paginatedDrivers.map((driver, index) => `
    <div class="driver-card" style="animation-delay: ${index * 0.1}s">
      <button class="delete-btn" onclick="deleteDriver(${driver.id})">✕</button>
      <img src="${driver.photo}" alt="Photo de ${driver.name}" class="profile-photo-preview" />
      <h3><i class="fa-solid fa-box icon"></i> ${driver.name}</h3>
      <p><i class="fa-solid fa-truck icon"></i> ${driver.vehicle} • ${driver.price} FCFA</p>
      <p><i class="fa-solid fa-phone icon"></i> ${driver.phone}</p>
      <p><i class="fa-solid fa-map-pin icon"></i> Localisation GPS</p>
      <p class="rating">${'★'.repeat(driver.rating)}${'☆'.repeat(5 - driver.rating)}</p>
      <p>Abonnement actif jusqu'au ${new Date(driver.expirationDate).toLocaleDateString()}</p>
    </div>
  `).join("");

  document.getElementById('driversList').innerHTML = html;
  updatePagination(filtered.length);
  plotDriversOnMap();
}

function updateDashboard(filter = '') {
  const filtered = drivers.filter(driver =>
    driver.name.toLowerCase().includes(filter.toLowerCase())
  );
  const html = filtered.map(driver => `
    <div class="dashboard-item">
      <div>
        <img src="${driver.photo}" alt="Photo de ${driver.name}" class="profile-photo-preview" style="width:30px;height:30px;border-radius:50%;vertical-align:middle;">
        <strong>${driver.name}</strong> - ${driver.vehicle} - ${driver.phone}<br>
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
    plotDriversOnMap();
  }
}

/* ---------------------
   Fonction pour obtenir la position la plus précise
--------------------- */
function getAccuratePosition(successCallback, errorCallback) {
  let bestPosition = null;
  const watchID = navigator.geolocation.watchPosition(
    (position) => {
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = position;
      }
      if (bestPosition.coords.accuracy <= 20) { // seuil de 20 mètres
        navigator.geolocation.clearWatch(watchID);
        successCallback(bestPosition);
      }
    },
    (error) => {
      console.error("Erreur de géolocalisation :", error);
      errorCallback(error);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
  // Après 20 secondes, on arrête le watch et retourne la meilleure position obtenue
  setTimeout(() => {
    navigator.geolocation.clearWatch(watchID);
    if (bestPosition) {
      successCallback(bestPosition);
    } else {
      errorCallback(new Error("Position imprécise ou non obtenue"));
    }
  }, 20000);
}

/* ---------------------
   Inscription et géolocalisation
--------------------- */
function processRegistration() {
  pendingDriver = {
    name: document.getElementById('driverName').value.trim(),
    vehicle: document.getElementById('driverVehicle').value.trim(),
    price: document.getElementById('driverPrice').value.trim(),
    phone: document.getElementById('driverPhone').value.trim(),
    rating: 5
  };
  if (!pendingDriver.name || !pendingDriver.vehicle || !pendingDriver.price || !pendingDriver.phone) {
    alert("Veuillez remplir tous les champs.");
    return;
  }
  const fileInput = document.getElementById('driverPhoto');
  const file = fileInput && fileInput.files[0];

  if (navigator.geolocation) {
    getAccuratePosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        pendingDriver.location = [latitude, longitude];

        if (map && typeof map.setView === 'function') {
          map.setView([latitude, longitude], 15);
        }

        pendingDriver.photo = file
          ? URL.createObjectURL(file)
          : 'https://via.placeholder.com/150';

        const expiration = new Date();
        expiration.setMonth(expiration.getMonth() + 1);
        pendingDriver.expirationDate = expiration.toISOString();

        closeModal('registrationModal');
        showModal('paymentModal');
      },
      (error) => {
        let message = "Erreur lors de la récupération de la position.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Accès à la géolocalisation refusé. Vérifiez vos paramètres d'autorisation.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Position non disponible. Vérifiez votre connexion GPS.";
        } else if (error.code === error.TIMEOUT) {
          message = "La demande de géolocalisation a expiré. Veuillez réessayer.";
        } else {
          message = error.message;
        }
        alert(message);
      }
    );
  } else {
    alert("La géolocalisation n'est pas supportée par cet appareil.");
  }
}

/* ---------------------
   Confirmation de paiement
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
  plotDriversOnMap();
}

/* ---------------------
   Ploter les livreurs sur la carte
--------------------- */
function plotDriversOnMap() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  drivers.forEach(driver => {
    if (new Date(driver.expirationDate) > new Date() && driver.location) {
      const marker = L.marker(driver.location).addTo(map)
        .bindPopup(`
          <strong>${driver.name}</strong><br>
          <img src="${driver.photo}" alt="Photo ${driver.name}" style="width:50px;height:50px;border-radius:50%;"><br>
          <i class="fa-solid fa-truck"></i> ${driver.vehicle}<br>
          <i class="fa-solid fa-phone"></i> ${driver.phone}
        `);
      markers.push(marker);
    }
  });
}

/* ---------------------
   Initialisation à l'ouverture
--------------------- */
window.onload = () => {
  loadFromLocalStorage();
  initMap();
};

/* ---------------------
   Prévisualisation de la photo
--------------------- */
const photoInput = document.getElementById('driverPhoto');
const photoPreview = document.getElementById('photoPreview');
if (photoInput) {
  photoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        photoPreview.src = e.target.result;
        photoPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      photoPreview.src = '#';
      photoPreview.style.display = 'none';
    }
  });
}
