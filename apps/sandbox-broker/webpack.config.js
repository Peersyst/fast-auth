const path = require("path");
const nodeExternals = require("webpack-node-externals");

// Used by `pnpm start`. Workspace packages export their TypeScript sources, so they are bundled; the Docker image
// runs the `nest build` output instead, once the base image has bundled them.
module.exports = {
    entry: "./src/main.ts",
    target: "node",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
    },
    externals: [nodeExternals({ allowlist: [/@backend/] })],
    module: {
        rules: [{ test: /\.ts$/, loader: "ts-loader", exclude: /node_modules/ }],
    },
};
