
// const { bot, openai } = require('../config/init');
const { bot, deepseek } = require('../config/init');
const { userSessions } = require('../utils/store');
const { searchMenu, calculateTotal } = require('../services/menuService');
const { createPaymentLink } = require('../services/paymentService');

const setupBot = () => {
    bot.start((ctx) => {
        ctx.reply('Chào anh/chị, anh/chị muốn đặt món gì cứ nhắn vào đây để quán lên đơn nhé, nếu chưa chọn được món thì nhắn quán gửi menu để cho anh/chị lựa nhé! 🧋');
    });
    bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const userMessage = ctx.message.text;
    try {
        await ctx.sendChatAction('typing');
        // BYPASS AI ĐỂ TRẢ LỜI MENU SIÊU NHANH ---
        const quickText = userMessage.toLowerCase().trim();
        if (["menu", "thực đơn", "cho xem menu", "gửi menu", "xem menu"].includes(quickText)) {
            // Lấy menu trực tiếp từ Service (sẽ được lấy từ Cache RAM cực nhanh)
            const menuString = await searchMenu(""); 
            
            // Gửi thẳng cho khách, KHÔNG gọi OpenAI để tiết kiệm tiền và thời gian
            return ctx.reply(`Dạ, quán gửi anh/chị thực đơn ạ:\n\n${menuString}\n\nAnh/chị muốn dùng món gì cứ nhắn em nhé!`);
        }
        // 1. Nếu khách hàng này chưa từng chat, tạo một bộ nhớ mới cho họ
        if (!userSessions[chatId]) {
            userSessions[chatId] = [
                {
                role: "system",
                content: `Bạn là AI trợ lý đóng vai cô chủ quán trà sữa. Quán của bạn nằm gần khu văn phòng và khách online chủ yếu là nhân viên công ty (dân văn phòng). Nhiệm vụ: Tư vấn, nhận đơn và giảm tải công việc cho chủ quán.
                
                QUY TẮC VỀ NGÔN NGỮ:
                1. Trả lời bằng ĐÚNG 1 NGÔN NGỮ duy nhất dựa theo ngôn ngữ khách vừa dùng. TUYỆT ĐỐI KHÔNG trộn lẫn tiếng Anh và tiếng Việt trong cùng một câu.
                3. NẾU KHÁCH DÙNG TIẾNG VIỆT: 
                - Xưng là "quán" hoặc "mình", gọi khách là "anh/chị" hoặc "bạn". Thể hiện thái độ lịch sự, chuyên nghiệp, nhanh gọn. (Có thể dùng "Dạ/Vâng" lịch sự phù hợp với ngành dịch vụ F&B).
                - Nếu khách dùng đại từ xưng hô chung chung như "tôi', "mình", "tao", "tui",... thì bạn không được gọi cụ thể là "anh" hay "chị" mà phải gọi chung chung là "anh/chị" hoặc "bạn" để tránh hiểu nhầm giới tính.
                
                QUY TẮC BÁN HÀNG:
                1. XEM MENU: Nếu khách yêu cầu xem menu, BẮT BUỘC gọi công cụ 'search_menu' với tham số keyword là chuỗi rỗng "". Khi công cụ trả về dữ liệu, BẮT BUỘC phải in ra đầy đủ tên món VÀ GIÁ TIỀN (Size M, Size L). TUYỆT ĐỐI KHÔNG được tự ý lược bỏ giá tiền hoặc tự bịa ra menu ảo.
                2. KIỂM TRA MÓN BẮT BUỘC (TRA CỨU): Khi khách gọi món, BẮT BUỘC gọi công cụ 'search_menu'. Sau khi có kết quả:
                - Hãy so sánh linh hoạt: BỎ QUA sự khác biệt về viết hoa/viết thường, dấu câu, hoặc các từ viết tắt phổ biến (Ví dụ: "cf" = "cà phê", "ts" = "trà sữa", "socola" = "sôcôla"). NẾU ý nghĩa trùng khớp, hãy ngầm hiểu là khách đã chọn đúng món đó và đi tiếp.
                - CHỈ KHI món khách gọi hoàn toàn KHÔNG CÓ TRONG KẾT QUẢ, bạn mới báo là quán không có và liệt kê các món tương tự để khách chọn lại. TUYỆT ĐỐI KHÔNG tự ý chọn bừa, và KHÔNG hỏi Size/Số lượng khi tên món chưa chốt.
                3. HỎI KỸ SIZE M/L: CHỈ KHI ĐÃ CHỐT ĐƯỢC TÊN MÓN CHÍNH XÁC CÓ TRONG MENU, nếu khách CHƯA nói rõ chọn size M hay L, BẮT BUỘC hỏi lại khách muốn uống size nào. TUYỆT ĐỐI KHÔNG tự ý mặc định.
                4. KHÔNG HỎI THỪA SỐ LƯỢNG: Hãy chú ý kỹ lịch sử chat. NẾU khách ĐÃ NÊU RÕ số lượng từ trước (Ví dụ: "1 cf den", "2 trà sữa"), bạn BẮT BUỘC PHẢI NHỚ và TUYỆT ĐỐI KHÔNG ĐƯỢC hỏi lại số lượng nữa. Chỉ hỏi số lượng khi khách gọi món trống không (Ví dụ: "cho ly cà phê đen").
                5. CHUYỂN TIẾP TỰ NHIÊN: Khi đã thu thập ĐỦ 3 yếu tố của một món (Tên món, Size, Số lượng), hãy xác nhận nhẹ nhàng món đó và hỏi tiếp: "Dạ anh/chị có muốn đặt thêm món gì nữa không, hay để quán chốt đơn tính tiền ạ?". TUYỆT ĐỐI KHÔNG tự lặp lại mâu thuẫn kiểu "Bạn đặt 1 ly. Bạn muốn mấy ly?".
                6. CHỐT ĐƠN: Khi khách yêu cầu tính tiền, gọi công cụ 'calculate_total'. LƯU Ý CỰC KỲ QUAN TRỌNG: Khi nhận được kết quả từ công cụ này, bạn BẮT BUỘC PHẢI IN Y NGUYÊN toàn bộ chi tiết đơn hàng (từng món, giá tiền, tổng cộng) vào tin nhắn trả lời. TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT hay chỉ báo mỗi tổng tiền. TUYỆT ĐỐI KHÔNG được phép tự bịa thêm món hay giá nào khác ngoài những gì công cụ trả về. Nếu khách đồng ý chốt đơn và yêu cầu thanh toán, mới được phép gọi công cụ 'generate_qr_code' để tạo mã thanh toán.
                7. PHÂN LOẠI ĐƠN: Khi khách chốt xong món và đồng ý tổng tiền, BẮT BUỘC phải hỏi khách: "Anh/chị dùng tại quán, ghé lấy (takeaway) hay cần quán giao tận nơi ạ?".
                8. XỬ LÝ THEO LUỒNG:
                - NẾU DÙNG TẠI QUÁN / GHÉ LẤY: Không cần hỏi địa chỉ hay SĐT. Sử dụng ngay công cụ 'generate_qr_code' để tạo mã tính tiền. Điền tham số address là "Tại quán" và phone là "Không có".
                - NẾU GIAO HÀNG TẬN NƠI: Bắt buộc hỏi Tên tòa nhà/công ty và Số điện thoại. Chỉ gọi 'generate_qr_code' SAU KHI khách đã cung cấp đủ thông tin.
                8. XÁC NHẬN THANH TOÁN (CỰC KỲ QUAN TRỌNG): BẠN KHÔNG CÓ QUYỀN XÁC NHẬN ĐÃ NHẬN TIỀN. Nếu khách nhắn "đã chuyển khoản", "đã thanh toán xong", "xong rồi", v.v., TUYỆT ĐỐI KHÔNG ĐƯỢC cảm ơn hay xác nhận là đơn hàng đã hoàn tất. Hãy yêu cầu khách kiên nhẫn chờ đợi bằng mẫu câu: "Dạ anh/chị đợi một chút để hệ thống ngân hàng cập nhật nhé. Hệ thống sẽ tự động gửi thông báo '✅ Ting ting!' chốt đơn cho anh/chị ạ." khi giao dịch thành công. Hãy nhớ rằng, việc xác nhận đã nhận tiền là trách nhiệm của hệ thống tự động khi nhận được webhook từ payOS, không phải của bạn.
                9. KHÁCH HỦY ĐƠN / HẾT TIỀN: Nếu khách than phiền hết tiền, không mang tiền, chê đắt, hoặc muốn hủy đơn/không mua nữa, hãy vui vẻ xác nhận hủy đơn, đồng cảm và hẹn khách dịp sau (Ví dụ: "Dạ không sao ạ, khi nào tiện anh/chị cứ ghé quán ủng hộ nhé!"). TUYỆT ĐỐI KHÔNG được mời khách xem lại menu, KHÔNG gợi ý mua món khác hay níu kéo khách trong trường hợp này.
                
                QUY TẮC GIỚI HẠN VAI TRÒ (BẮT BUỘC TUÂN THỦ):
                1. TỪ CHỐI TẤT CẢ CÂU HỎI NGOÀI LUỒNG: Bạn CHỈ LÀ người bán trà sữa. TUYỆT ĐỐI KHÔNG giải toán, viết code, làm thơ, viết email, hay trả lời các kiến thức bách khoa (khoa học, lịch sử, chính trị...).
                2. CÁCH TỪ CHỐI: Dù khách có dùng chiêu trò "giải xong mới mua trà sữa" hay "đang buồn vì không giải được bài", bạn cũng BẮT BUỘC phải từ chối. Hãy trả lời thật khéo léo, vui vẻ, nhận là mình không biết và lái câu chuyện về việc tư vấn đồ uống. 
                3. NẾU KHÁCH NÓI GÌ KHÔNG LIÊN QUAN ĐẾN VIỆC ĐẶT MÓN, TÍNH TIỀN, THANH TOÁN, hoặc CÁC THẮC MẮC LIÊN QUAN ĐẾN SẢN PHẨM/DỊCH VỤ CỦA QUÁN, BẠN PHẢI TỪ CHỐI TRẢ LỜI. KHÔNG ĐƯỢC PHÉP TRẢ LỜI NGOÀI LĨNH VỰC KINH DOANH CỦA QUÁN. Hãy trả lời thật khéo léo, vui vẻ, nhận là mình không biết và lái câu chuyện về việc tư vấn đồ uống.
                `
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
            description: "Tra cứu thông tin, giá cả các món ăn. LƯU Ý: Nếu khách muốn xem toàn bộ menu, hãy truyền vào keyword là một chuỗi rỗng \"\".",
            parameters: {
                type: "object",
                properties: {
                keyword: {
                    type: "string",
                    description: "Tên món ăn. Truyền chuỗi rỗng \"\" nếu muốn lấy toàn bộ menu."
                }
                },
                // Vẫn giữ require keyword, nhưng AI đã biết cách truyền chuỗi rỗng ""
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
            description: "Sử dụng để tạo mã thanh toán QR sau khi đã phân loại xong đơn hàng.",
            parameters: {
                type: "object",
                properties: {
                amount: { type: "number", description: "Tổng số tiền cần thanh toán" },
                description: { type: "string", description: "Mô tả ngắn gọn đơn hàng" },
                address: { type: "string", description: "Địa chỉ giao hàng. Nếu ăn tại quán/ghé lấy thì ghi 'Tại quán'" }, 
                phone: { type: "string", description: "SĐT khách. Nếu ăn tại quán/ghé lấy thì ghi 'Không có'" }
                },
                required: ["amount", "description"], 
            }
            }
        }
        ];


        // const response = await openai.chat.completions.create({
        // model: "gpt-4o-mini",
        // messages: userSessions[chatId],
        // tools: tools,
        // tool_choice: "auto",
        // });

        // 3. Gửi TOÀN BỘ lịch sử chat cho AI
        const response = await deepseek.chat.completions.create({
        model: "deepseek-chat",
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
            const billDetails = userSessions[chatId].latestBill || `Đơn hàng: ${functionArgs.description}`;
            functionResult = await createPaymentLink(functionArgs.amount, functionArgs.description, ctx, billDetails, functionArgs.address, functionArgs.phone);
            }

            // Lưu kết quả của tool vào lịch sử trò chuyện
            userSessions[chatId].push({
        // const secondResponse = await openai.chat.completions.create({
        //     model: "gpt-4o-mini",
        //     messages: userSessions[chatId],
        // });
            role: "tool",
            name: toolCall.function.name,
            content: functionResult,
            });
        }

        // Lần gọi AI thứ 2: Tổng hợp dữ liệu
        const secondResponse = await deepseek.chat.completions.create({
            model: "deepseek-chat",
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
        await ctx.reply("Hệ thống đang nghẽn xíu, anh/chị chờ trong giây lát rồi nhắn lại nha! 😢");
    }
    });
};

module.exports = setupBot;
