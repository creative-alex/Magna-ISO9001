import { useContext } from "react";
import { UserContext } from "../context/userContext";

// Camada única de interpretação do nivelAcesso no frontend - nivelAcesso continua a
// ser a fonte de verdade (vem do backend via verifyTokenAndGetUserInfo) e o backend
// continua a ser a autoridade final em cada pedido; isto só evita que cada componente
// reimplemente a mesma comparação de string. Os nomes espelham deliberadamente os
// helpers equivalentes em api/shared/middleware/auth.js (isAdminOrHR,
// isAdminOrHRorAdministrador, isSuperAdminOrGestorFinanceiro), para ficar óbvio qual é
// a regra de backend correspondente a cada permissão composta aqui.
export function usePermissions() {
  const { nivelAcesso, uid, entidadesGeridasNomes, gestorQualidade } = useContext(UserContext);

  const isSuperAdmin = nivelAcesso === "SuperAdmin";
  const isGestorRH = nivelAcesso === "GestorRH";
  const isAdministrador = nivelAcesso === "Administrador";
  const isGestorFinanceiro = nivelAcesso === "GestorFinanceiro";
  // Função de Gestor(a) de Qualidade: dimensão independente de nivelAcesso (ver
  // gestorQualidade em users/{uid} e req.user.gestorQualidade em auth.js). Uma pessoa
  // mantém as permissões do seu nivelAcesso e ganha, adicionalmente, estas - nunca troca
  // uma pela outra.
  const isGestorQualidade = gestorQualidade === true;

  const isAdminOrHR = isSuperAdmin || isGestorRH;
  const isAdminOrHRorAdministrador = isAdminOrHR || isAdministrador;
  const isSuperAdminOrGestorFinanceiro = isSuperAdmin || isGestorFinanceiro;

  // Aproximação só para UI: compara nomes de entidade (o que o frontend já tem, ver
  // entidadesGeridasNomes em userContext.js), nunca as refs "entidades/<id>" usadas
  // pelo backend (entidadesGeridasPor/entidadeNoAmbito em auth.js). Serve só para
  // mostrar/esconder um botão - o backend volta sempre a validar pela ref real e é
  // sempre esse resultado que decide o que é lido/escrito de facto.
  const isEntidadeInScope = (entidadeNome) =>
    !!entidadeNome && (entidadesGeridasNomes || []).includes(entidadeNome);

  // Gestão de contas de colaboradores (criar/editar/apagar) - mesmo âmbito de
  // requireAdminOrEntidadeAdmin no backend.
  const canManageUsers = isAdminOrHRorAdministrador;
  // Ver a lista de colaboradores (cadastro/salário/formação/prémios) - mesmo âmbito de
  // requireCanViewColaboradores no backend.
  const canViewColaboradores = isAdminOrHRorAdministrador || isGestorFinanceiro;
  // Processamento de Salários: consultar vs. editar valores são permissões distintas -
  // separação RH/Financeiro pedida explicitamente (ver isGestorFinanceiro em auth.js).
  const canViewPayroll = isAdminOrHR || isGestorFinanceiro;
  const canEditPayroll = isSuperAdminOrGestorFinanceiro;
  // Prémios: mesma separação de edição que Salários (o comentário de isGestorFinanceiro
  // em auth.js nomeia as duas áreas em conjunto), mas a lista tem o seu próprio âmbito
  // de visibilidade (GestorRH nunca vê a lista de colaboradores aqui, só os seus próprios).
  const canEditPremios = isSuperAdminOrGestorFinanceiro;
  const canViewPremiosList = isSuperAdmin || isAdministrador || isGestorFinanceiro;
  // Formação/Medicina do trabalho continuam áreas de RH - nunca do Gestor Financeiro.
  const canManageFormacao = isAdminOrHR;
  const canManageMedicina = isAdminOrHR;

  // Cadastro: ver e editar são permissões distintas e dependem de QUEM está a ser
  // consultado (não só de quem consulta), por isso são funções, não booleanos simples -
  // ver a matriz completa em cadastroController.js (canRead/canWrite/canEditRestricted).
  //   - SuperAdmin/GestorRH: vê e edita qualquer colaborador, sem restrições.
  //   - Administrador: vê e edita só colaboradores das entidades que administra
  //     (incluindo os campos antes exclusivos de RH, ver canEditCadastroRestrito).
  //   - GestorFinanceiro: vê qualquer colaborador, mas nunca edita o de outra pessoa.
  //   - Todos: podem sempre editar o seu próprio cadastro (regras à parte, inalteradas).
  const canViewCadastro = (targetUid, targetEntidadeNome) =>
    targetUid === uid
    || isSuperAdmin || isGestorRH || isGestorFinanceiro
    || (isAdministrador && isEntidadeInScope(targetEntidadeNome));

  const canEditCadastro = (targetUid, targetEntidadeNome) =>
    targetUid === uid
    || isSuperAdmin || isGestorRH
    || (isAdministrador && isEntidadeInScope(targetEntidadeNome));

  // Campos de Contrato/Estágio e as subcoleções de cedências/baixas médicas: só
  // SuperAdmin/GestorRH ou um Administrador dentro do seu âmbito - sem atalho por
  // "é o próprio" (nem um Colaborador nem um GestorFinanceiro editam isto na sua
  // própria ficha, tal como já acontecia antes desta regra existir para Administrador).
  const canEditCadastroRestrito = (targetEntidadeNome) =>
    isSuperAdmin || isGestorRH || (isAdministrador && isEntidadeInScope(targetEntidadeNome));

  // Não Conformidades - ver naoConformidadeController.js no backend para a autoridade
  // final de cada uma destas regras (o frontend só evita mostrar controlos sem efeito).
  //   - Consultar: todos os autenticados (o backend filtra quais NC cada um vê/lista).
  //   - Gerir (catalogar, atribuir/alterar responsável pela NC, verificar eficácia,
  //     fechar): quem tem gestorQualidade=true, OU um SuperAdmin (autoridade máxima do
  //     sistema, tem de conseguir manipular qualquer NC mesmo sem a função de Qualidade).
  //   - Editar o questionário de tratamento e as ações corretivas de uma NC: só quem é o
  //     responsável PELO TRATAMENTO dessa NC específica (nem a própria Gestora de
  //     Qualidade o edita, só consulta) - por isso é uma função de (nc), não um booleano.
  //     Um SuperAdmin também pode, pela mesma razão do parágrafo acima.
  //   - Marcar uma ação como implementada: só quem é o responsável POR ESSA AÇÃO, ou um
  //     SuperAdmin.
  const canViewNaoConformidades = true;
  const canManageNaoConformidades = isGestorQualidade || isSuperAdmin;
  const canAssignNaoConformidade = isGestorQualidade || isSuperAdmin;
  const canVerifyEficacia = isGestorQualidade || isSuperAdmin;
  const canEditNaoConformidade = (nc) => !!nc && (nc.responsavelTratamento?.uid === uid || isSuperAdmin);
  const canMarkAcaoImplementada = (acao) => !!acao && (acao.responsavelUid === uid || isSuperAdmin);

  return {
    isSuperAdmin, isGestorRH, isAdministrador, isGestorFinanceiro, isGestorQualidade,
    isAdminOrHR, isAdminOrHRorAdministrador, isSuperAdminOrGestorFinanceiro,
    canManageUsers, canViewColaboradores,
    canViewPayroll, canEditPayroll,
    canEditPremios, canViewPremiosList,
    canManageFormacao, canManageMedicina,
    isEntidadeInScope,
    canViewCadastro, canEditCadastro, canEditCadastroRestrito,
    canViewNaoConformidades, canManageNaoConformidades, canAssignNaoConformidade,
    canVerifyEficacia, canEditNaoConformidade, canMarkAcaoImplementada,
  };
}
