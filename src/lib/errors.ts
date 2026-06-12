export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function hasErrorCode(error: unknown, code: string) {
  return getErrorMessage(error, "").includes(code);
}
