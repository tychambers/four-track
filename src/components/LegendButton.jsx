import { useState } from "react";
import "../styles/styles.css"; // make sure to import the CSS file
import whiteRecordButton from '../assets/white-record.png'
import redRecordButton from '../assets/red-record.png'
import playButtonWhite from "../assets/white-play-button.png"
import playButtonGreen from "../assets/green-play-button.png"
import pauseButtonWhite from "../assets/pause-button-white.png"
import stopButtonWhite from "../assets/white-stop.png"
import trashBin from "../assets/trash-bin.png"

const LegendButton = ({ buttonText = "Show Info", content }) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopup = () => setIsOpen(prev => !prev);

  return (
    <>
      <button className="legend-button" onClick={togglePopup}>
        Legend*
      </button>

      {isOpen && (
        <div className="popup-overlay">
          <div className="popup-box">
            <div className="popup-header">
              <h2 className="popup-title">Legend:</h2>
              <button className="close-button" onClick={togglePopup}>
                &times;
              </button>
            </div>
            <div className="popup-content">
                <p className="legend-text"><img className='track-tool-bar-icon' src={whiteRecordButton} />:  toggle recording on/off</p>
                <p className="legend-text"><img className='track-tool-bar-icon' src={playButtonWhite} />:  Play button. Bottom play buttom plays all tracks</p>
                <p className="legend-text"><img className='track-tool-bar-icon' src={stopButtonWhite} />:  Stop Button. Bottom stop button stops all tracks</p>
                <p className="legend-text"><img className='track-tool-bar-icon' src={pauseButtonWhite} />:  Pause Button. Bottom stop button stops all tracks</p>
                <p className="legend-text"><img className='track-tool-bar-icon' src={trashBin} />:  The trash icon deletes the current track.</p>
                <p className="legend-text">Volume input: adjustable bar for volume</p>
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

export default LegendButton;