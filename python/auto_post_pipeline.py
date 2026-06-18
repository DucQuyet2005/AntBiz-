"""
AUTO POST PIPELINE
==================
Flow: URL → Crawl → Preprocess → Gemini viết content → Đăng Facebook Page (kèm ảnh + hashtag gốc)
"""

import argparse
import json
import os
import re
import tempfile
import time
import urllib.request

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from google import genai
from dotenv import load_dotenv

# Load biến môi trường từ file .env
load_dotenv()

# ============================================================
# ⚙️  CẤU HÌNH - Đọc từ file .env
# ============================================================
CONFIG = {
    "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", ""),
    "GEMINI_MODEL": os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    "FB_PAGE_ID": os.getenv("FB_PAGE_ID", ""),
    "FB_PAGE_ACCESS_TOKEN": os.getenv("FB_PAGE_ACCESS_TOKEN", ""),
    "FB_POST_TONE": os.getenv("FB_POST_TONE", "engaging, conversational, suitable for Vietnamese Gen-Z and millennials"),
    "FB_POST_MAX_LENGTH": int(os.getenv("FB_POST_MAX_LENGTH", "2000")),
}

# Kiểm tra các key bắt buộc
def check_config(need_gemini=True, need_fb=True):
    _missing = []
    if need_gemini and not CONFIG["GEMINI_API_KEY"]:
        _missing.append("GEMINI_API_KEY")
    if need_fb and not CONFIG["FB_PAGE_ID"]:
        _missing.append("FB_PAGE_ID")
    if need_fb and not CONFIG["FB_PAGE_ACCESS_TOKEN"]:
        _missing.append("FB_PAGE_ACCESS_TOKEN")
    if _missing:
        raise SystemExit(f"❌ Thiếu biến môi trường trong .env: {', '.join(_missing)}")
# ============================================================


# ────────────────────────────────────────────────────────────
# BƯỚC 1: CRAWL
# ────────────────────────────────────────────────────────────

def crawl_url(url: str) -> dict:
    print(f"\n📥 [1/5] Đang crawl: {url}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            )
        )
        page.goto(url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        title = page.title()
        content_html = ""

        for selector in ["#html_content", "article", "main", "[class*='content']"]:
            el = page.query_selector(selector)
            if el:
                html = el.inner_html()
                if html.strip():
                    content_html = html
                    break

        if not content_html.strip():
            page.wait_for_timeout(3000)
            for selector in ["#html_content", "article", "main"]:
                el = page.query_selector(selector)
                if el:
                    html = el.inner_html()
                    if html.strip():
                        content_html = html
                        break

        # Lấy toàn bộ page HTML để parse ảnh og:image nếu cần
        full_page_html = page.content()
        browser.close()

    if not content_html.strip():
        raise RuntimeError(f"❌ Không crawl được nội dung từ: {url}")

    print(f"   ✅ Crawl thành công - HTML dài {len(content_html)} ký tự")
    return {
        "url": url,
        "title": title,
        "content_html": content_html,
        "full_page_html": full_page_html,
        "crawled_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }


# ────────────────────────────────────────────────────────────
# BƯỚC 2: PREPROCESS
# ────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _ancestors(el):
    chain = []
    cur = el
    while cur is not None:
        chain.append(cur)
        cur = cur.parent
    return chain


def find_article_scope(soup, h1, content_root):
    """
    full_page_html chứa cả sidebar (Gợi ý theo dõi, Spotlight, Hashtag nổi bật...)
    nên select_one() tìm trên toàn trang rất dễ dính nhầm phần tử của sidebar
    (cũng có hashtag link, tên font-bold, ngày dạng text-gray-400...).
    Để tránh, tìm "vùng bài viết" = common ancestor gần nhất của <h1> và
    #html_content (2 mốc chắc chắn chỉ thuộc về bài viết), rồi chỉ tìm
    category/author/date/views/tags trong vùng đó.
    """
    if h1 is None or content_root is None:
        return soup
    h1_chain = _ancestors(h1)
    content_chain_ids = {id(x) for x in _ancestors(content_root)}
    for node in h1_chain:
        if id(node) in content_chain_ids:
            return node
    return soup


def preprocess(raw: dict) -> dict:
    print("\n🔧 [2/5] Đang tiền xử lý dữ liệu...")

    # Parse từ full_page_html để có đủ tất cả thông tin (category, author, tags...)
    # content_html chỉ là một phần, không đủ
    full_html = raw.get("full_page_html", "") or raw.get("content_html", "")
    soup = BeautifulSoup(full_html, "html.parser")

    h1 = soup.find("h1")
    content_root = soup.select_one("#html_content")
    scope = find_article_scope(soup, h1, content_root)

    # Category (hashtag đầu bài, ví dụ #Tổ ấm 4.0) - tìm trong vùng bài viết,
    # không lấy nhầm hashtag ở sidebar "Hashtag nổi bật"
    category = ""
    cat_el = scope.select_one("a[href^='/hashtag/']")
    if cat_el:
        category = clean_text(cat_el.get_text())

    # Title
    title = raw.get("title", "")
    if h1:
        title = clean_text(h1.get_text())

    # Description / sapo
    description = ""
    desc_el = scope.select_one("p.mb-5")
    if desc_el:
        description = clean_text(desc_el.get_text())

    # Author - không lấy nhầm tên trong "Gợi ý theo dõi"
    author = ""
    author_el = scope.select_one("span.font-bold.text-gray-900")
    if author_el:
        author = clean_text(author_el.get_text())

    # Published date - không lấy nhầm "10 giờ trước" / ngày bài Spotlight
    published_at = ""
    date_el = scope.select_one("p.text-gray-400")
    if date_el:
        published_at = clean_text(date_el.get_text())

    # Views
    views = ""
    eye_icon = scope.select_one("svg.lucide-eye")
    if eye_icon:
        parent = eye_icon.find_parent("span")
        if parent:
            views = clean_text(parent.get_text())

    # Body content + ảnh từ #html_content
    body_paragraphs = []
    images = []

    if content_root:
        for block in content_root.select("[data-content-type]"):
            btype = block.get("data-content-type")
            if btype == "paragraph":
                text = clean_text(block.get_text())
                if text:
                    body_paragraphs.append({"type": "paragraph", "text": text})
            elif btype == "heading":
                text = clean_text(block.get_text())
                if text:
                    level = block.get("data-level", "2")
                    body_paragraphs.append({"type": f"heading{level}", "text": text})
            elif btype == "image":
                img_url = block.get("data-url", "")
                caption = block.get("data-caption", "")
                if img_url:
                    images.append({"url": img_url, "caption": clean_text(caption)})
                    body_paragraphs.append({
                        "type": "image",
                        "url": img_url,
                        "caption": clean_text(caption)
                    })
    else:
        for p in soup.find_all(["p", "h2", "h3"]):
            text = clean_text(p.get_text())
            if text and len(text) > 20:
                tag = p.name
                btype = "paragraph" if tag == "p" else f"heading{tag[1]}"
                body_paragraphs.append({"type": btype, "text": text})

    # Fallback ảnh từ og:image nếu không có ảnh trong content
    if not images:
        og_img = soup.find("meta", property="og:image")
        if og_img and og_img.get("content"):
            images.append({"url": og_img["content"], "caption": title})
            print("   📸 Dùng og:image làm ảnh đại diện")

    # Tags - chỉ lấy tag bài viết trong vùng bài viết (tránh dính nút dạng
    # rounded-full ở sidebar/widget khác nếu site thêm sau này)
    tags = []
    for a in scope.select("a.rounded-full"):
        href = a.get("href", "")
        if "/tag/" in href:
            t = clean_text(a.get_text())
            if t and t not in tags:
                tags.append(t)

    full_text = "\n".join(
        p["text"] for p in body_paragraphs if p.get("type") != "image"
    )

    print(f"   ✅ Preprocess xong - {len(body_paragraphs)} blocks, {len(images)} ảnh, {len(tags)} hashtag")
    print(f"   🏷️  Hashtag gốc: {', '.join(tags)}")
    print(f"   📸 Ảnh: {[i['url'][:60]+'...' for i in images[:3]]}")

    return {
        "url": raw["url"],
        "title": title,
        "category": category,
        "description": description,
        "author": author,
        "published_at": published_at,
        "views": views,
        "tags": tags,
        "images": images,
        "body": body_paragraphs,
        "full_text": full_text,
    }


# ────────────────────────────────────────────────────────────
# BƯỚC 3: GEMINI VIẾT CONTENT
# ────────────────────────────────────────────────────────────

GEMINI_PROMPT_TEMPLATE = """
Bạn là một content writer chuyên viết bài đăng Facebook viral cho người Việt Nam.

Dưới đây là thông tin bài viết gốc:
---
Tiêu đề: {title}
Mô tả: {description}
Danh mục: {category}
Nội dung:
{full_text}
---

Hashtag có sẵn từ bài gốc (BẮT BUỘC dùng đúng các hashtag này, không thay đổi, không thêm hashtag mới):
{tags}

Nhiệm vụ: Viết lại thành 1 bài đăng Facebook hấp dẫn theo các yêu cầu sau:

1. **Ngôn ngữ**: Tiếng Việt, gần gũi, đời thường
2. **Tone**: {tone}
3. **Độ dài**: Tối đa {max_length} ký tự (KHÔNG tính hashtag)
4. **Cấu trúc**:
   - Mở đầu: 1-2 câu hook gây tò mò hoặc đặt câu hỏi cuốn người đọc
   - Thân bài: Kể lại câu chuyện/ý chính theo kiểu tự nhiên, dễ đọc, có cảm xúc
   - Cuối bài: 1 câu hỏi tương tác khuyến khích comment
5. **Cuối cùng**: Thêm các hashtag gốc vào cuối bài (đúng như đã cung cấp)

**KHÔNG**: Copy nguyên văn, không dùng từ học thuật khô khan, không dùng bullet point

Chỉ trả về nội dung bài đăng Facebook hoàn chỉnh, không giải thích thêm.
"""


def generate_fb_content(data: dict) -> str:
    print("\n🤖 [3/5] Gemini đang viết content...")

    client = genai.Client(api_key=CONFIG["GEMINI_API_KEY"])

    full_text = data.get("full_text", "")
    if len(full_text) > 8000:
        full_text = full_text[:8000] + "\n...[nội dung còn tiếp]"

    # Format hashtag đúng như bài gốc
    tags = data.get("tags", [])
    tags_str = " ".join(tags) if tags else "(không có hashtag)"

    prompt = GEMINI_PROMPT_TEMPLATE.format(
        title=data.get("title", ""),
        description=data.get("description", ""),
        category=data.get("category", ""),
        full_text=full_text,
        tags=tags_str,
        tone=CONFIG["FB_POST_TONE"],
        max_length=CONFIG["FB_POST_MAX_LENGTH"],
    )

    response = client.models.generate_content(
        model=CONFIG["GEMINI_MODEL"],
        contents=prompt,
    )
    content = response.text.strip()

    print(f"   ✅ Gemini viết xong - {len(content)} ký tự")
    return content


# ────────────────────────────────────────────────────────────
# BƯỚC 4: UPLOAD ẢNH LÊN FACEBOOK
# ────────────────────────────────────────────────────────────

def download_image(img_url: str, tmp_dir: str) -> str:
    """Download ảnh về máy tạm thời để upload lên FB."""
    ext = img_url.split("?")[0].split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
        ext = "jpg"
    filename = os.path.join(tmp_dir, f"img_{int(time.time()*1000)}.{ext}")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(img_url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        with open(filename, "wb") as f:
            f.write(resp.read())
    return filename


def upload_photo_to_fb(img_url: str, caption: str, tmp_dir: str) -> str | None:
    """
    Upload 1 ảnh lên FB Page (unpublished), trả về photo_id.
    Dùng endpoint /photos với published=false để gắn vào bài sau.
    """
    page_id = CONFIG["FB_PAGE_ID"]
    token = CONFIG["FB_PAGE_ACCESS_TOKEN"]

    try:
        local_path = download_image(img_url, tmp_dir)
        with open(local_path, "rb") as f:
            res = requests.post(
                f"https://graph.facebook.com/v19.0/{page_id}/photos",
                data={
                    "access_token": token,
                    "published": "false",  # upload nhưng chưa đăng
                    "caption": caption,
                },
                files={"source": f},
                timeout=60,
            )
        result = res.json()
        if "id" in result:
            photo_id = result["id"]
            print(f"      📸 Upload ảnh OK → photo_id: {photo_id}")
            return photo_id
        else:
            print(f"      ⚠️  Upload ảnh thất bại: {result.get('error', {}).get('message', '?')}")
            return None
    except Exception as e:
        print(f"      ⚠️  Lỗi upload ảnh: {e}")
        return None


# ────────────────────────────────────────────────────────────
# BƯỚC 5: ĐĂNG BÀI LÊN FACEBOOK PAGE
# ────────────────────────────────────────────────────────────

def post_to_facebook(content: str, images: list, source_url: str = None) -> dict:
    print("\n📤 [5/5] Đang đăng lên Facebook Page...")

    page_id = CONFIG["FB_PAGE_ID"]
    token = CONFIG["FB_PAGE_ACCESS_TOKEN"]

    message = content
    if source_url:
        message += f"\n\n🔗 Nguồn: {source_url}"

    # Upload ảnh trước (tối đa 4 ảnh)
    photo_ids = []
    if images:
        print(f"   📸 Đang upload {min(len(images), 4)} ảnh...")
        with tempfile.TemporaryDirectory() as tmp_dir:
            for img in images[:4]:
                pid = upload_photo_to_fb(img["url"], img.get("caption", ""), tmp_dir)
                if pid:
                    photo_ids.append(pid)

    # Đăng bài
    if photo_ids:
        # Đăng bài kèm nhiều ảnh
        payload = {
            "message": message,
            "access_token": token,
        }
        # Thêm attached_media cho từng ảnh
        for i, pid in enumerate(photo_ids):
            payload[f"attached_media[{i}]"] = json.dumps({"media_fbid": pid})

        res = requests.post(
            f"https://graph.facebook.com/v19.0/{page_id}/feed",
            data=payload,
            timeout=30,
        )
    else:
        # Đăng bài text only
        print("   ⚠️  Không có ảnh, đăng text only")
        res = requests.post(
            f"https://graph.facebook.com/v19.0/{page_id}/feed",
            data={"message": message, "access_token": token},
            timeout=30,
        )

    result = res.json()
    if res.status_code == 200 and "id" in result:
        post_id = result["id"]
        print(f"   ✅ Đăng thành công!")
        print(f"   📎 Post ID: {post_id}")
        print(f"   🔗 https://www.facebook.com/{post_id.replace('_', '/posts/')}")
        return {"success": True, "post_id": post_id}
    else:
        error = result.get("error", {})
        print(f"   ❌ Đăng thất bại: {error.get('message', 'Unknown error')}")
        return {"success": False, "error": error}


# ────────────────────────────────────────────────────────────
# MAIN PIPELINE
# ────────────────────────────────────────────────────────────

def run_pipeline(url: str, dry_run: bool = False, save_data: bool = True, preprocess_only: bool = False):
    print("=" * 60)
    print("🚀 AUTO POST PIPELINE")
    print("=" * 60)
    print(f"URL: {url}")
    if preprocess_only:
        print("🔧 PREPROCESS ONLY MODE - Sẽ chỉ cào và tiền xử lý dữ liệu")
    elif dry_run:
        print("⚠️  DRY RUN MODE - Sẽ không đăng lên Facebook")
    print("=" * 60)

    if not preprocess_only:
        check_config(need_gemini=True, need_fb=not dry_run)

    try:
        # Bước 1: Crawl
        raw_data = crawl_url(url)

        # Bước 2: Preprocess
        clean_data = preprocess(raw_data)

        if save_data:
            os.makedirs("pipeline_output", exist_ok=True)
            slug = url.rstrip("/").split("/")[-1][:50]
            out_path = f"pipeline_output/{slug}.json"
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(clean_data, f, ensure_ascii=False, indent=2)
            print(f"\n   💾 Đã lưu: {out_path}")

        if preprocess_only:
            print("\n   ✅ Tiền xử lý dữ liệu hoàn tất.")
            print("=" * 60)
            return {"success": True, "preprocessed": True, "data": clean_data}

        # Bước 3: Gemini viết content
        fb_content = generate_fb_content(clean_data)

        # Preview
        print("\n" + "─" * 60)
        print("📋 PREVIEW NỘI DUNG SẼ ĐĂNG:")
        print("─" * 60)
        print(fb_content)
        print("─" * 60)
        print(f"📏 Độ dài: {len(fb_content)} ký tự")
        print(f"📸 Số ảnh: {len(clean_data.get('images', []))}")
        print(f"🏷️  Hashtag: {' '.join(clean_data.get('tags', []))}")

        # Bước 4+5: Upload ảnh + Đăng FB
        if dry_run:
            print("\n✋ DRY RUN - Bỏ qua bước đăng Facebook")
            result = {"success": True, "dry_run": True}
        else:
            result = post_to_facebook(
                content=fb_content,
                images=clean_data.get("images", []),
                source_url=url,
            )

        print("\n" + "=" * 60)
        print("🎉 PIPELINE HOÀN TẤT!" if result["success"] else "❌ PIPELINE THẤT BẠI")
        print("=" * 60)
        return result

    except Exception as e:
        print(f"\n❌ LỖI: {e}")
        raise


# ────────────────────────────────────────────────────────────
# ENTRY POINT
# ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Auto Post Pipeline: URL → FB Page")
    parser.add_argument("--url", required=True, help="URL bài viết cần xử lý")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ xem, không đăng")
    parser.add_argument("--no-save", action="store_true", help="Không lưu file JSON")
    parser.add_argument("--preprocess-only", action="store_true", help="Chỉ cào và tiền xử lý dữ liệu")
    args = parser.parse_args()

    run_pipeline(url=args.url, dry_run=args.dry_run, save_data=not args.no_save, preprocess_only=args.preprocess_only)