import { execSync } from "child_process";
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
          execSync("npx tsc --project ./tsconfig.build.json --emitDeclarationOnly --declaration");
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
export {
  defineConfig
};
