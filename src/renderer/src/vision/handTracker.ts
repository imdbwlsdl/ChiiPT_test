import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

// 손 인식 결과. 좌표는 모두 0~1 사이 비율이에요. (0,0)=왼쪽 위, (1,1)=오른쪽 아래
export interface HandPoint {
  x: number // 이미 좌우반전 보정됨 (내 손이 오른쪽으로 가면 x도 커져요)
  y: number
}

type Listener = (hand: HandPoint | null) => void

// "웹캠 + MediaPipe" 를 한 덩어리로 감싼 클래스.
// 왜 클래스로 분리? → 나중에 자세 인식(팀원 기능)도 같은 카메라를 써야 해서,
// 카메라/인식 코드를 화면 그리는 코드와 떼어 놓으면 합치기 쉬워요.
export class HandTracker {
  private landmarker: HandLandmarker | null = null
  private video = document.createElement('video')
  private stream: MediaStream | null = null
  private running = false
  private lastVideoTime = -1
  private listeners: Listener[] = []

  onResult(fn: Listener): void {
    this.listeners.push(fn)
  }

  // 모델 불러오기 (처음 한 번, 1~2초 걸려요)
  async init(): Promise<void> {
    // 주소를 상대경로로 만들어야 개발(http)과 배포(file://) 모두에서 동작해요
    const base = (path: string): string => new URL(path, document.baseURI).href
    const vision = await FilesetResolver.forVisionTasks(base('mediapipe/wasm'))

    const make = (delegate: 'GPU' | 'CPU'): Promise<HandLandmarker> =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: base('mediapipe/hand_landmarker.task'), delegate },
        runningMode: 'VIDEO', // 영상 모드: 프레임 사이의 연속성을 이용해 더 안정적
        numHands: 1 // 손은 한 개만 (쓰다듬기엔 충분하고 더 가벼워요)
      })

    try {
      this.landmarker = await make('GPU') // 그래픽카드 사용 (빠름)
    } catch {
      this.landmarker = await make('CPU') // 안 되면 CPU로 대체
    }
  }

  // 카메라 켜고 인식 시작
  async start(): Promise<void> {
    if (this.running) return
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: 30 }, // 작은 해상도 = 가벼운 계산
      audio: false
    })
    this.video.srcObject = this.stream
    this.video.muted = true
    await this.video.play()
    this.running = true
    this.loop()
  }

  // 카메라 완전히 끄기 (명세서: 수면/비활성화 시 실제로 중단)
  stop(): void {
    this.running = false
    this.stream?.getTracks().forEach((t) => t.stop()) // 이걸 해야 카메라 표시등이 꺼져요
    this.stream = null
    this.listeners.forEach((fn) => fn(null))
  }

  private loop = (): void => {
    if (!this.running) return
    // 새 프레임이 왔을 때만 계산 (같은 프레임을 두 번 분석하지 않기)
    if (this.landmarker && this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime
      const result = this.landmarker.detectForVideo(this.video, performance.now())
      const lm = result.landmarks[0] // 손이 없으면 undefined

      if (!lm) {
        this.listeners.forEach((fn) => fn(null))
      } else {
        // 손바닥 중심 = 손목(0)과 각 손가락 뿌리(5,9,13,17)의 평균.
        // 손가락 끝보다 덜 흔들려서 "커서"로 쓰기 좋아요.
        const ids = [0, 5, 9, 13, 17]
        const x = ids.reduce((s, i) => s + lm[i].x, 0) / ids.length
        const y = ids.reduce((s, i) => s + lm[i].y, 0) / ids.length
        this.listeners.forEach((fn) => fn({ x: 1 - x, y })) // 1-x : 거울처럼 좌우반전
      }
    }
    requestAnimationFrame(this.loop)
  }
}
