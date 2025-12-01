let MODE = String(process.env.DEFAULT_MODE || 'offline') === 'offline' ? 'offline' : 'online'

export const getMode = () => MODE
export const setMode = (m) => { MODE = m === 'offline' ? 'offline' : 'online' }
export const toggleMode = () => { MODE = MODE === 'online' ? 'offline' : 'online' ; return MODE }
