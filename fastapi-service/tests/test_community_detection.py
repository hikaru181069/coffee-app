from core.communityDetection import MIN_RECORD_COUNT, detect_communities


def _record(record_id):
    return {"id": f"record:{record_id}", "type": "record", "label": record_id}


def _attribute(node_id, node_type, label):
    return {"id": node_id, "type": node_type, "label": label}


def test_no_edges_returns_empty():
    nodes = [_record("r1"), _attribute("origin:1", "origin", "Ethiopia")]
    assert detect_communities(nodes, []) == []


def test_two_clear_clusters_are_separated_with_dominant_attributes():
    # クラスタA: Ethiopia/Washedの記録3件（MIN_RECORD_COUNTちょうど）
    # クラスタB: Brazil/Naturalの記録3件
    # AとBの間には共有ノードが無いため、完全に独立した2成分になる。
    nodes = [
        *[_record(f"a{i}") for i in range(3)],
        _attribute("origin:eth", "origin", "Ethiopia"),
        _attribute("process:washed", "process", "Washed"),
        *[_record(f"b{i}") for i in range(3)],
        _attribute("origin:bra", "origin", "Brazil"),
        _attribute("process:natural", "process", "Natural"),
    ]
    edges = [
        *[{"source": f"record:a{i}", "target": "origin:eth"} for i in range(3)],
        *[{"source": f"record:a{i}", "target": "process:washed"} for i in range(3)],
        *[{"source": f"record:b{i}", "target": "origin:bra"} for i in range(3)],
        *[{"source": f"record:b{i}", "target": "process:natural"} for i in range(3)],
    ]

    communities = detect_communities(nodes, edges)

    assert len(communities) == 2
    assert {c["recordCount"] for c in communities} == {3, 3}
    labels = {frozenset(c["dominantAttributes"]["origin"]) for c in communities}
    assert labels == {frozenset(["Ethiopia"]), frozenset(["Brazil"])}


def test_small_cluster_below_threshold_is_excluded():
    assert MIN_RECORD_COUNT == 3, "このテストは閾値3を前提にしている"

    nodes = [
        *[_record(f"r{i}") for i in range(2)],
        _attribute("origin:eth", "origin", "Ethiopia"),
    ]
    edges = [{"source": f"record:r{i}", "target": "origin:eth"} for i in range(2)]

    assert detect_communities(nodes, edges) == []


def test_dominant_attributes_never_include_record_type():
    nodes = [
        *[_record(f"r{i}") for i in range(3)],
        _attribute("origin:eth", "origin", "Ethiopia"),
    ]
    edges = [{"source": f"record:r{i}", "target": "origin:eth"} for i in range(3)]

    communities = detect_communities(nodes, edges)

    assert len(communities) == 1
    assert "record" not in communities[0]["dominantAttributes"]
