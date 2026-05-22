import json
import base64
import requests
from pathlib import Path


API_URL = "http://127.0.0.1:25955/v1/responses"
API_KEY = "agt_codex_vCsqhXwMBrAF2s9FKjCh3ZmAg6lpFWnz"
MODEL = "gpt-5.5"


def extract_image_base64(response_json: dict) -> str | None:
    for item in response_json.get("output", []):
        if item.get("type") == "image_generation_call" and item.get("result"):
            return item["result"]
        for content in item.get("content", []):
            for key in ("b64_json", "image_base64", "data", "result"):
                if content.get(key):
                    return content[key]
    return None


def generate_image(prompt: str, output_file: str = "cat.png"):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "input": prompt,
        "tools": [{"type": "image_generation"}],
        "tool_choice": {"type": "image_generation"},
    }

    print(f"发送请求到 {API_URL} ...")
    resp = requests.post(API_URL, headers=headers, json=payload, timeout=300, stream=True)
    print(f"HTTP 状态码: {resp.status_code}")

    if resp.status_code >= 400:
        print(f"请求失败: {resp.text[:500]}")
        return

    # 解析 SSE 流，找到 response.completed 事件
    current_event = None
    completed_data = None

    for raw_line in resp.iter_lines(decode_unicode=True):
        if raw_line.startswith("event:"):
            current_event = raw_line[6:].strip()
        elif raw_line.startswith("data:") and current_event == "response.completed":
            completed_data = json.loads(raw_line[5:].strip())
            break  # 拿到最终结果就退出

    if completed_data is None:
        print("未收到 response.completed 事件")
        return

    response_obj = completed_data.get("response", completed_data)
    image_b64 = extract_image_base64(response_obj)

    if not image_b64:
        print("返回结果中没有图片数据")
        print(json.dumps(response_obj, ensure_ascii=False, indent=2)[:1000])
        return

    image_bytes = base64.b64decode(image_b64)
    Path(output_file).write_bytes(image_bytes)
    print(f"图片已保存: {output_file} ({len(image_bytes) / 1024:.1f} KB)")


if __name__ == "__main__":
    prompt = "画一只可爱的橘猫，坐在未来感电脑桌前，赛博朋克风格，高清插画"
    generate_image(prompt, "cat.png")
