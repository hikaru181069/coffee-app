# 開発環境の定義（Nix）。direnv を入れていれば、このフォルダに入るだけで有効になる（.envrc を参照）
# direnv がない場合は `nix develop` で同じ環境のシェルに入れる
#
# 版は Docker（Dockerfile）・CI（.github/workflows/test.yml）と揃える:
#   Node.js 22 / Python 3.13
# MongoDB・Prometheus・Grafana などのサービスは、これまでどおり Docker Compose で動かす
{
  description = "coffee-app の開発環境";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22 # frontend・backend（npm も含む）
            pkgs.python313 # fastapi-service
            pkgs.uv # Python の仮想環境（.venv）の作成と依存のインストール
            pkgs.mongosh # Docker の MongoDB に接続して中身を見る
          ];
          # uv が独自に Python をダウンロードしないようにする（上の python313 を使う）
          UV_PYTHON_DOWNLOADS = "never";
        };
      });
    };
}
