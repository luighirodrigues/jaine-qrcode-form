import { test, expect } from "@playwright/test";
import pg from "pg";

const submittedKeys = new Set<string>();
test.beforeEach(async ({ page }) => {
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/cadastros" && request.method() === "POST") {
      const key = request.postDataJSON()?.submissionKey;
      if (typeof key === "string") submittedKeys.add(key);
    }
  });
});

test.afterAll(async () => {
  if (!submittedKeys.size) return;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query("DELETE FROM leads WHERE submission_key = ANY($1::uuid[]) AND email = ANY($2::text[])",
      [[...submittedKeys], ["fluxo.e2e@example.com", "rede.e2e@example.com"]]);
  } finally { await client.end(); }
});

test("cadastro no celular libera o botão e entrega um PDF", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Seu material está a um passo." })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Pessoa Teste E2E");
  await page.getByLabel("Telefone", { exact: true }).fill("(51) 99999-1234");
  await page.getByLabel("E-mail", { exact: true }).fill("fluxo.e2e@example.com");
  await page.getByRole("button", { name: "Liberar meu PDF" }).click();
  await expect(page).toHaveURL(/\/obrigado$/);
  await expect(page.getByRole("heading", { name: "Tudo pronto! Seu PDF está liberado." })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Baixar PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await download.failure()).toBeNull();
});

test("erro de rede mantém os campos e reutiliza a chave na tentativa seguinte", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nome", { exact: true }).fill("Pessoa Rede E2E");
  await page.getByLabel("Telefone", { exact: true }).fill("51987654321");
  await page.getByLabel("E-mail", { exact: true }).fill("rede.e2e@example.com");
  const keys: string[] = [];
  await page.route("**/api/cadastros", async (route) => {
    keys.push(route.request().postDataJSON().submissionKey);
    if (keys.length === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.getByRole("button", { name: "Liberar meu PDF" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("conexão");
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Pessoa Rede E2E");
  await page.getByRole("button", { name: "Liberar meu PDF" }).click();
  await expect(page).toHaveURL(/\/obrigado$/);
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
});

test("orienta o preenchimento e não envia dados inválidos", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Liberar meu PDF" }).click();
  await expect(page.getByLabel("Nome", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page).not.toHaveURL(/\/obrigado/);
});

test("telefone aceita colagem com +55 e mantém prefixo internacional inválido para correção", async ({ page }) => {
  await page.goto("/");
  const phone = page.getByLabel("Telefone", { exact: true });
  await phone.fill("+55 (51) 99876-5432");
  await page.getByLabel("E-mail", { exact: true }).focus();
  await expect(phone).toHaveValue("(51) 99876-5432");
  await phone.fill("+5 1999999999");
  await page.getByLabel("E-mail", { exact: true }).focus();
  await expect(phone).toHaveValue("+5 1999999999");
});

for (const width of [320, 375, 390, 430, 1280]) {
  test(`layout sem rolagem horizontal em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Liberar meu PDF" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}
