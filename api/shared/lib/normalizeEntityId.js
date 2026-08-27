// Funcao helper para normalizar IDs de entidades
const normalizeEntityId = (nome) => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/&/g, 'e')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

module.exports = {
  normalizeEntityId
};
