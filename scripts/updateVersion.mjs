import fs from "fs/promises";
import path from "path";

const pkgPath = path.resolve(process.cwd(), "package.json");

const [, , newVersion] = process.argv;

if (!newVersion) {
  console.error("Usage: node updateVersion.mjs <version|major|minor|patch>");
  process.exit(1);
}

function incVersion(version, type) {
  let [major, minor, patch] = version.split(".").map(Number);
  switch (type) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
      patch += 1;
      break;
    default:
      return type; // explicit version
  }
  return [major, minor, patch].join(".");
}

const main = async () => {
  const pkgRaw = await fs.readFile(pkgPath, "utf8");
  const pkg = JSON.parse(pkgRaw);

  let finalVersion = incVersion(pkg.version, newVersion);

  pkg.version = finalVersion;

  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`Updated version to ${finalVersion}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
