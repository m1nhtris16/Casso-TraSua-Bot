const { Telegraf } = require('telegraf');
const { OpenAI } = require('openai');
const { PayOS } = require('@payos/node');

// Khởi tạo các dịch vụ
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});

module.exports = { bot, openai, payos };