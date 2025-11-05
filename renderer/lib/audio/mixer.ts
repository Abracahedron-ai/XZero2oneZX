import { create } from 'zustand';

export type StemId = string;

export interface StemConfig {
  id: StemId;
  label: string;
  url: string;
}

export interface StemState {
  id: StemId;
  label: string;
  volume: number;
  muted: boolean;
  loaded: boolean;
  playing: boolean;
}

export interface MixerEffects {
  reverb: number; // 0–1
  delay: number; // 0–1
  eq: {
    low: number;
    mid: number;
    high: number;
  };
}

export interface MixerState {
  stems: Record<StemId, StemState>;
  order: StemId[];
  effects: MixerEffects;
  duration: number;
  position: number;
  playing: boolean;
  loading: boolean;
  error?: string;
  setStemVolume: (id: StemId, volume: number) => void;
  toggleStemMute: (id: StemId) => void;
  setEffects: (effects: Partial<MixerEffects>) => void;
  setPlaying: (playing: boolean) => void;
  seek: (fraction: number) => void;
  hydrate: (configs: StemConfig[]) => Promise<void>;
}

const DEFAULT_EFFECTS: MixerEffects = {
  reverb: 0,
  delay: 0,
  eq: { low: 1, mid: 1, high: 1 },
};

type AudioNodes = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  lowShelf: BiquadFilterNode;
  midPeaking: BiquadFilterNode;
  highShelf: BiquadFilterNode;
  delay: DelayNode;
  reverb: ConvolverNode | null;
};

class StemMixer {
  private context: AudioContext;
  private stems: Map<StemId, AudioNodes> = new Map();
  private masterGain: GainNode;
  private analyser: AnalyserNode;
  private startTimestamp: number | null = null;
  private pauseOffset = 0;
  private bufferCache: Map<string, AudioBuffer> = new Map();

  constructor(private set: MixerStore['set']) {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  async loadStems(configs: StemConfig[]) {
    this.dispose();

    const buffers = await Promise.all(
      configs.map(async (config) => {
        if (this.bufferCache.has(config.url)) {
          return { config, buffer: this.bufferCache.get(config.url)! };
        }

        const response = await fetch(config.url);
        const array = await response.arrayBuffer();
        const decoded = await this.context.decodeAudioData(array);
        this.bufferCache.set(config.url, decoded);
        return { config, buffer: decoded };
      })
    );

    let maxDuration = 0;

    buffers.forEach(({ config, buffer }) => {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = false;

      if (buffer.duration > maxDuration) {
        maxDuration = buffer.duration;
      }

      const gain = this.context.createGain();
      gain.gain.value = 1;

      const lowShelf = this.context.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 200;
      lowShelf.gain.value = 0;

      const midPeaking = this.context.createBiquadFilter();
      midPeaking.type = 'peaking';
      midPeaking.frequency.value = 1200;
      midPeaking.Q.value = 1;
      midPeaking.gain.value = 0;

      const highShelf = this.context.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 6000;
      highShelf.gain.value = 0;

      const delay = this.context.createDelay(1.0);
      delay.delayTime.value = 0;

      let reverb: ConvolverNode | null = null;

      source
        .connect(lowShelf)
        .connect(midPeaking)
        .connect(highShelf)
        .connect(delay)
        .connect(gain)
        .connect(this.masterGain);

      this.stems.set(config.id, {
        source,
        gain,
        lowShelf,
        midPeaking,
        highShelf,
        delay,
        reverb,
      });
    });

    this.set((state) => ({
      ...state,
      duration: maxDuration,
    }));
  }

  play() {
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }

    if (this.startTimestamp !== null) {
      return;
    }

    const now = this.context.currentTime;
    this.startTimestamp = now - this.pauseOffset;

    this.stems.forEach((nodes) => {
      const { source } = nodes;
      if (source.buffer) {
        const offset = this.pauseOffset;
        const newSource = this.context.createBufferSource();
        newSource.buffer = source.buffer;
        newSource.loop = false;
        newSource.connect(nodes.lowShelf);
        newSource.start(0, offset);
        nodes.source = newSource;
      }
    });
  }

  pause() {
    if (this.startTimestamp === null) return;
    const elapsed = this.context.currentTime - this.startTimestamp;
    this.pauseOffset = Math.min(elapsed, this.duration());
    this.startTimestamp = null;

    this.stems.forEach((nodes) => {
      nodes.source.stop();
    });
  }

  stop() {
    this.pauseOffset = 0;
    this.startTimestamp = null;
    this.stems.forEach((nodes) => nodes.source.stop());
  }

  seek(fraction: number) {
    const clamped = Math.max(0, Math.min(1, fraction));
    this.pauseOffset = clamped * this.duration();
    if (this.startTimestamp !== null) {
      this.pause();
      this.play();
    }
  }

  setStemVolume(id: StemId, volume: number) {
    const nodes = this.stems.get(id);
    if (!nodes) return;
    nodes.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  muteStem(id: StemId, muted: boolean) {
    const nodes = this.stems.get(id);
    if (!nodes) return;
    nodes.gain.gain.value = muted ? 0 : 1;
  }

  applyEffects(effects: MixerEffects) {
    this.stems.forEach((nodes) => {
      nodes.lowShelf.gain.value = (effects.eq.low - 1) * 12;
      nodes.midPeaking.gain.value = (effects.eq.mid - 1) * 12;
      nodes.highShelf.gain.value = (effects.eq.high - 1) * 12;
      nodes.delay.delayTime.value = effects.delay * 0.4;
      if (nodes.reverb) {
        nodes.reverb.normalize = true;
      }
    });
  }

  position(): number {
    if (this.startTimestamp === null) return this.pauseOffset;
    return this.context.currentTime - this.startTimestamp;
  }

  duration(): number {
    let max = 0;
    this.stems.forEach((nodes) => {
      if (nodes.source.buffer) {
        max = Math.max(max, nodes.source.buffer.duration);
      }
    });
    return max;
  }

  dispose() {
    this.stems.forEach((nodes) => {
      try {
        nodes.source.stop();
      } catch {
        // ignore
      }
      nodes.source.disconnect();
      nodes.gain.disconnect();
      nodes.lowShelf.disconnect();
      nodes.midPeaking.disconnect();
      nodes.highShelf.disconnect();
      nodes.delay.disconnect();
      nodes.reverb?.disconnect();
    });
    this.stems.clear();
    this.pauseOffset = 0;
    this.startTimestamp = null;
  }
}

type MixerStore = {
  state: MixerState;
  set: (updater: (state: MixerState) => MixerState) => void;
  mixer: StemMixer;
};

const useMixerStore = create<MixerStore>((setState, getState) => {
  const set = (updater: (state: MixerState) => MixerState) => {
    setState((prev) => ({ ...prev, state: updater(prev.state) }));
  };

  const mixer = new StemMixer(set);

  const state: MixerState = {
    stems: {},
    order: [],
    effects: DEFAULT_EFFECTS,
    duration: 0,
    position: 0,
    playing: false,
    loading: false,
    async hydrate(configs: StemConfig[]) {
      set((s) => ({
        ...s,
        loading: true,
        error: undefined,
      }));
      try {
        await mixer.loadStems(configs);
        const stemState: Record<StemId, StemState> = {};
        configs.forEach((config) => {
          stemState[config.id] = {
            id: config.id,
            label: config.label,
            volume: 1,
            muted: false,
            loaded: true,
            playing: false,
          };
        });
        set((s) => ({
          ...s,
          stems: stemState,
          order: configs.map((c) => c.id),
          loading: false,
        }));
      } catch (error) {
        set((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    },
    setStemVolume(id, volume) {
      mixer.setStemVolume(id, volume);
      set((s) => ({
        ...s,
        stems: {
          ...s.stems,
          [id]: { ...s.stems[id], volume },
        },
      }));
    },
    toggleStemMute(id) {
      const nextMuted = !getState().state.stems[id].muted;
      mixer.muteStem(id, nextMuted);
      set((s) => ({
        ...s,
        stems: {
          ...s.stems,
          [id]: { ...s.stems[id], muted: nextMuted },
        },
      }));
    },
    setEffects(effects) {
      const merged: MixerEffects = {
        ...getState().state.effects,
        ...effects,
        eq: { ...getState().state.effects.eq, ...(effects.eq ?? {}) },
      };
      mixer.applyEffects(merged);
      set((s) => ({
        ...s,
        effects: merged,
      }));
    },
    setPlaying(playing) {
      if (playing) {
        mixer.play();
      } else {
        mixer.pause();
      }
      set((s) => ({
        ...s,
        playing,
      }));
    },
    seek(fraction: number) {
      mixer.seek(fraction);
      set((s) => ({
        ...s,
        position: mixer.position(),
      }));
    },
  };

  return { state, set, mixer };
});

export const useAudioMixer = () => useMixerStore((store) => store.state);
