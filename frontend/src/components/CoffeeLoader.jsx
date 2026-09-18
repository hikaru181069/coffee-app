import { useId } from "react";
import { useTranslation } from "react-i18next";

import styles from "./CoffeeLoader.module.css";

const DIMENSIONS = { sm: 18, lg: 72 };

const CUP_PATH = "M5 11h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V11Z";
const HANDLE_PATH = "M16 13h1.2a2 2 0 1 1 0 4H16";
const DRIPPER_PATH = "M6.5 1.5H14.5L11.5 7H9.5Z";
// カップ輪郭を左右・下方向に0.9インセットした版（内側の丸みは半径を
// 同じ量だけ縮めて中心は変えないことで、カップの丸みに正しく沿う）。
// 液面がカップの線と重ならないようにするためのクリップ用パス。
const CUP_FILL_CLIP_PATH = "M5.9 11h9.2v7a3.1 3.1 0 0 1-3.1 3.1H9a3.1 3.1 0 0 1-3.1-3.1V11Z";

/**
 * コーヒーローディングアニメーション。
 *
 * ドリッパーの注ぎ口から一滴ずつ落ち、マグの液面がそのたびに一段ずつ
 * 満ちていく（ドリップ1.15秒×4回＝液面サイクル4.6秒でちょうど揃えて
 * いるため、一滴落ちるごとに液面が上がって見える）。4回でほぼ満ちた
 * ところで一度リセットしてループする。
 *
 * 2026-09、`Loader2`スピナー（ボタン内）とshimmerスケルトン
 * （ページ全体）を置き換えて、ローディング表示をこのコンポーネントへ
 * 統一した（docs/design.md「Framer Motion」参照。Artifactでの
 * モック検討を経てユーザー承認を得た）。
 *
 * カップの輪郭パスは、保存ボタンの完了演出（`RecordForm.jsx`の
 * `PourIcon`）と同じものを再利用し、視覚的な一貫性を保っている。
 *
 * アニメーションはCSSの`@keyframes`のみで実装している
 * （`LandingPage`の`GraphIllustration.module.css`と同じ構成）。
 * このコンポーネントは13以上のファイルから読み込まれるため、
 * Framer Motionを持ち込まずCSS側だけで完結させることで、現状
 * Framer Motionに依存していないページのバンドルへ影響を与えない。
 *
 * 液面の`clip-path`は、アニメーションで`transform`が動く要素自身にではなく
 * 動かない親`<g>`へ付けている。同じ要素へ`clip-path`と
 * `transform-box: fill-box`を伴う`transform`アニメーションの両方を乗せると、
 * クリップ領域がtransformに追従しない挙動（Artifactでのモック検討中に
 * 実機で確認・ユーザー指摘により発覚）があったための対応。
 *
 * `size="sm"`（18px、`Loader2`の代わりにボタン内で使う）は`aria-hidden`の
 * みのアイコンとし、ボタン自体の`disabled`+ラベル文言切り替えで busy 状態を
 * 伝える（旧`Loader2`と同じ扱い）。`size="lg"`（72px、ページ/セクション
 * 全体のローディングで使う）は`aria-busy="true"`+`aria-label`を持つ
 * コンテナで囲み、削除した各スケルトンのルート要素と同じアクセシビリティ
 * 水準にする。`fillHeight`はGraph画面の全キャンバスローディングなど、
 * 親の高さいっぱいに中央表示したい場合に使う。
 */
function CoffeeLoader({ size = "sm", label, fillHeight = false, className = "" }) {
  const { t } = useTranslation();
  const clipId = useId();
  const px = DIMENSIONS[size];

  const icon = (
    <svg
      width={px}
      height={(px * 28) / 24}
      viewBox="0 0 24 28"
      fill="none"
      aria-hidden="true"
      className={styles.icon}
    >
      <path d={DRIPPER_PATH} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={CUP_PATH} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d={HANDLE_PATH} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <defs>
        <clipPath id={clipId}>
          <path d={CUP_FILL_CLIP_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect className={styles.fill} x="5.9" y="11" width="9.2" height="10.1" fill="currentColor" />
      </g>
      <ellipse className={styles.drop} cx="10.5" cy="7.6" rx="1" ry="1.3" fill="currentColor" />
    </svg>
  );

  if (size === "sm") {
    return className ? <span className={className}>{icon}</span> : icon;
  }

  return (
    <div
      aria-busy="true"
      aria-label={label ?? t("common.loading")}
      className={`flex items-center justify-center ${styles.lgColor} ${fillHeight ? "h-full min-h-64" : "py-16"} ${className}`}
    >
      {icon}
    </div>
  );
}

export default CoffeeLoader;
