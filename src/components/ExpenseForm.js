import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const TELEGRAM_BOT_TOKEN = "7577251581:AAG5svPnqikSK_RI_7L4y96spEL7RUvBpgY";
const TELEGRAM_CHAT_ID = "-1002646067684";

const ExpenseForm = () => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Ăn uống");
  const [enteredBy, setEnteredBy] = useState("Thạch");

  // 👉 Hàm định dạng số tiền nhập vào (tự thêm dấu ",")
  const formatCurrencyInput = (value) => {
    const numericValue = value.replace(/\D/g, ""); // Loại bỏ ký tự không phải số
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // Thêm dấu ","
  };

  const sendTelegramNotification = async (expense) => {
    const message = `💰 Chi tiêu mới%0A👤 Người nhập: ${expense.enteredBy}%0A💵 Số tiền: ${expense.amount.toLocaleString("vi-VN")} đ%0A📌 Danh mục: ${expense.category}%0A📅 Ngày: ${new Date().toLocaleString("vi-VN")}`;
  
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${message}`;
  
    try {
      const response = await fetch(url);
      const result = await response.json();
      
      if (!result.ok) {
        console.error("❌ Lỗi từ Telegram:", result);
      }
    } catch (error) {
      console.error("❌ Lỗi gửi thông báo Telegram:", error);
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !category) return;

    const newExpense = {
      amount: parseInt(amount.replace(/,/g, ""), 10),
      category,
      enteredBy,
      date: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "expenses"), newExpense);
      sendTelegramNotification(newExpense);
      setAmount("");
      setCategory("Ăn uống");
    } catch (error) {
      console.error("Lỗi khi thêm chi tiêu:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 shadow-md rounded-lg">
      <div className="mb-2">
        <label className="block text-gray-700">👤 Người nhập</label>
        <select
          value={enteredBy}
          onChange={(e) => setEnteredBy(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="Tài">Tài</option>
          <option value="Thạch">Thạch</option>
        </select>
      </div>
      <div className="mb-2">
        <label className="block text-gray-700">💵 Số tiền</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
          className="w-full p-2 border rounded"
          placeholder="Nhập số tiền" 
        />
      </div>
      <div className="mb-2">
        <label className="block text-gray-700">📌 Danh mục chi tiêu</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="Ăn uống">🍔 Ăn uống</option>
          <option value="Mua sắm">🛍️ Mua sắm</option>
          <option value="Giải trí">🎮 Giải trí</option>
          <option value="Hóa đơn">💡 Hóa đơn</option>
          <option value="Khác">❓ Khác</option>
        </select>
      </div>
      <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
        ➕ Thêm chi tiêu
      </button>
    </form>
  );
};

export default ExpenseForm;
