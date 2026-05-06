import React, { useState } from 'react';
import HomePage from './components/HomePage';
import ChatWindow from './components/ChatWindow';
import './App.css';

function App() {
  const [student, setStudent] = useState(null); // { userId, name }

  const handleStartChat = (data) => {
    setStudent({ userId: data.userId, name: data.name });
  };

  return (
    <div className="app-root">
      {!student ? (
        <HomePage onStartChat={handleStartChat} />
      ) : (
        <ChatWindow student={student} />
      )}
    </div>
  );
}

export default App;
