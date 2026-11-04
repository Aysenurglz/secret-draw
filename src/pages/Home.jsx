
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Plus,
  Users,
  ArrowRight,
  Ticket,
  Search,
  X,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";

import {
  createTable as saveTableToFirebase,
  subscribeToTables,
} from "../services/tableService";

function Home() {
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [tableName, setTableName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Firebase'deki masaları gerçek zamanlı dinle
  useEffect(() => {
    const unsubscribe = subscribeToTables(
      (firebaseTables) => {
        console.log("Firebase'den gelen masalar:", firebaseTables);

        setTables(firebaseTables);
        setLoadError("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Masa listesi yüklenemedi:", error);

        setLoadError("Masalar yüklenirken bir hata oluştu.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Yeni masa oluştur ve yöneticiyi otomatik katılımcı yap
  const createTable = async () => {
    if (
      !tableName.trim() ||
      !adminName.trim() ||
      isCreating
    ) {
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const tableId = await saveTableToFirebase(
        tableName.trim(),
        adminName.trim()
      );

      setTableName("");
      setAdminName("");
      setShowCreate(false);

      navigate(`/table/${tableId}`);
    } catch (error) {
      console.error("Masa oluşturma hatası:", error);

      setCreateError(
        error.message || "Masa oluşturulamadı. Lütfen tekrar dene."
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Masa kodu veya bağlantısıyla masaya git
  const joinTable = () => {
    if (!searchCode.trim()) return;

    let tableId = searchCode.trim();

    try {
      if (tableId.startsWith("http")) {
        const url = new URL(tableId);
        const match = url.pathname.match(/\/table\/([^/]+)/);

        if (match) {
          tableId = match[1];
        }
      }
    } catch (error) {
      console.error("Bağlantı çözümlenemedi:", error);
    }

    if (tableId.includes("/table/")) {
      tableId = tableId.split("/table/")[1].split("/")[0];
    }

    if (!tableId) return;

    setSearchCode("");
    setShowJoin(false);

    navigate(`/table/${tableId}`);
  };

  return (
    <div className="app">
      <header className="navbar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Ticket size={23} />
          </span>

          <span>
            Secret<span className="brand-highlight">Draw</span>
          </span>
        </a>

        <nav className="nav-actions">
          <button
            className="nav-button secondary-nav"
            onClick={() => setShowJoin(true)}
          >
            Masaya Katıl
          </button>

          <button
            className="nav-button primary-nav"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} />
            Masa Oluştur
          </button>
        </nav>
      </header>

      <main className="main-container">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">
              <Sparkles size={15} />
              ARKADAŞLARINLA KURA ZAMANI
            </span>

            <h1>
              Şansını dene,
              <br />
              <span>ismini keşfet.</span>
            </h1>

            <p>
              Bir masa oluştur, arkadaşlarını davet et ve
              kimin kime çıktığını birlikte keşfedin.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={19} />
                Yeni Masa Oluştur
              </button>

              <button
                className="text-button"
                onClick={() => setShowJoin(true)}
              >
                Masaya Katıl
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <div className="hero-decoration">
            <div className="decoration-circle circle-one" />
            <div className="decoration-circle circle-two" />

            <div className="ticket-illustration">
              <Ticket size={100} strokeWidth={1.1} />
              <span>?</span>
            </div>

            <div className="floating-card floating-card-one">
              <Users size={17} />
              <span>Arkadaşların burada!</span>
            </div>

            <div className="floating-card floating-card-two">
              <Sparkles size={17} />
              <span>Sürpriz seni bekliyor</span>
            </div>
          </div>
        </section>

        <section className="tables-section">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">ÇEKİLİŞ ALANI</span>
              <h2>Masalar</h2>

              <p>
                Katıldığın veya oluşturduğun masaları burada bulabilirsin.
              </p>
            </div>

            <button
              className="outline-button"
              onClick={() => setShowJoin(true)}
            >
              <LinkIcon size={17} />
              Davet Bağlantısı
            </button>
          </div>

          {loadError && (
            <p style={{ color: "#b42318" }}>{loadError}</p>
          )}

          {isLoading ? (
            <p>Masalar yükleniyor...</p>
          ) : (
            <div className="table-grid">
              {tables.map((table) => (
                <article className="table-card" key={table.id}>
                  <div className="table-card-top">
                    <div className="table-icon">
                      <Ticket size={23} />
                    </div>

                    <span
                      className={`status ${
                        table.status === "Çekiliş başladı"
                          ? "status-active"
                          : "status-pending"
                      }`}
                    >
                      <span className="status-dot" />
                      {table.status}
                    </span>
                  </div>

                  <h3>{table.name}</h3>

                  <div className="table-footer">
                    <span className="participant-count">
                      <Users size={17} />
                      {table.participants}/{table.capacity} katılımcı
                    </span>

                    <button
                      className="card-arrow"
                      aria-label={`${table.name} masasını aç`}
                      onClick={() => navigate(`/table/${table.id}`)}
                    >
                      <ArrowRight size={19} />
                    </button>
                  </div>
                </article>
              ))}

              <button
                className="add-table-card"
                onClick={() => setShowCreate(true)}
              >
                <span className="add-icon">
                  <Plus size={25} />
                </span>

                <strong>Yeni masa oluştur</strong>
                <span>Kendi çekilişini başlat</span>
              </button>
            </div>
          )}

          {!isLoading && tables.length === 0 && !loadError && (
            <div className="empty-state">
              <Ticket size={36} />
              <h3>Henüz bir masan yok.</h3>
              <p>İlk masanı oluşturarak başlayabilirsin.</p>
            </div>
          )}
        </section>

        <footer className="footer">
          <span>SecretDraw</span>
          <span>Bir isim, bir şans, bir sürpriz.</span>
        </footer>
      </main>

      {/* Masa oluşturma penceresi */}
      {showCreate && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isCreating
            ) {
              setShowCreate(false);
              setCreateError("");
            }
          }}
        >
          <div className="modal">
            <button
              className="close-modal"
              onClick={() => {
                setShowCreate(false);
                setCreateError("");
              }}
              aria-label="Kapat"
              disabled={isCreating}
            >
              <X size={21} />
            </button>

            <span className="modal-eyebrow">YENİ ÇEKİLİŞ</span>

            <h2>Masanı oluştur</h2>

            <p>
              Masana ve kendine bir isim belirle.
              Sen de otomatik olarak katılımcı olacaksın.
            </p>

            <label htmlFor="tableName">Masa adı</label>

            <input
              id="tableName"
              type="text"
              placeholder="Örn. Üniversite Arkadaşları"
              value={tableName}
              maxLength={60}
              onChange={(event) => setTableName(event.target.value)}
              autoFocus
            />

            <label
              htmlFor="adminName"
              style={{ marginTop: "16px" }}
            >
              Senin ismin
            </label>

            <input
              id="adminName"
              type="text"
              placeholder="Örn. Ayşenur"
              value={adminName}
              maxLength={40}
              onChange={(event) => setAdminName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createTable();
              }}
            />

            {createError && (
              <p style={{ color: "#b42318", marginTop: "12px" }}>
                {createError}
              </p>
            )}

            <button
              className="primary-button modal-submit"
              onClick={createTable}
              disabled={
                !tableName.trim() ||
                !adminName.trim() ||
                isCreating
              }
            >
              <Plus size={18} />
              {isCreating ? "Oluşturuluyor..." : "Masayı Oluştur"}
            </button>
          </div>
        </div>
      )}

      {/* Masaya katılma penceresi */}
      {showJoin && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowJoin(false);
            }
          }}
        >
          <div className="modal">
            <button
              className="close-modal"
              onClick={() => setShowJoin(false)}
              aria-label="Kapat"
            >
              <X size={21} />
            </button>

            <span className="modal-eyebrow">DAVETLİSİN</span>

            <h2>Bir masaya katıl</h2>

            <p>
              Arkadaşının gönderdiği masa bağlantısını veya kodunu gir.
            </p>

            <label htmlFor="searchCode">
              Masa bağlantısı veya kodu
            </label>

            <div className="input-with-icon">
              <Search size={18} />

              <input
                id="searchCode"
                type="text"
                placeholder="Masa kodunu gir..."
                value={searchCode}
                onChange={(event) => setSearchCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") joinTable();
                }}
              />
            </div>

            <button
              className="primary-button modal-submit"
              onClick={joinTable}
              disabled={!searchCode.trim()}
            >
              Masaya Katıl
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
