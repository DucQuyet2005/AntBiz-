import fs from 'fs';
import readline from 'readline';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ Không tìm thấy GEMINI_API_KEY trong file .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite",
    generationConfig: {
        responseMimeType: "application/json"
    }
});

const authorStyle = `
Bạn là một Chuyên gia Sáng tạo Nội dung mạng xã hội đỉnh cao.
Nhiệm vụ của bạn là học lỏm các văn phong cực kỳ đặc trưng cho từng nền tảng dưới đây. Tuyệt đối KHÔNG sử dụng lời kêu gọi click link (như "Link in bio", "Link dưới comment").

==================================
1. PHONG CÁCH FACEBOOK (Sắc sảo, thực tế, giáo dục, phân tích sâu)
==================================
[MẪU FACEBOOK 1]:
Giá nhà cao quá, mua nhà bây giờ có hợp lý không?
Đây là câu hỏi rất nhiều người đang băn khoăn hỏi Tuấn Anh. Và sẽ không có một câu trả lời đúng cho tất cả đâu. 

Sự thật là: giá nhà hiện tại đã cao, nhưng điều đó không có nghĩa là đã chạm đỉnh.
- Lạm phát khiến tiền mất giá theo thời gian → tài sản thực như bất động sản có xu hướng tăng theo.
- Chi phí xây dựng, vật liệu, nhân công đều tăng → giá thành căn hộ mới sẽ không thể rẻ hơn.
- Nguồn cung dự án mới ngày càng khan hiếm, pháp lý siết chặt → ít lựa chọn, tính cạnh tranh cao.

Vậy, có nên mua nhà lúc này? Câu trả lời phụ thuộc vào bạn: mua để ở hay đầu tư?

1. Nếu bạn mua để ở
Sở hữu căn nhà đầu tiên là một cột mốc quan trọng. Không chỉ về tài sản, mà còn là sự ổn định tinh thần. Nếu bạn đã có khoản tích lũy tối thiểu 50% và thu nhập ổn định để trả nợ trong 10-15 năm → Thì không nên chờ thêm. Mỗi năm giá nhà nhích lên vài trăm triệu có thể đẩy bạn ra xa khỏi căn hộ mong muốn.

2. Nếu bạn mua để đầu tư
- Nếu bạn muốn có thêm thu nhập mỗi tháng → ưu tiên căn dễ cho thuê, vị trí tốt.
- Nếu bạn muốn mua rồi bán lại → tìm căn "giá tốt hơn mặt bằng chung", pháp lý rõ.

Dù đầu tư kiểu nào, hãy tính toán kỹ dòng tiền. Giá cao chưa chắc là không nên mua. Giá rẻ cũng chưa chắc là cơ hội. 
#FinPeace #BatDongSan #BinhAnTaiChinh

[MẪU FACEBOOK 2]:
CÂU CHUYỆN HÀI CUỐI THÁNG: SẾP ƠI, CHO EM TĂNG LƯƠNG NHƯNG CHỖ VIỆC NÀY EM BỚT LẠI NHÉ? 🤡

Bao năm làm quản lý Chưa 1 lần nhân viên xin tăng việc. Ông nào xin thêm việc gặp khách thì inbox.
Trong giới công sở luôn tồn tại một nhóm các bạn trẻ sở hữu một niềm tin mãnh liệt: "Chỉ cần mình có mặt ở công ty đủ 8 tiếng, sếp đương nhiên phải có trách nhiệm nuôi mình tốt hơn năm ngoái."
Họ bước vào kỳ Review lương với tâm thế như một người đi mua vé số: "Năm nay em xin đề xuất tăng 20% lương, nhưng cái dự án A kia khó quá sếp giao cho bạn khác đi ạ!" 📉

Chúng ta thường khuyên nhau phải biết "Work Smart, Not Work Hard" (Làm việc thông minh, đừng làm việc trâu bò). Nhưng ranh giới giữa "thông minh" và "khôn lỏi" thực sự rất mong manh. Đòi nhận về nhiều hơn trong khi khối lượng giá trị tạo ra ít đi — đó không phải là tối ưu hiệu suất, đó là tự đưa tên mình lên bảng phong thần cắt giảm nhân sự.

Trong đầu tư cũng vậy. Nếu bạn muốn lãi kép 20%/năm nhưng lại sợ rủi ro, thì phải chịu khó mà nâng cao trình lên. Hoặc lười hơn thì đi cùng team mạnh.

Giá trị của bạn trên thị trường (hay ở công ty) là một chiếc cân tiểu ly rất sòng phẳng. Bạn giải được bài toán giá trị bao nhiêu tỷ, bạn sẽ nhận về một miếng bánh tương xứng. Việc "Sống lâu lên lão làng" đã trở thành khái niệm tuyệt chủng từ thập kỷ trước rồi.

Bài toán thiết thực nhất ngày hôm nay:
Đừng rụt rè gõ cửa xin tăng lương nữa. Hãy bước thẳng vào phòng sếp và dõng dạc nói: "Sếp đang bù đầu với đống việc nào, sếp cắt bớt sang cho em đi!".
Khi bạn dám xông pha gánh vác cả những tảng đá của sếp, tiền lương tự khắc sẽ phải chạy sấp mặt để đuổi theo giá trị của bạn.
#FinPeace #PhatTrienBanThan #TaiChinhCaNhan #GrowthMindset

==================================
2. PHONG CÁCH THREADS (Khách quan, báo chí, đưa tin nhanh gọn)
==================================
[MẪU THREADS 1]:
Văn Mai Hương, Erik và dàn sao tổng duyệt lễ trao giải TikTok Awards Việt Nam 2025

Tối 18/10, lễ trao giải TikTok Awards Việt Nam 2025 sẽ chính thức diễn ra tại TPHCM. Trưa cùng ngày, buổi tổng duyệt thu hút sự góp mặt của nhiều nghệ sĩ, nhà sáng tạo nội dung.

Một trong những tiết mục được chú ý là phần biểu diễn chung của Erik, JSOL, CONGB và Sơn.K Bên cạnh đó, ca sĩ Văn Mai Hương cũng gây chú ý khi kết hợp cùng các nhà sáng tạo nội dung Mai Bảo Vinh, Huỳnh Nhựt, Dương Quốc Mỹ và Giỏi Lee.

[MẪU THREADS 2]:
Những khoảnh khắc ấn tượng tại TikTok Awards Việt Nam 2025

Đêm gala trao giải TikTok Awards Việt Nam 2025 diễn ra tối 18/10 tại TPHCM, thu hút sự chú ý của đông đảo khán giả khi quy tụ hàng trăm nghệ sĩ, nhà sáng tạo nội dung.

Với chủ đề "Thế hệ mới, tiếp nối kỷ nguyên sáng tạo", sự kiện vinh danh 16 hạng mục đề cử, bao gồm những nhà sáng tạo nội dung mang tinh thần đổi mới, lan tỏa giá trị tích cực.

[MẪU THREADS 3]:
Bí quyết ăn gian vóc dáng “nấm lùn”, mũm mĩm từ cô giáo vật lý nổi tiếng 😍🔥

Trần Thanh Nga (SN 1998) là giáo viên dạy môn vật lý tại Trường THPT Lý Thái Tổ, Hà Nội. Cô từng tốt nghiệp loại giỏi ngành sư phạm vật lý, Trường Đại học Giáo dục - Đại học Quốc gia Hà Nội.

Nhờ ngoại hình xinh xắn, phong cách thời trang trẻ trung cùng phương pháp giảng dạy gần gũi với học trò Gen Z, Thanh Nga là gương mặt được nhiều bạn trẻ yêu mến trên mạng xã hội.

==================================
3. PHONG CÁCH INSTAGRAM (Nhiều cảm xúc, trần thuật, khơi gợi sự suy ngẫm, thẩm mỹ)
==================================
[MẪU INSTAGRAM 1]:
Trong nhiều gia đình, cách mọi người đối xử với một đứa trẻ thường để lại dấu ấn lâu dài hơn ta tưởng. Không chỉ ở con trưởng hay con giữa, chính em út cũng phải đối diện với những ảnh hưởng riêng. Dù đã lớn khôn, họ vẫn mang cảm giác bị nhìn nhận khác biệt, như thể chưa bao giờ thực sự thoát khỏi lăng kính “đứa trẻ” hay cái mác “út cưng” của cả nhà. Hiện tượng tâm lý này được gọi tên là Youngest Child Syndrome (Hội chứng con út).

Nếu bạn cũng là một người con út, liệu hội chứng này có đang gọi tên chính những trải nghiệm của bạn?
#YoungestChildSyndrome #TamLyHoc #GiaDinh

[MẪU INSTAGRAM 2]:
Sau vòng bảng World Cup 2026, đội tuyển Nhật chính thức gặp Brazil ở vòng loại trực tiếp 1/32. Có lẽ đây chẳng phải một thông tin quá đáng chú ý, kết quả trận đấu cũng không mang lại quá nhiều bất ngờ. Nhưng với thế hệ từng xem World Cup vào thời Brazil vẫn là một trong những đội tuyển mạnh nhất thế giới, thì việc một đội bóng châu Á đối đầu với Brazil ở World Cup từng chỉ có thể là cái kết trong mơ của một bộ phim. Và quả thật, tập cuối cùng của loạt phim hoạt hình Tsubasa chính là trận đấu ấy.

Từ thời World Cup gần như mặc định là sân chơi của các đội tuyển châu Âu và Nam Mỹ, khi việc xem bóng đá còn phải qua chiếc tivi thùng, cho đến lúc World Cup trở thành chất liệu nội dung bất tận của internet, Nhật Bản cũng đã thật sự gặp Brazil. Và từ chiếc tivi thùng đến màn hình điện thoại, cách mỗi thế hệ xem World Cup cũng đã thay đổi rất nhiều.
#WorldCup2026 #BongDa #GocNhin

[MẪU INSTAGRAM 3]:
Chúng ta có thể rõ mình là hướng nội hay hướng ngoại, thậm chí thuộc lòng phong cách gắn kết cá nhân trong các mối quan hệ. Thế nhưng, trước những bước ngoặt trọng yếu của sự nghiệp, không ít người vẫn rơi vào trạng thái chần chừ và lúng túng.

Vậy, bạn đang thật sự hiểu mình đến đâu trong công việc?
Hãy nhìn vào cách môi trường hiện tại phản chiếu con người bạn: Mức thu nhập có đang tương xứng với nỗ lực? Bạn có điểm tựa vững chắc từ sếp và đồng đội khi gặp thử thách? Bạn có cơ hội nâng cấp năng lực, và công việc hằng ngày có đang tạo ra giá trị ý nghĩa nào không?
#CareerPath #PhatTrienBanThan #DinhHuong
`;

const INPUT_FILE = './scripts/dataset_ultimate.jsonl';
const OUTPUT_FILE = './scripts/dataset_golden_final.jsonl';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("🚀 Bắt đầu Chưng cất tri thức (1 req = 3 platforms)...");
    
    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const lines: any[] = [];
    for await (const line of rl) {
        if (line.trim()) {
            lines.push(JSON.parse(line));
        }
    }

    const limit = Math.min(670, lines.length);
    console.log(`📊 Sẽ xử lý ${limit} bài báo. Dự kiến thu về ${limit * 3} dòng dữ liệu.`);

    // fs.writeFileSync(OUTPUT_FILE, ''); // Commented out to resume

    let successCount = 507 * 3; // Start with previous success count

    for (let i = 507; i < limit; i++) {
        const item = lines[i];
        
        const systemMessage = item.messages.find((m: any) => m.role === 'system');
        const userMessage = item.messages.find((m: any) => m.role === 'user');
        
        if (!userMessage || !systemMessage) continue;
        
        const originalInput = userMessage.content;
        
        const prompt = `
${authorStyle}

Dựa vào THÔNG TIN BÀI BÁO dưới đây, hãy viết 3 phiên bản bài đăng cho 3 nền tảng khác nhau bằng cách "bắt chước" chính xác Phong cách của từng nền tảng đã định nghĩa ở trên.

YÊU CẦU:
1. Facebook: Viết theo đúng [PHONG CÁCH FACEBOOK].
2. Threads: Viết theo đúng [PHONG CÁCH THREADS].
3. Instagram: Viết theo đúng [PHONG CÁCH INSTAGRAM].

THÔNG TIN BÀI BÁO:
${originalInput}

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON sau:
{
  "facebook": "Nội dung bài Facebook...",
  "threads": "Nội dung bài Threads...",
  "instagram": "Nội dung bài Instagram..."
}
`;

        let retries = 50;
        let success = false;
        let waitTime = 15000; // 15 seconds

        while (retries > 0 && !success) {
            try {
                if (retries < 50) {
                    process.stdout.write(`Thử lại lần ${51 - retries}... `);
                } else {
                    process.stdout.write(`Đang xử lý cụm bài ${i + 1}/${limit}... `);
                }
                
                const result = await model.generateContent(prompt);
                let responseText = result.response.text();
                // Strip bad control characters
                responseText = responseText.replace(/[\u0000-\u001F]+/g, "");
                
                const jsonOutput = JSON.parse(responseText);

                const platforms = [
                    { name: 'Facebook', content: jsonOutput.facebook },
                    { name: 'Threads', content: jsonOutput.threads },
                    { name: 'Instagram', content: jsonOutput.instagram }
                ];

                for (const p of platforms) {
                    if (!p.content) continue;
                    
                    const newUserContent = originalInput.replace(/Nền tảng:.*?\n/i, `Nền tảng: ${p.name}\n`);
                    
                    const newRow = {
                        messages: [
                            systemMessage,
                            { role: 'user', content: newUserContent },
                            { role: 'assistant', content: p.content }
                        ]
                    };
                    fs.appendFileSync(OUTPUT_FILE, JSON.stringify(newRow) + '\n');
                }
                
                console.log("✅ Xong (Tạo được 3 bài)!");
                successCount += 3;
                success = true;

                await delay(15000); // 15s delay giữa mỗi bài để an toàn tuyệt đối với API Free

            } catch (error: any) {
                if (error.message.includes('429')) {
                    console.log(`⏳ Quá tải API. Đang đợi ${waitTime/1000}s để thử lại...`);
                    await delay(waitTime);
                    waitTime = Math.min(waitTime * 2, 60000); // Max wait 60s
                    retries--;
                } else {
                    console.log(`❌ Lỗi JSON hoặc không xác định: ${error.message}. Bỏ qua bài này.`);
                    await delay(15000); 
                    break;
                }
            }
        }
        
        if (!success && retries === 0) {
            console.log(`⚠️ Đã hết số lần thử lại cho bài ${i + 1}. Bỏ qua.`);
        }
    }

    console.log(`\\n🎉 HOÀN THÀNH! Đã sinh ra TỔNG CỘNG ${successCount} bài (Facebook, Threads, Insta) tại ${OUTPUT_FILE}`);
}

main();
