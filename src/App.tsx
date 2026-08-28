import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { NoteDetail } from './pages/NoteDetail';
import { Architecture } from './pages/Architecture';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes/:id" element={<NoteDetail />} />
          <Route path="/architecture" element={<Architecture />} />
        </Routes>
      </Layout>
    </Router>
  );
}
