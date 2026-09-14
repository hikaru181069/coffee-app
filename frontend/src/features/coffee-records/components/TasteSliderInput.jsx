import { useTranslation } from "react-i18next";

/**
 * 味覚6軸（甘み・苦み・酸味・コク・香り・後味）を1〜5のスライダーで入力する。
 *
 * 値の型はRatingInput（★の5段階）と同じ（""=未評価、"1"〜"5"の文字列）。
 * useRecordForm.jsのsetValue(field, value)にそのまま渡せるよう、表示の
 * 差し替えのみに留めている。
 *
 * ネイティブ<input type="range">を使うのは、矢印キー/Home/Endでの
 * キーボード操作・aria-valuenow等をブラウザが標準で処理してくれるため
 * （RatingInputのradiogroupと違い、独自のkeydownハンドラが不要）。
 *
 * 「未評価」をトラック上の実在する位置として表現するため、min=0を
 * 「未評価」専用の値として扱う（0〜5の6段階のスライダーだが、0は
 * 見た目上「まだ動かしていない」左端として現れる）。中間値（例:3）を
 * 仮の初期値にすると「3が選ばれている」ように見えてしまうため、
 * 曖昧な既定値を作らずに済む。
 */
function TasteSliderInput({ id, value, onChange, disabled = false }) {
  const { t } = useTranslation();
  const selected = value === "" ? 0 : Number(value);
  const valueLabel = selected === 0 ? t("common.unrated") : `${selected} / 5`;

  const handleChange = (event) => {
    const next = Number(event.target.value);
    onChange(next === 0 ? "" : String(next));
  };

  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={0}
        max={5}
        step={1}
        value={selected}
        onChange={handleChange}
        disabled={disabled}
        aria-valuetext={valueLabel}
        style={{ accentColor: "var(--color-text)" }}
        className="h-1.5 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
      />

      <span className="w-14 flex-shrink-0 text-right font-mono text-sm text-text-secondary">
        {valueLabel}
      </span>
    </div>
  );
}

export default TasteSliderInput;
