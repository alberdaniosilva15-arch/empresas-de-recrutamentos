
const requiredVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const status: any = {};

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (!value) {
    status[varName] = "❌ ausente";
  } else {
    let detail = "✅ definido";
    if (varName === "FIREBASE_CLIENT_EMAIL" && !value.includes("@")) {
      detail = "❌ inválido (faltando @)";
    } else if (varName === "FIREBASE_PRIVATE_KEY") {
      if (!value.includes("BEGIN PRIVATE KEY") || !value.includes("END PRIVATE KEY")) {
        detail = "❌ inválido (faltando BEGIN/END)";
      } else if (!value.includes("\\n")) {
        detail = "⚠️ definido (sem \\n escapado)";
      }
    }
    status[varName] = detail;
  }
}

console.log(JSON.stringify(status, null, 2));
