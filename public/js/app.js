
// public/js/app.js
const API_BASE = "/api"; // en Pages, las rutas del Worker estarán en el mismo dominio

// --- LOGIN (simple) ---
if (document.getElementById("loginForm")) {
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = document.getElementById("username").value.trim();
    const pass = document.getElementById("password").value.trim();

    // Credenciales simples: reemplaza por tu lógica real si quieres
    if (user === "admin" && pass === "1234") {
      localStorage.setItem("jh_auth", "true");
      window.location.href = "/dashboard.html";
    } else {
      alert("Usuario o contraseña incorrectos");
    }
  });
}

// --- PROTEGER DASHBOARD ---
if (location.pathname.endsWith("/dashboard.html")) {
  const authed = localStorage.getItem("jh_auth");
  if (!authed) {
    window.location.href = "/login.html";
  }
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("jh_auth");
    window.location.href = "/login.html";
  });
  loadPacientes();
}

// --- CARGA DE PACIENTES ---
async function loadPacientes() {
  const tbody = document.getElementById("pacientesTable");
  tbody.innerHTML = "<tr><td colspan='6'>Cargando...</td></tr>";
  try {
    const res = await fetch(`${API_BASE}/usuarios`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='6'>No hay pacientes</td></tr>";
      return;
    }
    tbody.innerHTML = "";
    data.forEach(p => {
      const imgs = p.imagenes ? JSON.parse(p.imagenes) : [];
      const obs = p.observaciones || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.nombre)}</td>
        <td>${escapeHtml(p.apellido)}</td>
        <td>${escapeHtml(p.enfermedad || "")}</td>
        <td>${p.cita || ""}</td>
        <td>${escapeHtml(obs.slice(0,80))}</td>
        <td>
          <button class="btn btn-sm btn-primary me-1" onclick="openEdit(${p.id})">Ver / Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletePaciente(${p.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='6'>Error cargando pacientes</td></tr>";
    console.error(err);
  }
}

// --- ESCAPAR HTML ---
function escapeHtml(s){ if(!s) return ""; return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

// --- ABRIR EDITAR ---
async function openEdit(id) {
  const res = await fetch(`${API_BASE}/usuarios/${id}`);
  const p = await res.json();
  if (!p) return alert("Paciente no encontrado");
  document.getElementById("pacienteId").value = p.id;
  document.getElementById("nombre").value = p.nombre;
  document.getElementById("apellido").value = p.apellido;
  document.getElementById("enfermedad").value = p.enfermedad || "";
  document.getElementById("cita").value = p.cita || "";
  document.getElementById("observaciones").value = p.observaciones || "";
  // preview
  const preview = document.getElementById("previewArea");
  preview.innerHTML = "";
  const imgs = p.imagenes ? JSON.parse(p.imagenes) : [];
  const vids = p.videos ? JSON.parse(p.videos) : [];
  imgs.forEach(u => preview.appendChild(createImgEl(u)));
  vids.forEach(u => preview.appendChild(createVideoEl(u)));
  // show modal
  const modal = new bootstrap.Modal(document.getElementById("addModal"));
  modal.show();
}

// --- CREAR ELEMENTOS PREVIEW ---
function createImgEl(url){
  const img = document.createElement("img");
  img.src = url;
  img.alt = "imagen";
  img.style.maxWidth = "120px";
  return img;
}
function createVideoEl(url){
  const v = document.createElement("video");
  v.src = url;
  v.controls = true;
  v.style.maxWidth = "160px";
  return v;
}

// --- ELIMINAR PACIENTE ---
async function deletePaciente(id){
  if(!confirm("Eliminar paciente?")) return;
  await fetch(`${API_BASE}/usuarios/${id}`, { method: "DELETE" });
  loadPacientes();
}

// --- FORMULARIO AGREGAR/EDITAR ---
if (document.getElementById("addPacienteForm")) {
  const form = document.getElementById("addPacienteForm");
  const imagenesInput = document.getElementById("imagenesInput");
  const videosInput = document.getElementById("videosInput");
  const preview = document.getElementById("previewArea");

  // Preview local files
  imagenesInput.addEventListener("change", () => {
    preview.innerHTML = "";
    Array.from(imagenesInput.files).forEach(f => {
      const url = URL.createObjectURL(f);
      preview.appendChild(createImgEl(url));
    });
  });
  videosInput.addEventListener("change", () => {
    Array.from(videosInput.files).forEach(f => {
      const url = URL.createObjectURL(f);
      preview.appendChild(createVideoEl(url));
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("pacienteId").value;
    const payload = {
      nombre: document.getElementById("nombre").value.trim(),
      apellido: document.getElementById("apellido").value.trim(),
      enfermedad: document.getElementById("enfermedad").value.trim(),
      cita: document.getElementById("cita").value || "",
      observaciones: document.getElementById("observaciones").value || "",
      imagenes: [],
      videos: []
    };

    // Upload files sequentially (could be parallel)
    // Helper to upload a File to /api/upload
    async function uploadFile(file, folder) {
      const fd = new FormData();
      fd.append("file", file, file.name);
      fd.append("folder", folder);
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: fd });
      const j = await res.json();
      if (j && j.url) return j.url;
      throw new Error("Upload failed");
    }

    // Upload images
    for (const f of Array.from(imagenesInput.files)) {
      try {
        const url = await uploadFile(f, "imagenes");
        payload.imagenes.push(url);
      } catch (err) {
        console.error("Error subiendo imagen", err);
      }
    }
    // Upload videos
    for (const f of Array.from(videosInput.files)) {
      try {
        const url = await uploadFile(f, "videos");
        payload.videos.push(url);
      } catch (err) {
        console.error("Error subiendo video", err);
      }
    }

    // Create or update
    if (id) {
      await fetch(`${API_BASE}/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${API_BASE}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    // Close modal and refresh
    const modalEl = document.getElementById("addModal");
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
    form.reset();
    preview.innerHTML = "";
    loadPacientes();
  });
}
