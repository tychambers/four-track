import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useWavesurfer } from '@wavesurfer/react'
import WaveSurfer from 'wavesurfer.js';
import whiteRecordButton from '../assets/white-record.png'
import redRecordButton from '../assets/red-record.png'
import playButtonWhite from "../assets/white-play-button.png"
import playButtonGreen from "../assets/green-play-button.png"
import pauseButtonWhite from "../assets/pause-button-white.png"
import stopButtonWhite from "../assets/white-stop.png"
import trashBin from "../assets/trash-bin.png"

const AudioRecorder = forwardRef(({ triggerPlayAll, triggerStopAll, trackNumber, onPositionUpdate, onRecordingTimeUpdate, isRecordingChange, clearTrack, onSeek, maxDuration, onUpdateRecording, onTimeUpdate, onRawTimeUpdate, currentRawTime }, ref) => {

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const [isRecording, setIsRecording] = useState(false);
    const [recordedUrl, setRecordedUrl] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);

    const waveformRef = useRef(null);
    const wavesurferInstance = useRef(null);
    const clickPosition = useRef(null);

    const [volume, setVolume] = useState(0.5)

    // for tracking recording time

    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const timerRef = useRef(null);

    // for overdub

    const recordingStartOffsetRef = useRef(0);

    // for converting time for parent time counter
    const convertSecondsToMinutesAndSeconds = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.round(totalSeconds % 60);

        // Optional: Add leading zeros for single-digit seconds
        const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

        return `${minutes}:${formattedSeconds}`;
    };

    // init the wave surfer 

    const initWaveSurfer = () => {
        wavesurferInstance.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: 'lightsalmon',
            progressColor: 'lightgrey',
            // minPxPerSec: 50,
            height: 'auto',
            url: recordedUrl,
            fillParent: true,
            interact: true
        });

        wavesurferInstance.current.on('click', (progress) => {
            // for overdub
            const duration = wavesurferInstance.current.getDuration();
            console.log("duration: ", duration);

            const seekTime = progress * duration;
            recordingStartOffsetRef.current = seekTime; // store for punch-in
            clickPosition.current = progress;
            if (onSeek) onSeek(progress);

            if (onRawTimeUpdate) {
                onRawTimeUpdate(seekTime);
            }

            if (onPositionUpdate) {
                const position = wavesurferInstance.current.getCurrentTime() / wavesurferInstance.current.getDuration();
                onPositionUpdate(position);
            }
        });

        wavesurferInstance.current.on("audioprocess", () => {
            const time = wavesurferInstance.current.getCurrentTime();
            recordingStartOffsetRef.current = time;

            // for padding silence before
            if (onRawTimeUpdate) {
                onRawTimeUpdate(time);
            }

            if (onPositionUpdate) {
                const position = wavesurferInstance.current.getCurrentTime() / wavesurferInstance.current.getDuration();
                onPositionUpdate(position);
            }
        });


        wavesurferInstance.current.on('play', () => setIsPlaying(true));
        wavesurferInstance.current.on('pause', () => {
            setIsPlaying(false);
            recordingStartOffsetRef.current = wavesurferInstance.current.getCurrentTime();
        });
        wavesurferInstance.current.on('finish', () => 
            setIsPlaying(false));
    };


    useEffect(() => {
       initWaveSurfer();

        if (recordedUrl) {
            console.log("loading wave surfer");
        wavesurferInstance.current.load(recordedUrl);
        } else {
            wavesurferInstance.current.empty(); // explicitly clear waveform
        }

        
        return () => {
        wavesurferInstance.current?.destroy();
        wavesurferInstance.current = null;
        };

     }, [recordedUrl]);


     // appears to be a duplicate
    useEffect(() => {
        if (wavesurferInstance.current && recordedUrl) {
            console.log("loading wave surfer 2");
            wavesurferInstance.current.load(recordedUrl);
        }
        }, [recordedUrl]);

   useEffect(() => {
        if (wavesurferInstance.current) {
            wavesurferInstance.current.setVolume(volume);
        }
    }, [wavesurferInstance.current, volume]); // Update volume when wavesurfer or volume state changes

    useImperativeHandle(ref, () => ({
        play: () => wavesurferInstance.current?.play(),
        stop: () => {
            wavesurferInstance.current?.stop();
            wavesurferInstance.current.seekTo(0);
        },
        pause: () => wavesurferInstance.current?.pause(),
        playPause: () => wavesurferInstance.current?.playPause(),
        isPlaying: () => isPlaying,
        seekTo: (progress) => {
            wavesurferInstance.current.seekTo(progress);
        },
        getWavesurfer: () => wavesurferInstance.current,
    }));

    const handleVolumeChange = (event) => {
        setVolume(parseFloat(event.target.value));
    };

    const onPlay = () => {
        wavesurferInstance.current.play()
    }

    const onPause = () => {
        wavesurferInstance.current.pause();
    }
    // for conversion and adding padding

    function audioBufferToWav(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;

        const samples = audioBuffer.length;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;

        // Create buffer for WAV header + PCM data
        const buffer = new ArrayBuffer(44 + samples * blockAlign);
        const view = new DataView(buffer);

        let offset = 0;

        function writeString(str) {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset++, str.charCodeAt(i));
            }
        }

        function writeUint32(val) {
            view.setUint32(offset, val, true);
            offset += 4;
        }

        function writeUint16(val) {
            view.setUint16(offset, val, true);
            offset += 2;
        }

        // RIFF chunk descriptor
        writeString('RIFF');
        writeUint32(36 + samples * blockAlign); // file size - 8
        writeString('WAVE');

        // fmt sub-chunk
        writeString('fmt ');
        writeUint32(16); // Subchunk1Size for PCM
        writeUint16(format);
        writeUint16(numChannels);
        writeUint32(sampleRate);
        writeUint32(byteRate);
        writeUint16(blockAlign);
        writeUint16(bitDepth);

        // data sub-chunk
        writeString('data');
        writeUint32(samples * blockAlign);

        // Write PCM samples
        const interleaved = interleave(audioBuffer);
        let idx = 0;
        for (let i = 0; i < interleaved.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, interleaved[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        return buffer;
    }

    function interleave(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numChannels;
        const result = new Float32Array(length);

        let offset = 0;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                result[offset++] = audioBuffer.getChannelData(channel)[i];
            }
        }
        return result;
    }


    function extendAudioBuffer(audioBuffer, targetDuration, audioCtx) {
        const targetLength = Math.ceil(targetDuration * audioBuffer.sampleRate);
        const newBuffer = audioCtx.createBuffer(
            audioBuffer.numberOfChannels,
            targetLength,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = newBuffer.getChannelData(channel);
            channelData.set(audioBuffer.getChannelData(channel), 0); // Copy original
            // Remaining samples stay at 0 → silence
        }

        return newBuffer;
    }

    function audioBufferToWavBlob(audioBuffer) {
        const wavArrayBuffer = audioBufferToWav(audioBuffer); 
        return new Blob([wavArrayBuffer], { type: 'audio/wav' });
    }

    // add silence padding to the beginning

    function addSilencePadding(audioBuffer, paddingSeconds, audioCtx) {
        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;

        // Number of samples for the padding
        const paddingLength = Math.floor(paddingSeconds * sampleRate);

        // New buffer length = padding + original audio
        const newBuffer = audioCtx.createBuffer(
            numChannels,
            audioBuffer.length + paddingLength,
            sampleRate
        );

        for (let ch = 0; ch < numChannels; ch++) {
            const newData = newBuffer.getChannelData(ch);
            const originalData = audioBuffer.getChannelData(ch);

            // Fill padding with 0 (silence) automatically by default
            // Copy original audio after the padding
            newData.set(originalData, paddingLength);
        }

        return newBuffer;
    }
    
    // For recording button

    const startRecording = async () => {
        // Mute track during recording
        wavesurferInstance.current.setVolume(0);

        const offset = recordingStartOffsetRef.current || 0;
        const position = wavesurferInstance.current.getCurrentTime() / wavesurferInstance.current.getDuration();
        const currentDuration = position * maxDuration;
        console.log("this is relative pos", position * maxDuration);
        console.log("raw time from recording ", currentRawTime)
        const paddingDuration = Math.max(0, currentDuration - offset); // silence before recording if needed

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
            // try {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioCtx = new AudioContext();
                const recordedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    

                // If we need pre-padding silence, create a buffer for it
                let finalBuffer = recordedBuffer;
                if (paddingDuration > 0) {
                    const paddingBuffer = audioCtx.createBuffer(
                        recordedBuffer.numberOfChannels,
                        Math.floor(paddingDuration * recordedBuffer.sampleRate),
                        recordedBuffer.sampleRate
                    );

                    // Merge silence + recorded audio
                    finalBuffer = audioCtx.createBuffer(
                        recordedBuffer.numberOfChannels,
                        paddingBuffer.length + recordedBuffer.length,
                        recordedBuffer.sampleRate
                    );

                    for (let ch = 0; ch < recordedBuffer.numberOfChannels; ch++) {
                        const channelData = finalBuffer.getChannelData(ch);
                        // 1️⃣ Copy silence first
                        channelData.set(paddingBuffer.getChannelData(0), 0);
                        // 2️⃣ Copy recorded audio after silence
                        channelData.set(recordedBuffer.getChannelData(ch), paddingBuffer.length);
                    }
                }

                // Adjust punch-in offset to include the padding
                const effectiveOffset = offset + paddingDuration;

                // Merge with existing audio if any (overdub/punch-in)
                let existingBuffer = null;
                if (recordedUrl) {
                    try {
                        const existingArrayBuffer = await (await fetch(recordedUrl)).arrayBuffer();
                        existingBuffer = await audioCtx.decodeAudioData(existingArrayBuffer);
                    } catch {
                        console.log("I found the error");
                    }
                }

                const mergedBuffer = replaceAudioWithOffset(existingBuffer, finalBuffer, effectiveOffset, audioCtx);

                // Ensure full duration if maxDuration is set
                let finalMergedBuffer = mergedBuffer;
                if (maxDuration && mergedBuffer.duration < maxDuration) {
                    finalMergedBuffer = extendAudioBuffer(mergedBuffer, maxDuration, audioCtx);
                }

                const wavBlob = audioBufferToWavBlob(finalMergedBuffer);
                const url = URL.createObjectURL(wavBlob);
                setRecordedUrl(url);
                wavesurferInstance.current.load(url);

                if (onUpdateRecording) onUpdateRecording(finalMergedBuffer, url);
            // } catch {
            //     console.log("error caught")
            // }
        };

        // Start recording timer
        timerRef.current = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000);

        isRecordingChange(true);
        mediaRecorderRef.current.start();
        setIsRecording(true);

        if (triggerPlayAll) triggerPlayAll();
    };



    // Whenever maxDuration changes from parent, update recording if needed
    useEffect(() => {
      if (!maxDuration || !recordedUrl) return;
      const audioCtx = new AudioContext();

      (async () => {
        try {
            const response = await fetch(recordedUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

            if (audioBuffer.duration < maxDuration) {
                const paddedBuffer = extendAudioBuffer(audioBuffer, maxDuration, audioCtx);
                const wavBlob = audioBufferToWavBlob(paddedBuffer);
                const newUrl = URL.createObjectURL(wavBlob);
                setRecordedUrl(newUrl);
                if (onUpdateRecording) {
                    onUpdateRecording(paddedBuffer, newUrl);
                }
            }
        } catch {
            console.log("error")
        }
        
      })();
    }, [maxDuration]);

    useEffect(() => {
        if (onRecordingTimeUpdate) {
            let convertedTime = convertSecondsToMinutesAndSeconds(recordingSeconds)
            onRecordingTimeUpdate(convertedTime);
        }
    }, [recordingSeconds]);

    const stopRecording = () => {
        

        if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false); 
        }

        // for updating recording timer
        const stopTimer = () => {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setRecordingSeconds(0);
        };
        stopTimer();
        isRecordingChange(false);

        if (triggerStopAll) triggerStopAll();
    }

    const clearRecording = () => {
        wavesurferInstance.current?.destroy();
        wavesurferInstance.current = null;
        setRecordedUrl('');
        clearTrack();
        onPositionUpdate(0);
        // onTimeUpdate('0:00');
        // initWaveSurfer();
    };

    const stopbutton = () => {
        wavesurferInstance.current.stop();
        onPositionUpdate(0);
    }

    // for overdub

    function replaceAudioWithOffset(baseBuffer, newBuffer, offsetSeconds, audioCtx) {
        if (!baseBuffer) return newBuffer; // no existing audio, just return the new one

        const sampleRate = baseBuffer.sampleRate;
        const numChannels = baseBuffer.numberOfChannels;
        const offsetSamples = Math.floor(offsetSeconds * sampleRate);

        // Calculate final length (whichever is longer)
        const totalLength = Math.max(
            baseBuffer.length,
            offsetSamples + newBuffer.length
        ) + 1;

        const output = audioCtx.createBuffer(numChannels, totalLength, sampleRate);

        for (let ch = 0; ch < numChannels; ch++) {
            const outData = output.getChannelData(ch);
            const baseData = baseBuffer.getChannelData(ch);
            const newData = newBuffer.getChannelData(ch);

            // 1️⃣ Copy old audio before punch-in
            outData.set(baseData.subarray(0, offsetSamples), 0);

            // 2️⃣ Overwrite with new audio starting at offset
            outData.set(newData, offsetSamples);

            // 3️⃣ Copy the rest of old audio after the new audio ends
            const afterNewAudioStart = offsetSamples + newData.length;
            if (afterNewAudioStart < baseBuffer.length) {
                outData.set(baseData.subarray(afterNewAudioStart), afterNewAudioStart);
            }
        }

        return output;
        }

    return (
        <div className='audio-track-body'>
            <div className='track-tool-bar dark2'>
                <button className='track-tool-bar-button no-highlight-button' disabled={true}>Track {trackNumber}</button>
                <button className='record-button track-tool-bar-button' onClick={isRecording ? stopRecording : startRecording}>{isRecording ? <img  className='track-tool-bar-icon' src={redRecordButton} /> : <img className='track-tool-bar-icon' src={whiteRecordButton} />}</button>
                <button className='track-tool-bar-button' onClick={onPlay}>
                    <img className='track-tool-bar-icon' src={playButtonWhite} />
                </button>
                <button className='track-tool-bar-button' onClick={onPause}>
                    <img className='track-tool-bar-icon' src={pauseButtonWhite} />
                </button>
                <button onClick={stopbutton} className='track-tool-bar-button'><img className='track-tool-bar-icon' src={stopButtonWhite} /></button>
                <input className='volume-button track-tool-bar-button'
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                />
                <button className='clear-button track-tool-bar-button' onClick={clearRecording}><img className='track-tool-bar-icon' alt='delete track' src={trashBin} /></button>
            </div>
            <div className='track-body dark3' ref={waveformRef}/>
        </div>
    )
});

export default AudioRecorder;