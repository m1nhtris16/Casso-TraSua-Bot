# 🤖 Casso F&B AI Assistant (Telegram Bot)

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![payOS](https://img.shields.io/badge/payOS-0052FF?style=for-the-badge&logoColor=white)

Một hệ thống Chatbot AI tự động hóa toàn diện quy trình tư vấn, đặt món và thanh toán cho ngành hàng F&B trên nền tảng Telegram. Dự án được thiết kế dưới dạng MVP nhằm giải quyết bài toán quá tải đơn hàng online cho tập khách hàng bận rộn (dân văn phòng), đồng thời tối ưu hóa quy trình làm việc cho chủ quán và bộ phận bếp.

## ✨ Tính năng nổi bật (Key Features)

- **🧠 Xử lý ngôn ngữ tự nhiên (Contextual NLP):** Tích hợp `gpt-4o-mini` với bộ nhớ Context Memory. Bot giao tiếp hoàn toàn bằng tiếng Việt thân thiện, có khả năng hiểu ngữ cảnh, nhớ lịch sử chọn món (size, topping, số lượng) và tư vấn linh hoạt.
- **🔀 Định tuyến Đa luồng (Omnichannel Routing):** AI tự động phân loại hình thức mua hàng để thu thập thông tin phù hợp:
  - *Tại quán/Takeaway:* Chốt đơn nhanh, bỏ qua bước lấy địa chỉ.
  - *Giao hàng tận nơi:* Bắt buộc trích xuất đủ Tên tòa nhà, Số tầng, và Số điện thoại trước khi khởi tạo thanh toán.
- **🛡️ Bảo mật & Chống thao túng (Guardrails & Anti-Prompt Injection):** Thiết lập ranh giới vai trò nghiêm ngặt bằng System Prompt. Bot tự động từ chối khéo léo các yêu cầu ngoài luồng (như giải toán, viết code, kiến thức bách khoa...) nhằm đảm bảo tập trung 100% vào nghiệp vụ bán hàng F&B.
- **🔍 Quản trị Dữ liệu bền vững (MongoDB Integration):** - Kết nối LLM với MongoDB thông qua Function Calling, nhận diện chính xác món ăn kể cả khi khách gõ sai trật tự từ, viết tắt (Regex Search).
  - Tự động lưu trữ thông tin Đơn hàng chờ (Pending Orders) xuống Database, đảm bảo không mất mát dữ liệu khách hàng ngay cả khi Server bị sập hoặc khởi động lại.
- **💳 Thanh toán tự động & Báo bếp (payOS Webhook):** Khởi tạo VietQR động bằng payOS. Khi tiền về, hệ thống lắng nghe Webhook, tự động gửi "Ting ting" chốt đơn cho khách và "bắn" hóa đơn tổng hợp (Bill + Info Giao hàng) thẳng vào Group Telegram của bộ phận Bếp/Shipper.


## 📂 Cấu trúc thư mục (Folder Structure)

Dự án được tổ chức rõ ràng để dễ dàng mở rộng và bảo trì:

```text
Casso-TraSua-Bot/
├── config/             # Khởi tạo và cấu hình các dịch vụ (MongoDB, OpenAI, payOS, Telegram Bot)
├── controllers/        # Tiếp nhận request và điều phối luồng xử lý (Bot Controller & Webhook Controller)
├── models/             # Định nghĩa cấu trúc dữ liệu cho MongoDB (Menu Schema, Order Schema)
├── services/           # Xử lý logic nghiệp vụ cốt lõi (Tìm món, tính tiền, tạo thanh toán QR)
├── utils/              # Chứa các tiện ích và biến dùng chung (Bộ nhớ ngữ cảnh người dùng)
├── .env                # Chứa các biến môi trường và API Keys (Được loại trừ khỏi git)
├── package.json        # Thông tin dự án và danh sách các thư viện phụ thuộc
├── server.js           # File Entry Point: Khởi động Express server và kết nối các module
└── README.md           # Tài liệu hướng dẫn cài đặt và vận hành
```

## 🛠️ Kiến trúc hệ thống (Tech Stack)

Dự án được tái cấu trúc (Refactoring) theo mô hình chia tách module chuyên nghiệp (Controllers - Services - Models):
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Bot Framework:** Telegraf (Telegram Bot API)
- **AI Integration:** OpenAI API (Function Calling, System Prompting)
- **Payment Gateway:** payOS SDK (Payment Link & Webhook)
- **Deployment:** Render, thiết lập đa môi trường thông qua biến `.env`.

## 💡 Giá trị kinh doanh (Business Value)

- **Giảm ma sát mua hàng:** Thao tác 100% trên Telegram, không cần tải app.
- **Tự động hóa đối soát:** Loại bỏ rủi ro tính sai tiền hay nhân viên phải check biến động số dư thủ công.
- **Tối ưu vận hành:** Tự động điều phối thông tin chuẩn xác giữa Khách hàng - Thu ngân (AI) - Nhà bếp, giải quyết triệt để vấn đề "nút thắt cổ chai" trong giờ cao điểm.

## 🚀 Hướng dẫn thử nghiệm (Testing Guide)

### ⚠️ LƯU Ý QUAN TRỌNG CHO BAN GIÁM KHẢO
> Hệ thống Backend hiện đang được deploy trên nền tảng Render (Gói Free). Trong lần đầu tiên tương tác, nếu Bot phản hồi chậm (khoảng 30 - 50 giây), mong người dùng thông cảm chờ đợi một chút để server hoàn tất quá trình "Cold Start" (Khởi động lại từ trạng thái ngủ đông). Các tin nhắn sau đó sẽ được xử lý mượt mà (Real-time).

**Link trải nghiệm Bot:** https://t.me/casso_trasua_bot

### Hướng dẫn cài đặt cho Developer (Local Development)

1. Clone repository này về máy:
   ```bash
   https://github.com/m1nhtris16/Casso-TraSua-Bot.git
   cd casso-intern-bot
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Thiết lập biến môi trường:
Tạo file .env ở thư mục gốc và cung cấp các thông tin sau:
    ```bash
    PORT=3000
    MONGODB_URI=your_mongodb_connection_string
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    KITCHEN_GROUP_ID=your_telegram_group_id
    OPENAI_API_KEY=your_openai_api_key
    PAYOS_CLIENT_ID=your_payos_client_id
    PAYOS_API_KEY=your_payos_api_key
    PAYOS_CHECKSUM_KEY=your_payos_checksum_key
    ```
4. Khởi động server:
   ```bash
   npm start
   ```
## 👨‍💻 Tác giả
- Lê Minh Trí
- GitHub: https://github.com/m1nhtris16/
- Contact: triminhle1604@gmail.com
