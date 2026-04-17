require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const { OpenAI } = require('openai'); // Import OpenAI

const Menu = require('./models/Menu'); // Import model Menu đã tạo ở bước trước

const { PayOS } = require('@payos/node'); // Import PayOS SDK

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY
});
// Khởi tạo đối tượng lưu trữ lịch sử chat của từng khách hàng
const userSessions = {};
// Hàm tìm kiếm món ăn trong MongoDB
async function searchMenu(keyword) {
  try {
    let items = [];

    // Nếu AI truyền vào từ khóa bị rỗng, lấy toàn bộ menu
    if (!keyword || keyword.trim() === '') {
      items = await Menu.find({ available: true });
    } else {
      // Tách từ khóa thành mảng các từ (Vd: "matcha đá xay" -> ["matcha", "đá", "xay"])
      const words = keyword.trim().split(/\s+/);
      
      // Tạo điều kiện tìm kiếm: Tên món ăn phải chứa TẤT CẢ các từ trên (không phân biệt thứ tự)
      const regexQueries = words.map(word => ({ name: { $regex: word, $options: 'i' } }));
      
      // Tìm kiếm trong DB bằng toán tử $and
      items = await Menu.find({ $and: regexQueries, available: true });
      
      // Cơ chế Fallback: Nếu vẫn không tìm ra món cụ thể, lấy TOÀN BỘ menu cho AI tự đọc
      if (items.length === 0) {
        console.log(`Không tìm thấy chính xác "${keyword}", đang gửi toàn bộ menu cho AI tự lọc...`);
        items = await Menu.find({ available: true });
      }
    }
    
    // Định dạng lại kết quả để AI dễ đọc
    return items.map(item => 
      `- ${item.category} | ${item.name}: Size M ${item.price_m.toLocaleString('vi-VN')}đ, Size L ${item.price_l.toLocaleString('vi-VN')}đ`
    ).join('\n');
    
  } catch (error) {
    console.error("Lỗi khi tìm menu:", error);
    return "Hệ thống đang lỗi, không thể tra cứu menu lúc này.";
  }
}

// Hàm tính tổng tiền chính xác từ Database
async function calculateTotal(orderItems) {
  try {
    let totalAmount = 0;
    let billDetails = ["🧾 CHI TIẾT ĐƠN HÀNG:"];

    for (let item of orderItems) {
      // Tìm món ăn trong DB để lấy giá gốc, tránh việc AI tự bịa giá
      const dbItem = await Menu.findOne({ name: { $regex: item.name, $options: 'i' }, available: true });
      
      if (dbItem) {
        // Xác định giá theo size (mặc định size M nếu không rõ)
        const size = item.size ? item.size.toUpperCase() : 'M';
        const price = size === 'L' ? dbItem.price_l : dbItem.price_m;
        const subtotal = price * item.quantity;
        
        totalAmount += subtotal;
        billDetails.push(`- ${item.quantity}x ${dbItem.name} (Size ${size}): ${subtotal.toLocaleString('vi-VN')}đ`);
      } else {
        billDetails.push(`- ❌ Không tìm thấy món: ${item.name}`);
      }
    }

    billDetails.push(`\n💰 TỔNG CỘNG CẦN THANH TOÁN: ${totalAmount.toLocaleString('vi-VN')}đ`);
    return billDetails.join('\n');
    
  } catch (error) {
    console.error("Lỗi khi tính tiền:", error);
    return "Hệ thống tính tiền đang gặp sự cố, xin thử lại sau.";
  }
}

// Khởi tạo "Sổ chờ thanh toán"
const pendingOrders = {};

// Hàm tạo link thanh toán 
async function createPaymentLink(amount, description, ctx, billDetails) {
  try {
    const orderCode = Number(String(Date.now()).slice(-6)); 
    
    // Lưu thông tin đơn hàng chờ vào bộ nhớ tạm
    pendingOrders[orderCode] = {
      chatId: ctx.chat.id,
      billDetails: billDetails // Lưu lại chi tiết các món để lát nữa báo bếp
    };

    const requestData = {
      orderCode: orderCode,
      amount: amount,
      description: description.substring(0, 25),
      returnUrl: `https://casso.vn`,
      cancelUrl: `https://casso.vn`
    };

    const paymentLinkData = await payos.paymentRequests.create(requestData);
    const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(paymentLinkData.qrCode)}&size=400`;
    
    await ctx.replyWithPhoto(
      { url: qrImageUrl }, 
      { caption: `Mã QR thanh toán (Đơn hàng #${orderCode})` }
    );

    return `Hệ thống ĐÃ TỰ ĐỘNG GỬI ẢNH QR CODE cho khách. Nhắn ngắn gọn nhắc khách quét mã.`;
  } catch (error) {
    console.error("Lỗi tạo link thanh toán:", error);
    return "Không thể tạo mã QR thanh toán lúc này.";
  }
}

const app = express();
app.use(express.json()); 

// Khởi tạo Telegram Bot và OpenAI Client
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

bot.start((ctx) => {
  ctx.reply('Chào con, con muốn đặt món gì cứ nhắn vào đây để cô lên đơn nhé, nếu chưa chọn được món thì nhắn cô gửi menu để cho con lựa nhé! 🧋');
});

// Xử lý tin nhắn text bằng OpenAI
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const userMessage = ctx.message.text;

  try {
    await ctx.sendChatAction('typing');

    // 1. Nếu khách hàng này chưa từng chat, tạo một bộ nhớ mới cho họ
    if (!userSessions[chatId]) {
          userSessions[chatId] = [
            {
              role: "system",
              content: `Bạn là bản sao AI của cô Hạnh, chủ quán trà sữa hiền lành. Nhiệm vụ: Tư vấn và nhận đơn.
              
              QUY TẮC VỀ NGÔN NGỮ:
              1. Trả lời bằng ĐÚNG 1 NGÔN NGỮ duy nhất dựa theo ngôn ngữ khách vừa dùng. TUYỆT ĐỐI KHÔNG trộn lẫn tiếng Anh và tiếng Việt trong cùng một câu.
              2. NẾU KHÁCH DÙNG TIẾNG ANH: Trả lời 100% tiếng Anh (xưng "Auntie", gọi "dear"). Dịch các mô tả, giá cả sang tiếng Anh. Tên món ăn để trong dấu ngoặc kép.
              3. NẾU KHÁCH DÙNG TIẾNG VIỆT: Trả lời 100% tiếng Việt. Xưng "cô", gọi "con" hoặc "cháu".
              
              QUY TẮC BÁN HÀNG:
              1. TRA CỨU: Luôn dùng công cụ 'search_menu' để lấy giá. Không tự bịa giá. NẾU kết quả trả về có tên hơi ngược thứ tự từ (VD: menu ghi "Đá Xay Matcha" nhưng khách gọi "Matcha Đá Xay"), BẠN PHẢI HIỂU CHÚNG LÀ MỘT. TUYỆT ĐỐI KHÔNG được xin lỗi hay bảo là "không tìm thấy món". Hãy tự tin xác nhận món đó và tiếp tục phục vụ.
              2. HỎI KỸ SIZE M/L: Nếu khách đặt món (Trà Sữa, Cà Phê, Trà Trái Cây, v.v.) mà CHƯA nói rõ chọn size M hay L, BẮT BUỘC hỏi lại khách muốn uống size nào. TUYỆT ĐỐI KHÔNG tự ý mặc định.
              3. CHỐT ĐƠN: Khi khách yêu cầu tính tiền, gọi công cụ 'calculate_total'. LƯU Ý CỰC KỲ QUAN TRỌNG: Khi nhận được kết quả từ công cụ này, bạn BẮT BUỘC PHẢI IN Y NGUYÊN toàn bộ chi tiết đơn hàng (từng món, giá tiền, tổng cộng) vào tin nhắn trả lời. TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT hay chỉ báo mỗi tổng tiền.
              4. THANH TOÁN: Nếu khách đồng ý với tổng tiền và muốn chuyển khoản, BẮT BUỘC dùng công cụ 'generate_qr_code' để lấy link mã QR gửi cho khách.`
            }
          ];
        }

    // 2. Thêm câu hỏi hiện tại của khách vào lịch sử
    userSessions[chatId].push({ role: "user", content: userMessage });

    // (Tùy chọn) Giới hạn bộ nhớ: Chỉ giữ lại System Prompt và khoảng 10 tin nhắn gần nhất để tiết kiệm chi phí Token API
    // if (userSessions[chatId].length > 11) {
    //   userSessions[chatId].splice(1, 1); // Xóa tin nhắn cũ nhất (ngay sau system prompt)
    // }

// Định nghĩa tools cho AI
    const tools = [
      // Tool tra cứu menu
      {
        type: "function",
        function: {
          name: "search_menu",
          description: "Tra cứu thông tin, giá cả các món trà sữa, cà phê, topping trong thực đơn của quán.",
          parameters: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "Tên món ăn. BẮT BUỘC chuẩn hóa từ viết tắt."
              }
            },
            required: ["keyword"],
          }
        }
      },
      // Tool tính tiền
      {
        type: "function",
        function: {
          name: "calculate_total",
          description: "Sử dụng công cụ này KHI VÀ CHỈ KHI khách hàng đã chốt xong các món muốn đặt và yêu cầu tính tiền/chốt đơn.",
          parameters: {
            type: "object",
            properties: {
              orderItems: {
                type: "array",
                description: "Danh sách các món khách đã đặt",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Tên món ăn bằng tiếng Việt (VD: Trà Sữa Khoai Môn)" },
                    size: { type: "string", description: "Size M hoặc L (mặc định M)" },
                    quantity: { type: "number", description: "Số lượng" }
                  },
                  required: ["name", "quantity"]
                }
              }
            },
            required: ["orderItems"],
          }
        }
      }, 
        // Tool tạo mã QR thanh toán
      {
        type: "function",
        function: {
          name: "generate_qr_code",
          description: "Sử dụng công cụ này KHI VÀ CHỈ KHI khách hàng đồng ý thanh toán số tiền đã chốt và yêu cầu mã QR hoặc thông tin chuyển khoản.",
          parameters: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Tổng số tiền cần thanh toán (chỉ lấy số, ví dụ: 45000)" },
              description: { type: "string", description: "Mô tả ngắn gọn đơn hàng, ví dụ: 'Thanh toan tra sua'" }
            },
            required: ["amount", "description"],
          }
        }
      }
    ];
    // 3. Gửi TOÀN BỘ lịch sử chat cho AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: userSessions[chatId],
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // 4. Xử lý Logic Tool và Lưu kết quả vào bộ nhớ
    if (responseMessage.tool_calls) {
      // Phải lưu lại quyết định gọi hàm của AI vào lịch sử
      userSessions[chatId].push(responseMessage); 

    for (const toolCall of responseMessage.tool_calls) {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResult = "";

        if (toolCall.function.name === "search_menu") {
          functionResult = await searchMenu(functionArgs.keyword);
        } 
        else if (toolCall.function.name === "calculate_total") {
          functionResult = await calculateTotal(functionArgs.orderItems);
          //Lưu lại tờ hóa đơn này vào bộ nhớ của khách hàng
          userSessions[chatId].latestBill = functionResult; 
        }
        else if (toolCall.function.name === "generate_qr_code") {
          // BƯỚC THÊM: Lấy lại tờ hóa đơn từ bộ nhớ (Nếu bị rỗng do lỗi gì đó thì dùng tạm description)
          const billDetails = userSessions[chatId].latestBill || `Đơn hàng: ${functionArgs.description}`;
          
          // GỌI HÀM createPaymentLink với 4 tham số: amount, description, ctx, và billDetails
          functionResult = await createPaymentLink(functionArgs.amount, functionArgs.description, ctx, billDetails);
        }

        // Lưu kết quả của tool vào lịch sử trò chuyện
        userSessions[chatId].push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: functionResult,
        });
      }

      // Lần gọi AI thứ 2: Tổng hợp dữ liệu
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: userSessions[chatId],
      });

      const finalReply = secondResponse.choices[0].message.content;
      
      // Lưu câu trả lời cuối cùng của AI vào lịch sử
      userSessions[chatId].push({ role: "assistant", content: finalReply });
      
      await ctx.reply(finalReply);

    } else {
      // Nếu không gọi Tool, chỉ cần lưu câu trả lời bình thường của AI vào lịch sử
      userSessions[chatId].push({ role: "assistant", content: responseMessage.content });
      await ctx.reply(responseMessage.content);
    }

  } catch (error) {
    console.error("❌ Lỗi hệ thống:", error);
    await ctx.reply("Hệ thống đang nghẽn xíu, con chờ cô lát rồi nhắn lại nha! 😢");
  }
});

const PORT = process.env.PORT || 3000;

// API nhận Webhook từ payOS
app.post('/payos-webhook', async (req, res) => {
  try {
    // Đọc trực tiếp dữ liệu từ request body (bỏ qua bước verify của SDK)
    const webhookData = req.body;

    // Kiểm tra xem giao dịch có thành công không (payOS trả về code '00' là thành công)
    if (webhookData && webhookData.code === '00' && webhookData.data) {
      const orderCode = webhookData.data.orderCode;
      const order = pendingOrders[orderCode];

      if (order) {
        // Gửi tin nhắn cảm ơn cho khách hàng
        await bot.telegram.sendMessage(
          order.chatId, 
          `✅ Ting ting! Cô đã nhận được tiền rồi nha con. Đơn hàng #${orderCode} của con đang được chuẩn bị!`
        );
        // Xóa đơn khỏi sổ chờ
        delete pendingOrders[orderCode];
      }
    }
    
    // Luôn phản hồi HTTP 200 cho payOS biết server đã nhận
    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi xử lý webhook:", error);
    res.status(400).json({ success: false });
  }
});


mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Đã kết nối MongoDB thành công!');
    bot.launch();
    console.log('🤖 Telegram Bot đã khởi động, đã tích hợp OpenAI...');
    app.listen(PORT, () => {
      console.log(`🚀 Server Express đang chạy tại port ${PORT}`);
    });
  })
  .catch(err => console.error('❌ Lỗi kết nối:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));