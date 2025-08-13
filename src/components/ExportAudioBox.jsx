import { useState } from "react";

export default function ExportPopup({ onExport }) {
  const [showModal, setShowModal] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");

  const handleExport = () => {
    if (!trackTitle.trim()) {
      alert("Please enter a track title before exporting.");
      return;
    }
    onExport(trackTitle); // Pass track title to parent
    setShowModal(false);
    setTrackTitle(""); // Reset input
  };

  return (
    <div>
      {/* Button to open popup */}
      <button className="export-tool-bar-button" onClick={() => setShowModal(true)}>Export as WAV</button>

      {/* Popup modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center", alignItems: "center"
          }}
        >
          <div
            style={{
                border: "2px solid #ECDFCC",
                background: "#3C3D37",
                color: "#ECDFCC",
                padding: 20,
                borderRadius: 8,
                minWidth: 300,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center"
            }}
          >
            <h2>Export Audio</h2>
            <p>Enter a track title before exporting:</p>

            <input
              type="text"
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              placeholder="Track title"
              style={{
                width: "80%",
                margin: "auto",
                padding: "8px",
                marginTop: "10px",
                marginBottom: "50px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginRight: "10px"
              }}
            />

            <div>
              <button onClick={handleExport}>Yes, Export</button>
              <button onClick={() => setShowModal(false)} style={{ marginLeft: 10 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
