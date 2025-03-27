import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import * as XLSX from "xlsx";

// Đăng ký Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const ExpenseList = () => {
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [total, setTotal] = useState(0);
  const [splitAmount, setSplitAmount] = useState(0);
  const [userTotals, setUserTotals] = useState({ Tài: 0, Thạch: 0 });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Mặc định chọn tháng hiện tại
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Điều khiển mở menu trên mobile
  
  // State cho từng nút
  const [showTotalSplit, setShowTotalSplit] = useState(false); // Hiển thị/ẩn Tổng & Chia Đôi
  const [showCategoryStats, setShowCategoryStats] = useState(false); // Hiển thị/ẩn Thống kê theo Danh mục
  const [showExportExcel, setShowExportExcel] = useState(false); // Hiển thị/ẩn Xuất Excel

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

  // 👉 Định dạng số tiền
  const formatCurrency = (amount) => amount.toLocaleString("vi-VN");

  // 👉 Định dạng ngày & giờ
  // 👉 Định dạng ngày & giờ
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return ""; // Kiểm tra nếu timestamp là null hoặc không có phương thức toDate
    const date = timestamp.toDate();
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 👉 Tính tổng chi tiêu & chia đôi
  const calculateTotalAndSplit = (filteredExpenses) => {
    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    setTotal(totalAmount);
    setSplitAmount(totalAmount / 2);

    // Tính tổng tiền mỗi người đóng
    const userExpenseTotals = { Tài: 0, Thạch: 0 };
    filteredExpenses.forEach((expense) => {
      if (userExpenseTotals[expense.enteredBy] !== undefined) {
        userExpenseTotals[expense.enteredBy] += expense.amount;
      }
    });

    setUserTotals(userExpenseTotals);
  };

  // 👉 Tính tổng tiền theo danh mục chi tiêu
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

  // 👉 Dữ liệu cho biểu đồ tròn
  const chartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#BA68C8", "#FFA726"],
        hoverBackgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4CAF50", "#BA68C8", "#FFA726"],
      },
    ],
  };

  // 👉 Xuất danh sách chi tiêu ra Excel
  const exportToExcel = (filteredExpenses) => {
    const ws = XLSX.utils.json_to_sheet(
      filteredExpenses.map((expense) => ({
        "Người nhập": expense.enteredBy,
        "Số tiền": formatCurrency(expense.amount),
        "Danh mục": expense.category, // Đổi description → category
        "Ngày nhập": formatDate(expense.date),
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chi tiêu");
    XLSX.writeFile(wb, "Danh_sach_chi_tieu.xlsx");
  };

  // 👉 Lọc chi tiêu theo tháng
  const filteredExpenses = selectedMonth === "all" ? expenses : expenses.filter((expense) => {
    // Kiểm tra nếu expense.date hợp lệ
    if (!expense.date || !expense.date.toDate) {
      console.warn("Dữ liệu không hợp lệ cho chi tiêu ID: ", expense.id);
      return false; // Loại bỏ chi tiêu này
    }
    const expenseMonth = expense.date.toDate().getMonth() + 1; // Tháng trong JavaScript là từ 0 đến 11
    return expenseMonth === parseInt(selectedMonth);
  });

  // Gọi hàm tính toán khi filteredExpenses thay đổi
  useEffect(() => {
    calculateTotalAndSplit(filteredExpenses);
    calculateCategoryTotals(filteredExpenses);
  }, [filteredExpenses]);

  return (
    <div className="overflow-x-auto p-4">
      {/* Nút lọc theo tháng */}
      <div className="flex mb-4 space-x-4">
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
              onClick={() => setShowExportExcel(!showExportExcel)} 
              className="w-full bg-yellow-500 text-white px-4 py-2 rounded-md"
            >
              📂 Xuất Excel
            </button>
          </div>
        )}
      </div>

      {/* Hiển thị nút và nội dung theo yêu cầu */}
      <div className="lg:flex lg:space-x-4 mb-4 hidden">
        <button onClick={() => setShowTotalSplit(!showTotalSplit)} className="bg-green-500 text-white px-4 py-2 rounded-md">
          💰 Tổng & Chia Đôi
        </button>
        <button onClick={() => setShowCategoryStats(!showCategoryStats)} className="bg-blue-500 text-white px-4 py-2 rounded-md">
          📊 Thống kê theo Danh mục
        </button>
        <button onClick={() => exportToExcel(filteredExpenses)}  className="bg-yellow-500 text-white px-4 py-2 rounded-md">
          📂 Xuất Excel
        </button>
      </div>

      {/* Hiển thị nội dung cho từng nút */}
      {showTotalSplit && (
        <div className="bg-gray-100 p-4 rounded-md mb-4">
          <p className="text-lg font-semibold">💰 Tổng chi tiêu: {formatCurrency(total)} đ</p>
          <p className="text-lg">🔄 Mỗi người cần đóng: {formatCurrency(splitAmount)} đ</p>
          <p className="text-lg text-green-600">👤 Tài đã đóng: {formatCurrency(userTotals["Tài"])} đ</p>
          <p className="text-lg text-blue-600">👤 Thạch đã đóng: {formatCurrency(userTotals["Thạch"])} đ</p>

          {/* Tính số tiền cần chuyển để cân bằng */}
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
        <div className="w-1/2 mx-auto mb-6">
          <Doughnut data={chartData} />
        </div>
      )}

     
        <div className="mb-4">
         
        </div>
      

      {/* Bảng hiển thị danh sách chi tiêu */}
      <table className="w-full text-sm text-left border-collapse border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="border border-gray-300 px-4 py-2">👤 Người nhập</th>
            <th className="border border-gray-300 px-4 py-2">💵 Số tiền</th>
            <th className="border border-gray-300 px-4 py-2">📌 Danh mục</th>
            <th className="border border-gray-300 px-4 py-2">📅 Ngày nhập</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ExpenseList;
