import * as THREE from "three";
import { App } from "locar";

const btn = document.getElementById("start");
const statusEl = document.getElementById("status");
const coordsEl = document.getElementById("coords");
const accuracyEl = document.getElementById("accuracy");
const canvas = document.getElementById("ar-canvas");

function setStatus(msg) { statusEl.textContent = msg; }

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

    let added = false;

    locar.on("gpserror", () => {
      setStatus("Error GPS: activa ubicación en el navegador.");
      btn.disabled = false;
      btn.textContent = "REINTENTAR";
    });

    locar.on("gpsupdate", (ev) => {
      const c = ev.position.coords;
      coordsEl.textContent = `GPS: ${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`;
      accuracyEl.textContent = `Precisión: ${Math.round(c.accuracy)} m`;

      if (!added) {
        // Cubo justo en tu posición
        const meBox = makeBox(0x00ff00, 12);
        locar.add(meBox, c.latitude, c.longitude, 2);

        // Cubo de prueba a 10 m norte
        const northBox = makeBox(0xff0000, 10);
        locar.add(northBox, c.latitude + 0.0001, c.longitude, 2);

        added = true;
        setStatus("Cubos añadidos. Gira lentamente y búscalos.");
        btn.style.display = "none";
      }
    });

    setStatus("Cámara iniciada. Esperando señal GPS...");
    await locar.startGps();

  } catch (e) {
    console.error(e);
    setStatus("Error al iniciar AR: " + (e.message || e));
    btn.disabled = false;
    btn.textContent = "REINTENTAR";
  }
});

