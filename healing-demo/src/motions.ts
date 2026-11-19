/**
 * 새 캐릭터의 동작(프레임 PNG) 목록. 프레임 파일: assets/characters/<동작>/<동작>-frame-NN.png
 * canvas.feet = 프레임 이미지 안에서 발바닥 기준선의 y 위치(px). 모든 동작에서 발바닥 중앙이 (w/2, feet)에 오도록 만들어 두었다.
 */
export type MotionName =
  | 'idle-open' | 'idle-closed' | 'walk' | 'walk-mirrored'
  | 'stretch' | 'cheek-pull' | 'cheek-release' | 'sleep';

export interface Motion {
  frames: number;
  fps: number;
  canvas: { w: number; h: number; feet: number };
}

const STAND = { w: 256, h: 240, feet: 228 };

export const MOTIONS: Record<MotionName, Motion> = {
  'idle-open': { frames: 6, fps: 8, canvas: STAND }, //              눈 뜬 대기 (GIF 120ms 간격)
  'idle-closed': { frames: 10, fps: 8, canvas: STAND }, //    눈 감은 대기: 쓰다듬는 동안 사용
  walk: { frames: 14, fps: 16, canvas: STAND }, //            제자리 걷기 (GIF 60ms 간격)
  'walk-mirrored': { frames: 14, fps: 16, canvas: STAND }, // 좌우 반전
  stretch: { frames: 28, fps: 15, canvas: STAND }, //         기지개: 깨어날 때 사용
  'cheek-pull': { frames: 29, fps: 15, canvas: STAND }, //    볼 꼬집기 (아직 연결 안 함)
  'cheek-release': { frames: 17, fps: 15, canvas: STAND }, // 볼 놓기 (아직 연결 안 함)
  sleep: { frames: 57, fps: 6, canvas: { w: 320, h: 300, feet: 288 } } // 침대에서 자는 모습
};

export const framePath = (motion: MotionName, index: number): string =>
  `assets/characters/${motion}/${motion}-frame-${String(index + 1).padStart(2, '0')}.png`;
