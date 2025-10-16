"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var src_exports = {};
__export(src_exports, {
  defineConfig: () => defineConfig
});
module.exports = __toCommonJS(src_exports);
var import_child_process = require("child_process");
function defineConfig({ dts = false, onSuccess, ...restOptions }) {
  return {
    ...restOptions,
    dts: false,
    splitting: false,
    bundle: false,
    clean: true,
    async onSuccess() {
      if (dts) {
        console.log("\x1B[34m%s\x1B[0m", "TSC", "Building declaration files...");
        try {
          (0, import_child_process.execSync)("npx tsc --project ./tsconfig.build.json --emitDeclarationOnly --declaration");
        } catch (e) {
          console.error("\x1B[31m%s\x1B[0m", "TSC", e.stdout.toString());
          process.exit(1);
        }
        console.log("\x1B[34m%s\x1B[0m", "TSC", "\u26A1\uFE0F Build success");
      }
      return onSuccess?.();
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineConfig
});
