import axios from "axios";

export async function loadConfig() {
  try {
    const res = await axios.get("/config.json");
    return res.data;
  } catch (err) {
    console.error("❌ GAGAL LOAD CMS:", err);
    return null;
  }
}