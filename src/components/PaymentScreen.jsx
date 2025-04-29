import React, { useState } from 'react';

const PaymentScreen = ({ amount = 115.00, onComplete, onClose }) => {
  const [tendered, setTendered] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');

  const exchangeRate = 0.80; // Example exchange rate (GBP to USD), adjust as needed
  const amountInPounds = amount * exchangeRate;
  const tenderedInPounds = tendered * exchangeRate;
  const balanceDueInPounds = amountInPounds - tenderedInPounds;
  const changeDueInPounds = Math.max(0, tenderedInPounds - amountInPounds);

  const handleNumberInput = (value) => {
    if (value === 'C') {
      setTendered(0);
    } else if (value === '00') {
      setTendered((prev) => prev * 100);
    } else {
      setTendered((prev) => parseFloat(`${prev}${value}`));
    }
  };

  const handleClear = () => {
    setTendered(0);
  };

  const quickCashValuesInPounds = [5, 10, 20, 50];
  const handleQuickCash = (value) => {
    setTendered((prev) => prev + value);
  };

  const processPayment = (method) => {
    setPaymentMethod(method);

    if (method === 'Cash' && tenderedInPounds < amountInPounds) {
      if (window.confirm(`Amount tendered is less than balance due. Proceed with payment?`)) {
        onComplete({
          method,
          amountTendered: tenderedInPounds,
          changeDue: 0,
        });
      }
      return;
    }

    if (method !== 'Cash' || tenderedInPounds >= amountInPounds) {
      onComplete({
        method,
        amountTendered: method === 'Cash' ? tenderedInPounds : amountInPounds,
        changeDue: method === 'Cash' ? changeDueInPounds : 0,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b">
          <h2 className="text-lg font-bold">Pay £{amountInPounds.toFixed(2)}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        {/* Amounts Display */}
        <div className="grid grid-cols-3 text-center p-3">
          <div>
            <div className="text-gray-500 text-xs">Tendered</div>
            <div className="text-lg font-semibold">£{tenderedInPounds.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Balance</div>
            <div className="text-lg font-semibold text-red-500">£{balanceDueInPounds.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">Change</div>
            <div className="text-lg font-semibold">£{changeDueInPounds.toFixed(2)}</div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex">
          {/* Left: Number Pad */}
          <div className="w-2/3 grid grid-cols-3/2 gap-1 p-3/4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'C'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumberInput(key.toString())}
                className={`p-1 rounded-md text-xl font-bold ${
                  key === 'C' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {key}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm font-semibold col-span-3"
            >
              &#x2715;
            </button>
          </div>

          {/* Right: Quick Cash + Payment Methods */}
          <div className="w-2/4 p-5 space-y-1">
            {quickCashValuesInPounds.map((value) => (
              <button
                key={value}
                onClick={() => handleQuickCash(value)}
                className="w-full p-4 bg-gray-100 hover:bg-gray-250 rounded-md text-sm font-semibold"
              >
                £{value}
              </button>
            ))}

            <button
              onClick={() => processPayment('Cash')}
              className="w-full p-2 bg-green-500 hover:bg-green-600 rounded-md text-white text-sm font-bold"
            >
              <span className="mr-1">£</span> Cash
            </button>
            <button
              onClick={() => processPayment('Credit Card')}
              className="w-full p-2 bg-red-500 hover:bg-red-600 rounded-md text-white text-sm font-bold flex items-center justify-center"
            >
              <span className="mr-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-2 w-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </span>
              Credit Card
            </button>
            
          </div>
        </div>

        {/* Bottom: Manual Card and Card on File */}
        <div className="flex border-t">
          <button className="flex-1 p-2 border-r text-center text-sm font-bold flex items-center justify-center">
            <span className="mr-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </span>
            Manual Card
          </button>
          <button className="flex-1 p-2 text-center text-sm font-bold flex items-center justify-center">
            <span className="mr-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7m-8 14H5a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v1m-8 14l2-2 2-2 2-2"
                />
              </svg>
            </span>
            Card File
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;
