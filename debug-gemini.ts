import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Không tìm thấy GEMINI_API_KEY trong .env.local");
    return;
  }

  console.log("🔍 Đang truy vấn danh sách model khả dụng...");
  
  const versions = ['v1', 'v1beta'];
  
  for (const v of versions) {
    console.log(`\n--- Kiểm tra version: ${v} ---`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`);
      const json = await res.json();
      
      if (!res.ok) {
        console.error(`❌ Lỗi từ API (${v}):`, json.error?.message || res.statusText);
        continue;
      }

      if (json.models && json.models.length > 0) {
        console.log(`✅ Tìm thấy ${json.models.length} models:`);
        json.models.forEach((m: any) => {
          console.log(`   - ${m.name} (${m.displayName})`);
        });
      } else {
        console.log(`⚠️ Không tìm thấy model nào cho version ${v}.`);
      }
    } catch (err: any) {
      console.error(`❌ Lỗi kết nối (${v}):`, err.message);
    }
  }
}

listAllModels();
