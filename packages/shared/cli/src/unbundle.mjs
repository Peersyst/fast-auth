/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const argPath = process.argv[2] || process.cwd();

// Read package.json
const packageJsonPath = path.join(argPath, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

console.log(`🔄 Unbundling package: ${packageJson.name}`);

// Check if exports field exists
if (packageJson.exports) {
    // Iterate through all export entries
    for (const [key, value] of Object.entries(packageJson.exports)) {
        if (typeof value === "object") {
            // If the value is an object, it was likely modified by bundle.mjs
            // We'll use the 'types' field to reconstruct the original path
            const typesPath = value.types;
            if (typesPath && typesPath.startsWith("./dist/")) {
                const originalPath = typesPath.replace("./dist/", "./src/").replace(/\.d\.ts$/, ".ts");
                packageJson.exports[key] = originalPath;
            }
        } else if (typeof value === "string" && value.startsWith("./dist/")) {
            // If the value is a string starting with ./dist/, revert it to ./src/
            packageJson.exports[key] = value.replace("./dist/", "./src/");
        }
    }

    // Write the updated package.json back to file
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`✅ Unbundled package ${packageJson.name}`);
} else {
    console.log(`❌ Could not unbundle ${packageJson.name}. No exports field found in package.json.`);
}
