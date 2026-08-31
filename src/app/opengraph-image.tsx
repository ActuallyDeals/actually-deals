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
            position: "relative",
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              background: "#F8FAFC",
              transform: "rotate(45deg)",
              borderRadius: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 18,
              height: 18,
              borderRadius: 18,
              background: "#0F172A",
              top: 46,
              right: 46,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: 36,
              width: 96,
              height: 12,
              borderRadius: 8,
              background: "#059669",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>
            <span style={{ color: "#0F172A" }}>Actually</span>
            <span style={{ color: "#059669", marginLeft: 16 }}>Deals</span>
          </div>
          <div style={{ color: "#64748B", fontSize: 28, marginTop: 8 }}>
            Human-edited deals. Community-checked.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
