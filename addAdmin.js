import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAjfAasOgyTdJuHOc-IgetTkzAkY_8hyII",
  authDomain: "car-damage-claim-7768a.firebaseapp.com",
  projectId: "car-damage-claim-7768a",
  storageBucket: "car-damage-claim-7768a.firebasestorage.app",
  messagingSenderId: "1031409781145",
  appId: "1:1031409781145:web:ee74a79b028ff84219eb08",
  measurementId: "G-4H9BMFK180",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addAdmin() {
  const admins = [
    { email: "admin@gmail.com", password: "hello12" },
    { email: "admin2@gmail.com", password: "adminpass2" },
    { email: "admin3@gmail.com", password: "adminpass3" }
  ];

  for (const admin of admins) {
    try {
      const docRef = await addDoc(collection(db, "admins"), admin);
      console.log("Admin added with ID: ", docRef.id);
    } catch (e) {
      console.error("Error adding admin: ", e);
    }
  }
}

addAdmin();
