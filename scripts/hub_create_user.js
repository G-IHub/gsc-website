// Creates (or resets) a Research Hub account straight in the database. Use it once to make the first
// management account; after that, people are added from the hub itself.
//
//   DATABASE_URL="postgres://..." node scripts/hub_create_user.js you@example.org "Your Name" management
//
// Roles: management, finance, director, lead, member, coordinator. A one-time password is printed once.
import { neon } from "@neondatabase/serverless";
import { ROLES, hashPassword, newTempPassword } from "../api/_hub_core.js";
import { ensureSchema, makeStore } from "../api/_hub_store.js";

const [email, name, role] = process.argv.slice(2);
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url || !email || !name || !ROLES.includes(role)) {
  console.error('Usage: DATABASE_URL=... node scripts/hub_create_user.js <email> "<name>" <role>\nRoles: ' + ROLES.join(", "));
  process.exit(1);
}
const sql = neon(url);
await ensureSchema(sql);
const store = makeStore(sql);
const temp = newTempPassword();
const existing = await store.getUserByEmail(email.toLowerCase());
if (existing) {
  await store.updateUser(existing.id, { password_hash: hashPassword(temp), role, active: true });
  console.log(`Reset ${email} (${role}).`);
} else {
  await store.createUser({ email: email.toLowerCase(), name, role, unit: "", password_hash: hashPassword(temp) });
  console.log(`Created ${email} (${role}).`);
}
console.log(`One-time password (shown once, change it after signing in): ${temp}`);
