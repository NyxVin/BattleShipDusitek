import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log("Connected:", socket.id);

    socket.emit("createRoom");
});

socket.on("roomCreated", (code) => {
    console.log("Room Code:", code);
});