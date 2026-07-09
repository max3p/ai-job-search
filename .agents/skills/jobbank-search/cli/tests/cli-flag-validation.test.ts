import { describe, expect, test } from "bun:test"
import { runCLI } from "./helpers.js"

/** Every failure path must write JSON to stderr, leave stdout empty, and exit 1. */
async function expectError(args: string[], code: string): Promise<void> {
  const r = await runCLI(args)
  expect(r.exitCode).toBe(1)
  expect(r.stdout).toBe("")
  const err = JSON.parse(r.stderr) as { error: string; code: string }
  expect(err.code).toBe(code)
  expect(err.error.length).toBeGreaterThan(0)
}

describe("cli argument validation", () => {
  test("unknown command", async () => {
    await expectError(["frobnicate"], "BAD_CMD")
  })

  test("detail without an id", async () => {
    await expectError(["detail"], "NO_ID")
  })

  test("detail with an unparseable id", async () => {
    await expectError(["detail", "not-an-id"], "BAD_ID")
  })

  test("non-numeric --page", async () => {
    await expectError(["search", "-q", "x", "--page", "abc"], "BAD_ARG")
  })

  test("non-numeric --jobage", async () => {
    await expectError(["search", "-q", "x", "--jobage", "soon"], "BAD_ARG")
  })

  test("invalid --remote", async () => {
    await expectError(["search", "-q", "x", "--remote", "underwater"], "BAD_ARG")
  })

  test("invalid --sort", async () => {
    await expectError(["search", "-q", "x", "--sort", "salary"], "BAD_ARG")
  })

  test("invalid --lang", async () => {
    await expectError(["search", "-q", "x", "--lang", "de"], "BAD_ARG")
  })

  test("a location that matches no Canadian place", async () => {
    await expectError(["search", "-q", "x", "-l", "Ouagadougou"], "LOCATION_NOT_FOUND")
  })

  test("--help exits 0 and prints usage to stdout", async () => {
    const r = await runCLI(["search", "--help"])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain("USAGE")
    expect(r.stderr).toBe("")
  })

  test("bare invocation prints usage and exits 1", async () => {
    const r = await runCLI([])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain("USAGE")
  })
})
