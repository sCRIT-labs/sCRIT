import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function getFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== "tests") {
        getFiles(fullPath, fileList);
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Ground Rules - Banned Marketing Buzzwords (sCRIT Credibility Standard)", () => {
  const dirs = [path.resolve(__dirname, "../app"), path.resolve(__dirname, "../components")];
  const allFiles = dirs.flatMap((d) => getFiles(d));

  it("found files to check in app/ and components/", () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });

  it("must not contain 'audited' (case-insensitive)", () => {
    const violations: { file: string; line: number; text: string }[] = [];
    const pattern = /\baudited\b/i;

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(
      violations,
      `Found banned word "audited" in:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });

  it("must not contain 'backed' (case-insensitive)", () => {
    const violations: { file: string; line: number; text: string }[] = [];
    const pattern = /\bbacked\b/i;

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(
      violations,
      `Found banned word "backed" in:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });

  it("must not contain 'verified custody' (case-insensitive)", () => {
    const violations: { file: string; line: number; text: string }[] = [];
    const pattern = /verified custody/i;

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(
      violations,
      `Found banned phrase "verified custody" in:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });

  it("must not contain 'assay verified' (case-insensitive)", () => {
    const violations: { file: string; line: number; text: string }[] = [];
    const pattern = /assay verified/i;

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(
      violations,
      `Found banned phrase "Assay Verified" in:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });

  it("must not contain 'guaranteed' (case-insensitive)", () => {
    const violations: { file: string; line: number; text: string }[] = [];
    const pattern = /\bguaranteed\b/i;

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          violations.push({
            file: path.relative(process.cwd(), filePath),
            line: index + 1,
            text: line.trim(),
          });
        }
      });
    }

    expect(
      violations,
      `Found banned word "guaranteed" in:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });

  it("must only use 'peg' in explicit disclaimer contexts (e.g., 'not pegged', 'no peg')", () => {
    const violations: { file: string; line: number; text: string }[] = [];
    const pattern = /\bpeg(ged|s)?\b/i;
    // Allowed patterns: "no peg", "not pegged", "not a ... peg", "zero ... peg", "never pegged", "non-pegged", questions like "is sCRIT pegged", or programmatic checks
    const allowedContext = /(no peg|not pegged|not an? .*peg|zero .*peg|no .*peg|never pegged|non-pegged|unpegged|why nav is not a peg|disclaimer.*peg|policy.*peg|is .*pegged|peg & (physical )?redemption|q\.includes\(["']peg["']\))/i;

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          if (!allowedContext.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              line: index + 1,
              text: line.trim(),
            });
          }
        }
      });
    }

    expect(
      violations,
      `Found unexempted 'peg' reference in:\n${violations
        .map((v) => `${v.file}:${v.line} -> ${v.text}`)
        .join("\n")}`
    ).toHaveLength(0);
  });
});
