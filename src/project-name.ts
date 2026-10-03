export function normalizeProjectName(
  value: string,
  suffix = "-ssl_log"
): string {
  const fileName = value
    .trim()
    .replace(/^.*[\\/]/, "");

  let projectName =
    fileName;

  if (
    suffix !== "" &&
    projectName
      .toLowerCase()
      .endsWith(
        suffix.toLowerCase()
      )
  ) {
    projectName =
      projectName.slice(
        0,
        -suffix.length
      );
  }

  projectName = projectName
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