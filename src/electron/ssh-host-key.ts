import {
  createHash
} from "node:crypto";

export interface SshHostKeyMismatch {
  expected: string;
  observed: string;
}

export function sshHostKeySha256(
  key: Buffer
): string {
  const digest =
    createHash("sha256")
      .update(key)
      .digest("base64")
      .replace(/=+$/u, "");

  return `SHA256:${digest}`;
}

export function createSshHostKeyGuard(
  expected?: string
): {
  verifier: (key: Buffer) => boolean;
  getObserved: () => string | null;
  getMismatch: () => SshHostKeyMismatch | null;
} {
  let observed: string | null =
    null;

  return {
    verifier(
      key: Buffer
    ): boolean {
      observed =
        sshHostKeySha256(key);

      return (
        expected === undefined ||
        expected === observed
      );
    },

    getObserved(): string | null {
      return observed;
    },

    getMismatch():
      SshHostKeyMismatch | null {
      if (
        expected === undefined ||
        observed === null ||
        expected === observed
      ) {
        return null;
      }

      return {
        expected,
        observed
      };
    }
  };
}

export function hostKeyMismatchError(
  mismatch: SshHostKeyMismatch
): Error {
  return new Error(
    "SSH host key mismatch. " +
      `Expected ${mismatch.expected}, ` +
      `received ${mismatch.observed}. ` +
      "The connection was blocked."
  );
}