/**
 * DiagnosisPage.jsxのテスト。
 *
 * 読み込み中・エラー・記録0件（空状態）・正常系（archetype・Insight・
 * Statsの要約という3セクション構成）の出し分けを確認する。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchDiagnosis = vi.fn();
vi.mock("../features/diagnosis/api/diagnosisApi", () => ({
  fetchDiagnosis: (...args) => fetchDiagnosis(...args),
}));

import DiagnosisPage from "./DiagnosisPage";

const DIAGNOSIS_WITH_RECORDS = {
  archetype: null,
  insights: [],
  stats: {
    overview: { recordCount: 15, avgRating: 4.1, firstRecordedAt: "2026-06-03T00:00:00.000Z" },
    // backend/core/stats/statsBuilder.jsのbuildHomeVsCafeは常に
    // {home, cafe}を返す（記録0件でもcount:0の形で返り、nullにはならない）
    homeVsCafe: {
      home: { count: 10, avgRating: 4.2 },
      cafe: { count: 5, avgRating: 3.8 },
    },
    topOrigins: [],
    topFlavors: [],
  },
};

function renderDiagnosisPage() {
  return render(
    <MemoryRouter>
      <DiagnosisPage />
    </MemoryRouter>,
  );
}

describe("DiagnosisPage", () => {
  test("読み込み中はスケルトンを表示する", () => {
    fetchDiagnosis.mockReturnValue(new Promise(() => {}));
    renderDiagnosisPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("取得に失敗したらエラー状態を表示する", async () => {
    fetchDiagnosis.mockRejectedValue(new Error("読み込みエラー"));
    renderDiagnosisPage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("記録0件なら空状態を表示する", async () => {
    fetchDiagnosis.mockResolvedValue({
      ...DIAGNOSIS_WITH_RECORDS,
      stats: { ...DIAGNOSIS_WITH_RECORDS.stats, overview: { ...DIAGNOSIS_WITH_RECORDS.stats.overview, recordCount: 0 } },
    });
    renderDiagnosisPage();

    expect(await screen.findByText("コーヒー診断")).toBeInTheDocument();
    expect(screen.queryByText("コーヒータイプ")).not.toBeInTheDocument();
  });

  test("記録があれば3セクション（タイプ・気づき・全体像）を表示する", async () => {
    fetchDiagnosis.mockResolvedValue(DIAGNOSIS_WITH_RECORDS);
    renderDiagnosisPage();

    expect(await screen.findByText("コーヒータイプ")).toBeInTheDocument();
    expect(screen.getByText("気づき")).toBeInTheDocument();
    expect(screen.getByText("記録の全体像")).toBeInTheDocument();
  });

  test("archetypeがnull（記録不足）なら空状態のヒント文を表示する", async () => {
    fetchDiagnosis.mockResolvedValue(DIAGNOSIS_WITH_RECORDS);
    renderDiagnosisPage();

    expect(
      await screen.findByText("記録が増えると、あなたの「コーヒータイプ」を診断できるようになります。"),
    ).toBeInTheDocument();
  });
});
