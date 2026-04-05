import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const packageJsonPath = resolve(root, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const dependencies = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {})
};

const knownPrefixes = [
  "@types/",
  "@radix-ui/",
  "@next/",
  "@eslint/",
  "@tailwindcss/"
];

const knownPackages = new Set([
  "next",
  "react",
  "react-dom",
  "typescript",
  "eslint",
  "eslint-config-next",
  "tailwindcss",
  "postcss",
  "autoprefixer",
  "zod",
  "zustand",
  "gsap",
  "lucide-react",
  "recharts"
]);

const scripts = packageJson.scripts ?? {};
const warnings = [];

if (typeof scripts.postinstall === "string" && scripts.postinstall.trim().length > 0) {
  warnings.push(`postinstall script encontrado: "${scripts.postinstall}"`);
}

Object.keys(dependencies).forEach((name) => {
  const isKnown = knownPackages.has(name) || knownPrefixes.some((prefix) => name.startsWith(prefix));
  if (!isKnown) warnings.push(`dependencia nao mapeada para revisao manual: ${name}`);
});

if (warnings.length === 0) {
  console.log("check:deps sem alertas de risco.");
  process.exit(0);
}

console.log("check:deps encontrou alertas:");
warnings.forEach((warning) => console.log(`- ${warning}`));
process.exit(1);
