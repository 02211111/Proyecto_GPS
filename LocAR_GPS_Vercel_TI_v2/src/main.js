// Coordenada del Laboratorio de Redes
const TARGET = { lat: -2.299114, lon: -78.118125 };

const btn = document.getElementById("start");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const accuracyEl = document.getElementById("accuracy");
const distanceEl = document.getElementById("distance");
const debugEl = document.getElementById("debug");

let objectsAdded = false;

function setStatus(msg) {
  statusEl.textContent = msg;
  console.log("[ESTADO]", msg);
}

function debug(msg) {
  debugEl.textContent = "Debug: " + msg;
  console.log("[DEBUG]", msg);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lon2 - lon1);
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Añade un cubo georreferenciado a la escena A-Frame.
 * Usa el patrón "wrapper + hijo" que es el que AR.js recomienda.
 */
function addCube(lat, lon, color, sizeM, heightM, label = "") {
  const scene = document.querySelector("a-scene");

  // Wrapper: maneja la posición GPS
  const wrapper = document.createElement("a-entity");
  wrapper.setAttribute("gps-new-entity-place", `latitude: ${lat}; longitude: ${lon};`);
  wrapper.setAttribute("position", `0 ${heightM} 0`);

  // Cubo real, dentro del wrapper, elevado para que su base quede al nivel del suelo
  const box = document.createElement("a-box");
  box.setAttribute("color", color);
  box.setAttribute("width", sizeM);
  box.setAttribute("height", sizeM);
  box.setAttribute("depth", sizeM);
  box.setAttribute("position", `0 ${sizeM / 2} 0`);
  box.setAttribute("shadow", "cast: true; receive: true");

  wrapper.appendChild(box);
  scene.appendChild(wrapper);

  console.log(`[CUBO] ${label} -> lat=${lat}, lon=${lon}, color=${color}`);
  debug(`Cubo ${label} añadido (${lat.toFixed(6)}, ${lon.toFixed(6)})`);
}

// === ESPERAR A QUE AFRAME ESTÉ LISTO ===
window.addEventListener("load", () => {
  console.log("[INIT] Página cargada, esperando a A-Frame…");

  const scene = document.querySelector("a-scene");
  const cameraEl = document.querySelector("#ar-camera");

  if (!cameraEl) {
    setStatus("❌ Error: no se encontró la cámara AR.");
    return;
  }

  debug("A-Frame cargado, esperando GPS…");

  // === ESCUCHAR EL EVENTO CLAVE DE AR.js ===
  // Este evento se dispara CADA VEZ que AR.js tiene una posición GPS válida.
  cameraEl.addEventListener("gps-camera-update-position", (e) => {
    const coords = e.detail.position.coords;
    const lat = coords.latitude;
    const lon = coords.longitude;
    const acc = coords.accuracy;

    // Actualizar UI
    coordsEl.textContent = `GPS: ${lat.toFixed(7)}, ${lon.toFixed(7)}`;
    accuracyEl.textContent = `Precisión: ${Math.round(acc)} m`;

    const dist = haversineMeters(lat, lon, TARGET.lat, TARGET.lon);
    distanceEl.textContent = `Distancia al Laboratorio: ${Math.round(dist)} m`;

    debug(`GPS OK · precisión ${Math.round(acc)} m · dist target ${Math.round(dist)} m`);

    // === AÑADIR CUBOS SOLO UNA VEZ, CUANDO AR.js YA TIENE POSICIÓN ===
    if (!objectsAdded) {
      objectsAdded = true;
      setStatus("✅ GPS listo. Añadiendo cubos…");

      // Pequeño retraso para asegurarnos de que AR.js ha "asentado" su origen GPS
      setTimeout(() => {
        // 1) Cubo magenta en el Laboratorio de Redes
        addCube(TARGET.lat, TARGET.lon, "#ff00ff", 15, 8, "TARGET");

        // 2) Cubos de calibración a ~5.5 m del usuario (offset ≈ 0.00005°)
        const off = 0.00005;
        addCube(lat + off, lon, "#ff0000", 6, 2, "Norte");
        addCube(lat - off, lon, "#ffff00", 6, 2, "Sur");
        addCube(lat, lon - off, "#00ffff", 6, 2, "Oeste");
        addCube(lat, lon + off, "#00ff00", 6, 2, "Este");

        setStatus("✅ Cubos añadidos. Gira 360° para encontrarlos.");
        btn.style.display = "none";
      }, 1500);
    }
  });

  // También escuchamos cuando los objetos se terminan de cargar
  scene.addEventListener("gps-entity-place-loaded", (e) => {
    console.log("[EVENTO] gps-entity-place-loaded", e.detail);
  });
});

// === BOTÓN DE INICIO ===
btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "INICIANDO...";
  setStatus("Solicitando permisos de cámara y ubicación…");
  debug("Pidiendo getUserMedia para forzar permisos…");

  try {
    // Forzamos el prompt de permisos de cámara con un gesto del usuario.
    // AR.js usará el mismo stream después.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } }
    });
    // Detenemos el stream para que AR.js abra el suyo sin conflicto.
    stream.getTracks().forEach(t => t.stop());
    debug("Permisos de cámara OK. Esperando GPS de AR.js…");
    setStatus("Cámara autorizada. Esperando señal GPS (mín. 10-30 s)…");
  } catch (err) {
    console.error("Error de cámara:", err);
    setStatus(`❌ Error de cámara: ${err.name} - ${err.message}`);
    btn.disabled = false;
    btn.textContent = "REINTENTAR";
  }
});
