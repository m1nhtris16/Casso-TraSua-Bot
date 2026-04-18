// services/menuService.js
const Menu = require('../models/Menu');

// Hàm tìm kiếm menu dựa trên từ khóa
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

// Hàm tính tổng tiền dựa trên danh sách món ăn và số lượng
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

module.exports = {
    searchMenu,
    calculateTotal
};