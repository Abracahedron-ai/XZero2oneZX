import { useEffect, useRef } from 'react';
import { useStateVector } from '../lib/stateVector';

interface BehaviorNode {
  id: string;
  type: 'condition' | 'action' | 'sequence' | 'selector';
  children?: BehaviorNode[];
  condition?: () => boolean;
  action?: () => void;
}

// Simple behavior tree for avatar reactions
const idleBehavior: BehaviorNode = {
  id: 'idle',
  type: 'sequence',
  children: [
    {
      id: 'check-arousal',
      type: 'condition',
      condition: () => useStateVector.getState().current.arousal < 0.5,
    },
    {
      id: 'idle-animation',
      type: 'action',
      action: () => {
        useStateVector.getState().setEmote('idle');
        useStateVector.getState().updateBlend('smile', 0.2);
      },
    },
  ],
};

const excitedBehavior: BehaviorNode = {
  id: 'excited',
  type: 'sequence',
  children: [
    {
      id: 'check-high-arousal',
      type: 'condition',
      condition: () => useStateVector.getState().current.arousal > 0.7,
    },
    {
      id: 'excited-animation',
      type: 'action',
      action: () => {
        useStateVector.getState().setEmote('wave');
        useStateVector.getState().updateBlend('smile', 0.9);
      },
    },
  ],
};

const rootBehavior: BehaviorNode = {
  id: 'root',
  type: 'selector',
  children: [excitedBehavior, idleBehavior],
};

function evaluateBehaviorTree(node: BehaviorNode): boolean {
  switch (node.type) {
    case 'condition':
      return node.condition?.() ?? false;

    case 'action':
      node.action?.();
      return true;

    case 'sequence':
      return node.children?.every(evaluateBehaviorTree) ?? false;

    case 'selector':
      return node.children?.some(evaluateBehaviorTree) ?? false;

    default:
      return false;
  }
}

export const useBehaviorBrain = (enabled = true) => {
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { current, updateState } = useStateVector();

  useEffect(() => {
    if (!enabled) return;

    // Tick behavior tree at 10Hz
    tickIntervalRef.current = setInterval(() => {
      evaluateBehaviorTree(rootBehavior);

      // Decay arousal over time
      const decay = 0.01;
      updateState({
        arousal: Math.max(0, current.arousal - decay),
      });
    }, 100);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [enabled, current.arousal]);

  const triggerEvent = (eventType: string, data?: any) => {
    console.log(`[BehaviorBrain] Event: ${eventType}`, data);

    switch (eventType) {
      case 'user-message':
        // Increase arousal when user sends a message
        updateState({ arousal: Math.min(1, current.arousal + 0.3) });
        break;

      case 'positive-sentiment':
        updateState({
          valence: Math.min(1, current.valence + 0.2),
          arousal: Math.min(1, current.arousal + 0.1),
        });
        break;

      case 'negative-sentiment':
        updateState({
          valence: Math.max(-1, current.valence - 0.2),
        });
        break;

      case 'look-at':
        if (data?.target) {
          useStateVector.getState().setGaze(data.target, 1);
        }
        break;

      default:
        console.warn(`[BehaviorBrain] Unknown event: ${eventType}`);
    }
  };

  return { triggerEvent, currentState: current };
};
