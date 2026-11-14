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
}
