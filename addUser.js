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

async function addUser() {
  const user = {
    firstName: "Test",
    lastName: "User",
    email: "user@gmail.com",
    password: "password123"
  };

  try {
    const docRef = await addDoc(collection(db, "users"), user);
    console.log("User added with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding user: ", e);
  }
}

addUser();
