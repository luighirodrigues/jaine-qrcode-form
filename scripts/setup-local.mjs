import { randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";

const password = randomBytes(24).toString("hex");
const secret = randomBytes(48).toString("hex");
const lines = [
  "POSTGRES_USER=qrcode",
  `POSTGRES_PASSWORD=${password}`,
  "POSTGRES_DB=qrcode",
  "POSTGRES_PORT=5437",
  `DATABASE_URL=postgresql://qrcode:${password}@127.0.0.1:5437/qrcode`,
  `DOCKER_DATABASE_URL=postgresql://qrcode:${password}@db:5432/qrcode`,
  "APP_URL=http://localhost:3000",
  "PDF_PATH=./docs/Guia_MEI_2026.pdf",
  "PDF_DOWNLOAD_NAME=Guia_MEI_2026.pdf",
  `DOWNLOAD_COOKIE_SECRET=${secret}`,
  "",
];

await mkdir("private", { recursive: true });
try {
  await writeFile(".env.local", lines.join("\n"), { flag: "wx", mode: 0o600 });
  console.log("Ambiente local criado com credenciais aleatórias. Valores não exibidos.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.local já existe e foi preservado.");
}
