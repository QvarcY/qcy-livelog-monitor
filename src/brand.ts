export const BRAND = Object.freeze({
  productName: "QcY LiveLog Monitor",
  authorName: "QvarcY",
  authorLabel: "By QvarcY",
  githubUrl: "https://github.com/QvarcY",
  supportLabel: "Buy Me a Coffee",
  supportUrl: "https://buymeacoffee.com/craftin"
});

export type BrandLinkKind =
  | "github"
  | "support";

export function getBrandLink(
  kind: unknown
): string | null {
  if (kind === "github") {
    return BRAND.githubUrl;
  }

  if (kind === "support") {
    return BRAND.supportUrl;
  }

  return null;
}