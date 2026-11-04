
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Ticket,
  ArrowLeft,
  Users,
  Info,
  CheckCircle2,
  Lock,
  UserRound,
} from "lucide-react";
import { ref, get } from "firebase/database";

import {
  getTableById,
  subscribeToParticipants,
  claimParticipant,
  getMyMembership,
} from "../services/tableService";

import { database } from "../services/firebase";

function JoinTable() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [joinedName, setJoinedName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Belirli bir katılımcıyı getir
  async function getParticipantById(participantId) {
    const snapshot = await get(
      ref(database, `participants/${tableId}/${participantId}`)
    );

    return snapshot.exists() ? snapshot.val() : null;
  }

  // Masa, üyelik ve katılımcıları yükle
  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      try {
        const tableData = await getTableById(tableId);

        if (!isMounted) return;

        if (!tableData) {
          setError("Bu çekiliş masası bulunamadı.");
          return;
        }

        setTable(tableData);

        const membership = await getMyMembership(tableId);

        if (!isMounted) return;

        if (membership) {
          const participant = await getParticipantById(
            membership.participantId
          );

          if (!isMounted) return;

          if (participant) {
            setJoinedName(participant.name);
          }
        }
      } catch (err) {
        console.error("Masa yüklenemedi:", err);

        if (isMounted) {
          setError(
            "Masa bilgileri yüklenirken bir hata oluştu. Lütfen tekrar dene."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    const unsubscribe = subscribeToParticipants(
      tableId,
      (participantList) => {
        if (isMounted) {
          setParticipants(participantList);
        }
      },
      (err) => {
        console.error("Katılımcılar yüklenemedi:", err);

        if (isMounted) {
          setError("Katılımcı listesi yüklenemedi.");
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tableId]);

  // İsim sahiplen
  async function handleClaim() {
    if (!selectedId) {
      setError("Lütfen önce bir isim seç.");
      return;
    }

    const selectedParticipant = participants.find(
      (participant) => participant.id === selectedId
    );

    if (
      !selectedParticipant ||
      selectedParticipant.type !== "participant" ||
      selectedParticipant.claimed
    ) {
      setError("Bu isim artık seçilebilir değil.");
      return;
    }

    const confirmed = window.confirm(
      `"${selectedParticipant.name}" ismini sahiplenmek istiyor musun?`
    );

    if (!confirmed) return;

    setIsClaiming(true);
    setError("");
    setSuccessMessage("");

    try {
      await claimParticipant(tableId, selectedId);

      setJoinedName(selectedParticipant.name);
      setSelectedId("");

      setSuccessMessage(
        `"${selectedParticipant.name}" ismi başarıyla sahiplenildi!`
      );
    } catch (err) {
      console.error("İsim sahiplenme hatası:", err);

      setError(
        err.message || "İsim sahiplenilirken bir hata oluştu."
      );
    } finally {
      setIsClaiming(false);
    }
  }

  // Yalnızca yönetici tarafından eklenen boş isimler
  const availableParticipants = participants.filter(
    (participant) =>
      participant.type === "participant" &&
      participant.claimed === false
  );

  return (
    <div className="app">
      <header className="navbar">
        <button
          className="nav-button secondary-nav"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={18} />
          Ana Sayfa
        </button>

        <a href="/" className="brand">
          <span className="brand-icon">
            <Ticket size={23} />
          </span>

          <span>
            Secret<span className="brand-highlight">Draw</span>
          </span>
        </a>
      </header>

      <main className="main-container">
        <section className="tables-section">
          <span className="section-eyebrow">
            ÇEKİLİŞE KATIL
          </span>

          {isLoading ? (
            <p>Masa bilgileri yükleniyor...</p>
          ) : error && !table ? (
            <div className="empty-state">
              <Ticket size={36} />
              <h3>{error}</h3>

              <button
                className="primary-button"
                onClick={() => navigate("/")}
              >
                Ana Sayfaya Dön
              </button>
            </div>
          ) : table ? (
            <>
              <article className="table-card">
                <div className="table-icon">
                  <Users size={23} />
                </div>

                <h3>{table.name}</h3>

                <p>Bu çekilişe davet edildin!</p>

                <p>
                  <strong>Masa durumu:</strong>{" "}
                  {table.status === "waiting"
                    ? "Katılımcılar bekleniyor"
                    : "Çekiliş başladı"}
                </p>

                <p>
                  <strong>Masa ID:</strong> {table.id}
                </p>
              </article>

              {joinedName ? (
                <article className="table-card">
                  <div className="table-icon">
                    <CheckCircle2 size={23} />
                  </div>

                  <h3>Çekilişe katıldın!</h3>

                  <p>Bu masadaki katılımcı ismin:</p>

                  <h2>{joinedName}</h2>

                  <p>
                    İsmin hesabınla eşleştirildi. Aynı tarayıcıdan
                    tekrar geldiğinde sistem seni tanıyacak.
                  </p>
                </article>
              ) : table.status !== "waiting" ? (
                <article className="table-card">
                  <div className="table-icon">
                    <Lock size={23} />
                  </div>

                  <h3>Katılım kapandı</h3>

                  <p>
                    Çekiliş başladığı için artık yeni katılımcı
                    kabul edilmiyor.
                  </p>
                </article>
              ) : (
                <article className="table-card">
                  <div className="table-icon">
                    <UserRound size={23} />
                  </div>

                  <h3>Kendi ismini seç</h3>

                  <p>
                    Yönetici tarafından eklenen isimler arasından
                    kendine ait olanı seç.
                  </p>

                  <div className="join-participant-list">
                    {participants.length === 0 ? (
                      <p>Henüz katılımcı eklenmemiş.</p>
                    ) : availableParticipants.length === 0 ? (
                      <p>
                        Şu anda sahiplenilebilecek boş bir isim yok.
                      </p>
                    ) : (
                      availableParticipants.map((participant) => (
                        <button
                          key={participant.id}
                          type="button"
                          className={`join-participant-option ${
                            selectedId === participant.id
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedId(participant.id);
                            setError("");
                          }}
                          disabled={isClaiming}
                        >
                          <span>{participant.name}</span>

                          <span>
                            {selectedId === participant.id
                              ? "Seçildi"
                              : "Seç"}
                          </span>
                        </button>
                      ))
                    )}

                    {participants.some(
                      (participant) =>
                        participant.claimed === true
                    ) && (
                      <p className="join-claimed-info">
                        <Lock size={14} />
                        Sahiplenilmiş isimler artık seçilemez.
                      </p>
                    )}
                  </div>

                  {error && (
                    <p className="form-error">{error}</p>
                  )}

                  {successMessage && (
                    <p className="form-success">
                      {successMessage}
                    </p>
                  )}

                  <button
                    className="primary-button"
                    onClick={handleClaim}
                    disabled={!selectedId || isClaiming}
                  >
                    {isClaiming
                      ? "İsim sahipleniliyor..."
                      : "İsmimi Sahiplen"}
                  </button>

                  <p className="join-reminder">
                    Listede ismin yoksa masa yöneticisinden
                    seni eklemesini iste.
                  </p>
                </article>
              )}

              <article className="table-card join-info-card">
                <div className="table-icon">
                  <Info size={23} />
                </div>

                <h3>Nasıl çalışır?</h3>

                <div className="join-info-content">
                  <p>
                    Yönetici çekilişe katılacak kişilerin
                    isimlerini önceden ekler.
                  </p>

                  <p>
                    Sen de listeden kendi ismini seçerek
                    çekilişe katılırsın.
                  </p>

                  <p>
                    Her isim yalnızca bir kişi tarafından
                    sahiplenilebilir.
                  </p>

                  <p>
                    Listede ismin yoksa masa yöneticisinden
                    eklemesini isteyebilirsin.
                  </p>
                </div>
              </article>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default JoinTable;
