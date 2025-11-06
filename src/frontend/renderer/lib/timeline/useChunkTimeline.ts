import { useState, useCallback, useRef } from 'react';
import {
  TimelineData,
  TimelineOperations,
  Clip,
  Track,
  TrackKind,
  ClipParams,
  KGAnchor,
  RippleMode,
  TimelineState,
  snapToGrid,
  snapToKGAnchor,
} from './chunkTimeline';

const DEFAULT_STATE: TimelineState = {
  timeMs: 0,
  fpsNominal: 60,
  snap: {
    gridMs: 100,
    enable: true,
  },
  selection: {
    clips: [],
  },
  rippleMode: 'auto',
  playheadShuttle: 1.0,
};

export function useChunkTimeline() {
  const [data, setData] = useState<TimelineData>({
    tracks: [],
    clips: {},
    kgAnchors: [],
    state: DEFAULT_STATE,
  });

  const historyRef = useRef<TimelineData[]>([]);
  const historyIndexRef = useRef(-1);

  const saveState = useCallback(() => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(data)));
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [data]);

  const operations: TimelineOperations = {
    insertClip: useCallback((trackId, payloadRef, startMs, durMs, params) => {
      saveState();
      const clipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const endMs = startMs + durMs;
      
      let snappedStart = startMs;
      if (data.state.snap.enable) {
        const kgSnap = snapToKGAnchor(startMs, data.kgAnchors);
        if (kgSnap !== null) {
          snappedStart = kgSnap;
        } else {
          snappedStart = snapToGrid(startMs, data.state.snap.gridMs);
        }
      }
      
      const newClip: Clip = {
        id: clipId,
        trackId,
        type: 'clip',
        start: snappedStart,
        end: snappedStart + durMs,
        payloadRef,
        params: params || {},
        labels: [],
        locks: { time: false, content: false },
        mute: false,
        solo: false,
      };
      
      setData(prev => {
        const track = prev.tracks.find(t => t.id === trackId);
        if (!track) return prev;
        
        // Insert clip in sorted order
        const newClips = [...track.clips];
        const insertIndex = newClips.findIndex(id => {
          const clip = prev.clips[id];
          return clip && clip.start > snappedStart;
        });
        
        if (insertIndex === -1) {
          newClips.push(clipId);
        } else {
          newClips.splice(insertIndex, 0, clipId);
        }
        
        return {
          ...prev,
          clips: { ...prev.clips, [clipId]: newClip },
          tracks: prev.tracks.map(t =>
            t.id === trackId ? { ...t, clips: newClips } : t
          ),
        };
      });
      
      return clipId;
    }, [data, saveState]),

    deleteSelection: useCallback((ripple = true) => {
      if (data.state.selection.clips.length === 0) return;
      saveState();
      
      setData(prev => {
        const clipsToDelete = prev.state.selection.clips;
        const newClips = { ...prev.clips };
        const newTracks = prev.tracks.map(track => {
          const remainingClips = track.clips.filter(id => !clipsToDelete.includes(id));
          
          if (ripple && prev.state.rippleMode !== 'none') {
            // Calculate total duration to remove
            let totalDuration = 0;
            for (const clipId of clipsToDelete) {
              const clip = prev.clips[clipId];
              if (clip && track.clips.includes(clipId)) {
                totalDuration += clip.end - clip.start;
              }
            }
            
            // Ripple remaining clips left
            const newClipsList = remainingClips.map(clipId => {
              const clip = newClips[clipId];
              if (clip && clip.start > clipsToDelete.reduce((max, id) => {
                const c = prev.clips[id];
                return c && c.start > max ? c.start : max;
              }, 0)) {
                return {
                  ...clip,
                  start: clip.start - totalDuration,
                  end: clip.end - totalDuration,
                };
              }
              return clip;
            });
            
            return { ...track, clips: remainingClips };
          }
          
          return { ...track, clips: remainingClips };
        });
        
        // Remove clips from data
        for (const clipId of clipsToDelete) {
          delete newClips[clipId];
        }
        
        return {
          ...prev,
          clips: newClips,
          tracks: newTracks,
          state: {
            ...prev.state,
            selection: { clips: [] },
          },
        };
      });
    }, [data, saveState]),

    moveChunk: useCallback((clipIds, deltaMs, targetTrackId) => {
      if (clipIds.length === 0) return;
      saveState();
      
      setData(prev => {
        const newClips = { ...prev.clips };
        const newTracks = prev.tracks.map(track => {
          if (targetTrackId && track.id === targetTrackId) {
            // Move clips to target track
            const clipsToMove = clipIds.filter(id => prev.clips[id]);
            const existingClips = track.clips.filter(id => !clipIds.includes(id));
            return { ...track, clips: [...existingClips, ...clipsToMove] };
          } else if (track.clips.some(id => clipIds.includes(id))) {
            // Remove clips from source track
            return { ...track, clips: track.clips.filter(id => !clipIds.includes(id)) };
          }
          return track;
        });
        
        // Update clip positions
        for (const clipId of clipIds) {
          const clip = newClips[clipId];
          if (clip) {
            let newStart = clip.start + deltaMs;
            if (prev.state.snap.enable) {
              const kgSnap = snapToKGAnchor(newStart, prev.kgAnchors);
              if (kgSnap !== null) {
                newStart = kgSnap;
              } else {
                newStart = snapToGrid(newStart, prev.state.snap.gridMs);
              }
            }
            
            const duration = clip.end - clip.start;
            newClips[clipId] = {
              ...clip,
              start: Math.max(0, newStart),
              end: Math.max(0, newStart + duration),
              trackId: targetTrackId || clip.trackId,
            };
          }
        }
        
        return {
          ...prev,
          clips: newClips,
          tracks: newTracks,
        };
      });
    }, [data, saveState]),

    trimEdge: useCallback((clipId, edge, toMs, rippleMode) => {
      saveState();
      
      setData(prev => {
        const clip = prev.clips[clipId];
        if (!clip) return prev;
        
        let snappedTo = toMs;
        if (prev.state.snap.enable) {
          const kgSnap = snapToKGAnchor(toMs, prev.kgAnchors);
          if (kgSnap !== null) {
            snappedTo = kgSnap;
          } else {
            snappedTo = snapToGrid(toMs, prev.state.snap.gridMs);
          }
        }
        
        const newClips = { ...prev.clips };
        const newClip = { ...clip };
        
        if (edge === 'in') {
          newClip.start = Math.min(snappedTo, clip.end - 100); // Min 100ms duration
        } else {
          newClip.end = Math.max(snappedTo, clip.start + 100);
        }
        
        newClips[clipId] = newClip;
        
        // Handle ripple
        const ripple = rippleMode || prev.state.rippleMode;
        if (ripple !== 'none') {
          const track = prev.tracks.find(t => t.id === clip.trackId);
          if (track) {
            const clipIndex = track.clips.indexOf(clipId);
            const delta = edge === 'in' 
              ? newClip.start - clip.start
              : newClip.end - clip.end;
            
            // Ripple subsequent clips
            for (let i = clipIndex + 1; i < track.clips.length; i++) {
              const otherClipId = track.clips[i];
              const otherClip = newClips[otherClipId];
              if (otherClip) {
                newClips[otherClipId] = {
                  ...otherClip,
                  start: otherClip.start + delta,
                  end: otherClip.end + delta,
                };
              }
            }
          }
        }
        
        return {
          ...prev,
          clips: newClips,
        };
      });
    }, [data, saveState]),

    splitAtPlayhead: useCallback((trackId) => {
      saveState();
      
      setData(prev => {
        const track = prev.tracks.find(t => t.id === trackId);
        if (!track) return prev;
        
        const playheadMs = prev.state.timeMs;
        const clip = track.clips.find(id => {
          const c = prev.clips[id];
          return c && c.start < playheadMs && c.end > playheadMs;
        });
        
        if (!clip) return prev;
        
        const originalClip = prev.clips[clip];
        const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newClip: Clip = {
          ...originalClip,
          id: newClipId,
          start: playheadMs,
        };
        
        const updatedClip: Clip = {
          ...originalClip,
          end: playheadMs,
        };
        
        const clipIndex = track.clips.indexOf(clip);
        const newClipsList = [...track.clips];
        newClipsList.splice(clipIndex + 1, 0, newClipId);
        
        return {
          ...prev,
          clips: {
            ...prev.clips,
            [clip]: updatedClip,
            [newClipId]: newClip,
          },
          tracks: prev.tracks.map(t =>
            t.id === trackId ? { ...t, clips: newClipsList } : t
          ),
        };
      });
    }, [data, saveState]),

    promoteOverlayToScenePlane: useCallback((clipId) => {
      saveState();
      
      setData(prev => {
        const clip = prev.clips[clipId];
        if (!clip) return prev;
        
        const sourceTrack = prev.tracks.find(t => t.id === clip.trackId);
        if (!sourceTrack || (sourceTrack.kind !== 'overlayFront' && sourceTrack.kind !== 'overlayBack')) {
          return prev;
        }
        
        // Find or create scene track
        let sceneTrack = prev.tracks.find(t => t.kind === 'scene');
        if (!sceneTrack) {
          const newTrackId = `track_${Date.now()}`;
          sceneTrack = {
            id: newTrackId,
            name: 'Scene',
            kind: 'scene',
            visible: true,
            locked: false,
            clips: [],
            zStack: 0,
          };
        }
        
        // Create new clip on scene track with zAnim
        const newClipId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const zAnim = sourceTrack.kind === 'overlayFront' 
          ? [{ t: clip.start, z: 0.01 }, { t: clip.end, z: 0.01 }]
          : [{ t: clip.start, z: -2.0 }, { t: clip.end, z: -2.0 }];
        
        const newClip: Clip = {
          ...clip,
          id: newClipId,
          trackId: sceneTrack.id,
          params: {
            ...clip.params,
            zAnim,
          },
        };
        
        // Remove from source track, add to scene track
        const newTracks = prev.tracks.map(t => {
          if (t.id === sourceTrack!.id) {
            return { ...t, clips: t.clips.filter(id => id !== clipId) };
          }
          if (t.id === sceneTrack!.id) {
            return { ...t, clips: [...t.clips, newClipId] };
          }
          return t;
        });
        
        // If scene track was new, add it
        if (!prev.tracks.find(t => t.id === sceneTrack!.id)) {
          newTracks.push(sceneTrack);
        }
        
        return {
          ...prev,
          clips: {
            ...prev.clips,
            [newClipId]: newClip,
          },
          tracks: newTracks,
        };
      });
    }, [data, saveState]),

    setClipParam: useCallback((clipId, path, value) => {
      saveState();
      
      setData(prev => {
        const clip = prev.clips[clipId];
        if (!clip) return prev;
        
        const newParams = { ...clip.params };
        const keys = path.split('.');
        let current: any = newParams;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        
        return {
          ...prev,
          clips: {
            ...prev.clips,
            [clipId]: {
              ...clip,
              params: newParams,
            },
          },
        };
      });
    }, [data, saveState]),

    group: useCallback((clipIds) => {
      saveState();
      const groupId = `group_${Date.now()}`;
      
      setData(prev => ({
        ...prev,
        clips: Object.fromEntries(
          Object.entries(prev.clips).map(([id, clip]) =>
            clipIds.includes(id) ? [id, { ...clip, groupId }] : [id, clip]
          )
        ),
      }));
      
      return groupId;
    }, [saveState]),

    ungroup: useCallback((groupId) => {
      saveState();
      
      setData(prev => ({
        ...prev,
        clips: Object.fromEntries(
          Object.entries(prev.clips).map(([id, clip]) =>
            clip.groupId === groupId ? [id, { ...clip, groupId: undefined }] : [id, clip]
          )
        ),
      }));
    }, [saveState]),

    addTrack: useCallback((kind, name) => {
      saveState();
      const trackId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newTrack: Track = {
        id: trackId,
        name,
        kind,
        visible: true,
        locked: false,
        clips: [],
        zStack: 0,
      };
      
      setData(prev => ({
        ...prev,
        tracks: [...prev.tracks, newTrack],
      }));
      
      return trackId;
    }, [saveState]),

    removeTrack: useCallback((trackId) => {
      saveState();
      
      setData(prev => {
        const track = prev.tracks.find(t => t.id === trackId);
        if (!track) return prev;
        
        // Remove all clips on this track
        const newClips = { ...prev.clips };
        for (const clipId of track.clips) {
          delete newClips[clipId];
        }
        
        return {
          ...prev,
          tracks: prev.tracks.filter(t => t.id !== trackId),
          clips: newClips,
        };
      });
    }, [saveState]),

    addKGAnchor: useCallback((anchor) => {
      saveState();
      const anchorId = `kg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newAnchor: KGAnchor = {
        ...anchor,
        id: anchorId,
      };
      
      setData(prev => ({
        ...prev,
        kgAnchors: [...prev.kgAnchors, newAnchor],
      }));
      
      return anchorId;
    }, [saveState]),

    removeKGAnchor: useCallback((anchorId) => {
      saveState();
      
      setData(prev => ({
        ...prev,
        kgAnchors: prev.kgAnchors.filter(a => a.id !== anchorId),
      }));
    }, [saveState]),

    seek: useCallback((timeMs) => {
      setData(prev => ({
        ...prev,
        state: {
          ...prev.state,
          timeMs: Math.max(0, timeMs),
        },
      }));
    }, []),

    setSelection: useCallback((clipIds) => {
      setData(prev => ({
        ...prev,
        state: {
          ...prev.state,
          selection: { clips: clipIds },
        },
      }));
    }, []),

    toggleSnap: useCallback(() => {
      setData(prev => ({
        ...prev,
        state: {
          ...prev.state,
          snap: {
            ...prev.state.snap,
            enable: !prev.state.snap.enable,
          },
        },
      }));
    }, []),

    setRippleMode: useCallback((mode) => {
      setData(prev => ({
        ...prev,
        state: {
          ...prev.state,
          rippleMode: mode,
        },
      }));
    }, []),
  };

  return {
    data,
    operations,
    // Undo/Redo
    undo: useCallback(() => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
        setData(historyRef.current[historyIndexRef.current]);
      }
    }, []),
    
    redo: useCallback(() => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current++;
        setData(historyRef.current[historyIndexRef.current]);
      }
    }, []),
  };
}

