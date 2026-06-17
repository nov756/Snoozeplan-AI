import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Safe resolution of directory names without global scope clashes
const resolvedFilename = typeof __filename !== "undefined" ? __filename : (typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "");
const resolvedDirname = typeof __dirname !== "undefined" ? __dirname : (resolvedFilename ? path.dirname(resolvedFilename) : process.cwd());

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
      console.warn("GEMINI_API_KEY is not defined. Running in Local Rule-based Fallback Mode.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ---------------- LOCAL RULE-BASED FALLBACK PROCESSOR ----------------
// If Gemini is not set up or fails, we generate highly accurate scheduling optimization locally
function runLocalOptimization(schedules: any[], mode: string) {
  let updatedSchedules = [...schedules];
  let conflictText: string | null = null;
  let hasOverlap = false;

  // 1. Sort by start time
  updatedSchedules.sort((a, b) => a.start.localeCompare(b.start));

  // 2. Check for conflicts: Social event during work hour 13:00 - 17:00
  // Or general direct time overlaps
  const socialConflicting = updatedSchedules.find(item => 
    item.category === "sosial" && item.start >= "13:00" && item.start < "17:00"
  );

  if (socialConflicting) {
    conflictText = `Terdeteksi jadwal sosial "${socialConflicting.title}" (${socialConflicting.start}) berbenturan dengan waktu kerja pilar Magang/Bootcamp Anda (13:00 - 17:00).`;
    hasOverlap = true;

    if (mode === "resolve") {
      updatedSchedules = updatedSchedules.map(item => {
        if (item.id === socialConflicting.id) {
          return {
            ...item,
            start: "19:00",
            end: "20:30",
            title: `${item.title} (Digeser AI ke Jam Aman)`
          };
        }
        return item;
      });
      conflictText = null;
    }
  }

  // 3. Check for direct overlaps
  for (let i = 0; i < updatedSchedules.length; i++) {
    for (let j = i + 1; j < updatedSchedules.length; j++) {
      const a = updatedSchedules[i];
      const b = updatedSchedules[j];
      // Simple direct collision check if same start or overlapping
      if (a.start === b.start && a.id !== b.id) {
        conflictText = `Terdeteksi waktu mulai ganda pada jam ${a.start} antara "${a.title}" dan "${b.title}".`;
        hasOverlap = true;
        if (mode === "resolve") {
          // move b 1 hour later
          const [h, m] = b.start.split(":").map(Number);
          const newH = String((h + 1) % 24).padStart(2, "0");
          const newStart = `${newH}:${String(m).padStart(2, "0")}`;
          const [eh, em] = b.end.split(":").map(Number);
          const newEH = String((eh + 1) % 24).padStart(2, "0");
          const newEnd = `${newEH}:${String(em).padStart(2, "0")}`;

          updatedSchedules[j] = {
            ...b,
            start: newStart,
            end: newEnd,
            title: `${b.title} (Dilonggarkan AI)`
          };
          conflictText = null;
        }
      }
    }
  }

  // 4. Sleep intrusion count
  let sleepIntrusions = 0;
  updatedSchedules.forEach(item => {
    // Overlapping 22:00 - 05:00
    if (item.start >= "22:00" || item.start < "05:00" || item.end > "22:00" || item.end <= "05:00") {
      if (item.category !== 'biologis') {
        sleepIntrusions++;
      }
    }
  });

  // Calculate circadian energy score
  let baseScore = 95;
  if (hasOverlap) baseScore -= 15;
  if (sleepIntrusions > 0) baseScore -= (sleepIntrusions * 20);
  const score = Math.max(15, Math.min(100, baseScore));

  const sleepHours = Math.max(5.0, 8.0 - (sleepIntrusions * 1.5));

  const coachingTips = [
    "Usahakan selesai beraktivitas 1 jam sebelum jam tidur sirkadian Anda (22.00) agar melatonin berproduksi optimal.",
    "Bilah energi sirkadian Anda stabil hari ini. Pastikan hidrasi tercukupi selama jam kerja intensif.",
    "Mengatur jeda waktu 15 menit antar kegiatan membantu menurunkan tingkat stres kortisol secara ilmiah."
  ];
  const tip = coachingTips[Math.floor(Math.random() * coachingTips.length)];

  const mockTodos = [
    { id: "todo-1", task: "Selesaikan lembar analisis kegiatan harian", completed: false },
    { id: "todo-2", task: "Matikan layar gadget 30 menit sebelum slot tidur esensial", completed: false }
  ];

  return {
    success: true,
    schedules: updatedSchedules,
    todos: mockTodos,
    energyScore: score,
    sleepDurationHours: sleepHours,
    conflictText,
    coachingTip: tip
  };
}

// ---------------- API ENDPOINTS ----------------

app.post("/api/optimize", async (req: Request, res: Response): Promise<void> => {
  try {
    const { schedules, mode } = req.body; // mode: "analyze" | "resolve"

    if (!Array.isArray(schedules)) {
      res.status(400).json({ error: "Schedules must be an array" });
      return;
    }

    const ai = getGemini();
    if (!ai) {
      // Local rule-based fallback mode
      const result = runLocalOptimization(schedules, mode);
      res.json({
        ...result,
        isLocalFallback: true,
        fallbackReason: "no-key"
      });
      return;
    }

    // Call Gemini API to perform circadian reasoning
    const prompt = `Anda adalah asisten sirkadian SnoozePlan AI Pro.
Diberikan daftar kegiatan harian pengguna berikut ini dalam format JSON:
${JSON.stringify(schedules, null, 2)}

Sistem mengunci jendela waktu tidur "22:00 - 05:00" sebagai slot terlindungi secara biologis (Slot Tidur Esensial sirkadian).
Tugas Anda:
1. Hitung skor sirkadian energi tubuh (0-100) berdasarkan kesehatan sirkadian jadwal ini (tidur cukup, tidak menabrak slot 22:00 - 05:00, jarak aktivitas).
2. Hitung jumlah durasi tidur sehat (jam tidur) yang tersisa.
3. Temukan jika ada konflik (pertemuan ganda di waktu sama, atau kegiatan sosial ("sosial") di sela jam kerja magang "eksternal" antara 13:00 - 17:00, atau melanggar jam tidur sirkadian). Jelaskan konflik dalam 1 kalimat bahasa Indonesia di 'conflictText'.
4. Jika mode adalah "resolve", pindahkan otomatis kegiatan sosial atau kegiatan bentrok lainnya ke jam aman siang/sore/malam hari (paling ideal adalah jam 19:00 - 20:30 atau di sela jam longgar), lalu ganti nama atau tambahkan keterangan "(Digeser AI ke Jam Aman)" di judulnya.
5. Berikan tip saran kesehatan sirkadian ringkas di 'coachingTip' (maksimal 2 kalimat).
6. Hasilkan 2-3 butir todo task cerdas di 'todos'.

Format respons harus berupa JSON VALID murni, persis sesuai skema ini tanpa markdown wrapper (yaitu tanpa backticks \`\`\`json ... \`\`\`):
{
  "schedules": [ 
    { "id": "...", "title": "...", "start": "HH:MM", "end": "HH:MM", "category": "..." }
  ],
  "todos": [
    { "id": "...", "task": "...", "completed": false }
  ],
  "energyScore": 85,
  "sleepDurationHours": 7,
  "conflictText": "Terdeteksi konflik antara...", // atau null jika tidak ada konflik
  "coachingTip": "Saran sirkadian..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // low temperature for precise JSON structuring
      }
    });

    const text = response.text || "";
    try {
      // Clean up markdown wrapping if Gemini wraps it despite instructions
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }
      
      const parsed = JSON.parse(cleanedText);
      if (parsed.schedules && Array.isArray(parsed.schedules)) {
        parsed.schedules = parsed.schedules.map((newS: any) => {
          const matchedOriginal = schedules.find((orig: any) => orig.id === newS.id);
          return {
            ...newS,
            reminderMinutes: matchedOriginal && matchedOriginal.reminderMinutes !== undefined ? matchedOriginal.reminderMinutes : (newS.reminderMinutes !== undefined ? newS.reminderMinutes : -1),
            reminderFired: matchedOriginal && matchedOriginal.reminderFired !== undefined ? matchedOriginal.reminderFired : false
          };
        });
      }
      res.json({
        success: true,
        ...parsed
      });
    } catch (parseError) {
      console.warn("Gemini output parsing failed (logged as warning). Output was:", text);
      // Fallback local computation if AI returned invalid JSON
      const result = runLocalOptimization(schedules, mode);
      res.json({
        ...result,
        isLocalFallback: true,
        fallbackReason: "parse-failure"
      });
    }

  } catch (error: any) {
    const errorStr = String(error?.message || error);
    const isQuotaError = errorStr.includes("quota") || errorStr.includes("429") || errorStr.includes("limit") || error?.status === "RESOURCE_EXHAUSTED";
    
    if (isQuotaError) {
      console.warn("Gemini API Quota atau Rate Limit terlampaui. Mengalihkan proses ke mesin lokal SnoozePlan secara otomatis.");
    } else {
      console.warn("Proses Optimasi Gemini terganggu:", errorStr);
    }
    
    // Safe fallback so user experience is never interrupted
    const { schedules, mode } = req.body;
    const result = runLocalOptimization(schedules || [], mode || "analyze");
    res.json({
      ...result,
      isLocalFallback: true,
      fallbackReason: isQuotaError ? "quota-exceeded" : "api-error"
    });
  }
});

// Vite server integrations
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
