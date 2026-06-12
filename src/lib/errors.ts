export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function hasErrorCode(error: unknown, code: string) {
  return getErrorMessage(error, "").includes(code);
}

export function isLightningUnavailable(error: unknown) {
  return hasErrorCode(error, "LND_NOT_CONFIGURED") || hasErrorCode(error, "LND_UNAVAILABLE");
}
