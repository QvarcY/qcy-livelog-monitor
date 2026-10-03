export type TailControlEvent =
  | {
      type: "LOG_UNAVAILABLE";
      remotePath: string;
      message: string;
    }
  | {
      type: "LOG_ROTATED";
      remotePath: string;
      message: string;
    };

export function parseTailControlLine(
  line: string
): TailControlEvent | null {
  const message = line.trim();

  const inaccessible = message.match(
    /^tail: '(.+)' has become inaccessible:/
  );

  if (inaccessible) {
    return {
      type: "LOG_UNAVAILABLE",
      remotePath: inaccessible[1],
      message
    };
  }

  const appeared = message.match(
    /^tail: '(.+)' has appeared;\s+following new file$/
  );

  if (appeared) {
    return {
      type: "LOG_ROTATED",
      remotePath: appeared[1],
      message
    };
  }

  const replaced = message.match(
    /^tail: '(.+)' has been replaced;\s+following new file$/
  );

  if (replaced) {
    return {
      type: "LOG_ROTATED",
      remotePath: replaced[1],
      message
    };
  }

  return null;
}