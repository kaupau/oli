# StrudelVibe Development Notes

## Web Audio API Considerations

Reference: https://webaudio.github.io/web-audio-api/

### Current Stack
- Using Tone.js which is a wrapper around Web Audio API
- Tone.js handles: scheduling, transport, effects, sample loading

### Potential Web Audio API Direct Use Cases

1. **Better Visualization**
   - Use `AnalyserNode` directly for more control over FFT
   - `getByteFrequencyData()` / `getFloatFrequencyData()` for spectrum
   - `getByteTimeDomainData()` for waveform
   - Could connect to Strudel's output if we integrate it properly

2. **Real Strudel Integration**
   - Strudel uses Web Audio API via `superdough`
   - Could intercept/tap into their audio graph for visualization
   - Their `webaudioOutput` connects to `AudioContext.destination`
   - We'd need to insert our analyser nodes into their chain

3. **Custom Effects**
   - `BiquadFilterNode` for filters (lpf, hpf, bandpass)
   - `ConvolverNode` for reverb
   - `DelayNode` for delays
   - `GainNode` for volume/ducking
   - `DynamicsCompressorNode` for mastering

4. **Audio Worklets** (Advanced)
   - Custom DSP in JavaScript
   - Could implement custom synthesizers
   - Real-time audio processing

### Why We Might Want Direct Web Audio
- More control over audio routing
- Better integration with Strudel's actual audio output
- Custom visualization that matches the real audio
- Potentially better performance than Tone.js for simple use cases

### Why We Stick with Tone.js for Now
- Easier API for scheduling/sequencing
- Built-in instruments and effects
- Good enough for current needs
- Less code to maintain

### TODO: Strudel Integration (Revisit)
The real fix for proper Strudel support would be:
1. Import @strudel packages correctly
2. Use their REPL to evaluate code
3. Tap into their audio graph for visualization
4. This requires understanding their internal architecture better

Strudel packages:
- @strudel/core - pattern engine
- @strudel/mini - mini-notation parser
- @strudel/webaudio - audio output
- @strudel/tonal - music theory (scales, chords)

Their GitHub: https://github.com/tidalcycles/strudel
License: AGPL-3.0

---

## File Structure Ideas for Samples

User wants AI to browse files like `ls`. Could add:
1. API endpoint to list files with tree structure
2. Give AI "tool use" to query files
3. Return metadata: duration, type classification, waveform preview

---

## Future Ideas
- [ ] Waveform preview for samples
- [ ] Sample audition (click to preview)
- [ ] BPM detection for samples
- [ ] Key detection for melodic samples
- [ ] Drag and drop samples into pattern
