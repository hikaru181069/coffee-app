// アーキタイプごとの色。HomePage の Browse by Style タイルと同じ配色に揃える。
export const ARCHETYPE_COLORS = {
  "Power Hitter": "var(--ctp-red)",
  Speedster: "var(--ctp-green)",
  "Contact Hitter": "var(--ctp-yellow)",
  Ace: "var(--ctp-mauve)",
  "Power Pitcher": "var(--ctp-sapphire)",
  Workhorse: "var(--ctp-teal)",
  "Elite Defender": "var(--ctp-blue)",
};

export const getArchetypeColor = (label) => ARCHETYPE_COLORS[label] || "var(--ctp-blue)";
