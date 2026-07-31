import { API_URL } from "../../utils/apiConfig";

/**
 * チームの基本情報 + 順位/勝敗を取得する
 * @param {number|string} teamId
 * @param {number} [season]
 * @returns {{ id, name, league, division, venue, record }}
 */
export const getTeam = async (teamId, season) => {
  const q = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/teams/${teamId}${q}`);
  if (!res.ok) throw new Error("Failed to fetch team");
  return res.json();
};

/**
 * チームの直近〜今後の試合を取得する
 * @param {number|string} teamId
 * @returns {{ teamId, startDate, endDate, games: Array }}
 */
export const getTeamSchedule = async (teamId) => {
  const res = await fetch(`${API_URL}/api/teams/${teamId}/schedule`);
  if (!res.ok) throw new Error("Failed to fetch team schedule");
  return res.json();
};

/**
 * チーム内のリーダー（打撃/投球）を取得する
 * @param {number|string} teamId
 * @param {number} [season]
 * @returns {{ teamId, season, leaders: Array }}
 */
export const getTeamLeaders = async (teamId, season) => {
  const q = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/teams/${teamId}/leaders${q}`);
  if (!res.ok) throw new Error("Failed to fetch team leaders");
  return res.json();
};

export const getTeamInjuries = async (teamId) => {
  const res = await fetch(`${API_URL}/api/teams/${teamId}/injuries`);
  if (!res.ok) throw new Error("Failed to fetch team injuries");
  return res.json();
};
