import requests
import sys

# Hugging Face Space URL (Direct URL)
# README_DEPLOY.md에 따라 사용자가 설정한 URL을 입력해야 합니다.
# 기본적으로 https://kwonyeonwoo-anti-ai-filter.hf.space 형태입니다.
API_URL = "https://kwonyeonwoo-anti-ai-filter.hf.space"

def test_api():
    print(f"Connecting to: {API_URL}")
    try:
        # 1. Health check (Root endpoint)
        response = requests.get(API_URL, timeout=10)
        if response.status_code == 200:
            print(f"✅ Root endpoint: SUCCESS! ({response.json()['message']})")
        else:
            print(f"❌ Root endpoint: FAILED! (Status code: {response.status_code})")
            return

        # 2. Check /protect endpoint (Options request for CORS)
        print("Checking CORS and endpoint availability...")
        response = requests.options(f"{API_URL}/protect", timeout=10)
        if response.status_code in [200, 204]:
            print("✅ /protect endpoint: SUCCESS! (CORS ready)")
        else:
            print(f"❌ /protect endpoint: FAILED! (Status code: {response.status_code})")

    except requests.exceptions.ConnectionError:
        print("❌ FAILED: Could not connect to the API. Is it still building or is the URL wrong?")
    except Exception as e:
        print(f"❌ FAILED: An unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        API_URL = sys.argv[1].rstrip('/')
    test_api()
