import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";

import path from "node:path";

import {
  safeStorage
} from "electron";

interface CredentialFile {
  version: 1;

  passphrases:
    Record<string, string>;
}

function credentialsFile(
  dataDirectory: string
): string {
  return path.join(
    dataDirectory,
    "ssh-secrets.json"
  );
}

function requireProfileId(
  value: unknown
): string {
  if (typeof value !== "string") {
    throw new Error(
      "Profile id must be a string."
    );
  }

  const id =
    value.trim();

  if (
    id === "" ||
    !/^[a-z0-9][a-z0-9._-]*$/iu.test(id)
  ) {
    throw new Error(
      "Invalid profile id."
    );
  }

  return id;
}

async function readCredentials(
  dataDirectory: string
): Promise<CredentialFile> {
  try {
    const raw =
      await readFile(
        credentialsFile(
          dataDirectory
        ),
        "utf8"
      );

    const parsed: unknown =
      JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {
        version: 1,
        passphrases: {}
      };
    }

    const record =
      parsed as Record<
        string,
        unknown
      >;

    if (
      record.version !== 1 ||
      typeof record.passphrases !==
        "object" ||
      record.passphrases === null ||
      Array.isArray(
        record.passphrases
      )
    ) {
      return {
        version: 1,
        passphrases: {}
      };
    }

    const passphrases:
      Record<string, string> = {};

    for (
      const [
        profileId,
        encrypted
      ] of Object.entries(
        record.passphrases
      )
    ) {
      if (
        typeof encrypted ===
          "string" &&
        encrypted !== ""
      ) {
        passphrases[
          profileId
        ] = encrypted;
      }
    }

    return {
      version: 1,
      passphrases
    };
    } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: unknown;
        }
      ).code === "ENOENT"
    ) {
      return {
        version: 1,
        passphrases: {}
      };
    }

    throw new Error(
      "Secure credential store could not be read safely.",
      {
        cause: error
      }
    );
  }
}

function credentialTempFile(
  dataDirectory: string
): string {
  return path.join(
    dataDirectory,
    `.secure-credentials.${process.pid}.tmp`
  );
}

async function writeCredentials(
  dataDirectory: string,
  file: CredentialFile
): Promise<void> {
  await mkdir(
    dataDirectory,
    {
      recursive: true
    }
  );

  const target =
    credentialsFile(
      dataDirectory
    );

  const temporary =
    credentialTempFile(
      dataDirectory
    );

  const payload =
    JSON.stringify(
      file,
      null,
      2
    ) + "\n";

  try {
    await writeFile(
      temporary,
      payload,
      {
        encoding: "utf8",
        flag: "wx"
      }
    );

    await rename(
      temporary,
      target
    );
  } catch (error) {
    await rm(
      temporary,
      {
        force: true
      }
    ).catch(
      () => {
        // Best-effort temp cleanup only.
      }
    );

    throw error;
  }
}

export async function rememberSshPassphrase(
  dataDirectory: string,
  profileIdInput: unknown,
  passphraseInput: unknown
): Promise<void> {
  const profileId =
    requireProfileId(
      profileIdInput
    );

  if (
    typeof passphraseInput !==
      "string" ||
    passphraseInput === ""
  ) {
    throw new Error(
      "SSH passphrase cannot be empty."
    );
  }

  if (
    !safeStorage
      .isEncryptionAvailable()
  ) {
    throw new Error(
      "Secure credential storage is not available."
    );
  }

  const encrypted =
    safeStorage
      .encryptString(
        passphraseInput
      )
      .toString(
        "base64"
      );

  const file =
    await readCredentials(
      dataDirectory
    );

  file.passphrases[
    profileId
  ] = encrypted;

  await writeCredentials(
    dataDirectory,
    file
  );
}

export async function forgetSshPassphrase(
  dataDirectory: string,
  profileIdInput: unknown
): Promise<void> {
  const profileId =
    requireProfileId(
      profileIdInput
    );

  const file =
    await readCredentials(
      dataDirectory
    );

  delete file.passphrases[
    profileId
  ];

  await writeCredentials(
    dataDirectory,
    file
  );
}

export async function hasSshPassphrase(
  dataDirectory: string,
  profileIdInput: unknown
): Promise<boolean> {
  const profileId =
    requireProfileId(
      profileIdInput
    );

  const file =
    await readCredentials(
      dataDirectory
    );

  return typeof file
    .passphrases[
      profileId
    ] === "string";
}

export async function readSshPassphrase(
  dataDirectory: string,
  profileIdInput: unknown
): Promise<string | null> {
  const profileId =
    requireProfileId(
      profileIdInput
    );

  const file =
    await readCredentials(
      dataDirectory
    );

  const encrypted =
    file.passphrases[
      profileId
    ];

  if (!encrypted) {
    return null;
  }

  if (
    !safeStorage
      .isEncryptionAvailable()
  ) {
    throw new Error(
      "Secure credential storage is not available."
    );
  }

  try {
    return safeStorage
      .decryptString(
        Buffer.from(
          encrypted,
          "base64"
        )
      );
  } catch {
    throw new Error(
      "Stored SSH passphrase could not be decrypted."
    );
  }
}