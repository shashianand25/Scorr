import Link from "next/link";

export default function Home() {
  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", padding: "2rem 1rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "340px", background: "#10142a", borderRadius: "32px", padding: "16px 16px 18px", boxSizing: "border-box", fontFamily: "var(--font-inter, var(--font-sans))" }}>
        
        {/* Search & Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "11px 14px" }}>
            <i className="ti ti-search" style={{ fontSize: "17px", color: "#777d99" }} aria-hidden="true"></i>
            <span style={{ fontSize: "14px", color: "#777d99" }}>Search</span>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9298b3", flexShrink: 0 }}>
            <i className="ti ti-user" style={{ fontSize: "18px" }} aria-hidden="true"></i>
          </div>
        </div>

        {/* Filters */}
        <div className="scrollbar-hide" style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto" }}>
          <span style={{ background: "#8b8ff0", color: "#1a1640", fontSize: "13px", fontWeight: 500, padding: "8px 14px", borderRadius: "18px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
            All <span style={{ background: "rgba(26,22,64,0.25)", padding: "1px 7px", borderRadius: "10px", fontSize: "11px" }}>5</span>
          </span>
          <span style={{ border: "0.5px solid rgba(255,255,255,0.14)", color: "#c4c7da", fontSize: "13px", padding: "8px 14px", borderRadius: "18px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
            In progress <span style={{ background: "rgba(255,255,255,0.08)", padding: "1px 7px", borderRadius: "10px", fontSize: "11px" }}>4</span>
          </span>
          <span style={{ border: "0.5px solid rgba(255,255,255,0.14)", color: "#c4c7da", fontSize: "13px", padding: "8px 14px", borderRadius: "18px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
            Not started <span style={{ background: "rgba(255,255,255,0.08)", padding: "1px 7px", borderRadius: "10px", fontSize: "11px" }}>1</span>
          </span>
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
          {/* Sample Card */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #5b6080", borderRadius: "0 14px 14px 0", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>General knowledge — sample quiz</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "8px" }}>
                <span style={{ background: "rgba(139,143,240,0.18)", color: "#a5a8f5", fontSize: "10px", fontWeight: 500, padding: "3px 8px", borderRadius: "6px", letterSpacing: "0.03em" }}>SAMPLE</span>
                <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "#5b6080" }} aria-hidden="true"></i>
              </div>
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-help-circle" style={{ fontSize: "14px" }} aria-hidden="true"></i>5 questions</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-refresh" style={{ fontSize: "14px" }} aria-hidden="true"></i>0 attempts</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-check" style={{ fontSize: "14px" }} aria-hidden="true"></i>0 correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#5b6080", minWidth: "30px" }}>Not started</span>
              <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.14)", borderRadius: "3px" }}></div>
            </div>
          </div>

          {/* Progress Card 1 */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #2dd4a7", borderRadius: "0 14px 14px 0", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>2B - internal disease - digestive</p>
              <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "#5b6080" }} aria-hidden="true"></i>
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-help-circle" style={{ fontSize: "14px" }} aria-hidden="true"></i>182 questions</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-refresh" style={{ fontSize: "14px" }} aria-hidden="true"></i>11 attempts</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-check" style={{ fontSize: "14px" }} aria-hidden="true"></i>181 correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#5fcaa5", minWidth: "30px", fontWeight: 500 }}>99%</span>
              <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}><div style={{ width: "99%", height: "100%", background: "#2dd4a7", borderRadius: "3px" }}></div></div>
            </div>
          </div>

          {/* Progress Card 2 */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #f0a13c", borderRadius: "0 14px 14px 0", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>12A TXT</p>
              <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "#5b6080" }} aria-hidden="true"></i>
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-help-circle" style={{ fontSize: "14px" }} aria-hidden="true"></i>450 questions</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-refresh" style={{ fontSize: "14px" }} aria-hidden="true"></i>31 attempts</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-check" style={{ fontSize: "14px" }} aria-hidden="true"></i>104 correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#f0a13c", minWidth: "30px", fontWeight: 500 }}>23%</span>
              <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}><div style={{ width: "23%", height: "100%", background: "#f0a13c", borderRadius: "3px" }}></div></div>
            </div>
          </div>

          {/* Progress Card 3 */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #f0a13c", borderRadius: "0 14px 14px 0", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>2B - path-physiology - digestive</p>
              <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "#5b6080" }} aria-hidden="true"></i>
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-help-circle" style={{ fontSize: "14px" }} aria-hidden="true"></i>90 questions</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-refresh" style={{ fontSize: "14px" }} aria-hidden="true"></i>3 attempts</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-check" style={{ fontSize: "14px" }} aria-hidden="true"></i>7 correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#f0a13c", minWidth: "30px", fontWeight: 500 }}>8%</span>
              <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}><div style={{ width: "8%", height: "100%", background: "#f0a13c", borderRadius: "3px" }}></div></div>
            </div>
          </div>
        </div>

        {/* Fab & Bottom Item */}
        <div style={{ position: "relative", paddingBottom: "8px" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", borderLeft: "3px solid #f0a13c", borderRadius: "0 14px 14px 0", padding: "14px 16px", paddingRight: "60px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#fff" }}>pharma correct answer GIT (1)</p>
              <i className="ti ti-chevron-right" style={{ fontSize: "16px", color: "#5b6080" }} aria-hidden="true"></i>
            </div>
            <div style={{ display: "flex", gap: "16px", marginBottom: "10px" }}>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-help-circle" style={{ fontSize: "14px" }} aria-hidden="true"></i>91 questions</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-refresh" style={{ fontSize: "14px" }} aria-hidden="true"></i>2 attempts</span>
              <span style={{ fontSize: "12px", color: "#777d99", display: "flex", alignItems: "center", gap: "4px" }}><i className="ti ti-check" style={{ fontSize: "14px" }} aria-hidden="true"></i>19 correct</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#f0a13c", minWidth: "30px", fontWeight: 500 }}>21%</span>
              <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}><div style={{ width: "21%", height: "100%", background: "#f0a13c", borderRadius: "3px" }}></div></div>
            </div>
          </div>
          <div style={{ position: "absolute", right: "8px", bottom: "18px", width: "48px", height: "48px", borderRadius: "50%", background: "#8b8ff0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(139,143,240,0.4)" }}>
            <i className="ti ti-plus" style={{ fontSize: "22px", color: "#1a1640" }} aria-hidden="true"></i>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", paddingTop: "16px", marginTop: "18px", borderTop: "0.5px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", color: "#8b8ff0", textDecoration: "none" }}>
            <i className="ti ti-home" style={{ fontSize: "19px" }} aria-hidden="true"></i><span style={{ fontSize: "10px" }}>Home</span>
          </Link>
          <Link href="/battle" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", color: "#777d99", textDecoration: "none" }}>
            <i className="ti ti-swords" style={{ fontSize: "19px" }} aria-hidden="true"></i><span style={{ fontSize: "10px" }}>Battle</span>
          </Link>
          <Link href="/statistics" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", color: "#777d99", textDecoration: "none" }}>
            <i className="ti ti-chart-bar" style={{ fontSize: "19px" }} aria-hidden="true"></i><span style={{ fontSize: "10px" }}>Statistics</span>
          </Link>
          <Link href="/profile" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", color: "#777d99", textDecoration: "none" }}>
            <i className="ti ti-user" style={{ fontSize: "19px" }} aria-hidden="true"></i><span style={{ fontSize: "10px" }}>Profile</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
