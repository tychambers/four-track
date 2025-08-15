import { useRef, useState, useEffect, useMemo } from 'react';
import AudioRecorder from './AudioRecorder';
import "../styles/styles.css"
import playButtonWhite from "../assets/white-play-button.png"
import playButtonGreen from "../assets/green-play-button.png"
import stopButtonWhite from "../assets/white-stop.png"
import stopButtonRed from "../assets/red-stop.png"
import pauseButtonWhite from "../assets/pause-button-white.png"
import ExportPopup from './ExportAudioBox';
import DonationButton from './DonateButton';
import LegendButton from './LegendButton';

const MultiTrackPlayer = () => {
  const [formattedTime, setFormattedTime] = useState('0:00');
  // 3 times
  //for recording timer sync
  const [currentNewTime, setNewCurrentTime] = useState(0);
  // for padding silence before recordings
  const [currentRawTime, setCurrentRawTime] = useState(0);
  // for current position
  const [currentPosition, setCurrentPosition] = useState(0);
  // 
  const [currentTestTime, setCurrentTestTime] = useState("0:00");

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

  const handleUpdateRecording = (index, audioBuffer, url, wavesurferInstance) => {
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      newTracks[index] = { audioBuffer, url, wavesurfer: wavesurferInstance };
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

  // function for converting maxDuration to a time format like 0:05
  const convertSecondsToMinutesAndSeconds = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  useEffect(() => {
    setFormattedTime(convertSecondsToMinutesAndSeconds(maxDuration));
  }, [maxDuration]);

  useEffect(() => {
    setCurrentTestTime(convertSecondsToMinutesAndSeconds(currentPosition * maxDuration));
  }, [currentPosition])

  const timerRef = useRef(null);

  const playAll = () => {
    setPlayButtonIsClicked(true);
    recorderRefs.forEach(ref => ref.current?.play());

      // Clear any old timer
    if (timerRef.current) clearInterval(timerRef.current);

    let secondsElapsed = 0;

    // Start a 1-second interval timer
    timerRef.current = setInterval(() => {
      secondsElapsed += 1;
      setCurrentTestTime(convertSecondsToMinutesAndSeconds(secondsElapsed));
      const roundedMaxDuration = Math.round(maxDuration);
      if (secondsElapsed >= roundedMaxDuration) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 1000);
  };

  const stopAll = () => {
    setPlayButtonIsClicked(false);
    setPlayButtonImage(playButtonWhite);
    recorderRefs.forEach(ref => ref.current?.stop());
    setCurrentTestTime("0:00");

     if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const pauseAll = () => {
    setPlayButtonIsClicked(false);
    setPlayButtonImage(playButtonWhite);
    recorderRefs.forEach(ref => ref.current?.pause());

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
  const audioCtx = new AudioContext();

  // Collect buffers and volumes
  const buffersWithVolume = tracks
    .map((t, index) => {
      const wsInstance = recorderRefs[index].current?.getWavesurfer();
      return t.audioBuffer
        ? { buffer: t.audioBuffer, volume: wsInstance?.getVolume() ?? 1 }
        : null;
    })
    .filter(Boolean);

  if (!buffersWithVolume.length) {
    alert("No recordings to export.");
    return;
  }

  // Determine maximum channels and length
  const maxChannels = Math.max(...buffersWithVolume.map(t => t.buffer.numberOfChannels));
  const maxLength = Math.max(...buffersWithVolume.map(t => t.buffer.length));

  const masterBuffer = audioCtx.createBuffer(maxChannels, maxLength, audioCtx.sampleRate);

  // Mix each track into master buffer with volume applied
  buffersWithVolume.forEach(({ buffer, volume }) => {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const masterData = masterBuffer.getChannelData(ch);
      const bufferData = buffer.getChannelData(ch);

      for (let i = 0; i < bufferData.length; i++) {
        masterData[i] += bufferData[i] * volume;
      }
    }
  });

  // Normalize all channels
  for (let ch = 0; ch < masterBuffer.numberOfChannels; ch++) {
    const channelData = masterBuffer.getChannelData(ch);
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

  // Convert to WAV and download
  const wavData = audioBufferToWav(masterBuffer);
  const blob = new Blob([new DataView(wavData)], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const safeTitle = String(trackTitle).replace(/[^a-z0-9]/gi, "_");
  a.href = url;
  a.download = `${safeTitle}.wav`;
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
      <div className='title-tool-bar'>
        <div className='sour-gummy-title'>Four Track</div>
        <LegendButton />
        <DonationButton />
        {/* <button className='donate-button'>DONATE!</button> */}
      </div>
      <div className='top-space' />
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
            onPositionUpdate={(position) => setCurrentPosition(position)}
            onRecordingTimeUpdate={handleRecordingTimeUpdate}
            maxDuration={maxDuration}
            currentRawTime={currentRawTime}
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
          {isRecording ? currentNewTime : currentTestTime}/{formattedTime}
        </div>
        <ExportPopup
          onExport={exportAllTracks}
        />
      </div>
    </div>
  );
};

export default MultiTrackPlayer;