import React from "react";
import Template1 from "../components/templates/TabelaTemplate1";
import Template2 from "../components/templates/TabelaTemplate2";
import AIAssistant from "../components/AIAssistant/AIAssistant";

export default function TabelaPdf({
  templateType = 1,
  isEditable = true, // Nova prop para controlar editabilidade
  setIsEditable, // Nova prop para alterar estado de editabilidade
  canEdit = true, // Nova prop para controlar se pode editar (permissões)
  isSuperAdmin = false, // Nova prop para controlar se é SuperAdmin
  data,
  dataObs,
  handleChangeMain,
  handleChangeObs,
  handleChange,
  headers,
  headersObs,
  donoProcesso,
  donoProcessoOriginal,
  setDonoProcesso,
  objetivoProcesso,
  setObjetivoProcesso,
  atividades,
  handleAtividadesChange,
  indicadores,
  handleIndicadoresChange,
  servicosEntrada,
  setServicosEntrada,
  servicoSaida,
  setServicoSaida,
  // Novas props opcionais para manipulação de linhas
  onMoveRowUp,
  onMoveRowDown,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onAddRowObs,
  onDeleteRowObs,
  // Props adicionais
  pathFilename = "",
  fieldNames = [],
  onSaveSuccess,
  getTablesHtml,
  obsTableRef,
  mainTableRef,
  // Novas props para manipulação de atividades no Template
  onMoveAtividadeUp,
  onMoveAtividadeDown,
  onInsertAtividadeAbove,
  onInsertAtividadeBelow,
  onDeleteAtividade,
  // Novas props para manipulação de indicadores no Template2
  onMoveIndicadorUp,
  onMoveIndicadorDown,
  onInsertIndicadorAbove,
  onInsertIndicadorBelow,
  onDeleteIndicador,
  funcionarios = [], // Nova prop para funcionários
  history = [], // Nova prop para histórico
  clearHistory // Nova prop para função de limpar histórico
}) {
  const isTemplate2 = templateType === 2;

  // Funções de fallback para quando as props não forem fornecidas
  const handleMoveRowUp = onMoveRowUp || (() => {});
  const handleMoveRowDown = onMoveRowDown || (() => {});
  const handleInsertRowAbove = onInsertRowAbove || (() => {});
  const handleInsertRowBelow = onInsertRowBelow || (() => {});
  const handleDeleteRow = onDeleteRow || (() => {});
  const handleAddRowObs = onAddRowObs || (() => {});
  const handleDeleteRowObs = onDeleteRowObs || (() => {});

  // Funções de fallback para atividades
  const handleMoveAtividadeUp = onMoveAtividadeUp || (() => {});
  const handleMoveAtividadeDown = onMoveAtividadeDown || (() => {});
  const handleInsertAtividadeAbove = onInsertAtividadeAbove || (() => {});
  const handleInsertAtividadeBelow = onInsertAtividadeBelow || (() => {});
  const handleDeleteAtividade = onDeleteAtividade || (() => {});

  // Funções de fallback para indicadores
  const handleMoveIndicadorUp = onMoveIndicadorUp || (() => {});
  const handleMoveIndicadorDown = onMoveIndicadorDown || (() => {});
  const handleInsertIndicadorAbove = onInsertIndicadorAbove || (() => {});
  const handleInsertIndicadorBelow = onInsertIndicadorBelow || (() => {});
  const handleDeleteIndicador = onDeleteIndicador || (() => {});

 return (
    <div>

      {isTemplate2 ? (
        <Template2
          isEditable={isEditable}
          setIsEditable={setIsEditable}
          canEdit={canEdit}
          isSuperAdmin={isSuperAdmin}
          data={data}
          dataObs={dataObs}
          handleChange={handleChange}
          headers={headers}
          headersObs={headersObs}
          donoProcesso={donoProcesso}
          donoProcessoOriginal={donoProcessoOriginal}
          setDonoProcesso={setDonoProcesso}
          objetivoProcesso={objetivoProcesso}
          setObjetivoProcesso={setObjetivoProcesso}
          atividades={atividades}
          handleAtividadesChange={handleAtividadesChange}
          indicadores={indicadores}
          handleIndicadoresChange={handleIndicadoresChange}
          servicosEntrada={servicosEntrada}
          setServicosEntrada={setServicosEntrada}
          servicoSaida={servicoSaida}
          setServicoSaida={setServicoSaida}
          funcionarios={funcionarios}
          getTablesHtml={getTablesHtml}
          onMoveAtividadeUp={handleMoveAtividadeUp}
          onMoveAtividadeDown={handleMoveAtividadeDown}
          onInsertAtividadeAbove={handleInsertAtividadeAbove}
          onInsertAtividadeBelow={handleInsertAtividadeBelow}
          onDeleteAtividade={handleDeleteAtividade}
          onMoveIndicadorUp={handleMoveIndicadorUp}
          onMoveIndicadorDown={handleMoveIndicadorDown}
          onInsertIndicadorAbove={handleInsertIndicadorAbove}
          onInsertIndicadorBelow={handleInsertIndicadorBelow}
          onDeleteIndicador={handleDeleteIndicador}
          pathFilename={pathFilename}
          onSaveSuccess={onSaveSuccess}
          history={history}
          clearHistory={clearHistory}
        />
      ) : (
        <Template1
          isEditable={isEditable}
          useNewAttachmentManager={true} // Usa o novo gerenciador de anexos
          data={data}
          dataObs={dataObs}
          handleChange={handleChangeMain}
          handleChangeObs={handleChangeObs}
          templateType={templateType}
          servicosEntrada={servicosEntrada}
          servicoSaida={servicoSaida}
          setServicosEntrada={setServicosEntrada}
          setServicoSaida={setServicoSaida}
          onMoveRowUp={handleMoveRowUp}
          onMoveRowDown={handleMoveRowDown}
          onInsertRowAbove={handleInsertRowAbove}
          onInsertRowBelow={handleInsertRowBelow}
          onDeleteRow={handleDeleteRow}
          onAddRowObs={handleAddRowObs}
          onDeleteRowObs={handleDeleteRowObs}
          atividades={atividades}
          donoProcesso={donoProcesso}
          objetivoProcesso={objetivoProcesso}
          indicadores={indicadores}
          pathFilename={pathFilename}
          fieldNames={fieldNames}
          onSaveSuccess={onSaveSuccess}
          getTablesHtml={getTablesHtml}
          obsTableRef={obsTableRef}
          mainTableRef={mainTableRef}
          history={history}
          clearHistory={clearHistory}
        />
      )}
      
      {/* AI Assistant para continuar tutorial em todas as páginas */}
      <AIAssistant 
        fileTree={[]} 
        searchTerm=""
        username="User" // Pode ser melhorado para pegar username real
        isAdmin={false}
        isSuperAdmin={isSuperAdmin}
        processOwners={{}}
        onSuggestion={() => {}}
      />
    </div>
  );
}
