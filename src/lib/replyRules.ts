export const MAX_REPLY_LENGTH = 300;

export function getReplyLength(value: string) {
  return Array.from(value).length;
}

export function limitReplyLength(value: string) {
  return Array.from(value).slice(0, MAX_REPLY_LENGTH).join("");
}

export function normalizeReplyBody(value: string) {
  const body = value.trim();
  if (!body || getReplyLength(body) > MAX_REPLY_LENGTH) {
    throw new Error(`답글은 1자 이상 ${MAX_REPLY_LENGTH}자 이내로 적어주세요.`);
  }
  return body;
}
