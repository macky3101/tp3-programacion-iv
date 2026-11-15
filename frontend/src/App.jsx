import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./Auth.jsx";
import { Layout } from "./Layout.jsx";
import { Home } from "./Home.jsx";
import { Login } from "./Login.jsx";
import { Registro } from "./Registro.jsx";

function NoEncontrada() {
  return (
    <section className="panel">
      <h1>Página no encontrada</h1>
    </section>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="registro" element={<Registro />} />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
