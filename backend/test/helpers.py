import json
import io

def owner_headers(client):
    response = client.post("/login_process", data={"username": "李琪淳", "userpwd": "owner-password"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def journey_data(**changes):
    return {"adcodes": json.dumps(["320100"]), "name": json.dumps(["南京市"]), "departure_date": "2025-06-01", "return_date": "2025-06-02", **changes}


def photo_bytes(format="PNG", size=(1200, 800)):
    from PIL import Image
    data = io.BytesIO()
    Image.new("RGB", size, (212, 120, 143)).save(data, format=format)
    return data.getvalue()
