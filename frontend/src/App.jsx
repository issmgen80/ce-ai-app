import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './components/pages/Landing'
import BudgetStep from './components/wizard/BudgetStep'
import UseCasesStep from './components/wizard/UseCasesStep'
import BodyStep from './components/wizard/BodyStep'
import FuelStep from './components/wizard/FuelStep'
import FeaturesStep from './components/wizard/FeaturesStep'
import ResultsStep from './components/wizard/ResultsStep'
import LoadingStep from './components/wizard/LoadingStep'
import ChatPage from './components/pages/ChatPage'
import Profile from './components/pages/Profile'
import Saved from './components/pages/Saved'
import { WizardProvider } from './context/WizardContext'



function App() {
  return (

    <WizardProvider>

    <Router>
      <div className="min-h-screen bg-carexpert-off-white">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/find/budget" element={<BudgetStep />} />
          <Route path="/find/use-cases" element={<UseCasesStep />} />
          <Route path="/find/body" element={<BodyStep />} />
          <Route path="/find/fuel" element={<FuelStep />} />
          <Route path="/find/features" element={<FeaturesStep />} />
          <Route path="/find/loading" element={<LoadingStep />} />
          <Route path="/find/results" element={<ResultsStep />} />
          <Route path="/ai" element={<ChatPage />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

       

      </div>
    </Router>

     </WizardProvider>
  )
}

export default App