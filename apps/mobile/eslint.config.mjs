import { defineConfig, globalIgnores } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import base from "../../eslint.config.base.mjs";

export default defineConfig([
  ...base,
  expoConfig,
  {
    // CommonJS config files (Metro, Babel) legitimately use require().
    files: ["*.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores(["dist/**", ".expo/**", "expo-env.d.ts"]),
]);
