import { framePath, MOTIONS, type MotionName } from './motions.ts';

/**
 * 캐릭터의 "화면 표시"를 맡는다: 프레임 재생 + 위치 + 그림자.
 * 위치(x, y)는 캐릭터의 발바닥 중앙 좌표다. 인식/산책 코드는 이 클래스에 모션 이름과 좌표만 알려 준다.
 */
export class CharacterView {
  x = 0;
  y = 0;
  motion: MotionName = 'idle';
  private frame = 0;
  private acc = 0;
  private loop = true;
  private onDone: (() => void) | undefined;
  private img: HTMLImageElement;
  private images = new Map<MotionName, HTMLImageElement[]>();

  constructor(private actor: HTMLElement, private button: HTMLElement) {
    this.img = button.querySelector('img')!;
    // 모든 프레임을 미리 불러 두어서 동작이 바뀔 때 깜빡이지 않게 한다
    for (const [name, motion] of Object.entries(MOTIONS) as [MotionName, typeof MOTIONS[MotionName]][]) {
      this.images.set(name, Array.from({ length: motion.frames }, (_, i) => {
        const image = new Image();
        image.src = framePath(name, i);
        return image;
      }));
    }
    this.applyMotion();
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.actor.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** 같은 동작을 다시 요청하면 아무것도 하지 않는다(재생이 끊기지 않게). */
  setMotion(name: MotionName, options: { loop?: boolean; onDone?: () => void } = {}): void {
    const loop = options.loop ?? true;
    if (name === this.motion && loop === this.loop && !options.onDone) return;
    this.motion = name;
    this.loop = loop;
    this.onDone = options.onDone;
    this.frame = 0;
    this.acc = 0;
    this.applyMotion();
  }

  update(dt: number): void {
    const { frames, fps } = MOTIONS[this.motion];
    this.acc += dt;
    const step = 1 / fps;
    let changed = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (this.frame + 1 >= frames) {
        if (this.loop) this.frame = 0;
        else if (this.onDone) { const done = this.onDone; this.onDone = undefined; done(); return; }
      } else this.frame++;
      changed = true;
    }
    if (changed) this.showFrame();
  }

  /** 마우스가 캐릭터 몸 위에 있는지(타원으로 근사). 투명한 부분은 클릭이 통과되게 한다. */
  hitTest(px: number, py: number): boolean {
    const sleeping = this.motion === 'sleep';
    const rx = sleeping ? 120 : 66, ry = sleeping ? 90 : 76, cy = this.y - (sleeping ? 110 : 76);
    return ((px - this.x) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
  }

  private applyMotion(): void {
    const { w, h, feet } = MOTIONS[this.motion].canvas;
    Object.assign(this.button.style, {
      width: `${w}px`, height: `${h}px`, left: `${-w / 2}px`, top: `${-feet}px`,
      transformOrigin: `${w / 2}px ${feet}px` // 흔들기/뛰기 효과가 발바닥 중앙 기준으로 움직이게
    });
    this.actor.classList.toggle('sleeping', this.motion === 'sleep');
    this.showFrame();
  }

  private showFrame(): void {
    const src = this.images.get(this.motion)?.[this.frame]?.src;
    if (src && this.img.src !== src) this.img.src = src;
  }
}
