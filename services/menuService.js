// services/menuService.js
const Menu = require('../models/Menu');

const TOKEN_ALIASES = {
  cf: ['ca', 'phe', 'cafe', 'coffee'],
  cafe: ['ca', 'phe', 'cf', 'coffee'],
  coffee: ['ca', 'phe', 'cf', 'cafe'],
  ts: ['tra', 'sua'],
  socola: ['socola', 'soco', 'chocolate'],
  soco: ['socola', 'chocolate'],
  den: ['den'],
  sua: ['sua'],
};

// TẠO BỘ NHỚ ĐỆM (CACHE)
let cachedFullMenu = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // Thời gian sống của Cache: 1 tiếng (tính bằng mili-giây)

function normalizeText(text = '') {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExpandedTokenGroups(keyword = '') {
  const tokens = normalizeText(keyword).split(' ').filter(Boolean);
  return tokens.map((token) => {
    const aliases = TOKEN_ALIASES[token] || [];
    return Array.from(new Set([token, ...aliases]));
  });
}

function isMenuItemMatched(itemName, tokenGroups) {
  const normalizedName = normalizeText(itemName);
  return tokenGroups.every((group) =>
    group.some((term) => normalizedName.includes(term))
  );
}

function findBestMenuItem(queryName, menuItems) {
  const normalizedQuery = normalizeText(queryName);
  const tokenGroups = buildExpandedTokenGroups(queryName);

  let exact = menuItems.find((item) => normalizeText(item.name) === normalizedQuery);
  if (exact) return exact;

  exact = menuItems.find((item) => isMenuItemMatched(item.name, tokenGroups));
  return exact || null;
}

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
      const tokenGroups = buildExpandedTokenGroups(keyword);
      const allItems = await Menu.find({ available: true });
      items = allItems.filter((item) => isMenuItemMatched(item.name, tokenGroups));
      
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
    const availableItems = await Menu.find({ available: true });

    for (let item of orderItems) {
      // Tìm món ăn theo tên đã chuẩn hóa để nhận cả dạng viết tắt/không dấu
      const dbItem = findBestMenuItem(item.name, availableItems);
      
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