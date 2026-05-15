import axios from "axios";

// File ini mencoba mengambil config game dari CMS/config.json.

export async function loadConfig() {
  try {
    const res = await axios.get("/config.json");
    return res.data;
  } catch (err) {
    console.error("❌ GAGAL LOAD CMS:", err);
    // Jika config berhasil diambil, game memakai config dari CMS.
    // Jika gagal, game akan memakai default config.
    return null;
  }
}