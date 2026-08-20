const { db } = require('../db/firebase'); 

// Função de validação
const validateEntity = (entityData) => {
  const errors = [];

  if (!entityData.nome || typeof entityData.nome !== 'string') {
    errors.nome = 'Nome é obrigatório e deve ser uma string';
  }

  if (!entityData.morada || typeof entityData.morada !== 'string') {
    errors.morada = 'Morada é obrigatória e deve ser uma string';
  }

  if (!entityData.nif || typeof entityData.nif !== 'number' || entityData.nif.length === 9) {
    errors.nif = 'NIF é obrigatório, deve ser um numero e deve ter 9 caracteres';
  }

  /* if (!entityData.nColaboradores || typeof entityData.nColaboradores !== 'number' || entityData.nColaboradores < 0) {
    errors.nColaboradores = 'Número de colaboradores é obrigatório, deve ser um número e não pode ser negativo';
  } */

  return errors;
};

module.exports = { validateEntity };