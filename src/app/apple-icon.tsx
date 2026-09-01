import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0F172A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 32 32">
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
    ),
    size,
  );
}
