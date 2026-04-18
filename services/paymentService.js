// services/paymentService.js
const { payos } = require('../config/init');
const Order = require('../models/Order');

async function createPaymentLink(amount, description, ctx, billDetails, address, phone) {
  try {
    const orderCode = Number(String(Date.now()).slice(-6)); 
    
    // 1. Lưu thông tin đơn hàng vào MONGODB
    const newOrder = new Order({
      orderCode: orderCode,
      chatId: ctx.chat.id,
      billDetails: billDetails,
      address: address || "Tại quán / Takeaway",
      phone: phone || "Không có"
    });
    await newOrder.save(); // Lưu xuống DB

    // 2. Tạo link thanh toán PayOS
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

module.exports = { createPaymentLink };