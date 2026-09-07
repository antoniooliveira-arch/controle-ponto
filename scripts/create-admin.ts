import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/security";

const LOGIN_FIELD = "administrador@sme.gov.br";

function generatePassword(): string {
  return `Sme@${randomBytes(9).toString("base64url")}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não encontrada. Configure no .env.");
  }

  const login = (process.env.ADMIN_LOGIN ?? LOGIN_FIELD).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? generatePassword();
  if (password.length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool);
  const passwordHash = await hashPassword(password);

  const existing = (
    await db
      .select()
      .from(users)
      .where(and(eq(users.email, login), eq(users.role, "admin")))
      .limit(1)
  )[0];

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, passwordFailures: 0, lockedUntil: null, role: "admin", name: "Administrador", updatedAt: new Date() })
      .where(eq(users.id, existing.id));
    console.log(`[admin] Credenciais atualizadas para o usuário existente #${existing.id}`);
  } else {
    await db.insert(users).values({
      openId: "sme-admin",
      name: "Administrador",
      email: login,
      loginMethod: "sistema",
      role: "admin",
      passwordHash,
    });
    console.log(`[admin] Usuário administrador criado`);
  }

  await pool.end();
  console.log("");
  console.log("Credenciais de acesso administrativo:");
  console.log(`  Usuário: ${login}`);
  console.log(`  Senha:   ${password}`);
  console.log("");
  console.log("Guarde a senha em local seguro. Ela é armazenada apenas como hash no banco.");
}

main().catch(error => {
  console.error("[admin] Falha ao criar o administrador:", error);
  process.exit(1);
});