import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { format, resolveConfig } from "prettier"

const root = fileURLToPath(new URL("../", import.meta.url))
const cli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url)
)

function runSupabase(args) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
}

try {
  switch (process.argv[2]) {
    case "env": {
      const status = JSON.parse(runSupabase(["status", "-o", "json"]))
      const url = new URL(status.API_URL)
      const key = status.PUBLISHABLE_KEY || status.ANON_KEY

      if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !key) {
        throw new Error("Expected a local API URL and a public client key.")
      }

      const file = new URL("../.env.development.local", import.meta.url)
      let contents = existsSync(file) ? readFileSync(file, "utf8") : ""
      for (const [name, value] of Object.entries({
        NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      })) {
        const line = `${name}=${JSON.stringify(value)}`
        const pattern = new RegExp(`^${name}=.*$`, "gm")
        contents = pattern.test(contents)
          ? contents.replace(pattern, () => line)
          : `${contents}${contents && !contents.endsWith("\n") ? "\n" : ""}${line}\n`
      }
      writeFileSync(file, contents, { mode: 0o600 })
      console.log(
        "Updated .env.development.local with local Supabase public values. Restart Next.js to use them."
      )
      break
    }
    case "types": {
      const types = runSupabase(["gen", "types", "--schema", "public"])
      if (!types.includes("export type Database =")) {
        throw new Error("Supabase did not return TypeScript database types.")
      }
      const file = new URL("../lib/supabase/database.types.ts", import.meta.url)
      const filepath = fileURLToPath(file)
      writeFileSync(
        file,
        await format(types, {
          ...(await resolveConfig(filepath)),
          filepath,
        })
      )
      console.log("Updated lib/supabase/database.types.ts from local Supabase.")
      break
    }
    default:
      throw new Error("Usage: node scripts/supabase-local.mjs <env|types>")
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Supabase setup failed."
  )
  process.exitCode = 1
}
