import { apiRequest } from "../../coffee-records/api/httpClient";

const DIAGNOSIS_PATH = "/api/diagnosis";

export const fetchDiagnosis = async ({ signal } = {}) => {
  const payload = await apiRequest(DIAGNOSIS_PATH, { signal });
  return payload.data;
};
