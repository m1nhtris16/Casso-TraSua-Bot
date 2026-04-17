require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Menu = require('./models/Menu');

// Hàm chính chạy bất đồng bộ (async)
async function runSeed() {
  try {
    console.log('Đang kết nối tới MongoDB...');
    // Đợi kết nối xong mới làm bước tiếp theo
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB thành công!');

    const results = [];

    // Bắt đầu đọc file
    fs.createReadStream('Menu.csv')
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          category: data.category,
          item_id: data.item_id,
          name: data.name,
          description: data.description,
          price_m: Number(data.price_m),
          price_l: Number(data.price_l),
          available: data.available.toLowerCase() === 'true'
        });
      })
      .on('end', async () => {
        try {
          console.log('Đang nạp dữ liệu...');
          await Menu.deleteMany({}); 
          await Menu.insertMany(results);
          console.log('✅ Đã nạp dữ liệu Menu thành công!');
          process.exit(0);
        } catch (error) {
          console.error('❌ Lỗi khi thao tác với database:', error);
          process.exit(1);
        }
      });

  } catch (error) {
    // Nếu kết nối DB thất bại, nó sẽ báo lỗi ngay tại đây thay vì bị timeout 10s
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
}

runSeed();