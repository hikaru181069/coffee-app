/**
 * 抽出の詳細（BrewDetailsCard.jsx）専用の入力検証。
 *
 * recordFormValidation.js とは独立させている。記録編集フォームとは
 * 別の画面（記録詳細ページの独立カード）で完結する、別の関心事のため
 * （docs/domain-model.md「抽出の詳細」参照）。
 *
 * サーバー側 validators/coffeeRecordValidator.js の
 * BREW_NUMERIC_LIMITS / validatePours と同じ閾値にそろえてある。
 *
 * 抽出時間・注湯の経過時間は、DB上は合計秒数（brewTimeSeconds /
 * pours[].elapsedSeconds）で持つが、入力は「分」「秒」の2欄に分けている
 * （秒だけの入力は直感的でないため。ユーザー指摘で追加）。この変換
 * （分秒⇄合計秒数）をこのファイルに集約する。
 */

const BREW_NUMERIC_LIMITS = {
  doseWeight: 5000,
  waterWeight: 5000,
};

/** 抽出時間の上限（24時間 = コールドブリューの長時間抽出も許容） */
const MAX_BREW_TIME_SECONDS = 86400;

const isBlank = (value) => value === "" || value === null || value === undefined;

/**
 * 「分」「秒」の入力欄2つを合計秒数へ変換する。
 * 両方空なら未記録（null）。どちらかに数値以外が入っていればNaNを返す
 * （呼び出し側でNumber.isFinite判定する）。
 */
const combineMinutesSeconds = (minutes, seconds) => {
  if (isBlank(minutes) && isBlank(seconds)) return null;

  const minutesValue = isBlank(minutes) ? 0 : Number(minutes);
  const secondsValue = isBlank(seconds) ? 0 : Number(seconds);
  if (!Number.isFinite(minutesValue) || !Number.isFinite(secondsValue)) return NaN;

  return minutesValue * 60 + secondsValue;
};

/**
 * 合計秒数を、分・秒の入力欄用の文字列へ変換する
 * （APIから取得した記録を編集フォームへ流し込むときに使う）。
 */
export const secondsToMinutesSecondsStrings = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return { minutes: "", seconds: "" };

  return {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60),
  };
};

const isPourRowBlank = (row) =>
  isBlank(row.elapsedMinutes) && isBlank(row.elapsedSecondsPart) && isBlank(row.cumulativeWaterWeight);

/**
 * @param {object} values { doseWeight, waterWeight, brewTimeMinutes,
 *   brewTimeSecondsPart, pours }
 *   pours は [{ elapsedMinutes, elapsedSecondsPart, cumulativeWaterWeight }]
 *   （すべて文字列）
 * @param {Function} t react-i18nextのt関数
 * @returns {object} { フィールド名: メッセージ }。抽出時間は分・秒2欄を
 *   まとめて"brewTimeSeconds"キーで、poursの行エラーは"pours"キーで返す
 *   （行/欄ごとの個別エラー表示は持たないシンプルな入力のため）
 */
export const validateBrewDetails = (values = {}, t) => {
  const errors = {};

  for (const field of Object.keys(BREW_NUMERIC_LIMITS)) {
    const raw = values[field];
    if (isBlank(raw)) continue;

    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      errors[field] = t("validation.positiveNumberRequired");
    } else if (value > BREW_NUMERIC_LIMITS[field]) {
      errors[field] = t("validation.numberTooLarge");
    }
  }

  const brewTimeSeconds = combineMinutesSeconds(values.brewTimeMinutes, values.brewTimeSecondsPart);
  if (brewTimeSeconds !== null) {
    if (!Number.isFinite(brewTimeSeconds) || brewTimeSeconds <= 0) {
      errors.brewTimeSeconds = t("validation.positiveNumberRequired");
    } else if (brewTimeSeconds > MAX_BREW_TIME_SECONDS) {
      errors.brewTimeSeconds = t("validation.numberTooLarge");
    }
  }

  const rows = values.pours ?? [];
  let previousElapsedSeconds = -Infinity;
  for (const row of rows) {
    // 何も入力していない行は無視する（送信時に除去される）
    if (isPourRowBlank(row)) continue;

    const elapsedBlank = isBlank(row.elapsedMinutes) && isBlank(row.elapsedSecondsPart);
    const waterBlank = isBlank(row.cumulativeWaterWeight);
    if (elapsedBlank || waterBlank) {
      errors.pours = t("validation.pourIncomplete");
      break;
    }

    const elapsedSeconds = combineMinutesSeconds(row.elapsedMinutes, row.elapsedSecondsPart);
    const cumulativeWaterWeight = Number(row.cumulativeWaterWeight);
    if (
      !Number.isFinite(elapsedSeconds) ||
      elapsedSeconds < 0 ||
      !Number.isFinite(cumulativeWaterWeight) ||
      cumulativeWaterWeight <= 0
    ) {
      errors.pours = t("validation.pourIncomplete");
      break;
    }
    if (elapsedSeconds <= previousElapsedSeconds) {
      errors.pours = t("validation.pourOrder");
      break;
    }
    previousElapsedSeconds = elapsedSeconds;
  }

  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;

/**
 * フォームの値をAPIへ送る形へ変換する。
 *
 * 何も入力していない行は除去する（「行を追加したがまだ入力していない」
 * 状態を保存させないため）。空文字の数値項目は未記録（null）として送る。
 * 分・秒の2欄は合計秒数（brewTimeSeconds / elapsedSeconds）へまとめる。
 */
export const toBrewApiPayload = (values) => {
  const numberOrNull = (raw) => (isBlank(raw) ? null : Number(raw));

  return {
    doseWeight: numberOrNull(values.doseWeight),
    waterWeight: numberOrNull(values.waterWeight),
    brewTimeSeconds: combineMinutesSeconds(values.brewTimeMinutes, values.brewTimeSecondsPart),
    pours: (values.pours ?? [])
      .filter((row) => !isPourRowBlank(row))
      .map((row) => ({
        elapsedSeconds: combineMinutesSeconds(row.elapsedMinutes, row.elapsedSecondsPart),
        cumulativeWaterWeight: Number(row.cumulativeWaterWeight),
      })),
  };
};
