import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { parse } from "vue/compiler-sfc";

const root = resolve(__dirname, "../../..");
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");
const userPage = parse(readSource("src/pages/user/index.vue")).descriptor;
const devicesPage = parse(readSource("src/pages/admin/index.vue")).descriptor;
const parsedRoutes = ts.parseConfigFileTextToJson("pages.json", readSource("src/pages.json"));
const routes = parsedRoutes.config as {
  pages: { path: string; style: { navigationBarTitleText: string } }[];
};

// Route/source contracts protect Uni-app's packaged surface without a browser runtime.
describe("WeChat device access UI", () => {
  it("does not register the legacy root administration page", () => {
    expect(parsedRoutes.error).toBeUndefined();
    expect(routes.pages.map((page) => page.path)).not.toContain("pages/root/index");
  });

  it("never presents root or administrator entry points on the user page", () => {
    expect(userPage.template?.content).not.toMatch(
      /根用户管理控制|进入管理后台|gotoRoot|isRoot|isAdmin/,
    );
    expect(userPage.scriptSetup?.content).not.toMatch(/pages\/root\/index|gotoRoot|isRoot|isAdmin/);
  });

  it("offers associated devices without a WeChat role restriction", () => {
    expect(userPage.template?.content).toContain("我的关联设备");
    expect(userPage.template?.content).toMatch(/@tap="gotoMyDevices"/);
    expect(userPage.scriptSetup?.content).not.toMatch(/\.role|["']root["']|["']manager["']/);
  });

  it("describes only associated devices and does not display a global role", () => {
    expect(devicesPage.template?.content).toContain("我的关联设备");
    expect(devicesPage.template?.content).toContain("仅显示当前微信账号关联的设备");
    expect(devicesPage.template?.content).not.toMatch(/管理后台|角色|user\?\.role/);
    expect(
      routes.pages.find((page) => page.path === "pages/admin/index")?.style.navigationBarTitleText,
    ).toBe("我的关联设备");
  });

  it("packages no page with global assignment or device deletion actions", () => {
    for (const page of routes.pages) {
      const source = readSource(`src/${page.path}.vue`);
      expect(source, page.path).not.toMatch(
        /(?:unassign|assign|deleteDevice)\s*\(|@\/api\/root|pages\/root\/index/,
      );
      expect(parse(source).descriptor.template?.content, page.path).not.toMatch(
        /删除设备|指定管理员/,
      );
    }
  });
});
