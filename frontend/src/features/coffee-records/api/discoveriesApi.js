import { apiRequest } from "../../../services/api/httpClient";

/**
 * 保存前の「発見」プレビューのAPI呼び出し。
 *
 * 2026-09、記録体験の再設計（第3弾）。RecordForm.jsxで産地チップを
 * 選んだ瞬間に呼ぶ。DBには何も保存されない（バックエンドの
 * discoveryPreviewService.js参照）。
 */
const BASE_PATH = "/api/discoveries";

/** @returns {Promise<{ discoveries: Array }>} */
export const previewOriginDiscovery = async (originId) => {
  const payload = await apiRequest(`${BASE_PATH}/preview`, {
    method: "POST",
    body: { originId },
  });
  return payload.data;
};
