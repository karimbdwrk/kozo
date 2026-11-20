import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import base from "../../eslint.config.base.mjs";

export default defineConfig([
  ...base,
  expoConfig,
  globalIgnores(["dist/**", ".expo/**", "expo-env.d.ts"]),
]);
