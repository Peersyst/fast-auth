const path = require("path");
const nodeExternals = require("webpack-node-externals");

// For `pnpm start`, like the console: @backend/config exports TypeScript sources, so it is bundled.
module.exports = {
    entry: "./src/main.ts",
    target: "node",
    output: { path: path.resolve(__dirname, "dist"), filename: "[name].js" },
    resolve: { extensions: [".ts", ".js"] },
    externals: [nodeExternals({ allowlist: [/@backend/] })],
    module: { rules: [{ test: /\.ts$/, loader: "ts-loader", exclude: /node_modules/ }] },
};
