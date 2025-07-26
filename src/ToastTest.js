import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ToastTest() {
  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => toast('Hello from Toast!')}>Show Toast</button>
      <ToastContainer position="top-center" autoClose={4000} />
    </div>
  );
} 