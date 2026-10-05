import test from "node:test";
import assert from "node:assert/strict";
import { isValidAuthId, createAuthId } from "../src/authId.js";

test("keeps a real randomUUID value", () => {
  for (let i = 0; i < 20; i += 1) {
    const id = crypto.randomUUID();
    assert.equal(isValidAuthId(id), true, `rejected ${id}`);
  }
});

test("keeps the no-randomUUID fallback shape", () => {
  assert.equal(isValidAuthId("1767158400000-a3f9c1b2"), true);
});

test("rejects junk so a broken value gets reissued", () => {
  assert.equal(isValidAuthId(""), false);
  assert.equal(isValidAuthId(null), false);
  assert.equal(isValidAuthId("undefined"), false);
  assert.equal(isValidAuthId("3f2b1a7c-4d5e-4f6a-b8c9-01234"), false);
});

test("createAuthId returns a value it accepts itself", () => {
  assert.equal(isValidAuthId(createAuthId()), true);
});
