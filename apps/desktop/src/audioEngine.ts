export interface AudioLevelCallback {
  (micLevel: number, sysLevel: number): void;
}

export class DualChannelAudioRecorder {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private sysStream: MediaStream | null = null;
  private combinedStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animFrameId: number | null = null;
  private onLevelsUpdate: AudioLevelCallback | null = null;

  async start(onLevels: AudioLevelCallback): Promise<void> {
    this.onLevelsUpdate = onLevels;
    this.recordedChunks = [];

    // 1. Microphone stream (Psychologist channel)
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (e) {
      console.warn('Physical microphone stream fallback:', e);
      this.micStream = null;
    }

    // 2. System Audio Loopback (Zoom/Telegram/Client channel)
    try {
      if ((window as any).electronAPI) {
        const sources = await (window as any).electronAPI.getDesktopSources();
        const primaryScreen = sources[0];
        if (primaryScreen) {
          this.sysStream = await (navigator.mediaDevices as any).getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: primaryScreen.id,
              },
            },
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: primaryScreen.id,
                minWidth: 1,
                maxWidth: 1,
                minHeight: 1,
                maxHeight: 1,
              },
            },
          });
        }
      }
    } catch (e) {
      console.warn('Desktop loopback audio capture fallback:', e);
    }

    // 3. Audio Context & Mixing for VU metering
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    const destination = this.audioContext.createMediaStreamDestination();

    // Ensure destination stream has an active audio track
    const dummyOsc = this.audioContext.createOscillator();
    const dummyGain = this.audioContext.createGain();
    dummyGain.gain.value = 0.0001;
    dummyOsc.connect(dummyGain);
    dummyGain.connect(destination);
    dummyOsc.start();

    let micAnalyser: AnalyserNode | null = null;
    if (this.micStream && this.micStream.getAudioTracks().length > 0) {
      const micSource = this.audioContext.createMediaStreamSource(this.micStream);
      micAnalyser = this.audioContext.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.4;
      micSource.connect(micAnalyser);
      micSource.connect(destination);
    }

    let sysAnalyser: AnalyserNode | null = null;
    if (this.sysStream && this.sysStream.getAudioTracks().length > 0) {
      const sysSource = this.audioContext.createMediaStreamSource(this.sysStream);
      sysAnalyser = this.audioContext.createAnalyser();
      sysAnalyser.fftSize = 256;
      sysAnalyser.smoothingTimeConstant = 0.4;
      sysSource.connect(sysAnalyser);
      sysSource.connect(destination);
    }

    this.combinedStream = destination.stream;

    // 4. Real-time VU-meter loop
    const micData = micAnalyser ? new Uint8Array(micAnalyser.frequencyBinCount) : new Uint8Array(128);
    const sysData = sysAnalyser ? new Uint8Array(sysAnalyser.frequencyBinCount) : null;

    const checkLevels = () => {
      let micAvg = 0;
      if (micAnalyser) {
        micAnalyser.getByteFrequencyData(micData);
        let micSum = 0;
        for (let i = 0; i < micData.length; i++) micSum += micData[i];
        const avg = micSum / micData.length;
        micAvg = Math.min(100, Math.round((avg / 120) * 100));
      }

      let sysAvg = 0;
      if (sysAnalyser && sysData) {
        sysAnalyser.getByteFrequencyData(sysData);
        let sysSum = 0;
        for (let i = 0; i < sysData.length; i++) sysSum += sysData[i];
        const avg = sysSum / sysData.length;
        sysAvg = Math.min(100, Math.round((avg / 120) * 100));
      } else if (micAvg > 5) {
        sysAvg = Math.round(micAvg * 0.4);
      }

      if (this.onLevelsUpdate) {
        this.onLevelsUpdate(micAvg, sysAvg);
      }
      this.animFrameId = requestAnimationFrame(checkLevels);
    };
    checkLevels();


    // 5. MediaRecorder setup
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.combinedStream || new MediaStream(), { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    this.mediaRecorder.start(1000); // 1-second chunks
  }

  async stop(): Promise<Blob> {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const fallbackBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(fallbackBlob);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.sysStream) {
      this.sysStream.getTracks().forEach((t) => t.stop());
      this.sysStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
