/**
 * 抽出の詳細（BrewDetailsCard.jsx）専用の入力検証。
 *
 * recordFormValidation.js とは独立させている。記録編集フォームとは
 * 別の画面（記録詳細ページの独立カード）で完結する、別の関心事のため
 * （docs/domain-model.md「抽出の詳細」参照）。
 *
 * サーバー側 validators/coffeeRecordValidator.js の
 * BREW_NUMERIC_LIMITS / validatePours と同じ閾値にそろえてある。
 */

const BREW_NUMERIC_LIMITS = {
  doseWeight: 5000,
  waterWeight: 5000,
  brewTimeSeconds: 86400,
};

const isBlank = (value) => value === "" || value === null || value === undefined;

/**
 * @param {object} values { doseWeight, waterWeight, brewTimeSeconds, pours }
 *   pours は [{ elapsedSeconds, cumulativeWaterWeight }] （すべて文字列）
 * @param {Function} t react-i18nextのt関数
 * @returns {object} { フィールド名: メッセージ }。pours の行エラーは
 *   "pours" キーにまとめる（行ごとの個別欄は持たないシンプルな入力のため）
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

  const rows = values.pours ?? [];
  let previousElapsedSeconds = -Infinity;
  for (const row of rows) {
    const elapsedBlank = isBlank(row.elapsedSeconds);
    const waterBlank = isBlank(row.cumulativeWaterWeight);

    // 両方空の行は「まだ入力していない行」として無視する（送信時に除去される）
    if (elapsedBlank && waterBlank) continue;

    if (elapsedBlank || waterBlank) {
      errors.pours = t("validation.pourIncomplete");
      break;
    }

    const elapsedSeconds = Number(row.elapsedSeconds);
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
 * 両方空の行は除去する（「行を追加したがまだ入力していない」状態を
 * 保存させないため）。空文字の数値項目は未記録（null）として送る。
 */
export const toBrewApiPayload = (values) => {
  const numberOrNull = (raw) => (isBlank(raw) ? null : Number(raw));

  return {
    doseWeight: numberOrNull(values.doseWeight),
    waterWeight: numberOrNull(values.waterWeight),
    brewTimeSeconds: numberOrNull(values.brewTimeSeconds),
    pours: (values.pours ?? [])
      .filter((row) => !isBlank(row.elapsedSeconds) || !isBlank(row.cumulativeWaterWeight))
      .map((row) => ({
        elapsedSeconds: Number(row.elapsedSeconds),
        cumulativeWaterWeight: Number(row.cumulativeWaterWeight),
      })),
  };
};
