let MODE = 'online'

export const getMode = () => MODE
export const setMode = () => { MODE = 'online' }
export const toggleMode = () => { MODE = 'online'; return MODE }
