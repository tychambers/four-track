import { useRef, useState, useEffect, useMemo } from 'react';
import AudioRecorder from './AudioRecorder';
import "../styles/styles.css"
import playButtonWhite from "../assets/white-play-button.png"
import playButtonGreen from "../assets/green-play-button.png"
import stopButtonWhite from "../assets/white-stop.png"
import stopButtonRed from "../assets/red-stop.png"
import pauseButtonWhite from "../assets/pause-button-white.png"
import ExportPopup from './ExportAudioBox';

const MultiTrackPlayer = () => {
  const [formattedTime, setFormattedTime] = useState('0:00');
  const [currentTime, setCurrentTime] = useState('0:00');
  const [currentNewTime, setNewCurrentTime] = useState(0);

  const recorderRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [isRecording, setIsRecording] = useState(false);
  const handleRecordingChange = (recording) => {
    setIsRecording(recording);
  };

  const handleRecordingTimeUpdate = (seconds) => {
    setNewCurrentTime(seconds);
  };

  const [tracks, setTracks] = useState([
    { audioBuffer: null, url: "" },
    { audioBuffer: null, url: "" },
    { audioBuffer: null, url: "" },
    { audioBuffer: null, url: "" },
  ]);

  const maxDuration = useMemo(() => {
    return Math.max(
      ...tracks.map((t) => (t.audioBuffer ? t.audioBuffer.duration : 0))
    );
  }, [tracks]);

  const handleUpdateRecording = (index, audioBuffer, url) => {
    setTracks((prevTracks) => {
      const newTracks = [...prevTracks];
      newTracks[index] = { audioBuffer, url };
      return newTracks;
    });
  };

  const isSyncing = useRef(false);
  const handleSeek = (index) => (progress) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    recorderRefs.forEach((ref, i) => {
      if (i !== index && ref.current) {
        ref.current.seekTo(progress);
      }
    });
    setTimeout(() => {
      isSyncing.current = false;
    }, 20);
  };

  const convertSecondsToMinutesAndSeconds = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  useEffect(() => {
    setFormattedTime(convertSecondsToMinutesAndSeconds(maxDuration));
  }, [maxDuration]);

  const playAll = () => {
    setPlayButtonIsClicked(true);
    recorderRefs.forEach(ref => ref.current?.play());
  };
  const stopAll = () => {
    setPlayButtonIsClicked(false);
    setPlayButtonImage(playButtonWhite);
    recorderRefs.forEach(ref => ref.current?.stop());
  };
  const pauseAll = () => {
    setPlayButtonIsClicked(false);
    setPlayButtonImage(playButtonWhite);
    recorderRefs.forEach(ref => ref.current?.pause());
  };

  const clearTrack = (index) => {
    setTracks(prev =>
      prev.map((t, i) =>
        i === index ? { ...t, audioBuffer: null, url: "" } : t
      )
    );
  };

  const clearAllTracks = () => {
    setTracks(prev =>
      prev.map(t => ({ ...t, audioBuffer: null, url: "" }))
    );
  };

  // WAV export helper
  const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);

    const channels = [];
    let sampleRate = buffer.sampleRate;
    let offset = 0;
    let pos = 0;

    // write WAV header
    const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };

    // RIFF chunk descriptor
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // fmt sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // PCM
    setUint16(1); // linear quantization
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * numOfChan * 2); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    // data sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    // write interleaved data
    for (let i = 0; i < numOfChan; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
      offset++;
    }

    return bufferArray;
  };

  const exportAllTracks = (trackTitle) => {
    console.log("Track title:", trackTitle);
    console.log("Type of title:", typeof trackTitle);
    const audioCtx = new AudioContext();

    const buffers = tracks
      .filter(t => t.audioBuffer)
      .map(t => t.audioBuffer);

    if (buffers.length === 0) {
      alert("No recordings to export.");
      return;
    }

    const maxLength = Math.max(...buffers.map(b => b.length));

    const masterBuffer = audioCtx.createBuffer(
      2,
      maxLength,
      audioCtx.sampleRate
    );

    // mix
    buffers.forEach(buffer => {
      for (let channel = 0; channel < masterBuffer.numberOfChannels; channel++) {
        const channelData = masterBuffer.getChannelData(channel);
        const bufferData = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));

        for (let i = 0; i < bufferData.length; i++) {
          channelData[i] += bufferData[i];
        }
      }
    });

    // normalize
    for (let channel = 0; channel < masterBuffer.numberOfChannels; channel++) {
      const channelData = masterBuffer.getChannelData(channel);
      let maxAmp = 0;
      for (let i = 0; i < channelData.length; i++) {
        maxAmp = Math.max(maxAmp, Math.abs(channelData[i]));
      }
      if (maxAmp > 1) {
        for (let i = 0; i < channelData.length; i++) {
          channelData[i] /= maxAmp;
        }
      }
    }

    const wavData = audioBufferToWav(masterBuffer);
    const blob = new Blob([new DataView(wavData)], { type: 'audio/wav' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = String(trackTitle).replace(/[^a-z0-9]/gi, "_"); // sanitize filename
    const fileName = `${safeTitle}.wav`;

    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // for handling button animations on the tool bar

  const [playButtonImage, setPlayButtonImage] = useState(playButtonWhite);
  const [playButtonIsClicked, setPlayButtonIsClicked] = useState(false);

  const handlePlayButtonMouseEnter = () => {
    setPlayButtonImage(playButtonGreen);
  };

  const handlePlayButtonMouseLeave = () => {
    if (playButtonIsClicked) {
      return;} else {
    setPlayButtonImage(playButtonWhite);}
  };

  // stop button

  const [stopButtonImage, setStopButtonImage] = useState(stopButtonWhite);

  const handleStopButtonMouseEnter = () => {
    setStopButtonImage(stopButtonRed);
  };

  const handleStopButtonMouseLeave = () => {
    setStopButtonImage(stopButtonWhite);
  };

  return (
    <div className='four-track-page'>
      <div className='sour-gummy-title'>Four Track</div>
      <div className='daw-body'>
        {recorderRefs.map((ref, index) => (
          <AudioRecorder
            key={index}
            ref={ref}
            trackNumber={index + 1}
            triggerPlayAll={playAll}
            triggerPauseAll={pauseAll}
            triggerStopAll={stopAll}
            onSeek={handleSeek(index)}
            clearTrack={() => clearTrack(index)}
            onTimeUpdate={(time) => setCurrentTime(time)}
            onRecordingTimeUpdate={handleRecordingTimeUpdate}
            maxDuration={maxDuration}
            isRecordingChange={handleRecordingChange}
            onUpdateRecording={(audioBuffer, url) =>
              handleUpdateRecording(index, audioBuffer, url)
            }
          />
        ))}
      </div>
      <div className='bottom-space'/>
      <div className='master-tool-bar dark1'>
        <button 
          className="tool-bar-button"
          onClick={playAll}
          onMouseEnter={handlePlayButtonMouseEnter}
          onMouseLeave={handlePlayButtonMouseLeave}
          ><img className="icon-button" src={playButtonImage} /></button>
        <button  className='tool-bar-button' onClick={pauseAll}><img className='icon-button' src={pauseButtonWhite} /></button>
        <button 
          className="tool-bar-button"
          onClick={stopAll}
          onMouseEnter={handleStopButtonMouseEnter}
          onMouseLeave={handleStopButtonMouseLeave}
          ><img className="icon-button" src={stopButtonImage} /></button>
        {/* <button onClick={clearAllTracks}>Clear All</button> */}
        <div className='time-tracker'>
          {isRecording ? currentNewTime : currentTime}/{formattedTime}
        </div>
        <ExportPopup
          onExport={exportAllTracks}
        />
      </div>
    </div>
  );
};

export default MultiTrackPlayer;