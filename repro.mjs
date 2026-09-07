import "dotenv/config";
import { createApp } from "./server/_core/app.ts";

const app = createApp();
const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);
  try {
    const r = await fetch(`http://localhost:${port}/api/trpc/employee.listForLogin`);
    console.log("status:", r.status);
    console.log("body:", await r.text());
  } catch (e) { console.error("repro error:", e); }
  server.close();
});
