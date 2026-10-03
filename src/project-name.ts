export function normalizeProjectName(
  value: string
): string {
  const fileName = value
    .trim()
    .replace(/^.*[\\/]/, "");

  const projectName = fileName
    .replace(/-ssl_log$/i, "")
    .replace(/\.$/, "")
    .trim()
    .toLowerCase();

  if (projectName === "") {
    throw new Error(
      `Cannot normalize empty project name from: ${value}`
    );
  }

  if (
    projectName.includes("/") ||
    projectName.includes("\\")
  ) {
    throw new Error(
      `Invalid normalized project name: ${projectName}`
    );
  }

  return projectName;
}