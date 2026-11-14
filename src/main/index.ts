import { app, BrowserWindow, globalShortcut, ipcMain, screen, session, systemPreferences } from 'electron'
import { join } from 'path'

let win: BrowserWindow | null = null

function createOverlayWindow(): void {
  // 창을 "화면 전체" 크기로 만들어요. (작업 표시줄/독/메뉴바를 뺀 영역)
  // 왜? 손 커서가 화면 어디로 움직여도 그릴 수 있어야 하고,
  // 캐릭터의 위치는 창 크기가 아니라 CSS로 정하는 게 훨씬 자유롭기 때문이에요.
  const { workArea } = screen.getPrimaryDisplay()

  win = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,

    transparent: true, // 배경 투명 → 캐릭터만 보임
    frame: false, // 제목표시줄/테두리 제거
    hasShadow: false, // 창 그림자 제거 (안 그러면 투명 영역에 그림자가 생겨요)
    resizable: false,
    skipTaskbar: true, // 작업 표시줄에 안 띄움
    focusable: false, // 클릭해도 다른 프로그램의 포커스를 빼앗지 않음
    alwaysOnTop: true,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true // 보안: 화면 코드와 Electron 내부를 분리
    }
  })

  // 'screen-saver' 레벨 = 전체화면 앱 위에도 뜨는 가장 높은 층
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // 기본은 "클릭 통과". forward:true 라서 마우스 움직임은 화면 코드가 계속 받아요.
  win.setIgnoreMouseEvents(true, { forward: true })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']) // 개발 중: Vite 개발 서버
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html')) // 배포: 빌드된 파일
  }
}

// 화면(렌더러)이 "지금 마우스가 캐릭터 위야/아니야"를 알려주면 그에 맞게 클릭 통과를 켜고 끔
ipcMain.on('set-ignore-mouse', (_event, ignore: boolean) => {
  win?.setIgnoreMouseEvents(ignore, { forward: true })
})

app.whenReady().then(async () => {
  // 카메라 권한: 맥은 OS가 앱별로 허용 여부를 묻는 팝업을 띄워요.
  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess('camera')
  }
  // 화면 코드(getUserMedia)가 카메라를 요청하면 허용 (우리 앱 안에서만 쓰는 로컬 처리)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  createOverlayWindow()

  // 개발 중 종료용 단축키. 창이 포커스를 안 받고 클릭도 통과해서 평범한 방법으론 끄기 어려워요.
  // 나중에 시스템 트레이 메뉴(종료 버튼)를 만들면 이건 지워도 돼요.
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())
})
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())
