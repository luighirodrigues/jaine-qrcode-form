import { test, expect, type Locator } from "@playwright/test";
import jsQR from "jsqr";
import { PNG } from "pngjs";

async function readQrCode(qr: Locator): Promise<string | undefined> {
  const png = PNG.sync.read(await qr.screenshot({ scale: "css", caret: "initial" }));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: "dontInvert" })?.data;
}

test("mostra QR legível da raiz do site e volta ao formulário sem perder dados", async ({ page, baseURL }) => {
  let submissions = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/cadastros" && request.method() === "POST") submissions++;
  });
  await page.goto("/?utm_source=tablet");
  await page.getByLabel("Nome", { exact: true }).fill("Nome preservado");
  const trigger = page.getByRole("button", { name: "Mostrar QR Code do site", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Acesse o Guia MEI 2026" });
  await expect(dialog).toBeVisible();
  const qr = dialog.getByRole("img", { name: "QR Code para acessar o site", exact: true });
  await expect(qr).toBeVisible();
  expect(await readQrCode(qr)).toBe(new URL("/", baseURL!).href);
  await expect(dialog.getByRole("button", { name: "Fechar QR Code", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Nome preservado");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await trigger.click();
  await dialog.getByRole("button", { name: "Fechar QR Code", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(submissions).toBe(0);
});

test("QR gigante permanece legível ao girar o tablet com o painel aberto", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mostrar QR Code do site", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Acesse o Guia MEI 2026" });
  const qr = dialog.getByRole("img", { name: "QR Code para acessar o site", exact: true });
  for (const size of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    await expect(qr).toBeVisible();
    const box = (await qr.boundingBox())!;
    expect(Math.abs(box.width - box.height)).toBeLessThan(2);
    expect(box.width).toBeGreaterThan(Math.min(size.width, size.height) * 0.78);
    expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - size.height / 2)).toBeLessThan(50);
    const fits = await dialog.evaluate((element) => element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1);
    expect(fits).toBe(true);
    expect(await readQrCode(qr)).toBe(new URL("/", baseURL!).href);
  }
});

test("painel e botão de fechar cabem em uma tela baixa deitada", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mostrar QR Code do site", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Acesse o Guia MEI 2026" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Fechar QR Code", exact: true });
  await expect(close).toBeInViewport();
  const qr = dialog.getByRole("img", { name: "QR Code para acessar o site", exact: true });
  expect((await qr.boundingBox())!.height).toBeGreaterThan(230);
  expect(await dialog.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  await close.click();
  await expect(dialog).not.toBeVisible();
});
