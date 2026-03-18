import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Dashboard from "./pages/Dashboard";
import CarriersSummary from "./pages/carriers/CarriersSummary";
import CarriersPage from "./pages/carriers/CarriersPage";
import HandlersSummary from "./pages/handlers/HandlersSummary";
import HandlersPage from "./pages/handlers/HandlersPage";
import RegistryPage from "./pages/registry/RegistryPage";

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />

          {/* Carriers */}
          <Route path="carriers" element={<Navigate to="/carriers/summary" replace />} />
          <Route path="carriers/summary" element={<CarriersSummary />} />
          <Route path="carriers/land"    element={<CarriersPage type="land" />} />
          <Route path="carriers/water"   element={<CarriersPage type="water" />} />

          {/* Handlers */}
          <Route path="handlers" element={<Navigate to="/handlers/summary" replace />} />
          <Route path="handlers/summary" element={<HandlersSummary />} />
          <Route path="handlers/:province" element={<HandlersPage />} />

          {/* Registry */}
          <Route path="registry" element={<Navigate to="/registry/carriers" replace />} />
          <Route path="registry/carriers" element={<RegistryPage mode="carriers" />} />
          <Route path="registry/handlers" element={<RegistryPage mode="handlers" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
