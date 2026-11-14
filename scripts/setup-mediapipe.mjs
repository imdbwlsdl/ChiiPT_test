// 한 번만 실행하면 되는 준비 스크립트: npm run setup
// MediaPipe가 손을 인식하려면 두 가지가 필요해요.
//  1) wasm 파일: 브라우저에서 빠르게 계산하게 해 주는 엔진 (이미 npm으로 설치됨 → 복사만)
//  2) 모델 파일: 손 모양을 학습한 데이터 (Google 공식 저장소에서 내려받기, 약 7MB)
import { cp, mkdir, writeFile, access } from 'node:fs/promises'

const outDir = new URL('../src/renderer/public/mediapipe/', import.meta.url)
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

await mkdir(outDir, { recursive: true })

await cp(new URL('../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url), new URL('wasm', outDir), {
  recursive: true
})
console.log('✔ wasm 복사 완료')

const modelPath = new URL('hand_landmarker.task', outDir)
try {
  await access(modelPath)
  console.log('✔ 모델이 이미 있어요 (건너뜀)')
} catch {
  console.log('… 모델 다운로드 중')
  const res = await fetch(MODEL_URL)
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`)
  await writeFile(modelPath, Buffer.from(await res.arrayBuffer()))
  console.log('✔ 모델 다운로드 완료')
}
