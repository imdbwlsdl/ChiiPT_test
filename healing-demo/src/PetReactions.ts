/**
 * 쓰다듬기 반응 연출. 인식 코드(features/healing)는 건드리지 않고 "지금 쓰다듬는 중인가"만 받는다.
 * 쓰다듬는 동안 부비부비 → 웃음(ㅎㅎ) → 총총 세 동작을 차례로 반복하고 하트가 나온다.
 * 인식이 잠깐 끊겨도 어색하지 않게 유예(0.8초) / 이어하기(4초) / 출렁 복귀를 둔다.
 * canReact: 걷는 중이거나 잠든 상태 등에서는 반응하지 않게 호출 측이 넘겨주는 조건.
 */
type Phase = 'rub' | 'laugh' | 'hop';

const SEQUENCE: { phase: Phase; ms: number; every: number }[] = [
  { phase: 'rub', ms: 1700, every: 650 }, //   every = 효과(하트/글자)가 나오는 간격(ms)
  { phase: 'laugh', ms: 1100, every: 320 },
  { phase: 'hop', ms: 1350, every: 240 } //     총총 3번(450ms × 3)
];
const GRACE_MS = 800;
const RESUME_WITHIN_MS = 4000;
const HEAD_Y = -150; //       하트가 시작되는 높이(발바닥 기준 위쪽 px)
const HEART_SPREAD = 90;

export class PetReactions {
  private wanted = false;
  private running = false;
  private index = 0;
  private lastStopAt = 0;
  private offTimer: ReturnType<typeof setTimeout> | undefined;
  private phaseTimer: ReturnType<typeof setTimeout> | undefined;
  private fxTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private pet: HTMLElement, private fx: HTMLElement, private canReact: () => boolean) {
    setInterval(() => this.sync(), 100); // 걷기 시작하는 등 조건이 바뀌는 순간을 놓치지 않도록
  }

  /** 지금 연출 중인지(캐릭터 프레임을 눈 감은 모습으로 바꾸는 데 쓴다) */
  get active(): boolean { return this.running; }

  setPetting(on: boolean): void {
    this.wanted = on;
    this.sync();
  }

  private sync(): void {
    const on = this.wanted && this.canReact();
    if (on) {
      clearTimeout(this.offTimer);
      this.offTimer = undefined;
      if (this.running) return;
      this.running = true;
      this.pet.classList.remove('settle');
      if (performance.now() - this.lastStopAt > RESUME_WITHIN_MS) this.index = 0;
      this.runPhase();
    } else if (this.running && this.offTimer === undefined) {
      if (!this.canReact()) this.finish(false);
      else this.offTimer = setTimeout(() => this.finish(true), GRACE_MS);
    }
  }

  private runPhase(): void {
    const step = SEQUENCE[this.index]!;
    this.pet.classList.remove('rub', 'laugh', 'hop');
    void this.pet.offsetWidth; // 같은 애니메이션을 처음부터 다시 재생시키는 트릭
    this.pet.classList.add(step.phase);
    clearInterval(this.fxTimer);
    this.spawn(step.phase);
    this.fxTimer = setInterval(() => this.spawn(step.phase), step.every);
    this.phaseTimer = setTimeout(() => {
      this.index = (this.index + 1) % SEQUENCE.length;
      this.runPhase();
    }, step.ms);
  }

  private finish(settle: boolean): void {
    clearTimeout(this.offTimer);
    clearTimeout(this.phaseTimer);
    clearInterval(this.fxTimer);
    this.offTimer = undefined;
    this.running = false;
    this.lastStopAt = performance.now();
    this.pet.classList.remove('rub', 'laugh', 'hop');
    if (!settle) return;
    void this.pet.offsetWidth;
    this.pet.classList.add('settle'); // 뚝 끊기지 않게 살짝 출렁이며 복귀
    setTimeout(() => this.pet.classList.remove('settle'), 400);
  }

  private spawn(phase: Phase): void {
    const el = document.createElement('span');
    el.className = phase === 'laugh' ? 'bubble' : 'heart';
    el.textContent = phase === 'laugh' ? (Math.random() < 0.5 ? 'ㅎㅎ' : '✨')
      : phase === 'rub' ? '💗' : Math.random() < 0.75 ? '❤️' : '💗';
    // fx 층은 캐릭터 발바닥 중앙(0,0)에 붙어 있어서, 머리 위(HEAD_Y)에서 퍼져 나간다
    el.style.left = `${(Math.random() - 0.5) * HEART_SPREAD}px`;
    el.style.top = `${HEAD_Y}px`;
    this.fx.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}
