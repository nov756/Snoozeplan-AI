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
  Sliders
} from "lucide-react";
import { ScheduleItem, TodoItem, OptimizationResponse } from "./types";

const defaultSchedules: ScheduleItem[] = [
  { id: "1", title: "Kuliah Reguler: Jaringan Komputer", start: "08:00", end: "10:30", category: "akademik", reminderMinutes: 15, reminderFired: false },
  { id: "2", title: "Sesi Magang Profesional (MSIB)", start: "13:00", end: "17:00", category: "eksternal", reminderMinutes: 30, reminderFired: false },
];

const defaultTodos: TodoItem[] = [
  { id: "todo-1", task: "Selesaikan lembar analisis kegiatan harian", completed: false },
  { id: "todo-2", task: "Matikan layar gadget 30 menit sebelum slot tidur esensial", completed: false },
];

export default function App() {
  // Persistence state
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem("snooze_schedules");
    return saved ? JSON.parse(saved) : defaultSchedules;
  });

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const saved = localStorage.getItem("snooze_todos");
    return saved ? JSON.parse(saved) : defaultTodos;
  });

  // UI forms
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formCategory, setFormCategory] = useState<'akademik' | 'eksternal' | 'sosial'>("akademik");
  const [formReminderMinutes, setFormReminderMinutes] = useState<number>(15);

  // AI & Circadian state
  const [energyScore, setEnergyScore] = useState(85);
  const [sleepDurationHours, setSleepDurationHours] = useState(7);
  const [conflictText, setConflictText] = useState<string | null>(null);
  const [coachingTip, setCoachingTip] = useState(
    "Menjaga konsistensi sirkadian menstabilkan pelepasan kortisol harian dan mengoptimalkan fungsi kognitif Anda."
  );
  const [isLoaderActive, setIsLoaderActive] = useState(false);
  const [isAiConfigured, setIsAiConfigured] = useState(true);

  // Time ticker state
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Reminder alert and notification states
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulationTime, setSimulationTime] = useState("07:45");
  const [activeAlert, setActiveAlert] = useState<ScheduleItem | null>(null);
  const [activeAlertMinutesLeft, setActiveAlertMinutesLeft] = useState<number>(15);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationLogs, setNotificationLogs] = useState<{ id: string; time: string; text: string; category: string }[]>(() => {
    const saved = localStorage.getItem("snooze_notification_logs");
    return saved ? JSON.parse(saved) : [];
  });

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

  // Audio synthesis helper for beautiful notification warning chime
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 melodic cue
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.15);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime + index * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + index * 0.15 + 0.45);
        
        osc.type = "sine";
        osc.start(audioCtx.currentTime + index * 0.15);
        osc.stop(audioCtx.currentTime + index * 0.15 + 0.5);
      });
    } catch (e) {
      console.warn("Blocked AudioContext. User gesture is required first.", e);
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
        // Skip biologis & events with no reminder configured (-1)
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
          const logMsg = `[Alarm ${labelTxt}] Acara "${item.title}" akan dimulai pukul ${item.start}!`;

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

      if (didChange) {
        setSchedules(updatedSchedules);
      }
    };

    // Scan initially and every 3 seconds for exact match responsive feedback
    const interval = setInterval(checkReminders, 3000);
    checkReminders();
    return () => clearInterval(interval);
  }, [schedules, isSimulationMode, simulationTime]);

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
      }
    } catch (err) {
      console.error("Gagal melakukan optimasi terpusat. Menggunakan fallback lokal.", err);
      // Fallback local rule-based simulation in case of connection exceptions
      computeLocalRuleFallback(currentSchedules, action);
    } finally {
      setIsLoaderActive(false);
    }
  };

  // Safe client calculation to display immediate responsive items before API returns
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
              title: `${item.title} (Digeser AI ke Jam Aman)`
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
          conflict = `Terdeteksi tabrakan waktu jam ${a.start} antara "${a.title}" dan "${b.title}".`;
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

    // Update simple todo checklist
    if (action === "resolve") {
      setTodos([
        { id: "todo-1", task: "Persiapan materi rapat sirkadian selesai", completed: true },
        { id: "todo-2", task: "Catatan tugas magang terstruktur", completed: false }
      ]);
    }
  };

  // Run initial diagnostics on mount
  useEffect(() => {
    triggerServiceOptimization(schedules, "analyze");
  }, []);

  // Handler to add a schedule manual
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
      reminderFired: false,
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
    setCoachingTip("Seluruh agenda kosong. Ritme biologi Anda berada pada mode istirahat penuh.");
  };

  // Resolve conflict using AI Optimization
  const handleResolveConflict = () => {
    triggerServiceOptimization(schedules, "resolve");
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

  // Map category code to beautiful tailwind styling properties
  const categoryConfigMap = {
    akademik: {
      bg: "bg-blue-600/10",
      border: "border-blue-500",
      text: "text-blue-400",
      label: "Akademik",
      icon: <BookOpen className="w-3.5 h-3.5" />
    },
    eksternal: {
      bg: "bg-purple-600/10",
      border: "border-purple-500",
      text: "text-purple-400",
      label: "Eksternal Pro",
      icon: <Briefcase className="w-3.5 h-3.5" />
    },
    sosial: {
      bg: "bg-orange-600/10",
      border: "border-orange-500",
      text: "text-orange-400",
      label: "Sosial",
      icon: <Users className="w-3.5 h-3.5" />
    },
    biologis: {
      bg: "bg-emerald-600/5",
      border: "border-emerald-500/40",
      text: "text-emerald-400",
      label: "Jam Tidur AI",
      icon: <Moon className="w-3.5 h-3.5 animate-pulse" />
    }
  };

  // Math for Circular protected score
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (energyScore / 100) * circumference;

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans select-none overflow-x-hidden antialiased selection:bg-indigo-600 selection:text-white" id="snoozeplan-app-root">
      
      {/* 🚀 Dynamic Status Top Banner */}
      <header className="bg-slate-950 border-b border-slate-900 text-slate-400 text-xs py-2.5 px-6 flex justify-between items-center font-mono">
        <div className="flex items-center gap-3">
          <span className="text-indigo-400 font-bold tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> SNOOZEPLAN AI PRO
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-full font-mono">
            PRODUCTION READY v1.2
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
            <Clock className="w-3 h-3 text-indigo-400" /> {currentTimeStr || "Loading..."} WITA
          </div>
          <span className="text-emerald-400 flex items-center gap-1.5 text-[10px] md:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LocalStorage Terintegrasi
          </span>
        </div>
      </header>

      {/* 🔮 Primary Flex Column Structure */}
      <div className="flex flex-1 flex-col lg:flex-row h-auto lg:h-[calc(100vh-37px)] overflow-hidden">
        
        {/* 📋 Column 1: Sidebar Biosphere Indicator */}
        <aside className="w-full lg:w-[22%] bg-slate-900/30 p-6 flex flex-col justify-between border-r border-slate-900">
          <div className="space-y-6">
            <div className="flex items-center gap-3.5">
              <div className="bg-gradient-to-tr from-indigo-700 to-violet-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-950/50 flex justify-center items-center">
                <Moon className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <h1 className="font-title font-bold text-lg tracking-tight text-slate-100 leading-none">SnoozePlan</h1>
                <span className="text-[9px] text-indigo-400 font-mono tracking-widest uppercase">Circadian Optimizer</span>
              </div>
            </div>

            {/* Circadian Score Ring Card */}
            <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proteksi Sirkadian</span>
                {isLoaderActive && (
                  <span className="text-[10px] text-indigo-400 animate-pulse font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span> AI Menganalisis...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  {/* SVG Circle Progress */}
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      className="stroke-slate-950"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r={radius}
                      className="stroke-indigo-500"
                      strokeWidth="5.5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-mono font-bold text-slate-100">{energyScore}%</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Skor Energi Sirkadian</p>
                  <p className="text-[10px] text-slate-400 mt-1">Estimasi Tidur: <strong className="text-indigo-400">{sleepDurationHours.toFixed(1)} Jam</strong></p>
                  <p className="text-[9px] text-slate-500">Min. Tidur Sehat: 6.5 Jam</p>
                </div>
              </div>

              {/* Dynamic Health Warning */}
              <div className="pt-2 border-t border-slate-950/60">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Status: {energyScore >= 80 ? (
                    <span className="text-emerald-400 font-bold">Sangat Ideal ✨</span>
                  ) : energyScore >= 60 ? (
                    <span className="text-amber-400 font-bold">Butuh Penyesuaian ⚠️</span>
                  ) : (
                    <span className="text-rose-400 font-bold">Sirkadian Terganggu 🚨</span>
                  )}
                </p>
              </div>
            </div>

            {/* AI Advisor Coaching Tip panel */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block font-mono">Conseil sirkadian AI</span>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{coachingTip}&rdquo;
              </p>
            </div>

            {/* 🔔 Reminder testing & Audio configuration controller */}
            <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Alarm & Audio
                </span>
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1 rounded-lg border transition cursor-pointer ${
                    soundEnabled 
                      ? "bg-indigo-950/50 text-indigo-400 border-indigo-900/50 hover:bg-indigo-950" 
                      : "bg-slate-950 text-slate-600 border-slate-900 hover:bg-slate-900"
                  }`}
                  title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Sound"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Simulation Toggles */}
              <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-900/60">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-slate-450">Mode Simulasi Uji</span>
                  <input 
                    type="checkbox" 
                    checked={isSimulationMode}
                    onChange={(e) => setIsSimulationMode(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-850 text-indigo-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 accent-indigo-500"
                  />
                </div>
                {isSimulationMode ? (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2 pt-1 border-t border-slate-900/80"
                  >
                    <label className="block text-[9px] text-slate-500 tracking-wider">Simulasi Jam:</label>
                    <input 
                      type="time" 
                      value={simulationTime}
                      onChange={(e) => setSimulationTime(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 text-center focus:outline-none focus:border-indigo-600 font-bold"
                    />
                    <div className="flex gap-1.5 pt-0.5">
                      <button 
                        type="button"
                        onClick={() => {
                          const [h, m] = simulationTime.split(":").map(Number);
                          const total = (h * 60 + m - 15 + 1440) % 1440;
                          const nh = String(Math.floor(total / 60)).padStart(2, "0");
                          const nm = String(total % 60).padStart(2, "0");
                          setSimulationTime(`${nh}:${nm}`);
                        }}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 py-1.5 rounded-lg border border-slate-800/40 transition cursor-pointer text-center font-mono"
                      >
                        -15m
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
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-400 py-1.5 rounded-lg border border-slate-800/40 transition cursor-pointer text-center font-mono"
                      >
                        +15m
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Reset all fired statuses to let them test reminders again
                        setSchedules(prev => prev.map(item => ({ ...item, reminderFired: false })));
                        alert("Status alarm dikosongkan. Siap uji ulang.");
                      }}
                      className="w-full bg-indigo-950/30 hover:bg-indigo-950/60 text-indigo-400 text-[9px] font-bold py-1.5 rounded-md border border-indigo-900/30 transition uppercase tracking-wider cursor-pointer"
                    >
                      Buka Kunci Alarm (Test Lagi)
                    </button>
                  </motion.div>
                ) : (
                  <p className="text-[9px] text-slate-600 leading-normal">
                    Menggunakan jam real-time. Centang uji di atas untuk simulasi cepat melompati jam.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-4 mt-6 space-y-1">
            <p className="font-semibold text-slate-400">Proteksi Biologis:</p>
            <p>Jendela biologis 22.00 - 05.00 otomatis terlindungi dan terkunci untuk pemulihan optimal sistem seluler tubuh.</p>
          </div>
        </aside>

        {/* 📅 Column 2: Middle Activity Flow Column */}
        <main className="flex-1 bg-slate-950 p-6 flex flex-col overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold font-title tracking-tight text-slate-100 flex items-center gap-2">
                Alur Kegiatan Hari Ini
              </h2>
              <p className="text-xs text-slate-400">Kelola & optimalkan ritme jam kesibukan harian Anda</p>
            </div>
            
            <button 
              onClick={handleClearAllSchedules}
              className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl border border-rose-500/20 transition-all font-medium flex items-center gap-1.5 focus:outline-none"
            >
              <Trash2 className="w-3.5 h-3.5" /> Kosongkan Jadwal
            </button>
          </div>

          {/* Dynamic Interactive Activity List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar" id="calendarContainer">
            {schedules.length === 0 ? (
              <div className="h-44 border-2 border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                <Coffee className="w-8 h-8 text-slate-700" />
                <div>
                  <p className="text-xs font-semibold text-slate-400">Belum Ada Agenda Terjadwal</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tambahkan kegiatan akademik atau profesional Anda di panel kanan.</p>
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {schedules.map((item) => {
                  const cfg = categoryConfigMap[item.category] || categoryConfigMap.akademik;
                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="flex gap-4 items-stretch group"
                    >
                      {/* Hours labels on the left */}
                      <div className="w-20 text-xs font-mono text-slate-500 pt-3.5 text-right shrink-0">
                        {item.start} - {item.end}
                      </div>

                      {/* Schedule details Card */}
                      <div className={`flex-1 ${cfg.bg} border-l-4 ${cfg.border} rounded-xl p-4 border border-slate-900 flex justify-between items-center transition hover:border-slate-800`}>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-xs md:text-sm font-bold ${cfg.text}`}>{item.title}</h3>
                            <span className="text-[8px] font-mono font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              {cfg.icon} {cfg.label}
                            </span>

                            {item.reminderMinutes !== undefined && item.reminderMinutes !== -1 ? (
                              <span className="text-[8px] font-mono font-bold bg-indigo-950/50 text-indigo-300 border border-indigo-900/50 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                                {item.reminderMinutes === 0 ? "Pada Acara" : `${item.reminderMinutes} Menit Sebelum`}
                              </span>
                            ) : (
                              <span className="text-[8px] font-mono text-slate-600 border border-slate-900/60 px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
                                <BellOff className="w-2.5 h-2.5" />
                                Tanpa Pengingat
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="opacity-100 lg:opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 hover:bg-slate-950 p-1 rounded transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* Permanent Biological Rest Protected Slot */}
            <div className="flex gap-4 items-stretch">
              <div className="w-20 text-xs font-mono text-slate-500 pt-3 text-right">22:00 - 05:00</div>
              <div className={`flex-1 ${categoryConfigMap.biologis.bg} border-l-4 ${categoryConfigMap.biologis.border} border-dashed rounded-xl p-4 border border-slate-900`}>
                <div className="flex items-center gap-2">
                  <h3 className={`text-xs md:text-sm font-bold ${categoryConfigMap.biologis.text} flex items-center gap-1.5`}>
                    <Moon className="w-3.5 h-3.5" /> Slot Tidur Esensial (Terproteksi Otomatis AI)
                  </h3>
                  <span className="text-[8px] font-mono font-bold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    Aktif
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Sirkadian memblokir aktivitas berat dan mematikan pengiriman notifikasi eksternal untuk mengamankan istirahat sel biologis optimal Anda.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* 📅 Column 3: Smart Agenda Forms & Conflicts */}
        <section className="w-full lg:w-[28%] bg-slate-900/30 p-6 border-l border-slate-950 lg:border-slate-900 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            
            {/* Adding Agenda component */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                <Sparkles className="text-indigo-400 w-4 h-4" />
                <h3 className="font-title font-bold text-xs uppercase tracking-wider text-slate-300">
                  Tambah Agenda Pintar
                </h3>
              </div>

              <form onSubmit={handleAddSchedule} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-450 mb-1 font-mono uppercase tracking-wider">Nama Kegiatan / Tugas</label>
                  <input 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    type="text" 
                    className="w-full text-xs bg-slate-950 border border-slate-900 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-700" 
                    placeholder="Misal: Rapat Panitia Wisuda Kampus"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-450 mb-1 font-mono uppercase tracking-wider">Jam Mulai</label>
                    <input 
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      type="time" 
                      className="w-full text-xs bg-slate-950 border border-slate-900 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-450 mb-1 font-mono uppercase tracking-wider">Jam Selesai</label>
                    <input 
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      type="time" 
                      className="w-full text-xs bg-slate-950 border border-slate-900 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-450 mb-1 font-mono uppercase tracking-wider">Kategori Pilar Kesibukan</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full text-xs bg-slate-950 border border-slate-900 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="akademik">🟦 Akademik (Kuliah / Ujian / Tugas)</option>
                    <option value="eksternal">🟪 Eksternal Pro (Magang / Bootcamp / Kerja)</option>
                    <option value="sosial">🟧 Sosial (Kepanitiaan / Organisasi / Hangout)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-450 mb-1 font-mono uppercase tracking-wider">🔔 Pengingat Acara</label>
                  <select 
                    value={formReminderMinutes}
                    onChange={(e) => setFormReminderMinutes(Number(e.target.value))}
                    className="w-full text-xs bg-slate-950 border border-slate-900 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="-1">🔕 Tanpa Pengingat</option>
                    <option value="0">⏰ Tepat Saat Acara Dimulai</option>
                    <option value="5">⏳ 5 Menit Sebelum Acara</option>
                    <option value="15">⏳ 15 Menit Sebelum Acara</option>
                    <option value="30">⏳ 30 Menit Sebelum Acara</option>
                    <option value="60">⏳ 1 Jam Sebelum Acara</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 font-semibold text-xs text-white py-3 rounded-xl transition shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Masukkan ke Jadwal
                </button>
              </form>
            </div>

            {/* Smart Conflict box (glowing animation if conflict occurs) */}
            <AnimatePresence>
              {conflictText && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4 space-y-3 shadow-lg"
                  id="aiAlertBox"
                >
                  <div className="text-amber-400 text-xs font-bold font-mono tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" /> RESOLUSI KONFLIK JADWAL (AI)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans" id="aiAlertText">
                    {conflictText}
                  </p>
                  
                  <button 
                    onClick={handleResolveConflict}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold py-2 rounded-lg transition-all uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer shadow shadow-amber-900"
                  >
                    {isLoaderActive ? (
                      <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></span>
                    ) : (
                      "Izinkan AI Atur Otomatis ✨"
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 📋 Section Task Breakdown harian */}
          <div className="border-t border-slate-900 pt-5 mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block font-mono">
                📋 Task Breakdown Hari Ini
              </span>
              <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                {todos.filter(t => t.completed).length}/{todos.length} Selesai
              </span>
            </div>

            <div className="space-y-2 text-xs" id="todoContainer">
              {todos.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic block">Tidak ada pecahan tugas saat ini. Tambah schedule untuk memicu.</p>
              ) : (
                todos.map(todo => (
                  <div 
                    key={todo.id}
                    onClick={() => handleToggleTodo(todo.id)}
                    className="flex items-center gap-2.5 bg-slate-950/60 hover:bg-slate-900/60 p-2.5 rounded-xl border border-slate-900/40 transition-colors cursor-pointer"
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                      todo.completed 
                        ? "bg-indigo-600 border-indigo-500" 
                        : "border-slate-800 hover:border-slate-750"
                    }`}>
                      {todo.completed && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={`text-[11px] leading-tight select-none ${todo.completed ? "line-through text-slate-500" : "text-slate-300"}`}>
                      {todo.task}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Quick manual todo entry */}
            <div className="pt-2">
              <input 
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddNewTodo((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                type="text" 
                placeholder="+ Tambah tugas mandiri (Tekan Enter)"
                className="w-full text-[10px] bg-transparent border-b border-slate-900/60 pb-1 text-slate-400 focus:outline-none focus:border-indigo-600 focus:text-slate-200 transition-colors"
              />
            </div>
          </div>

          {/* 🔔 Riwayat Alarm Terpemicu History */}
          <div className="border-t border-slate-900 pt-5 mt-6 space-y-3.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block font-mono flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" /> Riwayat Alarm Terpemicu
              </span>
              {notificationLogs.length > 0 && (
                <button 
                  onClick={() => {
                    setNotificationLogs([]);
                    localStorage.removeItem("snooze_notification_logs");
                  }}
                  className="text-[9px] text-rose-400/80 hover:text-rose-400 font-mono cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {notificationLogs.length === 0 ? (
                <p className="text-[10px] text-slate-600 block leading-normal italic">Belum ada alarm yang berbunyi hari ini.</p>
              ) : (
                notificationLogs.map(log => {
                  let badgeColor = "border-blue-900 text-blue-400";
                  if (log.category === "eksternal") badgeColor = "border-purple-900 text-purple-400";
                  if (log.category === "sosial") badgeColor = "border-orange-900 text-orange-400";
                  return (
                    <div 
                      key={log.id}
                      className="bg-slate-950/40 border border-slate-900/60 p-2 rounded-xl flex flex-col gap-1 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono font-bold text-slate-500">{log.time}</span>
                        <span className={`text-[8px] font-mono font-semibold px-1 rounded border ${badgeColor} capitalize`}>
                          {log.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-350 leading-snug font-sans">
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

      {/* 🚨 Dynamic Floating Notification Popup Modal */}
      <AnimatePresence>
        {activeAlert && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-indigo-500/10 space-y-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500"></div>
              
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 p-3.5 rounded-2xl text-white shadow-lg animate-bounce">
                  <BellRing className="w-5 h-5 text-indigo-100" />
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-widest">
                    SnoozePlan Alarm
                  </span>
                  <h4 className="font-title font-bold text-sm md:text-base text-white mt-1 leading-tight">
                    {activeAlert.title}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Acara dimulai pukul: <strong className="text-slate-200">{activeAlert.start}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-950 flex items-center justify-between text-xs">
                <span className="text-slate-400">Pilar Kegiatan:</span>
                <span className="font-medium text-indigo-400 capitalize">{activeAlert.category}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
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
                  className="bg-slate-950 hover:bg-slate-850 text-slate-300 text-xs font-semibold py-3 px-4 rounded-xl border border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Tunda 5 Mnt
                </button>
                
                {/* Dismiss button */}
                <button 
                  onClick={() => setActiveAlert(null)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-3 px-4 rounded-xl transition shadow shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
