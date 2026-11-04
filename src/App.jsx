
import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Home";
import TableRoom from "./pages/TableRoom";
import JoinTable from "./pages/JoinTable";

import {
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";

import { auth } from "./services/firebase";

function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Kullanıcı giriş yaptı:", user.uid);
        return;
      }

      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Anonim giriş hatası:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/table/:tableId"
          element={<TableRoom />}
        />

        <Route
          path="/join/:tableId"
          element={<JoinTable />}
        />

        <Route
          path="*"
          element={
            <main className="main-container">
              <h1>Sayfa bulunamadı</h1>
              <a href="/">Ana sayfaya dön</a>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
