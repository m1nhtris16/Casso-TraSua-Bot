require('dotenv').config();
const express = require('express');

// Import cấu hình và controllers
const connectDB = require('./config/database');
const { bot } = require('./config/init');
const setupBot = require('./controllers/botController');
const { handlePayOSWebhook } = require('./controllers/webhookController');

const app = express();
app.use(express.json());

// 1. Kết nối Database
connectDB();

// 2. Khởi tạo các luồng chat của Telegram Bot
setupBot();

// 3. Khai báo các API Route
app.get('/ping', (req, res) => {
  res.status(200).send('Server vẫn đang hoạt động!');
});
app.post('/payos-webhook', handlePayOSWebhook);

// 4. Khởi động Server & Bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server Express đang chạy tại port ${PORT}`);
  bot.launch();
  console.log('🤖 Telegram Bot đã khởi động...');
});

// Xử lý dừng server an toàn
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));