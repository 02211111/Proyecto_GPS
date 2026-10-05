import * as THREE from "three";
import { App } from "locar";

const btn = document.getElementById("start");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const accuracyEl = document.getElementById("accuracy");
const distanceEl = document.getElementById("distance");
const canvas = document.getElementById("ar-canvas");

const TARGET = { lat: -2.291122, lon: -78.1141843 };

function setStatus(msg) { statusEl.textContent = msg; }

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1);
  const dl = toRad(lon2 - lon1);
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function makeBox(color, size=10) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color })
  );
}

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Iniciando...";
  setStatus("Solicitando cámara y ubicación...");

  try {
    const app = new App({
      canvas,
      cameraOptions: { hFov: 80, near: 0.001, far: 2000 },
      showVideoBackground: true,
      videoConstraints: { video: { facingMode: "environment" } }
    });

    const locar = await app.start();

    locar.setGpsOptions({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 60000
    });

    let objectsAdded = false;

    locar.on("gpserror", (err) => {
      setStatus("Error GPS: activa ubicación en el navegador y permite acceso.");
      btn.disabled = false;
      btn.textContent = "REINTENTAR";
    });

    locar.on("gpsupdate", (ev) => {
      const c = ev.position.coords;
      coordsEl.textContent = `GPS: ${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`;
      accuracyEl.textContent = `Precisión: ${Math.round(c.accuracy)} m`;

      const dist = haversineMeters(c.latitude, c.longitude, TARGET.lat, TARGET.lon);
      distanceEl.textContent = `Distancia al Laboratorio: ${Math.round(dist)} m`;

      if (!objectsAdded) {
        // Cubo magenta en el laboratorio
        const targetBox = makeBox(0xff00ff, 12);
        locar.add(targetBox, TARGET.lat, TARGET.lon, 2);

        // Cubos cardinales a ~10 m
        const refs = [
          { dLat: 0.0001, dLon: 0, color: 0xff0000 }, // norte
          { dLat: -0.0001, dLon: 0, color: 0xffff00 }, // sur
          { dLat: 0, dLon: -0.0001, color: 0x00ffff }, // oeste
          { dLat: 0, dLon: 0.0001, color: 0x00ff00 }  // este
        ];

        for (const r of refs) {
          const box = makeBox(r.color, 10);
          locar.add(box, c.latitude + r.dLat, c.longitude + r.dLon, 2);
        }

        objectsAdded = true;
        setStatus("GPS recibido. Gira lentamente 360° y busca los cubos.");
        btn.style.display = "none";
      }
    });

    setStatus("Cámara iniciada. Esperando señal GPS...");
    await locar.startGps();

  } catch (e) {
    console.error(e);
    setStatus("No se pudo iniciar AR: " + (e.message || e));
    btn.disabled = false;
    btn.textContent = "REINTENTAR";
  }
});

