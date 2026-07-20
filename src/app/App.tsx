import { useRef, useState } from "react";
import {
  Wifi,
  Bluetooth,
  Volume2,
  Bell,
  Moon,
  Shield,
  Fingerprint,
  Battery,
  Smartphone,
  Eye,
  Globe,
  Flashlight,
  Lock,
  Vibrate,
  Radio,
  Accessibility,
  MapPin,
  CloudUpload,
  Zap,
  Sun,
} from "lucide-react";
import { getContext, nextUrl, INSTRUCTIONS } from "./tallyFlow";
import { InstructionsOverlay } from "./InstructionsOverlay";

declare global {
  interface Window {
    Tally: any;
  }
}

// ── CONFIGURABLE ───────────────────────────────────────────────
const TOGGLE_POSITION: "left" | "right" = "right";
// ──────────────────────────────────────────────────────────────

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  iconColor: string;
  toggled: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const INITIAL_SECTIONS: SettingSection[] = [
  {
    title: "Network & Connectivity",
    items: [
      { id: "wifi", label: "Wi-Fi", description: "AndroidNet_5G", icon: Wifi, iconColor: "#a8c7fa", toggled: true },
      { id: "bluetooth", label: "Bluetooth", description: "On · 2 devices connected", icon: Bluetooth, iconColor: "#cbb4fd", toggled: true },
      { id: "mobile", label: "Mobile data", description: "Carrier · LTE", icon: Radio, iconColor: "#80cbc4", toggled: true },
      { id: "airplane", label: "Airplane mode", icon: Globe, iconColor: "#ef9a9a", toggled: false },
    ],
  },
  {
    title: "Sound & Vibration",
    items: [
      { id: "sound", label: "Sound", description: "Volume at 70%", icon: Volume2, iconColor: "#80deea", toggled: true },
      { id: "vibration", label: "Vibration", description: "Always on ring", icon: Vibrate, iconColor: "#a5d6a7", toggled: true },
      { id: "notifications", label: "Notification sounds", icon: Bell, iconColor: "#ffe082", toggled: true },
    ],
  },
  {
    title: "Display",
    items: [
      { id: "darkmode", label: "Dark theme", description: "On", icon: Moon, iconColor: "#ce93d8", toggled: true },
      { id: "brightness", label: "Adaptive brightness", icon: Sun, iconColor: "#ffe082", toggled: false },
      { id: "nightlight", label: "Night Light", description: "Scheduled · 10 PM – 7 AM", icon: Eye, iconColor: "#ffcc80", toggled: true },
      { id: "torch", label: "Flashlight", icon: Flashlight, iconColor: "#fff59d", toggled: false },
    ],
  },
  {
    title: "Privacy & Security",
    items: [
      { id: "fingerprint", label: "Fingerprint unlock", icon: Fingerprint, iconColor: "#ef9a9a", toggled: true },
      { id: "screenlock", label: "Screen lock", description: "PIN · 30 seconds", icon: Lock, iconColor: "#a8c7fa", toggled: true },
      { id: "location", label: "Location", description: "Apps-only access", icon: MapPin, iconColor: "#80deea", toggled: true },
      { id: "shield", label: "Google Play Protect", icon: Shield, iconColor: "#a5d6a7", toggled: true },
    ],
  },
  {
    title: "System",
    items: [
      { id: "battery", label: "Battery saver", description: "Off · 84%", icon: Battery, iconColor: "#a5d6a7", toggled: false },
      { id: "powersave", label: "Adaptive battery", icon: Zap, iconColor: "#ffe082", toggled: true },
      { id: "backup", label: "Backup to Google Drive", icon: CloudUpload, iconColor: "#a8c7fa", toggled: true },
      { id: "accessibility", label: "Accessibility shortcuts", icon: Accessibility, iconColor: "#cbb4fd", toggled: false },
      { id: "devmode", label: "Developer options", icon: Smartphone, iconColor: "#80cbc4", toggled: false },
    ],
  },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${on ? "bg-primary" : "bg-[var(--switch-background)]"
        }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow-md transition-transform duration-200 ${on ? "translate-x-5 bg-[#003063]" : "translate-x-0 bg-[#aeafc0]"
          }`}
      />
    </button>
  );
}

function SettingRow({
  item,
  onToggle,
  position,
}: {
  item: SettingItem;
  onToggle: () => void;
  position: "left" | "right";
}) {
  const Icon = item.icon;
  const toggle = <Toggle on={item.toggled} onToggle={onToggle} />;
  const iconEl = (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
      style={{ backgroundColor: `${item.iconColor}18` }}
    >
      <Icon size={20} style={{ color: item.iconColor }} strokeWidth={1.75} />
    </div>
  );

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 select-none ${position === "left" ? "flex-row-reverse" : "flex-row"
        }`}
    >
      {position === "right" && iconEl}
      <div className={`flex-1 min-w-0 ${position === "left" ? "text-right" : "text-left"}`}>
        <p className="text-[15px] font-medium text-foreground leading-tight truncate">{item.label}</p>
        {item.description && (
          <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{item.description}</p>
        )}
      </div>
      {toggle}
      {position === "left" && iconEl}
    </div>
  );
}

export default function App() {
  const [sections, setSections] = useState<SettingSection[]>(INITIAL_SECTIONS);
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasToggledTop, setHasToggledTop] = useState(false);
  const [hasToggledBottom, setHasToggledBottom] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const timeToCompleteRef = useRef<number | null>(null);

  // The two specific checkpoints for this task: first item (no scroll needed)
  // and last item (requires scrolling the full list).
  const TOP_TARGET_ID = "wifi";
  const BOTTOM_TARGET_ID = "devmode";

  function handleStart() {
    startTimeRef.current = Date.now(); // timer starts here, not on page load
    timeToCompleteRef.current = null;
    setHasToggledTop(false);
    setHasToggledBottom(false);
    setShowInstructions(false);
  }

  function maybeMarkComplete(nextTop: boolean, nextBottom: boolean) {
    if (nextTop && nextBottom && timeToCompleteRef.current === null) {
      timeToCompleteRef.current = Date.now() - startTimeRef.current;
    }
  }

  const handleToggle = (sectionIdx: number, itemIdx: number) => {
    const item = sections[sectionIdx].items[itemIdx];

    if (!showInstructions) {
      const willBeTop = hasToggledTop || item.id === TOP_TARGET_ID;
      const willBeBottom = hasToggledBottom || item.id === BOTTOM_TARGET_ID;
      if (item.id === TOP_TARGET_ID && !hasToggledTop) setHasToggledTop(true);
      if (item.id === BOTTOM_TARGET_ID && !hasToggledBottom) setHasToggledBottom(true);
      maybeMarkComplete(willBeTop, willBeBottom);
    }

    setSections((prev) =>
      prev.map((section, si) =>
        si !== sectionIdx
          ? section
          : {
            ...section,
            items: section.items.map((it, ii) =>
              ii !== itemIdx ? it : { ...it, toggled: !it.toggled }
            ),
          }
      )
    );
  };

  function handleRateClick() {
    const ctx = getContext();
    // Falls back to time-since-start if they never completed both checkpoints,
    // so we still capture something rather than sending null.
    const elapsed = timeToCompleteRef.current ?? (Date.now() - startTimeRef.current);

    window.Tally.openPopup("gD17jO", {
      layout: "modal",
      hiddenFields: {
        pid: ctx.pid,
        pair: ctx.pair,
        variant: ctx.isVariant ? "lefthand" : "baseline",
        step: ctx.step,
        elapsed_ms: elapsed,
        grip_type: ctx.grip,
      },
      onSubmit: () => {
        window.location.href = nextUrl(ctx);
      },
    });
  }

  return (
    <div
      className="min-h-screen w-full bg-background"
      style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <h1 className="text-[17px] font-medium text-foreground">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto pb-32">
        {sections.map((section, si) => (
          <div key={section.title} className={si > 0 ? "mt-6" : "mt-1"}>
            <p className="px-4 mb-1 text-[12px] font-medium tracking-widest uppercase text-primary">
              {section.title}
            </p>
            <div className="bg-card rounded-2xl mx-2 overflow-hidden border border-border/60">
              {section.items.map((item, ii) => (
                <div key={item.id}>
                  <SettingRow
                    item={item}
                    onToggle={() => handleToggle(si, ii)}
                    position={TOGGLE_POSITION}
                  />
                  {ii < section.items.length - 1 && (
                    <div
                      className="border-b border-border/50"
                      style={{
                        marginLeft: TOGGLE_POSITION === "right" ? "4rem" : "1rem",
                        marginRight: TOGGLE_POSITION === "left" ? "4rem" : "1rem",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rate this prototype, fixed to the viewport so it stays visible while scrolling */}
      <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        <button
          onClick={handleRateClick}
          disabled={!(hasToggledTop && hasToggledBottom)}
          className={`text-sm font-bold px-7 py-3 rounded-full transition-all ${
            hasToggledTop && hasToggledBottom
              ? "bg-blue-500 text-white shadow-[0_4px_20px_rgba(59,130,246,0.6)] active:scale-95"
              : "bg-gray-300 text-gray-400 cursor-not-allowed"
          }`}
        >
          Done testing — Rate this
        </button>
      </div>

      {/* Instructions overlay, shown until participant taps Start */}
      {showInstructions && (
        <InstructionsOverlay
          title={INSTRUCTIONS.settings.title}
          instructions={INSTRUCTIONS.settings.text}
          onStart={handleStart}
        />
      )}
    </div>
  );
}