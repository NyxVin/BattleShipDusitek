import { io } from "socket.io-client";

// ambil dari .env
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// koneksi ke server
export const socket = io(SERVER_URL);

// debug (opsional tapi bagus)
console.log("SERVER URL:", SERVER_URL);