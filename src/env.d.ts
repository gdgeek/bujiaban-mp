/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated canonical HTTPS origins permitted for admin scan login. */
  readonly VITE_ADMIN_LOGIN_ORIGINS?: string;
}

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
