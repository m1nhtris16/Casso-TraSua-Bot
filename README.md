# 🤖 Casso F&B AI Assistant (Telegram Bot)

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![payOS](https://img.shields.io/badge/payOS-0052FF?style=for-the-badge&logoColor=white)

Một hệ thống Chatbot AI tự động hóa toàn diện quy trình tư vấn, đặt món và thanh toán cho ngành hàng F&B trên nền tảng Telegram. Dự án được phát triển dưới dạng MVP (Minimum Viable Product) để giải quyết bài toán tối ưu hóa trải nghiệm khách hàng và giảm tải khối lượng công việc cho nhân viên thu ngân.

## ✨ Tính năng nổi bật (Key Features)

- **🧠 Tư vấn thông minh (Contextual NLP):** Tích hợp mô hình `gpt-4o-mini` với bộ nhớ Context Memory, cho phép AI hiểu ngữ cảnh trò chuyện, nhớ lịch sử chọn món và tư vấn linh hoạt như người thật.
- **🔍 Tìm kiếm dữ liệu động (Function Calling & Flexible Search):** Kết nối LLM với MongoDB thông qua OpenAI Function Calling. Thuật toán tìm kiếm Regex linh hoạt giúp nhận diện món ăn ngay cả khi khách hàng dùng từ viết tắt (VD: "cf", "ts") hoặc đảo trật tự từ.
- **🌐 Song ngữ chuẩn xác (Strict Monolingual):** Áp dụng kỹ thuật Zero-Tolerance Prompting để AI nhận diện và phản hồi 100% bằng ngôn ngữ khách hàng sử dụng (Anh/Việt) mà không bị "rò rỉ" dữ liệu tiếng Việt từ Database.
- **💳 Thanh toán tự động (payOS Integration):** Khởi tạo VietQR động ngay trong khung chat. Hệ thống lắng nghe Webhook từ payOS để xác nhận dòng tiền theo thời gian thực và tự động gửi hóa đơn chốt đơn vào nhóm của bộ phận Bếp.

## 🛠️ Kiến trúc hệ thống (Tech Stack)

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Sử dụng Mongoose ODM)
- **Bot Framework:** Telegraf (Telegram Bot API)
- **AI Integration:** OpenAI API (Function Calling, System Prompting)
- **Payment Gateway:** payOS SDK (QR Link Generation & Webhook processing)
- **Deployment:** Render (Tích hợp CI/CD tự động từ GitHub)

## 💡 Giá trị kinh doanh (Business Value)

Hệ thống được thiết kế không chỉ để phô diễn kỹ thuật mà còn bám sát các framework phân tích kinh doanh thực tế:
- **Giảm ma sát mua hàng:** Khách hàng không cần tải app riêng, thao tác 100% trên Telegram quen thuộc.
- **Tự động hóa luồng tiền:** Loại bỏ rủi ro tính sai tiền hay nhân viên phải tự check biến động số dư.
- **Dữ liệu tập trung:** Toàn bộ lịch sử đặt món được đối chiếu với cơ sở dữ liệu MongoDB, tạo tiền đề cho việc phân tích hành vi người tiêu dùng sau này.

## 🚀 Hướng dẫn cài đặt (Installation)

### Yêu cầu môi trường
- Node.js (v18+)
- MongoDB Cluster (MongoDB Atlas)
- Tài khoản Telegram Bot (BotFather)
- API Key OpenAI
- Tài khoản payOS

### Cài đặt và Chạy thử nghiệm

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
- Minh Trí
- GitHub: https://github.com/m1nhtris16/
- Contact: triminhle1604@gmail.com
