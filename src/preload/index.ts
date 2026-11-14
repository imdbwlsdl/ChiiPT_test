import { contextBridge, ipcRenderer } from 'electron'

// 프리로드 = 화면 코드에게 "허용한 기능만" 다리를 놓아 주는 곳.
// 화면에서는 window.pet.setIgnoreMouse(true) 처럼 호출할 수 있게 돼요.
contextBridge.exposeInMainWorld('pet', {
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore)
})
