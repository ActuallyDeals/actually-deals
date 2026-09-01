import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Actually Deals";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8FAFC",
          gap: 36,
        }}
      >
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: 40,
            background: "#0F172A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="132" height="132" viewBox="0 0 32 32">
            <path
              d="M12.25 13.25v-2.6a2.25 2.25 0 0 1 4.5 0"
              stroke="#34D399"
              strokeWidth="1.85"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M15.25 13.25v-2.6a2.25 2.25 0 0 1 4.5 0"
              stroke="#34D399"
              strokeWidth="1.85"
              strokeLinecap="round"
              fill="none"
            />
            <rect x="8.5" y="12.75" width="15" height="13.5" rx="2.25" fill="#059669" />
            <path
              d="M12.4 19.85 14.95 22.4 20.05 16.55"
              stroke="#ECFDF5"
              strokeWidth="2.15"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
            <span style={{ color: "#0F172A" }}>Actually</span>
            <span style={{ color: "#059669", marginLeft: 16 }}>Deals</span>
          </div>
          <div style={{ color: "#64748B", fontSize: 28, marginTop: 8 }}>
            Deals that are actually good!
          </div>
        </div>
      </div>
    ),
    size,
  );
}
