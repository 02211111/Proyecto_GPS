// Coordenada del Laboratorio de Redes (según la guía)
const TARGET = {
  lat: -2.299114,
  lon: -78.118125,
  name: "LABORATORIO DE REDES"
};

// Referencias a los elementos del DOM
const btn = document.getElementById("start");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const accuracyEl = document.getElementById("accuracy");
const distanceEl = document.getElementById("distance");
const dynamicEntities = document.getElementById("dynamic-entities");

// Función para actualizar el estado en la interfaz
function setStatus(msg) {
  statusEl.textContent = msg;
  console.log("[Estado]", msg);
}

// Fórmula de Haversine para calcular la distancia entre dos coordenadas
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio de la Tierra en metros
  const toRad = d => d * Math.PI / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Función para crear un cubo en A-Frame y añadirlo a la escena
function addCubeToScene(lat, lon, color, size = 10, altitude = 5) {
  const cube = document.createElement("a-box");
  cube.setAttribute("color", color);
  cube.setAttribute("depth", size);
  cube.setAttribute("height", size);
  cube.setAttribute("width", size);
  // El componente gps-new-entity-place posiciona el objeto en el mundo real
  cube.setAttribute("gps-new-entity-place", `latitude: ${lat}; longitude: ${lon};`);
  // Ajustamos la elevación para que el cubo no esté a ras de suelo
  cube.setAttribute("position", `0 ${altitude} 0`);
  dynamicEntities.appendChild(cube);
  console.log(`Cubo añadido en: ${lat}, ${lon}`);
}

// Manejador del botón de inicio
btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "INICIANDO...";
  setStatus("Solicitando permisos de cámara y ubicación...");

  // Detectar si es Android para posibles ajustes
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Usamos la API de Geolocalización directamente para obtener la posición inicial
  navigator.geolocation.getCurrentPosition(
    (position) => {
      // Éxito: obtuvimos la posición
      const c = position.coords;
      console.log("Posición inicial obtenida:", c);

      // Actualizamos la interfaz
      coordsEl.textContent = `GPS: ${c.latitude.toFixed(7)}, ${c.longitude.toFixed(7)}`;
      accuracyEl.textContent = `Precisión: ${Math.round(c.accuracy)} m`;
      const dist = haversineMeters(c.latitude, c.longitude, TARGET.lat, TARGET.lon);
      distanceEl.textContent = `Distancia al Laboratorio: ${Math.round(dist)} m`;

      // Una vez que tenemos la posición, creamos los objetos en la escena
      // 1. Cubo Magenta en la ubicación del laboratorio
      addCubeToScene(TARGET.lat, TARGET.lon, "#ff00ff", 12, 6);

      // 2. Cubos de referencia para los puntos cardinales a ~11 metros
      const offset = 0.0001; // Aproximadamente 11 metros
      addCubeToScene(c.latitude + offset, c.longitude, "#ff0000", 10, 5); // Norte
      addCubeToScene(c.latitude - offset, c.longitude, "#ffff00", 10, 5); // Sur
      addCubeToScene(c.latitude, c.longitude - offset, "#00ffff", 10, 5); // Oeste
      addCubeToScene(c.latitude, c.longitude + offset, "#00ff00", 10, 5); // Este

      // Ocultamos el botón y actualizamos el estado
      btn.style.display = "none";
      setStatus("✅ ¡Listo! Gira lentamente 360° y busca los cubos.");
    },
    (error) => {
      // Error: no se pudo obtener la posición
      console.error("Error de geolocalización:", error);
      let mensaje = "";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          mensaje = "Permiso denegado. Revisa los ajustes de ubicación de tu navegador y sistema operativo.";
          break;
        case error.POSITION_UNAVAILABLE:
          mensaje = "Posición no disponible. Asegúrate de estar al aire libre y con buena señal GPS.";
          break;
        case error.TIMEOUT:
          mensaje = "Tiempo de espera agotado. Intenta de nuevo en un lugar más despejado.";
          break;
        default:
          mensaje = "Error desconocido al obtener la ubicación.";
      }
      setStatus(`❌ Error GPS [Código ${error.code}]: ${mensaje}`);
      btn.disabled = false;
      btn.textContent = "REINTENTAR";
    },
    {
      enableHighAccuracy: true, // Alta precisión para AR
      timeout: 30000,
      maximumAge: 0
    }
  );
});

// Opcional: Escuchar actualizaciones continuas de posición para actualizar la distancia
navigator.geolocation.watchPosition(
  (position) => {
    const c = position.coords;
    coordsEl.textContent = `GPS: ${c.latitude.toFixed(7)}, ${c.longitude.toFixed(7)}`;
    accuracyEl.textContent = `Precisión: ${Math.round(c.accuracy)} m`;
    const dist = haversineMeters(c.latitude, c.longitude, TARGET.lat, TARGET.lon);
    distanceEl.textContent = `Distancia al Laboratorio: ${Math.round(dist)} m`;
  },
  (error) => {
    console.warn("Error en watchPosition:", error);
  },
  {
    enableHighAccuracy: true,
    timeout: 27000,
    maximumAge: 0
  }
);
