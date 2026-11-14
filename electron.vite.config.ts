import { defineConfig } from 'electron-vite'

// electron-vite는 "메인 / 프리로드 / 렌더러" 3종류 코드를 한 번에 빌드해 주는 도구예요.
// 세 칸을 (비어 있더라도) 명시해야 각각을 빌드해요.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {}
})
