const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBPcHgtS1jvZw0VRavxvcYW8oIZK_8nPE4",
  authDomain: "scheduler-f1463.firebaseapp.com",
  projectId: "scheduler-f1463",
  storageBucket: "scheduler-f1463.firebasestorage.app",
  messagingSenderId: "859695122247",
  appId: "1:859695122247:web:61af75cbd7759dc81aee62"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listAllSchedules() {
  console.log("Fetching all documents in 'schedules'...");
  const qs = await getDocs(collection(db, "schedules"));
  const docs = [];
  qs.forEach(d => {
    docs.push({ id: d.id, data: d.data() });
  });
  console.log(JSON.stringify(docs, null, 2));
}

listAllSchedules().catch(console.error);
