import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  validateRecordForm,
  hasErrors,
  toApiPayload,
} from "../validation/recordFormValidation";
import { TASTE_AXES, toDateTimeLocalValue } from "../utils/recordFormat";

/**
 * 記録フォームの状態を管理する。
 *
 * 作成と編集で同じフォームを使うため、初期値の組み立てもここで行う。
 * 画面側は「値」「エラー」「変更関数」「送信関数」を受け取るだけでよく、
 * 入力の持ち方を知らなくて済む。
 */

/** 現在時刻を datetime-local の形で返す（新規作成の初期値） */
const nowForInput = () => toDateTimeLocalValue(new Date().toISOString());

const emptyValues = () => ({
  title: "",
  consumedAt: nowForInput(),
  recordType: "home",
  rating: "",
  notes: "",
  cafeName: "",
  roasterName: "",
  originId: "",
  farmName: "",
  varietyIds: [],
  processId: "",
  roastLevelId: "",
  flavorIds: [],
  ...Object.fromEntries(TASTE_AXES.map((axis) => [axis.field, ""])),
});

/**
 * APIから取得した記録をフォームの値へ変換する。
 *
 * APIは参照を { id, name } で返すが、フォームが持つのはIDだけでよい。
 * また、すべての欄を「文字列または配列」にそろえる。
 * null が混ざると input が非制御コンポーネントになって警告が出る。
 */
const toFormValues = (record) => ({
  title: record.title ?? "",
  consumedAt: toDateTimeLocalValue(record.consumedAt),
  recordType: record.recordType ?? "home",
  rating: record.rating === null || record.rating === undefined ? "" : String(record.rating),
  notes: record.notes ?? "",
  cafeName: record.cafeName ?? "",
  roasterName: record.roasterName ?? "",
  originId: record.origin?.id ?? "",
  farmName: record.farmName ?? "",
  varietyIds: (record.varieties ?? []).map((variety) => variety.id),
  processId: record.process?.id ?? "",
  roastLevelId: record.roastLevel?.id ?? "",
  flavorIds: (record.flavors ?? []).map((flavor) => flavor.id),
  ...Object.fromEntries(
    TASTE_AXES.map((axis) => [
      axis.field,
      record[axis.field] === null || record[axis.field] === undefined
        ? ""
        : String(record[axis.field]),
    ]),
  ),
});

/**
 * @param {object|null} record 編集対象。新規作成なら null
 * @param {Function} onSubmit  APIへ送る関数。payload を受け取る
 * @param {string|null} [prefillOriginId] 新規作成時にoriginIdへ事前入力する値
 *   （Discoverの「この産地を記録してみる」から遷移した場合。
 *   RecordFormPage.jsxがクエリ文字列の産地名をmasterDataと突き合わせて
 *   解決した結果を渡す）
 */
export const useRecordForm = (record, onSubmit, prefillOriginId = null) => {
  const { t } = useTranslation();
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // 保存忘れ確認（RecordFormPage.jsxのuseBlocker）用の基準値。
  // 記録の読み込み・保存のたびに更新し、valuesとの差分でisDirtyを求める
  const [initialValues, setInitialValues] = useState(emptyValues);

  // 編集対象は後から届く（API取得の完了を待つ）ので、届いたら
  // フォームへ流し込む。
  //
  // useEffect ではなく「レンダリング中に前回の値と比べる」書き方をしている。
  // effect で setValues すると、一度空のフォームを描画してから
  // 値入りのフォームを描き直すことになり、入力欄が一瞬ちらつく。
  // React が「前回のpropと比較して状態を調整する」ために推奨している形。
  const [syncedRecord, setSyncedRecord] = useState(null);
  if (record && record !== syncedRecord) {
    setSyncedRecord(record);
    const initial = toFormValues(record);
    setValues(initial);
    setInitialValues(initial);
  }

  // Discoverからの「この産地を記録してみる」で遷移した場合の事前入力。
  // 新規作成（record===null）のときだけ適用する。valuesだけでなく
  // initialValuesも揃えることで、アプリが入れた初期値をユーザーの編集
  // として扱わない（isDirtyがtrueにならない）。masterData読み込み待ちで
  // prefillOriginIdが後から届く前提のため、record同期と同じ
  // 「レンダリング中に前回値と比較する」パターンにしている
  const [appliedPrefillOriginId, setAppliedPrefillOriginId] = useState(null);
  if (!record && prefillOriginId && prefillOriginId !== appliedPrefillOriginId) {
    setAppliedPrefillOriginId(prefillOriginId);
    setValues((prev) => ({ ...prev, originId: prefillOriginId }));
    setInitialValues((prev) => ({ ...prev, originId: prefillOriginId }));
  }

  // toFormValues/emptyValuesは常に同じキー順でプレーンな文字列・配列だけを
  // 返すため、JSON.stringifyでの比較で十分。品種・フレーバーの選び直しで
  // 配列の並び順だけが変わるケースは「実質同じ内容」でもdirty判定になるが、
  // 過剰に警告する方向（安全側）のずれなので許容する
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  /** 1つの欄を変更する。入力中はその欄のエラーだけ消す */
  const setValue = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /** 複数選択（品種・フレーバー）の1件をトグルする */
  const toggleValue = useCallback((field, id) => {
    setValues((prev) => {
      const current = prev[field] ?? [];
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];

      return { ...prev, [field]: next };
    });
  }, []);

  const submit = useCallback(async () => {
    // 二重送信を防ぐ。保存ボタンのdisabledだけに頼ると、
    // Enterキーでの送信や連打で通り抜けることがある
    if (isSubmitting) return null;

    const validationErrors = validateRecordForm(values, t);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      setSubmitError(null);
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      return await onSubmit(toApiPayload(values));
    } catch (caught) {
      // サーバーが項目ごとの理由を返してきたら、各入力欄の下へ出す。
      // それ以外（通信エラーなど）はフォーム全体のメッセージにする
      const fieldErrors = caught.fieldErrors ?? {};

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      setSubmitError(caught);

      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, values, onSubmit, t]);

  return { values, errors, submitError, isSubmitting, isDirty, setValue, toggleValue, submit };
};
