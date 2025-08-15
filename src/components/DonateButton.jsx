import { useState } from "react";
import "../styles/styles.css"; // make sure to import the CSS file
import venmo from "../assets/venmolarger.png";
import cashapp from "../assets/cashapplarger.png";

const venmoLink = "https://venmo.com/tyler-chambers-29";
const cashAppLink = "https://cash.app/$Tylerchambers92";

const DonationButton = ({ buttonText = "Show Info", content }) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopup = () => setIsOpen(prev => !prev);

  return (
    <>
      <button className="donate-button" onClick={togglePopup}>
        Donate ❤️
      </button>

      {isOpen && (
        <div className="popup-overlay">
          <div className="popup-box">
            <div className="popup-header">
              <h2 className="popup-title">Donate:</h2>
              <button className="close-button" onClick={togglePopup}>
                &times;
              </button>
            </div>
            <div className="popup-content">
                <p className="legend-text">We appreciate any and all donations. Click either the venmo or cash app buttons below to donate!</p>
                <div className="center-items">
                    <a className="venmo-icon" href={venmoLink} target="_blank" rel="noopener noreferrer">
                        <img className="donation-icons"
                        src={venmo}
                        alt="Venmo"
                        />
                    </a>
                    <a className="venmo-icon" href={cashAppLink} target="_blank" rel="noopener noreferrer">
                        <img className="donation-icons"
                        src={cashapp}
                        alt="Cash App"
                        />
                    </a>
                </div>
            </div>
            <div className="popup-footer">
              <button className="close-button-footer" onClick={togglePopup}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DonationButton;