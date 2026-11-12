import { describe, expect, it } from "vitest";
import { validateLead } from "../src/lib/lead-validation";

const valid = {
  name: "  Érica  ",
  phone: "+55 (11) 91234-5678",
  email: "  ERICA@EXAMPLE.COM  ",
  submissionKey: "f157ce37-24a0-43b4-8b5f-9edf785ab679",
};

describe("validateLead", () => {
  it("accepts an accented single name and normalizes contact fields", () => {
    expect(validateLead(valid)).toEqual({
      success: true,
      data: { ...valid, name: "Érica", phone: "+5511912345678", email: "erica@example.com" },
    });
  });

  it.each(["(11) 3456-7890", "551134567890", "+55 11 3456-7890"])("accepts Brazilian landlines: %s", (phone) => {
    const result = validateLead({ ...valid, phone });
    expect(result.success && result.data.phone).toBe("+551134567890");
  });

  it.each([null, [], "invalid", { name: 42 }])("rejects malformed input without throwing", (input) => {
    expect(validateLead(input).success).toBe(false);
  });

  it.each(["", "A", "a".repeat(121), "Ana\nMaria"])("rejects an invalid name", (name) => {
    expect(validateLead({ ...valid, name })).toMatchObject({ success: false, errors: { name: expect.any(String) } });
  });

  it.each(["123", "00000000000", "+1 212 555 1234", "11912345678abc", "(20) 91234-5678", "119123456789"])("rejects an invalid Brazilian telephone", (phone) => {
    expect(validateLead({ ...valid, phone })).toMatchObject({ success: false, errors: { phone: expect.any(String) } });
  });

  it.each(["", "email", "ana@example", "ana@@example.com", "ana @example.com", "a@-example.com", `${"a".repeat(245)}@example.com`])("rejects an invalid email", (email) => {
    expect(validateLead({ ...valid, email })).toMatchObject({ success: false, errors: { email: expect.any(String) } });
  });

  it("requires a UUID submission key", () => {
    expect(validateLead({ ...valid, submissionKey: "not-a-uuid" })).toMatchObject({ success: false, errors: { form: expect.any(String) } });
  });

  it("collects field errors in a single response", () => {
    expect(validateLead({})).toMatchObject({ success: false, errors: { name: expect.any(String), phone: expect.any(String), email: expect.any(String), form: expect.any(String) } });
  });
});
