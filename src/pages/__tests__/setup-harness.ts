import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { compileScript, compileTemplate, parse } from "vue/compiler-sfc";
import * as Vue from "vue";

/** Execute the compiled component setup with captured Uni-app lifecycle hooks. */
export function loadSetup(relativePath: string, modules: Record<string, unknown>, props = {}) {
  const hooks: Record<string, Array<(...args: any[]) => any>> = {};
  const register = (name: string) => (callback: (...args: any[]) => any) => {
    (hooks[name] ||= []).push(callback);
  };
  const source = readFileSync(resolve(__dirname, "../../..", relativePath), "utf8");
  const { descriptor } = parse(source);
  const compiled = compileScript(descriptor, { id: relativePath });
  const code = ts.transpileModule(compiled.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const result = { exports: {} as any };
  const vue = {
    ...Vue,
    onMounted: register("mounted"),
    onBeforeUnmount: register("unmount"),
    onUnmounted: register("unmount"),
  };
  const uniHooks = Object.fromEntries(
    ["onShow", "onHide", "onLoad", "onPullDownRefresh", "onUnload"].map((name) => [
      name,
      register(name),
    ]),
  );
  const requireModule = (name: string) => {
    if (name === "vue") return vue;
    if (name === "@dcloudio/uni-app") return uniHooks;
    if (Object.hasOwn(modules, name)) return modules[name];
    if (name.endsWith(".vue")) return { default: {} };
    throw new Error(`Missing test module: ${name}`);
  };
  new Function("require", "module", "exports", code)(requireModule, result, result.exports);
  const state = result.exports.default.setup(Vue.reactive(props), {
    expose: () => {},
    emit: () => {},
  });
  const template = compileTemplate({
    source: descriptor.template?.content || "",
    filename: relativePath,
    id: relativePath,
    compilerOptions: { mode: "function", prefixIdentifiers: false },
  });
  const renderCode = ts.transpileModule(template.code, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const render = new Function("Vue", renderCode)({
    ...Vue,
    resolveComponent: (name: string) => name,
  });
  return {
    state,
    hooks,
    async fire(name: string, ...args: any[]) {
      await Promise.all((hooks[name] || []).map((callback) => callback(...args)));
      await Vue.nextTick();
    },
    render: () => render.call(Vue.proxyRefs(state), Vue.proxyRefs(state), []),
  };
}

export function nodeText(node: any): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  return nodeText(node.children);
}
