export function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? null;
}

export function normalizeReference(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") ?? null;
}

export function normalizeScac(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) ?? null;
}

export function titleCase(value: string) {
  return value.replace(/\w\S*/g, (part) => part[0].toUpperCase() + part.slice(1).toLowerCase());
}
