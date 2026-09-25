from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_detect_communities_endpoint_returns_grouped_result():
    nodes = [
        {"id": f"record:{i}", "type": "record", "label": f"Record {i}"} for i in range(3)
    ] + [{"id": "origin:eth", "type": "origin", "label": "Ethiopia"}]
    edges = [{"source": f"record:{i}", "target": "origin:eth"} for i in range(3)]

    response = client.post("/graph/communities", json={"nodes": nodes, "edges": edges})

    assert response.status_code == 200
    body = response.json()
    assert len(body["communities"]) == 1
    community = body["communities"][0]
    assert community["id"] == 0
    assert community["recordCount"] == 3
    assert community["dominantAttributes"] == {"origin": ["Ethiopia"]}
    assert set(community["nodeIds"]) == {"record:0", "record:1", "record:2", "origin:eth"}


def test_detect_communities_endpoint_with_no_edges_returns_empty_list():
    response = client.post(
        "/graph/communities",
        json={"nodes": [{"id": "record:1", "type": "record", "label": "Record 1"}], "edges": []},
    )

    assert response.status_code == 200
    assert response.json() == {"communities": []}
