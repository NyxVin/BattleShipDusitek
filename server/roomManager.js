// Menyimpan semua room aktif di memory server.
// Object ini dipakai untuk menyimpan data room yang sedang berjalan.
// Membuat kode room acak, contoh: AB-1234.
export const rooms = {};
export function generateRoomCode(){
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    
    for (let i = 0; i < 2; i++) {
        code += letters[Math.floor(Math.random() * letters.length)];
    }

        code += "-";
    for (let i = 0; i < 4; i++) {
        code += Math.floor(Math.random() * 10);
    }

    return code;

}