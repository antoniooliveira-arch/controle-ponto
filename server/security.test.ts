import { describe, expect, it } from "vitest";
import { hashPassword, hashSessionToken, LOGIN_LOCK_MS, MAX_LOGIN_FAILURES, nextFailedLoginState, verifyPassword } from "./security";

describe("proteção de credenciais de servidor", () => {
  it("deriva a senha com sal e nunca a mantém em texto aberto", async () => {
    const password = "SenhaSegura!2026";
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(hash.split(":")).toHaveLength(2);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", hash)).resolves.toBe(false);
  });

  it("armazena somente o resumo criptográfico de uma sessão", () => {
    const token = "sessao-ultrassecreta";
    const digest = hashSessionToken(token);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain(token);
    expect(hashSessionToken("outro-token")).not.toBe(digest);
  });

  it("bloqueia o acesso ao atingir o limite de falhas", () => {
    const now = new Date("2026-09-07T12:00:00.000Z");
    expect(nextFailedLoginState(MAX_LOGIN_FAILURES - 2, now)).toEqual({ passwordFailures: MAX_LOGIN_FAILURES - 1, lockedUntil: null });
    expect(nextFailedLoginState(MAX_LOGIN_FAILURES - 1, now)).toEqual({ passwordFailures: 0, lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MS) });
  });
});
