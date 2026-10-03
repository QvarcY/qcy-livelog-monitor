export type LogParserId =
  | "auto"
  | "apache-combined";

export interface SshConnectionProfile {
  host: string;
  port: number;
  username: string;
  privateKeyPath: string;
}

export interface LogSourceProfile {
  directory: string;
  pattern: string;
  parser: LogParserId;
  projectNameSuffix: string;
}

export interface ServerProfile {
  id: string;
  name: string;
  ssh: SshConnectionProfile;
  logs: LogSourceProfile;
}

export interface ServerProfileInput {
  id?: unknown;
  name?: unknown;

  ssh?: {
    host?: unknown;
    port?: unknown;
    username?: unknown;
    privateKeyPath?: unknown;
  };

  logs?: {
    directory?: unknown;
    pattern?: unknown;
    parser?: unknown;
    projectNameSuffix?: unknown;
  };
}

function requireString(
  value: unknown,
  field: string
): string {
  if (typeof value !== "string") {
    throw new Error(
      `${field} must be a string.`
    );
  }

  const result = value.trim();

  if (result === "") {
    throw new Error(
      `${field} cannot be empty.`
    );
  }

  return result;
}

function requirePort(
  value: unknown
): number {
  const port =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      "SSH port must be an integer from 1 to 65535."
    );
  }

  return port;
}

function normalizeParser(
  value: unknown
): LogParserId {
  if (
    value === undefined ||
    value === "auto"
  ) {
    return "auto";
  }

  if (value === "apache-combined") {
    return value;
  }

  throw new Error(
    `Unsupported log parser: ${String(value)}`
  );
}

function normalizeId(
  value: unknown
): string {
  const id = requireString(
    value,
    "Profile id"
  );

  if (
    !/^[a-z0-9][a-z0-9._-]*$/i.test(id)
  ) {
    throw new Error(
      "Profile id contains unsupported characters."
    );
  }

  return id;
}

export function normalizeServerProfile(
  input: ServerProfileInput
): ServerProfile {
  if (!input.ssh) {
    throw new Error(
      "SSH configuration is missing."
    );
  }

  if (!input.logs) {
    throw new Error(
      "Log source configuration is missing."
    );
  }

  const projectNameSuffix =
    typeof input.logs.projectNameSuffix === "string"
      ? input.logs.projectNameSuffix.trim()
      : "";

  return {
    id: normalizeId(input.id),

    name: requireString(
      input.name,
      "Profile name"
    ),

    ssh: {
      host: requireString(
        input.ssh.host,
        "SSH host"
      ),

      port: requirePort(
        input.ssh.port ?? 22
      ),

      username: requireString(
        input.ssh.username,
        "SSH username"
      ),

      privateKeyPath: requireString(
        input.ssh.privateKeyPath,
        "Private key path"
      )
    },

    logs: {
      directory: requireString(
        input.logs.directory,
        "Log directory"
      ),

      pattern: requireString(
        input.logs.pattern,
        "Log file pattern"
      ),

      parser: normalizeParser(
        input.logs.parser
      ),

      projectNameSuffix
    }
  };
}

export function serverProfileDisplayTarget(
  profile: ServerProfile
): string {
  return (
    `${profile.ssh.username}@` +
    `${profile.ssh.host}:` +
    `${profile.ssh.port}`
  );
}