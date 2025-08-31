import React, { useEffect, useMemo, useState } from "react";

// === Mini App: تمارين + روابط فيديو ===
// ملاحظات:
// - كل تمرين إله خانة لإضافة رابط الفيديو.
// - تحفظ الروابط والملاحظات محليًا (localStorage).
// - تقدر تطبع، وتصدّر/تستورد كـ JSON.
// - واجهة RTL عربية مبسّطة وتشتغل شاشة موبايل أو كمبيوتر.

const PLAN = {
  "Day 1": {
    title: "اليوم 1 — ظهر، بايسبس، معدة",
    exercises: [
      "Chest-supported T-bar row",
      "Wide grip assisted pull-ups / Lat pulldown",
      "Hammer Strength iso-lateral high row",
      "Dumbbell deadstop rows (on incline bench)",
      "Straight-arm rope pulldown (standing tall)",
      "Dumbbell incline curls",
      "EZ-bar reverse curls (on preacher bench)",
      "Cable rope curls",
      "Hanging knee raises",
    ],
  },
  "Day 2": {
    title: "اليوم 2 — صدر، ترايسبس، سمانة",
    exercises: [
      "Machine incline press",
      "Smith machine flat press",
      "Dumbbell floor press",
      "Pec deck fly",
      "EZ-bar skull crushers on flat bench",
      "Rope pushdowns",
      "One-arm overhead cable extension",
      "Standing calf raise",
    ],
  },
  "Day 3": {
    title: "اليوم 3 — راحة",
    exercises: [],
    off: true,
  },
  "Day 4": {
    title: "اليوم 4 — أرجل",
    exercises: [
      "Lying leg curls",
      "Leg press",
      "Machine hack squat (avoid barbell squats)",
      "Dumbbell Bulgarian split squat (no barbell load on spine)",
      "Leg extensions (both legs together)",
      "Glute bridges on mat (dumbbell on hips)",
      "Seated calf raises",
    ],
  },
  "Day 5": {
    title: "اليوم 5 — أكتاف وأذرع",
    exercises: [
      "Seated machine shoulder press",
      "Dumbbell side laterals",
      "Front cable raise (rope or bar)",
      "Reverse pec deck fly",
      "Dumbbell shrugs (seated if needed)",
      "Alternating dumbbell curls",
      "Cable preacher curls (single arm)",
      "Rope hammer curls",
      "Machine close-grip press / Smith machine",
      "Cable rope kickbacks",
    ],
  },
  "Day 6": { title: "اليوم 6 — راحة", exercises: [], off: true },
  "Day 7": { title: "اليوم 7 — كرر من البداية", exercises: [], note: "أعد الدورة من اليوم 1" },
};

const LS_KEY = "mini-workout-links-v1";

function usePersistedState(initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);
  return [state, setState];
}

function sanitizeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
}

export default function App() {
  const [db, setDb] = usePersistedState({});
  const [activeDay, setActiveDay] = useState("Day 1");
  const [query, setQuery] = useState("");

  const exercises = useMemo(() => {
    const list = PLAN[activeDay]?.exercises || [];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter((e) => e.toLowerCase().includes(q));
  }, [activeDay, query]);

  const handleChange = (ex, field, value) => {
    const key = sanitizeKey(`${activeDay}-${ex}`);
    setDb((d) => ({
      ...d,
      [key]: { ...(d[key] || {}), day: activeDay, exercise: ex, [field]: value },
    }));
  };

  const getVal = (ex, field) => {
    const key = sanitizeKey(`${activeDay}-${ex}`);
    return db[key]?.[field] || "";
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workout-links.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        setDb(obj);
      } catch (e) {
        alert("ملف غير صالح");
      }
    };
    reader.readAsText(file);
  };

  const youtubeSearch = (name) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " exercise proper form")}`;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-2xl font-bold">🗂️ كورس التمارين – ربط الفيديو</span>
          <span className="ms-auto flex gap-2">
            <button onClick={() => window.print()} className="px-3 py-1.5 rounded-xl border hover:bg-gray-100">🖨️ طباعة</button>
            <button onClick={exportJSON} className="px-3 py-1.5 rounded-xl border hover:bg-gray-100">⬇️ تصدير JSON</button>
            <label className="px-3 py-1.5 rounded-xl border hover:bg-gray-100 cursor-pointer">
              ⬆️ استيراد JSON
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
            </label>
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* تبويبات الأيام */}
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.keys(PLAN).map((d) => (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`px-3 py-2 rounded-2xl border text-sm ${
                activeDay === d ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-100"
              }`}
              title={PLAN[d].title}
            >
              {PLAN[d].title}
            </button>
          ))}
        </div>

        {/* شريط بحث عن تمرين */}
        <div className="mb-4 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث عن تمرين داخل اليوم الحالي…"
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
          />
          {query && (
            <button onClick={() => setQuery("")} className="px-3 py-2 rounded-xl border">مسح</button>
          )}
        </div>

        {/* قائمة التمارين */}
        {PLAN[activeDay]?.off ? (
          <div className="p-6 rounded-2xl border bg-white">
            يوم راحة — استرجاع ونوم جيد وشرب مي 💧
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((ex) => (
              <div key={ex} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold">{ex}</span>
                  <a
                    href={youtubeSearch(ex)}
                    target="_blank"
                    rel="noreferrer"
                    className="ms-auto text-sm underline"
                    title="بحث يوتيوب عن التمرين"
                  >🔎 بحث فيديو</a>
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">المرات (Sets)</label>
                    <input
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="مثال: 4"
                      value={getVal(ex, "sets")}
                      onChange={(e) => handleChange(ex, "sets", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">التكرارات (Reps)</label>
                    <input
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="مثال: 10"
                      value={getVal(ex, "reps")}
                      onChange={(e) => handleChange(ex, "reps", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500">رابط الفيديو</label>
                    <input
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="الصق رابط فيديو YouTube للتمرين"
                      value={getVal(ex, "video")}
                      onChange={(e) => handleChange(ex, "video", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs text-gray-500">ملاحظات</label>
                  <textarea
                    className="w-full rounded-xl border px-3 py-2 min-h-[60px]"
                    placeholder="نصائح سريعة عن الأداء أو الوزن…"
                    value={getVal(ex, "notes")}
                    onChange={(e) => handleChange(ex, "notes", e.target.value)}
                  />
                </div>

                {getVal(ex, "video") && (
                  <div className="mt-3">
                    <a
                      className="inline-block px-3 py-2 rounded-xl border hover:bg-gray-50"
                      href={getVal(ex, "video")}
                      target="_blank"
                      rel="noreferrer"
                    >▶️ فتح الفيديو</a>
                  </div>
                )}
              </div>
            ))}

            {exercises.length === 0 && (
              <div className="p-6 rounded-2xl border bg-white text-gray-600">لا توجد تمارين مطابقة للبحث.</div>
            )}
          </div>
        )}

        {/* ملاحظات عامة */}
        <section className="mt-8 p-4 rounded-2xl border bg-white">
          <h3 className="text-lg font-semibold mb-2">تلميحات سريعة</h3>
          <ul className="list-disc pe-6 space-y-1 text-sm text-gray-700">
            <li>إشرب على الأقل ٥ لتر مي باليوم (حسب الملاحظات).</li>
            <li>خلّي بين الوجبات ٢–٣ ساعات، وحافظ على النوم ٧–٨ ساعات.</li>
            <li>اضغط زر «🔎 بحث فيديو» يم كل تمرين حتى تلاكي فيديو شرح واضح.</li>
            <li>استخدم «تصدير JSON» حتى تحتفظ بإعداداتك وتنقلها لأي جهاز.</li>
          </ul>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} — Mini App by صلاح
      </footer>

      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          a { text-decoration: none; }
          .border { border-color: #ccc !important; }
        }
      `}</style>
    </div>
  );
}
