import { API_URL } from "../../utils/apiConfig";

export const getCompareAnalysis = async (p1Id, p2Id) => {
  const res = await fetch(
    `${API_URL}/api/compare/analyze?p1=${p1Id}&p2=${p2Id}`,
  );
  if (!res.ok) return null;
  return res.json();
};
