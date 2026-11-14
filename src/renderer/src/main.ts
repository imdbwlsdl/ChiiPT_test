import './style.css'
import idlePng from './assets/pet-idle.png'
import { HandTracker } from './vision/handTracker'
import { PettingDetector, type Zone } from './interaction/pettingDetector'
import { Character } from './interaction/character'

declare global {
  interface Window {
    pet: { setIgnoreMouse: (ignore: boolean) => void }
  }
}

const DEBUG_SHOW_ZONE = true // 머리 판정 영역을 점선으로 보여 줄지 (튜닝 끝나면 false)

const pet = document.getElementById('pet') as HTMLImageElement
const handEl = document.getElementById('hand') as HTMLDivElement
const statusEl = document.getElementById('status') as HTMLDivElement
const zoneEl = document.getElementById('zone') as HTMLDivElement
const fxEl = document.getElementById('fx') as HTMLDivElement
pet.src = idlePng

// 캐릭터 위에 마우스가 올라오면 클릭을 받고, 벗어나면 다시 통과시켜요.
pet.addEventListener('mouseenter', () => window.pet.setIgnoreMouse(false))
pet.addEventListener('mouseleave', () => window.pet.setIgnoreMouse(true))

// ---- 머리 영역 계산 ----
// 캐릭터 이미지의 "위쪽 60%" 를 머리로 보고, 손이 닿기 쉽게 사방으로 20px 여유를 줘요.
// offset* 값을 쓰는 이유: 흔들리는 애니메이션(transform)의 영향을 받지 않는 "원래 자리"라서요.
function headZone(): Zone {
  const pad = 20
  return {
    left: pet.offsetLeft - pad,
    right: pet.offsetLeft + pet.offsetWidth + pad,
    top: pet.offsetTop - pad,
    bottom: pet.offsetTop + pet.offsetHeight * 0.6
  }
}
function drawZone(): void {
  const z = headZone()
  zoneEl.hidden = !DEBUG_SHOW_ZONE
  Object.assign(zoneEl.style, {
    left: `${z.left}px`,
    top: `${z.top}px`,
    width: `${z.right - z.left}px`,
    height: `${z.bottom - z.top}px`
  })
}
pet.addEventListener('load', drawZone) // 이미지 크기가 정해진 뒤에 계산
window.addEventListener('resize', drawZone)

// ---- 손 인식 → 화면 좌표 변환 ----
// 카메라 화면의 가운데 영역(15%~85%)만 화면 전체에 대응시켜요.
const MARGIN = 0.15
const remap = (v: number): number => Math.min(1, Math.max(0, (v - MARGIN) / (1 - 2 * MARGIN)))

// 손 떨림 완화(지수 이동 평균): 새 값을 35%만 반영
const SMOOTH = 0.35
let cx = 0
let cy = 0
let hasPrev = false

const detector = new PettingDetector()
const character = new Character(pet, fxEl)
const STATE_LABEL = { idle: '대기', approach: '손 접근', petting: '쓰다듬는 중 💕', ending: '종료' }

const tracker = new HandTracker()
tracker.onResult((hand) => {
  const now = performance.now()

  if (!hand) {
    handEl.hidden = true
    hasPrev = false
    detector.update(null, headZone(), now)
  } else {
    const tx = remap(hand.x) * window.innerWidth
    const ty = remap(hand.y) * window.innerHeight
    if (!hasPrev) {
      cx = tx
      cy = ty
      hasPrev = true
    }
    cx += (tx - cx) * SMOOTH
    cy += (ty - cy) * SMOOTH
    handEl.hidden = false
    handEl.style.left = `${cx}px`
    handEl.style.top = `${cy}px`
    detector.update({ x: cx, y: cy }, headZone(), now)
  }

  // 판정 결과 → 캐릭터 반응
  character.setMood(detector.level === 2 ? 'veryHappy' : detector.level === 1 ? 'happy' : 'idle')
  statusEl.textContent = hand ? `${STATE_LABEL[detector.state]}` : '손이 안 보여요'
})

async function boot(): Promise<void> {
  try {
    statusEl.textContent = '손 인식 모델 불러오는 중…'
    await tracker.init()
    statusEl.textContent = '카메라 켜는 중…'
    await tracker.start()
    statusEl.textContent = '손을 카메라에 비춰 보세요 🫳'
  } catch (e) {
    // 권한 거부·카메라 없음 등: 앱이 죽지 않고 안내만 띄워요
    console.error(e)
    statusEl.textContent = `카메라/모델 오류: ${(e as Error).message}`
  }
}
boot()
