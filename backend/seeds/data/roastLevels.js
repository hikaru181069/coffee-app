/**
 * 焙煎度の初期候補。
 *
 * 他のマスターと違い、値が固定で順序を持つ（docs/domain-model.md）。
 * key は機械が使う識別子、order は「浅い→深い」の並び順。
 * 画面ではこの order 順にスライダーやボタンを並べる想定。
 */
export const roastLevels = [
  { name: "Light", key: "light", order: 1 },
  { name: "Medium Light", key: "medium-light", order: 2 },
  { name: "Medium", key: "medium", order: 3 },
  { name: "Medium Dark", key: "medium-dark", order: 4 },
  { name: "Dark", key: "dark", order: 5 },
];
