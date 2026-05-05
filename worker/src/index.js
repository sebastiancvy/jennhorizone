
// worker/src/index.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Helper: JSON response
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    // Root health
    if (path === "/api/health") return json({ ok: true, env: env.ENV_NAME || null });

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
      });
    }

    // GET /api/usuarios
    if (path === "/api/usuarios" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM usuarios ORDER BY creado_en DESC").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // GET /api/usuarios/:id
    if (path.startsWith("/api/usuarios/") && method === "GET") {
      const id = path.split("/").pop();
      const { results } = await env.DB.prepare("SELECT * FROM usuarios WHERE id = ?").bind(id).all();
      return json(results[0] || null);
    }

    // POST /api/usuarios  -> crear paciente
    if (path === "/api/usuarios" && method === "POST") {
      const data = await request.json();
      const imagenes = JSON.stringify(data.imagenes || []);
      const videos = JSON.stringify(data.videos || []);
      const stmt = env.DB.prepare(
        "INSERT INTO usuarios (nombre, apellido, enfermedad, cita, observaciones, imagenes, videos) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      const res = await stmt.bind(data.nombre, data.apellido, data.enfermedad || "", data.cita || "", data.observaciones || "", imagenes, videos).run();
      return json({ success: true, id: res.lastRowId });
    }

    // PUT /api/usuarios/:id -> actualizar
    if (path.startsWith("/api/usuarios/") && method === "PUT") {
      const id = path.split("/").pop();
      const data = await request.json();
      const imagenes = JSON.stringify(data.imagenes || []);
      const videos = JSON.stringify(data.videos || []);
      await env.DB.prepare(
        "UPDATE usuarios SET nombre=?, apellido=?, enfermedad=?, cita=?, observaciones=?, imagenes=?, videos=? WHERE id=?"
      ).bind(data.nombre, data.apellido, data.enfermedad || "", data.cita || "", data.observaciones || "", imagenes, videos, id).run();
      return json({ success: true });
    }

    // DELETE /api/usuarios/:id
    if (path.startsWith("/api/usuarios/") && method === "DELETE") {
      const id = path.split("/").pop();
      await env.DB.prepare("DELETE FROM usuarios WHERE id = ?").bind(id).run();
      return json({ success: true });
    }

    // POST /api/upload -> subir archivo a R2 (form-data)
    if (path === "/api/upload" && method === "POST") {
      // Expect multipart/form-data with field 'file' and optional 'folder'
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return json({ error: "Content-Type must be multipart/form-data" }, 400);
      }

      // Use the built-in formData() in Workers
      const form = await request.formData();
      const file = form.get("file");
      const folder = form.get("folder") || "uploads";

      if (!file || !file.name) return json({ error: "No file provided" }, 400);

      // Generate unique key
      const ext = file.name.split(".").pop();
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      // Put to R2
      await env.R2_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });

      // Build public URL (if you configure a public bucket or use a Worker to serve)
      // We'll return a URL that points to a Worker route that serves R2 objects.
      const publicUrl = `${new URL(request.url).origin}/r2/${key}`;

      return json({ success: true, url: publicUrl });
    }

    // Serve R2 object at /r2/<key>
    if (path.startsWith("/r2/") && method === "GET") {
      const key = decodeURIComponent(path.replace("/r2/", ""));
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      if (obj.httpMetadata && obj.httpMetadata.contentType) headers.set("Content-Type", obj.httpMetadata.contentType);
      headers.set("Cache-Control", "public, max-age=31536000");
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(obj.body, { headers });
    }

    return new Response("Not found", { status: 404 });
  },
};
