// store.js
const userSessions = {};
const processingChats = new Set();

// Xuất ra để các file khác dùng chung
module.exports = {
    userSessions,
    processingChats
};
