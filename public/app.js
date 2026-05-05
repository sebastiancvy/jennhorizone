
const form = document.getElementById("formPaciente");
const lista = document.getElementById("lista");

// Guardar paciente
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nombre: nombre.value,
    apellido: apellido.value,
    telefono: telefono.value,
    enfermedad: enfermedad.value,
    observaciones: obs.value,
    proxima_cita: cita.value
  };

  await fetch("/api/pacientes", {
    method: "POST",
    body: JSON.stringify(data)
  });

  form.reset();
  cargarPacientes();
});

// Cargar pacientes
async function cargarPacientes() {
  const res = await fetch("/api/pacientes");
  const pacientes = await res.json();

  lista.innerHTML = "";

  pacientes.forEach(p => {
    const li = document.createElement("li");
    li.innerText = `${p.nombre} ${p.apellido} - ${p.enfermedad}`;
    lista.appendChild(li);
  });
}

cargarPacientes();
