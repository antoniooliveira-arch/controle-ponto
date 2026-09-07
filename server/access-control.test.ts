import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function userContext(): TrpcContext {
  return {
    user: { id: 42, openId: "servidor-comum", name: "Servidor", email: "servidor@exemplo.gov.br", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("proteção das rotas administrativas", () => {
  it("recusa uma consulta administrativa efetuada por conta sem papel admin", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.admin.employees()).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
  });
});
