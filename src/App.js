import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import { useState } from "react";

function App() {
  const [expenses, setExpenses] = useState([]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">Quản Lý Chi Tiêu</h1>
        <ExpenseForm setExpenses={setExpenses} />
        <ExpenseList expenses={expenses} setExpenses={setExpenses} />
      </div>
    </div>
  );
}

export default App;
