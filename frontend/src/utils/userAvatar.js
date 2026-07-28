const SETTER_FLAGS = {
  santiago: '🇦🇷',
  enrique: '🇮🇨',
};

export const getUserSymbol = user => {
  const name = String(user?.name || '').trim();
  if (user?.role === 'setter') {
    return SETTER_FLAGS[name.toLocaleLowerCase('es-ES')] || name.charAt(0).toUpperCase() || 'S';
  }
  return name.charAt(0).toUpperCase() || 'U';
};
