// services/menuService.js
const Menu = require('../models/Menu');

// TẠO BỘ NHỚ ĐỆM (CACHE)
let cachedFullMenu = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // Thời gian sống của Cache: 1 tiếng (tính bằng mili-giây)

function formatGroupedMenu(items) {
  // 1. Gom nhóm các món theo 'category'
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []; // Nếu chưa có nhóm này, tạo mảng trống
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // 2. Định dạng lại thành chuỗi Text
  let result = [];
  for (const category in grouped) {
    result.push(`\n**${category}:**`); // Tiêu đề nhóm (in đậm)
    grouped[category].forEach(item => {
      result.push(`- ${item.name}: Size M ${item.price_m.toLocaleString('vi-VN')}đ, Size L ${item.price_l.toLocaleString('vi-VN')}đ`);
    });
  }
  
  return result.join('\n').trim();
}

async function searchMenu(keyword) {
  try {
    let items = [];

    // NẾU KHÁCH TÌM TOÀN BỘ MENU
    if (!keyword || keyword.trim() === '') {
      if (cachedFullMenu && (Date.now() - lastCacheTime < CACHE_TTL)) {
          console.log("⚡ Lấy Menu từ Cache RAM");
          return cachedFullMenu;
      }

      console.log("🐢 Lấy Menu từ MongoDB");
      items = await Menu.find({ available: true });
      
      // SỬ DỤNG HÀM GOM NHÓM VÀ LƯU CACHE
      cachedFullMenu = formatGroupedMenu(items);
      lastCacheTime = Date.now();
      
      return cachedFullMenu;
    } 
    
    // NẾU KHÁCH TÌM MÓN CỤ THỂ
    else {
      const words = keyword.trim().split(/\s+/);
      const regexQueries = words.map(word => ({ name: { $regex: word, $options: 'i' } }));
      items = await Menu.find({ $and: regexQueries, available: true });
      
      if (items.length === 0) {
        return "Dạ quán không có món này ạ."; 
      }

      // SỬ DỤNG HÀM GOM NHÓM CHO KẾT QUẢ TÌM KIẾM
      return formatGroupedMenu(items);
    }
    
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