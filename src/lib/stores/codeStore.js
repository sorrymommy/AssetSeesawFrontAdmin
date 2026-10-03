import { writable } from 'svelte/store';
import { commonCodeApi } from '$lib/api/commonCodeApi';

/**
 * 공통 코드 저장소 — 화면 표시명·선택 목록의 단일 출처.
 * 처음 필요할 때 한 번 불러와 공유하고, 공통 코드 관리에서 바꾸면 loadCodes(true)로 갱신한다.
 *
 * @typedef {{ code: string, name: string, description?: string|null, sortOrder: number, isActive: boolean }} Code
 * @typedef {{ groupCode: string, name: string, description?: string|null, isSystem: boolean, codes: Code[] }} CodeGroup
 */

/** 그룹 코드 상수 (값은 DB common_code_group.group_code) */
export const CODE_GROUP = {
  TX_TYPE: 'TX_TYPE',
  USER_ROLE: 'USER_ROLE',
  USER_STATUS: 'USER_STATUS',
  REBAL_STATUS: 'REBAL_STATUS',
  REBAL_ACTION: 'REBAL_ACTION',
  BROKER: 'BROKER',
  CURRENCY: 'CURRENCY',
  MARKET: 'MARKET'
};

/** @type {import('svelte/store').Writable<Record<string, CodeGroup>>} 그룹 코드 → 그룹 */
export const codes = writable({});

/** @type {Promise<void> | null} */
let loading = null;

/**
 * 공통 코드를 불러온다. 이미 불러왔으면 같은 결과를 재사용한다.
 * @param {boolean} [force] true면 서버에서 다시 불러온다 (코드 변경 후)
 */
export function loadCodes(force = false) {
  if (loading && !force) return loading;
  loading = commonCodeApi
    .list()
    .then((/** @type {CodeGroup[]} */ groups) => {
      codes.set(Object.fromEntries((groups ?? []).map((g) => [g.groupCode, g])));
    })
    .catch((error) => {
      loading = null; // 실패하면 다음 호출에서 다시 시도
      throw error;
    });
  return loading;
}

/**
 * 코드 → 표시명. 코드가 없으면 코드값 그대로 (사용중지 코드도 표시명으로 보여준다).
 * @param {Record<string, CodeGroup>} map $codes
 * @param {string} group
 * @param {any} code
 */
export function codeName(map, group, code) {
  if (code === null || code === undefined || code === '') return '';
  return map[group]?.codes.find((c) => c.code === code)?.name ?? String(code);
}

/**
 * 선택 목록 [{value, label}] (정렬순서). 기본은 사용 중인 코드만.
 * keep: 사용중지됐어도 목록에 남길 현재 값 (수정 화면에서 기존 값이 사라지지 않게)
 * @param {Record<string, CodeGroup>} map $codes
 * @param {string} group
 * @param {{ includeInactive?: boolean, keep?: any }} [options]
 */
export function codeOptions(map, group, { includeInactive = false, keep } = {}) {
  return (map[group]?.codes ?? [])
    .filter((c) => includeInactive || c.isActive || c.code === keep)
    .map((c) => ({ value: c.code, label: c.isActive ? c.name : `${c.name} (사용중지)` }));
}
