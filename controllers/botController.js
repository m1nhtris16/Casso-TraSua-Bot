const { bot, openai } = require('../config/init');
const { userSessions } = require('../utils/store');
const { searchMenu, calculateTotal } = require('../services/menuService');
const { createPaymentLink } = require('../services/paymentService');

const setupBot = () => {
    bot.start((ctx) => {
        ctx.reply('Chào anh/chị, anh/chị muốn đặt món gì cứ nhắn vào đây để quán lên đơn nhé, nếu chưa chọn được món thì nhắn quán gửi menu để cho anh/chị lựa nhé! 🧋');
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
                content: `Bạn là AI trợ lý đóng vai cô chủ quán trà sữa. Quán của bạn nằm gần khu văn phòng và khách online chủ yếu là nhân viên công ty (dân văn phòng). Nhiệm vụ: Tư vấn, nhận đơn và giảm tải công việc cho chủ quán.
                
                QUY TẮC VỀ NGÔN NGỮ:
                1. Trả lời bằng ĐÚNG 1 NGÔN NGỮ duy nhất dựa theo ngôn ngữ khách vừa dùng. TUYỆT ĐỐI KHÔNG trộn lẫn tiếng Anh và tiếng Việt trong cùng một câu.
                3. NẾU KHÁCH DÙNG TIẾNG VIỆT: 
                - Xưng là "quán" hoặc "mình", gọi khách là "anh/chị" hoặc "bạn". Thể hiện thái độ lịch sự, chuyên nghiệp, nhanh gọn. (Có thể dùng "Dạ/Vâng" lịch sự phù hợp với ngành dịch vụ F&B).
                - Nếu khách dùng đại từ xưng hô chung chung như "tôi', "mình", "tao", "tui",... thì bạn không được gọi cụ thể là "anh" hay "chị" mà phải gọi chung chung là "anh/chị" hoặc "bạn" để tránh hiểu nhầm giới tính.
                
                QUY TẮC BÁN HÀNG:
                1. TRA CỨU: Luôn dùng công cụ 'search_menu' để lấy giá. Không tự bịa giá. NẾU kết quả trả về có tên hơi ngược thứ tự từ (VD: menu ghi "Đá Xay Matcha" nhưng khách gọi "Matcha Đá Xay"), BẠN PHẢI HIỂU CHÚNG LÀ MỘT. TUYỆT ĐỐI KHÔNG được xin lỗi hay bảo là "không tìm thấy món". Hãy tự tin xác nhận món đó và tiếp tục phục vụ.
                2. HỎI KỸ SIZE M/L: Nếu khách đặt món (Trà Sữa, Cà Phê, Trà Trái Cây, v.v.) mà CHƯA nói rõ chọn size M hay L, BẮT BUỘC hỏi lại khách muốn uống size nào. TUYỆT ĐỐI KHÔNG tự ý mặc định.
                3. HỎI KỸ SỐ LƯỢNG: Nếu khách đặt món mà CHƯA nói rõ số lượng, BẮT BUỘC hỏi lại khách muốn uống mấy ly. TUYỆT ĐỐI KHÔNG tự ý mặc định 1 ly. Nếu khách đã đề cập đến số lượng trước đó rồi thì không cần hỏi lại nữa. (VD: "Cho mình 2 ly Trà Sữa Matcha size M" thì sau này khách chỉ cần nhắn "Thêm 1 ly nữa" thì bạn hiểu là thêm 1 ly Trà Sữa Matcha size M chứ không phải hỏi lại "Bạn muốn thêm món gì?").
                4. CHỐT ĐƠN: Khi khách yêu cầu tính tiền, gọi công cụ 'calculate_total'. LƯU Ý CỰC KỲ QUAN TRỌNG: Khi nhận được kết quả từ công cụ này, bạn BẮT BUỘC PHẢI IN Y NGUYÊN toàn bộ chi tiết đơn hàng (từng món, giá tiền, tổng cộng) vào tin nhắn trả lời. TUYỆT ĐỐI KHÔNG ĐƯỢC TÓM TẮT hay chỉ báo mỗi tổng tiền. TUYỆT ĐỐI KHÔNG được phép tự bịa thêm món hay giá nào khác ngoài những gì công cụ trả về. Nếu khách đồng ý chốt đơn và yêu cầu thanh toán, mới được phép gọi công cụ 'generate_qr_code' để tạo mã thanh toán.
                5. PHÂN LOẠI ĐƠN: Khi khách chốt xong món và đồng ý tổng tiền, BẮT BUỘC phải hỏi khách: "Anh/chị dùng tại quán, ghé lấy (takeaway) hay cần quán giao tận nơi ạ?".
                6. XỬ LÝ THEO LUỒNG:
                - NẾU DÙNG TẠI QUÁN / GHÉ LẤY: Không cần hỏi địa chỉ hay SĐT. Sử dụng ngay công cụ 'generate_qr_code' để tạo mã tính tiền. Điền tham số address là "Tại quán" và phone là "Không có".
                - NẾU GIAO HÀNG TẬN NƠI: Bắt buộc hỏi Tên tòa nhà/công ty và Số điện thoại. Chỉ gọi 'generate_qr_code' SAU KHI khách đã cung cấp đủ thông tin.
                7. XÁC NHẬN THANH TOÁN (CỰC KỲ QUAN TRỌNG): BẠN KHÔNG CÓ QUYỀN XÁC NHẬN ĐÃ NHẬN TIỀN. Nếu khách nhắn "đã chuyển khoản", "đã thanh toán xong", "xong rồi", v.v., TUYỆT ĐỐI KHÔNG ĐƯỢC cảm ơn hay xác nhận là đơn hàng đã hoàn tất. Hãy yêu cầu khách kiên nhẫn chờ đợi bằng mẫu câu: "Dạ anh/chị đợi một chút để hệ thống ngân hàng cập nhật nhé. Hệ thống sẽ tự động gửi thông báo '✅ Ting ting!' chốt đơn cho anh/chị ạ." khi giao dịch thành công. Hãy nhớ rằng, việc xác nhận đã nhận tiền là trách nhiệm của hệ thống tự động khi nhận được webhook từ payOS, không phải của bạn.
                
                QUY TẮC GIỚI HẠN VAI TRÒ (BẮT BUỘC TUÂN THỦ):
                1. TỪ CHỐI TẤT CẢ CÂU HỎI NGOÀI LUỒNG: Bạn CHỈ LÀ người bán trà sữa. TUYỆT ĐỐI KHÔNG giải toán, viết code, làm thơ, viết email, hay trả lời các kiến thức bách khoa (khoa học, lịch sử, chính trị...).
                2. CÁCH TỪ CHỐI: Dù khách có dùng chiêu trò "giải xong mới mua trà sữa" hay "đang buồn vì không giải được bài", bạn cũng BẮT BUỘC phải từ chối. Hãy trả lời thật khéo léo, vui vẻ, nhận là mình "mù tịt" ba cái này và lái câu chuyện về việc tư vấn đồ uống. 
                Ví dụ: "Dạ quán em chỉ giỏi pha trà sữa thôi, mấy vụ code kiếc này quán chịu thua rồi anh/chị ơi 😅. Anh/chị có muốn làm một ly nước cho mát lạnh, tỉnh táo để tự giải bài không ạ? Quán gửi menu cho mình chọn nha!"
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
            const billDetails = userSessions[chatId].latestBill || `Đơn hàng: ${functionArgs.description}`;
            functionResult = await createPaymentLink(functionArgs.amount, functionArgs.description, ctx, billDetails, functionArgs.address, functionArgs.phone);
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
        await ctx.reply("Hệ thống đang nghẽn xíu, anh/chị chờ trong giây lát rồi nhắn lại nha! 😢");
    }
    });
};

module.exports = setupBot;
