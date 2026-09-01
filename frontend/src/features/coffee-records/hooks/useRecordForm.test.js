/**
 * useRecordForm.jsのテスト。
 *
 * フォームの状態管理（isDirty判定・二重送信防止・エラーの振り分け）は
 * RecordFormPage.jsxの保存忘れガード（useBlocker）の土台になっている
 * にもかかわらず、これまでテストが無かった。DOM非依存のロジックなので
 * renderHookで直接検証する（recordFormValidation.test.jsと同じ、
 * バリデーションそのものの網羅はそちらに任せ、ここではフックとしての
 * 配線・状態遷移だけを見る）。
 */
import { describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useRecordForm } from "./useRecordForm";

describe("useRecordForm（新規作成）", () => {
  test("初期値はtitleが空・recordTypeがhome・isDirtyがfalse", () => {
    const { result } = renderHook(() => useRecordForm(null, vi.fn()));

    expect(result.current.values.title).toBe("");
    expect(result.current.values.recordType).toBe("home");
    expect(result.current.isDirty).toBe(false);
  });

  test("setValueで値を変えるとisDirtyがtrueになる", () => {
    const { result } = renderHook(() => useRecordForm(null, vi.fn()));

    act(() => result.current.setValue("title", "Ethiopia Yirgacheffe"));

    expect(result.current.values.title).toBe("Ethiopia Yirgacheffe");
    expect(result.current.isDirty).toBe(true);
  });

  test("エラーがある欄をsetValueで変更すると、その欄のエラーだけ消える", async () => {
    const { result } = renderHook(() => useRecordForm(null, vi.fn()));

    // titleを空のまま送信してエラーを作る
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.errors.title).toBeTruthy();

    act(() => result.current.setValue("title", "とりあえず買った豆"));
    expect(result.current.errors.title).toBeUndefined();
  });

  test("toggleValueで配列項目の追加・削除ができる", () => {
    const { result } = renderHook(() => useRecordForm(null, vi.fn()));

    act(() => result.current.toggleValue("flavorIds", "flavor-1"));
    expect(result.current.values.flavorIds).toEqual(["flavor-1"]);

    act(() => result.current.toggleValue("flavorIds", "flavor-2"));
    expect(result.current.values.flavorIds).toEqual(["flavor-1", "flavor-2"]);

    act(() => result.current.toggleValue("flavorIds", "flavor-1"));
    expect(result.current.values.flavorIds).toEqual(["flavor-2"]);
  });

  test("titleが空のまま送信すると、onSubmitを呼ばずにバリデーションエラーを設定する", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useRecordForm(null, onSubmit));

    let returned;
    await act(async () => {
      returned = await result.current.submit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(returned).toBeNull();
    expect(result.current.errors.title).toBeTruthy();
  });

  test("必須項目が揃っていれば、APIへ送る形（toApiPayload相当）でonSubmitを呼ぶ", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: "new-record-id" });
    const { result } = renderHook(() => useRecordForm(null, onSubmit));

    act(() => result.current.setValue("title", "とりあえず買った豆"));

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe("とりあえず買った豆");
    expect(payload.recordType).toBe("home");
    expect(result.current.errors).toEqual({});
    expect(result.current.submitError).toBeNull();
  });

  test("送信中の二重呼び出しは、進行中の1回だけが実行される", async () => {
    let resolveSubmit;
    const onSubmit = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const { result } = renderHook(() => useRecordForm(null, onSubmit));

    act(() => result.current.setValue("title", "とりあえず買った豆"));

    // 1回目の送信を開始（まだ完了させない）
    let firstCall;
    act(() => {
      firstCall = result.current.submit();
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    // 送信中に2回目を呼んでも無視される
    let secondReturn;
    await act(async () => {
      secondReturn = await result.current.submit();
    });
    expect(secondReturn).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit({ id: "1" });
      await firstCall;
    });
  });

  test("onSubmitがfieldErrorsを持つ例外を投げたら、その項目エラーを設定する", async () => {
    const error = new Error("Validation failed");
    error.fieldErrors = { title: "そのタイトルは既に使われています" };
    const onSubmit = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useRecordForm(null, onSubmit));

    act(() => result.current.setValue("title", "重複タイトル"));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors.title).toBe("そのタイトルは既に使われています");
    expect(result.current.submitError).toBe(error);
  });

  test("onSubmitがfieldErrorsを持たない例外（通信エラー等）を投げたら、項目エラーは変えずsubmitErrorだけ設定する", async () => {
    const error = new Error("Network error");
    const onSubmit = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useRecordForm(null, onSubmit));

    act(() => result.current.setValue("title", "とりあえず買った豆"));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.submitError).toBe(error);
    expect(result.current.isSubmitting).toBe(false);
  });
});

describe("useRecordForm（Discoverからの産地事前入力）", () => {
  test("prefillOriginIdを渡すとoriginIdへ反映される", () => {
    const { result } = renderHook(() => useRecordForm(null, vi.fn(), "origin-123"));

    expect(result.current.values.originId).toBe("origin-123");
  });

  test("事前入力はisDirtyをtrueにしない（アプリが入れた初期値であり、ユーザーの編集ではないため）", () => {
    const { result } = renderHook(() => useRecordForm(null, vi.fn(), "origin-123"));

    expect(result.current.isDirty).toBe(false);
  });

  test("masterData読み込み待ちでprefillOriginIdが後から届いても反映される", () => {
    const { result, rerender } = renderHook(
      ({ prefillOriginId }) => useRecordForm(null, vi.fn(), prefillOriginId),
      { initialProps: { prefillOriginId: null } },
    );

    expect(result.current.values.originId).toBe("");

    rerender({ prefillOriginId: "origin-456" });

    expect(result.current.values.originId).toBe("origin-456");
    expect(result.current.isDirty).toBe(false);
  });

  test("編集（recordあり）のときは事前入力を無視する", () => {
    const existingRecord = {
      title: "Ethiopia Guji",
      consumedAt: "2026-07-01T09:00:00.000Z",
      recordType: "home",
      rating: null,
      notes: "",
      cafeName: "",
      roasterName: "",
      origin: { id: "origin-existing", name: "Ethiopia" },
      farmName: "",
      varieties: [],
      process: null,
      roastLevel: null,
      flavors: [],
    };

    const { result } = renderHook(() => useRecordForm(existingRecord, vi.fn(), "origin-123"));

    expect(result.current.values.originId).toBe("origin-existing");
  });

  test("ユーザーが手動で選び直した後にprefillOriginIdが変わっても上書きしない", () => {
    const { result, rerender } = renderHook(
      ({ prefillOriginId }) => useRecordForm(null, vi.fn(), prefillOriginId),
      { initialProps: { prefillOriginId: "origin-123" } },
    );

    act(() => result.current.setValue("originId", "origin-manually-chosen"));
    rerender({ prefillOriginId: "origin-123" });

    expect(result.current.values.originId).toBe("origin-manually-chosen");
  });
});

describe("useRecordForm（編集）", () => {
  const existingRecord = {
    title: "Guatemala Huehuetenango",
    consumedAt: "2026-07-01T09:00:00.000Z",
    recordType: "cafe",
    rating: 4,
    notes: "",
    cafeName: "Blue Bottle Coffee",
    roasterName: "",
    origin: { id: "origin-1" },
    farmName: "",
    varieties: [{ id: "variety-1" }],
    process: null,
    roastLevel: null,
    flavors: [],
  };

  test("既存の記録から初期値を組み立て、isDirtyはfalseから始まる", () => {
    const { result } = renderHook(() => useRecordForm(existingRecord, vi.fn()));

    expect(result.current.values.title).toBe("Guatemala Huehuetenango");
    expect(result.current.values.recordType).toBe("cafe");
    expect(result.current.values.varietyIds).toEqual(["variety-1"]);
    expect(result.current.isDirty).toBe(false);
  });

  test("値を変更するとisDirtyがtrueになる", () => {
    const { result } = renderHook(() => useRecordForm(existingRecord, vi.fn()));

    act(() => result.current.setValue("rating", "5"));

    expect(result.current.isDirty).toBe(true);
  });
});
