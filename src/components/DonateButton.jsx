import React, { useState } from "react";
import venmo from "../assets/venmolarger.png";
import cashapp from "../assets/cashapplarger.png";

export default function DonationButton() {
  const [showModal, setShowModal] = useState(false);

  // Replace with your actual payment links
  const venmoLink = "https://venmo.com/tyler-chambers-29";
  const cashAppLink = "https://cash.app/$Tylerchambers92";
  const zelleLink = "mailto:yourzelleemail@example.com"; // Zelle is usually email/phone

  return (
    <>
      {/* Donation Button */}
      <button
        onClick={() => setShowModal(true)}
        className="donate-button"
      >
        Donate ❤️
      </button>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)} // close on background click
        >
          <div
            style={{
                border: "2px solid #ECDFCC",
                borderRadius: "12px",
                padding: "20px",
                minWidth: "300px",
                textAlign: "center",
                background: "#3C3D37",
                color: "#ECDFCC",
            }}
            onClick={(e) => e.stopPropagation()} // prevent close on modal click
          >
            <h2 className="popup-title">Choose A Donation Method:</h2>
            <p>We greatly appreciate any and all donations!</p>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px" }}>
              
              {/* Venmo */}
              <a href={venmoLink} target="_blank" rel="noopener noreferrer">
                <img className="donation-icons"
                  src={venmo}
                  alt="Venmo"
                />
              </a>

              {/* Cash App */}
              <a href={cashAppLink} target="_blank" rel="noopener noreferrer">
                <img className="donation-icons"
                  src={cashapp}
                  alt="Cash App"
                />
              </a>
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                marginTop: "20px",
                padding: "8px 16px",
                background: "#ccc",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
