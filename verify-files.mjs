import { existsSync } from "node:fs";

const required = [
  "index.html",
  "main.js",
  "styles.css",
  "netlify.toml",
  "netlify/functions/state.mts",
  "netlify/database/migrations/20260819143000_create-personal-pro-manager-state/migration.sql"
];

const missing = required.filter((file) => !existsSync(file));

if (missing.length) {
  console.error("\nBUILD BLOQUEADO: arquivos obrigatórios ausentes:");
  for (const file of missing) console.error(` - ${file}`);
  console.error("\nMantenha as pastas netlify/functions e netlify/database no repositório.");
  process.exit(1);
}

console.log("Estrutura do Personal Pro Manager validada.");
