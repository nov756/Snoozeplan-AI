import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Moon, 
  X, 
  Clock, 
  Zap, 
  Check, 
  Coffee, 
  Award,
  BookOpen,
  Briefcase,
  Users,
  Search,
  MessageSquare,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  History,
  Sliders,
  Calendar,
  Heart,
  Lightbulb,
  Sun,
  Activity,
  ArrowRight,
  TrendingUp,
  Smile,
  ShieldCheck,
  RefreshCw,
  Download,
  Edit2,
  Mic,
  MicOff,
  ChevronDown,
  Play,
  User,
  LogOut,
  LogIn,
  Lock
} from "lucide-react";
import { ScheduleItem, TodoItem, OptimizationResponse } from "./types";
import WeeklyInsights from "./components/WeeklyInsights";

const defaultSchedules: ScheduleItem[] = [
  { id: "1", title: "Kuliah Reguler: Jaringan Jaringan Komputer", start: "08:00", end: "10:30", category: "akademik", reminderMinutes: 15, reminderFired: false },
  { id: "2", title: "Sesi Magang Profesional (MSIB)", start: "13:00", end: "17:00", category: "eksternal", reminderMinutes: 30, reminderFired: false },
  { id: "3", title: "Diskusi Kelompok & Hangout Santai", start: "19:00", end: "20:30", category: "sosial", reminderMinutes: 15, reminderFired: false },
];

const defaultTodos: TodoItem[] = [
  { id: "todo-1", task: "Selesaikan lembar analisis kegiatan harian", completed: false },
  { id: "todo-2", task: "Matikan layar gadget 30 menit sebelum slot tidur esensial", completed: false },
  { id: "todo-3", task: "Minum air putih hangat setelah bangun tidur sirkadian", completed: true },
];

// Helper to intelligently parse Indonesian vocal input text into an agenda object
function parseIndonesianSpeechToAgenda(text: string) {
  const t = text.toLowerCase().trim();
  
  // 1. Guess category
  let category: 'akademik' | 'eksternal' | 'sosial' = 'akademik';
  if (/magang|msib|kerja|kantor|proyek|mitra|scrum|mentor|meeting|rapat|briefing|sync|internship|intern/i.test(t)) {
    category = 'eksternal';
  } else if (/makan|sosial|hangout|kopi|cafe|jalan|nonton|keluarga|pacar|santai|rileks|olahraga|main|futsal|game|hiburan/i.test(t)) {
    category = 'sosial';
  } else if (/kuliah|kelas|belajar|akademik|matkul|tugas|dosen|praktikum|ujian|buku|sinau|kursus/i.test(t)) {
    category = 'akademik';
  }

  // 2. Parse times
  let normalized = t;
  const numReplacements: [RegExp, string][] = [
    [/setengah/g, "30"],
    [/satu/g, "1"],
    [/dua/g, "2"],
    [/tiga/g, "3"],
    [/empat/g, "4"],
    [/lima/g, "5"],
    [/enam/g, "6"],
    [/tujuh/g, "7"],
    [/delapan/g, "8"],
    [/sembilan/g, "9"],
    [/sepuluh/g, "10"],
    [/sebelas/g, "11"],
    [/dua belas/g, "12"],
    [/lewat/g, ""],
    [/kurang/g, ""]
  ];
  
  numReplacements.forEach(([regex, repl]) => {
    normalized = normalized.replace(regex, repl);
  });

  const timeRegex = /(?:jam|pukul)?\s*(\d{1,2})(?:[\.:](\d{2}))?\s*(pagi|siang|sore|malam)?/gi;
  let matches: Array<{ hour: number; minute: number; text: string }> = [];
  let match;

  while ((match = timeRegex.exec(normalized)) !== null) {
    let hour = parseInt(match[1], 10);
    let minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];

    if (hour > 24) continue;

    if (period === "siang" && hour < 12) {
      if (hour <= 4 || hour === 1 || hour === 2 || hour === 3) hour += 12;
    } else if (period === "sore" && hour < 12) {
      hour += 12;
    } else if (period === "malam" && hour < 12) {
      hour += 12;
    }

    matches.push({ hour, minute, text: match[0] });
  }

  if (matches.length >= 2) {
    const first = matches[0];
    const second = matches[1];
    if (first.hour >= 8 && first.hour < 12 && second.hour >= 1 && second.hour <= 7) {
      second.hour += 12;
    } else if (first.hour >= 12 && second.hour < first.hour && second.hour >= 1 && second.hour <= 11) {
      second.hour += 12;
    }
  }

  let startStr = "08:00";
  let endStr = "09:00";

  if (matches.length > 0) {
    const sh = String(matches[0].hour).padStart(2, "0");
    const sm = String(matches[0].minute).padStart(2, "0");
    startStr = `${sh}:${sm}`;
    
    if (matches.length > 1) {
      const eh = String(matches[1].hour).padStart(2, "0");
      const em = String(matches[1].minute).padStart(2, "0");
      endStr = `${eh}:${em}`;
    } else {
      const eh = String((matches[0].hour + 1) % 24).padStart(2, "0");
      const em = String(matches[0].minute).padStart(2, "0");
      endStr = `${eh}:${em}`;
    }
  }

  // 3. Extract clean Title
  let title = text;
  title = title.replace(/(?:jam|pukul)?\s*\d{1,2}(?:[\.:]\d{2})?\s*(?:pagi|siang|sore|malam)?/gi, "");
  
  const wordsToStrip = [
    /\bdari\b/gi, /\bpada\b/gi, /\bsampai\b/gi, /\bhingga\b/gi, /\buntuk\b/gi, /\bdengan\b/gi, 
    /\bkategori\b/gi, /\bakademik\b/gi, /\bmsib\b/gi, /\beksternal\b/gi, /\bsosial\b/gi, 
    /\bpagi\b/gi, /\bsiang\b/gi, /\bsore\b/gi, /\bmalam\b/gi, /\bjam\b/gi, /\bpukul\b/gi,
    /\bdan\b/gi, /\bke\b/gi, /\bs\.d\b/gi, /\bsd\b/gi
  ];
  
  wordsToStrip.forEach(w => {
    title = title.replace(w, "");
  });

  title = title.replace(/\s+/g, " ").trim();
  title = title.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

  if (title) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    title = "Acara Dikte Suara Baru";
  }

  return {
    title,
    start: startStr,
    end: endStr,
    category
  };
}

export default function App() {
  // User Account Authentication and Profiling ("Data Diri")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("snooze_user_logged_in") === "true";
  });

  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    age: string;
    gender: 'Laki-laki' | 'Perempuan';
    chronotype: 'Early Bird' | 'Night Owl' | 'Balanced';
    sleepTarget: number;
  }>(() => {
    const saved = localStorage.getItem("snooze_user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      name: "Nadya",
      email: "nadin8258@gmail.com",
      age: "21",
      gender: "Perempuan",
      chronotype: "Early Bird",
      sleepTarget: 8
    };
  });

  // Sync user profile changes to local storage
  useEffect(() => {
    localStorage.setItem("snooze_user_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  // Sync login status
  useEffect(() => {
    localStorage.setItem("snooze_user_logged_in", isLoggedIn ? "true" : "false");
  }, [isLoggedIn]);

  // Persistence state
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem("snooze_schedules");
    return saved ? JSON.parse(saved) : defaultSchedules;
  });

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem("snooze_todos");
    return saved ? JSON.parse(saved) : defaultTodos;
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // UI forms
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formCategory, setFormCategory] = useState<'akademik' | 'eksternal' | 'sosial'>("akademik");
  const [formReminderMinutes, setFormReminderMinutes] = useState<number>(15);

  // AI & Circadian state
  const [energyScore, setEnergyScore] = useState(85);
  const [sleepDurationHours, setSleepDurationHours] = useState(7.5);
  const [conflictText, setConflictText] = useState<string | null>(null);
  const [coachingTip, setCoachingTip] = useState(
    "Menjaga konsistensi sirkadian menstabilkan pelepasan kortisol harian dan mengoptimalkan fungsi kognitif Anda secara biologis."
  );
  const [isLoaderActive, setIsLoaderActive] = useState(false);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Time ticker state
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Reminder alert and notification states
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulationTime, setSimulationTime] = useState("07:45");
  const [activeAlert, setActiveAlert] = useState<ScheduleItem | null>(null);
  const [activeAlertMinutesLeft, setActiveAlertMinutesLeft] = useState<number>(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<string>(() => {
    return localStorage.getItem("snooze_sound_type") || "circadian";
  });
  const [circadianReminderFired, setCircadianReminderFired] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<{ id: string; time: string; text: string; category: string }[]>(() => {
    const saved = localStorage.getItem("snooze_notification_logs");
    return saved ? JSON.parse(saved) : [];
  });

  // Sync soundType to localStorage
  useEffect(() => {
    localStorage.setItem("snooze_sound_type", soundType);
  }, [soundType]);

  // Selected schedule template index for beautiful visualization highlight
  const [activeTemplate, setActiveTemplate] = useState<string>("default");

  // Quick-Edit states for managing selected schedule inline popover
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editCategory, setEditCategory] = useState<'akademik' | 'eksternal' | 'sosial'>("akademik");
  const [editReminderMinutes, setEditReminderMinutes] = useState<number>(15);

  // Voice Dictation States
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedbackText, setVoiceFeedbackText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  // Check SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const handleToggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      alert("Browser Anda tidak mendukung Web Speech API (Perekaman Suara). Gunakan Google Chrome atau browser modern lainnya.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "id-ID";
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedbackText("🎙️ Mendengarkan... Silakan berbicara sekarang!");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceFeedbackText(`Terdeteksi: "${transcript}"`);
        
        // Match details
        const parsed = parseIndonesianSpeechToAgenda(transcript);
        
        setFormTitle(parsed.title);
        setFormStart(parsed.start);
        setFormEnd(parsed.end);
        setFormCategory(parsed.category);

        const timeLabel = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        setNotificationLogs(prev => [
          {
            id: String(Date.now() + Math.random()),
            time: timeLabel,
            text: `[Dikte Suara Berhasil] "${transcript}" -> Agenda: "${parsed.title}" Jam: ${parsed.start} s/d ${parsed.end} (${parsed.category})`,
            category: parsed.category
          },
          ...prev
        ].slice(0, 30));
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setVoiceFeedbackText("Terjadi error: Izin akses mikrofon ditolak browser.");
          alert("Akses mikrofon ditolak. Berikan izin di browser untuk memanfaatkan fitur pendaftaran suara.");
        } else {
          setVoiceFeedbackText(`Error mikrofon: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditStart(item.start);
    setEditEnd(item.end);
    setEditCategory(item.category as 'akademik' | 'eksternal' | 'sosial');
    setEditReminderMinutes(item.reminderMinutes ?? 15);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) {
      alert("Nama agenda tidak boleh kosong!");
      return;
    }
    if (!editStart || !editEnd) {
      alert("Jam mulai dan selesai tidak boleh kosong!");
      return;
    }

    const updatedSchedules = schedules.map(item => {
      if (item.id === id) {
        return {
          ...item,
          title: editTitle.trim(),
          start: editStart,
          end: editEnd,
          category: editCategory,
          reminderMinutes: editReminderMinutes,
          reminderFired: false // Reset fire state so user receives new alarms
        };
      }
      return item;
    });

    setSchedules(updatedSchedules);
    setEditingItemId(null);

    // Save logs as nice user feedback
    const timeLabel = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setNotificationLogs(prev => [
      {
        id: String(Date.now() + Math.random()),
        time: timeLabel,
        text: `[Ubah Sukses] Agenda diubah menjadi "${editTitle.trim()}"`,
        category: editCategory
      },
      ...prev
    ].slice(0, 30));

    // Retrigger AI sync analysis
    triggerServiceOptimization(updatedSchedules, "analyze");
  };

  // Sync time on mount
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync notification logs to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem("snooze_notification_logs", JSON.stringify(notificationLogs));
  }, [notificationLogs]);

  // Audio synthesis helper for beautiful notification warning chime (Major chord on Sky Blue + Green energy)
  const playAlertSound = (overrideType?: string) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const currentSound = overrideType || soundType;

      if (currentSound === "nature") {
        // Nature birds morning chirp synthesizer
        [0, 0.22, 0.44].forEach((delay) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          const startTime = audioCtx.currentTime + delay;
          osc.type = "sine";
          osc.frequency.setValueAtTime(1600, startTime);
          osc.frequency.exponentialRampToValueAtTime(3200, startTime + 0.07);
          osc.frequency.exponentialRampToValueAtTime(1900, startTime + 0.14);
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.09, startTime + 0.02);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);
          
          osc.start(startTime);
          osc.stop(startTime + 0.15);
        });
      } else if (currentSound === "zen") {
        // Buddhist / Zen Meditation bowl chime sound with long rich delay harmonic structure
        const baseFreq = 220; // Beautiful clean harmonic root A3
        const harmonics = [1, 1.5, 2, 2.5, 3, 4];
        harmonics.forEach((h, index) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          const startTime = audioCtx.currentTime;
          osc.frequency.setValueAtTime(baseFreq * h, startTime);
          
          const volume = 0.08 / h;
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.06);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);
          
          osc.type = index === 0 ? "triangle" : "sine";
          osc.start(startTime);
          osc.stop(startTime + 2.1);
        });
      } else if (currentSound === "ocean") {
        // Simulating deep calming ocean melatonin-inducing sleep wave 
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const startTime = audioCtx.currentTime;
        osc.type = "sine";
        osc.frequency.setValueAtTime(85, startTime);
        osc.frequency.linearRampToValueAtTime(140, startTime + 0.9);
        osc.frequency.linearRampToValueAtTime(75, startTime + 1.9);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.5);
        gainNode.gain.linearRampToValueAtTime(0.07, startTime + 1.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);
        
        osc.start(startTime);
        osc.stop(startTime + 2.1);
      } else {
        // "circadian" (default) Light cheerful major arpeggio [C5 - E5 - G5 - C6]
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, index) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.1);
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + index * 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + index * 0.1 + 0.35);
          
          osc.type = "sine";
          osc.start(audioCtx.currentTime + index * 0.1);
          osc.stop(audioCtx.currentTime + index * 0.1 + 0.4);
        });
      }
    } catch (e) {
      console.warn("AudioContext need user gesture interaction context first.", e);
    }
  };

  // Periodic reminder scheduler scanner loop
  useEffect(() => {
    const checkReminders = () => {
      let checkHour = 0;
      let checkMin = 0;

      if (isSimulationMode) {
        const [h, m] = simulationTime.split(":").map(Number);
        checkHour = h || 0;
        checkMin = m || 0;
      } else {
        const now = new Date();
        checkHour = now.getHours();
        checkMin = now.getMinutes();
      }

      const totalCheckMinutes = checkHour * 60 + checkMin;
      let updatedSchedules = [...schedules];
      let didChange = false;

      schedules.forEach((item, index) => {
        if (item.category === "biologis" || item.reminderMinutes === undefined || item.reminderMinutes === -1) {
          return;
        }

        const [startH, startM] = item.start.split(":").map(Number);
        const totalStartMinutes = startH * 60 + startM;

        // Threshold pre-warning trigger
        const remindTriggerMinutes = totalStartMinutes - item.reminderMinutes;

        // If time reaches trigger time, event not finished, and not yet fired
        if (
          totalCheckMinutes >= remindTriggerMinutes && 
          totalCheckMinutes < totalStartMinutes && 
          !item.reminderFired
        ) {
          updatedSchedules[index] = { ...item, reminderFired: true };
          didChange = true;

          const minutesLeft = totalStartMinutes - totalCheckMinutes;
          setActiveAlert(item);
          setActiveAlertMinutesLeft(minutesLeft);
          playAlertSound();

          // Save to persistent notification history logs
          const timeLabel = isSimulationMode 
            ? `${simulationTime} (Simulasi)` 
            : new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" });

          const labelTxt = item.reminderMinutes === 0 ? "Tepat Waktu" : `${item.reminderMinutes} mnt sebelum`;
          const logMsg = `[Alarm Berbunyi] "${item.title}" akan dimulai pukul ${item.start}!`;

          setNotificationLogs(prev => [
            {
              id: String(Date.now() + Math.random()),
              time: timeLabel,
              text: logMsg,
              category: item.category
            },
            ...prev
          ].slice(0, 30));
        }
      });

      // 30 mins before 22:00 circadian sleep check (pukul 21:30)
      const circadianSleepThreshold = 21 * 60 + 30; // 1290 minutes
      if (totalCheckMinutes >= circadianSleepThreshold && totalCheckMinutes < circadianSleepThreshold + 30) {
        if (!circadianReminderFired) {
          setCircadianReminderFired(true);
          const mockCircadianAlert: ScheduleItem = {
            id: "circadian-sleep-warning",
            title: "Proteksi Sirkadian: Waktunya Matikan Layar Gadget!",
            start: "22:00",
            end: "05:00",
            category: "biologis",
            reminderMinutes: 30,
            reminderFired: true
          };
          setActiveAlert(mockCircadianAlert);
          setActiveAlertMinutesLeft(30);
          playAlertSound();

          // Auto-complete corresponding todo task for circadian detox
          setTodos(prev => prev.map(t => {
            if (t.task.toLowerCase().includes("matikan layar") || t.task.toLowerCase().includes("30 menit sebelum")) {
              return { ...t, completed: true };
            }
            return t;
          }));

          const timeLabel = isSimulationMode 
            ? `${simulationTime} (Simulasi)` 
            : new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

          setNotificationLogs(prev => [
            {
              id: String(Date.now() + Math.random()),
              time: timeLabel,
              text: "🚨 Proteksi Sirkadian Aktif: Sudah memasuki jam 21:30 harian. Matikan semua layar & perangkat elektronik Anda untuk mendukung tidur biologis esensial!",
              category: "biologis"
            },
            ...prev
          ].slice(0, 30));
        }
      } else if (totalCheckMinutes < circadianSleepThreshold - 5 || totalCheckMinutes >= circadianSleepThreshold + 30) {
        if (circadianReminderFired) {
          setCircadianReminderFired(false);
        }
      }

      if (didChange) {
        setSchedules(updatedSchedules);
      }
    };

    const interval = setInterval(checkReminders, 3000);
    checkReminders();
    return () => clearInterval(interval);
  }, [schedules, isSimulationMode, simulationTime, circadianReminderFired]);

  // Save schedules & todos to cache on changes
  useEffect(() => {
    localStorage.setItem("snooze_schedules", JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem("snooze_todos", JSON.stringify(todos));
  }, [todos]);

  // Analyze conflicts locally or with Gemini
  const triggerServiceOptimization = async (currentSchedules: ScheduleItem[], action: "analyze" | "resolve") => {
    setIsLoaderActive(true);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules: currentSchedules, mode: action }),
      });
      const data: OptimizationResponse = await res.json();
      if (data.success) {
        if (action === "resolve") {
          setSchedules(data.schedules);
        }
        setTodos(data.todos);
        setEnergyScore(data.energyScore);
        setSleepDurationHours(data.sleepDurationHours);
        setConflictText(data.conflictText);
        setCoachingTip(data.coachingTip);
        setIsLocalFallback(!!data.isLocalFallback);
        setFallbackReason(data.fallbackReason || null);
      }
    } catch (err) {
      // Avoid loud console.error to keep platform dashboard warnings clean
      console.warn("Gagal melakukan optimasi terpusat. Menggunakan fallback lokal.", err);
      computeLocalRuleFallback(currentSchedules, action);
      setIsLocalFallback(true);
      setFallbackReason("api-error");
    } finally {
      setIsLoaderActive(false);
    }
  };

  // Fallback local rule-based simulation
  const computeLocalRuleFallback = (currentSchedules: ScheduleItem[], action: "analyze" | "resolve") => {
    let updatedSchedules = [...currentSchedules];
    let conflict: string | null = null;
    let overlapInWork = false;

    // Check conflict: "sosial" overlaps with internship (13:00 - 17:00)
    const socialConflictItem = updatedSchedules.find(
      item => item.category === "sosial" && item.start >= "13:00" && item.start < "17:00"
    );

    if (socialConflictItem) {
      conflict = `Terdeteksi jadwal sosial "${socialConflictItem.title}" (${socialConflictItem.start}) berbenturan dengan waktu kerja pilar Magang/Bootcamp Anda (13:00 - 17:00).`;
      overlapInWork = true;

      if (action === "resolve") {
        updatedSchedules = updatedSchedules.map(item => {
          if (item.id === socialConflictItem.id) {
            return {
              ...item,
              start: "19:00",
              end: "20:30",
              title: `${item.title} (AI Relocated)`
            };
          }
          return item;
        });
        conflict = null;
      }
    }

    // Direct overlap verification
    for (let i = 0; i < updatedSchedules.length; i++) {
      for (let j = i + 1; j < updatedSchedules.length; j++) {
        const a = updatedSchedules[i];
        const b = updatedSchedules[j];
        if (a.start === b.start && a.id !== b.id) {
          conflict = `Terdeteksi benturan agenda pada pukul ${a.start} antara "${a.title}" dan "${b.title}".`;
          if (action === "resolve") {
            const [h, m] = b.start.split(":").map(Number);
            const newH = String((h + 2) % 24).padStart(2, "0");
            const newStart = `${newH}:${String(m).padStart(2, "0")}`;
            const [eh, em] = b.end.split(":").map(Number);
            const newEH = String((eh + 2) % 24).padStart(2, "0");
            const newEnd = `${newEH}:${String(em).padStart(2, "0")}`;

            updatedSchedules[j] = {
              ...b,
              start: newStart,
              end: newEnd,
              title: `${b.title} (Dilonggarkan AI)`
            };
            conflict = null;
          }
        }
      }
    }

    // Count late-night activity
    let sleepInvader = 0;
    updatedSchedules.forEach(item => {
      if (item.start >= "22:00" || item.start < "05:00" || item.end > "22:00" || item.end <= "05:00") {
        sleepInvader++;
      }
    });

    if (action === "resolve") {
      setSchedules(updatedSchedules);
    }

    const calculatedScore = Math.max(20, Math.min(100, 95 - (overlapInWork ? 15 : 0) - (sleepInvader * 25)));
    setEnergyScore(calculatedScore);
    setSleepDurationHours(Math.max(5, 8 - (sleepInvader * 1.5)));
    setConflictText(conflict);
    setIsLocalFallback(true);
    setFallbackReason("offline");

    if (action === "resolve") {
      setTodos([
        { id: "todo-1", task: "Selesaikan lembar analisis kegiatan harian", completed: true },
        { id: "todo-2", task: "Matikan layar gadget 30 menit sebelum slot tidur esensial", completed: false },
        { id: "todo-3", task: "Pastikan slot sosial sore digeser ke jam santai malam", completed: true }
      ]);
    }
  };

  useEffect(() => {
    triggerServiceOptimization(schedules, "analyze");
  }, []);

  // Preset Template loader to make the mockup incredibly varied & useful!
  const loadPresetTemplate = (type: "default" | "msib" | "healthy") => {
    setActiveTemplate(type);
    let targetSchedules: ScheduleItem[] = [];
    if (type === "default") {
      targetSchedules = [
        { id: "1", title: "Kuliah Reguler: Jaringan Komputer", start: "08:00", end: "10:30", category: "akademik", reminderMinutes: 15, reminderFired: false },
        { id: "2", title: "Sesi Magang Profesional (MSIB)", start: "13:00", end: "17:00", category: "eksternal", reminderMinutes: 30, reminderFired: false },
        { id: "3", title: "Diskusi Kelompok & Hangout Santai", start: "19:00", end: "20:30", category: "sosial", reminderMinutes: 15, reminderFired: false },
      ];
    } else if (type === "msib") {
      targetSchedules = [
        { id: "m-1", title: "Daily Scrum Meeting Magang", start: "09:00", end: "10:00", category: "eksternal", reminderMinutes: 5, reminderFired: false },
        { id: "m-2", title: "Bimbingan Mentor MSIB", start: "13:30", end: "15:00", category: "eksternal", reminderMinutes: 15, reminderFired: false },
        { id: "m-3", title: "Kuis Online Sinyal Sistem", start: "15:00", end: "16:30", category: "akademik", reminderMinutes: 15, reminderFired: false }, // Bentrok sengaja
        { id: "m-4", title: "Futsal / Jogging Bersama MSIB", start: "19:00", end: "20:45", category: "sosial", reminderMinutes: 15, reminderFired: false },
      ];
    } else if (type === "healthy") {
      targetSchedules = [
        { id: "h-1", title: "Review Kuliah Mandiri Pagi", start: "08:00", end: "09:30", category: "akademik", reminderMinutes: 0, reminderFired: false },
        { id: "h-2", title: "Pengerjaan Tugas Akhir", start: "10:00", end: "12:00", category: "akademik", reminderMinutes: 15, reminderFired: false },
        { id: "h-3", title: "Kelas Sharing Dunia Industri", start: "15:30", end: "17:00", category: "eksternal", reminderMinutes: 30, reminderFired: false },
        { id: "h-4", title: "Quality Time Keluarga", start: "18:30", end: "20:00", category: "sosial", reminderMinutes: 10, reminderFired: false },
      ];
    }
    setSchedules(targetSchedules);
    triggerServiceOptimization(targetSchedules, "analyze");
  };

  // Handler to add schedule manually
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("Mohon isi nama kegiatan / agenda Anda!");
      return;
    }
    if (!formStart || !formEnd) {
      alert("Mohon tentukan jam mulai dan jam selesai!");
      return;
    }

    const newItem: ScheduleItem = {
      id: String(Date.now()),
      title: formTitle.trim(),
      start: formStart,
      end: formEnd,
      category: formCategory,
      reminderMinutes: formReminderMinutes,
      reminderFired: false
    };

    const nextSchedules = [...schedules, newItem];
    setSchedules(nextSchedules);
    
    // Clear form inputs
    setFormTitle("");
    setFormStart("");
    setFormEnd("");

    // Trigger AI sync analysis
    triggerServiceOptimization(nextSchedules, "analyze");
  };

  // Handle deletion of schedule
  const handleDeleteSchedule = (id: string) => {
    const nextSchedules = schedules.filter(item => item.id !== id);
    setSchedules(nextSchedules);
    triggerServiceOptimization(nextSchedules, "analyze");
  };

  // Reset or clear all schedules
  const handleClearAllSchedules = () => {
    setSchedules([]);
    setConflictText(null);
    setEnergyScore(100);
    setSleepDurationHours(8.0);
    setTodos([]);
    setCoachingTip("Seluruh agenda kosong. Ritme biologi Anda berada pada mode istirahat penuh dan segar.");
  };

  // Resolve conflict using AI Optimization
  const handleResolveConflict = () => {
    triggerServiceOptimization(schedules, "resolve");
  };

  // Export today's schedules into standard .ics iCalendar file format
  const handleExportICS = () => {
    if (schedules.length === 0) {
      alert("Tidak ada agenda harian untuk diekspor!");
      return;
    }

    // Get today's local date format (YYYYMMDD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}${mm}${dd}`;

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SnoozePlan AI Pro//Daily Biotype Schedule//ID",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    schedules.forEach((item) => {
      const startClean = item.start.replace(":", "") + "00";
      const endClean = item.end.replace(":", "") + "00";

      const dtStart = `${dateStr}T${startClean}`;
      const dtEnd = `${dateStr}T${endClean}`;
      const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

      const categoryLabel = item.category === "akademik" 
        ? "Akademik" 
        : item.category === "eksternal" 
        ? "MSIB / Eksternal Pro" 
        : item.category === "sosial"
        ? "Sosial & Jam Rileks"
        : "Tidur Sirkadian";

      // Safely escape iCalendar summary and description
      const escapedSummary = item.title.replace(/[,;]/g, "\\$&");
      const escapedDesc = `Kategori agenda: ${categoryLabel}. Terintegrasi dengan bio-sirkadian oleh SnoozePlan AI.`.replace(/[,;]/g, "\\$&");

      icsContent.push("BEGIN:VEVENT");
      icsContent.push(`UID:uid-${item.id}-${dateStr}@snoozeplan.ai`);
      icsContent.push(`DTSTAMP:${dtStamp}`);
      icsContent.push(`DTSTART:${dtStart}`);
      icsContent.push(`DTEND:${dtEnd}`);
      icsContent.push(`SUMMARY:${escapedSummary}`);
      icsContent.push(`DESCRIPTION:${escapedDesc}`);
      icsContent.push("END:VEVENT");
    });

    // Automatically export the sirkadian sleep block too to highlight biological protection!
    const sleepStart = "220000";
    const sleepEnd = "050000";
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tyyyy = tomorrow.getFullYear();
    const tmm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const tdd = String(tomorrow.getDate()).padStart(2, "0");
    const tomorrowDateStr = `${tyyyy}${tmm}${tdd}`;

    const dtSleepStart = `${dateStr}T${sleepStart}`;
    const dtSleepEnd = `${tomorrowDateStr}T${sleepEnd}`;
    const dtStampSleep = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:sleep-sirkadian-${dateStr}@snoozeplan.ai`);
    icsContent.push(`DTSTAMP:${dtStampSleep}`);
    icsContent.push(`DTSTART:${dtSleepStart}`);
    icsContent.push(`DTEND:${dtSleepEnd}`);
    icsContent.push("SUMMARY:Fase Tidur Sirkadian Esensial (SnoozePlan AI)");
    icsContent.push("DESCRIPTION:Proteksi bio-istirahat otomatis aktif. Matikan gadget Anda 30 menit sebelum slot ini.");
    icsContent.push("END:VEVENT");

    icsContent.push("END:VCALENDAR");

    const fullIcsStr = icsContent.join("\r\n");

    // Create and trigger browser download
    const blob = new Blob([fullIcsStr], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SnoozePlan_Schedule_${dateStr}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Save logs as nice user feedback
    const timeLabel = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setNotificationLogs(prev => [
      {
        id: String(Date.now() + Math.random()),
        time: timeLabel,
        text: `[Ekspor Sukses] Berhasil mengunduh "${link.download}" dengan ${schedules.length + 1} agenda!`,
        category: "biologis"
      },
      ...prev
    ].slice(0, 30));
  };

  // Toggle todo item
  const handleToggleTodo = (id: string) => {
    setTodos(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const handleAddNewTodo = (taskText: string) => {
    if (!taskText.trim()) return;
    const newTodo: TodoItem = {
      id: String(Date.now()),
      task: taskText.trim(),
      completed: false
    };
    setTodos(prev => [...prev, newTodo]);
  };

  // Bright & Fresh Clean category configuration map
  const categoryConfigMap = {
    akademik: {
      bg: "bg-sky-50/70 hover:bg-sky-100/80 hover:shadow-sky-100/40",
      border: "border-sky-400",
      pillBg: "bg-sky-100/80 text-sky-700 font-bold border border-sky-200/50",
      text: "text-slate-800",
      label: "Akademik",
      icon: <BookOpen className="w-3.5 h-3.5 text-sky-500" />
    },
    eksternal: {
      bg: "bg-teal-50/70 hover:bg-teal-100/80 hover:shadow-teal-100/40",
      border: "border-emerald-400",
      pillBg: "bg-emerald-100/80 text-emerald-700 font-bold border border-emerald-200/50",
      text: "text-slate-800",
      label: "MSIB / Eksternal",
      icon: <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
    },
    sosial: {
      bg: "bg-yellow-50/50 hover:bg-yellow-100/60 hover:shadow-yellow-100/20",
      border: "border-amber-450",
      pillBg: "bg-amber-100/80 text-amber-800 font-bold border border-amber-200/40",
      text: "text-slate-800",
      label: "Sosial & Jam Rileks",
      icon: <Users className="w-3.5 h-3.5 text-amber-500" />
    },
    biologis: {
      bg: "bg-emerald-50/35",
      border: "border-emerald-300",
      pillBg: "bg-emerald-100/80 text-emerald-800 font-bold border border-emerald-200/50",
      text: "text-slate-800",
      label: "Tidur Sirkadian",
      icon: <Moon className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
    }
  };

  // Math for Circular gauge progress
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (energyScore / 100) * circumference;

  if (!isLoggedIn) {
    return (
      <div className="bg-gradient-to-tr from-sky-50 via-slate-50 to-emerald-50 text-slate-800 min-h-screen flex items-center justify-center p-4 sm:p-6 select-none overflow-x-hidden antialiased relative" id="login-gate-page">
        <div className="absolute inset-0 bg-[radial-gradient(#03a9f4_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-150 shadow-xl space-y-6 z-10"
        >
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="inline-flex bg-gradient-to-r from-sky-500 to-emerald-400 p-3.5 rounded-2xl text-white shadow-md shadow-sky-400/35 mb-2 mx-auto">
              <Zap className="w-8 h-8 animate-pulse text-white" />
            </div>
            <h1 className="text-2xl font-title font-extrabold text-slate-900 tracking-tight">
              SnoozePlan<span className="text-gradient bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent font-black ml-1">AI Pro</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Asisten Sirkadian Otomatis & Proteksi Istirahat Biologis untuk Mahasiswa & Profesional MSIB
            </p>
          </div>

          {/* Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!userProfile.name.trim()) {
                alert("Mohon masukkan nama Anda!");
                return;
              }
              setIsLoggedIn(true);
              // Play a cheerful chime on login
              setTimeout(() => {
                playAlertSound("circadian");
              }, 150);
            }}
            className="space-y-4 pt-2"
          >
            <div className="bg-sky-50/40 p-4 rounded-2xl border border-sky-100/30 space-y-3">
              <h2 className="text-[10px] font-bold text-sky-700 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-500" /> Registrasi Data Diri (Profil Sirkadian)
              </h2>
              
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">Nama Lengkap</label>
                  <input 
                    type="text"
                    required
                    value={userProfile.name}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nama panggilan Anda..."
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-3xs"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">Alamat Email</label>
                  <input 
                    type="email"
                    required
                    value={userProfile.email}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="nama@domain.com"
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-3xs"
                  />
                </div>

                {/* Age & Gender in row */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">Usia (Tahun)</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={userProfile.age}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-3xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 font-mono uppercase">Jenis Kelamin</label>
                    <select 
                      value={userProfile.gender}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, gender: e.target.value as any }))}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-3xs cursor-pointer"
                    >
                      <option value="Perempuan">Perempuan</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                  </div>
                </div>

                {/* Chronotype selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5 font-mono uppercase">Biotipe Kronotipe Sirkadian</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Early Bird", "Night Owl", "Balanced"] as const).map((type) => {
                      const desc = type === "Early Bird" ? "Pagi" : type === "Night Owl" ? "Malam" : "Seimbang";
                      const emoji = type === "Early Bird" ? "🐦" : type === "Night Owl" ? "🦉" : "🦊";
                      const isSelected = userProfile.chronotype === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setUserProfile(prev => ({ ...prev, chronotype: type }))}
                          className={`p-2 rounded-xl text-center border text-[10px] font-bold transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-gradient-to-r from-sky-500 to-emerald-400 text-white border-transparent shadow-xs"
                              : "bg-white text-slate-600 border-slate-150 hover:border-sky-300"
                          }`}
                        >
                          <div className="text-sm mb-0.5">{emoji}</div>
                          <div className="truncate">{desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Jam Tidur */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 font-mono uppercase">Target Tidur Harian</label>
                    <span className="text-[10px] font-extrabold text-sky-600 font-mono bg-sky-50 px-1.5 py-0.5 rounded-md">{userProfile.sleepTarget} Jam</span>
                  </div>
                  <input 
                    type="range"
                    min="5"
                    max="10"
                    step="0.5"
                    value={userProfile.sleepTarget}
                    onChange={(e) => setUserProfile(prev => ({ ...prev, sleepTarget: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
                  />
                  <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                    <span>5 Jam (Minimal)</span>
                    <span>10 Jam (Ideal)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white font-title font-extrabold text-xs sm:text-sm rounded-2xl shadow-md shadow-sky-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-white" />
              Masuk &amp; Mulai Hari Baru 🚀
            </button>
          </form>

          {/* Footer of login */}
          <div className="pt-2 text-center border-t border-slate-150">
            <p className="text-[8px] text-slate-400 uppercase tracking-widest font-mono flex items-center justify-center gap-1">
              <Lock className="w-2.5 h-2.5 text-emerald-500" /> Data Tersimpan Aman di Browser Lokal
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-sky-50/50 via-white to-emerald-50/30 text-slate-800 min-h-screen flex flex-col font-sans select-none overflow-x-hidden antialiased selection:bg-sky-200 selection:text-sky-900" id="snoozeplan-app-root">
      
      {/* 🚀 Sleek Header Banner (Bright & Fresh Tech - Sky Blue & Leaves Green) */}
      <header className="bg-white/80 backdrop-blur-md border-b border-sky-100/80 text-slate-600 text-xs py-3 px-6 flex justify-between items-center font-sans shadow-xs relative sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="bg-gradient-to-r from-sky-500 to-emerald-400 p-2 rounded-xl text-white shadow-sm shadow-sky-400/20">
              <Zap className="w-4 h-4 animate-pulse text-white" />
            </div>
            <span className="text-slate-900 font-title font-extrabold tracking-tight text-sm sm:text-base">
              SnoozePlan<span className="text-gradient bg-gradient-to-r from-sky-500 to-emerald-500 bg-clip-text text-transparent font-black ml-1">AI Pro</span>
            </span>
          </div>
          <span className="text-slate-200">|</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100/60 shadow-3xs">
            Bright & Fresh Tech 🍀
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-slate-700 font-bold flex items-center gap-1.5 bg-gradient-to-r from-sky-50 to-emerald-50/50 px-2.5 py-1 rounded-xl border border-sky-100/40 font-mono">
            <Clock className="w-3.5 h-3.5 text-sky-500 animate-spin-slow" /> {currentTimeStr || "Mengambil Waktu..."}
          </div>
          
          <span className="hidden md:inline-flex text-emerald-700 bg-emerald-100/60 border border-emerald-200/50 rounded-xl px-2.5 py-1.5 items-center gap-1.5 text-[10px] font-extrabold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sirkadian Terlindungi
          </span>

          <div className="flex items-center gap-2 border border-slate-200/60 bg-slate-50/50 p-1 rounded-xl pr-2.5 shadow-3xs">
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white text-[10px] font-black select-none pointer-events-none shadow-2xs">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="max-w-[80px] sm:max-w-[120px] truncate leading-tight">
              <div className="text-[10px] font-extrabold text-slate-900 truncate">Halo, {userProfile.name}!</div>
              <div className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">
                {userProfile.chronotype === "Early Bird" ? "🐦 Pagi" : userProfile.chronotype === "Night Owl" ? "🦉 Malam" : "🦊 Seimbang"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (confirm("Apakah Anda yakin ingin keluar dari SnoozePlan?")) {
                setIsLoggedIn(false);
              }
            }}
            id="logout-header-btn"
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl border border-rose-100 transition duration-150 flex items-center gap-1 cursor-pointer font-bold text-[10px] shadow-3xs"
            title="Keluar Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* 🔮 Primary Clean Light Mode Interface Structure */}
      <div className="flex flex-1 flex-col lg:flex-row h-auto lg:h-[calc(100vh-53px)] overflow-hidden">
        
        {/* 📋 Column 1: Biosphere Indicator Sidebar (Light, Clean Leaf Theme) */}
        <aside className="w-full lg:w-[26%] bg-white/70 p-5 flex flex-col justify-between border-r border-sky-100/50 overflow-y-auto space-y-5">
          <div className="space-y-4">
            
            {/* Title Badge widget info */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-sky-500/10 via-emerald-400/5 to-transparent p-3.5 rounded-2xl border border-sky-100/20">
              <div className="bg-gradient-to-br from-sky-400 to-emerald-400 p-2.5 rounded-xl text-white shadow-sm shadow-sky-400/30 flex justify-center items-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-title font-bold text-sm tracking-tight text-slate-950 leading-tight">Biologi Sirkadian</h1>
                <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider block">Kesehatan & Energi Instan</span>
              </div>
            </div>

            {/* Interactive Profil & Data Diri Saya Widget (Onboarding / Account Customizer) */}
            <div className="bg-white border border-slate-150/60 rounded-2xl p-4.5 space-y-3.5 shadow-3xs" id="personal-profile-widget">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest font-mono flex items-center gap-1.5 leading-none">
                  <User className="w-4 h-4 text-sky-500 shrink-0" /> Profil &amp; Data Diri
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition ${
                    isEditingProfile
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100"
                  }`}
                >
                  {isEditingProfile ? "Batal" : "Ubah Data ⚙️"}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {!isEditingProfile ? (
                  <motion.div
                    key="profile-read-only"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-slate-400 font-mono text-[8px] uppercase tracking-wider mb-0.5">Nama</span>
                        <span className="font-extrabold text-slate-800 truncate block">{userProfile.name}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-slate-400 font-mono text-[8px] uppercase tracking-wider mb-0.5">Surel / Email</span>
                        <span className="font-extrabold text-slate-800 truncate block" title={userProfile.email}>{userProfile.email}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-slate-400 font-mono text-[8px] uppercase tracking-wider mb-0.5">Usia / Gender</span>
                        <span className="font-extrabold text-slate-800 block">{userProfile.age} Thn | {userProfile.gender === "Laki-laki" ? "Pria" : "Wanita"}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="block text-slate-400 font-mono text-[8px] uppercase tracking-wider mb-0.5">Bioritme / Kronotipe</span>
                        <span className="font-extrabold text-slate-800 block">
                          {userProfile.chronotype === "Early Bird" ? "🐦 Pagi" : userProfile.chronotype === "Night Owl" ? "🦉 Malam" : "🦊 Seimbang"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 flex items-center justify-between">
                      <div>
                        <span className="block text-[8px] font-bold text-emerald-700 font-mono uppercase tracking-wider">Target Tidur Sirkadian</span>
                        <span className="text-[11px] font-black text-emerald-800">{userProfile.sleepTarget} Jam / Hari</span>
                      </div>
                      <span className="text-xl">💤</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="profile-form-edit"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!userProfile.name.trim()) {
                        alert("Mohon masukkan nama Anda!");
                        return;
                      }
                      setIsEditingProfile(false);
                      playAlertSound("circadian");
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 mb-1 font-mono uppercase">Nama Lengkap</label>
                      <input 
                        type="text"
                        required
                        value={userProfile.name}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-sky-500 shadow-3xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 mb-1 font-mono uppercase">Surel / Email</label>
                      <input 
                        type="email"
                        required
                        value={userProfile.email}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none focus:border-sky-500 shadow-3xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 font-mono uppercase">Usia</label>
                        <input 
                          type="number"
                          required
                          min="1"
                          max="120"
                          value={userProfile.age}
                          onChange={(e) => setUserProfile(prev => ({ ...prev, age: e.target.value }))}
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] font-bold text-slate-500 mb-1 font-mono uppercase">Gender</label>
                        <select 
                          value={userProfile.gender}
                          onChange={(e) => setUserProfile(prev => ({ ...prev, gender: e.target.value as any }))}
                          className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 cursor-pointer"
                        >
                          <option value="Perempuan">Perempuan</option>
                          <option value="Laki-laki">Laki-laki</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-500 mb-1 font-mono uppercase">Kronotipe Sirkadian</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(["Early Bird", "Night Owl", "Balanced"] as const).map((type) => {
                          const desc = type === "Early Bird" ? "Pagi" : type === "Night Owl" ? "Malam" : "Normal";
                          const emoji = type === "Early Bird" ? "🐦" : type === "Night Owl" ? "🦉" : "🦊";
                          const isSelected = userProfile.chronotype === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setUserProfile(prev => ({ ...prev, chronotype: type }))}
                              className={`py-1 px-1.5 rounded-xl text-center border text-[9px] font-bold transition cursor-pointer truncate ${
                                isSelected 
                                  ? "bg-sky-500 text-white border-transparent"
                                  : "bg-slate-50 text-slate-600 border-slate-150 hover:border-sky-200"
                              }`}
                            >
                              <span>{emoji} {desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block text-[8px] font-bold text-slate-500 font-mono uppercase">Tidur: {userProfile.sleepTarget} Jam</label>
                      </div>
                      <input 
                        type="range"
                        min="5"
                        max="10"
                        step="0.5"
                        value={userProfile.sleepTarget}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, sleepTarget: parseFloat(e.target.value) }))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-600 hover:to-emerald-500 text-white text-[10px] font-black rounded-xl transition shadow-3xs active:scale-95 cursor-pointer text-center block"
                    >
                      💾 Simpan Data Diri
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Template Presets Container: Makes visual extremely active & allows fast seeding! */}
            <div className="bg-gradient-to-br from-sky-50/40 via-emerald-50/10 to-white border border-sky-150/50 rounded-2xl p-4.5 space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" /> Pilih Rute Sirkadian
                </span>
                <span className="text-[9px] text-slate-400">klik untuk memuat</span>
              </div>
              <p className="text-[10px] text-slate-500">Sesuaikan simulasi harian langsung dengan pola studi ideal Anda:</p>
              
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => loadPresetTemplate("default")}
                  className={`text-left text-[11px] p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    activeTemplate === "default"
                      ? "bg-sky-500 text-white border-transparent shadow-sm font-semibold"
                      : "bg-white/90 text-slate-700 border-slate-100 hover:border-sky-300 hover:bg-sky-50/30"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    🎓 <span className="truncate">Kuliah Reguler & Hangout</span>
                  </span>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${activeTemplate === "default" ? "text-white" : "text-transparent"}`} />
                </button>

                <button
                  type="button"
                  onClick={() => loadPresetTemplate("msib")}
                  className={`text-left text-[11px] p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    activeTemplate === "msib"
                      ? "bg-emerald-500 text-white border-transparent shadow-sm font-semibold"
                      : "bg-white/90 text-slate-700 border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    💼 <span className="truncate">Mahasiswa Magang MSIB (Sibuk)</span>
                  </span>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${activeTemplate === "msib" ? "text-white" : "text-transparent"}`} />
                </button>

                <button
                  type="button"
                  onClick={() => loadPresetTemplate("healthy")}
                  className={`text-left text-[11px] p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    activeTemplate === "healthy"
                      ? "bg-amber-500 text-white border-transparent shadow-sm font-semibold"
                      : "bg-white/90 text-slate-700 border-slate-100 hover:border-amber-300 hover:bg-amber-50/30"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    🧘‍♀️ <span className="truncate">Fit & Sehat Seimbang</span>
                  </span>
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${activeTemplate === "healthy" ? "text-white" : "text-transparent"}`} />
                </button>
              </div>
            </div>

            {/* Circular Circadian Status ring widget */}
            <div className="bg-white border border-slate-100/80 rounded-2xl p-4.5 space-y-4 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Bioritme Energi</span>
                {isLoaderActive ? (
                  <span className="text-[10px] text-sky-500 animate-pulse font-mono flex items-center gap-1 font-bold">
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-500" /> Sinkron AI...
                  </span>
                ) : isLocalFallback ? (
                  <span className="text-[9px] bg-sky-50 text-sky-700 font-black px-2 py-0.5 rounded-full border border-sky-200/60 flex items-center gap-1 animate-pulse" title={fallbackReason === "quota-exceeded" ? "Server penuh, menggunakan simulasi kilat" : "Mesin lokal"}>
                    <Zap className="w-2.5 h-2.5 text-sky-500" /> Mode Cepat (Lokal)
                  </span>
                ) : (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Stabil (Gemini AI)</span>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center bg-sky-50/30 p-1 rounded-full">
                  <svg className="w-18 h-18 transform -rotate-90">
                    <circle
                      cx="36"
                      cy="36"
                      r={radius}
                      className="stroke-slate-100"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="36"
                      cy="36"
                      r={radius}
                      className="stroke-sky-400"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col justify-center items-center">
                    <span className="text-xs font-mono font-black text-slate-900">{energyScore}%</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-900">Baterai Sel Sirkadian</h3>
                  <div className="text-[10px] text-slate-600">
                    Sisa Tidur: <strong className="text-emerald-600">{sleepDurationHours.toFixed(1)} Jam</strong>
                  </div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-500" /> Ritme Sehat Standard
                  </div>
                </div>
              </div>

              {/* Dynamic Health Indicator Bar in Sidebar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Evaluasi Tubuh:</span>
                <div>
                  {energyScore >= 80 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-xl border border-emerald-200/50">Sangat Sehat ✨</span>
                  ) : energyScore >= 60 ? (
                    <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-xl border border-amber-200/50">Kurang Optimal ⚠️</span>
                  ) : (
                    <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-xl border border-rose-200/40 animate-pulse">Kelelahan Ekstrim 🚨</span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Advisor Coaching Tip Panel in Sidebar */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/60 rounded-2xl p-4 space-y-2 relative overflow-hidden shadow-3xs">
              <div className="absolute top-0 right-0 p-1.5 text-emerald-500/10">
                <Lightbulb className="w-12 h-12 stroke-[1.5]" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block font-mono flex items-center gap-1">
                🍀 REKOMENDASI PINTAR KESEHATAN
              </span>
              <p className="text-xs text-slate-800 leading-relaxed italic relative z-10 font-medium">
                &ldquo;{coachingTip}&rdquo;
              </p>
            </div>

            {/* Alarm simulation system widget container */}
            <div className="bg-white border border-slate-150/60 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-sky-50">
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-sky-500" /> Uji Simulator Alarm
                </span>
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border transition-all duration-250 cursor-pointer ${
                    soundEnabled 
                      ? "bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100" 
                      : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                  }`}
                  title={soundEnabled ? "Matikan Bunyi" : "Aktifkan Bunyi"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100/60">
                  <span className="text-[10px] text-slate-700 font-semibold flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500 animate-spin-slow" /> Mode Jam Simulasian
                  </span>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isSimulationMode}
                      onChange={(e) => setIsSimulationMode(e.target.checked)}
                      className="sr-only peer"
                      id="simulation-toggle"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-sky-500"></div>
                  </div>
                </div>

                {isSimulationMode ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2.5 pt-2 border-t border-slate-100"
                  >
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider text-center font-bold">Tekan +/- 15m untuk lompati waktu</div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="time" 
                        value={simulationTime}
                        onChange={(e) => setSimulationTime(e.target.value)}
                        className="w-full text-xs font-mono bg-sky-50 border border-sky-100 rounded-lg p-2 text-sky-950 text-center focus:outline-none focus:border-sky-500 font-bold shadow-xs"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
                      <button 
                        type="button"
                        onClick={() => {
                          const [h, m] = simulationTime.split(":").map(Number);
                          const total = (h * 60 + m - 15 + 1440) % 1440;
                          const nh = String(Math.floor(total / 60)).padStart(2, "0");
                          const nm = String(total % 60).padStart(2, "0");
                          setSimulationTime(`${nh}:${nm}`);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-600 py-2 rounded-lg border border-slate-200/60 transition cursor-pointer text-center font-mono font-semibold"
                      >
                        -15 Menit
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const [h, m] = simulationTime.split(":").map(Number);
                          const total = (h * 60 + m + 15) % 1440;
                          const nh = String(Math.floor(total / 60)).padStart(2, "0");
                          const nm = String(total % 60).padStart(2, "0");
                          setSimulationTime(`${nh}:${nm}`);
                        }}
                        className="bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-600 py-2 rounded-lg border border-slate-200/60 transition cursor-pointer text-center font-mono font-semibold"
                      >
                        +15 Menit
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSchedules(prev => prev.map(item => ({ ...item, reminderFired: false })));
                        alert("Semua status pengingat alarm disetel ulang ke belum berdering!");
                      }}
                      className="w-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-[9px] font-extrabold py-2 rounded-lg border border-sky-100 transition uppercase tracking-wider cursor-pointer text-center block"
                    >
                      🔄 Reset Pembunyian Alarm
                    </button>
                  </motion.div>
                ) : (
                  <p className="text-[10px] text-slate-400 leading-normal text-center bg-slate-50 p-2.5 rounded-xl">
                    Mendeteksi alarm berdasarkan waktu lokal PC anda. Aktifkan simulasi di atas untuk pengujian cepat.
                  </p>
                )}
              </div>
            </div>

            {/* Preferensi Suara Notifikasi widget container */}
            <div className="bg-white border border-slate-150/60 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex justify-between items-center pb-2 border-b border-sky-50">
                <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-widest font-mono flex items-center gap-1.5 w-full">
                  <Volume2 className="w-4 h-4 text-emerald-500 shrink-0" /> Preferensi Suara Alarm
                </span>
                <span className="text-[8px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  Aktif
                </span>
              </div>
              
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
                  Pilih Nada Notifikasi Sirkadian:
                </label>
                <div className="relative">
                  <select 
                    value={soundType}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setSoundType(selected);
                      // Play sample immediately so they can preview it! Excellent UX!
                      setTimeout(() => {
                        playAlertSound(selected);
                      }, 100);
                    }}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 shadow-3xs cursor-pointer appearance-none pr-8"
                    id="sound-type-selector"
                  >
                    <option value="circadian">🌅 Nada Sirkadian (Cheerful Chord)</option>
                    <option value="nature">🌿 Suara Alam (Kicauan Burung)</option>
                    <option value="zen">🧘 Lonceng Zen (Zen Meditation Bell)</option>
                    <option value="ocean">🌊 Gelombang Sirkadian (Ocean Wave)</option>
                  </select>
                  <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-500">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => playAlertSound()}
                    className="flex-1 bg-gradient-to-r from-sky-400 to-emerald-400 hover:from-sky-500 hover:to-emerald-500 text-white text-[10px] font-black py-2 px-3 rounded-lg transition-all shadow-3xs hover:shadow-2xs active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-white fill-white" /> Tes Nada Pilihan
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                    }}
                    className={`px-2.5 py-2 rounded-lg border text-[10px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 shrink-0 ${
                      soundEnabled 
                        ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100" 
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {soundEnabled ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {soundEnabled ? "Senyap" : "Muted"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-150 pt-3">
            <span className="font-semibold text-slate-600 block mb-0.5">SNOOZEPLAN HEALTH:</span>
            Pilar asisten kesehatan dirancang khusus menggunakan rekayasa bioritem sirkadian agar mahasiswa MSIB aktif berenergi sepanjang hari.
          </div>
        </aside>

        {/* 📅 Column 2: Middle Activity Flow Container (Bright and friendly layout with Blue/Green design) */}
        <main className="flex-1 bg-gradient-to-b from-sky-50/20 via-white to-sky-50/20 p-5 flex flex-col overflow-hidden">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-title font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-500" /> Agenda Harian Sirkadian
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Jadwal Anda hari ini yang terintegrasi dengan proteksi bio-istirahat otomatis. <span className="text-sky-600 font-bold block sm:inline sm:ml-1 mt-0.5 sm:mt-0 text-[10px] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">💡 Mobile Swipe: Geser item agenda ke kiri 📱 untuk Edit/Hapus!</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                onClick={handleExportICS}
                className="text-xs bg-sky-50 hover:bg-sky-100 text-sky-700 px-3.5 py-2 rounded-xl border border-sky-100/60 transition duration-200 font-bold flex items-center gap-1.5 focus:outline-none cursor-pointer shadow-3xs"
                title="Ekspor Jadwal Hari Ini ke File .ics"
              >
                <Download className="w-3.5 h-3.5" /> Ekspor (.ics)
              </button>

              <button 
                onClick={handleClearAllSchedules}
                className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-2 rounded-xl border border-rose-100/60 transition duration-200 font-semibold flex items-center gap-1.5 focus:outline-none cursor-pointer shadow-3xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
              </button>
            </div>
          </div>

          {/* Interactive Visual energy curves mock block to make layout unique & luxurious */}
          <div className="bg-gradient-to-r from-sky-500 to-emerald-400 p-4.5 rounded-2xl text-white mb-5 shadow-xs relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none w-1/2 bg-radial-gradient">
              {/* Graphic curves inside background */}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 relative z-10">
              <div className="space-y-1">
                <span className="text-[9px] bg-white/20 text-white border border-white/20 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider uppercase">
                  GRAFIK PREDIKSI VITALITAS
                </span>
                <h4 className="font-title font-extrabold text-sm leading-snug">Kurva Energi Memuncak ⚡</h4>
                <p className="text-[10px] text-sky-100 max-w-md">Kognisi otak Anda diestimasi mencapai level 94% pada jam 09:00 - 11:30 pagi setelah tidur bio yang nyenyak.</p>
              </div>

              {/* Curve statistics graph mockup overlay on the right */}
              <div className="flex items-end gap-1.5 h-10 px-2">
                <div className="w-2.5 bg-white/30 rounded-t h-4" title="Pagi"></div>
                <div className="w-2.5 bg-white/70 rounded-t h-8" title="Pagi Menjelang Siang"></div>
                <div className="w-2.5 bg-white/90 rounded-t h-10" title="Siang Terpuncak"></div>
                <div className="w-2.5 bg-white/40 rounded-t h-5" title="Sore Jam Istirahat"></div>
                <div className="w-2.5 bg-white/80 rounded-t h-7" title="Malam Jam Produktif Kreatif"></div>
                <div className="w-2.5 bg-emerald-400 rounded-t h-2" title="Tidur Sirkadian"></div>
              </div>
            </div>
          </div>

          {/* Dynamic Interactive Activity List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar" id="calendarContainer">
            {schedules.length === 0 ? (
              <div className="h-48 border-2 border-dashed border-sky-100 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3 bg-white/50 backdrop-blur-xs">
                <Coffee className="w-10 h-10 text-sky-300 animate-bounce" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Agenda Sirkadian Belum Diisi</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-sm">Daftarkan kuliah mandiri, tugas eksternal pro, atau gunakan tombol template di panel kiri untuk demo cepat bertenaga!</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {schedules.map((item) => {
                  const cfg = categoryConfigMap[item.category] || categoryConfigMap.akademik;
                  const isEditing = editingItemId === item.id;
                  
                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      layout
                      className="flex gap-3 sm:gap-4 items-stretch group"
                    >
                      {/* Hours labels on the left side formatted cleanly */}
                      <div className="w-20 text-xs font-mono font-black text-sky-600/80 pt-3 text-right shrink-0">
                        {isEditing ? editStart || item.start : item.start} - {isEditing ? editEnd || item.end : item.end}
                      </div>

                      {/* Schedule details Card (Edit Mode vs Read Mode) */}
                      {isEditing ? (
                        <div className="flex-1 bg-white border-2 border-sky-400 rounded-2xl p-4.5 shadow-md space-y-3.5 transition-all">
                          <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-widest font-mono flex items-center gap-1">
                              <Edit2 className="w-3.5 h-3.5 text-sky-500 animate-pulse" /> Edit Cepat Agenda
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">ID: {item.id}</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase tracking-wider">Nama Agenda</label>
                              <input 
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold"
                                placeholder="Edit nama agenda..."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase tracking-wider">Jam Mulai</label>
                                <input 
                                  type="time"
                                  value={editStart}
                                  onChange={(e) => setEditStart(e.target.value)}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-bold font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase tracking-wider">Jam Selesai</label>
                                <input 
                                  type="time"
                                  value={editEnd}
                                  onChange={(e) => setEditEnd(e.target.value)}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-bold font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase tracking-wider">Kategori</label>
                                <select 
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value as any)}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold cursor-pointer"
                                >
                                  <option value="akademik">🟦 Akademik</option>
                                  <option value="eksternal">🟪 MSIB / Eksternal</option>
                                  <option value="sosial">🟧 Sosial & Rileks</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-1 font-mono uppercase tracking-wider">Pengingat Alarm</label>
                                <select 
                                  value={editReminderMinutes}
                                  onChange={(e) => setEditReminderMinutes(Number(e.target.value))}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold cursor-pointer"
                                >
                                  <option value={0}>⏰ Tepat Waktu</option>
                                  <option value={5}>⏰ 5 Menit Sebelum</option>
                                  <option value={10}>⏰ 10 Menit Sebelum</option>
                                  <option value={15}>⏰ 15 Menit Sebelum</option>
                                  <option value={30}>⏰ 30 Menit Sebelum</option>
                                  <option value={-1}>🔕 Matikan Alarm</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              className="text-xs bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold transition cursor-pointer shadow-3xs"
                            >
                              Simpan Perubahan
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only Schedule details Card with Mobile Swipe support and Underlay actions */
                        <div className="flex-1 relative overflow-hidden rounded-2xl touch-pan-y" id={`swipe-container-${item.id}`}>
                          {/* Underlay / Backstage Layer: Absolutely positioned edit & delete buttons revealed on left swipe */}
                          <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-l from-slate-50 to-slate-100/50 px-3 rounded-r-2xl border-y border-r border-slate-200/30 z-0">
                            <button 
                              type="button"
                              onClick={() => {
                                handleOpenEdit(item);
                                setSwipedItemId(null);
                              }}
                              className="text-sky-600 bg-white hover:bg-sky-50 active:scale-95 p-2 rounded-xl border border-slate-200 shadow-3xs transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="Edit Agenda"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold px-0.5">Edit</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                handleDeleteSchedule(item.id);
                                setSwipedItemId(null);
                              }}
                              className="text-rose-600 bg-white hover:bg-rose-50 active:scale-95 p-2 rounded-xl border border-slate-200 shadow-3xs transition-all cursor-pointer flex items-center justify-center gap-1"
                              title="Hapus Agenda"
                            >
                              <X className="w-3.5 h-3.5 font-bold" />
                              <span className="text-[10px] font-bold px-0.5">Hapus</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSwipedItemId(null)}
                              className="text-slate-400 bg-white hover:bg-slate-50 active:scale-95 p-2 rounded-xl border border-slate-150 transition-all cursor-pointer"
                              title="Kembali"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Foreground Card with support for Framer Motion sliding on swipe touch event */}
                          <motion.div 
                            drag="x"
                            dragDirectionLock
                            dragConstraints={{ left: -180, right: 0 }}
                            dragElastic={{ left: 0.1, right: 0 }}
                            dragMomentum={false}
                            animate={{ x: swipedItemId === item.id ? -180 : 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 28 }}
                            onDragEnd={(event, info) => {
                              if (info.offset.x < -30) {
                                setSwipedItemId(item.id);
                              } else if (info.offset.x > 35) {
                                setSwipedItemId(null);
                              }
                            }}
                            className={`relative z-10 w-full ${cfg.bg} border-l-4 ${cfg.border} rounded-2xl p-4 border border-slate-100/10 flex justify-between items-center transition duration-200 shadow-3xs hover:shadow-sm cursor-grab active:cursor-grabbing`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">{item.title}</h3>
                                <span className={`text-[8px] font-mono font-bold ${cfg.pillBg} px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0`}>
                                  {cfg.icon} {cfg.label}
                                </span>

                                {item.reminderMinutes !== undefined && item.reminderMinutes !== -1 ? (
                                  <span className="text-[8px] font-mono font-extrabold bg-sky-50 text-sky-800 border border-sky-200/50 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                                    <Bell className="w-2.5 h-2.5 text-sky-600 animate-pulse" />
                                    {item.reminderMinutes === 0 ? "Tepat Waktu" : `${item.reminderMinutes} Menit Sebelum`}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-mono text-slate-400 bg-slate-100 border border-slate-200/40 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                                    <BellOff className="w-2.5 h-2.5" />
                                    Alarm Mati
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Standard desktop fallback actions (hidden on mobile, only visible on screens lg and up as hovers) */}
                            <div className="hidden lg:flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(item);
                                }}
                                className="text-slate-400 hover:text-sky-600 hover:bg-white p-2 rounded-xl border border-slate-100 transition cursor-pointer"
                                title="Edit Cepat Agenda"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSchedule(item.id);
                                }}
                                className="text-slate-400 hover:text-rose-600 hover:bg-white p-2 rounded-xl border border-slate-100 transition cursor-pointer"
                                title="Hapus Agenda"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Mobile Swipe Hint visual cue */}
                            <div className="flex lg:hidden items-center gap-1 text-[10px] text-slate-400 font-bold shrink-0">
                              {swipedItemId === item.id ? (
                                <span className="animate-pulse text-sky-500">Aksi Aktif</span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 font-mono text-slate-500 rounded px-1 flex items-center gap-1">
                                  <span>← swipe</span>
                                </span>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Permanent Biological Rest Protected Slot (Styled Soft Emerald) */}
            <div className="flex gap-3 sm:gap-4 items-stretch">
              <div className="w-20 text-xs font-mono font-bold text-emerald-600 pt-3.5 text-right">22:00 - 05:00</div>
              <div className="flex-1 bg-emerald-50/40 border-l-4 border-emerald-400 border-dashed rounded-2xl p-4.5 border border-emerald-100/50 shadow-3xs">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs md:text-sm font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Fase Tidur Sirkadian Esensial (Kunci Bioritme)
                  </h3>
                  <span className="text-[8px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Proteksi AI Aktif
                  </span>
                </div>
                <p className="text-[10px] text-emerald-950 mt-2 leading-relaxed font-normal">
                  Sistem perlindungan menghentikan seluruh notifikasi tinggi kognitif guna memaksimalkan regulasi hormon melatonin, meremajakan stamina seluler tubuh demi produktivitas premium esok hari.
                </p>
              </div>
            </div>

            {/* Weekly Insights Component Section */}
            <div className="flex gap-3 sm:gap-4 items-stretch pt-2">
              <div className="w-20 shrink-0 hidden sm:block"></div>
              <div className="flex-1">
                <WeeklyInsights />
              </div>
            </div>
          </div>
        </main>

        {/* 📅 Column 3: Smart Agenda Forms & Interactive Side panel */}
        <section className="w-full lg:w-[28%] bg-white p-5 border-l border-sky-100/50 flex flex-col justify-between overflow-y-auto space-y-5">
          <div className="space-y-4.5">
            
            {/* Adding Agenda component (Elegant Light inputs) */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-light-slate-100">
                <Sparkles className="text-emerald-500 w-4.5 h-4.5 animate-pulse" />
                <h3 className="font-title font-extrabold text-[11px] uppercase tracking-wider text-slate-800">
                  Daftarkan Agenda & Pengingat
                </h3>
              </div>

              <form onSubmit={handleAddSchedule} className="space-y-3">
                {/* Voice Dictation Control Area - Integrated perfectly */}
                <div className="bg-gradient-to-br from-sky-50/50 to-emerald-50/20 border border-slate-100 rounded-2xl p-3 shadow-xs space-y-2 mb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-sky-700 uppercase tracking-widest font-mono flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-500 animate-pulse" /> Dikte Jadwal (AI Voice)
                    </span>
                    {!speechSupported && (
                      <span className="text-[8px] bg-amber-50 text-amber-700 font-mono font-bold px-2 py-0.5 rounded border border-amber-100">
                        Browser Tidak Mendukung
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!speechSupported}
                      onClick={handleToggleListening}
                      className={`relative p-3 rounded-full border transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
                        isListening
                          ? "bg-rose-500 text-white border-transparent ring-4 ring-rose-200 animate-pulse"
                          : "bg-white hover:bg-sky-50 text-sky-600 border-sky-100/80 hover:border-sky-300 shadow-3xs"
                      }`}
                      title={isListening ? "Hentikan Dikte" : "Mulai Dikte Suara"}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-sky-500" />}
                      {isListening && (
                        <span className="absolute -inset-1 rounded-full border-2 border-rose-300 animate-ping opacity-60"></span>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] leading-relaxed truncate ${isListening ? "text-rose-600 font-extrabold animate-pulse" : "text-slate-600 font-semibold"}`}>
                        {isListening ? "Mendengarkan... Silakan berbicara!" : voiceFeedbackText || "Mendaftarkan agenda baru via suara harian."}
                      </p>
                      <p className="text-[8px] text-slate-400 leading-normal">
                        Misal: &ldquo;Rapat magang MSIB jam 13:00 sampai 15:00&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">📋 Nama Agenda / Acara</label>
                  <input 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    type="text" 
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all placeholder:text-slate-400 font-semibold" 
                    placeholder="Contoh: Diskusi Kelompok Fisika atau Scrum MSIB"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">⏰ Jam Mulai</label>
                    <input 
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      type="time" 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">⌛ Jam Selesai</label>
                    <input 
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      type="time" 
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-bold font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">🗂️ Kategori Agenda</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold cursor-pointer"
                  >
                    <option value="akademik">🟦 Akademik (Kuliah & Tugas)</option>
                    <option value="eksternal">🟪 MSIB / Eksternal Pro</option>
                    <option value="sosial">🟧 Sosial & Waktu Keluarga</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 font-mono uppercase tracking-wider">🔔 Konfigurasi Suara Alarm</label>
                  <select 
                    value={formReminderMinutes}
                    onChange={(e) => setFormReminderMinutes(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-bold cursor-pointer"
                  >
                    <option value="-1">🔕 Alarm Dinonaktifkan</option>
                    <option value="0">⏰ Tepat Waktu Saat Agenda Mulai</option>
                    <option value="5">⏳ 5 Menit Sebelum Acara</option>
                    <option value="15">⏳ 15 Menit Sebelum Acara</option>
                    <option value="30">⏳ 30 Menit Sebelum Acara</option>
                    <option value="60">⏳ 1 Jam Sebelum Acara</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-600 hover:to-emerald-500 font-title font-bold text-xs text-white py-3.5 rounded-xl transition duration-200 shadow-md shadow-sky-400/20 flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                >
                  <Plus className="w-4 h-4 text-white" /> Daftarkan Agenda Baru
                </button>
              </form>
            </div>

            {/* Smart Conflict box (Glow alert in Light Mode - Styled Bright Amber) */}
            <AnimatePresence>
              {conflictText && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5 shadow-xs border-l-4 border-l-amber-500"
                  id="aiAlertBox"
                >
                  <div className="text-amber-800 text-xs font-bold font-mono tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" /> TERATURKAN ULANG AI
                  </div>
                  <p className="text-[11px] text-slate-850 leading-relaxed font-semibold" id="aiAlertText">
                    {conflictText}
                  </p>
                  
                  <button 
                    onClick={handleResolveConflict}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[10px] font-title font-black py-2.5 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-amber-200"
                  >
                    🚀 Jalankan Optimalisasi AI Sirkadian
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 📋 Section Task Checklist (Interactive Elements) */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-505 uppercase tracking-widest block font-mono">
                📋 Serpihan Tugas Sirkadian
              </span>
              <span className="text-[9px] bg-emerald-55 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 font-mono">
                {todos.filter(t => t.completed).length}/{todos.length} Selesai
              </span>
            </div>

            <div className="space-y-1.5 text-xs" id="todoContainer">
              {todos.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic block">Tidak ada pecahan tugas mandiri.</p>
              ) : (
                todos.map(todo => (
                  <div 
                    key={todo.id}
                    onClick={() => handleToggleTodo(todo.id)}
                    className="flex items-center gap-2.5 bg-slate-50 hover:bg-sky-50/50 p-2.5 rounded-xl border border-slate-100 transition-colors cursor-pointer group"
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      todo.completed 
                        ? "bg-emerald-500 border-emerald-400 text-white" 
                        : "border-slate-350 hover:border-slate-450 text-transparent"
                    }`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className={`text-[11px] leading-snug select-none font-medium flex-1 ${todo.completed ? "line-through text-slate-400" : "text-slate-800 font-semibold"}`}>
                      {todo.task}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-1.5">
              <input 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddNewTodo((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                type="text" 
                placeholder="+ enter tugas mandiri baru..."
                className="w-full text-xs bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-b border-slate-200 focus:border-sky-500 pb-1 px-1.5 py-1 text-slate-700 focus:outline-none transition-colors font-medium"
              />
            </div>
          </div>

          {/* 🔔 Alarm logs history (clean layout) */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-sky-500" /> Riwayat Alert Terpemicu
              </span>
              {notificationLogs.length > 0 && (
                <button 
                  onClick={() => {
                    setNotificationLogs([]);
                    localStorage.removeItem("snooze_notification_logs");
                  }}
                  className="text-[9px] text-rose-500 hover:text-rose-600 font-mono font-bold cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {notificationLogs.length === 0 ? (
                <p className="text-[10px] text-slate-400 block italic leading-normal text-center pt-2">Belum ada alarm berdering dalam sesi ini.</p>
              ) : (
                notificationLogs.map(log => {
                  let badgeColor = "border-sky-200 text-sky-700 bg-sky-50/70";
                  if (log.category === "eksternal") badgeColor = "border-emerald-200 text-emerald-700 bg-emerald-50/70";
                  if (log.category === "sosial") badgeColor = "border-amber-250 text-amber-700 bg-amber-50/60";
                  return (
                    <div 
                      key={log.id}
                      className="bg-slate-50 border border-slate-100 p-2 rounded-xl flex flex-col gap-1 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono font-bold text-slate-500">{log.time}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
                          {log.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-700 leading-snug font-semibold">
                        {log.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>

      </div>

      {/* 🚨 Dynamic Flying Alert Modal Reminder Dialog (Fresh & Friendly Light style) */}
      <AnimatePresence>
        {activeAlert && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="alertModalContainer">
            {activeAlert.id === "circadian-sleep-warning" ? (
              // 🌿 Customized Beautiful Circadian Sleep Protection Pre-alert Modal
              <motion.div 
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                className="bg-slate-900 text-white border-2 border-amber-400/80 rounded-3xl p-7 max-w-md w-full shadow-2xl space-y-5 relative overflow-hidden"
                id="circadianWarningModal"
              >
                {/* Glowing bio-energy decorative background pattern */}
                <div className="absolute -right-16 -top-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400"></div>

                <div className="flex items-start gap-4">
                  <div className="bg-amber-500 text-slate-950 p-3.5 rounded-2xl shadow-lg ring-4 ring-amber-500/20 animate-pulse">
                    <Moon className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-0.5 rounded-full font-mono font-extrabold uppercase tracking-wider">
                      🛡️ Proteksi Sirkadian Aktif
                    </span>
                    <h4 className="font-title font-black text-white mt-1.5 text-base sm:text-lg leading-tight tracking-tight">
                      {activeAlert.title}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Tidur Esensial Dimulai: <span className="text-emerald-400 font-extrabold font-mono text-xs">{activeAlert.start} (30 Menit Lagi)</span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 leading-relaxed">
                  <p className="text-[11px] text-slate-200 font-medium">
                    Paparan sinar biru (<span className="text-sky-300 font-bold">blue light</span>) dari layar ponsel dan laptop dapat menekan sekresi hormon melatonin alami tubuh Anda.
                  </p>
                  <p className="text-[11px] text-slate-300">
                    SnoozePlan merekomendasikan untuk <strong className="text-amber-300">mematikan seluruh gadget sekarang</strong> agar kualitas tidur optimal dan tingkat energi Anda esok hari pulih 100%! 🍀
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-emerald-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Melatonin Protektif
                  </span>
                  <span className="font-semibold font-mono">Status: Optimal</span>
                </div>

                <div className="pt-2">
                  {/* Dismiss button */}
                  <button 
                    onClick={() => setActiveAlert(null)}
                    className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] text-slate-950 text-xs font-black py-3.5 px-4 rounded-xl transition shadow-lg shadow-amber-500/15 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950 font-black" /> Saya Dimatikan Sekarang (Mengerti)
                  </button>
                </div>
              </motion.div>
            ) : (
              // 🔔 Standard reminder alert
              <motion.div 
                initial={{ opacity: 0, scale: 0.93, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 15 }}
                className="bg-white border border-emerald-100 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4.5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-sky-400 to-emerald-400"></div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-tr from-sky-400 to-emerald-400 p-3.5 rounded-2xl text-white shadow-md animate-bounce">
                    <BellRing className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                      Alarm Pengingat Sirkadian
                    </span>
                    <h4 className="font-title font-extrabold text-slate-900 mt-1.5 text-base leading-tight">
                      {activeAlert.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Acara dimulai pukul: <span className="text-sky-500 font-extrabold font-mono text-xs">{activeAlert.start}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-sky-50/50 p-3.5 rounded-2xl border border-sky-100/50 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Pilar Kesehatan:</span>
                  <span className="font-extrabold text-sky-600 capitalize">{activeAlert.category}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Snooze 5 mins button */}
                  <button 
                    onClick={() => {
                      setSchedules(prev => prev.map(item => {
                        if (item.id === activeAlert.id) {
                          return { ...item, reminderFired: false, reminderMinutes: Math.max(0, (item.reminderMinutes || 15) - 5) };
                        }
                        return item;
                      }));
                      setActiveAlert(null);
                    }}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-3 px-4 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-slate-500" /> Tunda 5 Mnt
                  </button>
                  
                  {/* Dismiss button */}
                  <button 
                    onClick={() => setActiveAlert(null)}
                    className="bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-600 hover:to-emerald-500 text-white text-xs font-extrabold py-3 px-4 rounded-xl transition shadow-sm shadow-sky-400/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" /> Selesai / Mengerti
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
