import React, { useState } from 'react';
import AudioRecorder from './components/AudioRecorder.jsx';
import MultiTrack from './components/MultiTrack.jsx';
import "./styles/styles.css"

function App() {
  
  return (
    <div>
      <div className='multi-track-body'>
        <MultiTrack /> 
      </div>
    </div>
  );
}

export default App;
