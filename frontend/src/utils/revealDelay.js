/**
 * カード一覧をスクロールインで段階的にカスケード表示するための、
 * インデックスに応じた遅延クラス名。frontend/src/App.cssの
 * `.reveal-delay-1〜3`（0/80/160/240ms）に対応する。
 *
 * 定義済みの遅延段階は3つまでなので、それ以降のインデックスは
 * 巡回させる（長い一覧でも待ち時間が際限なく伸びないようにする）。
 */
const DELAY_CLASSES = ["", "reveal-delay-1", "reveal-delay-2", "reveal-delay-3"];

export const revealDelayClass = (index) => DELAY_CLASSES[index % DELAY_CLASSES.length];
