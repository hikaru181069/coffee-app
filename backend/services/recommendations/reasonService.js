// 「なぜこの選手がおすすめか」を具体的な文言にする。
// docs/product-principles.md の原則5(Every Recommendation Needs a Reason)対応。
// 新しいモデルは使わず、既存のarchetypes(ラベル)とstyleScores(パーセンタイル)を
// 組み合わせて文章を組み立てるだけ。

const HITTER_LABELS = { power: "Power", speed: "Speed", contact: "Contact", defense: "Defense" };
const PITCHER_LABELS = { dominance: "Dominance", control: "Control", durability: "Durability" };

// お気に入り選手とマッチ選手が共通のアーキタイプ(例: 両者とも"Elite Defender")を
// 持っていれば、それが最も分かりやすい理由になる。
const findSharedArchetype = (seedArchetypes = [], matchArchetypes = []) =>
  matchArchetypes.find((a) => seedArchetypes.includes(a));

// 共通アーキタイプが無い場合、2人のstyleScoresを比較し、
// 「両者とも高水準」かつ「差が小さい」軸を1〜2個選んで理由にする。
const findCloseStrengths = (seedScores, matchScores, isPitcher) => {
  const labels = isPitcher ? PITCHER_LABELS : HITTER_LABELS;

  const closeness = Object.keys(labels)
    .map((key) => ({
      key,
      avg: ((seedScores[key] ?? 0) + (matchScores[key] ?? 0)) / 2,
      diff: Math.abs((seedScores[key] ?? 0) - (matchScores[key] ?? 0)),
    }))
    .filter((c) => c.avg >= 55)
    .sort((a, b) => a.diff - b.diff);

  return closeness.slice(0, 2).map((c) => labels[c.key]);
};

const buildMatchReason = ({ seedName, seedArchetypes, matchArchetypes, seedScores, matchScores, isPitcher }) => {
  const shared = findSharedArchetype(seedArchetypes, matchArchetypes);
  if (shared) {
    return `${shared}, like ${seedName}`;
  }

  if (seedScores && matchScores) {
    const strengths = findCloseStrengths(seedScores, matchScores, isPitcher);
    if (strengths.length > 0) {
      return `${strengths.join(" and ")} close to ${seedName}'s profile`;
    }
  }

  return `Similar to ${seedName}`;
};

module.exports = { buildMatchReason };
