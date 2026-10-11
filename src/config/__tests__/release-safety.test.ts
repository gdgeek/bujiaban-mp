import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const root = resolve(__dirname, "../../..");
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("mini program release defaults", () => {
  it("enables URL validation in the manifest and the project config actually copied by Uni-app", () => {
    const manifest = ts.parseConfigFileTextToJson("manifest.json", readSource("src/manifest.json"));
    const project = JSON.parse(readSource("src/project.config.json"));
    expect(manifest.error).toBeUndefined();
    expect(manifest.config["mp-weixin"].setting.urlCheck).toBe(true);
    expect(project.setting.urlCheck).toBe(true);
  });

  it("uses the supported artifact action in the main branch CI workflow", () => {
    const workflow = readSource(".github/workflows/ci.yml");
    expect(workflow).not.toContain("actions/upload-artifact@v3");
    expect(workflow).toContain("actions/upload-artifact@v4");
  });
});
