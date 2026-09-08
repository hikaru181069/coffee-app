/**
 * パスワードの最小文字数。
 *
 * 新規登録（authValidator.js）とパスワード変更（userValidator.js）の
 * 両方が同じ値を独立に持っていたため、ポリシーを変える際の変更漏れを
 * 防ぐためここへ集約した。
 */
export const MIN_PASSWORD_LENGTH = 6;
