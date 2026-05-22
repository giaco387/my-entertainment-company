import json
import base64
import requests
from pathlib import Path

API_URL = "http://127.0.0.1:25955/v1/responses"
API_KEY = "agt_codex_vCsqhXwMBrAF2s9FKjCh3ZmAg6lpFWnz"
MODEL = "gpt-5.5"

ARTISTS = [
    {
        "name": "赵紫妍",
        "file": "赵紫妍.png",
        "prompt": (
            "Portrait of a young East Asian female pop singer, late 20s, stage name Zhao Ziyan. "
            "Long silky black hair with subtle highlights, elegant and powerful stage presence. "
            "Wearing a sleek modern performance outfit in deep violet and silver. "
            "Microphone in hand, warm studio spotlight, confident and soulful expression. "
            "K-pop idol aesthetic, high-fashion editorial style, 4K digital illustration, "
            "no text, no watermark."
        ),
    },
    {
        "name": "林梓萱",
        "file": "林梓萱.png",
        "prompt": (
            "Portrait of a young East Asian female all-round entertainer, early 20s, "
            "stage name Lin Zixuan. Short chic dark bob hair, bright expressive eyes, "
            "charismatic and versatile vibe. Wearing a stylish casual-chic outfit — "
            "cropped blazer over tank top. Standing against a clean pastel background. "
            "Modern idol style, high-quality digital illustration, editorial magazine cover look, "
            "no text, no watermark."
        ),
    },
    {
        "name": "陈浩然",
        "file": "陈浩然.png",
        "prompt": (
            "Portrait of a young East Asian male actor, mid 20s, stage name Chen Haoran. "
            "Clean sharp facial features, slightly wavy dark hair, calm and intense gaze. "
            "Wearing a fitted black turtleneck, professional actor headshot style. "
            "Subtle cinematic lighting, neutral dark background. "
            "Contemporary drama idol aesthetic, realistic digital art, 4K quality, "
            "no text, no watermark."
        ),
    },
    {
        "name": "夏晨阳",
        "file": "夏晨阳.png",
        "prompt": (
            "Portrait of a young East Asian male idol, early 20s, stage name Xia Chenyang. "
            "Warm sun-kissed look, light brown styled hair, friendly and energetic smile. "
            "Wearing a casual streetwear outfit — varsity jacket, clean sneakers. "
            "Bright natural outdoor lighting background, urban city vibe. "
            "Fresh-faced boy-group member aesthetic, vibrant digital illustration, "
            "no text, no watermark."
        ),
    },
    {
        "name": "韩依依",
        "file": "韩依依.png",
        "prompt": (
            "Portrait of a young East Asian female idol, late teens to early 20s, "
            "stage name Han Yiyi. Cute and youthful appearance, straight dark hair with bangs, "
            "pink-toned glowy skin, cheerful and sweet expression. "
            "Wearing a light pastel dress with accessories, sparkly idol concept. "
            "Soft dreamy background with bokeh lights. "
            "Girl group member aesthetic, high-quality digital illustration, "
            "no text, no watermark."
        ),
    },
]


def extract_image_base64(response_json: dict) -> str | None:
    for item in response_json.get("output", []):
        if item.get("type") == "image_generation_call" and item.get("result"):
            return item["result"]
        for content in item.get("content", []):
            for key in ("b64_json", "image_base64", "data", "result"):
                if content.get(key):
                    return content[key]
    return None


def generate_image(artist: dict):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "input": artist["prompt"],
        "tools": [{"type": "image_generation"}],
        "tool_choice": {"type": "image_generation"},
    }

    print(f"\n[{artist['name']}] 发送请求...")
    resp = requests.post(API_URL, headers=headers, json=payload, timeout=300, stream=True)
    print(f"[{artist['name']}] HTTP {resp.status_code}")

    if resp.status_code >= 400:
        print(f"[{artist['name']}] 请求失败: {resp.text[:300]}")
        return False

    current_event = None
    completed_data = None

    for raw_line in resp.iter_lines(decode_unicode=True):
        if raw_line.startswith("event:"):
            current_event = raw_line[6:].strip()
        elif raw_line.startswith("data:") and current_event == "response.completed":
            completed_data = json.loads(raw_line[5:].strip())
            break

    if completed_data is None:
        print(f"[{artist['name']}] 未收到 response.completed 事件")
        return False

    response_obj = completed_data.get("response", completed_data)
    image_b64 = extract_image_base64(response_obj)

    if not image_b64:
        print(f"[{artist['name']}] 返回结果中没有图片数据")
        print(json.dumps(response_obj, ensure_ascii=False, indent=2)[:500])
        return False

    image_bytes = base64.b64decode(image_b64)
    out_path = Path(__file__).parent / artist["file"]
    out_path.write_bytes(image_bytes)
    print(f"[{artist['name']}] 已保存: {out_path.name} ({len(image_bytes)/1024:.1f} KB)")
    return True


if __name__ == "__main__":
    success = 0
    for artist in ARTISTS:
        if generate_image(artist):
            success += 1
    print(f"\n完成：{success}/{len(ARTISTS)} 张图片生成成功")
