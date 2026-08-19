import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function validState(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default async (req: Request, _context: Context) => {
  try {
    const user = await getUser();
    if (!user?.id) return response({ ok: false, error: "Não autenticado." }, 401);

    const db = getDatabase();

    if (req.method === "GET") {
      const rows = await db.sql`
        SELECT state, updated_at
        FROM personal_pro_manager_state
        WHERE user_id = ${user.id}
        LIMIT 1
      `;
      return response({
        ok: true,
        state: rows[0]?.state ?? null,
        updatedAt: rows[0]?.updated_at ?? null
      });
    }

    if (req.method === "PUT") {
      const raw = await req.text();
      if (raw.length > 700_000) {
        return response({ ok: false, error: "Dados muito grandes." }, 413);
      }

      let payload: unknown;
      try {
        payload = JSON.parse(raw || "{}");
      } catch {
        return response({ ok: false, error: "JSON inválido." }, 400);
      }

      const state =
        validState(payload) && validState((payload as Record<string, unknown>).state)
          ? (payload as { state: Record<string, unknown> }).state
          : null;

      if (!state) return response({ ok: false, error: "Estado inválido." }, 400);

      const serialized = JSON.stringify(state);

      await db.sql`
        INSERT INTO personal_pro_manager_state (user_id, state, created_at, updated_at)
        VALUES (${user.id}, ${serialized}::jsonb, NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
      `;

      return response({ ok: true });
    }

    if (req.method === "DELETE") {
      await db.sql`
        DELETE FROM personal_pro_manager_state
        WHERE user_id = ${user.id}
      `;
      return response({ ok: true, accountPreserved: true });
    }

    return response({ ok: false, error: "Método não permitido." }, 405);
  } catch (error) {
    console.error("state", error);
    return response({ ok: false, error: "Erro ao acessar os dados da conta." }, 500);
  }
};

export const config: Config = {
  path: "/api/state"
};
