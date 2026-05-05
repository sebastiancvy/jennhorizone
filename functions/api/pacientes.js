export async function onRequestPost(context) {
  const { request, env } = context;
  const data = await request.json();

  const { nombre, apellido, telefono, enfermedad, observaciones, proxima_cita } = data;

  await env.DB.prepare(`
    INSERT INTO pacientes 
    (nombre, apellido, telefono, enfermedad, observaciones, proxima_cita)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  .bind(nombre, apellido, telefono, enfermedad, observaciones, proxima_cita)
  .run();

  return Response.json({ success: true });
}

// Obtener pacientes
export async function onRequestGet(context) {
  const { env } = context;

  const pacientes = await env.DB.prepare(
    "SELECT * FROM pacientes ORDER BY id DESC"
  ).all();

  return Response.json(pacientes.results);
}
