import React from "react";

const ExpenseItem = ({ expense }) => {
  return (
    <div>
      <h3>{expense.name}</h3>
      <p>Số tiền: {expense.amount} VNĐ</p>
      <p>Ngày: {expense.date}</p>
    </div>
  );
};

export default ExpenseItem;
