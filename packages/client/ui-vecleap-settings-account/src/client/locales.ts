export const NS = 'vecleap.account'

export type VecleapAccountKey =
  | 'menu'
  | 'more'
  | 'signedIn'
  | 'settings'
  | 'signIn'
  | 'signOut'
  | 'cancel'
  | 'close'
  | 'nav'
  | 'loginTitle'
  | 'loginDescription'
  | 'email'
  | 'password'
  | 'loginSubmit'
  | 'loginFailed'
  | 'sessionExpired'
  | 'signOutDescription'
  | 'signOutRunningDescription'
  | 'signOutUnknownDescription'
  | 'failed'
  | 'profileEmail'
  | 'profileName'
  | 'cloudSessionsTitle'
  | 'cloudSessionsHint'
  | 'cloudRefresh'
  | 'cloudLoading'
  | 'cloudFailed'
  | 'cloudEmpty'
  | 'cloudUntitled'
  | 'cloudPanel'
  | 'cloudPanelTitle'
  | 'cloudPanelLead'

export const zh: Record<VecleapAccountKey, string> = {
  menu: '账号菜单',
  more: '更多',
  signedIn: '已登录',
  settings: '设置',
  signIn: '登录 VecLeap Cloud',
  signOut: '退出登录',
  cancel: '取消',
  close: '关闭',
  nav: '账号',
  loginTitle: '登录 VecLeap Cloud',
  loginDescription: '使用与 Web 端相同的 Hub 账号登录。',
  email: '邮箱',
  password: '密码',
  loginSubmit: '登录',
  loginFailed: '登录失败，请检查账号、密码与网络。',
  sessionExpired: '登录已过期，请重新登录。',
  signOutDescription: '退出后本地凭证会清除，可随时再次登录。',
  signOutRunningDescription: '仍有任务在运行，退出可能会中断这些任务。',
  signOutUnknownDescription: '无法确认任务状态，仍要退出吗？',
  failed: '操作失败，请重试。',
  profileEmail: '邮箱',
  profileName: '昵称',
  cloudSessionsTitle: '云端对话',
  cloudSessionsHint: '与 Web、Mobile 共用同一 Hub 会话列表（最近 50 条）。工作区侧栏仅显示本机编码会话；桌面发出对话后会自动写入 Hub，Web/Mobile 刷新即可看到。列表约每 45 秒自动刷新。',
  cloudPanel: '云端对话',
  cloudPanelTitle: '云端对话',
  cloudPanelLead: '与 Web Agent 侧边栏、Mobile 历史为同一数据源：登录同一 Hub 账号即可查看全部云端会话（含 Web Agent 任务）。点击条目可预览记录。',
  cloudRefresh: '刷新',
  cloudLoading: '正在加载云端会话…',
  cloudFailed: '无法加载云端会话，请检查网络或重新登录。',
  cloudEmpty: '暂无云端会话。',
  cloudUntitled: '未命名会话',
}

export const en: Record<VecleapAccountKey, string> = {
  menu: 'Account menu',
  more: 'More',
  signedIn: 'Signed in',
  settings: 'Settings',
  signIn: 'Sign in to VecLeap Cloud',
  signOut: 'Sign out',
  cancel: 'Cancel',
  close: 'Close',
  nav: 'Account',
  loginTitle: 'Sign in to VecLeap Cloud',
  loginDescription: 'Use the same Hub account as the VecLeap web app.',
  email: 'Email',
  password: 'Password',
  loginSubmit: 'Sign in',
  loginFailed: 'Sign-in failed. Check email, password, and network.',
  sessionExpired: 'Session expired. Please sign in again.',
  signOutDescription: 'Signing out clears local credentials. You can sign in again anytime.',
  signOutRunningDescription: 'Tasks are still running; signing out may interrupt them.',
  signOutUnknownDescription: 'Task status is unavailable. Sign out anyway?',
  failed: 'Something went wrong. Try again.',
  profileEmail: 'Email',
  profileName: 'Name',
  cloudSessionsTitle: 'Cloud conversations',
  cloudSessionsHint: 'Same Hub session list as Web and Mobile (latest 50). The workspace sidebar is local coding sessions only; desktop chats sync to Hub after you send messages. This list auto-refreshes about every 45 seconds.',
  cloudPanel: 'Cloud chats',
  cloudPanelTitle: 'Cloud conversations',
  cloudPanelLead: 'Same data as the Web Agent sidebar and Mobile history for your Hub account. Select a row to preview the transcript.',
  cloudRefresh: 'Refresh',
  cloudLoading: 'Loading cloud sessions…',
  cloudFailed: 'Could not load cloud sessions. Check network or sign in again.',
  cloudEmpty: 'No cloud sessions yet.',
  cloudUntitled: 'Untitled session',
}
