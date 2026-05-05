
export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const { user, pass } = body;

  const result = await env.DB.prepare(
    "SELECT * FROM usuarios WHERE username = ? AND password = ?"
  )
  .bind(user, pass)
  .first();

  if(result){
    return Response.json({ success: true });
  }

  return Response.json({ success: false });
}
