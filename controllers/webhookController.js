// controllers/webhookController.js
const { bot } = require('../config/init');
const Order = require('../models/Order'); // Import Model Order

const handlePayOSWebhook = async (req, res) => {
    try {
        const webhookBody = req.body;
        // Kiểm tra xem giao dịch có thành công không
        if (webhookBody.code === "00" && webhookBody.data && webhookBody.data.orderCode) {
            const orderCode = webhookBody.data.orderCode;
            
            // 1. Tìm kiếm đơn hàng trong MongoDB
            const order = await Order.findOne({ orderCode: orderCode });

            if (order && order.status === 'PENDING') {
                // 2. Gửi tin nhắn cho Khách
                await bot.telegram.sendMessage(
                    order.chatId, 
                    `✅ Ting ting! Quán đã nhận được tiền thanh toán. Đơn hàng #${orderCode} của anh/chị đang được chuẩn bị và sẽ được giao sớm nhất có thể! Cảm ơn anh/chị đã ủng hộ! ❤️`
                );

                // 3. Xử lý text của Bill
                let formattedBill = order.billDetails
                    .replace("TỔNG CỘNG CẦN THANH TOÁN", "TỔNG TIỀN ĐÃ NHẬN")
                    .replace("🧾 CHI TIẾT ĐƠN HÀNG:", "");

                // 4. Bắn bill về Group Bếp
                const kitchenMessage = `🏢 [BÁO BẾP & SHIP] ĐƠN ĐÃ THANH TOÁN: \n Mã đơn: #${orderCode} \n\n 🛒 CHI TIẾT MÓN: \n${formattedBill.trim()} \n\n📍 THÔNG TIN GIAO HÀNG: \n- Địa chỉ/Tòa nhà: ${order.address} \n- SĐT liên hệ: ${order.phone} \n\n *(Lưu ý shipper: Gọi khách trước khi lên tòa nhà)*`;
                
                const kitchenGroupId = process.env.KITCHEN_GROUP_ID;
                if (kitchenGroupId) {
                    await bot.telegram.sendMessage(kitchenGroupId, kitchenMessage);
                }

                // 5. Cập nhật trạng thái đơn thành ĐÃ THANH TOÁN trong DB (Thay vì xóa đi)
                order.status = 'PAID';
                await order.save();

            } else {
                console.log(`⚠️ Đơn #${orderCode} không tồn tại hoặc đã được thanh toán trước đó.`);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("❌ Lỗi xử lý webhook:", error);
        res.status(400).json({ success: false });
    }
};

module.exports = { handlePayOSWebhook };