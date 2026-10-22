import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileStyle, parse } from "vue/compiler-sfc";
import { describe, expect, it } from "vitest";

describe("WeChat component stylesheet selectors", () => {
  for (const name of ["Recode", "Recoding", "PictureSelect", "Submit"]) {
    it(`${name} compiles without tag, id or attribute selectors`, () => {
      const filename = resolve(__dirname, `../${name}.vue`);
      const descriptor = parse(readFileSync(filename, "utf8")).descriptor;
      for (const style of descriptor.styles) {
        const compiled = compileStyle({
          source: style.content,
          filename,
          id: "test",
          preprocessLang: "scss",
        });
        expect(compiled.errors).toEqual([]);
        const invalid: string[] = [];
        (compiled.rawResult as any).result.root.walkRules((rule: any) => {
          if (rule.parent.type === "atrule" && rule.parent.name.endsWith("keyframes")) return;
          if (/\[|#[\w-]+|(^|[\s>+~,])[a-zA-Z][\w-]*/.test(rule.selector))
            invalid.push(rule.selector);
        });
        expect(invalid).toEqual([]);
      }
    });
  }
});
