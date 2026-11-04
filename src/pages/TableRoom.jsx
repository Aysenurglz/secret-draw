
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ticket,
  Users,
  Crown,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  UserRound,
  Lock,
  Gift,
  Shuffle,
} from "lucide-react";

import { auth } from "../services/firebase";

import {
  getTableById,
  getMyMembership,
  getMyDrawResult,
  subscribeToParticipants,
  addParticipant,
  updateParticipant,
  deleteParticipant,
  startDraw,
} from "../services/tableService";

function TableRoom() {
  const { tableId } = useParams();
  const navigate = useNavigate();

  const [table, setTable] = useState(null);
  const [participants, setParticipants] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [participantError, setParticipantError] = useState("");

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const [hasJoined, setHasJoined] = useState(false);
  const [membershipChecked, setMembershipChecked] = useState(false);

  const [drawResult, setDrawResult] = useState(null);
  const [drawResultError, setDrawResultError] = useState("");
  const [isStartingDraw, setIsStartingDraw] = useState(false);

  const isAdmin = auth.currentUser?.uid === table?.adminUid;
  const isWaiting = table?.status === "waiting";
  const isStarted = table?.status === "started";

  const claimedCount = participants.filter(
    (participant) => participant.claimed === true
  ).length;

  const allParticipantsClaimed =
    participants.length > 0 &&
    claimedCount === participants.length;

  const canStartDraw =
    isAdmin &&
    isWaiting &&
    participants.length >= 3 &&
    allParticipantsClaimed;

  const myReceiver = drawResult
    ? participants.find(
        (participant) =>
          participant.id === drawResult.receiverParticipantId
      )
    : null;

  // --------------------------------------
  // MASA BİLGİLERİNİ GETİR
  // --------------------------------------

  useEffect(() => {
    let isMounted = true;

    async function loadTable() {
      try {
        setIsLoading(true);
        setError("");

        const tableData = await getTableById(tableId);

        if (!isMounted) return;

        if (!tableData) {
          setError("Bu masa bulunamadı.");
          return;
        }

        setTable(tableData);

        // Çekiliş daha önce başlatılmışsa kendi sonucunu getir.
        if (tableData.status === "started") {
          try {
            const result = await getMyDrawResult(tableId);

            if (isMounted) {
              setDrawResult(result);
            }
          } catch (resultError) {
            console.error("Çekiliş sonucu alınamadı:", resultError);

            if (isMounted) {
              setDrawResultError(
                "Çekiliş sonucu yüklenemedi. Lütfen tekrar dene."
              );
            }
          }
        }
      } catch (error) {
        console.error("Masa bilgileri yüklenemedi:", error);

        if (isMounted) {
          setError("Masa bilgileri yüklenirken bir hata oluştu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTable();

    return () => {
      isMounted = false;
    };
  }, [tableId]);

  // --------------------------------------
  // KULLANICI ÜYELİĞİNİ KONTROL ET
  // --------------------------------------

  useEffect(() => {
    let isMounted = true;

    async function checkMembership() {
      try {
        setMembershipChecked(false);
        setHasJoined(false);

        const membership = await getMyMembership(tableId);

        if (isMounted) {
          setHasJoined(Boolean(membership));
        }
      } catch (error) {
        console.error("Üyelik kontrolü yapılamadı:", error);
      } finally {
        if (isMounted) {
          setMembershipChecked(true);
        }
      }
    }

    checkMembership();

    return () => {
      isMounted = false;
    };
  }, [tableId]);

  // --------------------------------------
  // KATILIMCILARI GERÇEK ZAMANLI DİNLE
  // --------------------------------------

  useEffect(() => {
    if (!tableId) return;

    const unsubscribe = subscribeToParticipants(
      tableId,
      (participantList) => {
        setParticipants(participantList);
        setParticipantError("");
      },
      (error) => {
        console.error("Katılımcılar yüklenemedi:", error);
        setParticipantError("Katılımcı listesi yüklenemedi.");
      }
    );

    return () => unsubscribe();
  }, [tableId]);

  // --------------------------------------
  // YENİ KATILIMCI EKLE
  // --------------------------------------

  async function handleAddParticipant(event) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setActionMessage("");

      await addParticipant(tableId, newName);

      setNewName("");
      setActionMessage("Katılımcı başarıyla eklendi.");
    } catch (error) {
      console.error(error);
      setActionMessage(error.message || "Katılımcı eklenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  // --------------------------------------
  // DÜZENLEMEYİ BAŞLAT
  // --------------------------------------

  function startEditing(participant) {
    setEditingId(participant.id);
    setEditingName(participant.name);
    setActionMessage("");
  }

  // --------------------------------------
  // KATILIMCI İSMİNİ GÜNCELLE
  // --------------------------------------

  async function handleUpdateParticipant(participantId) {
    try {
      setIsSaving(true);
      setActionMessage("");

      await updateParticipant(
        tableId,
        participantId,
        editingName
      );

      setEditingId(null);
      setEditingName("");
      setActionMessage("Katılımcı ismi güncellendi.");
    } catch (error) {
      console.error(error);
      setActionMessage(error.message || "İsim güncellenemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  // --------------------------------------
  // KATILIMCI SİL
  // --------------------------------------

  async function handleDeleteParticipant(participant) {
    const confirmed = window.confirm(
      `${participant.name} isimli katılımcıyı silmek istiyor musun?`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      setActionMessage("");

      await deleteParticipant(tableId, participant.id);

      setActionMessage("Katılımcı silindi.");
    } catch (error) {
      console.error(error);
      setActionMessage(error.message || "Katılımcı silinemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  // --------------------------------------
  // MASAYA KATIL
  // --------------------------------------

  function handleJoinTable() {
    navigate(`/join/${tableId}`);
  }

  // --------------------------------------
  // ÇEKİLİŞİ BAŞLAT
  // --------------------------------------

  async function handleStartDraw() {
    if (participants.length < 3) {
      setActionMessage(
        "Çekilişi başlatmak için en az 3 katılımcı gereklidir."
      );
      return;
    }

    if (!allParticipantsClaimed) {
      setActionMessage(
        "Önce bütün katılımcıların isimlerini sahiplenmesini beklemelisin."
      );
      return;
    }

    const confirmed = window.confirm(
      "Çekilişi başlatmak istediğine emin misin? Bu işlemden sonra katılımcı listesi kilitlenecek ve eşleşmeler oluşturulacak."
    );

    if (!confirmed) return;

    try {
      setIsStartingDraw(true);
      setActionMessage("");
      setDrawResultError("");

      const result = await startDraw(tableId);

      if (!result.success) {
        throw new Error("Çekiliş başlatılamadı.");
      }

      // Masa durumunu güncelle
      setTable((previousTable) => ({
        ...previousTable,
        status: "started",
      }));

      // Kullanıcının kendi eşleşmesini getir
      const myResult = await getMyDrawResult(tableId);

      setDrawResult(myResult);

      setActionMessage(
        `Çekiliş başarıyla başlatıldı! ${result.participantCount} kişi eşleştirildi.`
      );
    } catch (error) {
      console.error("Çekiliş başlatma hatası:", error);

      setActionMessage(
        error.message || "Çekiliş başlatılırken bir hata oluştu."
      );
    } finally {
      setIsStartingDraw(false);
    }
  }

  // --------------------------------------
  // KULLANICININ SONUCUNU YENİDEN GETİR
  // --------------------------------------

  async function handleRefreshResult() {
    try {
      setDrawResultError("");

      const result = await getMyDrawResult(tableId);

      setDrawResult(result);
    } catch (error) {
      console.error(error);
      setDrawResultError("Sonuç yüklenemedi. Tekrar deneyebilirsin.");
    }
  }

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
            ÇEKİLİŞ ODASI
          </span>

          <h1>Masa Detayları</h1>

          {isLoading ? (
            <p>Masa bilgileri yükleniyor...</p>
          ) : error ? (
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
          ) : (
            <>
              {/* MASA BİLGİLERİ */}

              <article className="table-card">
                <div className="table-icon">
                  <Ticket size={23} />
                </div>

                <h3>{table.name}</h3>

                <p>
                  <strong>Masa ID:</strong> {table.id}
                </p>

                <p>
                  <strong>Durum:</strong>{" "}
                  {isWaiting
                    ? "Hazırlanıyor"
                    : "Çekiliş başladı"}
                </p>

                {isAdmin && (
                  <span className="admin-label">
                    <Crown size={14} />
                    Masa yöneticisi sensin
                  </span>
                )}
              </article>

              {/* MASAYA KATILMA ALANI */}

              {!isAdmin &&
                isWaiting &&
                membershipChecked &&
                !hasJoined && (
                  <article className="table-card">
                    <div className="table-icon">
                      <UserRound size={23} />
                    </div>

                    <h3>Bu çekilişe katıl</h3>

                    <p>
                      Katılımcı listesinden sana ayrılmış ismi
                      seçerek çekilişe katılabilirsin.
                    </p>

                    <button
                      className="primary-button"
                      onClick={handleJoinTable}
                    >
                      <Users size={18} />
                      Bu masaya katıl
                    </button>
                  </article>
                )}

              {!isAdmin &&
                isWaiting &&
                membershipChecked &&
                hasJoined && (
                  <article className="table-card">
                    <div className="table-icon">
                      <Check size={23} />
                    </div>

                    <h3>Bu masaya zaten katıldın</h3>

                    <p>
                      Katılımcı ismin hesabınla eşleştirilmiş
                      durumda. Bu masada ikinci bir isim alamazsın.
                    </p>
                  </article>
                )}

              {/* ÇEKİLİŞ SONUCU */}

              {isStarted && (
                <article className="table-card">
                  <div className="table-icon">
                    <Gift size={23} />
                  </div>

                  <h3>Senin Çekiliş Sonucun</h3>

                  {drawResultError ? (
                    <>
                      <p>{drawResultError}</p>

                      <button
                        className="primary-button"
                        onClick={handleRefreshResult}
                      >
                        Tekrar Dene
                      </button>
                    </>
                  ) : drawResult && myReceiver ? (
                    <>
                      <p>Hediye alacağın kişi:</p>

                      <h2>{myReceiver.name}</h2>

                      <p>
                        <Gift size={16} />
                        Bu sonuç yalnızca sana gösterilir.
                      </p>
                    </>
                  ) : drawResult ? (
                    <p>
                      Eşleşme bilgisi alındı. Katılımcı listesi
                      yükleniyor...
                    </p>
                  ) : (
                    <>
                      <p>
                        Bu hesap için henüz bir çekiliş sonucu
                        görüntülenemedi.
                      </p>

                      <button
                        className="primary-button"
                        onClick={handleRefreshResult}
                      >
                        Sonucumu Getir
                      </button>
                    </>
                  )}
                </article>
              )}

              {/* KATILIMCILAR */}

              <article className="table-card">
                <div className="table-icon">
                  <Users size={23} />
                </div>

                <h3>Katılımcılar</h3>

                <p>
                  Toplam <strong>{participants.length}</strong> kişi
                </p>

                <p>
                  Sahiplenilen isim:{" "}
                  <strong>{claimedCount}</strong> /{" "}
                  <strong>{participants.length}</strong>
                </p>

                {participantError ? (
                  <p>{participantError}</p>
                ) : participants.length === 0 ? (
                  <p>Henüz katılımcı bulunmuyor.</p>
                ) : (
                  <div className="participant-list">
                    {participants.map((participant, index) => {
                      const isCreator =
                        participant.type === "admin";

                      const canManage =
                        isAdmin &&
                        isWaiting &&
                        participant.type === "participant" &&
                        participant.claimed === false;

                      return (
                        <div
                          className="participant-item"
                          key={participant.id}
                        >
                          <div className="participant-number">
                            {index + 1}
                          </div>

                          {editingId === participant.id ? (
                            <input
                              className="participant-edit-input"
                              value={editingName}
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              maxLength={40}
                              autoFocus
                            />
                          ) : (
                            <span>{participant.name}</span>
                          )}

                          {isCreator && (
                            <span className="admin-label">
                              <Crown size={14} />
                              Yönetici
                            </span>
                          )}

                          {!isCreator &&
                            participant.claimed === true && (
                              <span className="participant-status">
                                <Lock size={13} />
                                Sahiplenildi
                              </span>
                            )}

                          {!isCreator &&
                            participant.claimed === false && (
                              <span className="participant-status">
                                Katılım bekleniyor
                              </span>
                            )}

                          {canManage && (
                            <div className="participant-actions">
                              {editingId === participant.id ? (
                                <>
                                  <button
                                    type="button"
                                    title="Kaydet"
                                    disabled={isSaving}
                                    onClick={() =>
                                      handleUpdateParticipant(
                                        participant.id
                                      )
                                    }
                                  >
                                    <Check size={17} />
                                  </button>

                                  <button
                                    type="button"
                                    title="Vazgeç"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditingName("");
                                    }}
                                  >
                                    <X size={17} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    title="Düzenle"
                                    onClick={() =>
                                      startEditing(participant)
                                    }
                                  >
                                    <Pencil size={17} />
                                  </button>

                                  <button
                                    type="button"
                                    title="Sil"
                                    disabled={isSaving}
                                    onClick={() =>
                                      handleDeleteParticipant(
                                        participant
                                      )
                                    }
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              {/* YÖNETİCİ ÇEKİLİŞ KONTROLÜ */}

              {isAdmin && isWaiting && (
                <article className="table-card">
                  <div className="table-icon">
                    <Shuffle size={23} />
                  </div>

                  <h3>Çekilişi Başlat</h3>

                  <p>
                    Çekilişin başlayabilmesi için en az 3 katılımcı
                    bulunmalı ve herkes kendi ismini sahiplenmiş
                    olmalıdır.
                  </p>

                  <p>
                    <strong>Katılımcı sayısı:</strong>{" "}
                    {participants.length}
                  </p>

                  <p>
                    <strong>Minimum katılımcı:</strong> 3
                  </p>

                  <p>
                    <strong>Sahiplenilen isim:</strong>{" "}
                    {claimedCount} / {participants.length}
                  </p>

                  {participants.length < 3 && (
                    <p>
                      Çekilişi başlatmak için en az{" "}
                      {3 - participants.length} kişi daha eklemelisin.
                    </p>
                  )}

                  {participants.length >= 3 &&
                    !allParticipantsClaimed && (
                      <p>
                        Bütün katılımcıların isimlerini
                        sahiplenmesini beklemelisin.
                      </p>
                    )}

                  {allParticipantsClaimed &&
                    participants.length >= 3 && (
                      <p>
                        <Check size={16} />
                        Çekiliş başlatılmaya hazır!
                      </p>
                    )}

                  <button
                    className="primary-button"
                    onClick={handleStartDraw}
                    disabled={!canStartDraw || isStartingDraw}
                  >
                    <Shuffle size={18} />
                    {isStartingDraw
                      ? "Çekiliş başlatılıyor..."
                      : "Çekilişi Başlat"}
                  </button>
                </article>
              )}

              {/* YÖNETİCİ KATILIMCI YÖNETİMİ */}

              {isAdmin && isWaiting && (
                <article className="table-card">
                  <div className="table-icon">
                    <Plus size={23} />
                  </div>

                  <h3>Katılımcı Ekle</h3>

                  <p>
                    Çekilişe katılacak kişinin ismini gir.
                  </p>

                  <form
                    onSubmit={handleAddParticipant}
                    className="participant-add-form"
                  >
                    <input
                      type="text"
                      value={newName}
                      onChange={(event) =>
                        setNewName(event.target.value)
                      }
                      placeholder="Katılımcı ismi"
                      maxLength={40}
                      required
                    />

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={isSaving}
                    >
                      <Plus size={17} />
                      {isSaving ? "Ekleniyor..." : "Ekle"}
                    </button>
                  </form>
                </article>
              )}

              {actionMessage && (
                <p className="participant-action-message">
                  {actionMessage}
                </p>
              )}

              {!isAdmin && (
                <p>
                  Bu masanın yöneticisi katılımcı listesini
                  yönetebilir.
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default TableRoom;
