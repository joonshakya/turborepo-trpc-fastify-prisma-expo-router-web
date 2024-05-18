export function toTitleCase(str: string) {
  // replace underscores with spaces
  return str
    .replace(/__/g, "/")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (txt: string) => txt.toUpperCase());
}
