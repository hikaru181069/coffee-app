// アプリのロゴマーク。産地・農園・品種などがrecordへリンクし合う知識グラフ
// （docs/product.mdのCore Experience: Record → Connect → Discover）を、
// ノード・エッジ+コーヒー豆のモチーフで表現する。
// 常に「Coffee App」という可視テキストと並べて使うため、aria-hiddenにして
// スクリーンリーダーでの二重読み上げを避ける。
function CoffeeLogo({ size = 24, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 17C15 8 26 5 35 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M39 14C42 24 39 34 32 39" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M27 42C17 41 10 35 8 25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      <circle cx="9" cy="19" r="3" fill="currentColor" />
      <circle cx="36" cy="9" r="3" fill="currentColor" />
      <circle cx="31" cy="40" r="3" fill="currentColor" />

      <ellipse cx="24" cy="24" rx="9" ry="12" transform="rotate(35 24 24)" fill="currentColor" />

      <path d="M19 31C19 25 24 24 29 17" stroke="var(--color-base)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export default CoffeeLogo;
