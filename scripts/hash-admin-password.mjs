import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const terminal = createInterface({ input: stdin, output: stdout });
const password = await terminal.question("Administrator password (input is visible): ");
terminal.close();
if (password.length < 14) throw new Error("Use an administrator password of at least 14 characters.");
const iterations = 210000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
console.log(`pbkdf2$${iterations}$${salt.toString("hex")}$${hash.toString("hex")}`);
