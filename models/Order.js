// models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { 
    type: Number, 
    required: true, 
    unique: true // Mã đơn hàng không được trùng nhau
  },
  chatId: { 
    type: Number, 
    required: true 
  },
  billDetails: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    default: "Tại quán / Takeaway" 
  },
  phone: { 
    type: String, 
    default: "Không có" 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'PAID'], 
    default: 'PENDING' // Mặc định khi mới tạo là đang chờ thanh toán
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Order', orderSchema);