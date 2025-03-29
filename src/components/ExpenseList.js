import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase"; // Đảm bảo đường dẫn đúng đến tệp firebase.js
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import * as XLSX from "xlsx";

// Đăng ký Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const TELEGRAM_BOT_TOKEN = "7577251581:AAG5svPnqikSK_RI_7L4y96spEL7RUvBpgY";
const TELEGRAM_CHAT_ID = "-1002646067684";

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [total, setTotal] = useState(0);
  const [splitAmount, setSplitAmount] = useState(0);
  const [userTotals, setUserTotals] = useState({ Tài: 0, Thạch: 0 });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTotalSplit, setShowTotalSplit] = useState(false);
  const [showCategoryStats, setShowCategoryStats] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(data);
    });

    return () => unsubscribe();
  }, []);

  const formatCurrency = (amount) => amount.toLocaleString("vi-VN");
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "";
    const date = timestamp.toDate();
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalAndSplit = (filteredExpenses) => {
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotal(totalAmount);
    setSplitAmount(totalAmount / 2);

    const userExpenseTotals = { Tài: 0, Thạch: 0 };
    filteredExpenses.forEach((expense) => {
      if (userExpenseTotals[expense.enteredBy] !== undefined) {
        userExpenseTotals[expense.enteredBy] += expense.amount;
      }
    });

    setUserTotals(userExpenseTotals);
  };

  const calculateCategoryTotals = (filteredExpenses) => {
    const totals = {};
    filteredExpenses.forEach((expense) => {
      if (!totals[expense.category]) {
        totals[expense.category] = 0;
      }
      totals[expense.category] += expense.amount;
    });

    setCategoryTotals(totals);
  };

  const exportToExcel = (filteredExpenses) => {
    const ws = XLSX.utils.json_to_sheet(
      filteredExpenses.map((expense) => ({
        "Người nhập": expense.enteredBy,
        "Số tiền": formatCurrency(expense.amount),
        "Danh mục": expense.category,
        "Ngày nhập": formatDate(expense.date),
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chi tiêu");
    XLSX.writeFile(wb, "Danh_sach_chi_tieu.xlsx");
  };

  const filteredExpenses = selectedMonth === "all" ? expenses : expenses.filter((expense) => {
    if (!expense.date || !expense.date.toDate) {
      return false;
    }
    const expenseMonth = expense.date.toDate().getMonth() + 1;
    return expenseMonth === parseInt(selectedMonth);
  });

  useEffect(() => {
    calculateTotalAndSplit(filteredExpenses);
    calculateCategoryTotals(filteredExpenses);
  }, [filteredExpenses]);

  const sendTelegramNotification = async (message) => {
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

  const saveEditedExpense = async () => {
    if (editingExpense) {
      const { id, amount: oldAmount, ...updatedData } = editingExpense;
      await setDoc(doc(db, "expenses", id), updatedData);
      const message = `✏️ Chi tiêu đã chỉnh sửa%0A👤 Người nhập: ${updatedData.enteredBy}%0A💵 Số tiền cũ: ${oldAmount.toLocaleString("vi-VN")} đ%0A💵 Số tiền mới: ${updatedData.amount.toLocaleString("vi-VN")} đ%0A📌 Danh mục: ${updatedData.category}%0A📅 Ngày: ${new Date().toLocaleString("vi-VN")}`;
      await sendTelegramNotification(message);
      setEditingExpense(null);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa chi tiêu này?")) {
      const expenseToDelete = expenses.find(expense => expense.id === id);
      await deleteDoc(doc(db, "expenses", id));
      const message = `🗑️ Chi tiêu đã xóa%0A👤 Người nhập: ${expenseToDelete.enteredBy}%0A💵 Số tiền: ${expenseToDelete.amount.toLocaleString("vi-VN")} đ (đã xóa)%0A📌 Danh mục: ${expenseToDelete.category}%0A📅 Ngày: ${formatDate(expenseToDelete.date)}`;
      await sendTelegramNotification(message);
    }
  };

  const sendMonthlyStats = async () => {
    const monthlyTotals = {};
    
    expenses.forEach(expense => {
      const date = expense.date.toDate();
      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
      if (!monthlyTotals[monthYear]) {
        monthlyTotals[monthYear] = 0;
      }
      monthlyTotals[monthYear] += expense.amount;
    });

    let message = "📊 Thống kê chi tiêu tháng:\n";
    for (const [monthYear, total] of Object.entries(monthlyTotals)) {
      message += `🗓️ ${monthYear}: ${formatCurrency(total)} đ\n`;
    }

    await sendTelegramNotification(message);
  };

  return (
    <div className="overflow-x-auto p-4">
      {/* Nút lọc theo tháng */}
      <div className="flex mb-4 space-x-4 flex-wrap">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Tất cả</option>
          <option value="1">Tháng 1</option>
          <option value="2">Tháng 2</option>
          <option value="3">Tháng 3</option>
          <option value="4">Tháng 4</option>
          <option value="5">Tháng 5</option>
          <option value="6">Tháng 6</option>
          <option value="7">Tháng 7</option>
          <option value="8">Tháng 8</option>
          <option value="9">Tháng 9</option>
          <option value="10">Tháng 10</option>
          <option value="11">Tháng 11</option>
          <option value="12">Tháng 12</option>
        </select>
      </div>

      {/* Menu mobile */}
      <div className="lg:hidden flex justify-between items-center mb-4">
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰ Menu
        </button>

        {isMobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white shadow-lg rounded-md p-4 space-y-2">
            <button 
              onClick={() => setShowTotalSplit(!showTotalSplit)} 
              className="w-full bg-green-500 text-white px-4 py-2 rounded-md"
            >
              💰 Tổng & Chia Đôi
            </button>
            <button 
              onClick={() => setShowCategoryStats(!showCategoryStats)} 
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              📊 Thống kê theo Danh mục
            </button>
            <button 
              onClick={() => exportToExcel(filteredExpenses)} 
              className="w-full bg-yellow-500 text-white px-4 py-2 rounded-md"
            >
              📂 Xuất Excel
            </button>
            <button 
              onClick={sendMonthlyStats} 
              className="w-full bg-purple-500 text-white px-4 py-2 rounded-md"
            >
              📈 Gửi Thống kê tháng
            </button>
          </div>
        )}
      </div>

      {/* Giao diện sửa chi tiêu */}
      {editingExpense && (
        <div className="bg-gray-100 p-4 rounded-md mb-4">
          <h3 className="font-semibold">Sửa chi tiêu</h3>
          <input
            type="number"
            value={editingExpense.amount}
            onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })}
            placeholder="Số tiền"
            className="border rounded-md px-2 py-1 mb-2"
          />
          <input
            type="text"
            value={editingExpense.category}
            onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
            placeholder="Danh mục"
            className="border rounded-md px-2 py-1 mb-2"
          />
          <button onClick={saveEditedExpense} className="bg-blue-500 text-white px-4 py-2 rounded-md">
            Lưu
          </button>
          <button onClick={() => setEditingExpense(null)} className="bg-red-500 text-white px-4 py-2 rounded-md ml-2">
            Hủy
          </button>
        </div>
      )}

      {/* Hiển thị nút và nội dung theo yêu cầu */}
      <div className="lg:flex lg:space-x-4 mb-4 hidden">
        <button onClick={() => setShowTotalSplit(!showTotalSplit)} className="bg-green-500 text-white px-4 py-2 rounded-md">
          💰 Tổng & Chia Đôi
        </button>
        <button onClick={() => setShowCategoryStats(!showCategoryStats)} className="bg-blue-500 text-white px-4 py-2 rounded-md">
          📊 Thống kê theo Danh mục
        </button>
        <button onClick={() => exportToExcel(filteredExpenses)} className="bg-yellow-500 text-white px-4 py-2 rounded-md">
          📂 Xuất Excel
        </button>
        <button onClick={sendMonthlyStats} className="bg-purple-500 text-white px-4 py-2 rounded-md">
          📈 Gửi Thống kê tháng
        </button>
      </div>

      {/* Hiển thị nội dung cho từng nút */}
      {showTotalSplit && (
        <div className="bg-gray-100 p-4 rounded-md mb-4">
          <p className="text-lg font-semibold">💰 Tổng chi tiêu: {formatCurrency(total)} đ</p>
          <p className="text-lg">🔄 Mỗi người cần đóng: {formatCurrency(splitAmount)} đ</p>
          <p className="text-lg text-green-600">👤 Tài đã đóng: {formatCurrency(userTotals["Tài"])} đ</p>
          <p className="text-lg text-blue-600">👤 Thạch đã đóng: {formatCurrency(userTotals["Thạch"])} đ</p>

          {userTotals["Tài"] !== userTotals["Thạch"] && (
            <p className="text-red-600 font-bold">
              {userTotals["Tài"] > userTotals["Thạch"]
                ? `👉 Thạch cần trả Tài ${formatCurrency(userTotals["Tài"] - splitAmount)} đ`
                : `👉 Tài cần trả Thạch ${formatCurrency(userTotals["Thạch"] - splitAmount)} đ`}
            </p>
          )}
        </div>
      )}

      {showCategoryStats && (
        <div className="w-full md:w-1/2 mx-auto mb-6">
          <Doughnut data={{
            labels: Object.keys(categoryTotals),
            datasets: [{
              data: Object.values(categoryTotals),
              backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#BA68C8", "#FFA726"],
              hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#BA68C8", "#FFA726"],
            }],
          }} />
        </div>
      )}

      {/* Bảng hiển thị danh sách chi tiêu */}
      <table className="w-full text-sm text-left border-collapse border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="border border-gray-300 px-4 py-2">👤 Người nhập</th>
            <th className="border border-gray-300 px-4 py-2">💵 Số tiền</th>
            <th className="border border-gray-300 px-4 py-2">📌 Danh mục</th>
            <th className="border border-gray-300 px-4 py-2">📅 Ngày nhập</th>
            <th className="border border-gray-300 px-4 py-2">⚙️ Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense) => (
            <tr key={expense.id} className="border-b">
              <td className="border border-gray-300 px-4 py-2">{expense.enteredBy}</td>
              <td className="border border-gray-300 px-4 py-2 text-red-600 font-semibold">
                {formatCurrency(expense.amount)} đ
              </td>
              <td className="border border-gray-300 px-4 py-2">{expense.category}</td>
              <td className="border border-gray-300 px-4 py-2 text-gray-600">{formatDate(expense.date)}</td>
              <td className="border border-gray-300 px-4 py-2">
                <button onClick={() => handleEditExpense(expense)} className="bg-yellow-500 text-white px-2 py-1 rounded-md">
                  Sửa
                </button>
                <button onClick={() => deleteExpense(expense.id)} className="bg-red-500 text-white px-2 py-1 rounded-md ml-2">
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExpenseList;
