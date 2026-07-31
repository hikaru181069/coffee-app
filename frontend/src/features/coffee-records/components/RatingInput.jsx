import { Star } from "lucide-react";

/**
 * 1〜5の評価を星で選ぶ入力。
 *
 * 未評価（空文字）を選べるようにしている。
 * 「まだ評価していない」と「星1」は意味が違うため
 * （models/CoffeeRecord.js の rating が既定値 null なのと同じ理由）。
 *
 * radio ボタンで組んでいる理由:
 *   div + onClick だとキーボードで操作できず、
 *   スクリーンリーダーにも「選択肢の集まり」だと伝わらない。
 *   見た目だけ星に差し替え、実体は radio のままにする。
 */
function RatingInput({ id, value, onChange, disabled = false }) {
  const selected = value === "" ? 0 : Number(value);

  return (
    <div className="flex items-center gap-3">
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="flex items-center gap-1"
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const isActive = score <= selected;

          return (
            <label
              key={score}
              className={`cursor-pointer rounded p-1 transition-colors duration-150 focus-within:ring-2 focus-within:ring-ctp-blue/50 ${
                disabled ? "cursor-not-allowed opacity-60" : "hover:bg-ctp-surface1"
              }`}
            >
              {/* sr-only: 画面には出さないがキーボードと支援技術からは使える */}
              <input
                type="radio"
                name={id}
                value={score}
                checked={selected === score}
                onChange={() => onChange(String(score))}
                disabled={disabled}
                className="sr-only"
              />
              <Star
                size={22}
                aria-hidden="true"
                className={isActive ? "text-ctp-yellow" : "text-ctp-overlay0"}
                fill={isActive ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
              <span className="sr-only">{score}</span>
            </label>
          );
        })}
      </div>

      {/* 星の数を文字でも示す（色・形だけで状態を表現しない） */}
      <span className="text-sm text-ctp-subtext1">
        {selected === 0 ? "未評価" : `${selected} / 5`}
      </span>

      {selected > 0 && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-ctp-subtext0 underline underline-offset-2 hover:text-ctp-text"
        >
          クリア
        </button>
      )}
    </div>
  );
}

export default RatingInput;
