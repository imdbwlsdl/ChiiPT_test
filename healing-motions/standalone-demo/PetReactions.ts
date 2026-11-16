/**
 * 쓰다듬기 반응 연출. 인식 코드(features/healing)는 건드리지 않고 "petting 여부"만 받는다.
 *
 * 쓰다듬는 동안 세 동작을 차례로 반복한다:
 *   rub   (부비부비)  : 손에 몸을 비비듯 좌우로 천천히 흔들림, 하트는 가끔
 *   laugh (웃음)      : 작게 파르르 떨며 'ㅎㅎ'가 떠오름
 *   hop   (총총)      : 몇 번 총총 뛰며 하트가 많이 나옴
 *
 * 인식은 손이 잠깐 가려지거나 흔들리면 petting ↔ idle 이 깜빡일 수 있다. 그래서
 *  1) 멈춤 신호가 와도 GRACE_MS 동안은 계속 반응하고 (잠깐 끊김은 무시),
 *  2) 정말 멈추면 뚝 끊지 않고 '살짝 출렁'하며 돌아오고,
 *  3) 곧 다시 쓰다듬으면 처음이 아니라 하던 동작부터 이어간다.
 */
type Phase = 'rub' | 'laugh' | 'hop';

const SEQUENCE: { phase: Phase; ms: number; every: number }[] = [
  { phase: 'rub', ms: 1700, every: 650 }, //   every = 효과(하트/글자)가 나오는 간격(ms)
  { phase: 'laugh', ms: 1100, every: 320 },
  { phase: 'hop', ms: 1350, every: 240 } //     총총 3번(450ms × 3)
];

const GRACE_MS = 800; //          이 시간 안에 다시 인식되면 끊긴 적 없는 것으로 친다
const RESUME_WITHIN_MS = 4000; // 이 시간 안에 다시 쓰다듬으면 하던 동작부터 이어서

export class PetReactions {
  private active = false; //      지금 반응 연출 중인지
  private index = 0;
  private lastStopAt = 0;
  private offTimer: ReturnType<typeof setTimeout> | undefined;
  private phaseTimer: ReturnType<typeof setTimeout> | undefined;
  private fxTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private pet: HTMLElement, private fx: HTMLElement) {}

  setPetting(on: boolean): void {
    if (on) {
      clearTimeout(this.offTimer); // 멈춤 예약이 있었다면 취소 (잠깐 끊긴 것뿐)
      this.offTimer = undefined;
      if (this.active) return; //     이미 연출 중이면 그대로 둔다 (끊지 않기)
      this.active = true;
      this.pet.classList.remove('settle');
      // 방금 멈춘 거라면 이어서, 오래됐으면 처음(부비부비)부터
      if (performance.now() - this.lastStopAt > RESUME_WITHIN_MS) this.index = 0;
      this.runPhase();
    } else if (this.active && this.offTimer === undefined) {
      // 바로 끝내지 않고 잠시 기다려 본다
      this.offTimer = setTimeout(() => this.finish(), GRACE_MS);
    }
  }

  private finish(): void {
    this.offTimer = undefined;
    this.active = false;
    this.lastStopAt = performance.now();
    clearTimeout(this.phaseTimer);
    clearInterval(this.fxTimer);
    this.pet.classList.remove('rub', 'laugh', 'hop');
    void this.pet.offsetWidth;
    this.pet.classList.add('settle'); // 뚝 끊기지 않게 살짝 출렁이며 복귀
    setTimeout(() => this.pet.classList.remove('settle'), 400);
  }

  private runPhase(): void {
    const step = SEQUENCE[this.index];
    this.pet.classList.remove('rub', 'laugh', 'hop');
    void this.pet.offsetWidth; // 같은 애니메이션을 처음부터 다시 재생시키는 트릭
    this.pet.classList.add(step.phase);

    clearInterval(this.fxTimer);
    this.spawn(step.phase);
    this.fxTimer = setInterval(() => this.spawn(step.phase), step.every);

    this.phaseTimer = setTimeout(() => {
      this.index = (this.index + 1) % SEQUENCE.length; // 다 끝나면 처음(부비부비)으로
      this.runPhase();
    }, step.ms);
  }

  private spawn(phase: Phase): void {
    const el = document.createElement('span');
    el.className = phase === 'laugh' ? 'bubble' : 'heart';
    if (phase === 'laugh') el.textContent = Math.random() < 0.5 ? 'ㅎㅎ' : '✨';
    else el.textContent = phase === 'rub' ? '💗' : Math.random() < 0.75 ? '❤️' : '💗';
    // 버튼의 원래 자리(애니메이션 transform 영향 없음) 기준, 머리 위쪽에서 시작
    el.style.left = `${this.pet.offsetLeft + this.pet.offsetWidth * (0.2 + Math.random() * 0.6)}px`;
    el.style.top = `${this.pet.offsetTop + this.pet.offsetHeight * 0.1}px`;
    this.fx.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}
