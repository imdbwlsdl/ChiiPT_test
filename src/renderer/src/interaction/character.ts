// 캐릭터의 "겉모습"을 담당. 판정(pettingDetector)과 분리해 둔 이유:
// 나중에 진짜 happy GIF가 오면 이 파일만 고치면 되고, 팀원의 자세 반응/수면 모션도
// 같은 setMood 같은 창구로 합칠 수 있어요.

export type Mood = 'idle' | 'happy' | 'veryHappy'

export class Character {
  private mood: Mood = 'idle'
  private heartTimer: number | null = null

  constructor(
    private img: HTMLImageElement,
    private fx: HTMLElement // 하트 같은 효과가 그려지는 층
  ) {}

  setMood(mood: Mood): void {
    if (mood === this.mood) return // 같은 상태면 아무것도 안 해서 애니메이션이 끊기지 않아요
    this.mood = mood
    this.img.classList.toggle('happy', mood === 'happy')
    this.img.classList.toggle('veryHappy', mood === 'veryHappy')

    if (this.heartTimer !== null) window.clearInterval(this.heartTimer)
    this.heartTimer = null
    if (mood !== 'idle') {
      const every = mood === 'happy' ? 450 : 220 // 더 기쁠수록 하트가 많이
      this.spawnHeart()
      this.heartTimer = window.setInterval(() => this.spawnHeart(), every)
    }
  }

  private spawnHeart(): void {
    const heart = document.createElement('span')
    heart.className = 'heart'
    heart.textContent = Math.random() < 0.8 ? '❤️' : '💗'
    // transform 영향을 안 받는 offset* 값으로 머리 위 위치를 계산
    heart.style.left = `${this.img.offsetLeft + this.img.offsetWidth * (0.2 + Math.random() * 0.6)}px`
    heart.style.top = `${this.img.offsetTop + this.img.offsetHeight * 0.15}px`
    this.fx.appendChild(heart)
    heart.addEventListener('animationend', () => heart.remove()) // 끝나면 정리 (메모리 누수 방지)
  }
}
