import {
  copyFile,
  mkdir
} from "node:fs/promises";

import path from "node:path";
import {
  fileURLToPath
} from "node:url";

const scriptDir = path.dirname(
  fileURLToPath(
    import.meta.url
  )
);

const root = path.resolve(
  scriptDir,
  ".."
);

const sourceElectron = path.join(
  root,
  "src",
  "electron"
);

const distElectron = path.join(
  root,
  "dist",
  "electron"
);

const distRenderer = path.join(
  distElectron,
  "renderer"
);

await mkdir(
  distRenderer,
  {
    recursive: true
  }
);

await copyFile(
  path.join(
    sourceElectron,
    "preload.cjs"
  ),
  path.join(
    distElectron,
    "preload.cjs"
  )
);

for (
  const file of [
    "index.html",
    "styles.css"
  ]
) {
  await copyFile(
    path.join(
      sourceElectron,
      "renderer",
      file
    ),
    path.join(
      distRenderer,
      file
    )
  );
}