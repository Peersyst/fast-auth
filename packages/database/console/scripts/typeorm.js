const { execSync } = require("child_process");

const args = process.argv.slice(2);

execSync(`pnpm run build`);
execSync(`typeorm-ts-node-commonjs -d ./dist/data-source.js ${args.join(" ")}`, { stdio: "inherit" });
execSync(`rimraf dist`);
