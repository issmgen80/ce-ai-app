import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './components/pages/Landing'
import ChatPage from './components/pages/ChatPage'
import Profile from './components/pages/Profile'
import Saved from './components/pages/Saved'



function App() {
  return (

    

    <Router>
      <div className="min-h-screen bg-carexpert-off-white">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/ai" element={<ChatPage />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

       

      </div>
    </Router>

     
  )
}

export default App