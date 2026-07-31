import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { unauthorizedError } from "../utils/AppError.js";

/**
 * JWTを検証し、req.user に認証済みユーザーを載せる。
 *
 * middleware/authMiddleware.js の protect と役割は同じだが、
 * エラー応答が docs/architecture.md の形式
 * （{ error: { code, message, details } }）になっている点が異なる。
 *
 * なぜ protect を書き換えず新設したのか:
 *   protect は既存のMLBルート18本が使っており、応答形式を変えると
 *   それらのAPIの互換性を壊す（CLAUDE.md「動作している認証を不要に
 *   書き換えない」「既存APIの互換性を理由なく壊さない」）。
 *   MLBルートは Phase 6 で削除予定なので、そのとき protect も一緒に
 *   消して、この authenticate に一本化する。
 *   → docs/mlb-legacy-inventory.md に記載
 *
 * ここが「userIdは認証情報から取得する」の起点になる。
 * 以降のcontrollerは req.user._id だけを見て、リクエスト本文の
 * userId は一切信用しない（docs/architecture.md の Security）。
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(unauthorizedError());
  }

  const token = authHeader.slice("Bearer ".length);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // 期限切れ・改ざん・秘密鍵違いをまとめて401にする。
    // どれが原因かをクライアントへ返すと、攻撃者に手がかりを与えるため。
    // トークン本体はログにも出さない（CLAUDE.md）
    return next(unauthorizedError("ログインの有効期限が切れています"));
  }

  // トークンが有効でも、退会などでユーザーが消えている可能性がある。
  // password は select("-password") で明示的に除外する
  const user = await User.findById(payload.userId).select("-password");

  if (!user) {
    return next(unauthorizedError());
  }

  req.user = user;
  next();
};
