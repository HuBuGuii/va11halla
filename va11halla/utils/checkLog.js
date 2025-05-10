export function checkLogin(whiteList = []) {
    const token = uni.getStorageSync('uni_id_token')
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    const route = '/' + current.route
  
    const query = Object.entries(current.options || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('&')
    const fullPath = query ? `${route}?${query}` : route
  
    if (!token && !whiteList.includes(route)) {
      uni.redirectTo({
        url: `/uni_modules/uni-id-pages/pages/login/login-withpwd?redirect=${encodeURIComponent(fullPath)}`
      })
      return false
    }
  
    return true
  }