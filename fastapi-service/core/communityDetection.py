"""
知識グラフのコミュニティ検出（記録のグルーピング）。

「同じ記録の中で一緒に登場する属性（産地・精製方法・フレーバー等）が
多いノード同士」をNetworkXのgreedy modularity法でグループ分けする。
DBには一切依存しない、受け取ったnodes/edgesだけで完結する純粋関数
（docs/architecture.mdの「DBに依存しない計算」に対応する、このサービス
最初の実装）。

他の発見系機能（Insight/Discover/Similar Records/Save Discoveries）と
同じ「偶然の一致を断定しない」考え方で、記録数が少ないグループは
結果から除外する。
"""

from collections import defaultdict

import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

# このグループに含まれる record ノードがこれ未満なら、意味のある
# まとまりとして報告しない（Similar Recordsの共有属性数しきい値などと
# 同じ考え方の閾値）。
MIN_RECORD_COUNT = 3

# 同じ属性種別（origin/process/flavor等）が多数含まれるグループでも、
# 表示が煩雑にならないよう代表ラベルはこの件数までに絞る。
MAX_LABELS_PER_TYPE = 3

# 2026-09、当初はグループ数の上限（MAX_COMMUNITIES=5）を設けていたが、
# 「コーヒーの記録には必ずつながりを見せたい（Record→Connect→Discoverが
# このアプリのテーマのため）」という方針のもと撤廃した。MIN_RECORD_COUNT
# を満たす（＝偶然の一致ではないと言える）グループは、6番目以降でも
# 恣意的に隠さず全て返す。


def detect_communities(nodes: list[dict], edges: list[dict]) -> list[dict]:
    """
    nodes: [{"id": str, "type": str, "label": str}, ...]
    edges: [{"source": str, "target": str}, ...]

    戻り値: [{"recordCount": int, "dominantAttributes": {type: [label, ...]}, "nodeIds": [str, ...]}, ...]
    （record数が多い順。idは呼び出し側で付与する）
    """
    graph = nx.Graph()
    for node in nodes:
        graph.add_node(node["id"], type=node["type"], label=node["label"])
    for edge in edges:
        graph.add_edge(edge["source"], edge["target"])

    # エッジが無い（記録が1件もつながりを持たない）場合、
    # greedy_modularity_communities はそのまま使えないため空を返す。
    if graph.number_of_edges() == 0:
        return []

    raw_communities = greedy_modularity_communities(graph)

    results = []
    for member_ids in raw_communities:
        record_count = 0
        labels_by_type = defaultdict(set)

        for node_id in member_ids:
            node_type = graph.nodes[node_id]["type"]
            if node_type == "record":
                record_count += 1
            else:
                labels_by_type[node_type].add(graph.nodes[node_id]["label"])

        if record_count < MIN_RECORD_COUNT:
            continue

        dominant_attributes = {
            node_type: sorted(labels)[:MAX_LABELS_PER_TYPE]
            for node_type, labels in labels_by_type.items()
        }

        results.append(
            {
                "recordCount": record_count,
                "dominantAttributes": dominant_attributes,
                # フロントエンドがノード単位の所属判定に使う（ソートは
                # 出力の安定性のためだけで、意味は持たない）。
                "nodeIds": sorted(member_ids),
            }
        )

    results.sort(key=lambda community: community["recordCount"], reverse=True)
    return results
