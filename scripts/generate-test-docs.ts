import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const fixtures = [
  {
    filename: "sample_bol_482910.txt",
    contents: "Sample Bill of Lading placeholder for prompt iteration."
  },
  {
    filename: "sample_invoice_90022.txt",
    contents: "Sample freight invoice placeholder for prompt iteration."
  },
  {
    filename: "sample_rate_con_1188.txt",
    contents: "Sample rate confirmation placeholder for prompt iteration."
  },
  {
    filename: "sample_pod_482910.txt",
    contents: "Sample proof of delivery placeholder for prompt iteration."
  }
];

async function main() {
  const targetDir = path.resolve(process.cwd(), "tests/fixtures");
  await mkdir(targetDir, { recursive: true });

  for (const fixture of fixtures) {
    await writeFile(path.join(targetDir, fixture.filename), fixture.contents, "utf8");
  }

  console.log(`Generated ${fixtures.length} placeholder freight documents in tests/fixtures.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
