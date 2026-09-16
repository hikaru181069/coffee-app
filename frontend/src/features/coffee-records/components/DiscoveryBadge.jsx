import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getNodeVisual } from "../../graph/utils/nodeVisuals";

const AUTO_DISMISS_MS = 4200;

/**
 * 産地を選んだ直後に一瞬提示する「発見」の予告バッジ
 * （2026-09、「コーヒーキャンバス」）。
 *
 * `CoffeeComponentFields.jsx`が呼んでいた保存前プレビューAPI
 * （`POST /api/discoveries/preview`、docs/features.md「Save
 * Discoveries」の「保存前のプレビュー」参照）の結果を、以前はトースト
 * （`useToast`）で知らせていたが、キャンバスの一部として専用の見せ方へ
 * 差し替えた。ロジック（いつ何を表示するか）は変えていない。
 *
 * 保存後インタースティシャル（`SaveDiscoveryReveal.jsx`）とは別物：
 * あちらは実際に保存された後の確定した発見一覧、こちらは保存前の
 * 「今この産地を選ぶと、こうなる見込みです」という予告
 * （文言も`discoveries.previewFirstAppearance`/`previewMilestone`と、
 * 保存後専用の`discoveries.firstAppearance`/`milestone`で分けている）。
 */
function DiscoveryBadge({ discovery }) {
  const { t } = useTranslation();
  // 自動的に消した対象（discoveryオブジェクト自体）を覚えておき、
  // 「discoveryが有効、かつまだ消していない」ことをレンダー中に比較で
  // 求める。effect内でsetState("表示中"にする)を同期的に呼ぶと
  // カスケードするレンダーを招くため（react-hooks/set-state-in-effect）、
  // 「表示するかどうか」はstateを持たずderiveし、effectはタイマー
  // コールバック内でのみsetStateする
  const [dismissedDiscovery, setDismissedDiscovery] = useState(null);
  const isVisible = Boolean(discovery) && discovery !== dismissedDiscovery;

  useEffect(() => {
    if (!isVisible) return undefined;
    const timer = setTimeout(() => setDismissedDiscovery(discovery), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [discovery, isVisible]);

  if (!discovery) return null;

  const { icon: Icon, colorClass, bgTintClass } = getNodeVisual(discovery.nodeType);
  const message =
    discovery.type === "firstAppearance"
      ? t("discoveries.previewFirstAppearance", { label: discovery.label })
      : t("discoveries.previewMilestone", { label: discovery.label, count: discovery.recordCount });

  return (
    <AnimatePresence>
      {isVisible && (
        <Motion.div
          role="status"
          initial={{ opacity: 0, scale: 0.85, x: -8 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
          className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-2 py-1.5 pl-1.5 pr-3 text-xs text-text"
        >
          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${bgTintClass}`}>
            <Icon size={12} aria-hidden="true" className={colorClass} />
          </span>
          {message}
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

export default DiscoveryBadge;
