
import {
    ref,
    push,
    set,
    update,
    remove,
    serverTimestamp,
    onValue,
    get,
    runTransaction,
  } from "firebase/database";
  
  import { database, auth } from "./firebase";
  
  // --------------------------------------
  // YÖNETİCİ KONTROLÜ
  // --------------------------------------
  
  async function verifyAdmin(tableId) {
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış.");
    }
  
    const snapshot = await get(ref(database, `tables/${tableId}`));
  
    if (!snapshot.exists()) {
      throw new Error("Masa bulunamadı.");
    }
  
    const table = snapshot.val();
  
    if (table.adminUid !== user.uid) {
      throw new Error("Bu işlem yalnızca masa yöneticisine açıktır.");
    }
  
    if (table.status !== "waiting") {
      throw new Error("Çekiliş başladıktan sonra liste değiştirilemez.");
    }
  }
  
  // --------------------------------------
  // İSİM KONTROLÜ
  // --------------------------------------
  
  function validateName(name) {
    if (typeof name !== "string") {
      throw new Error("Geçerli bir isim girilmelidir.");
    }
  
    const cleanName = name.trim();
  
    if (!cleanName) {
      throw new Error("Katılımcı ismi boş olamaz.");
    }
  
    if (cleanName.length > 40) {
      throw new Error("İsim en fazla 40 karakter olabilir.");
    }
  
    return cleanName;
  }
  
  // --------------------------------------
  // AYNI İSİM VAR MI?
  // --------------------------------------
  
  async function checkDuplicateName(tableId, name, excludedId = null) {
    const snapshot = await get(
      ref(database, `participants/${tableId}`)
    );
  
    const participants = snapshot.val() || {};
    const normalizedName = name.toLocaleLowerCase("tr-TR");
  
    const exists = Object.entries(participants).some(
      ([id, participant]) =>
        id !== excludedId &&
        participant.name?.toLocaleLowerCase("tr-TR") === normalizedName
    );
  
    if (exists) {
      throw new Error("Bu isim zaten katılımcı listesinde bulunuyor.");
    }
  }
  
  // --------------------------------------
  // MASA OLUŞTUR
  // --------------------------------------
  
  export async function createTable(tableName, adminName) {
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış.");
    }
  
    if (typeof tableName !== "string" || !tableName.trim()) {
      throw new Error("Masa adı boş olamaz.");
    }
  
    const cleanTableName = tableName.trim();
    const cleanAdminName = validateName(adminName);
  
    if (cleanTableName.length > 60) {
      throw new Error("Masa adı en fazla 60 karakter olabilir.");
    }
  
    const tableId = push(ref(database, "tables")).key;
  
    const participantRef = push(
      ref(database, `participants/${tableId}`)
    );
  
    const participantId = participantRef.key;
  
    if (!tableId || !participantId) {
      throw new Error("Benzersiz kayıt ID'si oluşturulamadı.");
    }
  
    const tableData = {
      id: tableId,
      name: cleanTableName,
      adminUid: user.uid,
      status: "waiting",
      createdAt: serverTimestamp(),
    };
  
    const participantData = {
      id: participantId,
      name: cleanAdminName,
      type: "admin",
      claimed: true,
      createdAt: serverTimestamp(),
    };
  
    const membershipData = {
      participantId,
      createdAt: serverTimestamp(),
    };
  
    try {
      await set(ref(database, `tables/${tableId}`), tableData);
  
      await set(participantRef, participantData);
  
      await set(
        ref(database, `memberships/${tableId}/${user.uid}`),
        membershipData
      );
  
      return tableId;
    } catch (error) {
      console.error("Masa oluşturma hatası:", error);
      throw error;
    }
  }
  
  // --------------------------------------
  // YÖNETİCİ KATILIMCI EKLER
  // --------------------------------------
  
  export async function addParticipant(tableId, participantName) {
    await verifyAdmin(tableId);
  
    const cleanName = validateName(participantName);
  
    await checkDuplicateName(tableId, cleanName);
  
    const participantRef = push(
      ref(database, `participants/${tableId}`)
    );
  
    const participantData = {
      id: participantRef.key,
      name: cleanName,
      type: "participant",
      claimed: false,
      createdAt: serverTimestamp(),
    };
  
    await set(participantRef, participantData);
  
    return participantRef.key;
  }
  
  // --------------------------------------
  // YÖNETİCİ KATILIMCI İSMİNİ DÜZENLER
  // --------------------------------------
  
  export async function updateParticipant(
    tableId,
    participantId,
    newName
  ) {
    await verifyAdmin(tableId);
  
    const cleanName = validateName(newName);
  
    const participantRef = ref(
      database,
      `participants/${tableId}/${participantId}`
    );
  
    const snapshot = await get(participantRef);
  
    if (!snapshot.exists()) {
      throw new Error("Katılımcı bulunamadı.");
    }
  
    const participant = snapshot.val();
  
    if (participant.type !== "participant") {
      throw new Error("Yönetici kaydı değiştirilemez.");
    }
  
    if (participant.claimed === true) {
      throw new Error("Sahiplenilmiş katılımcının ismi değiştirilemez.");
    }
  
    const claimSnapshot = await get(
      ref(database, `claims/${tableId}/${participantId}`)
    );
  
    if (claimSnapshot.exists()) {
      throw new Error("Bu isim sahiplenme işleminde. Düzenlenemez.");
    }
  
    await checkDuplicateName(tableId, cleanName, participantId);
  
    await update(participantRef, {
      name: cleanName,
    });
  }
  
  // --------------------------------------
  // YÖNETİCİ KATILIMCI SİLER
  // --------------------------------------
  
  export async function deleteParticipant(tableId, participantId) {
    await verifyAdmin(tableId);
  
    const participantRef = ref(
      database,
      `participants/${tableId}/${participantId}`
    );
  
    const snapshot = await get(participantRef);
  
    if (!snapshot.exists()) {
      throw new Error("Katılımcı bulunamadı.");
    }
  
    const participant = snapshot.val();
  
    if (participant.type !== "participant") {
      throw new Error("Yönetici kaydı silinemez.");
    }
  
    if (participant.claimed === true) {
      throw new Error("Sahiplenilmiş katılımcı silinemez.");
    }
  
    const claimSnapshot = await get(
      ref(database, `claims/${tableId}/${participantId}`)
    );
  
    if (claimSnapshot.exists()) {
      throw new Error("Bu isim sahiplenme işleminde. Silinemez.");
    }
  
    await remove(participantRef);
  }
  
  // --------------------------------------
  // DAVETLİ KATILIMCI İSMİNİ SAHİPLENİR
  // --------------------------------------
  
  export async function claimParticipant(tableId, participantId) {
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış.");
    }
  
    if (!tableId || !participantId) {
      throw new Error("Masa veya katılımcı bilgisi eksik.");
    }
  
    const tableSnapshot = await get(
      ref(database, `tables/${tableId}`)
    );
  
    if (!tableSnapshot.exists()) {
      throw new Error("Masa bulunamadı.");
    }
  
    if (tableSnapshot.val().status !== "waiting") {
      throw new Error("Bu masada artık katılım yapılamaz.");
    }
  
    const membershipRef = ref(
      database,
      `memberships/${tableId}/${user.uid}`
    );
  
    const membershipSnapshot = await get(membershipRef);
  
    if (membershipSnapshot.exists()) {
      const existingMembership = membershipSnapshot.val();
  
      if (existingMembership.participantId === participantId) {
        return {
          success: true,
          alreadyClaimed: true,
          participantId,
        };
      }
  
      throw new Error("Bu masada zaten bir isme sahipsin.");
    }
  
    const participantRef = ref(
      database,
      `participants/${tableId}/${participantId}`
    );
  
    const participantSnapshot = await get(participantRef);
  
    if (!participantSnapshot.exists()) {
      throw new Error("Katılımcı bulunamadı.");
    }
  
    const participant = participantSnapshot.val();
  
    if (participant.type !== "participant") {
      throw new Error("Bu katılımcı seçilemez.");
    }
  
    if (participant.claimed === true) {
      throw new Error("Bu isim daha önce sahiplenilmiş.");
    }
  
    const claimRef = ref(
      database,
      `claims/${tableId}/${participantId}`
    );
  
    const transactionResult = await runTransaction(
      claimRef,
      (currentData) => {
        if (currentData !== null) {
          return;
        }
  
        return {
          uid: user.uid,
          createdAt: Date.now(),
        };
      },
      { applyLocally: false }
    );
  
    if (!transactionResult.committed) {
      const claimSnapshot = await get(claimRef);
  
      if (
        !claimSnapshot.exists() ||
        claimSnapshot.val().uid !== user.uid
      ) {
        throw new Error("Bu isim başka biri tarafından sahiplenilmiş.");
      }
    }
  
    await set(membershipRef, {
      participantId,
      createdAt: serverTimestamp(),
    });
  
    await update(participantRef, {
      claimed: true,
    });
  
    return {
      success: true,
      alreadyClaimed: false,
      participantId,
    };
  }
  
  // --------------------------------------
  // ANA SAYFADAKİ MASALARI DİNLE
  // --------------------------------------
  
  export function subscribeToTables(callback, onError) {
    return onValue(
      ref(database, "tables"),
      (snapshot) => {
        const data = snapshot.val();
  
        if (!data) {
          callback([]);
          return;
        }
  
        const tableList = Object.entries(data).map(([id, table]) => ({
          id,
          name: table.name,
          adminUid: table.adminUid,
          participants: 0,
          capacity: 20,
          status:
            table.status === "started"
              ? "Çekiliş başladı"
              : "Hazırlanıyor",
        }));
  
        callback(tableList);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  }
  
  // --------------------------------------
  // TEK MASA BİLGİSİ
  // --------------------------------------
  
  export async function getTableById(tableId) {
    if (!tableId) {
      throw new Error("Masa ID'si belirtilmedi.");
    }
  
    const snapshot = await get(
      ref(database, `tables/${tableId}`)
    );
  
    return snapshot.exists() ? snapshot.val() : null;
  }
  
  // --------------------------------------
  // MASAYI GERÇEK ZAMANLI DİNLE
  // --------------------------------------
  
  export function subscribeToTable(tableId, callback, onError) {
    return onValue(
      ref(database, `tables/${tableId}`),
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  }
  
  // --------------------------------------
  // KATILIMCILARI GERÇEK ZAMANLI DİNLE
  // --------------------------------------
  
  export function subscribeToParticipants(tableId, callback, onError) {
    return onValue(
      ref(database, `participants/${tableId}`),
      (snapshot) => {
        const data = snapshot.val();
  
        if (!data) {
          callback([]);
          return;
        }
  
        const participantList = Object.entries(data).map(
          ([id, participant]) => ({
            id,
            name: participant.name,
            type: participant.type,
            claimed: participant.claimed,
          })
        );
  
        callback(participantList);
      },
      (error) => {
        if (onError) onError(error);
      }
    );
  }
  
  // --------------------------------------
  // KULLANICININ MASA ÜYELİĞİNİ GETİR
  // --------------------------------------
  
  export async function getMyMembership(tableId) {
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış.");
    }
  
    const snapshot = await get(
      ref(database, `memberships/${tableId}/${user.uid}`)
    );
  
    return snapshot.exists() ? snapshot.val() : null;
  }
  
  // --------------------------------------
  // ÇEKİLİŞİ BAŞLAT
  // --------------------------------------
  
  export async function startDraw(tableId) {
    await verifyAdmin(tableId);
  
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış.");
    }
  
    const tableSnapshot = await get(
      ref(database, `tables/${tableId}`)
    );
  
    if (!tableSnapshot.exists()) {
      throw new Error("Masa bulunamadı.");
    }
  
    const table = tableSnapshot.val();
  
    if (table.status !== "waiting") {
      throw new Error("Bu çekiliş zaten başlatılmış.");
    }
  
    const participantsSnapshot = await get(
      ref(database, `participants/${tableId}`)
    );
  
    if (!participantsSnapshot.exists()) {
      throw new Error("Katılımcı bulunamadı.");
    }
  
    const participants = Object.entries(
      participantsSnapshot.val()
    ).map(([id, participant]) => ({
      id,
      ...participant,
    }));
  
    // En az 3 katılımcı
    if (participants.length < 3) {
      throw new Error(
        "Çekilişi başlatmak için en az 3 katılımcı gereklidir."
      );
    }
  
    // Bütün isimler sahiplenilmiş olmalı
    const unclaimed = participants.some(
      (participant) => participant.claimed !== true
    );
  
    if (unclaimed) {
      throw new Error(
        "Çekilişi başlatmak için bütün katılımcılar isimlerini sahiplenmelidir."
      );
    }
  
    // Tek bir yönetici kaydı bulunmalı
    const adminParticipants = participants.filter(
      (participant) => participant.type === "admin"
    );
  
    if (adminParticipants.length !== 1) {
      throw new Error("Yönetici katılımcı kaydı geçersiz.");
    }
  
    // Katılımcıların UID bilgilerini bul
    const participantsWithUid = await Promise.all(
      participants.map(async (participant) => {
        if (participant.type === "admin") {
          return {
            ...participant,
            uid: table.adminUid,
          };
        }
  
        if (participant.type !== "participant") {
          throw new Error("Geçersiz katılımcı türü.");
        }
  
        const claimSnapshot = await get(
          ref(database, `claims/${tableId}/${participant.id}`)
        );
  
        if (!claimSnapshot.exists()) {
          throw new Error(
            `${participant.name} için sahiplenme kaydı bulunamadı.`
          );
        }
  
        const claim = claimSnapshot.val();
  
        return {
          ...participant,
          uid: claim.uid,
        };
      })
    );
  
    // Aynı UID birden fazla isim sahiplenmiş mi?
    const uniqueUids = new Set(
      participantsWithUid.map((participant) => participant.uid)
    );
  
    if (uniqueUids.size !== participantsWithUid.length) {
      throw new Error(
        "Birden fazla katılımcı aynı hesaba bağlı. Çekiliş başlatılamadı."
      );
    }
  
    // Fisher-Yates karıştırma
    const shuffled = [...participantsWithUid];
  
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
  
      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }
  
    // Rastgele döngüsel eşleştirme
    const offset =
      1 + Math.floor(Math.random() * (shuffled.length - 1));
  
    const drawResults = {};
    const createdAt = Date.now();
  
    shuffled.forEach((participant, index) => {
      const receiver =
        shuffled[(index + offset) % shuffled.length];
  
      if (participant.uid === receiver.uid) {
        throw new Error("Kendisiyle eşleşme hatası oluştu.");
      }
  
      drawResults[participant.uid] = {
        receiverParticipantId: receiver.id,
        createdAt,
      };
    });
  
    // Sonuçları ve masa durumunu tek çoklu konum güncellemesiyle kaydet
    await update(ref(database), {
      [`drawResults/${tableId}`]: drawResults,
      [`tables/${tableId}/status`]: "started",
    });
  
    return {
      success: true,
      participantCount: participants.length,
    };
  }
  
  // --------------------------------------
  // KULLANICININ ÇEKİLİŞ SONUCUNU GETİR
  // --------------------------------------
  
  export async function getMyDrawResult(tableId) {
    const user = auth.currentUser;
  
    if (!user) {
      throw new Error("Kullanıcı giriş yapmamış.");
    }
  
    const snapshot = await get(
      ref(database, `drawResults/${tableId}/${user.uid}`)
    );
  
    return snapshot.exists() ? snapshot.val() : null;
  }
  