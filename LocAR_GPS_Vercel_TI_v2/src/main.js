import * as THREE from "three";
import { App } from "locar";

const btn = document.getElementById("start");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const accuracyEl = document.getElementById("accuracy");
const distanceEl = document.getElementById("distance");
const canvas = document.getElementById("ar-canvas");

// Coordenada del Laboratorio de Redes (según la guía)
const TARGET = {
  lat: -2.299114,
  lon: -78.118125,
  name: "LABORATORIO DE REDES"
};

function setStatus(msg) {
  statusEl.textContent = msg;
  console.log("[Estado]", msg);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lon2 - lon1);
  const a = Math.sin(dp/2)**2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function makeBox(color, size = 10) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color })
  );
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "INICIANDO...";
  setStatus("Solicitando cámara y sensores...");

  try {
    // ✅ 1. Detección de plataforma para evitar el bug de Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    const app = new App({
      canvas,
      cameraOptions: {
        hFov: 80,
        near: 0.001,
        far: 2000
      },
      // ✅ 2. La cámara se muestra escuchando el evento 'webcamstarted'
      //    (showVideoBackground ya no es válido en versiones recientes)
      videoConstraints: {
        video: { facingMode: "environment" }
      }
    });

    // ✅ 3. Mostrar el feed de la cámara al iniciar
    app.on("webcamstarted", (ev) => {
      console.log("Cámara iniciada correctamente.");
      app.scene.background = ev.texture;
    });

    app.on("webcamerror", (err) => {
      console.error("Error de cámara:", err);
      setStatus(`Error de cámara: ${err.message || err.code}`);
    });

    // ✅ 4. Iniciar la App (pide permisos de cámara y orientación)
    const locar = await app.start();

    // ✅ 5. Configurar GPS
    locar.setGpsOptions({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000
    });

    let objectsAdded = false;

    // ✅ 6. Manejo de errores de GPS muy explícito
    locar.on("gpserror", (err) => {
      const code = err?.code ?? "desconocido";
      let mensaje = err?.message ?? "Error desconocido";

      if (code === 1) {
        mensaje = "Permiso denegado. Verifica que la página esté en HTTPS y que los permisos del sistema estén activados.";
      } else if (code === 2) {
        mensaje = "Posición no disponible. Asegúrate de que el GPS del dispositivo esté encendido y con señal.";
      } else if (code === 3) {
        mensaje = "Tiempo de espera agotado. El GPS no pudo obtener una posición a tiempo.";
      }

      setStatus(`❌ Error GPS [Código ${code}]: ${mensaje}`);
      btn.disabled = false;
      btn.textContent = "REINTENTAR";
    });

    // ✅ 7. Escuchar la primera actualización de GPS
    locar.on("gpsupdate", (ev) => {
      const c = ev.position.coords;

      coordsEl.textContent =
        `GPS: ${c.latitude.toFixed(7)}, ${c.longitude.toFixed(7)}`;
      accuracyEl.textContent =
        `Precisión: ${Math.round(c.accuracy)} m`;

      const dist = haversineMeters(
        c.latitude, c.longitude, TARGET.lat, TARGET.lon
      );
      distanceEl.textContent =
        `Distancia al Laboratorio: ${Math.round(dist)} m`;

      // ✅ 8. Añadir los objetos solo después de la primera posición GPS
      if (!objectsAdded) {
        // Cubo magenta en la ubicación exacta del laboratorio.
        const targetBox = makeBox(0xff00ff, 12);
        locar.add(targetBox, TARGET.lon, TARGET.lat, 6);

        // Cubos de referencia a ~11 metros para visibilidad inmediata.
        const offset = 0.0001;
        const refs = [
          { dLat:  offset, dLon:  0,      color: 0xff0000 }, // Norte
          { dLat: -offset, dLon:  0,      color: 0xffff00 }, // Sur
          { dLat:  0,      dLon: -offset, color: 0x00ffff }, // Oeste
          { dLat:  0,      dLon:  offset, color: 0x00ff00 }  // Este
        ];

        for (const r of refs) {
          const box = makeBox(r.color, 10);
          locar.add(
            box,
            c.longitude + r.dLon,
            c.latitude + r.dLat,
            5
          );
        }

        objectsAdded = true;
        setStatus("✅ GPS inicial recibido. Gira lentamente 360° y busca los cubos.");
        btn.style.display = "none";
      }
    });

    setStatus("Cámara iniciada. Solicitando ubicación GPS...");
    await locar.startGps();

  } catch (e) {
    console.error("Error fatal:", e);
    const msg = e?.message || String(e);
    setStatus(`❌ No se pudo iniciar AR: ${msg}`);
    btn.disabled = false;
    btn.textContent = "REINTENTAR";
  }
});

