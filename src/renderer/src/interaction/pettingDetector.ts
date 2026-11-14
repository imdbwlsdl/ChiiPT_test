// 쓰다듬기 판정 로직. 화면·카메라와 무관한 "순수 계산"이라서 따로 테스트하기 쉬워요.

export type PetState = 'idle' | 'approach' | 'petting' | 'ending'

export interface Point {
  x: number
  y: number
}
export interface Zone {
  left: number
  top: number
  right: number
  bottom: number
}

// ───── 조절용 숫자들 (손맛이 안 맞으면 여기만 바꾸면 돼요) ─────
const WINDOW_MS = 1200 // 최근 이만큼의 움직임만 보고 판단
const MIN_AMPLITUDE = 25 // 이 픽셀 이상 움직여야 "한 번 쓱" 으로 인정 (손 떨림 무시)
const START_REVERSALS = 2 // 방향 전환 2번(좌→우→좌) 이상이면 쓰다듬기 시작
const KEEP_REVERSALS = 1 // 쓰다듬는 중엔 최근 윈도우에 1번만 있어도 유지
const LEAVE_MARGIN = 30 // 한 번 머리 위에 들어온 손은 이만큼 벗어나야 "떠났다"고 판단 (경계 깜빡임 방지)
const ENDING_MS = 500 // 쓰다듬기 종료 후 이 시간 동안은 "여운" 상태
const VERY_HAPPY_AFTER_MS = 3000 // 이 시간 넘게 쓰다듬으면 더 기뻐함

interface Sample {
  t: number
  x: number
  y: number
}

// 값의 배열에서 "방향이 바뀐 횟수"를 세요. 지그재그 알고리즘:
// 마지막 극점에서 MIN_AMPLITUDE 이상 반대로 움직여야 방향이 바뀐 걸로 쳐요.
// 이렇게 하면 미세한 떨림은 세지 않고, 쓱-쓱 하는 큰 움직임만 세요.
export function countReversals(values: number[], minAmp: number): number {
  if (values.length < 2) return 0
  let extreme = values[0]
  let dir = 0 // 0: 아직 방향 모름, 1: 증가 중, -1: 감소 중
  let reversals = 0
  for (let i = 1; i < values.length; i++) {
    const v = values[i]
    if (dir === 0) {
      if (Math.abs(v - extreme) >= minAmp) {
        dir = v > extreme ? 1 : -1
        extreme = v
      }
    } else if (dir === 1) {
      if (v > extreme) extreme = v
      else if (extreme - v >= minAmp) {
        dir = -1
        extreme = v
        reversals++
      }
    } else {
      if (v < extreme) extreme = v
      else if (v - extreme >= minAmp) {
        dir = 1
        extreme = v
        reversals++
      }
    }
  }
  return reversals
}

function inside(p: Point, z: Zone, margin: number): boolean {
  return (
    p.x >= z.left - margin && p.x <= z.right + margin && p.y >= z.top - margin && p.y <= z.bottom + margin
  )
}

export class PettingDetector {
  state: PetState = 'idle'
  level: 0 | 1 | 2 = 0 // 0: 안 쓰다듬음, 1: 기뻐함, 2: 아주 기뻐함

  private samples: Sample[] = []
  private pettingSince = 0
  private endingUntil = 0

  // 프레임마다 호출: 손 위치(없으면 null), 머리 영역, 현재 시각
  update(hand: Point | null, headZone: Zone, now: number): void {
    // ① 여운 시간이 끝나면 idle로
    if (this.state === 'ending' && now >= this.endingUntil) this.state = 'idle'

    // ② 손이 없거나 머리 영역 밖 → 진행 중이던 것을 정리
    const wasActive = this.state === 'approach' || this.state === 'petting'
    const isInside = hand !== null && inside(hand, headZone, wasActive ? LEAVE_MARGIN : 0)
    if (!isInside) {
      this.samples = []
      if (this.state === 'petting') this.endPetting(now)
      else if (this.state === 'approach') this.state = 'idle'
      return
    }

    // ③ 여운 중에는 새 판정을 시작하지 않아요 (깜빡거림 방지)
    if (this.state === 'ending') return

    // ④ 최근 움직임 기록 (오래된 것은 버림)
    this.samples.push({ t: now, x: hand!.x, y: hand!.y })
    while (this.samples.length && now - this.samples[0].t > WINDOW_MS) this.samples.shift()

    if (this.state === 'idle') this.state = 'approach'

    // ⑤ 좌우·상하 중 더 많이 왔다 갔다 한 쪽을 기준으로 삼아요 (어느 방향으로 쓰다듬든 인정)
    const reversals = Math.max(
      countReversals(this.samples.map((s) => s.x), MIN_AMPLITUDE),
      countReversals(this.samples.map((s) => s.y), MIN_AMPLITUDE)
    )

    if (this.state === 'approach' && reversals >= START_REVERSALS) {
      this.state = 'petting'
      this.pettingSince = now
    } else if (this.state === 'petting' && reversals < KEEP_REVERSALS) {
      this.endPetting(now) // 손이 멈췄다
      return
    }

    // ⑥ 오래 쓰다듬을수록 반응이 커져요
    if (this.state === 'petting') {
      this.level = now - this.pettingSince >= VERY_HAPPY_AFTER_MS ? 2 : 1
    }
  }

  private endPetting(now: number): void {
    this.state = 'ending'
    this.level = 0
    this.endingUntil = now + ENDING_MS
    this.samples = []
  }
}
