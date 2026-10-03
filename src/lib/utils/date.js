/**
 * 날짜 표시 유틸 — 화면의 날짜는 KST(Asia/Seoul) 기준으로 보여준다.
 * 서버의 생성·수정 시각(created_at 등)은 UTC 타임스탬프로 오므로, 문자열을 그대로 자르면
 * KST 오전 9시 이전 기록이 전날로 보인다.
 */

const KST_DATE = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}); // sv-SE 로캘은 YYYY-MM-DD 형식

/**
 * 타임스탬프 → KST 날짜 'YYYY-MM-DD'.
 * 날짜만 있는 값('2026-10-02' — 거래일·적용일 등)은 시간대 변환 없이 그대로 돌려준다.
 * @param {any} value
 * @returns {string}
 */
export function toKstDate(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text.slice(0, 10) : KST_DATE.format(date);
}

/** tui-grid 컬럼 formatter 용 */
export const kstDateFormatter = (/** @type {{ value: any }} */ { value }) => toKstDate(value);
